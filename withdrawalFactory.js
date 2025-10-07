/**
 * Create withdrawal function for a specific retirement year
 */
function withdrawalFactoryJS_createWithdrawalFactory(
  incomeStreamsData = {},
  fiscalData = {},
  demographics = {},
  accounts = {}
) {
  let incomeResults = {
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const incomeStreams = {
    estimatedInterestEarned: 0,
    myPension: 0,
    spousePension: 0,
    mySs: 0,
    spouseSs: 0,
    rmd: 0,
    otherTaxableIncomeAdjustments: 0,
    totalIncome() {},
    taxableIncome() {},
    // fixedIncomeInclSavingsInterest() {},
    // fixedIncomeExclSavingsInterest() {},
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

  function withdrawFromTargetedAccount(accountType, expenditureTracker) {
    // **************
    // Sanity checks
    // **************
    // Input sanitization
    // debugger;
    if (!expenditureTracker || typeof expenditureTracker !== "object") {
      console.error("Invalid expenditure tracker:", expenditureTracker);
      return;
    }

    if (!accountType || typeof accountType !== "string") {
      console.error("Invalid withdrawal kind:", accountType);
      return;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = ["savings", "401k", "roth"];
    if (!validKinds.includes(accountType)) {
      console.error(
        "Withdrawal target not defined or not supported:",
        accountType
      );
      console.error("Expected one of:", validKinds.join(", "));
      return;
    }

    // Determine balance reference and setter function
    const targetedAccount = {
      getStartingBalance: {},
      deposit: {},
      withdraw: {},
      calculateEarnedInterest: {},
    };

    function depositIntoSavings(amount) {
      if (amount <= 0) return; // No deposit needed
      accounts.savings.deposits += amount;
      expenditureTracker.depositsMade.toSavings += amount;
      // Optionally, track deposits if needed
      // expenditureTracker.depositsMade.toSavings += amount;
    }

    switch (accountType) {
      case "savings":
        targetedAccount.getStartingBalance = () => accounts.savings;
        targetedAccount.deposit = (v) => {
          depositIntoSavings(v);
        };
        targetedAccount.withdraw = (v) => {
          accounts.savings.withdrawals += v;
          expenditureTracker.withdrawalsMade.fromSavings += v;
        };
        targetedAccount.calculateEarnedInterest = () => {
          if (accounts.savings.interestEarned > 0) return; // Already calculated
          const interestEarned =
            accounts.savings.balanceSubjectToInterest() *
            fiscalData.savingsRateOfReturn;
          accounts.savings.interestEarned = interestEarned;
          depositIntoSavings(interestEarned);
        };
        break;
      case "401k":
        targetedAccount.getStartingBalance = () => accounts.traditional401k;
        targetedAccount.deposit = (v) => {
          accounts.traditional401k.deposits = +v;
          expenditureTracker.depositsMade.to401k += v;
        };
        targetedAccount.withdraw = (v) => {
          accounts.traditional401k.withdrawals += v;
          expenditureTracker.withdrawalsMade.from401k += v;
        };
        targetedAccount.calculateEarnedInterest = () => {
          if (accounts.traditional401k.interestEarned > 0) return; // Already calculated
          const interestEarned =
            accounts.traditional401k.balanceSubjectToInterest() *
            fiscalData.retirementAccountRateOfReturn;
          accounts.traditional401k.interestEarned = interestEarned;
          targetedAccount.deposit(interestEarned);
        };
        break;
      case "roth":
        targetedAccount.getStartingBalance = () => accounts.rothIra;
        targetedAccount.deposit = (v) => {
          accounts.rothIra.deposits = +v;
          expenditureTracker.depositsMade.toRoth += v;
        };
        targetedAccount.withdraw = (v) => {
          accounts.rothIra.withdrawals += v;
          expenditureTracker.withdrawalsMade.fromRoth += v;
        };
        targetedAccount.calculateEarnedInterest = () => {
          if (accounts.rothIra.interestEarned > 0) return; // Already calculated
          const interestEarned =
            accounts.rothIra.balanceSubjectToInterest() *
            fiscalData.rothRateOfReturn;
          accounts.rothIra.interestEarned = interestEarned;
          targetedAccount.deposit(interestEarned);
        };
        break;
      default:
        console.error("Unknown account type:", accountType);
        return result;
    }

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
      estimatedInterestEarned: incomeStreams.estimatedInterestEarned,
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
    if (accountType === "401k") {
      // Because taxes are calculated based on this withdrawal, even if there is no 401k balance left to withdraw from,
      // we still need to run the tax calculation to determine the correct tax impact of other income sources.
      // However, if there is no balance, we can't withdraw anything, so we skip the withdrawal step.
      // The tax calculation will still be performed below.

      const available401kBalance = Math.max(
        targetedAccount.getStartingBalance(),
        0
      );

      const ideal401kWithdrawal =
        retirementJS_determine401kWithdrawalToHitNetTargetOf(
          expenditureTracker.shortfall(),
          fixedIncomeFactors
        );

      // Only take what is available in the 401k account
      const amtOf401kToWithdraw = Math.min(
        ideal401kWithdrawal.withdrawalNeeded,
        available401kBalance
      );

      // Calculate actual net using the sophisticated tax calculation
      incomeResults = {
        ssBreakdown: {},
        incomeBreakdown: {},
        ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
          amtOf401kToWithdraw,
          fixedIncomeFactors
        ),
      };

      targetedAccount.withdraw(amtOf401kToWithdraw);
    } else {
      // Savings or Roth withdrawal (no tax impact)

      // Check if retirementAccountIncome has already been calculated by a previous withdrawal
      const retirementAcctIncomeHasBeenRecognized =
        incomeResults.incomeBreakdown.retirementAccountWithdrawal > 0;
      const retirementAcctIncomeHasNotYetBeenRecognized =
        !retirementAcctIncomeHasBeenRecognized;

      if (retirementAcctIncomeHasNotYetBeenRecognized) {
        // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
        // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth

        const proposedIncomeWithNo401kWithdrawals = {
          ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
            0,
            fixedIncomeFactors
          ),
        };

        // this COULD be negative if income sources are not enough to cover taxes owed
        const incomeNotAlreadyInSavings =
          proposedIncomeWithNo401kWithdrawals.incomeBreakdown.netIncomeLessEarnedInterest();

        depositIntoSavings(incomeNotAlreadyInSavings);

        // reduce the desiredSpend by the income not already in savings
        let remainingSpend = Math.max(0, expenditureTracker.shortfall());
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(
          remainingSpend,
          targetedAccount.getStartingBalance()
        );

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);

        remainingSpend = Math.max(remainingSpend - withdrawalAmount, 0);

        // If the remaining needed is not yet zero, don't include the incomeData yet
        if (
          remainingSpend <= 0 &&
          retirementAcctIncomeHasNotYetBeenRecognized
        ) {
          // Store the incomeData only if it hasn't been recognized yet
          incomeResults = { ...proposedIncomeWithNo401kWithdrawals };
        }
      } else {
        // Retirement account income has been recognized
        // Reference previously recognized incomeData for calculating desired withdrawal
        const fundsNeeded = expenditureTracker.shortfall();
        const fundsAvailable = targetedAccount.getStartingBalance();
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);
      }
      targetedAccount.calculateEarnedInterest();
    }
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
  };

  return result;
}
