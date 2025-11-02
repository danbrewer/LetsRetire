class SsBenefitsCalculator {
  #initialize() {
    this.totalBenefits = (this.myBenefits + this.spouseBenefits).asCurrency();

    this.oneHalfOfSSBenefits = (0.5 * this.totalBenefits).asCurrency();

    this.myPortion = (
      this.hasBenefits ? this.myBenefits / this.totalBenefits : 0
    ).asCurrency();
    this.spousePortion = (
      this.hasBenefits ? this.spouseBenefits / this.totalBenefits : 0
    ).asCurrency();

    this.provisionalIncome = (
      this.oneHalfOfSSBenefits + this.nonSsIncome
    ).asCurrency();
  }

  /**
   * @param {number} myBenefits
   * @param {number} spouseBenefits
   * @param {number} nonSsIncome
   */
  constructor(myBenefits, spouseBenefits, nonSsIncome) {
    this.myBenefits = myBenefits;
    this.spouseBenefits = spouseBenefits;
    this.nonSsIncome = nonSsIncome;

    this.taxablePortion = 0;
    this.totalBenefits = 0;
    this.oneHalfOfSSBenefits = 0;
    this.myPortion = 0;
    this.spousePortion = 0;
    this.provisionalIncome = 0;
    this.calculationDetails = {};

    this.myPortion = 0;
    this.spousePortion = 0;
    this.nonTaxablePortion = 0;

    this.#initialize();
  }

  get myTaxablePortion() {
    return (this.myPortion * this.taxablePortion).asCurrency();
  }

  get spouseTaxablePortion() {
    return (this.spousePortion * this.taxablePortion).asCurrency();
  }

  get myNonTaxablePortion() {
    return (this.myPortion * this.nonTaxablePortion).asCurrency();
  }

  get spouseNonTaxablePortion() {
    return (this.spousePortion * this.nonTaxablePortion).asCurrency();
  }

  // Private method to calculate the taxable portion based on IRS rules
  #calculateTaxablePortion() {
    if (isNaN(this.totalBenefits) || isNaN(this.nonSsIncome)) {
      if (typeof log !== "undefined") {
        log.error(
          `SsBenefits received NaN values: totalBenefits was ${this.totalBenefits}, nonSsIncome was ${this.nonSsIncome}`
        );
      }
      throw new Error("Invalid input: NaN values detected");
    }

    const calculationDetails = new SsCalculationDetails(
      /* method */ "irs-rules",
      /* totalBenefits */ this.totalBenefits,
      /* halfSSBenefit */ this.oneHalfOfSSBenefits,
      /* otherTaxableIncome */ this.nonSsIncome,
      /* provisionalIncome */ this.provisionalIncome,
      /* tier1Threshold */ 32000,
      /* incomeExceedingTier1 */ 0,
      /* tier2Threshold */ 44000,
      /* incomeExceedingTier2 */ 0,
      /* finalTaxableAmount */ 0,
      /* tier1TaxableAmount */ 0,
      /* tier2TaxableAmount */ 0
    );

    this.calculationDetails = calculationDetails;

    // Case 1: No social security is taxable
    if (
      calculationDetails.provisionalIncome <= calculationDetails.tier1Threshold
    ) {
      this.taxablePortion = 0;
      this.nonTaxablePortion = this.totalBenefits - this.taxablePortion;
      return;
    }

    // Case 2: Provisional income exceeds Tier 1 but not Tier 2
    if (
      calculationDetails.provisionalIncome <= calculationDetails.tier2Threshold
    ) {
      calculationDetails.incomeExceedingTier1 =
        calculationDetails.provisionalIncome -
        calculationDetails.tier1Threshold;

      let excessOfTier1TaxableAmt = (
        0.5 * calculationDetails.incomeExceedingTier1
      ).asCurrency();

      calculationDetails.finalTaxableAmount = Math.min(
        (0.5 * this.totalBenefits).asCurrency(),
        excessOfTier1TaxableAmt
      ).asCurrency();

      this.taxablePortion = calculationDetails.finalTaxableAmount;
      this.nonTaxablePortion = this.totalBenefits - this.taxablePortion;
      return;
    }

    // Case 3: Provisional income exceeds Tier 2
    const excessOverTier2 =
      this.provisionalIncome - calculationDetails.tier2Threshold;

    let taxableSsInExcessOfTier1Threshold =
      0.5 *
      (calculationDetails.tier2Threshold - calculationDetails.tier1Threshold);
    let taxableSsInExcessOfTier2Threshold = (
      0.85 * excessOverTier2
    ).asCurrency();

    let taxableSSAmount = Math.min(
      (0.85 * this.totalBenefits).asCurrency(),
      taxableSsInExcessOfTier1Threshold + taxableSsInExcessOfTier2Threshold
    );

    // Update calculation details
    calculationDetails.incomeExceedingTier1 =
      calculationDetails.tier2Threshold - calculationDetails.tier1Threshold;
    calculationDetails.incomeExceedingTier2 = excessOverTier2;
    calculationDetails.tier1TaxableAmount = taxableSsInExcessOfTier1Threshold;
    calculationDetails.tier2TaxableAmount = Math.min(
      (0.85 * this.totalBenefits).asCurrency() -
        taxableSsInExcessOfTier1Threshold,
      taxableSsInExcessOfTier2Threshold
    );

    this.taxablePortion = taxableSSAmount;
    this.nonTaxablePortion = this.totalBenefits - this.taxablePortion;
  }

  // Utility methods for analyzing benefits
  get hasBenefits() {
    return this.totalBenefits > 0;
  }

  get taxationSummary() {
    return {
      totalBenefits: this.totalBenefits,
      taxablePortion: this.taxablePortion,
      nonTaxablePortion: this.nonTaxablePortion,
      taxablePercentage:
        this.totalBenefits > 0
          ? ((this.taxablePortion / this.totalBenefits) * 100).round(2)
          : 0,
      provisionalIncome: this.provisionalIncome,
    };
  }

  // Method to recalculate with new non-SS income
  /**
   * @param {number} newNonSsIncome
   */
  updateNonSsIncome(newNonSsIncome) {
    this.nonSsIncome = newNonSsIncome;
    this.#initialize();
    this.#calculateTaxablePortion();
  }

  // calculateSsBenefits() {
  //   return {
  //     inputs: this,
  //     taxablePortion: this.taxablePortion,
  //     oneHalfOfSSBenefits: this.oneHalfOfSSBenefits(),
  //     nonTaxablePortion: this.nonTaxablePortion(),
  //     totalBenefits: this.totalBenefits(),
  //     myPortion: this.myPortion(),
  //     spousePortion: this.spousePortion(),
  //     myTaxablePortion: this.myTaxablePortion(),
  //     spouseTaxablePortion: this.spouseTaxablePortion(),
  //     myNonTaxablePortion: this.myNonTaxablePortion(),
  //     spouseNonTaxablePortion: this.spouseNonTaxablePortion(),
  //     provisionalIncome: this.provisionalIncome(),
  //     calculationDetails: this.calculationDetails,
  //   };
  // }

  // Factory method for backward compatibility
  // static CreateFrom(mySsBenefits, spouseSsBenefits, nonSsIncome) {
  //   return new SsBenefitsCalculator(
  //     mySsBenefits || 0,
  //     spouseSsBenefits || 0,
  //     nonSsIncome || 0
  //   );
  // }

  /**
   * @param {number | undefined} [mySsBenefits]
   * @param {number | undefined} [spouseSsBenefits]
   * @param {number | undefined} [nonSsIncome]
   */
  static CalculateUsing(mySsBenefits, spouseSsBenefits, nonSsIncome) {
    const ssBenefits = new SsBenefitsCalculator(
      mySsBenefits || 0,
      spouseSsBenefits || 0,
      nonSsIncome || 0
    );

    // Perform the calculation automatically
    ssBenefits.#calculateTaxablePortion();

    return ssBenefits;
  }

  static Empty() {
    return new SsBenefitsCalculator(0, 0, 0);
  }
}

// // Export for Node.js testing
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = { SsBenefitsCalculator };
// }
