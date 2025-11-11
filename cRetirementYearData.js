class RetirementYearData {
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Income} revenue - Revenue data
   * @param {Income} grossIncome - Gross income data
   * @param {Expenditures} expenditures - Expenditure data
   * @param {Object} contributions - Contribution data
   * @param {Object} withdrawals - Withdrawal data
   * @param {Balances} balances - Balances data
   * @param {Object} pension - Pension data
   * @param {Object} savings - Savings account data
   * @param {SocialSecurityIncome} ss - Social Security data
   * @param {IncomeStreams} fixedIncomeStreams - Instance of IncomeStreams class
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
    revenue,
    grossIncome,
    expenditures,
    contributions = {},
    withdrawals = {},
    balances,
    pension = {},
    savings = {},
    ss,
    fixedIncomeStreams,
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

    /** @type {Income} */
    this.revenue = revenue;

    /** @type {Income} */
    this.grossIncome = grossIncome;

    /** @type {Object} */
    this.expenditures = expenditures;

    /** @type {Object} */
    this.contributions = contributions;

    /** @type {Object} */
    this.withdrawals = withdrawals;

    /** @type {Balances} */
    this.balances = balances;

    /** @type {Object} */
    this.pen = pension;

    /** @type {Object} */
    this.savings = savings;

    /** @type {SocialSecurityIncome} */
    this.ss = ss;

    /** @type {IncomeStreams} */
    this.fixedIncomeStreams = fixedIncomeStreams;

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

    this.shortfallAmount = 0;
  }

  // Factory method for backward compatibility
  static Empty() {
    return new RetirementYearData(
      Demographics.Empty(),
      FiscalData.Empty(),
      Income.Empty(),
      Income.Empty(),
      Expenditures.Empty(),
      {},
      {},
      Balances.Empty(),
      {},
      {},
      SocialSecurityIncome.Empty(),
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
   * @param {{
   * demographics: Demographics;
   * fiscalData: FiscalData;
   * revenue: Income;
   * grossIncome: Income;
   * expenditures: Expenditures;
   * contributions: Object | undefined;
   * withdrawals: Object | undefined;
   * balances: Balances;
   * disbursements: Disbursements;
   * pen: Object | undefined;
   * savings: Object | undefined;
   * ss: SocialSecurityIncome;
   * incomeStreams: IncomeStreams;
   * incomeBreakdown: IncomeBreakdown;
   * taxes: Taxes;
   * totals: Object | undefined;
   * myPensionBenefits: Object | undefined;
   * spousePensionBenefits: Object | undefined;
   * mySsBenefits: Object | undefined;
   * spouseSsBenefits: Object | undefined;
   * savingsBreakdown: Object | undefined;
   * withdrawalBreakdown: Object | undefined;
   * ssBreakdown: SsBenefitsCalculator; pensionBreakdown: Object | undefined; }} data
   */
  static fromData(data) {
    return new RetirementYearData(
      data.demographics,
      data.fiscalData,
      data.revenue,
      data.grossIncome,
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
      this.fixedIncomeStreams &&
      typeof this.fixedIncomeStreams.totalIncome === "function"
    ) {
      return this.fixedIncomeStreams.totalIncome();
    }
    return 0;
  }

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
