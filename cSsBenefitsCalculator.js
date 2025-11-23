class SsBenefitsCalculator {
  /** @type {SsCalculationDetails} */
  #calculationDetails;

  /**
   * @param {SsCalculationDetails} calculationDetails
   */
  constructor(calculationDetails) {
    this.#calculationDetails = calculationDetails;
  }

  get benefits_50pct() {
    return this.#calculationDetails.benefits_50pct;
  }

  get benefits_85pct() {
    return this.#calculationDetails.benefits_85pct;
  }

  get hasBenefits() {
    return this.#calculationDetails.totalSsBenefits > 0;
  }

  get myPortion() {
    return this.#calculationDetails.subjectBenefits.asPercentageOf(
      this.totalSsBenefits
    );
  }

  get spousePortion() {
    return this.#calculationDetails.partnerBenefits.asPercentageOf(
      this.totalSsBenefits
    );
  }

  get totalSsBenefits() {
    return this.#calculationDetails.totalSsBenefits;
  }

  get myTaxablePortion() {
    return (
      this.myPortion * this.#calculationDetails.maxTaxableSs
    ).asCurrency();
  }

  get spouseTaxablePortion() {
    return (
      this.spousePortion * this.#calculationDetails.maxTaxableSs
    ).asCurrency();
  }

  get myNonTaxablePortion() {
    return (
      this.myPortion * this.#calculationDetails.nonTaxableAmount
    ).asCurrency();
  }

  get spouseNonTaxablePortion() {
    return (
      this.spousePortion * this.#calculationDetails.nonTaxableAmount
    ).asCurrency();
  }

  get taxationSummary() {
    return {
      totalBenefits: this.totalSsBenefits,
      taxable: this.#calculationDetails.taxableAmount,
      nonTaxable: this.#calculationDetails.nonTaxableAmount,
      taxablePercentage:
        this.totalSsBenefits > 0
          ? this.#calculationDetails.taxableAmount.asPercentageOf(
              this.totalSsBenefits
            )
          : 0,
      provisionalIncome: this.#calculationDetails.provisionalIncome,
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
    if (
      this.#calculationDetails.provisionalIncome <=
      this.#calculationDetails.tier1Threshold
    ) {
      this.#calculationDetails.taxableAmount = 0;
      return;
    }

    // Case 2: Provisional income exceeds Tier 1 but not Tier 2
    if (
      this.#calculationDetails.provisionalIncome <=
      this.#calculationDetails.tier2Threshold
    ) {
      const incomeExceedingTier1 =
        this.#calculationDetails.provisionalIncome -
        this.#calculationDetails.tier1Threshold;

      let excessOfTier1TaxableAmt = (0.5 * incomeExceedingTier1).asCurrency();

      // Taxable amount is the lesser of half of SS benefits or excess amount
      const taxableSSAmount = Math.min(
        this.benefits_50pct,
        excessOfTier1TaxableAmt
      );

      this.#calculationDetails.taxableAmount = taxableSSAmount;
    }

    // Case 3: Provisional income exceeds Tier 2
    excessOverTier1 =
      this.#calculationDetails.tier2Threshold -
      this.#calculationDetails.tier1Threshold;

    let taxableTier1Amount = (0.5 * excessOverTier1).asCurrency();

    let taxableSsInTier1 = Math.min(
      this.benefits_50pct,
      taxableTier1Amount
    ).asCurrency();

    excessOverTier2 =
      this.#calculationDetails.provisionalIncome -
      this.#calculationDetails.tier2Threshold;

    let taxableTier2Amount = (0.85 * excessOverTier2).asCurrency();

    let taxableSsInTier2 = Math.min(
      this.benefits_85pct,
      taxableTier2Amount
    ).asCurrency();

    let taxablePortion = Math.min(
      this.benefits_85pct,
      taxableSsInTier1 + taxableSsInTier2
    );

    // Update calculation details
    this.#calculationDetails.method = "irs-rules";
    this.#calculationDetails.incomeExceedingTier1 = excessOverTier1;
    this.#calculationDetails.incomeExceedingTier2 = excessOverTier2;
    this.#calculationDetails.tier1TaxableAmount = taxableSsInTier1;
    this.#calculationDetails.tier2TaxableAmount = taxableSsInTier2;
    this.#calculationDetails.taxableAmount = taxablePortion;
  }

  // // Method to recalculate with new non-SS income
  // /**
  //  * @param {number} otherTaxableIncome
  //  */
  // updateNonSsIncome(otherTaxableIncome) {
  //   this.otherTaxableIncome = otherTaxableIncome;
  //   this.#calculateTaxablePortion();
  // }

  /**
   * @param {Number} subjectBenefits
   * @param {Number} partnerBenefits
   * @param {Number} otherTaxableIncome
   * @param {Boolean} hasSpouse
   * @returns {SsBenefitsCalculator}
   */
  static CalculateUsing(
    subjectBenefits,
    partnerBenefits,
    otherTaxableIncome,
    hasSpouse
  ) {
    const calculationDetails = new SsCalculationDetails(
      subjectBenefits,
      partnerBenefits,
      otherTaxableIncome,
      hasSpouse
    );

    const ssBenefits = new SsBenefitsCalculator(calculationDetails);

    // Perform the calculation automatically
    ssBenefits.#calculateTaxablePortion();

    return ssBenefits;
  }
}

// // Export for Node.js testing
// if (typeof module !== "undefined" && module.exports) {
//   module.exports = { SsBenefitsCalculator };
// }
