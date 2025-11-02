class RetirementYearData {
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Object} expenditures - Expenditure data
   * @param {Object} contributions - Contribution data
   * @param {Object} withdrawals - Withdrawal data
   * @param {Balances} balances - Account balance data
   * @param {Object} pen - Pension data
   * @param {Object} savings - Savings account data
   * @param {Object} ss - Social Security data
   * @param {IncomeStreams} incomeStreams - Instance of IncomeStreams class
   * @param {IncomeBreakdown} incomeBreakdown - Instance of IncomeBreakdown class
   * @param {Taxes} taxes - Tax data
   * @param {Object} totals - Total calculations
   * @param {Object} myPensionBenefits - My pension benefit data
   * @param {Object} spousePensionBenefits - Spouse pension benefit data
   * @param {Object} mySsBenefits - My Social Security benefit data
   * @param {Object} spouseSsBenefits - Spouse Social Security benefit data
   * @param {Object} savingsBreakdown - Savings breakdown data
   * @param {Object} withdrawalBreakdown - Withdrawal breakdown data
   * @param {SsBenefitsCalculator} ssBreakdown - Instance of SsBenefits class
   * @param {Object} pensionBreakdown - Pension breakdown data
   * @param {AccountsManager} accountGroup - Instance of AccountGroup class
   */
  constructor(
    demographics,
    fiscalData,
    expenditures = {},
    contributions = {},
    withdrawals = {},
    balances,
    pen = {},
    savings = {},
    ss = {},
    incomeStreams,
    incomeBreakdown,
    taxes,
    totals = {},
    myPensionBenefits = {},
    spousePensionBenefits = {},
    mySsBenefits = {},
    spouseSsBenefits = {},
    savingsBreakdown = {},
    withdrawalBreakdown = {},
    ssBreakdown,
    pensionBreakdown = {},
    accountGroup
  ) {
    this._description = "Retirement Year Result Data";

    /** @type {Demographics} */
    this.demographics = demographics;

    /** @type {FiscalData} */
    this.fiscalData = fiscalData;

    /** @type {Object} */
    this.expenditures = expenditures;

    /** @type {Object} */
    this.contributions = contributions;

    /** @type {Object} */
    this.withdrawals = withdrawals;

    /** @type {Balances} */
    this.balances = balances;

    /** @type {Object} */
    this.pen = pen;

    /** @type {Object} */
    this.savings = savings;

    /** @type {Object} */
    this.ss = ss;

    /** @type {IncomeStreams} */
    this.incomeStreams = incomeStreams;

    /** @type {IncomeBreakdown} */
    this.incomeBreakdown = incomeBreakdown;

    /** @type {Taxes} */
    this.taxes = taxes;

    /** @type {Object} */
    this.totals = totals;

    /** @type {Object} */
    this.myPensionBenefits = myPensionBenefits;

    /** @type {Object} */
    this.spousePensionBenefits = spousePensionBenefits;

    /** @type {Object} */
    this.mySsBenefits = mySsBenefits;

    /** @type {Object} */
    this.spouseSsBenefits = spouseSsBenefits;

    /** @type {Object} */
    this.savingsBreakdown = savingsBreakdown;

    /** @type {Object} */
    this.withdrawalBreakdown = withdrawalBreakdown;

    /** @type {SsBenefitsCalculator} */
    this.ssBreakdown = ssBreakdown;

    /** @type {Object} */
    this.pensionBreakdown = pensionBreakdown;

    this.retirementAccountBreakdown = RetirementAccountBreakdown.Empty();
    this.rothAccountBreakdown = RetirementAccountBreakdown.Empty();
    this.accountGroup = accountGroup;
  }

  // Factory method for backward compatibility
  static Empty() {
    return new RetirementYearData(
      Demographics.Empty(),
      FiscalData.Empty(),
      {},
      {},
      {},
      Balances.Empty(),
      {},
      {},
      {},
      IncomeStreams.Empty(),
      IncomeBreakdown.Empty(),
      Taxes.Empty(),
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      SsBenefitsCalculator.Empty(),
      {},
      AccountsManager.Empty()
    );
  }

  // Factory method to create from existing data
  /**
   * @param {{ demographics: Demographics; fiscalData: FiscalData; expenditures: Object | undefined; contributions: Object | undefined; withdrawals: Object | undefined; balances: Balances; pen: Object | undefined; savings: Object | undefined; ss: Object | undefined; incomeStreams: IncomeStreams; incomeBreakdown: IncomeBreakdown; taxes: Taxes; totals: Object | undefined; myPensionBenefits: Object | undefined; spousePensionBenefits: Object | undefined; mySsBenefits: Object | undefined; spouseSsBenefits: Object | undefined; savingsBreakdown: Object | undefined; withdrawalBreakdown: Object | undefined; ssBreakdown: SsBenefitsCalculator; pensionBreakdown: Object | undefined; }} data
   */
  static fromData(data) {
    return new RetirementYearData(
      data.demographics,
      data.fiscalData,
      data.expenditures,
      data.contributions,
      data.withdrawals,
      data.balances,
      data.pen,
      data.savings,
      data.ss,
      data.incomeStreams,
      data.incomeBreakdown,
      data.taxes,
      data.totals,
      data.myPensionBenefits,
      data.spousePensionBenefits,
      data.mySsBenefits,
      data.spouseSsBenefits,
      data.savingsBreakdown,
      data.withdrawalBreakdown,
      data.ssBreakdown,
      data.pensionBreakdown,
      AccountsManager.Empty()
    );
  }

  // Utility methods for retirement year data analysis
  get totalIncome() {
    if (
      this.incomeStreams &&
      typeof this.incomeStreams.totalIncome === "function"
    ) {
      return this.incomeStreams.totalIncome();
    }
    return 0;
  }

  //   getTotalExpenses() {
  //     // this.acc
  //     // if (this.expenditures && typeof this.expenditures.total === "number") {
  //     //   return this.expenditures.total;
  //     // }
  //     // return 0;
  //   }

  get netIncome() {
    if (
      this.incomeBreakdown &&
      typeof this.incomeBreakdown.netIncome === "function"
    ) {
      return this.incomeBreakdown.netIncome;
    }
    return 0;
  }

  get totalTaxes() {
    return this.taxes.totalTaxes;
  }

  //   hasDeficit() {
  //     return this.getNetIncome() < this.getTotalExpenses();
  //   }

  //   getSurplusOrDeficit() {
  //     return this.getNetIncome() - this.getTotalExpenses();
  //   }

  get totalAccountBalances() {
    return this.balances.allBalances;
  }

  // Method to get a summary of the retirement year
  getYearSummary() {
    return {
      year: this.fiscalData?.taxYear || "Unknown",
      age: this.demographics?.age || "Unknown",
      totalIncome: this.totalIncome(),
      //   totalExpenses: this.getTotalExpenses(),
      netIncome: this.netIncome,
      totalTaxes: this.totalTaxes,
      //   surplusDeficit: this.getSurplusOrDeficit(),
      totalBalances: this.totalAccountBalances,
      //   hasDeficit: this.hasDeficit(),
    };
  }

  //   // Method to update specific sections
  //   /**
  //      * @param {PropertyKey} sectionName
  //      * @param {any} data
  //      */
  //   updateSection(sectionName, data) {
  //     if (this.hasOwnProperty(sectionName)) {
  //       this[sectionName] = data;
  //     }
  //   }

  //   // Method to validate data completeness
  //   isComplete() {
  //     const requiredSections = [
  //       "demographics",
  //       "fiscalData",
  //       "incomeStreams",
  //       "incomeBreakdown",
  //       "expenditures",
  //       "balances",
  //     ];

  //     return requiredSections.every(
  //       (section) => this[section] && Object.keys(this[section]).length > 0
  //     );
  //   }

  // Method to get breakdown by category
  getBreakdowns() {
    return {
      savings: this.savingsBreakdown,
      withdrawal: this.withdrawalBreakdown,
      socialSecurity: this.ssBreakdown,
      pension: this.pensionBreakdown,
    };
  }
}

// Create instance using the factory method for backward compatibility
const result = RetirementYearData.Empty();
