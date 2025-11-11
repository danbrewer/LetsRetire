class IncomeBreakdown {
  /**
   * @param {number} myPension
   * @param {number} spousePension
   * @param {number} rmd
   * @param {number} otherTaxableIncomeAdjustments
   * @param {number} trad401kWithdrawal
   * @param {number} taxableSsIncome
   * @param {number} socialSecurityIncome
   * @param {number} reportedEarnedInterest
   * @param {number} actualEarnedInterest
   * @param {number} standardDeduction
   *
   */
  constructor(
    myPension,
    spousePension,
    rmd,
    otherTaxableIncomeAdjustments,
    trad401kWithdrawal,
    taxableSsIncome,
    socialSecurityIncome,
    reportedEarnedInterest,
    actualEarnedInterest,
    standardDeduction
  ) {
    this.subjectPension = myPension;
    this.partnerPension = spousePension;
    this.rmd = rmd;
    this.otherTaxableIncomeAdjustments = otherTaxableIncomeAdjustments;
    this.trad401kWithdrawal = trad401kWithdrawal;
    this.taxableSsIncome = taxableSsIncome;
    this.socialSecurityIncome = socialSecurityIncome;
    this.reportedEarnedInterest = reportedEarnedInterest;
    this.standardDeduction = standardDeduction;
    this.actualEarnedInterest = actualEarnedInterest;
    this.federalIncomeTax = 0;
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {number} variableIncomeStream
   * @param {SsBenefitsCalculator} ssBenefits
   * @param {number} standardDeduction
   **/
  //   @param {{ rate: number; upTo: number; }[]} taxBrackets

  static CreateFrom(
    fixedIncomeStreams,
    variableIncomeStream,
    ssBenefits,
    standardDeduction
  ) {
    return new IncomeBreakdown(
      fixedIncomeStreams.myPension,
      fixedIncomeStreams.spousePension,
      fixedIncomeStreams.rmd,
      fixedIncomeStreams.otherTaxableIncomeAdjustments,
      variableIncomeStream,
      ssBenefits.taxablePortion,
      fixedIncomeStreams.ssIncome, // Total SS income (both taxable and non-taxable)
      fixedIncomeStreams.reportedEarnedInterest,
      0,
      standardDeduction
    );
  }

  get totalReportedIncome() {
    return (
      this.reportedEarnedInterest +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.otherTaxableIncomeAdjustments +
      this.trad401kWithdrawal +
      this.socialSecurityIncome
    ).asCurrency();
  }

  get totalActualIncome() {
    return (
      this.actualEarnedInterest +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.otherTaxableIncomeAdjustments +
      this.trad401kWithdrawal +
      this.socialSecurityIncome
    ).asCurrency();
  }

  get adjustedGrossIncome() {
    return (
      this.reportedEarnedInterest +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.otherTaxableIncomeAdjustments +
      this.trad401kWithdrawal +
      this.taxableSsIncome
    );
  }

  get taxableIncome() {
    return Math.max(0, this.adjustedGrossIncome - this.standardDeduction);
  }

  get netIncome() {
    return (
      this.totalReportedIncome -
      this.federalIncomeTax -
      this.reportedEarnedInterest +
      this.actualEarnedInterest
    ).asCurrency();
  }

  get effectiveTaxRate() {
    if (this.totalReportedIncome === 0) return 0;
    return (this.federalIncomeTax / this.totalReportedIncome).round(3);
  }

  grossIncomeAmountAsPercentageOfTotalReportedIncome(amount = 0) {
    if (this.totalReportedIncome === 0) return 0;
    return amount / this.totalReportedIncome;
  }

  grossIncomeAmountAsPercentageOfNetIncome(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalReportedIncome(amount) *
      this.netIncome
    ).asCurrency();
  }

  grossIncomeAmountAsPercentageOfFederalIncomeTax(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalReportedIncome(amount) *
      this.federalIncomeTax
    ).asCurrency();
  }

  get trad401kNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.trad401kWithdrawal
    );
  }

  get rmdNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(this.rmd);
  }

  get pensionNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.subjectPension + this.partnerPension
    );
  }

  get socialSecurityNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.socialSecurityIncome
    );
  }

  get otherTaxableNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.otherTaxableIncomeAdjustments
    );
  }

  get earnedInterestNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.reportedEarnedInterest
    );
  }

  // Private utility methods for income breakdown analysis
  #getTotalPensionIncome() {
    return this.subjectPension + this.partnerPension;
  }

  #getTotalRetirementIncome() {
    return this.rmd + this.trad401kWithdrawal;
  }

  getIncomeSourceBreakdown() {
    return {
      pension: this.#getTotalPensionIncome(),
      socialSecurity: this.socialSecurityIncome, // Total SS income for breakdown
      socialSecurityTaxable: this.taxableSsIncome, // Just the taxable portion
      retirement: this.#getTotalRetirementIncome(),
      earnedInterest: this.reportedEarnedInterest,
      otherTaxable: this.otherTaxableIncomeAdjustments,
    };
  }

  get hasPositiveTaxableIncome() {
    return this.taxableIncome > 0;
  }

  get afterTaxIncomeRatio() {
    const total = this.totalReportedIncome;
    return total > 0 ? this.netIncome / total : 0;
  }

  static Empty() {
    return new IncomeBreakdown(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
}
