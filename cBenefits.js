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

  get subjectHasSocialSecurityBenefits() {
    return this.getTotalSocialSecurity() > 0;
  }

  get subjectHasPensionBenefits() {
    return this.getTotalPension() > 0;
  }

  hasAnyBenefits() {
    return this.getTotalBenefits() > 0;
  }

  get subjectSocialSecurity() {
    return this.ssAnnual;
  }

  get subjectPension() {
    return this.penAnnual;
  }

  get partnerSocialSecurity() {
    return this.spouseSsAnnual;
  }

  get partnerPension() {
    return this.spousePenAnnual;
  }

  get subjectTotalBenefits() {
    return this.ssAnnual + this.penAnnual;
  }

  get partnerTotalBenefits() {
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
  /**
   * @param {number} amount
   */
  updateSubjectSocialSecurity(amount) {
    this.ssAnnual = amount;
  }

  /**
   * @param {number} amount
   */
  updateSubjectPension(amount) {
    this.penAnnual = amount;
  }

  /**
   * @param {number} amount
   */
  updatePartnerSocialSecurity(amount) {
    this.spouseSsAnnual = amount;
  }

  /**
   * @param {number} amount
   */
  updatePartnerPension(amount) {
    this.spousePenAnnual = amount;
  }

  // Method to apply inflation adjustment to all benefits
  /**
   * @param {number} inflationRate
   * @param {number} years
   */
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

// // Create instance using the factory method for backward compatibility
// const benefitAmounts = BenefitAmounts.fromIndexedAmounts(
//   ssYearlyIndexed,
//   penYearlyIndexed,
//   spouseSsYearlyIndexed,
//   spousePenYearlyIndexed
// );
