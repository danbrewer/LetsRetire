class SsBenefits {
  constructor(myBenefits = 0, spouseBenefits = 0, nonSsIncome = 0) {
    this.inputs = {
      myBenefits: myBenefits,
      spouseBenefits: spouseBenefits,
      nonSsIncome: nonSsIncome,
    };
    this.taxablePortion = 0;
    this.calculationDetails = {};

    // Perform the calculation automatically
    this.#calculateTaxablePortion();
  }

  // Factory method for backward compatibility
  static CreateFrom(mySsBenefits, spouseSsBenefits, nonSsIncome) {
    return new SsBenefits(
      mySsBenefits || 0,
      spouseSsBenefits || 0,
      nonSsIncome || 0
    );
  }

  oneHalfOfSSBenefits() {
    return (0.5 * this.totalBenefits()).asCurrency();
  }

  // derived values
  nonTaxablePortion() {
    return this.totalBenefits() - this.taxablePortion;
  }

  totalBenefits() {
    return (this.inputs.myBenefits + this.inputs.spouseBenefits).asCurrency();
  }

  myPortion() {
    if (this.totalBenefits() === 0) return 0;
    return (this.inputs.myBenefits / this.totalBenefits()).asCurrency();
  }

  spousePortion() {
    if (this.totalBenefits() === 0) return 0;
    return (this.inputs.spouseBenefits / this.totalBenefits()).asCurrency();
  }

  myTaxablePortion() {
    return (this.myPortion() * this.taxablePortion).asCurrency();
  }

  spouseTaxablePortion() {
    return (this.spousePortion() * this.taxablePortion).asCurrency();
  }

  myNonTaxablePortion() {
    return (this.myPortion() * this.nonTaxablePortion()).asCurrency();
  }

  spouseNonTaxablePortion() {
    return (this.spousePortion() * this.nonTaxablePortion()).asCurrency();
  }

  provisionalIncome() {
    return (this.oneHalfOfSSBenefits() + this.inputs.nonSsIncome).asCurrency();
  }

  // Private method to calculate the taxable portion based on IRS rules
  #calculateTaxablePortion() {
    if (isNaN(this.totalBenefits()) || isNaN(this.inputs.nonSsIncome)) {
      if (typeof log !== "undefined") {
        log.error(
          `SsBenefits received NaN values: totalBenefits was ${this.totalBenefits()}, nonSsIncome was ${this.inputs.nonSsIncome}`
        );
      }
      throw new Error("Invalid input: NaN values detected");
    }

    const calculationDetails = {
      method: "irs-rules",
      totalBenefits: this.totalBenefits(),
      halfSSBenefit: this.oneHalfOfSSBenefits(),
      otherTaxableIncome: this.inputs.nonSsIncome,
      provisionalIncome: this.provisionalIncome(),
      tier1Threshold: 32000,
      incomeExceedingTier1: 0,
      tier2Threshold: 44000,
      incomeExceedingTier2: 0,
      finalTaxableAmount: 0,
    };

    this.calculationDetails = calculationDetails;

    // Case 1: No social security is taxable
    if (
      calculationDetails.provisionalIncome <= calculationDetails.tier1Threshold
    ) {
      this.taxablePortion = 0;
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
      )
        .asCurrency()
        .asCurrency();

      calculationDetails.finalTaxableAmount = Math.min(
        (0.5 * this.totalBenefits()).asCurrency(),
        excessOfTier1TaxableAmt
      ).asCurrency();

      this.taxablePortion = calculationDetails.finalTaxableAmount;
      return;
    }

    // Case 3: Provisional income exceeds Tier 2
    const excessOverTier2 =
      this.provisionalIncome() - calculationDetails.tier2Threshold;

    let taxableSsInExcessOfTier1Threshold =
      0.5 *
      (calculationDetails.tier2Threshold - calculationDetails.tier1Threshold);
    let taxableSsInExcessOfTier2Threshold = (
      0.85 * excessOverTier2
    ).asCurrency();

    let taxableSSAmount = Math.min(
      (0.85 * this.totalBenefits()).asCurrency(),
      taxableSsInExcessOfTier1Threshold + taxableSsInExcessOfTier2Threshold
    );

    // Update calculation details
    calculationDetails.incomeExceedingTier1 =
      calculationDetails.tier2Threshold - calculationDetails.tier1Threshold;
    calculationDetails.incomeExceedingTier2 = excessOverTier2;
    calculationDetails.tier1TaxableAmount = taxableSsInExcessOfTier1Threshold;
    calculationDetails.tier2TaxableAmount = Math.min(
      (0.85 * this.totalBenefits()).asCurrency() -
        taxableSsInExcessOfTier1Threshold,
      taxableSsInExcessOfTier2Threshold
    );

    this.taxablePortion = taxableSSAmount;
  }

  // Utility methods for analyzing benefits
  hasBenefits() {
    return this.totalBenefits() > 0;
  }

  hasMyBenefits() {
    return this.inputs.myBenefits > 0;
  }

  hasSpouseBenefits() {
    return this.inputs.spouseBenefits > 0;
  }

  getTaxationSummary() {
    return {
      totalBenefits: this.totalBenefits(),
      taxablePortion: this.taxablePortion,
      nonTaxablePortion: this.nonTaxablePortion(),
      taxablePercentage:
        this.totalBenefits() > 0
          ? ((this.taxablePortion / this.totalBenefits()) * 100).round(2)
          : 0,
      provisionalIncome: this.provisionalIncome(),
    };
  }

  // Method to recalculate with new non-SS income
  updateNonSsIncome(newNonSsIncome) {
    this.inputs.nonSsIncome = newNonSsIncome;
    this.#calculateTaxablePortion();
  }

  calculateSsBenefits() {
    return {
      inputs: this.inputs,
      taxablePortion: this.taxablePortion,
      oneHalfOfSSBenefits: this.oneHalfOfSSBenefits(),
      nonTaxablePortion: this.nonTaxablePortion(),
      totalBenefits: this.totalBenefits(),
      myPortion: this.myPortion(),
      spousePortion: this.spousePortion(),
      myTaxablePortion: this.myTaxablePortion(),
      spouseTaxablePortion: this.spouseTaxablePortion(),
      myNonTaxablePortion: this.myNonTaxablePortion(),
      spouseNonTaxablePortion: this.spouseNonTaxablePortion(),
      provisionalIncome: this.provisionalIncome(),
      calculationDetails: this.calculationDetails,
    };
  }

  static CalculateUsing(mySsBenefits, spouseSsBenefits, nonSsIncome) {
    const ssBenefits = SsBenefits.CreateFrom(
      mySsBenefits,
      spouseSsBenefits,
      nonSsIncome
    );

    return ssBenefits.calculateSsBenefits();
  }
}

// Export for Node.js testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SsBenefits };
}
