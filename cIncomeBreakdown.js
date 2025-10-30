class IncomeBreakdown {
  /**
   * @param {number} myPension
   * @param {number} spousePension
   * @param {number} rmd
   * @param {number} otherTaxableIncomeAdjustments
   * @param {number} retirementAccountWithdrawal
   * @param {number} taxableSsIncome
   * @param {number} socialSecurityIncome
   * @param {number} reportedEarnedInterest
   * @param {number} standardDeduction
   * @param {any} taxBrackets
   */
  constructor(
    myPension,
    spousePension,
    rmd,
    otherTaxableIncomeAdjustments,
    retirementAccountWithdrawal,
    taxableSsIncome,
    socialSecurityIncome,
    reportedEarnedInterest,
    standardDeduction,
    taxBrackets,
    federalIncomeTax = 0
  ) {
    this.myPension = myPension;
    this.spousePension = spousePension;
    this.rmd = rmd;
    this.otherTaxableIncomeAdjustments = otherTaxableIncomeAdjustments;
    this.retirementAccountWithdrawal = retirementAccountWithdrawal;
    this.taxableSsIncome = taxableSsIncome;
    this.socialSecurityIncome = socialSecurityIncome;
    this.reportedEarnedInterest = reportedEarnedInterest;
    this.standardDeduction = standardDeduction;
    this.federalIncomeTax = federalIncomeTax;
    this.taxBrackets = taxBrackets;
    this.actualEarnedInterest = 0;

    this.federalIncomeTax = 0;
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {IncomeStreams} incomeStreams
   * @param {number} variableIncomeFactor
   * @param {SsBenefitsCalculator} ssBreakdown
   * @param {number} standardDeduction
   * @param {{ rate: number; upTo: number; }[]} taxBrackets
   */
  static CreateFrom(
    incomeStreams,
    variableIncomeFactor,
    ssBreakdown,
    standardDeduction,
    taxBrackets
  ) {
    return new IncomeBreakdown(
      incomeStreams.myPension,
      incomeStreams.spousePension,
      incomeStreams.rmd,
      incomeStreams.otherTaxableIncomeAdjustments,
      variableIncomeFactor,
      ssBreakdown.taxablePortion,
      incomeStreams.ssIncome(), // Total SS income (both taxable and non-taxable)
      incomeStreams.reportedEarnedInterest,
      standardDeduction,
      taxBrackets,
      0 // federalIncomeTax starts at 0
    );
  }

  reportableIncome() {
    return (
      this.reportedEarnedInterest +
      this.myPension +
      this.spousePension +
      this.rmd +
      this.otherTaxableIncomeAdjustments +
      this.retirementAccountWithdrawal +
      this.socialSecurityIncome
    );
  }

  adjustedGrossIncome() {
    return (
      this.reportedEarnedInterest +
      this.myPension +
      this.spousePension +
      this.rmd +
      this.otherTaxableIncomeAdjustments +
      this.retirementAccountWithdrawal +
      this.taxableSsIncome
    );
  }

  taxableIncome() {
    return Math.max(0, this.adjustedGrossIncome() - this.standardDeduction);
  }

  netIncome() {
    return this.reportableIncome() - this.federalIncomeTax;
  }

  netIncomeLessReportedEarnedInterest() {
    return this.netIncome() - this.reportedEarnedInterest;
  }

  reportableIncomeLessReportedEarnedInterest() {
    return this.reportableIncome() - this.reportedEarnedInterest;
  }

  effectiveTaxRate() {
    if (this.reportableIncome() === 0) return 0;
    return (this.federalIncomeTax / this.reportableIncome()).round(3);
  }

  incomeAsPercentageOfGross(amount = 0) {
    if (this.reportableIncome() === 0) return 0;
    return amount / this.reportableIncome();
  }

  translateGrossAmountToNet(amount = 0) {
    return (
      this.incomeAsPercentageOfGross(amount) * this.netIncome()
    ).asCurrency();
  }

  translateGrossAmountToPortionOfFederalIncomeTax(amount = 0) {
    return (
      this.incomeAsPercentageOfGross(amount) * this.federalIncomeTax
    ).asCurrency();
  }

  // Private utility methods for income breakdown analysis
  #getTotalPensionIncome() {
    return this.myPension + this.spousePension;
  }

  #getTotalRetirementIncome() {
    return this.rmd + this.retirementAccountWithdrawal;
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

  /**
   * @param {any} newTaxAmount
   */
  updateFederalIncomeTax(newTaxAmount) {
    this.federalIncomeTax = newTaxAmount;
  }

  hasPositiveTaxableIncome() {
    return this.taxableIncome() > 0;
  }

  getAfterTaxIncomeRatio() {
    const reportable = this.reportableIncome();
    return reportable > 0 ? this.netIncome() / reportable : 0;
  }

  static Empty() {
    return new IncomeBreakdown(0, 0, 0, 0, 0, 0, 0, 0, 0, []);
  }
}

// Create instance using the factory method for backward compatibility
// const incomeBreakdown = IncomeBreakdown.CreateFrom(
//   incomeStreams,
//   variableIncomeFactor,
//   ssBreakdown,
//   standardDeduction
// );
