import { SocialSecurityBreakdown } from "./cSsCalculationDetails.js";

/**
 * Represents comprehensive Social Security income breakdown for retirement planning.
 *
 * This class encapsulates all Social Security income data including gross benefits,
 * taxable and non-taxable portions for both primary and spouse beneficiaries,
 * provisional income calculations, and provides methods for analyzing Social Security
 * tax implications and benefit optimization strategies.
 *
 * @class SocialSecurityIncome
 * @since 1.0.0
 */
class SocialSecurityIncome {
  /** @type {SocialSecurityBreakdown | null} */
  #socialSecurityBreakdown;

  // /**
  //  * Creates a new SocialSecurityIncome instance with Social Security benefit data.
  //  *
  //  * @param {string} [subjectPortion="0%"] - Primary beneficiary's gross SS as percentage
  //  * @param {number} [subjectTaxableAmount=0] - Primary beneficiary's taxable SS amount
  //  * @param {number} [subjectNonTaxableAmount=0] - Primary beneficiary's non-taxable SS amount
  //  * @param {string} [partnerPortion="0%"] - Spouse's gross SS as percentage
  //  * @param {number} [partnerTaxableAmount=0] - Spouse's taxable SS amount
  //  * @param {number} [partnerNonTaxableAmount=0] - Spouse's non-taxable SS amount
  //  * @param {number} combinedProvisionalIncome=0] - Combined provisional income for tax calculations
  //  * @param {SsCalculationDetails} calculationDetails - Detailed calculation breakdown
  //  */
  /**
   *
   * @param {SocialSecurityBreakdown | null} calculationDetails
   */
  constructor(calculationDetails) {
    this.#socialSecurityBreakdown = calculationDetails;
  }

  /**
   * Sets a new description for this Social Security income data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the total Social Security income for the primary beneficiary.
   *
   * @returns {number} Total primary beneficiary Social Security income
   */
  get subjectTotalSsIncome() {
    return this.#socialSecurityBreakdown?.subjectBenefits ?? 0;
  }

  /**
   * Calculates the total Social Security income for the spouse.
   *
   * @returns {number} Total spouse Social Security income
   */
  get partnerTotalSsIncome() {
    return this.#socialSecurityBreakdown?.partnerBenefits ?? 0;
  }

  /**
   * Calculates the combined total Social Security income for both beneficiaries.
   *
   * @returns {number} Combined Social Security income
   */
  get totalSsIncome() {
    return this.#socialSecurityBreakdown?.totalSsBenefits ?? 0;
  }

  /**
   * Calculates the total taxable Social Security income for both beneficiaries.
   *
   * @returns {number} Total taxable Social Security income
   */
  get totalTaxableSsIncome() {
    return this.#socialSecurityBreakdown?.taxableAmount ?? 0;
  }

  /**
   * Calculates the total non-taxable Social Security income for both beneficiaries.
   *
   * @returns {number} Total non-taxable Social Security income
   */
  get totalNonTaxableSsIncome() {
    return this.#socialSecurityBreakdown?.nonTaxableAmount ?? 0;
  }

  /**
   * Calculates the effective tax rate on Social Security benefits.
   *
   * @returns {number} Effective SS tax rate as decimal (e.g., 0.5 for 50% taxable)
   */
  get effectiveSsTaxRate() {
    const totalSsIncome = this.totalSsIncome;
    if (totalSsIncome <= 0) return 0;
    return this.totalTaxableSsIncome / totalSsIncome;
  }

  /**
   * Gets the primary beneficiary's gross Social Security percentage as a decimal.
   *
   * @returns {number} Primary beneficiary's gross percentage as decimal
   */
  get subjectGrossPercentage() {
    return this.#socialSecurityBreakdown?.subjectPortion ?? 0;
  }

  /**
   * Gets the spouse's gross Social Security percentage as a decimal.
   *
   * @returns {number} Spouse's gross percentage as decimal
   */
  get partnerGrossPercentage() {
    return this.#socialSecurityBreakdown?.partnerPortion ?? 0;
  }

  /**
   * Calculates the taxable percentage for the primary beneficiary.
   *
   * @returns {number} Primary beneficiary's taxable percentage as decimal
   */
  get subjectTaxablePercentage() {
    return this.#socialSecurityBreakdown?.subjectTaxablePortion ?? 0;
  }

  /**
   * Calculates the taxable percentage for the spouse.
   *
   * @returns {number} Spouse's taxable percentage as decimal
   */
  get partnerTaxablePercentage() {
    return this.#socialSecurityBreakdown?.partnerTaxablePortion ?? 0;
  }

  /**
   * Analyzes Social Security income distribution between beneficiaries.
   *
   * @returns {Object} Distribution analysis containing:
   *   - primaryPortion: Primary beneficiary's share of total SS income
   *   - spousePortion: Spouse's share of total SS income
   *   - primaryTaxableShare: Primary's share of total taxable SS
   *   - spouseTaxableShare: Spouse's share of total taxable SS
   */
  get incomeDistribution() {
    const totalSsIncome = this.totalSsIncome;
    const totalTaxableIncome = this.totalTaxableSsIncome;

    return {
      primaryPortion:
        totalSsIncome > 0 ? this.subjectTotalSsIncome / totalSsIncome : 0,
      spousePortion:
        totalSsIncome > 0 ? this.partnerTotalSsIncome / totalSsIncome : 0,
      primaryTaxableShare:
        totalTaxableIncome > 0
          ? (this.#socialSecurityBreakdown?.subjectTaxablePortion ?? 0) /
            totalTaxableIncome
          : 0,
      spouseTaxableShare:
        totalTaxableIncome > 0
          ? (this.#socialSecurityBreakdown?.partnerTaxablePortion ?? 0) /
            totalTaxableIncome
          : 0,
    };
  }

  /**
   * Calculates provisional income impact on Social Security taxation.
   *
   * @returns {Object} Provisional income analysis containing:
   *   - provisionalIncome: Combined provisional income amount
   *   - taxabilityThreshold: Estimated threshold for SS taxation
   *   - excessOverThreshold: Amount over threshold (if any)
   */
  getProvisionalIncomeAnalysis() {
    // Assume married filing jointly for now (would need marital status input for precision)
    const threshold1 = this.#socialSecurityBreakdown?.tier1Threshold ?? 0;
    const threshold2 = this.#socialSecurityBreakdown?.tier2Threshold ?? 0;

    const provisionalIncome = this.#socialSecurityBreakdown?.provisionalIncome ?? 0;

    let taxabilityLevel = "none";
    let excessOverThreshold = 0;

    if (provisionalIncome > threshold2) {
      taxabilityLevel = "up to 85%";
      excessOverThreshold = provisionalIncome - threshold2;
    } else if (provisionalIncome > threshold1) {
      taxabilityLevel = "up to 50%";
      excessOverThreshold = provisionalIncome - threshold1;
    }

    return {
      provisionalIncome: provisionalIncome,
      threshold1: threshold1,
      threshold2: threshold2,
      taxabilityLevel: taxabilityLevel,
      excessOverThreshold: excessOverThreshold,
    };
  }

  /**
   * Validates Social Security income data for logical consistency.
   *
   * @returns {Object} Validation result containing:
   *   - isValid: Whether all values are valid
   *   - errors: Array of validation error messages
   *   - warnings: Array of validation warning messages
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check for negative amounts
    if ((this.#socialSecurityBreakdown?.subjectTaxablePortion ?? 0) < 0) {
      errors.push("Primary beneficiary taxable amount cannot be negative");
    }
    if ((this.#socialSecurityBreakdown?.subjectNonTaxablePortion ?? 0) < 0) {
      errors.push("Primary beneficiary non-taxable amount cannot be negative");
    }
    if ((this.#socialSecurityBreakdown?.partnerTaxablePortion ?? 0) < 0) {
      errors.push("Spouse taxable amount cannot be negative");
    }
    if ((this.#socialSecurityBreakdown?.partnerNonTaxablePortion ?? 0) < 0) {
      errors.push("Spouse non-taxable amount cannot be negative");
    }
    if ((this.#socialSecurityBreakdown?.provisionalIncome ?? 0) < 0) {
      errors.push("Combined provisional income cannot be negative");
    }

    // Check for logical consistency
    const myTaxablePercent = this.subjectTaxablePercentage;
    const spouseTaxablePercent = this.partnerTaxablePercentage;

    if (myTaxablePercent > 0.85) {
      warnings.push("Primary beneficiary SS taxation exceeds 85% maximum");
    }
    if (spouseTaxablePercent > 0.85) {
      warnings.push("Spouse SS taxation exceeds 85% maximum");
    }

    // Check for unusually high Social Security amounts
    const totalSsIncome = this.totalSsIncome;
    if (totalSsIncome > 80000) {
      warnings.push(
        "Total Social Security income is unusually high - please verify amounts"
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  /**
   * Factory method to create a SocialSecurityIncome from income calculation results.
   *
   * This method provides a convenient way to construct SocialSecurityIncome objects
   * by extracting data from income calculation results and Social Security breakdowns.
   *
   * @param {SocialSecurityBreakdown | null} calculationDetails - Income calculation results containing SS breakdown:

   * @returns {SocialSecurityIncome} A new SS income instance with calculation results
   *
   * @example
   * // Create SS income from calculation results
   * const ssIncome = SocialSecurityIncome.CreateUsing(incomeResults);
   * console.log(ssIncome.getSummary());
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(calculationDetails) {
    // Build calculation details with label if withLabel function is available

    return new SocialSecurityIncome(calculationDetails);
  }
}

export { SocialSecurityIncome };