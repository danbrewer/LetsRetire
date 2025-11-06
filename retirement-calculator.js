// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions

// // Add default implementations for UI override functions when not available
// if (typeof getTaxableIncomeOverride === "undefined") {
//   const globalThis = (function () {
//     return (
//       this ||
//       (typeof window !== "undefined"
//         ? window
//         : typeof global !== "undefined"
//           ? global
//           : {})
//     );
//   })();

//   globalThis.getTaxableIncomeOverride = function getTaxableIncomeOverride(age) {
//     return 0; // Default to no override
//   };
// }

// if (typeof getTaxFreeIncomeOverride === "undefined") {
//   const globalThis = (function () {
//     return (
//       this ||
//       (typeof window !== "undefined"
//         ? window
//         : typeof global !== "undefined"
//           ? global
//           : {})
//     );
//   })();

//   globalThis.getTaxFreeIncomeOverride = function getTaxFreeIncomeOverride(age) {
//     return 0; // Default to no override
//   };
// }

// if (typeof getSpendingOverride === "undefined") {
//   const globalThis = (function () {
//     return (
//       this ||
//       (typeof window !== "undefined"
//         ? window
//         : typeof global !== "undefined"
//           ? global
//           : {})
//     );
//   })();

//   globalThis.getSpendingOverride = function getSpendingOverride(age) {
//     return null; // Default to no override
//   };
// }

// if (typeof setSpendingFieldValue === "undefined") {
//   const globalThis = (function () {
//     return (
//       this ||
//       (typeof window !== "undefined"
//         ? window
//         : typeof global !== "undefined"
//           ? global
//           : {})
//     );
//   })();

//   globalThis.setSpendingFieldValue = function setSpendingFieldValue(
//     age,
//     value
//   ) {
//     // No-op in non-UI context
//   };
// }

// if (typeof require === "function") {
//   // Running in Node.js
//   const {
//     constsJS_FILING_STATUS,
//     retirementJS_determineFederalIncomeTax,
//     retirementJS_getTaxBrackets,
//     retirementJS_getStandardDeduction,
//   } = require("./retirement");
// }

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

  // Initialize balances object for tracking
  const accountGroup = new AccountsManager(
    new Account("Trad 401k", inputs.trad401k, inputs.ret401k),
    new Account("Trad Roth", inputs.rothIRA, inputs.retRoth),
    new Account("Savings", inputs.savings, inputs.retSavings)
  );

  // Reset calculations array
  calculations = [];

  let currentSalary = inputs.startingSalary;
  let totalTaxes = 0;
  // let maxDrawdown = { year: null, value: Infinity };

  // Working years
  for (let y = 0; y < inputs.totalWorkingYears; y++) {
    generateYearlyIndexedInputValues(inputs, y);

    const accountYear = AccountYear.FromAccountsManager(
      accountGroup,
      TAX_BASE_YEAR + y
    );

    const yearData = calculateWorkingYearData(
      inputs,
      y,
      currentSalary,
      accountYear
    );

    yearData.accountYear = accountYear;

    calculations.push({
      year: new Date().getFullYear() + y,
      yearData,
    });

    // Track total taxes paid during working years
    totalTaxes += yearData.taxes?.federalTaxesOwed || 0;

    // Update salary for next year
    currentSalary *= 1 + inputs.salaryGrowth;
  }

  // Setup retirement years; calculate initial benefit amounts
  const initialBenefits = common_calculateInitialBenefitAmounts(inputs);
  let ssYearlyIndexed = initialBenefits.ssAnnual;
  let penYearlyIndexed = initialBenefits.penAnnual;
  let spouseSsYearlyIndexed = initialBenefits.spouseSsAnnual;
  let spousePenYearlyIndexed = initialBenefits.spousePenAnnual;

  // Retirement years
  for (
    let yearIndex = inputs.totalWorkingYears;
    yearIndex < inputs.totalLivingYears - inputs.totalWorkingYears;
    yearIndex++
  ) {
    generateYearlyIndexedInputValues(inputs, yearIndex);

    const benefitAmounts = new BenefitAmounts(
      ssYearlyIndexed,
      penYearlyIndexed,
      spouseSsYearlyIndexed,
      spousePenYearlyIndexed
    );

    const accountYear = AccountYear.FromAccountsManager(
      accountGroup,
      TAX_BASE_YEAR + yearIndex
    );

    const yearData = calculateRetirementYearData(
      inputs,
      accountYear,
      benefitAmounts
    );

    // yearData.dump();
    debugger;
    calculations.push({
      year: new Date().getFullYear() + yearIndex,
      yearData,
    });

    // const totalBal = yearData.balances.total();
    totalTaxes += yearData.taxes.federalTaxesOwed;
    // if (totalBal < maxDrawdown.value) {
    //   maxDrawdown = { year: inputs.y, value: totalBal };
    // }

    // Step next year: Apply COLAs to benefits
    if (inputs.age >= inputs.ssStartAge) ssYearlyIndexed *= 1 + inputs.ssCola;
    if (inputs.age >= inputs.penStartAge && inputs.penMonthly > 0)
      penYearlyIndexed *= 1 + inputs.penCola;

    if (inputs.hasSpouse) {
      if (inputs.spouseAge >= inputs.spouseSsStartAge)
        spouseSsYearlyIndexed *= 1 + inputs.spouseSsCola;
      if (
        inputs.spouseAge >= inputs.spousePenStartAge &&
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
  }

  debugger;

  // Generate final output
  // generateOutputAndSummary(inputs, rows); //, totalTaxes, maxDrawdown);
}

// Helper to generate dynamic input values for a given year index
/**
 * @param {Inputs} inputs
 * @param {number} yearIndex
 */
function generateYearlyIndexedInputValues(inputs, yearIndex) {
  const age = inputs.currentAge + yearIndex;

  inputs.yearIndex = yearIndex;
  inputs.age = age;
  inputs.spouseAge = inputs.hasSpouse ? inputs.currentSpouseAge + yearIndex : 0;
  inputs.retirementYear = new Date().getFullYear() + yearIndex;

  inputs.additionalSpending = getSpendingOverride(age).asCurrency();
  inputs.spend = inputs.spendingToday
    .adjustedForInflation(inputs.inflation, yearIndex)
    .asCurrency();

  inputs.taxableIncomeAdjustment = getTaxableIncomeOverride(age).asCurrency();
  inputs.taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age).asCurrency();
  inputs.otherTaxableIncomeAdjustments =
    getTaxableIncomeOverride(age).asCurrency();

  inputs.savingsUseAge = inputs.retireAge;
  inputs.trad401kUseAge = inputs.retireAge;
  inputs.rothUseAge = inputs.retireAge;

  inputs.useSavings = true; // age > inputs.savingsUseAge;
  inputs.useTrad401k = true; // age > inputs.trad401kUseAge;
  inputs.useRoth = true; //age > inputs.rothUseAge;
}
