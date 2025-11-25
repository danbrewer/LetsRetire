/**
 * Represents income calculation results containing Social Security and general income breakdowns.
 *
 * This class encapsulates the results of retirement income calculations, providing
 * structured access to Social Security benefit breakdowns and comprehensive income
 * analysis. It serves as a container for income calculation outputs used in
 * retirement year planning and tax computations.
 *
 * @class IncomeRs
 * @since 1.0.0
 */
class IncomeRs {
  /** @type {IncomeBreakdown} */
  #incomeBreakdown;

  /**
   * Creates a new IncomeRs instance with Social Security and income breakdown data.
   *
   * @param {SsBenefitsCalculator | null} ssBreakdown - Social Security benefits breakdown
   *   containing taxable/non-taxable portions, provisional income calculations,
   *   and detailed benefit analysis for primary and spouse (required)
   * @param {IncomeBreakdown} incomeBreakdown - Comprehensive income breakdown
   *   including reportable income, taxable income, federal taxes, and net income
   *   calculations from all sources (SS, pension, interest, RMD, etc.) (required)
   *
   * @throws {Error} When ssBreakdown is null, undefined, or invalid
   * @throws {Error} When incomeBreakdown is null, undefined, or invalid
   */
  constructor(ssBreakdown, incomeBreakdown) {
    if (!ssBreakdown) {
      throw new Error(
        "ssBreakdown is required and cannot be null or undefined"
      );
    }
    if (!incomeBreakdown) {
      throw new Error(
        "incomeBreakdown is required and cannot be null or undefined"
      );
    }

    this._description = "Income Calculation Results";
    this.#incomeBreakdown = incomeBreakdown;
  }

  //   /**
  //    * Gets the descriptive label for this income results object.
  //    *
  //    * @returns {string} Description of the income results
  //    */
  //   get description() {
  //     return this._description;
  //   }

  // /**
  //  * Gets the total taxable Social Security benefits if breakdown is available.
  //  *
  //  * @returns {number} Total taxable SS benefits, or 0 if breakdown unavailable
  //  */
  // get totalTaxableSsBenefits() {
  //   return this.#ssBreakdown.calculationDetails.taxableAmount;
  // }

  // /**
  //  * Gets the total reportable income if breakdown is available.
  //  *
  //  * @returns {number} Total reportable income, or 0 if breakdown unavailable
  //  */
  // get totalReportableIncome() {
  //   return this.#incomeBreakdown.grossIncome;
  // }

  // /**
  //  * Gets the total taxable income if breakdown is available.
  //  *
  //  * @returns {number} Total taxable income, or 0 if breakdown unavailable
  //  */
  // get totalTaxableIncome() {
  //   return this.#incomeBreakdown.taxableIncome;
  // }

  // /**
  //  * Gets the net income after taxes if breakdown is available.
  //  *
  //  * @returns {number} Net income after taxes, or 0 if breakdown unavailable
  //  */
  // get netIncome() {
  //   return this.#incomeBreakdown.netIncome; // getNetIncomeMinusReportedEarnedInterest();
  // }

  get incomeBreakdown() {
    return this.#incomeBreakdown;
  }

  /**
   * Creates a summary object with key income metrics.
   *
   * @returns {Object} Summary containing:
   *   - totalTaxableSs: Total taxable Social Security benefits
   *   - totalReportableIncome: Total reportable income from all sources
   *   - totalTaxableIncome: Total income subject to federal taxes
   *   - netIncome: Income after federal taxes
   *   - hasValidData: Whether both breakdowns contain valid data
   */
  // getSummary() {
  //   return {
  //     totalTaxableSs: this.totalTaxableSsBenefits,
  //     totalReportableIncome: this.totalReportableIncome,
  //     totalTaxableIncome: this.totalTaxableIncome,
  //     netIncome: this.netIncome,
  //   };
  // }

  /**
   * Factory method to create an IncomeRs instance from existing breakdown objects.
   *
   * This method provides a convenient way to construct IncomeRs objects from
   * pre-calculated Social Security and income breakdown data, typically generated
   * by withdrawal factories or income calculation engines.
   *
   * @param {SsBenefitsCalculator} ssBreakdown - Social Security breakdown data with
   *   calculation methods for taxable portions, provisional income, etc.
   * @param {IncomeBreakdown} incomeBreakdown - Income breakdown data with
   *   methods for reportable income, taxable income, and tax calculations
   *
   * @returns {IncomeRs} A new IncomeRs instance containing the provided breakdowns
   *
   * @example
   * // Create income results from breakdown objects
   * const ssData = SsBenefits.CreateUsing(benefitData, totalIncome);
   * const incomeData = IncomeBreakdown.CreateUsing(incomeStreams, demographics);
   * const results = IncomeRs.CreateUsing(ssData, incomeData);
   * console.log(results.getSummary());
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(ssBreakdown, incomeBreakdown) {
    return new IncomeRs(ssBreakdown, incomeBreakdown);
  }
}

// Maintain backward compatibility - note: empty objects are no longer supported
// Use IncomeRs.CreateUsing() with valid breakdown objects instead
// const result = IncomeRs.CreateUsing(validSsBreakdown, validIncomeBreakdown);
