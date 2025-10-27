class IncomeStreams {
  /**
   * @param {number} myPension
   * @param {any} reportedEarnedInterest
   * @param {number} spousePension
   * @param {number} mySs
   * @param {number} spouseSs
   * @param {number} rmd
   * @param {any} taxableIncomeAdjustment
   * @param {any} taxFreeIncomeAdjustment
   * @param {any} otherTaxableIncomeAdjustments
   */
  constructor(
    myPension,
    reportedEarnedInterest,
    spousePension,
    mySs,
    spouseSs,
    rmd,
    taxableIncomeAdjustment,
    taxFreeIncomeAdjustment,
    otherTaxableIncomeAdjustments
  ) {
    this._description = "IncomeStreams";
    this.myPension = myPension;
    this.reportedEarnedInterest = reportedEarnedInterest;
    this.spousePension = spousePension;
    this.mySs = mySs;
    this.spouseSs = spouseSs;
    this.rmd = rmd;
    this.taxableIncomeAdjustment = taxableIncomeAdjustment;
    this.taxFreeIncomeAdjustment = taxFreeIncomeAdjustment;
    this.otherTaxableIncomeAdjustments = otherTaxableIncomeAdjustments;
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {BenefitAmounts} benefitAmounts - Benefit amounts object containing pension and SS amounts
   * @param {AccountGroup} accounts - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   * @returns {IncomeStreams} New IncomeStreams instance
   */
  static CreateUsing(
    demographics,
    benefitAmounts,
    accounts,
    fiscalData,
    inputs
  ) {
    const myPension = demographics.eligibleForPension()
      ? benefitAmounts.penAnnual
      : 0;
    const reportedEarnedInterest = accounts.savings
      .calculateInterestForYear(
        INTEREST_CALCULATION_EPOCH.STARTING_BALANCE,
        fiscalData.taxYear
      )
      .asCurrency();
    const spousePension = 0;
    const mySs = demographics.eligibleForSs() ? benefitAmounts.ssAnnual : 0;
    const spouseSs = demographics.spouseEligibleForSs()
      ? benefitAmounts.spouseSsAnnual
      : 0;
    const rmd = common_calculateRMD(
      fiscalData.useRmd,
      demographics.age,
      accounts.trad401k.startingBalanceForYear(fiscalData.taxYear)
    );

    return new IncomeStreams(
      myPension,
      reportedEarnedInterest,
      spousePension,
      mySs,
      spouseSs,
      rmd,
      inputs.taxableIncomeAdjustment,
      inputs.taxFreeIncomeAdjustment,
      inputs.otherTaxableIncomeAdjustments
    );
  }

  totalIncome() {
    return (
      this.myPension +
      this.spousePension +
      this.reportedEarnedInterest +
      this.otherTaxableIncomeAdjustments +
      this.rmd +
      this.mySs +
      this.spouseSs +
      this.taxFreeIncomeAdjustment
    );
  }

  taxableIncome() {
    return (
      this.myPension +
      this.spousePension +
      this.reportedEarnedInterest +
      this.otherTaxableIncomeAdjustments +
      this.rmd +
      this.mySs +
      this.spouseSs
    );
  }

  ssIncome() {
    return this.mySs + this.spouseSs;
  }

  pensionIncome() {
    return this.myPension + this.spousePension;
  }

  nonSsIncome() {
    return (
      this.myPension +
      this.spousePension +
      this.reportedEarnedInterest +
      this.otherTaxableIncomeAdjustments +
      this.rmd
    );
  }

  // Utility methods for income stream management
  hasSocialSecurityIncome() {
    return this.ssIncome() > 0;
  }

  hasPensionIncome() {
    return this.pensionIncome() > 0;
  }

  hasRmdIncome() {
    return this.rmd > 0;
  }

  getIncomeBreakdown() {
    return {
      pension: this.pensionIncome(),
      socialSecurity: this.ssIncome(),
      rmd: this.rmd,
      earnedInterest: this.reportedEarnedInterest,
      taxableAdjustments:
        this.taxableIncomeAdjustment + this.otherTaxableIncomeAdjustments,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

// Create instance using the factory method for backward compatibility
// const incomeStreams = IncomeStreams.fromCalculatedValues(
//   demographics,
//   benefitAmounts,
//   accounts,
//   fiscalData,
//   inputs
// );
