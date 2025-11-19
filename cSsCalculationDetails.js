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
class SsCalculationDetails {
  /**
   * Creates a new SsCalculationDetails instance with comprehensive calculation data.
   */
  constructor() {
    this._description = "Social Security Taxation Calculation Details";
    this.method = "irs-rules";
    this.totalSsBenefits = 0;
    this.otherTaxableIncome = 0;
    this.benefits_50pct = 0;
    this.benefits_85pct = 0;
    this.provisionalIncome = 0;

    this.tier1Threshold = 0;
    this.incomeExceedingTier1 = 0;
    this.tier2Threshold = 0;
    this.incomeExceedingTier2 = 0;
    this.tier1TaxableAmount = 0;
    this.tier2TaxableAmount = 0;
    this.finalTaxableAmount = 0;
  }

  /**
   * Determines which taxation tier applies based on provisional income.
   *
   * @returns {string} Taxation tier: "none", "tier1", or "tier2"
   */
  get taxationTier() {
    if (this.provisionalIncome <= this.tier1Threshold) {
      return "none";
    } else if (this.provisionalIncome <= this.tier2Threshold) {
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
    return this.finalTaxableAmount / this.totalSsBenefits;
  }

  /**
   * Gets the non-taxable portion of Social Security benefits.
   *
   * @returns {number} Non-taxable Social Security amount
   */
  get nonTaxableAmount() {
    return this.totalSsBenefits - this.finalTaxableAmount;
  }

  /**
   * Validates that the calculation follows IRS rules correctly.
   *
   * @returns {boolean} True if calculation appears valid
   */
  get isCalculationValid() {
    // Basic validation checks
    if (
      this.finalTaxableAmount < 0 ||
      this.finalTaxableAmount > this.totalSsBenefits
    ) {
      return false;
    }

    // Provisional income should equal half SS + other taxable income
    const expectedProvisional = this.benefits_50pct + this.otherTaxableIncome;
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

  /**
   * Creates a summary object with key calculation metrics.
   *
   * @returns {Object} Summary containing:
   *   - tier: Which taxation tier applies
   *   - taxablePercentage: Percentage of benefits that are taxable
   *   - taxableAmount: Dollar amount of taxable benefits
   *   - nonTaxableAmount: Dollar amount of non-taxable benefits
   *   - provisionalIncome: Total provisional income used in calculation
   *   - isValid: Whether calculation appears to follow IRS rules
   */
  getSummary() {
    return {
      tier: this.taxationTier,
      taxablePercentage: this.taxablePercentage,
      taxableAmount: this.finalTaxableAmount,
      nonTaxableAmount: this.nonTaxableAmount,
      provisionalIncome: this.provisionalIncome,
      isValid: this.isCalculationValid,
    };
  }

  // /**
  //  * Updates calculation values typically set during the taxation algorithm.
  //  *
  //  * @param {SsCalculationDetails} updates - Object containing calculation updates:
  //  *   - incomeExceedingTier1: Amount exceeding first threshold
  //  *   - incomeExceedingTier2: Amount exceeding second threshold
  //  *   - tier1TaxableAmount: Taxable amount from tier 1 calculation
  //  *   - tier2TaxableAmount: Taxable amount from tier 2 calculation
  //  *   - finalTaxableAmount: Final total taxable amount
  //  */
  // updateCalculationResults(updates) {
  //   if (updates.incomeExceedingTier1 !== undefined) {
  //     this.incomeExceedingTier1 = updates.incomeExceedingTier1;
  //   }
  //   if (updates.incomeExceedingTier2 !== undefined) {
  //     this.incomeExceedingTier2 = updates.incomeExceedingTier2;
  //   }
  //   if (updates.tier1TaxableAmount !== undefined) {
  //     this.tier1TaxableAmount = updates.tier1TaxableAmount;
  //   }
  //   if (updates.tier2TaxableAmount !== undefined) {
  //     this.tier2TaxableAmount = updates.tier2TaxableAmount;
  //   }
  //   if (updates.finalTaxableAmount !== undefined) {
  //     this.finalTaxableAmount = updates.finalTaxableAmount;
  //   }
  // }

  /**
   * Factory method to create SsCalculationDetails from Social Security benefit data.
   *
   * This method initializes the calculation details with the basic input parameters
   * needed for Social Security taxation calculations. The actual calculation results
   * (tier amounts, final taxable amount) are typically set later during the
   * taxation algorithm execution.
   *
   * @param {number} totalBenefits - Total Social Security benefits for calculation
   * @param {number} benefits_50pct - Half of total Social Security benefits
   * @param {number} benefits_85pct - 85% of total Social Security benefits
   * @param {number} otherTaxableIncome - Non-Social Security taxable income
   * @param {number} provisionalIncome - Total provisional income for threshold comparisons
   * @param {string} [method="irs-rules"] - Calculation methodology
   * @param {number} [tier1Threshold=32000] - First taxation threshold (MFJ)
   * @param {number} [tier2Threshold=44000] - Second taxation threshold (MFJ)
   *
   * @returns {SsCalculationDetails} A new calculation details instance ready for taxation algorithm
   *
   * @example
   * // Create calculation details for SS taxation
   * const totalBenefits = 48000;
   * const halfSS = 24000;
   * const otherIncome = 25000;
   * const provisional = halfSS + otherIncome; // 49000
   *
   * const details = SsCalculationDetails.CreateUsing(
   *   totalBenefits, halfSS, otherIncome, provisional
   * );
   *
   * console.log(details.getTaxationTier()); // "tier2" (49000 > 44000)
   *
   * @static
   * @since 1.0.0
   */
  // static CreateUsing(
  //   totalBenefits,
  //   benefits_50pct,
  //   benefits_85pct,
  //   otherTaxableIncome,
  //   provisionalIncome,
  //   method = "irs-rules",
  //   tier1Threshold = 32000,
  //   tier2Threshold = 44000
  // ) {
  //   return new SsCalculationDetails(
  //     method,
  //     totalBenefits,
  //     benefits_50pct,
  //     benefits_85pct,
  //     otherTaxableIncome,
  //     provisionalIncome,
  //     tier1Threshold,
  //     0, // incomeExceedingTier1 - calculated later
  //     tier2Threshold,
  //     0, // incomeExceedingTier2 - calculated later
  //     0, // finalTaxableAmount - calculated later
  //     0, // tier1TaxableAmount - calculated later
  //     0 // tier2TaxableAmount - calculated later
  //   );
  // }
}

// Note: The original object referenced 'this' properties that are not available in this context
// Use SsCalculationDetails.CreateUsing() with actual benefit data instead
// const calculationDetails = SsCalculationDetails.CreateUsing(totalBenefits, halfSS, otherIncome, provisional);
