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
  /**
   * Creates a new SocialSecurityIncome instance with Social Security benefit data.
   *
   * @param {string} [subjectPortion="0%"] - Primary beneficiary's gross SS as percentage
   * @param {number} [subjectTaxableAmount=0] - Primary beneficiary's taxable SS amount
   * @param {number} [subjectNonTaxableAmount=0] - Primary beneficiary's non-taxable SS amount
   * @param {string} [partnerPortion="0%"] - Spouse's gross SS as percentage
   * @param {number} [partnerTaxableAmount=0] - Spouse's taxable SS amount
   * @param {number} [partnerNonTaxableAmount=0] - Spouse's non-taxable SS amount
   * @param {number} [combinedProvisionalIncome=0] - Combined provisional income for tax calculations
   * @param {any} [calculationDetails=null] - Detailed calculation breakdown
   * @param {string} [description="Social Security Income"] - Descriptive label
   */
  constructor(
    subjectPortion = "0%",
    subjectTaxableAmount = 0,
    subjectNonTaxableAmount = 0,
    partnerPortion = "0%",
    partnerTaxableAmount = 0,
    partnerNonTaxableAmount = 0,
    combinedProvisionalIncome = 0,
    calculationDetails = null,
    description = "Social Security Income"
  ) {
    this._description = description;
    this.subjectPortion = subjectPortion;
    this.subjectTaxableAmount = subjectTaxableAmount;
    this.subjectNonTaxableAmount = subjectNonTaxableAmount;
    this.partnerPortion = partnerPortion;
    this.partnerTaxableAmount = partnerTaxableAmount;
    this.partnerNonTaxableAmount = partnerNonTaxableAmount;
    this.combinedProvisionalIncome = combinedProvisionalIncome;
    this.calculationDetails = calculationDetails;
  }

  /**
   * Gets the descriptive label for this Social Security income data.
   *
   * @returns {string} Description of the Social Security income data
   */
  get description() {
    return this._description;
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
    return this.subjectTaxableAmount + this.subjectNonTaxableAmount;
  }

  /**
   * Calculates the total Social Security income for the spouse.
   *
   * @returns {number} Total spouse Social Security income
   */
  get partnerTotalSsIncome() {
    return this.partnerTaxableAmount + this.partnerNonTaxableAmount;
  }

  /**
   * Calculates the combined total Social Security income for both beneficiaries.
   *
   * @returns {number} Combined Social Security income
   */
  get totalSsIncome() {
    return this.subjectTotalSsIncome + this.partnerTotalSsIncome;
  }

  /**
   * Calculates the total taxable Social Security income for both beneficiaries.
   *
   * @returns {number} Total taxable Social Security income
   */
  get totalTaxableSsIncome() {
    return this.subjectTaxableAmount + this.partnerTaxableAmount;
  }

  /**
   * Calculates the total non-taxable Social Security income for both beneficiaries.
   *
   * @returns {number} Total non-taxable Social Security income
   */
  get totalNonTaxableSsIncome() {
    return this.subjectNonTaxableAmount + this.partnerNonTaxableAmount;
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
    const percentageStr = this.subjectPortion.replace("%", "");
    const percentage = parseFloat(percentageStr);
    return isNaN(percentage) ? 0 : percentage / 100;
  }

  /**
   * Gets the spouse's gross Social Security percentage as a decimal.
   *
   * @returns {number} Spouse's gross percentage as decimal
   */
  get partnerGrossPercentage() {
    const percentageStr = this.partnerPortion.replace("%", "");
    const percentage = parseFloat(percentageStr);
    return isNaN(percentage) ? 0 : percentage / 100;
  }

  /**
   * Calculates the taxable percentage for the primary beneficiary.
   *
   * @returns {number} Primary beneficiary's taxable percentage as decimal
   */
  get subjectTaxablePercentage() {
    const totalIncome = this.subjectTotalSsIncome;
    if (totalIncome <= 0) return 0;
    return this.subjectTaxableAmount / totalIncome;
  }

  /**
   * Calculates the taxable percentage for the spouse.
   *
   * @returns {number} Spouse's taxable percentage as decimal
   */
  get partnerTaxablePercentage() {
    const totalIncome = this.partnerTotalSsIncome;
    if (totalIncome <= 0) return 0;
    return this.partnerTaxableAmount / totalIncome;
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
          ? this.subjectTaxableAmount / totalTaxableIncome
          : 0,
      spouseTaxableShare:
        totalTaxableIncome > 0
          ? this.partnerTaxableAmount / totalTaxableIncome
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
    // Standard SS taxation thresholds (2025 values)
    const marriedThreshold1 = 32000;
    const marriedThreshold2 = 44000;

    // Assume married filing jointly for now (would need marital status input for precision)
    const threshold1 = marriedThreshold1;
    const threshold2 = marriedThreshold2;

    const provisionalIncome = this.combinedProvisionalIncome;

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
    if (this.subjectTaxableAmount < 0) {
      errors.push("Primary beneficiary taxable amount cannot be negative");
    }
    if (this.subjectNonTaxableAmount < 0) {
      errors.push("Primary beneficiary non-taxable amount cannot be negative");
    }
    if (this.partnerTaxableAmount < 0) {
      errors.push("Spouse taxable amount cannot be negative");
    }
    if (this.partnerNonTaxableAmount < 0) {
      errors.push("Spouse non-taxable amount cannot be negative");
    }
    if (this.combinedProvisionalIncome < 0) {
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
   * Updates Social Security income values for corrections or adjustments.
   *
   * @param {Object} updates - Object containing SS income updates:
   * @param {string} [updates.mySsGross] - New primary gross percentage
   * @param {number} [updates.myTaxableAmount] - New primary taxable amount
   * @param {number} [updates.myNonTaxableAmount] - New primary non-taxable amount
   * @param {string} [updates.spouseSsGross] - New spouse gross percentage
   * @param {number} [updates.spouseTaxableAmount] - New spouse taxable amount
   * @param {number} [updates.spouseNonTaxableAmount] - New spouse non-taxable amount
   * @param {number} [updates.combinedProvisionalIncome] - New provisional income
   * @param {any} [updates.calculationDetails] - New calculation details
   */
  updateSsIncome(updates) {
    if (updates.mySsGross !== undefined) {
      this.subjectPortion = updates.mySsGross;
    }
    if (updates.myTaxableAmount !== undefined) {
      this.subjectTaxableAmount = updates.myTaxableAmount;
    }
    if (updates.myNonTaxableAmount !== undefined) {
      this.subjectNonTaxableAmount = updates.myNonTaxableAmount;
    }
    if (updates.spouseSsGross !== undefined) {
      this.partnerPortion = updates.spouseSsGross;
    }
    if (updates.spouseTaxableAmount !== undefined) {
      this.partnerTaxableAmount = updates.spouseTaxableAmount;
    }
    if (updates.spouseNonTaxableAmount !== undefined) {
      this.partnerNonTaxableAmount = updates.spouseNonTaxableAmount;
    }
    if (updates.combinedProvisionalIncome !== undefined) {
      this.combinedProvisionalIncome = updates.combinedProvisionalIncome;
    }
    if (updates.calculationDetails !== undefined) {
      this.calculationDetails = updates.calculationDetails;
    }
  }

  /**
   * Factory method to create a SocialSecurityIncome from income calculation results.
   *
   * This method provides a convenient way to construct SocialSecurityIncome objects
   * by extracting data from income calculation results and Social Security breakdowns.
   *
   * @param {SsBenefitsCalculator} ssBenefitsCalculator - Income calculation results containing SS breakdown:

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
  static CreateUsing(ssBenefitsCalculator) {
    // Build calculation details with label if withLabel function is available
    let calculationDetails = ssBenefitsCalculator;
    if (typeof withLabel === "function") {
      calculationDetails = withLabel(
        "ssBenefitsCalculator",
        ssBenefitsCalculator
      );
    }

    return new SocialSecurityIncome(
      `${(ssBenefitsCalculator.myPortion || 0) * 100}%`,
      ssBenefitsCalculator.myTaxablePortion || 0,
      ssBenefitsCalculator.myNonTaxablePortion || 0,
      `${(ssBenefitsCalculator.spousePortion || 0) * 100}%`,
      ssBenefitsCalculator.spouseTaxablePortion || 0,
      ssBenefitsCalculator.spouseNonTaxablePortion || 0,
      ssBenefitsCalculator.provisionalIncome || 0,
      calculationDetails
    );
  }

  /**
   * Factory method to create a SocialSecurityIncome from individual values.
   *
   * @param {number} myTotalBenefit - Primary beneficiary's total SS benefit
   * @param {number} myTaxablePortion - Primary beneficiary's taxable portion
   * @param {number} [spouseTotalBenefit=0] - Spouse's total SS benefit
   * @param {number} [spouseTaxablePortion=0] - Spouse's taxable portion
   * @param {number} [provisionalIncome=0] - Combined provisional income
   * @param {string} [description="Social Security Income"] - Optional description
   *
   * @returns {SocialSecurityIncome} A new SS income instance with specified values
   *
   * @example
   * // Create SS income from known values
   * const ssIncome = SocialSecurityIncome.CreateFrom(
   *   30000, // my total benefit
   *   15000, // my taxable portion
   *   25000, // spouse total benefit
   *   10000, // spouse taxable portion
   *   45000  // provisional income
   * );
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    myTotalBenefit,
    myTaxablePortion,
    spouseTotalBenefit = 0,
    spouseTaxablePortion = 0,
    provisionalIncome = 0,
    description = "Social Security Income"
  ) {
    const myNonTaxablePortion = myTotalBenefit - myTaxablePortion;
    const spouseNonTaxablePortion = spouseTotalBenefit - spouseTaxablePortion;

    // Calculate gross percentages (assuming full benefit for now)
    const myGrossPercentage = "100%"; // Would need PIA calculation for actual percentage
    const spouseGrossPercentage = spouseTotalBenefit > 0 ? "100%" : "0%";

    return new SocialSecurityIncome(
      myGrossPercentage,
      myTaxablePortion,
      myNonTaxablePortion,
      spouseGrossPercentage,
      spouseTaxablePortion,
      spouseNonTaxablePortion,
      provisionalIncome,
      null,
      description
    );
  }

  /**
   * Factory method to create an empty SocialSecurityIncome instance.
   *
   * @param {string} [description="Social Security Income"] - Optional description
   * @returns {SocialSecurityIncome} A new SS income instance with zero values
   *
   * @example
   * // Create empty SS income for later population
   * const ssIncome = SocialSecurityIncome.Empty();
   * ssIncome.updateSsIncome({
   *   myTaxableAmount: 15000,
   *   myNonTaxableAmount: 15000
   * });
   *
   * @static
   * @since 1.0.0
   */
  static Empty(description = "Social Security Income") {
    return new SocialSecurityIncome(
      "0%",
      0,
      0,
      "0%",
      0,
      0,
      0,
      null,
      description
    );
  }
}

// Maintain backward compatibility - this will need incomeResults context
// const ssIncome = SocialSecurityIncome.CreateUsing(incomeResults);
