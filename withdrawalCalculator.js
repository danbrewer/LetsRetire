/**
 * Create withdrawal function for a specific retirement year
 */
function createWithdrawalFactory(
  incomeStreams = {},
  fiscalData = {},
  demographics = {},
  rollingBalances = {}
) {
  const withdrawalsMade = {
    retirementAccount: 0,
    savingsAccount: 0,
    roth: 0,
  };

  let incomeResults = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
  };
  // Declare and initialize the result object at the top
  const result = {
    withdrawFromTargetedAccount: () => {},
    getWithdrawalsMade: () => withdrawalsMade,
    getFinalIncomeResults: () => incomeResults,
  };

  // **************
  // Sanity checks
  // **************
  // if (isNaN(closuredCopyOfFixedPortionOfTaxableIncome)) {
  //   console.error(
  //     `closuedCopyOfFixedPortionOfTaxableIncome is NaN.  This is a fatal error`
  //   );
  //   return result;
  // }
  if (rollingBalances.length === 0 || !rollingBalances) {
    console.error(
      `rollingBalances is null or undefined.  This is a fatal error`
    );
    return result;
  }
  // **************

  function withdrawFrom(accountType, desiredSpend) {
    // **************
    // Sanity checks
    // **************
    // Validate kind parameter
    debugger;
    if (!accountType || typeof accountType !== "string") {
      console.error("Invalid withdrawal kind:", accountType);
      return 0;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = ["savings", "401k", "roth"];
    if (!validKinds.includes(accountType)) {
      console.error(
        "Withdrawal target not defined or not supported:",
        accountType
      );
      console.error("Expected one of:", validKinds.join(", "));
      return 0;
    }

    if (desiredSpend <= 0) return 0;

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
          withdrawalsMade.savingsAccount += v;
        };
        break;
      case "401k":
        targetedAccount.getBalance = () => rollingBalances.traditional401k;
        targetedAccount.deposit = (v) => (rollingBalances.traditional401k += v);
        targetedAccount.withdraw = (v) => {
          rollingBalances.traditional401k -= v;
          withdrawalsMade.retirementAccount += v;
        };
        break;
      case "roth":
        targetedAccount.getBalance = () => rollingBalances.rothIra;
        targetedAccount.deposit = (v) => (rollingBalances.rothIra = +v);
        targetedAccount.withdraw = (v) => {
          rollingBalances.rothIra -= v;
          withdrawalsMade.roth += v;
        };
        break;
      default:
        console.error("Unknown account type:", accountType);
        return result;
    }

    const standardDeduction = getStandardDeduction(
      demographics.filingStatus,
      fiscalData.taxYear, // year is already the actual year (e.g., 2040)
      fiscalData.inflationRate
    );

    const taxBrackets = getTaxBrackets(
      demographics.filingStatus,
      fiscalData.taxYear,
      fiscalData.inflationRate
    );

    const opts = {
      pensionAndMiscIncome:
        incomeStreams.fixedPortion() - incomeStreams.ssIncome(),
      taxableSavingsInterest: incomeStreams.taxableInterest,
      mySsBenefitsGross: incomeStreams.mySs,
      spouseSsBenefitsGross: incomeStreams.spouseSs,
      standardDeduction: standardDeduction,
      brackets: taxBrackets,
      precision: 0.01, // Precision for binary search convergence
    };

    if (accountType === "401k") {
      const ideal401kWithdrawal = determine401kWithdrawalToHitNetTargetOf(
        desiredSpend,
        opts
      );

      // Only take what is available in the 401k account
      const withdrawalAmountNeeded = Math.min(
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
        ...calculate401kNetWhen401kGrossIs(withdrawalAmountNeeded, opts),
      };

      targetedAccount.withdraw(withdrawalAmountNeeded);

      remainingSpendNeeded =
        desiredSpend - incomeResults.netIncomeLessSavingsInterest;

      return remainingSpendNeeded;
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
          ...calculate401kNetWhen401kGrossIs(0, opts),
        };

        debugger;
        const fundsNeeded =
          desiredSpend -
          proposedIncomeWithNo401kWithdrawals.netIncomeLessSavingsInterest;

        const fundsAvailable = targetedAccount.getBalance();
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);

        let remainingSpendNeeded =
          desiredSpend -
          withdrawalAmount -
          proposedIncomeWithNo401kWithdrawals.netIncomeLessSavingsInterest;

        // If the remaining needed is not yet zero, don't include the incomeData yet
        if (remainingSpendNeeded > 0) {
          // Only reduce the remaining spend need by the amount actually withdrawn
          remainingSpendNeeded = desiredSpend - withdrawalAmount;
        } else {
          // Net income + savings/Roth covered the entire desired spend
          if (retirementAcctIncomeHasNotYetBeenRecognized) {
            // Store the incomeData only if it hasn't been recognized yet
            incomeResults = { ...proposedIncomeWithNo401kWithdrawals };
          }
        }
        return remainingSpendNeeded;
      } else {
        // Retirement account income has been recognized
        // Reference previously recognized incomeData for calculating desired withdrawal
        const fundsNeeded = desiredSpend;
        const fundsAvailable = targetedAccount.getBalance();
        // Determine how much to withdraw to meet the desired spend
        withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

        // Reduce the account balance by the net received amount
        targetedAccount.withdraw(withdrawalAmount);

        let remainingSpendNeeded = desiredSpend - withdrawalAmount;

        return remainingSpendNeeded;
      }

      // // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
      // // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth
      // let tempIncomeData = {};

      // if (retirementAcctIncomeHasBeenRecognized) {
      //   // Reference previously recognized incomeData for calculating desired withdrawal
      //   tempIncomeData = {
      //     ...incomeResults,
      //   };
      // } else {
      //   // Estimate incomeData with $0 401k withdrawal to determine current net income
      //   tempIncomeData = {
      //     ...calculate401kNetWhen401kGrossIs(0, opts),
      //   };
      // }

      // // Determine how much to withdraw to meet the desired spend
      // withdrawalAmount = Math.min(
      //   desiredSpend - tempIncomeData.netIncome,
      //   targetedAccount.getBalance()
      // );

      // if (kind === "savings") {
      //   withdrawalsMade.savingsAccount += withdrawalAmount;
      // }
      // if (kind === "roth") {
      //   withdrawalsMade.roth += withdrawalAmount;
      // }

      // // Reduce the account balance by the net received amount
      // targetedAccount.widthdraw(withdrawalAmount);

      // let remainingSpendNeeded = desiredSpend - withdrawalAmount;

      // // Try to zero out the remaining spend needed with net income if it hasn't been recognized yet
      // if (retirementAcctIncomeHasNotYetBeenRecognized) {
      //   remainingSpendNeeded -= tempIncomeData.netIncome;
      // }

      // // If the remaining needed is not yet zero, don't include the incomeData yet
      // if (remainingSpendNeeded > 0) {
      //   // Only reduce the remaining spend need by the amount actually withdrawn
      //   remainingSpendNeeded = desiredSpend - withdrawalAmount;
      // } else {
      //   // Net income + savings/Roth covered the entire desired spend
      //   if (retirementAcctIncomeHasNotYetBeenRecognized) {
      //     // Store the incomeData only if it hasn't been recognized yet
      //     incomeResults = { ...tempIncomeData };
      //   }
      // }

      // return remainingSpendNeeded;
    }
  }

  // Populate the result object
  result.withdrawFromTargetedAccount = withdrawFrom;

  return result;
}
