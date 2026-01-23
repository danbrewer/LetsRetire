import { AccountingYear } from "./cAccountingYear.js";
import { Balances } from "./cBalances.js";
import { Contributions } from "./cContributions.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Taxes } from "./cTaxes.js";
import { Withdrawals } from "./cWithdrawals.js";
import { WorkingYearIncome } from "./cWorkingYearIncome.js";
import { YearDataBase } from "./cYearDataBase.js";

/**
 * Represents comprehensive working year calculation data including income, contributions,
 * withdrawals, account balances, and tax information.
 *
 * This class encapsulates all financial data for a working year in pre-retirement planning,
 * providing structured access to demographic information, fiscal parameters, income sources,
 * retirement account contributions, and detailed breakdowns for analysis and reporting.
 *
 * @class WorkingYearData
 * @since 1.0.0
 */
class WorkingYearData extends YearDataBase {
  // /** @type {FiscalData} */
  // #fiscalData;
  // /** @type {WorkingYearIncome} */
  // #workingYearIncome;
  /** @type {Taxes | null} */
  #taxes = null;
  /** @type {Balances | null} */
  #balances = null;
  /** @type {Contributions | null} */
  #contributions = null;
  /** @type {Withdrawals | null} */
  #withdrawals = null;
  /** @type {string | undefined} */
  #description;

  /**
   * Creates a new WorkingYearData instance with comprehensive working year financial data.
   *
   * @param {Demographics} demographics - Demographic information including age,
   * @param {FiscalData} fiscalData - Fiscal data for the working year
   * @param {AccountingYear} accountYear - View of accounts for fiscal year
   */
  constructor(demographics, fiscalData, accountYear) {
    super(demographics, fiscalData, accountYear);
    // this.#workingYearIncome = /** @type {WorkingYearIncome} */ (Object.freeze(workingYearIncome));
  }

  //   /**
  //    * Gets the descriptive label for this working year data.
  //    *
  //    * @returns {string} Description of the working year data
  //    */
  get description() {
    return `Working Year ${this.accountYear.taxYear} (Age ${this.demographics.currentAge})`;
  }

  // get income() {
  //   return this.#workingYearIncome;
  // }

  //   /**
  //    * Gets the total annual contributions if available.
  //    *
  //    * @returns {number} Total contributions for the year, or 0 if unavailable
  //    */
  //   getTotalContributions() {
  //     if (!this.contributions || typeof this.contributions.total !== "function") {
  //       return 0;
  //     }
  //     return this.contributions.total();
  //   }

  //   /**
  //    * Gets the net income for the year if available.
  //    *
  //    * @returns {number} Net income after taxes, or 0 if unavailable
  //    */
  //   getNetIncome() {
  //     if (!this.income || typeof this.income.netIncome === "undefined") {
  //       return 0;
  //     }
  //     return typeof this.income.netIncome === "function"
  //       ? this.income.netIncome()
  //       : this.income.netIncome;
  //   }

  //   /**
  //    * Gets the effective tax rate if available.
  //    *
  //    * @returns {number} Effective tax rate as decimal, or 0 if unavailable
  //    */
  //   getEffectiveTaxRate() {
  //     if (!this.taxes || typeof this.taxes.effectiveTaxRate === "undefined") {
  //       return 0;
  //     }
  //     return typeof this.taxes.effectiveTaxRate === "function"
  //       ? this.taxes.effectiveTaxRate()
  //       : this.taxes.effectiveTaxRate;
  //   }

  // /**
  //  * Checks if this working year has spouse-related data.
  //  *
  //  * @returns {boolean} True if spouse data is present
  //  */
  // hasSpouseData() {
  //   return this.#demographics?.hasPartner ?? false;
  // }

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountingYear} accountYear
   */
  static CreateUsing(demographics, fiscalData, accountYear) {
    return new WorkingYearData(demographics, fiscalData, accountYear);
  }

  /**
   * Creates a summary object with key working year metrics.
   *
   * @returns {Object} Summary containing:
   *   - age: Current age
   *   - netIncome: Net income after taxes
   *   - totalContributions: Total retirement contributions
   *   - totalBalance: Total retirement account balance
   *   - effectiveTaxRate: Effective tax rate
   *   - hasSpouse: Whether spouse data is present
   *   - taxYear: Current tax year from fiscal data
   */
  // getSummary() {
  //   return {
  //     age: this.getCurrentAge(),
  //     netIncome: this.income?.netIncome,
  //     //   totalContributions: this.getTotalContributions(),
  //     totalBalance: this.getTotalRetirementBalance(),
  //     effectiveTaxRate: this.taxes?.effectiveTaxRate,
  //     hasSpouse: this.hasSpouseData(),
  //     taxYear:
  //       this.fiscalData && this.fiscalData.taxYear
  //         ? this.fiscalData.taxYear
  //         : null,
  //   };
  // }

  // /**
  //  * Updates demographic information for multi-year calculations.
  //  *
  //  * @param {Demographics} newDemographics - Updated demographic data
  //  */
  // updateDemographics(newDemographics) {
  //   this.demographics = newDemographics;
  //   if (newDemographics && newDemographics.age) {
  //     this._description = `Working Year - Age ${newDemographics.age}`;
  //   }
  // }

  /**
   * Factory method to create a WorkingYearData instance with empty structure.
   *
   * This method provides a convenient way to construct WorkingYearData objects
   * with all properties initialized to empty objects, ready to be populated
   * during working year calculations.
   *
   * @param {string} [description=""] - Optional description for the working year
   *
   * @returns {WorkingYearData} A new WorkingYearData instance with empty structure
   *
   * @example
   * // Create empty working year data structure
   * const workingYear = WorkingYearData.CreateEmpty("Working Year 1");
   * workingYear.demographics = Demographics.CreateUsing(inputs, false, true);
   * workingYear.fiscalData = FiscalData.CreateUsing(inputs);
   *
   * @static
   * @since 1.0.0
   */
  // static CreateEmpty(description = "") {
  //   return new WorkingYearData(description);
  // }

  //   /**
  //    * Factory method to create a WorkingYearData instance from comprehensive calculation data.
  //    *
  //    * @param {Object} calculationData - Object containing all working year calculation results
  //    * @param {string} [description=""] - Optional description for the working year
  //    *
  //    * @returns {WorkingYearData} A fully populated WorkingYearData instance
  //    *
  //    * @example
  //    * // Create from calculation results
  //    * const calculationResults = {
  //    *   demographics: Demographics.CreateUsing(inputs, false, true),
  //    *   fiscalData: FiscalData.CreateUsing(inputs),
  //    *   income: { netIncome: 85000, grossIncome: 100000 },
  //    *   contributions: { total: () => 15000 },
  //    *   balances: { total: () => 350000 }
  //    * };
  //    *
  //    * const workingYear = WorkingYearData.CreateUsing(calculationResults, "Working Year 5");
  //    * console.log(workingYear.getSummary());
  //    *
  //    * @static
  //    * @since 1.0.0
  //    */
  //   static CreateUsing(calculationData, description = "") {
  //     const {
  //       demographics = {},
  //       fiscalData = {},
  //       totals = {},
  //       contributions = {},
  //       withdrawals = {},
  //       balances = {},
  //       pen = {},
  //       ss = {},
  //       savings = {},
  //       retirementAccount = {},
  //       roth = {},
  //       income = {},
  //       taxes = {},
  //       pensionBreakdown = {},
  //       spousePensionBreakdown = {},
  //       savingsBreakdown = {},
  //       ssBreakdown = {},
  //       spouseSsBreakdown = {},
  //     } = calculationData;

  //     return new WorkingYearData(
  //       description,
  //       demographics,
  //       fiscalData,
  //       totals,
  //       contributions,
  //       withdrawals,
  //       balances,
  //       pen,
  //       ss,
  //       savings,
  //       retirementAccount,
  //       roth,
  //       income,
  //       taxes,
  //       pensionBreakdown,
  //       spousePensionBreakdown,
  //       savingsBreakdown,
  //       ssBreakdown,
  //       spouseSsBreakdown
  //     );
  //   }
}

// Maintain backward compatibility with the original object structure
// const result = WorkingYearData.CreateEmpty();

export { WorkingYearData };
