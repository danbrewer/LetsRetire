class IncomeStreams {
  /** @type {AccountingYear} */
  #accountYear;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Inputs} */
  #inputs;

  /** @type {Demographics} */
  #demographics;

  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   */

  constructor(demographics, accountYear, fiscalData, inputs) {
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#fiscalData = fiscalData;
    this.#inputs = inputs;

    this._description = "IncomeStreams";
  }

  get wagesAndCompensation() {
    return this.#inputs.wagesandOtherTaxableCompensation.asCurrency();
  }

  get myPension() {
    return this.#inputs.subjectPension.asCurrency();
  }

  get spousePension() {
    return this.#inputs.spousePension.asCurrency();
  }

  get mySs() {
    return this.#inputs.subjectSs.asCurrency();
  }

  get spouseSs() {
    return this.#inputs.spouseSs.asCurrency();
  }

  get rmd() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.TRAD_401K)
    );
  }

  get miscTaxableIncome() {
    return this.#inputs.taxableIncomeAdjustment.asCurrency();
  }

  get taxFreeIncomeAdjustment() {
    return this.#inputs.taxFreeIncomeAdjustment.asCurrency();
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   * @returns {IncomeStreams} New IncomeStreams instance
   */
  static CreateUsing(demographics, accountYear, fiscalData, inputs) {
    const rmd = Common.calculateRMD(
      fiscalData.useRmd,
      demographics.currentAge,
      accountYear.getStartingBalance(ACCOUNT_TYPES.TRAD_401K)
    );

    return new IncomeStreams(demographics, accountYear, fiscalData, inputs);
  }

  get interestEarnedOnSavings() {
    // return (
    //   this.#accountYear
    //     ?.calculateInterestForYear(
    //       ACCOUNT_TYPES.SAVINGS,
    //       INTEREST_CALCULATION_EPOCH.ROLLING_BALANCE
    //     )
    //     .asCurrency() ?? 0
    // );
    return (
      this.#accountYear
        ?.getDeposits(ACCOUNT_TYPES.SAVINGS, TRANSACTION_CATEGORY.INTEREST)
        .asCurrency() ?? 0
    );
  }

  get grossTaxableIncome() {
    return (
      this.wagesAndCompensation +
      this.myPension +
      this.spousePension +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.rmd +
      this.mySs +
      this.spouseSs +
      this.taxFreeIncomeAdjustment
    );
  }

  get taxableIncome() {
    return (
      this.wagesAndCompensation +
      this.myPension +
      this.spousePension +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.rmd +
      this.mySs +
      this.spouseSs
    );
  }

  get ssIncome() {
    return this.mySs + this.spouseSs;
  }

  get pensionIncome() {
    return this.myPension + this.spousePension;
  }

  get nonSsIncome() {
    return (
      this.myPension +
      this.spousePension +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.rmd
    );
  }

  // Utility methods for income stream management
  get hasSocialSecurityIncome() {
    return this.ssIncome > 0;
  }

  get hasPensionIncome() {
    return this.pensionIncome > 0;
  }

  get hasRmdIncome() {
    return this.rmd > 0;
  }

  get incomeBreakdown() {
    return {
      wagesAndCompensation: this.wagesAndCompensation,
      pension: this.pensionIncome,
      socialSecurity: this.ssIncome,
      rmd: this.rmd,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncome,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}
