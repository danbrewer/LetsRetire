import { AccountingYear } from "./cAccountingYear.js";
import { AccountsManager } from "./cAccountsManager.js";
import { Calculation, Calculations } from "./cCalculation.js";
import { Inputs } from "./cInputs.js";
import { TAX_BASE_YEAR } from "./consts.js";
import { RetirementYearCalculator } from "./cRetirementYearCalculator.js";
import { WorkingYearCalculator } from "./cWorkingYearCalculator.js";

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
    inputs.retireAge > 0 &&
    inputs.endAge > inputs.retireAge &&
    (lastRetireAge !== inputs.retireAge || lastEndAge !== inputs.endAge)
  ) {
    UI.regenerateSpendingFields();
    lastRetireAge = inputs.retireAge;
    lastEndAge = inputs.endAge;
  }

  // Auto-regenerate income adjustment fields only if ages have changed
  if (
    inputs.initialAge > 0 &&
    inputs.endAge > inputs.initialAge &&
    (lastCurrentAge !== inputs.initialAge || lastEndAge !== inputs.endAge)
  ) {
    UI.regenerateTaxableIncomeFields();
    UI.regenerateTaxFreeIncomeFields();
    lastCurrentAge = inputs.initialAge;
  }

  // Initialize balances object for tracking
  const accountsManager = AccountsManager.CreateFromInputs(inputs);

  // Working years
  for (let yearIndex = 0; yearIndex < inputs.totalWorkingYears; yearIndex++) {
    const workingYearInputs = initializeInputsForWorkingYear(
      inputs,
      yearIndex,
      UI
    );

    const accountYear = AccountingYear.FromAccountsManager(
      accountsManager,
      TAX_BASE_YEAR + yearIndex
    );

    const workingYearIncomeCalculator = new WorkingYearCalculator(
      workingYearInputs,
      accountYear
    );

    const workingYearData =
      workingYearIncomeCalculator.calculateWorkingYearData();

    // workingYearData.dump("working year");
    // console.log(
    //   `------ END OF WORKING YEAR ` + (TAX_BASE_YEAR + yearIndex) + ` ------`
    // );
    // debugger;

    calculations.addCalculation(
      new Calculation(accountYear.taxYear, workingYearData)
    );
  }

  // Retirement years
  for (
    let yearIndex = inputs.totalWorkingYears;
    yearIndex < inputs.totalLivingYears - inputs.totalWorkingYears;
    yearIndex++
  ) {
    const retirementYearInputs = initializeInputsForRetirementYear(
      inputs,
      yearIndex,
      UI
    );

    const accountYear = AccountingYear.FromAccountsManager(
      accountsManager,
      TAX_BASE_YEAR + yearIndex
    );

    const calculator = new RetirementYearCalculator(
      retirementYearInputs,
      accountYear
    );

    try {
      const retirementYearData = calculator.calculateRetirementYearData();
      retirementYearData.dump("retirement year");
      console.log(
        `------ END OF RETIREMENT YEAR ` +
          (TAX_BASE_YEAR + yearIndex) +
          ` ------`
      );
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
    debugger;
  }

  debugger;

  // Generate final output
  //  generateOutputAndSummary(inputs, rows); //, totalTaxes, maxDrawdown);
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
  result.additionalSpending = UI.getSpendingOverride(result.currentAge);
  result.taxableIncomeAdjustment = UI.getTaxableIncomeOverride(
    result.currentAge
  );
  result.taxFreeIncomeAdjustment = UI.getTaxFreeIncomeOverride(
    result.currentAge
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
  result.additionalSpending = UI.getSpendingOverride(result.currentAge);
  result.taxableIncomeAdjustment = UI.getTaxableIncomeOverride(
    result.currentAge
  );
  result.taxFreeIncomeAdjustment = UI.getTaxFreeIncomeOverride(
    result.currentAge
  );
  return result;
}

export { calc };
