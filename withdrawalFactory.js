/**
 * Create withdrawal function for a specific retirement year
 * @param {IncomeStreams} incomeStreams
 * @param {FiscalData} fiscalData
 * @param {Demographics} demographics
 * @param {AccountsManager} accounts
 */
function withdrawalFactoryJS_createWithdrawalFactory(
  incomeStreams,
  fiscalData,
  demographics,
  accounts
) {
  let retirementAccountIncomeRecognized = false;

  /** @type {IncomeRs} */
  let incomeResults = IncomeRs.Empty();
  // **************
  // Sanity checks
  // **************
  if (!accounts) {
    console.error(`accounts is null or undefined.  This is a fatal error`);
    throw new Error("accounts is required");
  }
  // **************

  /**
   * @param {number} amount
   * @param {string} accountType
   */
  function withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
    const savingsAccount = new TargetedAccount(
      accounts.savings,
      fiscalData.taxYear
    );
    const rothAccount = new TargetedAccount(
      accounts.rothIra,
      fiscalData.taxYear
    );
    const trad401kAccount = new TargetedAccount(
      accounts.trad401k,
      fiscalData.taxYear
    );

    // Withdrawal amount to be determined
    switch (accountType) {
      case ACCOUNT_TYPES.TRADITIONAL_401K: {
        if (retirementAccountIncomeRecognized) return 0; // already processed a 401k withdrawal this year

        let gross401kWithdrawal = 0;

        if (fiscalData.useTrad401k) {
          const withdrawals =
            retirementJS_determine401kWithdrawalsToHitNetTargetOf(
              amount,
              incomeStreams,
              demographics,
              fiscalData
            );

          gross401kWithdrawal = Math.min(
            Math.max(trad401kAccount.availableFunds - incomeStreams.rmd, 0),
            withdrawals.withdrawalNeeded
          );
        }

        // Calculate actual net using the sophisticated tax calculation
        incomeResults = retirementJS_calculateIncomeWhen401kWithdrawalIs(
          gross401kWithdrawal,
          incomeStreams,
          demographics,
          fiscalData
        );

        if (!trialRun) {
          trad401kAccount.withdraw(
            incomeStreams.rmd,
            TRANSACTION_CATEGORY.DISBURSEMENT
          );
          trad401kAccount.withdraw(
            gross401kWithdrawal,
            TRANSACTION_CATEGORY.DISBURSEMENT
          );
          savingsAccount.deposit(
            incomeResults.incomeBreakdown
              .reportableIncomeLessReportedEarnedInterest,
            TRANSACTION_CATEGORY.INCOME
          );
          savingsAccount.withdraw(
            incomeResults.incomeBreakdown.federalIncomeTax,
            TRANSACTION_CATEGORY.TAXES
          );
          retirementAccountIncomeRecognized = true;
        }

        return Math.max(
          gross401kWithdrawal - incomeResults.incomeBreakdown.federalIncomeTax,
          0
        );

        // return netWithdrawals;
      }
      case ACCOUNT_TYPES.SAVINGS: {
        if (!fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

        const fundsNeeded = amount;
        const fundsAvailable = savingsAccount.availableFunds;

        if (fundsAvailable == 0) return 0;

        // Determine how much to withdraw to meet the desired spend
        let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        if (!trialRun) {
          // Reduce the account balance by the net received amount
          savingsAccount.withdraw(
            withdrawalAmount,
            TRANSACTION_CATEGORY.DISBURSEMENT
          );
        }

        return withdrawalAmount;
      }
      case ACCOUNT_TYPES.ROTH_IRA: {
        // Roth withdrawal (no tax impact)
        const fundsNeeded = amount;
        const fundsAvailable = rothAccount.availableFunds;

        if (fundsAvailable == 0) return 0;

        // Determine how much to withdraw to meet the desired spend
        let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        if (!trialRun) {
          // Reduce the account balance by the net received amount
          rothAccount.withdraw(
            withdrawalAmount,
            TRANSACTION_CATEGORY.DISBURSEMENT
          );
        }

        return withdrawalAmount;
      }
      default:
        console.error("Unsupported account type:", accountType);
        return 0;
    }
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
  };

  return result;
}
