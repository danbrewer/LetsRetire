import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { TaxCalculations } from "./cTaxCalculations.js";

/**
 * Represents comprehensive tax calculation data including income, deductions, and tax liabilities.
 *
 * This class encapsulates all tax-related calculations for retirement planning, providing
 * structured access to gross income, standard deductions, taxable income calculations,
 * and federal tax obligations. It serves as a container for tax analysis and supports
 * effective tax rate calculations and tax planning scenarios.
 *
 * @class Taxes
 * @since 1.0.0
 */
class Taxes {
  /**
   * Creates a new Taxes instance with comprehensive tax calculation data.
   *
   * @param {number} totalTaxableIncome - Total gross income from all sources before deductions
   * @param {number} adjustedGrossIncome - Gross income after adjustments (if any)
   * @param {number} standardDeduction - Standard deduction amount based on filing status and year
   * @param {number}  taxableIncome - Income subject to federal taxation after deductions
   * @param {number} federalTaxesOwed - Federal income tax liability calculated from tax brackets
   * @param {number} otherTaxes - Additional taxes (state, local, FICA, etc.)
   * @param {string} [description="Taxes"] - Descriptive label for this tax calculation
   */
  constructor(
    totalTaxableIncome,
    adjustedGrossIncome,
    standardDeduction,
    taxableIncome,
    federalTaxesOwed,
    otherTaxes,
    description = "Taxes"
  ) {
    this._description = description;
    this.totalTaxableIncome = totalTaxableIncome;
    this.adjustedGrossIncome = adjustedGrossIncome; // Placeholder for future adjustments
    this.standardDeduction = standardDeduction;
    this.taxableIncome = taxableIncome;
    this.federalTaxesOwed = federalTaxesOwed;
    this.otherTaxes = otherTaxes;
  }

  //   /**
  //    * Gets the descriptive label for this tax calculation.
  //    *
  //    * @returns {string} Description of the tax calculation
  //    */
  //   get description() {
  //     return this._description;
  //   }

  /**
   * Sets a new description for this tax calculation.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the effective tax rate as a percentage of gross income.
   *
   * @returns {number} Effective tax rate as decimal (e.g., 0.22 for 22%)
   */
  get effectiveTaxRate() {
    if (this.totalTaxableIncome === 0) return 0;
    return this.federalTaxesOwed / this.totalTaxableIncome;
  }

  /**
   * Calculates the marginal tax rate based on taxable income and standard deduction.
   * Note: This is a simplified calculation - actual marginal rate would require tax bracket analysis.
   *
   * @returns {number} Approximate marginal tax rate as decimal
   */
  get marginalTaxRate() {
    if (this.taxableIncome === 0) return 0;
    return this.federalTaxesOwed / this.taxableIncome;
  }

  /**
   * Gets the total tax burden including federal and other taxes.
   *
   * @returns {number} Total taxes owed from all sources
   */
  get totalTaxes() {
    return this.federalTaxesOwed + this.otherTaxes;
  }

  /**
   * Calculates net income after all taxes.
   *
   * @returns {number} Gross income minus total taxes
   */
  get netIncome() {
    return this.totalTaxableIncome - this.totalTaxes;
  }

  // /**
  //  * Creates a summary object with key tax metrics.
  //  *
  //  * @returns {Object} Summary containing:
  //  *   - grossIncome: Total gross income
  //  *   - adjustedGrossIncome: Gross income after adjustments
  //  *   - standardDeduction: Standard deduction amount
  //  *   - taxableIncome: Income subject to taxation
  //  *   - federalTaxes: Federal tax liability
  //  *   - otherTaxes: Additional taxes
  //  *   - totalTaxes: Combined tax burden
  //  *   - netIncome: Income after all taxes
  //  *   - effectiveTaxRate: Effective tax rate as percentage
  //  *   - isValid: Whether calculations appear consistent
  //  */
  // getSummary() {
  //   return {
  //     grossIncome: this.grossIncome,
  //     // adjustedGrossIncome: this.adjustedGrossIncome,
  //     standardDeduction: this.standardDeduction,
  //     taxableIncome: this.taxableIncome,
  //     federalTaxes: this.federalTaxesOwed,
  //     otherTaxes: this.otherTaxes,
  //     totalTaxes: this.totalTaxes,
  //     netIncome: this.netIncome,
  //     effectiveTaxRate: (this.effectiveTaxRate * 100).toFixed(2) + "%",
  //     isValid: this.isCalculationValid(),
  //   };
  // }

  /**
   * Factory method to create a Taxes instance from income and deduction data.
   *
   * This method provides a convenient way to construct Taxes objects from
   * basic income information and standard deduction, with federal taxes
   * typically calculated separately and set later.
   *
   * @param {number} grossIncome - Total gross income from all sources
   * @param {number} standardDeduction - Standard deduction based on filing status
   * @param {number} [federalTaxesOwed=0] - Federal tax liability (optional, often calculated later)
   * @param {number} [otherTaxes=0] - Additional taxes (state, local, etc.)
   * @param {string} [description="Taxes"] - Descriptive label
   *
   * @returns {Taxes} A new Taxes instance with calculated taxable income
   *
   * @example
   * // Create taxes from basic income data
   * const grossIncome = 85000;
   * const standardDeduction = 27700; // 2024 MFJ standard deduction
   *
   * const taxes = Taxes.CreateUsing(grossIncome, standardDeduction);
   * console.log(taxes.taxableIncome); // 57300 (85000 - 27700)
   *
   * // Later, set federal taxes after bracket calculation
   * taxes.updateCalculation({ federalTaxesOwed: 8750 });
   * console.log(taxes.getEffectiveTaxRate()); // ~0.103 (10.3%)
   *
   * @static
   * @since 1.0.0
   */

  /**
   * @param {IncomeBreakdown} incomeBreakdown
   */
  static CreateUsing(incomeBreakdown) {
    return new Taxes(
      incomeBreakdown.totalIncome,
      incomeBreakdown.grossIncome,
      incomeBreakdown.standardDeduction,
      incomeBreakdown.taxableIncome,
      incomeBreakdown.federalIncomeTax,
      0, // otherTaxes - to be calculated later
      "Taxes"
    );
  }

  /**
   * @param {Number} totalIncome
   * @param {Number} adjustedIncome
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  static CreateFromTaxableIncome(
    totalIncome,
    adjustedIncome,
    fiscalData,
    demographics
  ) {
    const standardDeduction = TaxCalculations.getStandardDeduction(
      fiscalData,
      demographics
    );

    const taxableIncome = Math.max(0, adjustedIncome - standardDeduction);

    const federalIncomeTaxOwed = TaxCalculations.determineFederalIncomeTax(
      totalIncome,
      taxableIncome,
      fiscalData,
      demographics
    );

    return new Taxes(
      totalIncome,
      adjustedIncome,
      standardDeduction,
      taxableIncome,
      federalIncomeTaxOwed,
      0, // otherTaxes - for future development
      "Taxes"
    );
  }

  // /**
  //  * @param {WorkingYearIncome} workingYearIncome
  //  * @param {FiscalData} fiscalData
  //  * @param {Demographics} demographics
  //  */
  // static CreateForWorkingYearIncome(
  //   workingYearIncome,
  //   fiscalData,
  //   demographics
  // ) {
  //   const standardDeduction = TaxCalculations.getStandardDeduction(
  //     fiscalData,
  //     demographics
  //   );

  //   const taxableIncome = Math.max(
  //     0,
  //     workingYearIncome.adjustedGrossIncome - standardDeduction
  //   );

  //   const federalIncomeTaxOwed = TaxCalculations.determineFederalIncomeTax(
  //     workingYearIncome.totalTaxableIncome,
  //     workingYearIncome.adjustedGrossIncome,
  //     fiscalData,
  //     demographics
  //   );

  //   return new Taxes(
  //     workingYearIncome.totalTaxableIncome,
  //     workingYearIncome.adjustedGrossIncome,
  //     standardDeduction,
  //     taxableIncome,
  //     federalIncomeTaxOwed, // federalTaxesOwed - to be calculated later
  //     0, // otherTaxes - to be calculated later
  //     "Taxes"
  //   );
  // }
}

export { Taxes };