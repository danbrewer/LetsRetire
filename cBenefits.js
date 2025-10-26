class BenefitAmounts {
  /**
   * @param {number} ssAnnual - Annual Social Security benefits
   * @param {number} penAnnual - Annual pension benefits
   * @param {number} spouseSsAnnual - Annual spouse Social Security benefits
   * @param {number} spousePenAnnual - Annual spouse pension benefits
   */
  constructor(
    ssAnnual = 0,
    penAnnual = 0,
    spouseSsAnnual = 0,
    spousePenAnnual = 0
  ) {
    this.ssAnnual = ssAnnual;
    this.penAnnual = penAnnual;
    this.spouseSsAnnual = spouseSsAnnual;
    this.spousePenAnnual = spousePenAnnual;
  }

  /**
   * Factory method for backward compatibility
   * @param {number} ssYearlyIndexed - Indexed annual Social Security benefits
   * @param {number} penYearlyIndexed - Indexed annual pension benefits
   * @param {number} spouseSsYearlyIndexed - Indexed annual spouse Social Security benefits
   * @param {number} spousePenYearlyIndexed - Indexed annual spouse pension benefits
   * @returns {BenefitAmounts} New BenefitAmounts instance
   */
  static fromIndexedAmounts(
    ssYearlyIndexed,
    penYearlyIndexed,
    spouseSsYearlyIndexed,
    spousePenYearlyIndexed
  ) {
    return new BenefitAmounts(
      ssYearlyIndexed,
      penYearlyIndexed,
      spouseSsYearlyIndexed,
      spousePenYearlyIndexed
    );
  }

  // Utility methods for benefit analysis
  getTotalSocialSecurity() {
    return this.ssAnnual + this.spouseSsAnnual;
  }

  getTotalPension() {
    return this.penAnnual + this.spousePenAnnual;
  }

  getTotalBenefits() {
    return this.getTotalSocialSecurity() + this.getTotalPension();
  }

  hasSocialSecurityBenefits() {
    return this.getTotalSocialSecurity() > 0;
  }

  hasPensionBenefits() {
    return this.getTotalPension() > 0;
  }

  hasAnyBenefits() {
    return this.getTotalBenefits() > 0;
  }

  getMySocialSecurity() {
    return this.ssAnnual;
  }

  getMyPension() {
    return this.penAnnual;
  }

  getSpouseSocialSecurity() {
    return this.spouseSsAnnual;
  }

  getSpousePension() {
    return this.spousePenAnnual;
  }

  getMyTotalBenefits() {
    return this.ssAnnual + this.penAnnual;
  }

  getSpouseTotalBenefits() {
    return this.spouseSsAnnual + this.spousePenAnnual;
  }

  getBenefitBreakdown() {
    return {
      mySocialSecurity: this.ssAnnual,
      myPension: this.penAnnual,
      spouseSocialSecurity: this.spouseSsAnnual,
      spousePension: this.spousePenAnnual,
      totalSocialSecurity: this.getTotalSocialSecurity(),
      totalPension: this.getTotalPension(),
      totalBenefits: this.getTotalBenefits(),
    };
  }

  // Method to update specific benefits
  updateMySocialSecurity(amount) {
    this.ssAnnual = amount;
  }

  updateMyPension(amount) {
    this.penAnnual = amount;
  }

  updateSpouseSocialSecurity(amount) {
    this.spouseSsAnnual = amount;
  }

  updateSpousePension(amount) {
    this.spousePenAnnual = amount;
  }

  // Method to apply inflation adjustment to all benefits
  applyInflationAdjustment(inflationRate, years) {
    const adjustmentFactor = Math.pow(1 + inflationRate, years);

    this.ssAnnual = (this.ssAnnual * adjustmentFactor).asCurrency();
    this.penAnnual = (this.penAnnual * adjustmentFactor).asCurrency();
    this.spouseSsAnnual = (this.spouseSsAnnual * adjustmentFactor).asCurrency();
    this.spousePenAnnual = (
      this.spousePenAnnual * adjustmentFactor
    ).asCurrency();
  }
}

// Create instance using the factory method for backward compatibility
const benefitAmounts = BenefitAmounts.fromIndexedAmounts(
  ssYearlyIndexed,
  penYearlyIndexed,
  spouseSsYearlyIndexed,
  spousePenYearlyIndexed
);
