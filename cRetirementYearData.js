class RetirementYearData {
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Object} expenditures - Expenditure data
   * @param {Object} contributions - Contribution data
   * @param {Object} withdrawals - Withdrawal data
   * @param {Object} balances - Account balance data
   * @param {Object} pen - Pension data
   * @param {Object} savings - Savings account data
   * @param {Object} ss - Social Security data
   * @param {IncomeStreams} incomeStreams - Instance of IncomeStreams class
   * @param {IncomeBreakdown} incomeBreakdown - Instance of IncomeBreakdown class
   * @param {Object} taxes - Tax data
   * @param {Object} totals - Total calculations
   * @param {Object} myPensionBenefits - My pension benefit data
   * @param {Object} spousePensionBenefits - Spouse pension benefit data
   * @param {Object} mySsBenefits - My Social Security benefit data
   * @param {Object} spouseSsBenefits - Spouse Social Security benefit data
   * @param {Object} savingsBreakdown - Savings breakdown data
   * @param {Object} withdrawalBreakdown - Withdrawal breakdown data
   * @param {SsBenefits} ssBreakdown - Instance of SsBenefits class
   * @param {Object} pensionBreakdown - Pension breakdown data
   */
  constructor(
    demographics = {},
    fiscalData = {},
    expenditures = {},
    contributions = {},
    withdrawals = {},
    balances = {},
    pen = {},
    savings = {},
    ss = {},
    incomeStreams = {},
    incomeBreakdown = {},
    taxes = {},
    totals = {},
    myPensionBenefits = {},
    spousePensionBenefits = {},
    mySsBenefits = {},
    spouseSsBenefits = {},
    savingsBreakdown = {},
    withdrawalBreakdown = {},
    ssBreakdown = {},
    pensionBreakdown = {}
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

    /** @type {Object} */
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

    /** @type {Object} */
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

    /** @type {SsBenefits} */
    this.ssBreakdown = ssBreakdown;

    /** @type {Object} */
    this.pensionBreakdown = pensionBreakdown;
  }

  // Factory method for backward compatibility
  static createEmpty() {
    return new RetirementYearData();
  }

  // Factory method to create from existing data
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
      data.pensionBreakdown
    );
  }

  // Utility methods for retirement year data analysis
  getTotalIncome() {
    if (
      this.incomeStreams &&
      typeof this.incomeStreams.totalIncome === "function"
    ) {
      return this.incomeStreams.totalIncome();
    }
    return 0;
  }

  getTotalExpenses() {
    if (this.expenditures && typeof this.expenditures.total === "number") {
      return this.expenditures.total;
    }
    return 0;
  }

  getNetIncome() {
    if (
      this.incomeBreakdown &&
      typeof this.incomeBreakdown.netIncome === "function"
    ) {
      return this.incomeBreakdown.netIncome();
    }
    return 0;
  }

  getTotalTaxes() {
    if (this.taxes && typeof this.taxes.total === "number") {
      return this.taxes.total;
    }
    return 0;
  }

  hasDeficit() {
    return this.getNetIncome() < this.getTotalExpenses();
  }

  getSurplusOrDeficit() {
    return this.getNetIncome() - this.getTotalExpenses();
  }

  getTotalAccountBalances() {
    if (!this.balances || typeof this.balances !== "object") return 0;

    let total = 0;
    Object.values(this.balances).forEach((balance) => {
      if (typeof balance === "number") {
        total += balance;
      }
    });
    return total;
  }

  // Method to get a summary of the retirement year
  getYearSummary() {
    return {
      year: this.fiscalData?.taxYear || "Unknown",
      age: this.demographics?.age || "Unknown",
      totalIncome: this.getTotalIncome(),
      totalExpenses: this.getTotalExpenses(),
      netIncome: this.getNetIncome(),
      totalTaxes: this.getTotalTaxes(),
      surplusDeficit: this.getSurplusOrDeficit(),
      totalBalances: this.getTotalAccountBalances(),
      hasDeficit: this.hasDeficit(),
    };
  }

  // Method to update specific sections
  updateSection(sectionName, data) {
    if (this.hasOwnProperty(sectionName)) {
      this[sectionName] = data;
    }
  }

  // Method to validate data completeness
  isComplete() {
    const requiredSections = [
      "demographics",
      "fiscalData",
      "incomeStreams",
      "incomeBreakdown",
      "expenditures",
      "balances",
    ];

    return requiredSections.every(
      (section) => this[section] && Object.keys(this[section]).length > 0
    );
  }

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
const result = RetirementYearData.createEmpty();
