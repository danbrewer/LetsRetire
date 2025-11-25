/**
 * Represents comprehensive working year calculation data including income, contributions,
 * withdrawals, account balances, and tax information.
 *
 * This class encapsulates all financial data for a working year in pre-retirement planning,
 * providing structured access to demographic information, fiscal parameters, income sources,
 * retirement account contributions, and detailed breakdowns for analysis and reporting.
 *
 * @class WorkingYearData
 * @since 1.0.0
 */
class WorkingYearData {
  /**
   * Creates a new WorkingYearData instance with comprehensive working year financial data.
   *
   * @param {string} [description=""] - Descriptive label for this working year data
   * @param {Demographics} [demographics={}] - Demographic information including age,
   *   filing status, and spouse information
   * @param {FiscalData} [fiscalData={}] - Fiscal parameters including tax year,
   *   inflation rates, and spending amounts
   * @param {Object} [totals={}] - Summary totals for income, contributions, and balances
   * @param {Contributions | undefined} [contributions={}] - Retirement account contribution amounts
   * @param {Withdrawals} [withdrawals={}] - Account withdrawal amounts (typically minimal during working years)
   * @param {Balances} [balances={}] - Current account balances across all retirement accounts
   * @param {Object} [pen={}] - Pension-related information and calculations
   * @param {Object} [ss={}] - Social Security information and projections
   * @param {Object} [savings={}] - Savings account data and calculations
   * @param {Object} [retirementAccount={}] - Traditional 401k/IRA account data
   * @param {Object} [roth={}] - Roth IRA account data and calculations
   * @param {WorkingYearIncome} [income={}] - Income breakdown from all sources
   * @param {Taxes} [taxes={}] - Tax calculations and effective rates
   * @param {Object} [pensionBreakdown={}] - Detailed pension analysis
   * @param {Object} [spousePensionBreakdown={}] - Spouse pension analysis (if applicable)
   * @param {Object} [savingsBreakdown={}] - Detailed savings account breakdown
   * @param {Object} [ssBreakdown={}] - Social Security calculation breakdown
   * @param {Object} [spouseSsBreakdown={}] - Spouse Social Security breakdown (if applicable)
   * @param {AccountYear} [accountYear=new AccountYear()] - View of accounts for fiscal year
   */
  constructor(
    description = "",
    demographics,
    fiscalData,
    totals = {},
    contributions,
    withdrawals,
    balances,
    pen = {},
    ss = {},
    savings = {},
    retirementAccount = {},
    roth = {},
    income,
    taxes,
    pensionBreakdown = {},
    spousePensionBreakdown = {},
    savingsBreakdown = {},
    ssBreakdown = {},
    spouseSsBreakdown = {},
    accountYear
  ) {
    this._description = description;
    this.demographics = demographics;
    this.fiscalData = fiscalData;
    this.totals = totals;
    this.contributions = contributions;
    this.withdrawals = withdrawals;
    this.balances = balances;
    this.pen = pen;
    this.ss = ss;
    this.savings = savings;
    this.retirementAccount = retirementAccount;
    this.roth = roth;
    this.income = income;
    this.taxes = taxes;
    this.pensionBreakdown = pensionBreakdown;
    this.spousePensionBreakdown = spousePensionBreakdown;
    this.savingsBreakdown = savingsBreakdown;
    this.ssBreakdown = ssBreakdown;
    this.spouseSsBreakdown = spouseSsBreakdown;
    // this.employmentInfo = EmploymentInfo.Empty();
    this.accountYear = accountYear;
  }

  //   /**
  //    * Gets the descriptive label for this working year data.
  //    *
  //    * @returns {string} Description of the working year data
  //    */
  //   get description() {
  //     return this._description;
  //   }

  /**
   * Sets a new description for this working year data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Gets the current age from demographics if available.
   *
   * @returns {number|null} Current age, or null if demographics unavailable
   */
  getCurrentAge() {
    return this.demographics && this.demographics.age
      ? this.demographics.age
      : null;
  }

  /**
   * Gets the total retirement account balance if available.
   *
   * @returns {number} Total balance across all retirement accounts, or 0 if unavailable
   */
  getTotalRetirementBalance() {
    if (!this.balances || typeof this.balances.allBalances !== "function") {
      return 0;
    }
    return this.balances.allBalances;
  }

  //   /**
  //    * Gets the total annual contributions if available.
  //    *
  //    * @returns {number} Total contributions for the year, or 0 if unavailable
  //    */
  //   getTotalContributions() {
  //     if (!this.contributions || typeof this.contributions.total !== "function") {
  //       return 0;
  //     }
  //     return this.contributions.total();
  //   }

  //   /**
  //    * Gets the net income for the year if available.
  //    *
  //    * @returns {number} Net income after taxes, or 0 if unavailable
  //    */
  //   getNetIncome() {
  //     if (!this.income || typeof this.income.netIncome === "undefined") {
  //       return 0;
  //     }
  //     return typeof this.income.netIncome === "function"
  //       ? this.income.netIncome()
  //       : this.income.netIncome;
  //   }

  //   /**
  //    * Gets the effective tax rate if available.
  //    *
  //    * @returns {number} Effective tax rate as decimal, or 0 if unavailable
  //    */
  //   getEffectiveTaxRate() {
  //     if (!this.taxes || typeof this.taxes.effectiveTaxRate === "undefined") {
  //       return 0;
  //     }
  //     return typeof this.taxes.effectiveTaxRate === "function"
  //       ? this.taxes.effectiveTaxRate()
  //       : this.taxes.effectiveTaxRate;
  //   }

  /**
   * Checks if this working year has spouse-related data.
   *
   * @returns {boolean} True if spouse data is present
   */
  hasSpouseData() {
    const hasSpouseDemo = this.demographics && this.demographics.hasSpouse;
    const hasSpousePension =
      this.spousePensionBreakdown &&
      Object.keys(this.spousePensionBreakdown).length > 0;
    const hasSpouseSs =
      this.spouseSsBreakdown && Object.keys(this.spouseSsBreakdown).length > 0;

    return hasSpouseDemo || hasSpousePension || hasSpouseSs;
  }

  /**
   * Creates a summary object with key working year metrics.
   *
   * @returns {Object} Summary containing:
   *   - age: Current age
   *   - netIncome: Net income after taxes
   *   - totalContributions: Total retirement contributions
   *   - totalBalance: Total retirement account balance
   *   - effectiveTaxRate: Effective tax rate
   *   - hasSpouse: Whether spouse data is present
   *   - taxYear: Current tax year from fiscal data
   */
  // getSummary() {
  //   return {
  //     age: this.getCurrentAge(),
  //     netIncome: this.income?.netIncome,
  //     //   totalContributions: this.getTotalContributions(),
  //     totalBalance: this.getTotalRetirementBalance(),
  //     effectiveTaxRate: this.taxes?.effectiveTaxRate,
  //     hasSpouse: this.hasSpouseData(),
  //     taxYear:
  //       this.fiscalData && this.fiscalData.taxYear
  //         ? this.fiscalData.taxYear
  //         : null,
  //   };
  // }

  // /**
  //  * Updates demographic information for multi-year calculations.
  //  *
  //  * @param {Demographics} newDemographics - Updated demographic data
  //  */
  // updateDemographics(newDemographics) {
  //   this.demographics = newDemographics;
  //   if (newDemographics && newDemographics.age) {
  //     this._description = `Working Year - Age ${newDemographics.age}`;
  //   }
  // }

  /**
   * Factory method to create a WorkingYearData instance with empty structure.
   *
   * This method provides a convenient way to construct WorkingYearData objects
   * with all properties initialized to empty objects, ready to be populated
   * during working year calculations.
   *
   * @param {string} [description=""] - Optional description for the working year
   *
   * @returns {WorkingYearData} A new WorkingYearData instance with empty structure
   *
   * @example
   * // Create empty working year data structure
   * const workingYear = WorkingYearData.CreateEmpty("Working Year 1");
   * workingYear.demographics = Demographics.CreateUsing(inputs, false, true);
   * workingYear.fiscalData = FiscalData.CreateUsing(inputs);
   *
   * @static
   * @since 1.0.0
   */
  static CreateEmpty(description = "") {
    return new WorkingYearData(description);
  }

  //   /**
  //    * Factory method to create a WorkingYearData instance from comprehensive calculation data.
  //    *
  //    * @param {Object} calculationData - Object containing all working year calculation results
  //    * @param {string} [description=""] - Optional description for the working year
  //    *
  //    * @returns {WorkingYearData} A fully populated WorkingYearData instance
  //    *
  //    * @example
  //    * // Create from calculation results
  //    * const calculationResults = {
  //    *   demographics: Demographics.CreateUsing(inputs, false, true),
  //    *   fiscalData: FiscalData.CreateUsing(inputs),
  //    *   income: { netIncome: 85000, grossIncome: 100000 },
  //    *   contributions: { total: () => 15000 },
  //    *   balances: { total: () => 350000 }
  //    * };
  //    *
  //    * const workingYear = WorkingYearData.CreateUsing(calculationResults, "Working Year 5");
  //    * console.log(workingYear.getSummary());
  //    *
  //    * @static
  //    * @since 1.0.0
  //    */
  //   static CreateUsing(calculationData, description = "") {
  //     const {
  //       demographics = {},
  //       fiscalData = {},
  //       totals = {},
  //       contributions = {},
  //       withdrawals = {},
  //       balances = {},
  //       pen = {},
  //       ss = {},
  //       savings = {},
  //       retirementAccount = {},
  //       roth = {},
  //       income = {},
  //       taxes = {},
  //       pensionBreakdown = {},
  //       spousePensionBreakdown = {},
  //       savingsBreakdown = {},
  //       ssBreakdown = {},
  //       spouseSsBreakdown = {},
  //     } = calculationData;

  //     return new WorkingYearData(
  //       description,
  //       demographics,
  //       fiscalData,
  //       totals,
  //       contributions,
  //       withdrawals,
  //       balances,
  //       pen,
  //       ss,
  //       savings,
  //       retirementAccount,
  //       roth,
  //       income,
  //       taxes,
  //       pensionBreakdown,
  //       spousePensionBreakdown,
  //       savingsBreakdown,
  //       ssBreakdown,
  //       spouseSsBreakdown
  //     );
  //   }
}

// Maintain backward compatibility with the original object structure
// const result = WorkingYearData.CreateEmpty();
