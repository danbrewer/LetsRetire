class IncomeBreakdown {
  /** @type {SsCalculationDetails | null} */
  #ssCalculationDetails;
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
   * @param {SsCalculationDetails | null} ssCalculationDetails
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   *
   */
  constructor(
    fixedIncomeStreams,
    variableIncomeStream,
    ssCalculationDetails,
    demographics,
    fiscalData
  ) {
    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#variableIncomeStream = variableIncomeStream;
    this.#standardDeduction = TaxCalculations.getStandardDeduction(
      fiscalData,
      demographics
    );
    this.#ssCalculationDetails = ssCalculationDetails;
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
  }

  get interestEarnedOnSavings() {
    return this.#fixedIncomeStreams.interestEarnedOnSavings.asCurrency();
  }

  get trad401kWithdrawal() {
    return this.#variableIncomeStream.asCurrency();
  }

  get socialSecurity() {
    return this.#ssCalculationDetails?.totalSsBenefits.asCurrency() ?? 0;
  }

  get pension() {
    return this.#fixedIncomeStreams.pensionIncome.asCurrency();
  }

  get rmd() {
    return this.#fixedIncomeStreams.rmd.asCurrency();
  }

  get miscTaxableIncome() {
    return this.#fixedIncomeStreams.miscTaxableIncome.asCurrency();
  }

  get totalIncome() {
    return this.#totalIncome.asCurrency();
  }

  get nonTaxableIncome() {
    return this.#ssCalculationDetails?.nonTaxableAmount.asCurrency() ?? 0;
  }

  get grossIncome() {
    return (
      this.#fixedIncomeStreams.interestEarnedOnSavings +
      this.pension +
      this.rmd +
      this.miscTaxableIncome +
      this.trad401kWithdrawal +
      (this.#ssCalculationDetails?.taxableAmount ?? 0)
    ).asCurrency();
  }

  get adjustedGrossIncome() {
    return this.grossIncome
      .asCurrency() // + other adjustments if any
      .asCurrency();
  }

  get #totalIncomeStreamGross() {
    return (
      this.pension +
      this.rmd +
      this.miscTaxableIncome +
      this.trad401kWithdrawal +
      this.#fixedIncomeStreams.mySs +
      this.#fixedIncomeStreams.spouseSs +
      this.#fixedIncomeStreams.interestEarnedOnSavings
    ).asCurrency();
  }

  get #totalIncome() {
    return (
      this.#fixedIncomeStreams.interestEarnedOnSavings +
      this.pension +
      this.rmd +
      this.miscTaxableIncome +
      this.trad401kWithdrawal +
      (this.#ssCalculationDetails?.totalSsBenefits ?? 0)
    ).asCurrency();
  }

  // get adjustedGrossIncome() {
  //   return (
  //     this.#fixedIncomeStreams.interestEarnedOnSavings +
  //     this.pension +
  //     this.rmd +
  //     this.miscTaxableIncome +
  //     this.trad401kWithdrawal +
  //     this.#ssCalculationDetails.taxableAmount
  //   ).asCurrency();
  // }

  get standardDeduction() {
    return this.#standardDeduction;
  }

  get taxableIncome() {
    return Math.max(0, this.grossIncome - this.standardDeduction);
  }

  get federalIncomeTax() {
    return TaxCalculations.determineFederalIncomeTax(
      this.#totalIncome,
      this.taxableIncome,
      this.#fiscalData,
      this.#demographics
    ).asCurrency();
  }

  // getNetIncomeMinusReportedEarnedInterest() {
  //   return (
  //     this.#grossIncome -
  //     this.federalIncomeTax -
  //     this.#fixedIncomeStreams.interestEarnedOnSavings
  //   ).asCurrency();
  // }

  get netIncome() {
    return (this.#totalIncome - this.federalIncomeTax).asCurrency();
  }

  get effectiveTaxRate() {
    if (this.grossIncome === 0) return 0;
    return (this.federalIncomeTax / this.grossIncome).round(3);
  }

  grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount = 0) {
    if (this.#totalIncomeStreamGross === 0) return 0;
    return amount / this.#totalIncomeStreamGross;
  }

  grossIncomeAmountAsPercentageOfNetIncome(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
      this.netIncome
    ) // this.getNetIncomeMinusReportedEarnedInterest()
      .asCurrency();
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
    return this.grossIncomeAmountAsPercentageOfNetIncome(this.pension);
  }

  get socialSecurityNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.#ssCalculationDetails?.totalSsBenefits ?? 0
    ).asCurrency();
  }

  get otherTaxableNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.miscTaxableIncome
    );
  }

  get otherNonTaxableNetIncome() {
    return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
  }

  get earnedInterestNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.#fixedIncomeStreams.interestEarnedOnSavings
    );
  }

  // Private utility methods for income breakdown analysis
  #getTotalPensionIncome() {
    return this.pension;
  }

  #getTotalRetirementIncome() {
    return this.rmd + this.trad401kWithdrawal;
  }

  getIncomeSourceBreakdown() {
    return {
      pension: this.#getTotalPensionIncome(),
      socialSecurity: this.#ssCalculationDetails?.totalSsBenefits ?? 0, // Total SS income for breakdown
      socialSecurityTaxable: this.#ssCalculationDetails?.taxableAmount ?? 0, // Just the taxable portion
      retirement: this.#getTotalRetirementIncome(),
      earnedInterest: this.#fixedIncomeStreams.interestEarnedOnSavings,
      otherTaxable: this.miscTaxableIncome,
    };
  }

  get hasPositiveTaxableIncome() {
    return this.taxableIncome > 0;
  }

  get netToGrossIncomeRatio() {
    return this.totalIncome > 0 ? this.netIncome / this.totalIncome : 0;
  }

  get ssCalculationDetails() {
    return this.#ssCalculationDetails;
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {IncomeStreams} fixedIncomeStreams
   * @param {number} variableIncomeStream
   * @param {SsCalculationDetails | null} ssCalculationDetails
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   **/
  //   @param {{ rate: number; upTo: number; }[]} taxBrackets

  static CreateFrom(
    fixedIncomeStreams,
    variableIncomeStream,
    ssCalculationDetails,
    demographics,
    fiscalData
  ) {
    return new IncomeBreakdown(
      fixedIncomeStreams,
      variableIncomeStream,
      ssCalculationDetails,
      demographics,
      fiscalData
    );
  }
}
