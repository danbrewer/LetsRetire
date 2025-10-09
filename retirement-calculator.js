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

  const interestCalculator = {
    calculateInterest: (account, calculationIntensity, force) => {
      if (force) {
        account.deposits -= account.interestCalculations._interestEarned; // Remove previously calculated interest
        account.interestCalculations._interestEarned = 0; // Reset to force recalculation
      }

      if (account.interestCalculations._interestEarned != 0) {
        if (
          account.interestCalculations._interestCalculationIntensity ===
          calculationIntensity
        ) {
          return account.interestCalculations._interestEarned;
        }
        account.deposits -= account.interestCalculations._interestEarned; // Remove previously calculated interest
      } // Already calculated

      let earnedInterest = 0;
      account.interestCalculations._interestCalculationIntensity =
        calculationIntensity;
      switch (calculationIntensity) {
        case INTEREST_CALCULATION_INTENSITY.AGGRESSIVE:
          earnedInterest = (
            account.startingBalance * account.interestCalculations._growthRate
          ).asCurrency();
          account.interestCalculations._interestCalculationMethod = `startingBalance * growthRate: ${account.startingBalance} * ${account.interestCalculations._growthRate}`;
          break;
        case INTEREST_CALCULATION_INTENSITY.MODERATE:
          // use the average of starting and ending balance
          earnedInterest = (
            ((account.endingBalance() + account.startingBalance) / 2) *
            account.interestCalculations._growthRate
          ).asCurrency();
          account.interestCalculations._interestCalculationMethod = `(endingBalance + startingBalance) / 2 * growthRate: ${account.endingBalance()} + ${account.startingBalance} / 2 * ${account.interestCalculations._growthRate}`;
          break;
        case INTEREST_CALCULATION_INTENSITY.CONSERVATIVE:
        default:
          account.interestCalculations._interestCalculationIntensity =
            INTEREST_CALCULATION_INTENSITY.CONSERVATIVE;
          earnedInterest = (
            (account.startingBalance - account.withdrawals) *
            account.interestCalculations._growthRate
          ).asCurrency();
          account.interestCalculations._interestCalculationMethod = `(startingBalance - withdrawals) * growthRate: ${account.startingBalance} - ${account.withdrawals} * ${account.interestCalculations._growthRate}`;
          break;
      }
      account.interestCalculations._interestEarned = earnedInterest;
      account.deposits += earnedInterest;
    },
  };

  // Initialize balances object for tracking
  const accounts = {
    traditional401k: {
      startingBalance: inputs.trad401k,
      withdrawals: 0,
      deposits: 0,
      endingBalance() {
        return this.startingBalance + this.deposits - this.withdrawals;
      },
      interestEarned() {
        return this.interestCalculations._interestEarned;
      },
      calculateInterest(calculationIntensity, force) {
        return interestCalculator.calculateInterest(
          this,
          calculationIntensity,
          force
        );
      },
      interestCalculations: {
        _growthRate: inputs.retSavings,
        _interestCalculationIntensity: null,
        _interestCalculationMethod: null,
        _interestEarned: 0,
      },
    },
    rothIra: {
      startingBalance: inputs.rothIRA,
      withdrawals: 0,
      deposits: 0,
      endingBalance() {
        return this.startingBalance + this.deposits - this.withdrawals;
      },
      interestEarned() {
        return this.interestCalculations._interestEarned;
      },
      calculateInterest(calculationIntensity, force) {
        return interestCalculator.calculateInterest(
          this,
          calculationIntensity,
          force
        );
      },
      interestCalculations: {
        _growthRate: inputs.retSavings,
        _interestCalculationIntensity: null,
        _interestCalculationMethod: null,
        _interestEarned: 0,
      },
    },
    savings: {
      startingBalance: inputs.savings,
      withdrawals: 0,
      deposits: 0,
      endingBalance() {
        return this.startingBalance + this.deposits - this.withdrawals;
      },
      interestEarned() {
        return this.interestCalculations._interestEarned;
      },
      calculateInterest(calculationIntensity, force) {
        return interestCalculator.calculateInterest(
          this,
          calculationIntensity,
          force
        );
      },
      interestCalculations: {
        _growthRate: inputs.retSavings,
        _interestCalculationIntensity: null,
        _interestCalculationMethod: null,
        _interestEarned: 0,
      },
    },
    rollForward() {
      this.traditional401k.startingBalance =
        this.traditional401k.endingBalance();
      this.rothIra.startingBalance = this.rothIra.endingBalance();
      this.savings.startingBalance = this.savings.endingBalance();
      this.traditional401k.withdrawals = 0;
      this.traditional401k.deposits = 0;
      this.rothIra.withdrawals = 0;
      this.rothIra.deposits = 0;
      this.savings.withdrawals = 0;
      this.savings.deposits = 0;
      this.traditional401k.interestCalculations._interestEarned = 0;
      this.rothIra.interestCalculations._interestEarned = 0;
      this.savings.interestCalculations._interestEarned = 0;
      this.traditional401k.interestCalculations._interestCalculationIntensity =
        null;
      this.rothIra.interestCalculations._interestCalculationIntensity = null;
      this.savings.interestCalculations._interestCalculationIntensity = null;
      return "void";
    },
  };

  // Reset calculations array
  calculations = [];

  let currentSalary = inputs.startingSalary;
  let totalTaxes = 0;
  let maxDrawdown = { year: null, value: Infinity };

  // Working years
  for (let y = 0; y < inputs.totalWorkingYears; y++) {
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
    accounts.rollForward();
  }

  // Setup retirement years; calculate initial benefit amounts
  const initialBenefits = calculateInitialBenefitAmounts(inputs);
  let ssAnnual = initialBenefits.ssAnnual;
  let penAnnual = initialBenefits.penAnnual;
  let spouseSsAnnual = initialBenefits.spouseSsAnnual;
  let spousePenAnnual = initialBenefits.spousePenAnnual;

  // Retirement years
  for (
    let retirementYear = 0;
    retirementYear < inputs.totalLivingYears - inputs.totalWorkingYears;
    retirementYear++
  ) {
    const benefitAmounts = {
      ssAnnual,
      penAnnual,
      spouseSsAnnual,
      spousePenAnnual,
    };
    const yearData = calculateRetirementYearData(
      inputs,
      retirementYear,
      accounts,
      benefitAmounts
    );

    yearData.accounts = { ...accounts };

    calculations.push({
      year: new Date().getFullYear() + retirementYear,
      ...yearData,
    });

    const totalBal = yearData.balances.total();
    totalTaxes += yearData.taxes.federalTaxes;
    if (totalBal < maxDrawdown.value) {
      maxDrawdown = { year: yearData.year, value: totalBal };
    }

    // Step next year: Apply COLAs to benefits
    const age = yearData.age;
    if (age >= inputs.ssStartAge) ssAnnual *= 1 + inputs.ssCola;
    if (age >= inputs.penStartAge && inputs.penMonthly > 0)
      penAnnual *= 1 + inputs.penCola;

    if (inputs.hasSpouse) {
      const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
      if (spouseCurrentAge >= inputs.spouseSsStartAge)
        spouseSsAnnual *= 1 + inputs.spouseSsCola;
      if (
        spouseCurrentAge >= inputs.spousePenStartAge &&
        inputs.spousePenMonthly > 0
      )
        spousePenAnnual *= 1 + inputs.spousePenCola;
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
    accounts.rollForward();
  }

  // console.log("Calculations: ", calculations);
  // calculations.forEach((calc) => calc.accounts.dump());
  debugger;

  // Generate final output
  generateOutputAndSummary(inputs, rows, totalTaxes, maxDrawdown);
}
