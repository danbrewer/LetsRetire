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
   *
   * @param {string} [method="irs-rules"] - Calculation methodology used (typically "irs-rules")
   * @param {number} [totalBenefits=0] - Total Social Security benefits for both spouses
   * @param {number} [halfSSBenefit=0] - Half of total Social Security benefits (used in provisional income)
   * @param {number} [otherTaxableIncome=0] - Non-Social Security taxable income (pension, interest, etc.)
   * @param {number} [provisionalIncome=0] - Total provisional income (half SS + other taxable income)
   * @param {number} [tier1Threshold=32000] - IRS Tier 1 threshold for married filing jointly ($32,000)
   * @param {number} [incomeExceedingTier1=0] - Amount of provisional income exceeding Tier 1 threshold
   * @param {number} [tier2Threshold=44000] - IRS Tier 2 threshold for married filing jointly ($44,000)
   * @param {number} [incomeExceedingTier2=0] - Amount of provisional income exceeding Tier 2 threshold
   * @param {number} [finalTaxableAmount=0] - Final calculated taxable Social Security amount
   * @param {number} [tier1TaxableAmount=0] - Taxable amount from Tier 1 calculation (50% rate)
   * @param {number} [tier2TaxableAmount=0] - Taxable amount from Tier 2 calculation (85% rate)
   */
  constructor(
    method = "irs-rules",
    totalBenefits = 0,
    halfSSBenefit = 0,
    otherTaxableIncome = 0,
    provisionalIncome = 0,
    tier1Threshold = 32000,
    incomeExceedingTier1 = 0,
    tier2Threshold = 44000,
    incomeExceedingTier2 = 0,
    finalTaxableAmount = 0,
    tier1TaxableAmount = 0,
    tier2TaxableAmount = 0
  ) {
    this._description = "Social Security Taxation Calculation Details";
    this.method = method;
    this.totalBenefits = totalBenefits;
    this.halfSSBenefit = halfSSBenefit;
    this.otherTaxableIncome = otherTaxableIncome;
    this.provisionalIncome = provisionalIncome;
    this.tier1Threshold = tier1Threshold;
    this.incomeExceedingTier1 = incomeExceedingTier1;
    this.tier2Threshold = tier2Threshold;
    this.incomeExceedingTier2 = incomeExceedingTier2;
    this.finalTaxableAmount = finalTaxableAmount;
    this.tier1TaxableAmount = tier1TaxableAmount;
    this.tier2TaxableAmount = tier2TaxableAmount;
  }

  /**
   * Gets the descriptive label for this calculation details object.
   *
   * @returns {string} Description of the calculation details
   */
  get description() {
    return this._description;
  }

  /**
   * Determines which taxation tier applies based on provisional income.
   *
   * @returns {string} Taxation tier: "none", "tier1", or "tier2"
   */
  getTaxationTier() {
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
  getTaxablePercentage() {
    if (this.totalBenefits === 0) return 0;
    return this.finalTaxableAmount / this.totalBenefits;
  }

  /**
   * Gets the non-taxable portion of Social Security benefits.
   *
   * @returns {number} Non-taxable Social Security amount
   */
  getNonTaxableAmount() {
    return this.totalBenefits - this.finalTaxableAmount;
  }

  /**
   * Validates that the calculation follows IRS rules correctly.
   *
   * @returns {boolean} True if calculation appears valid
   */
  isCalculationValid() {
    // Basic validation checks
    if (
      this.finalTaxableAmount < 0 ||
      this.finalTaxableAmount > this.totalBenefits
    ) {
      return false;
    }

    // Provisional income should equal half SS + other taxable income
    const expectedProvisional = this.halfSSBenefit + this.otherTaxableIncome;
    if (Math.abs(this.provisionalIncome - expectedProvisional) > 0.01) {
      return false;
    }

    // Half SS benefit should be half of total benefits
    const expectedHalfSS = this.totalBenefits / 2;
    if (Math.abs(this.halfSSBenefit - expectedHalfSS) > 0.01) {
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
      tier: this.getTaxationTier(),
      taxablePercentage: this.getTaxablePercentage(),
      taxableAmount: this.finalTaxableAmount,
      nonTaxableAmount: this.getNonTaxableAmount(),
      provisionalIncome: this.provisionalIncome,
      isValid: this.isCalculationValid(),
    };
  }

  /**
   * Updates calculation values typically set during the taxation algorithm.
   *
   * @param {SsCalculationDetails} updates - Object containing calculation updates:
   *   - incomeExceedingTier1: Amount exceeding first threshold
   *   - incomeExceedingTier2: Amount exceeding second threshold
   *   - tier1TaxableAmount: Taxable amount from tier 1 calculation
   *   - tier2TaxableAmount: Taxable amount from tier 2 calculation
   *   - finalTaxableAmount: Final total taxable amount
   */
  updateCalculationResults(updates) {
    if (updates.incomeExceedingTier1 !== undefined) {
      this.incomeExceedingTier1 = updates.incomeExceedingTier1;
    }
    if (updates.incomeExceedingTier2 !== undefined) {
      this.incomeExceedingTier2 = updates.incomeExceedingTier2;
    }
    if (updates.tier1TaxableAmount !== undefined) {
      this.tier1TaxableAmount = updates.tier1TaxableAmount;
    }
    if (updates.tier2TaxableAmount !== undefined) {
      this.tier2TaxableAmount = updates.tier2TaxableAmount;
    }
    if (updates.finalTaxableAmount !== undefined) {
      this.finalTaxableAmount = updates.finalTaxableAmount;
    }
  }

  /**
   * Factory method to create SsCalculationDetails from Social Security benefit data.
   *
   * This method initializes the calculation details with the basic input parameters
   * needed for Social Security taxation calculations. The actual calculation results
   * (tier amounts, final taxable amount) are typically set later during the
   * taxation algorithm execution.
   *
   * @param {number} totalBenefits - Total Social Security benefits for calculation
   * @param {number} halfSSBenefit - Half of total Social Security benefits
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
  static CreateUsing(
    totalBenefits,
    halfSSBenefit,
    otherTaxableIncome,
    provisionalIncome,
    method = "irs-rules",
    tier1Threshold = 32000,
    tier2Threshold = 44000
  ) {
    return new SsCalculationDetails(
      method,
      totalBenefits,
      halfSSBenefit,
      otherTaxableIncome,
      provisionalIncome,
      tier1Threshold,
      0, // incomeExceedingTier1 - calculated later
      tier2Threshold,
      0, // incomeExceedingTier2 - calculated later
      0, // finalTaxableAmount - calculated later
      0, // tier1TaxableAmount - calculated later
      0 // tier2TaxableAmount - calculated later
    );
  }
}

// Note: The original object referenced 'this' properties that are not available in this context
// Use SsCalculationDetails.CreateUsing() with actual benefit data instead
// const calculationDetails = SsCalculationDetails.CreateUsing(totalBenefits, halfSS, otherIncome, provisional);
