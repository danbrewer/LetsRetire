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
  let savingsAccountIncomeRecognized = false;
  let rothAccountIncomeRecognized = false;

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

  function withdrawFromTargetedAccount(amount, accountType) {
    if (!accountType || typeof accountType !== "string") {
      console.error("Invalid account type:", accountType);
      return 0;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = ["savings", "401k", "roth"];
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

      constructor(accountType) {
        this.#account = getTargetedAccount(accountType);
        if (!this.#account) {
          throw new Error("Invalid account type for TargetedAccount");
        }
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

      deposit(v) {
        return this.#account.deposit(
          v,
          TRANSACTION_TYPE.DEPOSIT,
          fiscalData.taxYear
        );
      }

      withdraw(v) {
        return this.#account.withdrawal(
          v,
          TRANSACTION_TYPE.WITHDRAWAL,
          fiscalData.taxYear
        );
      }

      withdrawals() {
        return this.#account.withdrawalsForYear(fiscalData.taxYear);
      }

      calculateEarnedInterest(calculationIntensity) {
        return this.#account.calculateInterestForYear(
          calculationIntensity,
          fiscalData.taxYear
        );
      }

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

    const standardDeduction = retirementJS_getStandardDeduction(
      demographics.filingStatus,
      fiscalData.taxYear, // year is already the actual year (e.g., 2040)
      fiscalData.inflationRate
    );

    const taxBrackets = retirementJS_getTaxBrackets(
      demographics.filingStatus,
      fiscalData.taxYear,
      fiscalData.inflationRate
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
      standardDeduction: standardDeduction,
      taxBrackets: taxBrackets,
      nonSsIncome: incomeStreams.nonSsIncome(),
      ssIncome: incomeStreams.ssIncome(),
      precision: 0.01, // Precision for binary search convergence
    };

    // Withdrawal amount to be determined
    switch (accountType) {
      case ACCOUNT_TYPES.TRADITIONAL_401K:
        {
          if (retirementAccountIncomeRecognized) return; // already processed a 401k withdrawal this year

          let varaibleWithdrawalAmt = 0;

          if (inputs.useTrad401k) {
            const withdrawals =
              retirementJS_determine401kWithdrawalsToHitNetTargetOf(
                amount,
                fixedIncomeFactors
              );

            varaibleWithdrawalAmt = Math.min(
              Math.max(
                traditional401kAccount.availableFunds() - withdrawals.rmd,
                0
              ),
              withdrawals.withdrawalNeeded
            );

            // targetAmount += savingsShortage * ;
            // const rough401kNeededGross = targetAmount / 0.85;

            // const estimated401kWithdrawalGross = Math.max(
            //   rough401kNeededGross - incomeStreams.rmd,
            //   0
            // );

            // const available401kWithdrawalGross = Math.min(
            //   traditional401kAccount.availableFunds(),
            //   estimated401kWithdrawalGross
            // );

            //   available401kWithdrawalNet = available401kWithdrawalGross * 0.85; // reduce due to income taxes of 15%

            //   const remaining401kFunds =
            //     traditional401kAccount.availableFunds() -
            //     discretionary401kWithdrawal;

            //   const shortfall =
            //     amount -
            //     (discretionary401kWithdrawal + desiredSavingsWithdrawal);
            //   if (shortfall > 0) {
            //     if (remaining401kFunds > shortfall * 1.15) {
            //       discretionary401kWithdrawal += shortfall * 1.15;
            //     }
            //   }
          }

          // discretionary401kWithdrawal = Math.min(
          //   available401kBalance,
          //   ideal401kWithdrawalGross.withdrawalNeeded
          // ).asCurrency();
          // }

          // Calculate actual net using the sophisticated tax calculation
          incomeResults = {
            ssBreakdown: {},
            incomeBreakdown: {},
            ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
              varaibleWithdrawalAmt,
              fixedIncomeFactors
            ),
          };

          traditional401kAccount.withdraw(fixedIncomeFactors.rmd);
          traditional401kAccount.withdraw(varaibleWithdrawalAmt);

          const netWithdrawals =
            incomeResults.incomeBreakdown.translateGrossAmountToNet(
              withdrawals.rmd
            ) +
            incomeResults.incomeBreakdown.translateGrossAmountToNet(
              varaibleWithdrawalAmt
            );

          retirementAccountIncomeRecognized = true;

          return amount - netWithdrawals;

          depositIntoSavings(
            incomeResults.incomeBreakdown.netIncomeLessEarnedInterest()
          );

          retirementAccountIncomeRecognized = true;
        }
        break;
      case ACCOUNT_TYPES.SAVINGS:
        {
          if (savingsAccountIncomeRecognized || !inputs.useSavings) return; // already processed a savings withdrawal this year

          // let totalSavingsWithdrawal = Math.min(
          //   savingsAccount.availableFunds(),
          //   targetAmount
          // );

          const fundsNeeded = amount;
          const fundsAvailable = savingsAccount.availableFunds();
          // Determine how much to withdraw to meet the desired spend
          withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

          // Reduce the account balance by the net received amount
          savingsAccount.withdraw(withdrawalAmount);

          savingsAccountIncomeRecognized = true;

          return amount - withdrawalAmount;

          // // Check if retirementAccountIncome has already been calculated by a previous withdrawal
          // const halfAmount = (amount / 2).asCurrency();
          // let targetAmount = inputs.useTrad401k ? halfAmount : targetAmount;

          // let initialSavingsWithdrawal = Math.min(
          //   savingsAccount.availableFunds(),
          //   targetAmount
          // );

          // let estimated401kWithdrawalNet = 0;

          // if (inputs.useTrad401k) {
          //   if (retirementAccountIncomeRecognized) {
          //     estimated401kWithdrawalNet =
          //       traditional401kAccount.withdrawals() * 0.85;
          //   } else {
          //     const roughIdeal401kNeededGross = targetAmount / 0.85;
          //     const actualAvailable401kWithdrawalGross = Math.min(
          //       traditional401kAccount.availableFunds(),
          //       roughIdeal401kNeededGross
          //     );

          //     estimated401kWithdrawalNet =
          //       actualAvailable401kWithdrawalGross * 0.85; // reduce due to income taxes of 15%
          // }
          // }

          // const remainingSavingsFunds = Math.max(
          //   savingsAccount.availableFunds() - initialSavingsWithdrawal,
          //   0
          // );

          // const shortfall =
          //   amount - (estimated401kWithdrawalNet + initialSavingsWithdrawal);
          // if (shortfall > 0) {
          //   if (remainingSavingsFunds > shortfall) {
          //     initialSavingsWithdrawal += shortfall;
          //   } else {
          //     initialSavingsWithdrawal += remainingSavingsFunds;
          //   }
          // }
          // savingsAccount.withdraw(totalSavingsWithdrawal);
          savingsAccountIncomeRecognized = true;

          // if (retirementAcctIncomeHasNotYetBeenRecognized) {
          //   let retAcctPortionAsk = halfAmount * 1.15; // assume 15% effective tax rate for initial estimate

          //   const available401kBalance = Math.min(
          //     savingsAccount.availableFunds(),
          //     retAcctPortionAsk // assume 15% effective tax rate for initial estimate
          //   ).asCurrency();

          //   // Determine how much is available in the 401k after RMD
          //   traditional401kAccount.withdraw(incomeStreams.rmd);

          //   const retAccountShortfall = Math.max(
          //     halfAmount - retAcctPortionAsk,
          //     0
          //   );

          //   let savingsPortionAsk = halfAmount + retAccountShortfall;
          //   if (retAccountShortfall > 0) {
          //     // If the 401k can cover the entire halfAmount, let the 401k withdrawal logic handle it
          //   }

          //   const availableSavings = Math.min(
          //     savingsAccount.endingBalanceForYear(),
          //     halfAmount
          //   ).asCurrency();

          //   // Determine how much to withdraw to meet the desired spend
          //   let withdrawalAmount = Math.min(
          //     availableSavings,
          //     savingsPortionAsk
          //   ).asCurrency();

          //   // Withdraw from savings first to cover half the amount
          //   savingsAccount.withdraw(withdrawalAmount);

          //   // Calculate the remaining amount needed after withdrawing from savings
          //   const remainingAmount = amount - withdrawalAmount;

          //   // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
          //   // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth

          //   const proposedIncomeWithRmdWithdrawals = {
          //     ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
          //       halfAmount,
          //       fixedIncomeFactors
          //     ),
          //   };

          //   // this COULD be negative if income sources are not enough to cover taxes owed
          //   const incomeNotAlreadyInSavings =
          //     proposedIncomeWithRmdWithdrawals.incomeBreakdown.netIncomeLessEarnedInterest();

          //   depositIntoSavings(incomeNotAlreadyInSavings);

          //   // reduce the desiredSpend by the income not already in savings
          //   let remainingSpend = Math.max(
          //     0,
          //     amount - incomeNotAlreadyInSavings
          //   );

          //   // Determine how much to withdraw to meet the desired spend
          //   withdrawalAmount = Math.min(
          //     remainingSpend,
          //     targetedAccount.getStartingBalance()
          //   );

          //   // Reduce the account balance by the net received amount
          //   targetedAccount.withdraw(withdrawalAmount);

          //   remainingSpend = Math.max(remainingSpend - withdrawalAmount, 0);

          //   // If the remaining needed is not yet zero, don't include the incomeData yet
          //   if (retirementAcctIncomeHasNotYetBeenRecognized) {
          //     // Store the incomeData only if it hasn't been recognized yet
          //     incomeResults = { ...proposedIncomeWithRmdWithdrawals };
          //   }

          //   retirementAccountIncomeRecognized = true;
          // } else {
          //   // Retirement account income has been recognized
          //   // Reference previously recognized incomeData for calculating desired withdrawal
          //   const fundsNeeded = amount;
          //   const fundsAvailable = targetedAccount.getStartingBalance();
          //   // Determine how much to withdraw to meet the desired spend
          //   withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

          //   // Reduce the account balance by the net received amount
          //   targetedAccount.withdraw(withdrawalAmount);
          //   return amount - withdrawalAmount;
          // }

          // targetedAccount.calculateEarnedInterest(
          //   INTEREST_CALCULATION_EPOCH.STARTING_BALANCE,
          //   true
          // );
        }
        break;
      case ACCOUNT_TYPES.ROTH_IRA:
        {
          // Roth withdrawal (no tax impact)
          const fundsNeeded = amount;
          const fundsAvailable = rothAccount.availableFunds();
          // Determine how much to withdraw to meet the desired spend
          withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

          // Reduce the account balance by the net received amount
          rothAccount.withdraw(withdrawalAmount);

          return amount - withdrawalAmount;
        }
        break;
      default:
        console.error("Unsupported account type:", accountType);
        return amount;
    }
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
  };

  return result;
}
