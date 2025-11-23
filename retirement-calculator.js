// retirement-calculator.js

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
    inputs.initialAge > 0 &&
    inputs.endAge > inputs.initialAge &&
    (lastCurrentAge !== inputs.initialAge || lastEndAge !== inputs.endAge)
  ) {
    regenerateTaxableIncomeFields();
    regenerateTaxFreeIncomeFields();
    lastCurrentAge = inputs.initialAge;
  }

  // Initialize balances object for tracking
  const accountGroup = new AccountsManager(
    new Account(
      ACCOUNT_TYPES.TRAD_401K,
      inputs.trad401kStartingBalance,
      inputs.trad401kInterestRate
    ),
    new Account(
      ACCOUNT_TYPES.TRAD_ROTH,
      inputs.tradRothStartingBalance,
      inputs.tradRothInterestRate
    ),
    new Account(
      ACCOUNT_TYPES.SAVINGS,
      inputs.savingsStartingBalance,
      inputs.savingsInterestRate
    ),
    new Account(ACCOUNT_TYPES.REVENUE, 0, 0),
    new Account(ACCOUNT_TYPES.DISBURSEMENT, 0, 0)
  );

  // Reset calculations array
  calculations = [];

  // Working years
  for (let y = 0; y < inputs.totalWorkingYears; y++) {
    const workingYearInputs = initializeInputsForWorkingYear(inputs, y);

    const accountYear = AccountYear.FromAccountsManager(
      accountGroup,
      TAX_BASE_YEAR + y
    );

    const workingYearIncomeCalculator = new WorkingYearCalculator(
      workingYearInputs,
      accountYear
    );

    const yearData = workingYearIncomeCalculator.calculateWorkingYearData();

    calculations.push({
      year: accountYear.taxYear,
      yearData,
    });
  }

  // Retirement years
  for (
    let yearIndex = inputs.totalWorkingYears;
    yearIndex < inputs.totalLivingYears - inputs.totalWorkingYears;
    yearIndex++
  ) {
    const retirementYearInputs = initializeInputsForRetirementYear(
      inputs,
      yearIndex
    );

    const accountYear = AccountYear.FromAccountsManager(
      accountGroup,
      TAX_BASE_YEAR + yearIndex
    );

    const calculator = new RetirementYearCalculator(
      retirementYearInputs,
      accountYear
    );

    const yearData = calculator.calculateRetirementYearData();

    yearData.dump();
    debugger;
    calculations.push({
      year: accountYear.taxYear,
      yearData,
    });
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
function initializeInputsForWorkingYear(inputs, yearIndex) {
  const result = Inputs.Clone(inputs);

  result.yearIndex = yearIndex;

  result.additionalSpending = getSpendingOverride(result.age).asCurrency();

  result.setTaxableIncomeAdjustment(
    getTaxableIncomeOverride(getTaxableIncomeOverride(result.age).asCurrency())
  );
  result.taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(
    result.age
  ).asCurrency();

  return result;
}

/**
 * @param {Inputs} inputs
 * @param {number} yearIndex
 */
function initializeInputsForRetirementYear(inputs, yearIndex) {
  const result = Inputs.Clone(inputs);

  result.yearIndex = yearIndex;

  result.additionalSpending = getSpendingOverride(result.age).asCurrency();
  result.setTaxableIncomeAdjustment(
    getTaxableIncomeOverride(result.age).asCurrency()
  );
  result.taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(
    result.age
  ).asCurrency();
  return result;
}
