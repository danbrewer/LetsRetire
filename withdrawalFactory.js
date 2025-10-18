/**
 * Create withdrawal function for a specific retirement year
 */
function withdrawalFactoryJS_createWithdrawalFactory(
  incomeStreamsData = {},
  fiscalData = {},
  demographics = {},
  accounts = {}
) {
  let retirementAccountIncomeRecognized = false;

  let incomeResults = {
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const incomeStreams = {
    reportedEarnedInterest: 0,
    myPension: 0,
    spousePension: 0,
    mySs: 0,
    spouseSs: 0,
    rmd: 0,
    otherTaxableIncomeAdjustments: 0,
    totalIncome() {},
    taxableIncome() {},
    ssIncome() {},
    nonSsIncome() {},
    ...incomeStreamsData,
  };

  // **************
  // Sanity checks
  // **************
  if (accounts.length === 0 || !accounts) {
    console.error(`accounts is null or undefined.  This is a fatal error`);
    return result;
  }
  // **************

  function withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
    if (!accountType || typeof accountType !== "string") {
      console.error("Invalid account type:", accountType);
      return 0;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.TRADITIONAL_401K,
      ACCOUNT_TYPES.ROTH_IRA,
    ];
    if (!validKinds.includes(accountType)) {
      throw new Error(
        "Withdrawal target not defined or not supported:",
        accountType
      );
    }

    function getTargetedAccount(accountType) {
      switch (accountType) {
        case ACCOUNT_TYPES.SAVINGS:
          return accounts.savings;
        case ACCOUNT_TYPES.TRADITIONAL_401K:
          return accounts.traditional401k;
        case ACCOUNT_TYPES.ROTH_IRA:
          return accounts.rothIra;
        default:
          throw new Error("Unknown account type:", accountType);
      }
    }
    class TargetedAccount {
      #account = null;

      constructor(account) {
        this.#account = account;
      }

      getStartingBalance() {
        return this.#account.startingBalanceForYear(fiscalData.taxYear);
      }

      availableFunds() {
        return Math.max(
          this.#account.endingBalanceForYear(fiscalData.taxYear),
          0
        );
      }

      deposit(v, category) {
        return this.#account.deposit(v, category, fiscalData.taxYear);
      }

      withdraw(v, category) {
        return this.#account.withdrawal(v, category, fiscalData.taxYear);
      }

      withdrawals() {
        return this.#account.withdrawalsForYear(fiscalData.taxYear);
      }

      // calculateEarnedInterest(calculationIntensity) {
      //   return this.#account.calculateInterestForYear(
      //     calculationIntensity,
      //     fiscalData.taxYear
      //   );
      // }

      endingBalanceForYear() {
        return this.#account.endingBalanceForYear(fiscalData.taxYear);
      }
    }

    const savingsAccount = new TargetedAccount(
      getTargetedAccount(ACCOUNT_TYPES.SAVINGS)
    );
    const rothAccount = new TargetedAccount(
      getTargetedAccount(ACCOUNT_TYPES.ROTH_IRA)
    );
    const traditional401kAccount = new TargetedAccount(
      getTargetedAccount(ACCOUNT_TYPES.TRADITIONAL_401K)
    );

    const fixedIncomeFactors = {
      reportedEarnedInterest: incomeStreams.reportedEarnedInterest,
      myPension: incomeStreams.myPension,
      spousePension: incomeStreams.spousePension,
      rmd: incomeStreams.rmd,
      otherTaxableIncomeAdjustments:
        incomeStreams.otherTaxableIncomeAdjustments,
      mySsBenefitsGross: incomeStreams.mySs,
      spouseSsBenefitsGross: incomeStreams.spouseSs,
      // standardDeduction: standardDeduction,
      // taxBrackets: taxBrackets,
      nonSsIncome: incomeStreams.nonSsIncome(),
      ssIncome: incomeStreams.ssIncome(),
      precision: 0.01, // Precision for binary search convergence
    };

    // Withdrawal amount to be determined
    switch (accountType) {
      case ACCOUNT_TYPES.TRADITIONAL_401K:
        {
          if (retirementAccountIncomeRecognized) return 0; // already processed a 401k withdrawal this year

          let varaibleWithdrawalAmt = 0;

          if (fiscalData.useTrad401k) {
            const withdrawals =
              retirementJS_determine401kWithdrawalsToHitNetTargetOf(
                amount,
                incomeStreams,
                demographics,
                fiscalData
              );

            varaibleWithdrawalAmt = Math.min(
              Math.max(
                traditional401kAccount.availableFunds() - incomeStreams.rmd,
                0
              ),
              withdrawals.withdrawalNeeded
            );
          }

          // Calculate actual net using the sophisticated tax calculation
          incomeResults = {
            ssBreakdown: {},
            incomeBreakdown: {},
            ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
              varaibleWithdrawalAmt,
              incomeStreams,
              demographics,
              fiscalData
            ),
          };

          if (!trialRun) {
            traditional401kAccount.withdraw(
              incomeStreams.rmd,
              TRANSACTION_CATEGORY.DISBURSEMENT
            );
            traditional401kAccount.withdraw(
              varaibleWithdrawalAmt,
              TRANSACTION_CATEGORY.DISBURSEMENT
            );
            savingsAccount.deposit(
              incomeResults.incomeBreakdown.netIncomeLessEarnedInterest(),
              TRANSACTION_CATEGORY.INCOME
            );
            retirementAccountIncomeRecognized = true;
          }
          let netWithdrawals = 0;
          netWithdrawals +=
            incomeResults.incomeBreakdown.translateGrossAmountToNet(
              incomeStreams.rmd
            );
          const variableWitdrawalAmt =
            incomeResults.incomeBreakdown.translateGrossAmountToNet(
              varaibleWithdrawalAmt
            );
          netWithdrawals += variableWitdrawalAmt;

          return netWithdrawals;
        }
        break;
      case ACCOUNT_TYPES.SAVINGS:
        {
          if (!fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

          const fundsNeeded = amount;
          const fundsAvailable = savingsAccount.availableFunds();

          if (fundsAvailable == 0) return 0;

          // Determine how much to withdraw to meet the desired spend
          withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

          if (!trialRun) {
            // Reduce the account balance by the net received amount
            savingsAccount.withdraw(
              withdrawalAmount,
              TRANSACTION_CATEGORY.DISBURSEMENT
            );
          }

          return withdrawalAmount;
        }
        break;
      case ACCOUNT_TYPES.ROTH_IRA:
        {
          // Roth withdrawal (no tax impact)
          const fundsNeeded = amount;
          const fundsAvailable = rothAccount.availableFunds();

          if (fundsAvailable == 0) return 0;

          // Determine how much to withdraw to meet the desired spend
          withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

          if (!trialRun) {
            // Reduce the account balance by the net received amount
            rothAccount.withdraw(
              withdrawalAmount,
              TRANSACTION_CATEGORY.DISBURSEMENT
            );
          }

          return withdrawalAmount;
        }
        break;
      default:
        console.error("Unsupported account type:", accountType);
        return 0;
    }
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
    getFixedIncomeFactors: () => fixedIncomeFactors,
  };

  return result;
}
