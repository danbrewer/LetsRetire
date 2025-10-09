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
      endingBalance: () => 0,
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

    function withdrawFrom401k(amount) {
      if (amount <= 0) return; // No deposit needed
      const amountToWithdraw = Math.min(
        accounts.traditional401k.endingBalance(),
        amount
      );
      accounts.traditional401k.withdrawals += amountToWithdraw;
      expenditureTracker.withdrawalsMade.from401k += amountToWithdraw;
      // Optionally, track withdrawals if needed
      // expenditureTracker.withdrawalsMade.from401k += amountToWithdraw;
    }

    switch (accountType) {
      case "savings":
        targetedAccount.getStartingBalance = () =>
          accounts.savings.startingBalance;
        targetedAccount.endingBalance = () => accounts.savings.endingBalance();
        targetedAccount.deposit = (v) => {
          depositIntoSavings(v);
        };
        targetedAccount.withdraw = (v) => {
          const amountToWithdraw = Math.min(
            accounts.savings.endingBalance(),
            v
          );
          accounts.savings.withdrawals += amountToWithdraw;
          expenditureTracker.withdrawalsMade.fromSavings += amountToWithdraw;
        };
        targetedAccount.calculateEarnedInterest = (
          calculationIntensity,
          force
        ) => {
          accounts.savings.calculateInterest(calculationIntensity, force);
        };
        break;
      case "401k":
        targetedAccount.getStartingBalance = () =>
          accounts.traditional401k.startingBalance;
        targetedAccount.endingBalance = () =>
          accounts.traditional401k.endingBalance();
        targetedAccount.deposit = (v) => {
          accounts.traditional401k.deposits = +v;
          expenditureTracker.depositsMade.to401k += v;
        };
        targetedAccount.withdraw = (v) => {
          withdrawFrom401k(v);
        };
        targetedAccount.calculateEarnedInterest = (
          calculationIntensity,
          force
        ) => {
          accounts.traditional401k.calculateInterest(
            calculationIntensity,
            force
          );
        };
        break;
      case "roth":
        targetedAccount.getStartingBalance = () =>
          accounts.rothIra.startingBalance;
        targetedAccount.endingBalance = () => accounts.rothIra.endingBalance();
        targetedAccount.deposit = (v) => {
          accounts.rothIra.deposits = +v;
          expenditureTracker.depositsMade.toRoth += v;
        };
        targetedAccount.withdraw = (v) => {
          const amountToWithdraw = Math.min(
            accounts.rothIra.endingBalance(),
            v
          );
          accounts.rothIra.withdrawals += amountToWithdraw;
          expenditureTracker.withdrawalsMade.fromRoth += amountToWithdraw;
        };
        targetedAccount.calculateEarnedInterest = (
          calculationIntensity,
          force
        ) => {
          accounts.rothIra.calculateInterest(calculationIntensity, force);
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
    if (accountType === "401k") {
      // Because taxes are calculated based on this withdrawal, even if there is no 401k balance left to withdraw from,
      // we still need to run the tax calculation to determine the correct tax impact of other income sources.
      // However, if there is no balance, we can't withdraw anything, so we skip the withdrawal step.
      // The tax calculation will still be performed below.

      const available401kBalance = Math.max(
        targetedAccount.endingBalance(),
        0
      ).asCurrency();

      const ideal401kWithdrawal =
        retirementJS_determine401kWithdrawalToHitNetTargetOf(
          expenditureTracker.shortfall(),
          fixedIncomeFactors
        );

      ideal401kWithdrawal.withdrawalNeeded = Math.max(
        ideal401kWithdrawal.withdrawalNeeded - incomeStreams.rmd,
        0
      ).asCurrency();

      // Only take what is available in the 401k account
      const amtOf401kToWithdraw = Math.min(
        ideal401kWithdrawal.withdrawalNeeded,
        available401kBalance
      ).asCurrency();

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
      targetedAccount.withdraw(incomeStreams.rmd);
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

        const proposedIncomeWithRmdWithdrawals = {
          ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
            incomeStreams.rmd,
            fixedIncomeFactors
          ),
        };

        // this COULD be negative if income sources are not enough to cover taxes owed
        const incomeNotAlreadyInSavings =
          proposedIncomeWithRmdWithdrawals.incomeBreakdown.netIncomeLessEarnedInterest();

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
          incomeResults = { ...proposedIncomeWithRmdWithdrawals };
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
      targetedAccount.calculateEarnedInterest(
        INTEREST_CALCULATION_INTENSITY.CONSERVATIVE,
        true
      );
    }
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
  };

  return result;
}
