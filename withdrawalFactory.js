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
      availableFunds: () => 0,
      deposit: {},
      withdraw: {},
      calculateEarnedInterest: {},
    };

    function depositIntoSavings(amount) {
      accounts.savings.deposit(
        amount,
        TransactionType.DEPOSIT,
        fiscalData.taxYear
      );
    }

    function withdrawFrom401k(amount) {
      const amountWithdrawn = accounts.traditional401k.withdrawal(
        amount,
        TransactionType.WITHDRAWAL,
        fiscalData.taxYear
      );
    }

    switch (accountType) {
      case "savings":
        targetedAccount.getStartingBalance = () =>
          accounts.savings.startingBalanceForYear(fiscalData.taxYear);
        targetedAccount.availableFunds = () =>
          Math.max(
            accounts.savings.endingBalanceForYear(fiscalData.taxYear),
            0
          );
        targetedAccount.deposit = (v) => {
          depositIntoSavings(v);
        };
        targetedAccount.withdraw = (v) => {
          return accounts.savings.withdrawal(
            v,
            TransactionType.WITHDRAWAL,
            fiscalData.taxYear
          );
        };
        targetedAccount.calculateEarnedInterest = (calculationIntensity) => {
          accounts.savings.calculateInterestForYear(
            calculationIntensity,
            fiscalData.taxYear
          );
        };
        break;
      case "401k":
        targetedAccount.getStartingBalance = () =>
          accounts.traditional401k.startingBalanceForYear(fiscalData.taxYear);
        targetedAccount.availableFunds = () =>
          Math.max(
            accounts.traditional401k.endingBalanceForYear(fiscalData.taxYear),
            0
          );
        targetedAccount.deposit = (v) => {
          accounts.traditional401k.deposit(
            v,
            TransactionType.DEPOSIT,
            fiscalData.taxYear
          );
        };
        targetedAccount.withdraw = (v) => {
          withdrawFrom401k(v);
        };
        targetedAccount.calculateEarnedInterest = (calculationIntensity) => {
          accounts.traditional401k.calculateInterestForYear(
            calculationIntensity,
            fiscalData.taxYear
          );
        };
        break;
      case "roth":
        targetedAccount.getStartingBalance = () =>
          accounts.rothIra.startingBalance;
        targetedAccount.availableFunds = () =>
          Math.max(
            accounts.rothIra.endingBalanceForYear(fiscalData.taxYear),
            0
          );
        targetedAccount.deposit = (v) => {
          accounts.rothIra.deposit(
            v,
            TransactionType.DEPOSIT,
            fiscalData.taxYear
          );
        };
        targetedAccount.withdraw = (v) => {
          return accounts.rothIra.withdrawal(
            v,
            TransactionType.WITHDRAWAL,
            fiscalData.taxYear
          );
        };
        targetedAccount.calculateEarnedInterest = (calculationIntensity) => {
          accounts.rothIra.calculateInterestForYear(
            calculationIntensity,
            fiscalData.taxYear
          );
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
      if (retirementAccountIncomeRecognized) return; // already processed a 401k withdrawal this year

      // Because taxes are calculated based on this withdrawal, even if there is no 401k balance left to withdraw from,
      // we still need to run the tax calculation to determine the correct tax impact of other income sources.
      // However, if there is no balance, we can't withdraw anything, so we skip the withdrawal step.
      // The tax calculation will still be performed below.

      const available401kBalance = Math.min(
        targetedAccount.availableFunds() - incomeStreams.rmd,
        amount
      ).asCurrency();

      const ideal401kWithdrawal =
        retirementJS_determine401kWithdrawalToHitNetTargetOf(
          amount,
          fixedIncomeFactors
        );

      const actual401kWithdrawal = Math.min(
        available401kBalance,
        ideal401kWithdrawal.withdrawalNeeded
      ).asCurrency();

      // Calculate actual net using the sophisticated tax calculation
      incomeResults = {
        ssBreakdown: {},
        incomeBreakdown: {},
        ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
          actual401kWithdrawal,
          fixedIncomeFactors
        ),
      };

      targetedAccount.withdraw(incomeStreams.rmd);
      targetedAccount.withdraw(actual401kWithdrawal);
      depositIntoSavings(
        incomeResults.incomeBreakdown.netIncomeLessEarnedInterest()
      );

      retirementAccountIncomeRecognized = true;
    } else if (accountType === "savings") {
      if (savingsAccountIncomeRecognized) return; // already processed a savings withdrawal this year

      // Check if retirementAccountIncome has already been calculated by a previous withdrawal
      const retirementAcctIncomeHasNotYetBeenRecognized =
        !retirementAccountIncomeRecognized;

      if (retirementAcctIncomeHasNotYetBeenRecognized) {
        // split the amount equally between savings and 401k for tax efficiency
        const halfAmount = (amount / 2).asCurrency();

        // Can savings cover the entire desiredSpend?
        const availableSavings = Math.min(
          accounts.savings.endingBalanceForYear(fiscalData.taxYear),
          halfAmount
        ).asCurrency();

        // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
        // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth

        const proposedIncomeWithRmdWithdrawals = {
          ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
            halfAmount,
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

        retirementAccountIncomeRecognized = true;
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
        INTEREST_CALCULATION_EPOCH.BEGINNING_OF_YEAR,
        true
      );
    } else if (accountType === "roth") {
      // Roth withdrawal (no tax impact)
      const fundsNeeded = expenditureTracker.shortfall();
      const fundsAvailable = targetedAccount.getStartingBalance();
      // Determine how much to withdraw to meet the desired spend
      withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

      // Reduce the account balance by the net received amount
      targetedAccount.withdraw(withdrawalAmount);

      targetedAccount.calculateEarnedInterest(
        INTEREST_CALCULATION_EPOCH.BEGINNING_OF_YEAR,
        true
      );
    } else {
      console.error("Unsupported account type:", accountType);
      return;
    }

    // Update incomeResults if not already done for this year
  }

  // Populate the result object
  const result = {
    withdrawFromTargetedAccount,
    getFinalIncomeResults: () => incomeResults,
  };

  return result;
}
