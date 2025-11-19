class IncomeBreakdown {
  /** @type {SsBenefitsCalculator} */
  #ssBenefits;
  /** @type {number} */
  #standardDeduction = 0;
  /** @type {IncomeStreams} */
  #fixedIncomeStreams;
  /** @type {number} */
  #variableIncomeStream;
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;

  /**
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {number} variableIncomeStream
   * @param {SsBenefitsCalculator} ssBenefits
   * @param {number} standardDeduction
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   *
   */
  constructor(
    fixedIncomeStreams,
    variableIncomeStream,
    standardDeduction,
    ssBenefits,
    demographics,
    fiscalData
  ) {
    // this.subjectPension = myPension;
    // this.partnerPension = spousePension;
    // this.rmd = rmd;
    // this.otherTaxableIncomeAdjustments = otherTaxableIncomeAdjustments;
    // this.trad401kWithdrawal = trad401kWithdrawal;
    // this.federalIncomeTax = federalIncomeTax;
    // this.socialSecurityIncome = socialSecurityIncome;
    // this.interestEarnedOnSavings = interestEarnedOnSavings;
    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#variableIncomeStream = variableIncomeStream;
    this.#standardDeduction = standardDeduction;
    this.#ssBenefits = ssBenefits;
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
  }

  get subjectPension() {
    return this.#fixedIncomeStreams.myPension.asCurrency();
  }

  get partnerPension() {
    return this.#fixedIncomeStreams.spousePension.asCurrency();
  }

  get rmd() {
    return this.#fixedIncomeStreams.rmd.asCurrency();
  }

  get taxableIncomeAdjustment() {
    return this.#fixedIncomeStreams.taxableIncomeAdjustment.asCurrency();
  }

  get trad401kWithdrawal() {
    return this.#variableIncomeStream.asCurrency();
  }

  get socialSecurityIncome() {
    return (
      this.#ssBenefits.myBenefits + this.#ssBenefits.spouseBenefits
    ).asCurrency();
  }

  get federalIncomeTax() {
    return TaxCalculator.determineFederalIncomeTax(
      this.taxableIncome,
      this.#fiscalData,
      this.#demographics
    ).asCurrency();
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {number} variableIncomeStream
   * @param {SsBenefitsCalculator} ssBenefits
   * @param {number} standardDeduction
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   **/
  //   @param {{ rate: number; upTo: number; }[]} taxBrackets

  static CreateFrom(
    fixedIncomeStreams,
    variableIncomeStream,
    ssBenefits,
    standardDeduction,
    demographics,
    fiscalData
  ) {
    return new IncomeBreakdown(
      fixedIncomeStreams,
      variableIncomeStream,
      standardDeduction,
      ssBenefits,
      demographics,
      fiscalData
    );
  }

  get allTaxableRevenue() {
    return (
      this.#fixedIncomeStreams.interestEarnedOnSavings +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.taxableIncomeAdjustment +
      this.trad401kWithdrawal +
      this.#ssBenefits.spouseBenefits +
      this.#ssBenefits.myBenefits
    ).asCurrency();
  }

  get #totalIncomeStreamGross() {
    return (
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.taxableIncomeAdjustment +
      this.trad401kWithdrawal +
      this.#fixedIncomeStreams.mySs +
      this.#fixedIncomeStreams.spouseSs +
      this.#fixedIncomeStreams.interestEarnedOnSavings
    ).asCurrency();
  }

  get grossIncome() {
    return (
      this.#fixedIncomeStreams.interestEarnedOnSavings +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.taxableIncomeAdjustment +
      this.trad401kWithdrawal +
      this.#ssBenefits.myBenefits +
      this.#ssBenefits.spouseBenefits
    ).asCurrency();
  }

  get adjustedGrossIncome() {
    return (
      this.#fixedIncomeStreams.interestEarnedOnSavings +
      this.subjectPension +
      this.partnerPension +
      this.rmd +
      this.taxableIncomeAdjustment +
      this.trad401kWithdrawal +
      this.#ssBenefits.actualTaxablePortion
    ).asCurrency();
  }

  get standardDeduction() {
    return this.#standardDeduction;
  }

  get taxableIncome() {
    return Math.max(0, this.adjustedGrossIncome - this.standardDeduction);
  }

  getNetIncomeMinusReportedEarnedInterest() {
    return (
      this.allTaxableRevenue -
      this.federalIncomeTax -
      this.#fixedIncomeStreams.interestEarnedOnSavings
    ).asCurrency();
  }

  get netIncome() {
    return (this.allTaxableRevenue - this.federalIncomeTax).asCurrency();
  }

  get effectiveTaxRate() {
    if (this.allTaxableRevenue === 0) return 0;
    return (this.federalIncomeTax / this.allTaxableRevenue).round(3);
  }

  grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount = 0) {
    if (this.#totalIncomeStreamGross === 0) return 0;
    return amount / this.#totalIncomeStreamGross;
  }

  grossIncomeAmountAsPercentageOfNetIncome(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
      this.getNetIncomeMinusReportedEarnedInterest()
    ).asCurrency();
  }

  grossIncomeAmountAsPercentageOfFederalIncomeTax(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
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
      this.#ssBenefits.myBenefits + this.#ssBenefits.spouseBenefits
    );
  }

  get otherTaxableNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.taxableIncomeAdjustment
    );
  }

  get earnedInterestNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.#fixedIncomeStreams.interestEarnedOnSavings
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
      socialSecurity:
        this.#ssBenefits.spouseBenefits + this.#ssBenefits.myBenefits, // Total SS income for breakdown
      socialSecurityTaxable: this.#ssBenefits.actualTaxablePortion, // Just the taxable portion
      retirement: this.#getTotalRetirementIncome(),
      earnedInterest: this.#fixedIncomeStreams.interestEarnedOnSavings,
      otherTaxable: this.taxableIncomeAdjustment,
    };
  }

  get hasPositiveTaxableIncome() {
    return this.taxableIncome > 0;
  }

  get afterTaxIncomeRatio() {
    const total = this.allTaxableRevenue;
    return total > 0
      ? this.getNetIncomeMinusReportedEarnedInterest() / total
      : 0;
  }
}
