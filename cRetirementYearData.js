//  * @param {Expenditures} expenditures - Expenditure data
//  * @param {Object} contributions - Contribution data
//  * @param {Object} withdrawals - Withdrawal data
//   * @param {Object} withdrawalBreakdown - Withdrawal breakdown data
//  * @param {Object} pension - Pension data
//  * @param {Object} savings - Savings account data
//  * @param {SocialSecurityIncome} ss - Social Security data
//  * @param {IncomeStreams} fixedIncomeStreams - Instance of IncomeStreams class
//  * @param {IncomeBreakdown} incomeBreakdown - Instance of IncomeBreakdown class
//  * @param {Object} totals - Total calculations
//  * @param {Object} myPensionBenefits - My pension benefit data
//  * @param {Object} spousePensionBenefits - Spouse pension benefit data
//  * @param {Object} mySsBenefits - My Social Security benefit data
//  * @param {Object} spouseSsBenefits - Spouse Social Security benefit data
//  * @param {Object} savingsBreakdown - Savings breakdown data
//  * @param {SsBenefitsCalculator} ssBreakdown - Instance of SsBenefits class
//  * @param {Object} pensionBreakdown - Pension breakdown data
//  /**
//    * @param {Demographics} demographics - Instance of Demographics class
//    * @param {FiscalData} fiscalData - Instance of FiscalData class
//    * @param {Income} revenue - Revenue data
//    * @param {Income} grossIncome - Gross income data
//    * @param {Balances} balances - Balances data
//    * @param {SocialSecurityIncome} socialSecurityIncome - Social Security income data
//    * @param {Taxes} taxes - Tax data
//    * @param {AccountYear} accountYear - Instance of AccountGroup class
//    */
class RetirementYearData {
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {AccountYear} */
  #accountYear;

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountYear} accountYear
   */
  constructor(demographics, fiscalData, accountYear) {
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
    this.#accountYear = accountYear;

    this._description = `
-----------------------------------------------
--- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
-----------------------------------------------`;

    /** @type {Income} */
    this.revenue;

    /** @type {Income} */
    this.disbursements;

    // /** @type {Object} */
    // this.contributions = contributions;

    // /** @type {Object} */
    // this.withdrawals = withdrawals;

    /** @type {Balances} */
    this.balances;

    /** @type {SocialSecurityIncome} */
    this.socialSecurityIncome;

    // /** @type {Object} */
    // this.pen = pension;

    // /** @type {Object} */
    // this.savings = savings;

    // this.ss = ss;

    // this.fixedIncomeStreams = fixedIncomeStreams;

    // this.incomeBreakdown = incomeBreakdown;

    /** @type {Taxes} */
    this.taxes;

    // this.totals = totals;

    // this.myPensionBenefits = myPensionBenefits;

    // this.spousePensionBenefits = spousePensionBenefits;

    // this.mySsBenefits = mySsBenefits;

    // this.spouseSsBenefits = spouseSsBenefits;

    // this.savingsBreakdown = savingsBreakdown;

    // this.ssBreakdown = ssBreakdown;

    // this.pensionBreakdown = pensionBreakdown;

    // this.retirementAccountBreakdown = RetirementAccountBreakdown.Empty();
    // this.rothAccountBreakdown = RetirementAccountBreakdown.Empty();
    // // this.savingsBreakdown = savingsBreakdown;

    // this.ssBreakdown = ssBreakdown;

    // this.pensionBreakdown = pensionBreakdown;

    /** @type {Balance} */
    this.savings;

    /** @type {Balance} */
    this.trad401k;

    /** @type {Balance} */
    this.tradRoth;

    /** @type {RetirementAccountBreakdown} */
    this.retirementAccountBreakdown;
    /** @type {RetirementAccountBreakdown} */
    this.rothAccountBreakdown;

    /** @type {number} */
    this.shortfallAmount;

    /**
     * @type {any[]}
     */
    this.calculationDetails = [];
  }

  /**
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   * @param {AccountYear} accountYear
   */
  static CreateUsing(demographics, fiscalData, accountYear) {
    const result = new RetirementYearData(
      demographics,
      fiscalData,
      accountYear
    );
    return result;
  }

  // // Factory method to create from existing data
  // /**
  //  * @param {{
  //  * demographics: Demographics;
  //  * fiscalData: FiscalData;
  //  * revenue: Income;
  //  * grossIncome: Income;
  //  * expenditures: Expenditures;
  //  * contributions: Object | undefined;
  //  * withdrawals: Object | undefined;
  //  * balances: Balances;
  //  * disbursements: Disbursements;
  //  * pen: Object | undefined;
  //  * savings: Object | undefined;
  //  * ss: SocialSecurityIncome;
  //  * incomeStreams: IncomeStreams;
  //  * incomeBreakdown: IncomeBreakdown;
  //  * taxes: Taxes;
  //  * totals: Object | undefined;
  //  * myPensionBenefits: Object | undefined;
  //  * spousePensionBenefits: Object | undefined;
  //  * mySsBenefits: Object | undefined;
  //  * spouseSsBenefits: Object | undefined;
  //  * savingsBreakdown: Object | undefined;
  //  * withdrawalBreakdown: Object | undefined;
  //  * ssBreakdown: SsBenefitsCalculator;
  //  * pensionBreakdown: Object | undefined;
  //  * accountYear: AccountYear }} data
  //  */
  // static fromData(data) {
  //   return new RetirementYearData(
  //     data.demographics,
  //     data.fiscalData,
  //     data.revenue,
  //     data.grossIncome,
  //     data.expenditures,
  //     data.contributions,
  //     data.withdrawals,
  //     data.balances,
  //     data.pen,
  //     data.savings,
  //     data.ss,
  //     data.incomeStreams,
  //     data.incomeBreakdown,
  //     data.taxes,
  //     data.totals,
  //     data.myPensionBenefits,
  //     data.spousePensionBenefits,
  //     data.mySsBenefits,
  //     data.spouseSsBenefits,
  //     data.savingsBreakdown,
  //     data.withdrawalBreakdown,
  //     data.ssBreakdown,
  //     data.pensionBreakdown,
  //     data.accountYear
  //   );
  // }

  // // Method to get a summary of the retirement year
  // getYearSummary() {
  //   return {
  //     year: this.fiscalData?.taxYear || "Unknown",
  //     age: this.demographics?.age || "Unknown",
  //     // totalIncome: this.totalIncome(),
  //     //   totalExpenses: this.getTotalExpenses(),
  //     netIncome: this.netIncome,
  //     totalTaxes: this.totalTaxes,
  //     //   surplusDeficit: this.getSurplusOrDeficit(),
  //     totalBalances: this.totalAccountBalances,
  //     //   hasDeficit: this.hasDeficit(),
  //   };
  // }

  // Method to get breakdown by category
  getBreakdowns() {
    return {
      // savings: this.savingsBreakdown,
      // withdrawal: this.withdrawalBreakdown,
      // socialSecurity: this.ssBreakdown,
      // pension: this.pensionBreakdown,
    };
  }
}

// Create instance using the factory method for backward compatibility
// const result = RetirementYearData.Empty();
