import { AccountingYear } from "./cAccountingYear.js";
import { AccountsManager } from "./cAccountsManager.js";
import { Calculation, Calculations } from "./cCalculation.js";
import { Inputs } from "./cInputs.js";
import { TAX_BASE_YEAR } from "./consts.js";
import { ReportsManager } from "./cReportsManager.js";
import { RetirementYearCalculator } from "./cRetirementYearCalculator.js";
import { Transaction } from "./cTransaction.js";
import { TransactionManager } from "./cTransactionManager.js";
import { WorkingYearCalculator } from "./cWorkingYearCalculator.js";
import { generateOutputAndSummary } from "./retirement-ui.js";

/**
 * @typedef {object} RetirementUIFunctions
 * @property {() => Inputs|null} parseInputParameters
 * @property {() => void} regenerateSpendingFields
 * @property {(age:number) => number} getSpendingOverride
 * @property {(age:number) => number} getTaxableIncomeOverride
 * @property {(age:number) => number} getTaxFreeIncomeOverride
 * @property {() => void} regenerateTaxableIncomeFields
 * @property {() => void} regenerateTaxFreeIncomeFields
 */

/**
 * @param {Calculations} calculations
 * @param {RetirementUIFunctions} UI
 */
function calc(calculations, UI) {
  if (!UI) {
    throw new Error("UI must be provided explicitly");
  }
  // Track previous ages to only regenerate spending fields when they change
  let lastRetireAge = null;
  let lastEndAge = null;
  let lastCurrentAge = null;

  const inputs = UI.parseInputParameters();

  if (!inputs) return;

  // Auto-regenerate spending override fields only if ages have changed
  if (
    inputs.subjectRetireAge > 0 &&
    inputs.subjectLifeSpan > inputs.subjectRetireAge &&
    (lastRetireAge !== inputs.subjectRetireAge ||
      lastEndAge !== inputs.subjectLifeSpan)
  ) {
    UI.regenerateSpendingFields();
    lastRetireAge = inputs.subjectRetireAge;
    lastEndAge = inputs.subjectLifeSpan;
  }

  // Auto-regenerate income adjustment fields only if ages have changed
  if (
    inputs.initialAgeSubject > 0 &&
    inputs.subjectLifeSpan > inputs.initialAgeSubject &&
    (lastCurrentAge !== inputs.initialAgeSubject ||
      lastEndAge !== inputs.subjectLifeSpan)
  ) {
    UI.regenerateTaxableIncomeFields();
    UI.regenerateTaxFreeIncomeFields();
    lastCurrentAge = inputs.initialAgeSubject;
  }

  const transactionManager = new TransactionManager();

  // Initialize balances object for tracking
  const accountsManager = AccountsManager.CreateFromInputs(
    inputs,
    transactionManager
  );

  const reportingManager = new ReportsManager();

  // Working years
  for (let yearIndex = 0; yearIndex < inputs.totalWorkingYears; yearIndex++) {
    const workingYearInputs = initializeInputsForWorkingYear(
      inputs,
      yearIndex,
      UI
    );

    const accountYear = AccountingYear.Create(
      accountsManager,
      TAX_BASE_YEAR + yearIndex
    );

    const reportingYear = reportingManager.addReportingYear(
      TAX_BASE_YEAR + yearIndex
    );

    const workingYearIncomeCalculator = new WorkingYearCalculator(
      workingYearInputs,
      accountYear,
      reportingYear
    );
    console.log(
      `------ START OF WORKING YEAR ` + (TAX_BASE_YEAR + yearIndex) + ` ------`
    );

    const workingYearData =
      workingYearIncomeCalculator.processWorkingYearData();

    console.log(
      `------ END OF WORKING YEAR ` + (TAX_BASE_YEAR + yearIndex) + ` ------`
    );

    calculations.addCalculation(
      new Calculation(accountYear.taxYear, workingYearData)
    );
  }

  // Retirement years
  for (
    let yearIndex = inputs.totalWorkingYears;
    yearIndex < inputs.totalLivingYears;
    yearIndex++
  ) {
    const retirementYearInputs = initializeInputsForRetirementYear(
      inputs,
      yearIndex,
      UI
    );

    const accountYear = AccountingYear.Create(
      accountsManager,
      TAX_BASE_YEAR + yearIndex
    );

    const reportingYear = reportingManager.addReportingYear(
      TAX_BASE_YEAR + yearIndex
    );

    const calculator = new RetirementYearCalculator(
      retirementYearInputs,
      accountYear,
      reportingYear
    );

    try {
      // console.log(
      //   `------ START OF RETIREMENT YEAR ` +
      //     (TAX_BASE_YEAR + yearIndex) +
      //     ` ------`
      // );

      const retirementYearData = calculator.processRetirementYearData();

      // retirementYearData.dump("retirement year");

      // console.log(
      //   `------ END OF RETIREMENT YEAR ` +
      //     (TAX_BASE_YEAR + yearIndex) +
      //     ` ------`
      // );
      calculations.addCalculation(
        new Calculation(accountYear.taxYear, retirementYearData)
      );
    } catch (err) {
      console.log("Error in retirement year calculator");
      if (err instanceof Error) {
        console.error(err.stack);
      } else {
        console.error("Non-Error thrown:", err);
        console.error(new Error().stack);
      }
    }
  }

  // Generate final output
  generateOutputAndSummary(inputs, calculations); //, totalTaxes, maxDrawdown);
}

// Helper to generate dynamic input values for a given year index
/**
 * @param {Inputs} inputs
 * @param {number} yearIndex
 * @param {RetirementUIFunctions} UI
 * @return {Inputs}
 */
function initializeInputsForWorkingYear(inputs, yearIndex, UI) {
  const result = inputs.clone();

  result.yearIndex = yearIndex;
  result.additionalSpending = UI.getSpendingOverride(result.subjectAge);
  result.taxableIncomeAdjustment = UI.getTaxableIncomeOverride(
    result.subjectAge
  );
  result.taxFreeIncomeAdjustment = UI.getTaxFreeIncomeOverride(
    result.subjectAge
  );

  return result;
}

/**
 * @param {Inputs} inputs
 * @param {number} yearIndex
 * @param {RetirementUIFunctions} UI
 * @return {Inputs}
 */
function initializeInputsForRetirementYear(inputs, yearIndex, UI) {
  const result = inputs.clone();

  result.yearIndex = yearIndex;
  result.additionalSpending = UI.getSpendingOverride(result.subjectAge);
  result.taxableIncomeAdjustment = UI.getTaxableIncomeOverride(
    result.subjectAge
  );
  result.taxFreeIncomeAdjustment = UI.getTaxFreeIncomeOverride(
    result.subjectAge
  );
  return result;
}

export { calc };
