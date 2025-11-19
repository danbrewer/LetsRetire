class SsBenefitsCalculator {
  #calculationDetails = new SsCalculationDetails();
  #initialize() {
    this.totalSsBenefits = (this.myBenefits + this.spouseBenefits).asCurrency();

    this.benefits_50pct = (0.5 * this.totalSsBenefits).asCurrency();
    this.benefits_85pct = (0.85 * this.totalSsBenefits).asCurrency();

    this.maxTaxableSs = this.benefits_85pct;

    this.myPortion = (
      this.hasBenefits ? this.myBenefits / this.totalSsBenefits : 0
    ).asCurrency();
    this.spousePortion = (
      this.hasBenefits ? this.spouseBenefits / this.totalSsBenefits : 0
    ).asCurrency();

    this.provisionalIncome = (
      this.benefits_50pct + this.otherTaxableIncome
    ).asCurrency();
  }

  /**
   * @param {number} myBenefits
   * @param {number} spouseBenefits
   * @param {number} otherTaxableIncome
   */
  constructor(myBenefits, spouseBenefits, otherTaxableIncome) {
    this.myBenefits = myBenefits;
    this.spouseBenefits = spouseBenefits;

    this.myPortion = 0;
    this.spousePortion = 0;
    this.totalSsBenefits = 0;

    this.benefits_50pct = 0;
    this.benefits_85pct = 0;

    this.otherTaxableIncome = otherTaxableIncome;
    this.provisionalIncome = 0;

    this.maxTaxableSs = 0;
    this.actualTaxablePortion = 0;
    this.actualNonTaxablePortion = 0;

    this.tier1Threshold = 32000;
    this.tier2Threshold = 44000;

    this.#initialize();
  }

  get myTaxablePortion() {
    return (this.myPortion * this.maxTaxableSs).asCurrency();
  }

  get spouseTaxablePortion() {
    return (this.spousePortion * this.maxTaxableSs).asCurrency();
  }

  get myNonTaxablePortion() {
    return (this.myPortion * this.actualNonTaxablePortion).asCurrency();
  }

  get spouseNonTaxablePortion() {
    return (this.spousePortion * this.actualNonTaxablePortion).asCurrency();
  }

  // Utility methods for analyzing benefits
  get hasBenefits() {
    return this.totalSsBenefits > 0;
  }

  get taxationSummary() {
    return {
      totalBenefits: this.totalSsBenefits,
      taxablePortion: this.actualTaxablePortion,
      nonTaxablePortion: this.actualNonTaxablePortion,
      taxablePercentage:
        this.totalSsBenefits > 0
          ? this.actualTaxablePortion.asPercentageOf(this.totalSsBenefits)
          : 0,
      provisionalIncome: this.provisionalIncome,
    };
  }

  get calculationDetails() {
    return this.#calculationDetails;
  }

  // Private method to calculate the taxable portion based on IRS rules
  #calculateTaxablePortion() {
    let excessOverTier1 = 0;
    let excessOverTier2 = 0;

    // Case 1: No social security is taxable
    if (this.provisionalIncome <= this.tier1Threshold) {
      this.actualTaxablePortion = 0;
      this.actualNonTaxablePortion =
        this.totalSsBenefits - this.actualNonTaxablePortion;
      return;
    }

    // Case 2: Provisional income exceeds Tier 1 but not Tier 2
    if (this.provisionalIncome <= this.tier2Threshold) {
      const incomeExceedingTier1 = this.provisionalIncome - this.tier1Threshold;

      let excessOfTier1TaxableAmt = (0.5 * incomeExceedingTier1).asCurrency();

      // Taxable amount is the lesser of half of SS benefits or excess amount
      const taxableSSAmount = Math.min(
        this.benefits_50pct,
        excessOfTier1TaxableAmt
      );

      this.actualTaxablePortion = taxableSSAmount;
      this.actualNonTaxablePortion =
        this.totalSsBenefits - this.actualTaxablePortion;
      return;
    }

    // Case 3: Provisional income exceeds Tier 2
    excessOverTier1 = this.tier2Threshold - this.tier1Threshold;

    let taxableTier1Amount = (0.5 * excessOverTier1).asCurrency();

    let taxableSsInTier1 = Math.min(
      this.benefits_50pct,
      taxableTier1Amount
    ).asCurrency();

    excessOverTier2 = this.provisionalIncome - this.tier2Threshold;

    let taxableTier2Amount = (0.85 * excessOverTier2).asCurrency();

    let taxableSsInTier2 = Math.min(
      this.benefits_85pct,
      taxableTier2Amount
    ).asCurrency();

    let taxableSSAmount = Math.min(
      this.benefits_85pct,
      taxableSsInTier1 + taxableSsInTier2
    );

    this.actualTaxablePortion = taxableSSAmount;
    this.actualNonTaxablePortion =
      this.totalSsBenefits - this.actualTaxablePortion;

    // Update calculation details
    this.#calculationDetails.method = "irs-rules";
    this.#calculationDetails.totalSsBenefits = this.totalSsBenefits;
    this.#calculationDetails.benefits_50pct = this.benefits_50pct;
    this.#calculationDetails.benefits_85pct = this.benefits_85pct;
    this.#calculationDetails.otherTaxableIncome = this.otherTaxableIncome;
    this.#calculationDetails.provisionalIncome = this.provisionalIncome;
    this.#calculationDetails.tier1Threshold = this.tier1Threshold;
    this.#calculationDetails.tier2Threshold = this.tier2Threshold;
    this.#calculationDetails.incomeExceedingTier1 = excessOverTier1;
    this.#calculationDetails.incomeExceedingTier2 = excessOverTier2;
    this.#calculationDetails.tier1TaxableAmount = taxableSsInTier1;
    this.#calculationDetails.tier2TaxableAmount = taxableSsInTier2;
    this.#calculationDetails.finalTaxableAmount = this.actualTaxablePortion;
  }

  // Method to recalculate with new non-SS income
  /**
   * @param {number} newNonSsIncome
   */
  updateNonSsIncome(newNonSsIncome) {
    this.otherTaxableIncome = newNonSsIncome;
    this.#initialize();
    this.#calculateTaxablePortion();
  }

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
}

// // Export for Node.js testing
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = { SsBenefitsCalculator };
// }
