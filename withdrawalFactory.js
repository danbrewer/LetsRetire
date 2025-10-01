/**
 * Create withdrawal function for a specific retirement year
 */
function withdrawalFactoryJS_createWithdrawalFactory(
  incomeStreams = {},
  fiscalData = {},
  demographics = {},
  rollingBalances = {}
) {
  let incomeResults = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const incomeStreams = {
    taxableSavingsInterestEarned: 0,
    myPension: 0,
    spousePension: 0,
    mySs: 0,
    spouseSs: 0,
    rmd: 0,
    otherTaxableIncomeAdjustments: 0,
    totalIncome() {},
    taxableIncome() {},
    fixedIncomeIncludingSavingsInterest() {},
    fixedIncomeExcludingSavingsInterest() {},
    otherIncomeForPurposesOfSsTaxation() {},
    ssIncome() {},
    nonSsIncome() {},
    ...incomeStreams,
  };

  // Declare and initialize the result object at the top
  const result = {
    withdrawFromTargetedAccount: () => {},
    getFinalIncomeResults: () => incomeResults,
  };

  // **************
  // Sanity checks
  // **************
  if (rollingBalances.length === 0 || !rollingBalances) {
    console.error(
      `rollingBalances is null or undefined.  This is a fatal error`
    );
    return result;
  }
  // **************

  function withdrawFrom(accountType, expenditureTracker) {
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

    // Redeclare and initialize the expenditure tracker object
    // Original declaration is in retirement-calculator.js
    const expTracker = {
      budgeted: 0,
      additionalSpending: 0,
      withdrawalsMade: {
        fromSavings: 0,
        from401k: 0,
        fromRoth: 0,
      },
      totalBudgeted() {},
      actual() {},
      shortfall() {},
      ...expenditureTracker,
    };

    if (expTracker.shortfall() <= 0) return; // No withdrawal needed

    // Determine balance reference and setter function
    const targetedAccount = {
      getBalance: {},
      deposit: {},
      withdraw: {},
    };

    switch (accountType) {
      case "savings":
        targetedAccount.getBalance = () => rollingBalances.savings;
        targetedAccount.deposit = (v) => (rollingBalances.savings += v);
        targetedAccount.withdraw = (v) => {
          rollingBalances.savings -= v;
          expTracker.withdrawalsMade.fromSavings += v;
        };
        break;
      case "401k":
        targetedAccount.getBalance = () => rollingBalances.traditional401k;
        targetedAccount.deposit = (v) => (rollingBalances.traditional401k += v);
        targetedAccount.withdraw = (v) => {
          rollingBalances.traditional401k -= v;
          expTracker.withdrawalsMade.from401k += v;
        };
        break;
      case "roth":
        targetedAccount.getBalance = () => rollingBalances.rothIra;
        targetedAccount.deposit = (v) => (rollingBalances.rothIra = +v);
        targetedAccount.withdraw = (v) => {
          rollingBalances.rothIra -= v;
          expTracker.withdrawalsMade.fromRoth += v;
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

    const otherIncomeFactors = {
      taxableSavingsInterestEarned: incomeStreams.taxableSavingsInterestEarned,
      myPension: incomeStreams.myPension,
      spousePension: incomeStreams.spousePension,
      rmd: incomeStreams.rmd,
      otherTaxableIncomeAdjustments:
        incomeStreams.otherTaxableIncomeAdjustments,
      mySsBenefitsGross: incomeStreams.mySs,
      spouseSsBenefitsGross: incomeStreams.spouseSs,
      standardDeduction: standardDeduction,
      taxBrackets: taxBrackets,
      precision: 0.01, // Precision for binary search convergence
    };

    // Withdrawal amount to be determined
    if (accountType === "401k") {
      if (targetedAccount.getBalance() <= 0) {
        // No funds available, skip
        return;
      }

      const ideal401kWithdrawal =
        retirementJS_determine401kWithdrawalToHitNetTargetOf(
          expTracker.shortfall(),
          otherIncomeFactors
        );

      // Only take what is available in the 401k account
      const amtOf401kToWithdraw = Math.min(
        ideal401kWithdrawal.withdrawalNeeded,
        targetedAccount.getBalance()
      );

      // Calculate actual net using the sophisticated tax calculation
      incomeResults = {
        totalIncome: 0,
        taxableIncome: 0,
        tax: 0,
        netIncome: 0,
        ssBreakdown: {},
        incomeBreakdown: {},
        ...retirementJS_calculateIncomeWhen401kGrossIs(
          amtOf401kToWithdraw,
          otherIncomeFactors
        ),
      };

      targetedAccount.withdraw(amtOf401kToWithdraw);
    } else {
      // Savings or Roth withdrawal (no tax impact)

      // Check if retirementAccountIncome has already been calculated by a previous withdrawal
      const retirementAcctIncomeHasBeenRecognized =
        incomeResults.incomeBreakdown.retirementAcctIncome > 0;
      const retirementAcctIncomeHasNotYetBeenRecognized =
        !retirementAcctIncomeHasBeenRecognized;

      if (retirementAcctIncomeHasNotYetBeenRecognized) {
        // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
        // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth

        const proposedIncomeWithNo401kWithdrawals = {
          ...retirement.retirementJS_calculateIncomeWhen401kGrossIs(
            0,
            otherIncomeFactors
          ),
        };

        // debugger;
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(
          expTracker.shortfall(),
          targetedAccount.getBalance()
        );

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);

        // let remainingSpendNeeded =
        //   desiredSpend -
        //   withdrawalAmount -
        //   proposedNetIncomeWithNo401kWithdrawals.netIncomeLessSavingsInterest;

        // If the remaining needed is not yet zero, don't include the incomeData yet
        if (
          expTracker.shortfall() <= 0 &&
          retirementAcctIncomeHasNotYetBeenRecognized
        ) {
          // Store the incomeData only if it hasn't been recognized yet
          incomeResults = { ...proposedIncomeWithNo401kWithdrawals };
        }
      } else {
        // Retirement account income has been recognized
        // Reference previously recognized incomeData for calculating desired withdrawal
        const fundsNeeded = expTracker.shortfall();
        const fundsAvailable = targetedAccount.getBalance();
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);
      }
    }
  }

  // Populate the result object
  result.withdrawFromTargetedAccount = withdrawFrom;

  return result;
}
