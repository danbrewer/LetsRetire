// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions

// Add default implementations for UI override functions when not available
if (typeof getTaxableIncomeOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
          ? global
          : {})
    );
  })();

  globalThis.getTaxableIncomeOverride = function getTaxableIncomeOverride(age) {
    return 0; // Default to no override
  };
}

if (typeof getTaxFreeIncomeOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
          ? global
          : {})
    );
  })();

  globalThis.getTaxFreeIncomeOverride = function getTaxFreeIncomeOverride(age) {
    return 0; // Default to no override
  };
}

if (typeof getSpendingOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
          ? global
          : {})
    );
  })();

  globalThis.getSpendingOverride = function getSpendingOverride(age) {
    return null; // Default to no override
  };
}

if (typeof setSpendingFieldValue === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
          ? global
          : {})
    );
  })();

  globalThis.setSpendingFieldValue = function setSpendingFieldValue(
    age,
    value
  ) {
    // No-op in non-UI context
  };
}

if (typeof require === "function") {
  // Running in Node.js
  const {
    constsJS_FILING_STATUS,
    retirementJS_determineFederalIncomeTax,
    retirementJS_getTaxBrackets,
    retirementJS_getStandardDeduction,
  } = require("./retirement");
}

function calc() {
  // Track previous ages to only regenerate spending fields when they change
  let lastRetireAge = null;
  let lastEndAge = null;
  let lastCurrentAge = null;

  const inputs = parseInputParameters();

  if (!inputs) return;

  // Auto-regenerate spending override fields only if ages have changed
  if (
    inputs.retireAge > 0 &&
    inputs.endAge > inputs.retireAge &&
    (lastRetireAge !== inputs.retireAge || lastEndAge !== inputs.endAge)
  ) {
    regenerateSpendingFields();
    lastRetireAge = inputs.retireAge;
    lastEndAge = inputs.endAge;
  }

  // Auto-regenerate income adjustment fields only if ages have changed
  if (
    inputs.currentAge > 0 &&
    inputs.endAge > inputs.currentAge &&
    (lastCurrentAge !== inputs.currentAge || lastEndAge !== inputs.endAge)
  ) {
    regenerateTaxableIncomeFields();
    regenerateTaxFreeIncomeFields();
    lastCurrentAge = inputs.currentAge;
  }

  // const interestCalculator = {
  //   calculateInterest: (account, calculationIntensity, force) => {
  //     if (force) {
  //       account.deposits -= account.interestCalculations._interestEarned; // Remove previously calculated interest
  //       account.interestCalculations._interestEarned = 0; // Reset to force recalculation
  //     }

  //     if (account.interestCalculations._interestEarned != 0) {
  //       if (
  //         account.interestCalculations._interestCalculationIntensity ===
  //         calculationIntensity
  //       ) {
  //         return account.interestCalculations._interestEarned;
  //       }
  //       account.deposits -= account.interestCalculations._interestEarned; // Remove previously calculated interest
  //     } // Already calculated

  //     let earnedInterest = 0;
  //     account.interestCalculations._interestCalculationIntensity =
  //       calculationIntensity;
  //     switch (calculationIntensity) {
  //       case INTEREST_CALCULATION_EPOCH.END_OF_YEAR:
  //         earnedInterest = (
  //           account.startingBalance * account.interestCalculations._growthRate
  //         ).asCurrency();
  //         account.interestCalculations._interestCalculationMethod = `startingBalance * growthRate: ${account.startingBalance} * ${account.interestCalculations._growthRate}`;
  //         break;
  //       case INTEREST_CALCULATION_EPOCH.MID_YEAR:
  //         // use the average of starting and ending balance
  //         earnedInterest = (
  //           ((account.endingBalance() + account.startingBalance) / 2) *
  //           account.interestCalculations._growthRate
  //         ).asCurrency();
  //         account.interestCalculations._interestCalculationMethod = `(endingBalance + startingBalance) / 2 * growthRate: ${account.endingBalance()} + ${account.startingBalance} / 2 * ${account.interestCalculations._growthRate}`;
  //         break;
  //       case INTEREST_CALCULATION_EPOCH.BEGINNING_OF_YEAR:
  //       default:
  //         account.interestCalculations._interestCalculationIntensity =
  //           INTEREST_CALCULATION_EPOCH.BEGINNING_OF_YEAR;
  //         earnedInterest = (
  //           (account.startingBalance - account.withdrawals) *
  //           account.interestCalculations._growthRate
  //         ).asCurrency();
  //         account.interestCalculations._interestCalculationMethod = `(startingBalance - withdrawals) * growthRate: ${account.startingBalance} - ${account.withdrawals} * ${account.interestCalculations._growthRate}`;
  //         break;
  //     }
  //     account.interestCalculations._interestEarned = earnedInterest;
  //     account.deposits += earnedInterest;
  //   },
  // };

  debugger;
  // Initialize balances object for tracking
  const accounts = {
    traditional401k: new Account(
      "Traditional 401k",
      inputs.trad401k,
      inputs.ret401k
    ),
    rothIra: new Account("Roth IRA", inputs.rothIRA, inputs.retRoth),
    savings: new Account("Savings", inputs.savings, inputs.retSavings),
  };

  // Reset calculations array
  calculations = [];

  let currentSalary = inputs.startingSalary;
  let totalTaxes = 0;
  let maxDrawdown = { year: null, value: Infinity };

  // Working years
  for (let y = 0; y < inputs.totalWorkingYears; y++) {
    generateYearlyIndexedInputValues(inputs, y);

    const yearData = calculateWorkingYearData(
      inputs,
      y,
      currentSalary,
      accounts
    );

    yearData.accounts = { ...accounts };

    calculations.push({
      year: new Date().getFullYear() + y,
      ...yearData,
    });

    // Track total taxes paid during working years
    totalTaxes += yearData.taxes;

    // Update salary for next year
    currentSalary *= 1 + inputs.salaryGrowth;
    // accounts.rollForward();
  }

  // Setup retirement years; calculate initial benefit amounts
  const initialBenefits = calculateInitialBenefitAmounts(inputs);
  let ssYearlyIndexed = initialBenefits.ssAnnual;
  let penYearlyIndexed = initialBenefits.penAnnual;
  let spouseSsYearlyIndexed = initialBenefits.spouseSsAnnual;
  let spousePenYearlyIndexed = initialBenefits.spousePenAnnual;

  // Retirement years
  for (
    let yearIndex = 0;
    yearIndex < inputs.totalLivingYears - inputs.totalWorkingYears;
    yearIndex++
  ) {
    generateYearlyIndexedInputValues(inputs, yearIndex);

    const benefitAmounts = {
      ssAnnual: ssYearlyIndexed,
      penAnnual: penYearlyIndexed,
      spouseSsAnnual: spouseSsYearlyIndexed,
      spousePenAnnual: spousePenYearlyIndexed,
    };
    const yearData = calculateRetirementYearData(
      inputs,
      accounts,
      benefitAmounts
    );

    yearData.accounts = { ...accounts };

    calculations.push({
      year: new Date().getFullYear() + yearIndex,
      ...yearData,
    });

    const totalBal = yearData.balances.total();
    totalTaxes += yearData.taxes.federalTaxes;
    if (totalBal < maxDrawdown.value) {
      maxDrawdown = { year: yearData.year, value: totalBal };
    }

    // Step next year: Apply COLAs to benefits
    if (age >= inputs.ssStartAge) ssYearlyIndexed *= 1 + inputs.ssCola;
    if (age >= inputs.penStartAge && inputs.penMonthly > 0)
      penYearlyIndexed *= 1 + inputs.penCola;

    if (inputs.hasSpouse) {
      const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
      if (spouseCurrentAge >= inputs.spouseSsStartAge)
        spouseSsYearlyIndexed *= 1 + inputs.spouseSsCola;
      if (
        spouseCurrentAge >= inputs.spousePenStartAge &&
        inputs.spousePenMonthly > 0
      )
        spousePenYearlyIndexed *= 1 + inputs.spousePenCola;
    }

    const annualIncreaseInSpending = (
      inputs.spendAtRetire * inputs.inflation
    ).asCurrency();
    const annualDecreaseInSpending = (
      inputs.spendAtRetire *
      inputs.spendingDecline *
      -1
    ).asCurrency();

    inputs.spendAtRetire += annualIncreaseInSpending + annualDecreaseInSpending;
    // accounts.rollForward();
  }

  // console.log("Calculations: ", calculations);
  // calculations.forEach((calc) => calc.accounts.dump());
  debugger;

  // Generate final output
  generateOutputAndSummary(inputs, rows, totalTaxes, maxDrawdown);
}

// Helper to generate dynamic input values for a given year index
function generateYearlyIndexedInputValues(inputs, yearIndex) {
  const age = inputs.currentAge + inputs.totalWorkingYears + yearIndex;

  inputs.yearIndex = yearIndex;
  inputs.age = age;
  inputs.spouseAge = inputs.hasSpouse
    ? inputs.spouseAge + (age - (inputs.currentAge + inputs.totalWorkingYears))
    : undefined;
  inputs.retirementYear =
    new Date().getFullYear() + inputs.totalWorkingYears + yearIndex;

  inputs.additionalSpending = getSpendingOverride(age).asCurrency();
  inputs.spend = inputs.spendingToday.adjustedForInflation(
    inputs.inflation,
    yearIndex
  );

  inputs.taxableIncomeAdjustment = getTaxableIncomeOverride(age).asCurrency();
  inputs.taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age).asCurrency();
  inputs.otherTaxableIncomeAdjustments =
    getTaxableIncomeOverride(age).asCurrency();
}
