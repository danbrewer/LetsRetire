/**
 * Create withdrawal function for a specific retirement year
 * @param {IncomeStreams} incomeStreams
 * @param {FiscalData} fiscalData
 * @param {Demographics} demographics
 * @param {AccountYear} accountYear
 */
function withdrawalFactoryJS_createWithdrawalFactory(
  incomeStreams,
  fiscalData,
  demographics,
  accountYear
) {
  /** @type {IncomeRs} */
  let incomeResults = IncomeRs.Empty();
  // **************
  // Sanity checks
  // **************
  if (!accountYear) {
    console.error(`accounts is null or undefined.  This is a fatal error`);
    throw new Error("accounts is required");
  }
  // **************

  /**
   * @param {number} amount
   * @param {string} accountType
   */
  function withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
    // Withdrawal amount to be determined
    switch (accountType) {
      case ACCOUNT_TYPES.TRAD_401K: {
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
            Math.max(
              accountYear.getAvailableFunds([ACCOUNT_TYPES.TRAD_401K]) -
                incomeStreams.rmd,
              0
            ),
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
          accountYear.withdrawal(
            ACCOUNT_TYPES.TRAD_401K,
            TRANSACTION_CATEGORY.DISBURSEMENT,
            gross401kWithdrawal
          );
          accountYear.deposit(
            ACCOUNT_TYPES.DISBURSEMENT,
            TRANSACTION_CATEGORY.TRAD_401K,
            gross401kWithdrawal
          );

          accountYear.withdrawal(
            ACCOUNT_TYPES.TRAD_401K,
            TRANSACTION_CATEGORY.DISBURSEMENT,
            incomeStreams.rmd
          );
          accountYear.deposit(
            ACCOUNT_TYPES.DISBURSEMENT,
            TRANSACTION_CATEGORY.RMD,
            incomeStreams.rmd
          );

          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.TRAD_401K,
            incomeResults.incomeBreakdown.trad401kNetIncome
          );

          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.PENSION,
            incomeResults.incomeBreakdown.pensionNetIncome
          );

          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.SOCIAL_SEC,
            incomeResults.incomeBreakdown.socialSecurityNetIncome
          );

          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.OTHER_INCOME,
            incomeResults.incomeBreakdown.otherTaxableNetIncome
          );

          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.RMD,
            incomeResults.incomeBreakdown.earnedInterestNetIncome
          );
        }

        return Math.max(
          gross401kWithdrawal - incomeResults.incomeBreakdown.federalIncomeTax,
          0
        );
      }
      case ACCOUNT_TYPES.SAVINGS: {
        if (!fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

        const fundsNeeded = amount;
        const fundsAvailable = accountYear.getAvailableFunds([
          ACCOUNT_TYPES.SAVINGS,
        ]);

        if (fundsAvailable == 0) return 0;

        // Determine how much to withdraw to meet the desired spend
        let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        if (!trialRun) {
          // Reduce the account balance by the net received amount
          accountYear.withdrawal(
            ACCOUNT_TYPES.SAVINGS,
            TRANSACTION_CATEGORY.DISBURSEMENT,
            withdrawalAmount
          );
          accountYear.deposit(
            ACCOUNT_TYPES.DISBURSEMENT,
            TRANSACTION_CATEGORY.SAVINGS,
            withdrawalAmount
          );
          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.SAVINGS,
            withdrawalAmount
          );
        }

        return withdrawalAmount;
      }
      case ACCOUNT_TYPES.TRAD_ROTH: {
        // Roth withdrawal (no tax impact)
        const fundsNeeded = amount;
        const fundsAvailable = accountYear.getAvailableFunds([
          ACCOUNT_TYPES.TRAD_ROTH,
        ]);

        if (fundsAvailable == 0) return 0;

        // Determine how much to withdraw to meet the desired spend
        let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        if (!trialRun) {
          // Reduce the account balance by the net received amount
          accountYear.withdrawal(
            ACCOUNT_TYPES.TRAD_ROTH,
            TRANSACTION_CATEGORY.DISBURSEMENT,
            withdrawalAmount
          );
          accountYear.deposit(
            ACCOUNT_TYPES.REVENUE,
            TRANSACTION_CATEGORY.TRAD_ROTH,
            withdrawalAmount
          );
          accountYear.deposit(
            ACCOUNT_TYPES.DISBURSEMENT,
            TRANSACTION_CATEGORY.TRAD_ROTH,
            withdrawalAmount
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
