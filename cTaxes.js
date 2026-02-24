import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
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
   * @param {number} nonTaxableIncome - Portion of income that is not subject to federal tax
   * @param {number} federalTaxesOwed - Federal tax liability based on taxable income
   * @param {number} otherTaxes - Additional taxes (state, local, FICA, etc.)
   * @param {string} [description="Taxes"] - Descriptive label for this tax calculation
   */
  constructor(
    totalTaxableIncome,
    adjustedGrossIncome,
    standardDeduction,
    taxableIncome,
    nonTaxableIncome,
    federalTaxesOwed,
    otherTaxes,
    description = "Taxes"
  ) {
    this._description = description;
    this.nonTaxableIncome = nonTaxableIncome;
    this.totalTaxableIncome = totalTaxableIncome;
    this.adjustedGrossIncome = adjustedGrossIncome; // Placeholder for future adjustments
    this.standardDeduction = standardDeduction;
    this.taxableIncome = taxableIncome;
    this.federalTaxesOwed = federalTaxesOwed;
    this.otherTaxes = otherTaxes;
  }

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
   */

  /**
   * @param {Number} grossIncome
   * @param {Number} adjustedGrossIncome
   * @param {Number} nonTaxableIncome
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  static CreateFromTaxableIncome(
    grossIncome,
    adjustedGrossIncome,
    nonTaxableIncome,
    fiscalData,
    demographics
  ) {
    const standardDeduction = TaxCalculations.getStandardDeduction(
      fiscalData,
      demographics
    );

    const taxableIncome = Math.max(0, adjustedGrossIncome - standardDeduction);

    const federalIncomeTaxOwed = TaxCalculations.determineFederalIncomeTax(
      taxableIncome,
      fiscalData,
      demographics
    );

    return new Taxes(
      grossIncome,
      adjustedGrossIncome,
      standardDeduction,
      taxableIncome,
      nonTaxableIncome,
      federalIncomeTaxOwed, // federalTaxesOwed
      0, // otherTaxes - for future development
      "Taxes"
    );
  }
}

export { Taxes };
