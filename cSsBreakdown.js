/**
 * Represents detailed calculation methodology for Social Security benefit taxation.
 *
 * This class encapsulates the IRS calculation process for determining the taxable
 * portion of Social Security benefits, including threshold comparisons, tier-based
 * calculations, and detailed breakdown of provisional income analysis. It provides
 * transparency into the complex Social Security taxation algorithm.
 *
 * @class SsCalculationDetails
 * @since 1.0.0
 */
class SocialSecurityBreakdown {
  /** @param {string} method
   * @param {Number} excessOverTier1
   * @param {Number} excessOverTier2
   * @param {Number} taxableSsInTier1
   * @param {Number} taxableSsInTier2
   * @param {Number} taxablePortion
   */

  updateCalculatedValues(
    method,
    excessOverTier1,
    excessOverTier2,
    taxableSsInTier1,
    taxableSsInTier2,
    taxablePortion
  ) {
    this.#method = method;
    this.#incomeExceedingTier1 = excessOverTier1;
    this.#incomeExceedingTier2 = excessOverTier2;
    this.#tier1TaxableAmount = taxableSsInTier1;
    this.#tier2TaxableAmount = taxableSsInTier2;
    this.taxablePortion = taxablePortion;
  }
  /** @type {Number} */
  #tier1Threshold = 0;

  /** @type {Number} */
  #tier2Threshold = 0;

  /** type {string} */
  #method = "";

  /** @type {Number} */
  #incomeExceedingTier1 = 0;

  /** @type {Number} */
  #incomeExceedingTier2 = 0;

  /** @type {Number} */
  #tier1TaxableAmount = 0;

  /** @type {Number} */
  #tier2TaxableAmount = 0;

  /** @type {Number} */
  taxablePortion = 0;

  /** @type {Number} */
  #subjectBenefits = 0;

  /** @type {Number} */
  #partnerBenefits = 0;

  /** @type {Number} */
  #otherTaxableIncome = 0;

  /**
   * Creates a new SsCalculationDetails instance with comprehensive calculation data.
   * @param {number} subjectBenefits
   * @param {number} partnerBenefits
   * @param {number} otherTaxableIncome
   * @param {boolean} marriedFilingJointly
   */
  constructor(subjectBenefits, partnerBenefits, otherTaxableIncome, marriedFilingJointly) {
    this._description = "Social Security Taxation Calculation Details";
    this.#method = "irs-rules";
    this.#subjectBenefits = subjectBenefits;
    this.#partnerBenefits = partnerBenefits;
    this.#otherTaxableIncome = otherTaxableIncome;
    this.#tier1Threshold = marriedFilingJointly ? 32000 : 25000;
    this.#tier2Threshold = marriedFilingJointly ? 44000 : 34000;
  }

  get totalSsBenefits() {
    const totalBenefits = this.#subjectBenefits + this.#partnerBenefits;
    return totalBenefits.asCurrency();
  }

  get benefits_50pct() {
    return (0.5 * this.totalSsBenefits).asCurrency();
  }

  get benefits_85pct() {
    return (0.85 * this.totalSsBenefits).asCurrency();
  }

  get maxTaxableSs() {
    return this.benefits_85pct;
  }

  get provisionalIncome() {
    return (this.benefits_50pct + this.#otherTaxableIncome).asCurrency();
  }

  /**
   * Determines which taxation tier applies based on provisional income.
   *
   * @returns {string} Taxation tier: "none", "tier1", or "tier2"
   */
  get taxationTier() {
    if (this.provisionalIncome <= this.#tier1Threshold) {
      return "none";
    } else if (this.provisionalIncome <= this.#tier2Threshold) {
      return "tier1";
    } else {
      return "tier2";
    }
  }

  /**
   * Calculates the percentage of Social Security benefits that are taxable.
   *
   * @returns {number} Percentage as decimal (0.0 to 0.85)
   */
  get taxablePercentage() {
    if (this.totalSsBenefits === 0) return 0;
    return this.taxablePortion / this.totalSsBenefits;
  }

  /**
   * Gets the non-taxable portion of Social Security benefits.
   *
   * @returns {number} Non-taxable Social Security amount
   */
  get nonTaxableAmount() {
    return this.totalSsBenefits - this.taxablePortion;
  }

  get subjectPortion() {
    return this.#subjectBenefits.asPercentageOf(this.totalSsBenefits);
  }

  get subjectTaxablePortion() {
    return (this.subjectPortion * this.taxablePortion).asCurrency();
  }

  get subjectNonTaxablePortion() {
    return (this.subjectPortion * this.nonTaxableAmount).asCurrency();
  }

  get tier1Threshold() {
    return this.#tier1Threshold;
  }

  get tier2Threshold() {
    return this.#tier2Threshold;
  }

  get taxableAmount() {
    return this.taxablePortion;
  }

  get subjectBenefits() {
    return this.#subjectBenefits.asCurrency();
  }

  get partnerBenefits() {
    return this.#partnerBenefits.asCurrency();
  }

  get partnerPortion() {
    return this.#partnerBenefits.asPercentageOf(this.totalSsBenefits);
  }

  get partnerTaxablePortion() {
    return (this.partnerPortion * this.taxablePortion).asCurrency();
  }

  get partnerNonTaxablePortion() {
    return (this.partnerPortion * this.nonTaxableAmount).asCurrency();
  }

  get hasBenefits() {
    return this.totalSsBenefits > 0;
  }

  get method() {
    return this.#method;
  }

  get incomeExceedingTier1() {
    return this.#incomeExceedingTier1;
  }

  get incomeExceedingTier2() {
    return this.#incomeExceedingTier2;
  }

  get tier1TaxableAmount() {
    return this.#tier1TaxableAmount;
  }

  get tier2TaxableAmount() {
    return this.#tier2TaxableAmount;
  }

  /**
   * Validates that the calculation follows IRS rules correctly.
   *
   * @returns {boolean} True if calculation appears valid
   */
  get isCalculationValid() {
    // Basic validation checks
    if (this.taxablePortion < 0 || this.taxablePortion > this.totalSsBenefits) {
      return false;
    }

    // Provisional income should equal half SS + other taxable income
    const expectedProvisional = this.benefits_50pct + this.#otherTaxableIncome;
    if (Math.abs(this.provisionalIncome - expectedProvisional) > 0.01) {
      return false;
    }

    // Half SS benefit should be half of total benefits
    const expectedHalfSS = this.totalSsBenefits / 2;
    if (Math.abs(this.benefits_50pct - expectedHalfSS) > 0.01) {
      return false;
    }

    return true;
  }

  // /**
  //  * Creates a summary object with key calculation metrics.
  //  *
  //  * @returns {Object} Summary containing:
  //  *   - tier: Which taxation tier applies
  //  *   - taxablePercentage: Percentage of benefits that are taxable
  //  *   - taxableAmount: Dollar amount of taxable benefits
  //  *   - nonTaxableAmount: Dollar amount of non-taxable benefits
  //  *   - provisionalIncome: Total provisional income used in calculation
  //  *   - isValid: Whether calculation appears to follow IRS rules
  //  */
  // getSummary() {
  //   return {
  //     tier: this.taxationTier,
  //     taxablePercentage: this.taxablePercentage,
  //     taxableAmount: this.taxableAmount,
  //     nonTaxableAmount: this.nonTaxableAmount,
  //     provisionalIncome: this.provisionalIncome,
  //     isValid: this.isCalculationValid,
  //   };
  // }
}

export { SocialSecurityBreakdown };
