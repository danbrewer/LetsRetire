/**
 * Represents comprehensive debug information for retirement calculation analysis.
 *
 * This class encapsulates all debug data including demographics, income breakdown,
 * tax calculations, deposits, withdrawals, and account states for a specific
 * calculation year. It provides structured access to all data points needed
 * for debugging and analysis of retirement planning calculations.
 *
 * @class DebugData
 * @since 1.0.0
 */
class DebugData {
  /**
   * Creates a new DebugData instance with comprehensive calculation data.
   *
   * @param {Demographics} demographics - Demographic information
   * @param {FiscalData} fiscalData - Fiscal information
   * @param {IncomeBreakdown} incomeBreakdown - Income breakdown data
   * @param {Taxes} taxes - Federal tax liability
   * @param {number} netIncome - Net income after taxes
   * @param {Deposits} deposits - Deposits object containing deposit data
   * @param {Withdrawals} withdrawals - Withdrawals object containing withdrawal data
   * @param {AccountsManager} [accounts] - Account group data
   * @param {string} [description="Debug Data"] - Descriptive label
   */
  constructor(
    demographics,
    fiscalData,
    incomeBreakdown,
    taxes,
    netIncome,
    deposits,
    withdrawals,
    accounts,
    description = "Debug Data"
  ) {
    this._demographics = demographics;
    this._description = description;
    this._fiscalData = fiscalData;
    this._incomeBreakdown = incomeBreakdown;
    this._taxes = taxes;
    this._netIncome = netIncome;
    this._deposits = deposits;
    this._withdrawals = withdrawals;
    this.accounts = accounts;
  }

  /**
   * Gets the descriptive label for this debug data.
   *
   * @returns {string} Description of the debug data
   */
  get description() {
    return this._description;
  }

  get spend() {
    return this._fiscalData.spend;
  }

  /**
   * Sets a new description for this debug data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  //   /**
  //    * Gets the total income from all sources.
  //    *
  //    * @returns {number} Total income amount
  //    */
  //   get totalIncome() {
  //     return this._incomeBreakdown.total || 0;
  //   }

  /**
   * Gets the total deposits across all accounts.
   *
   * @returns {number} Total deposit amount
   */
  get totalDeposits() {
    return this._deposits.total;
    // if (this.deposits && typeof this.deposits.total === "function") {
    //   return this.deposits.total;
    // }
    // return (
    //   (this.deposits.savings || 0) +
    //   (this.deposits.roth || 0) +
    //   (this.deposits.trad401k || 0)
    // );
  }

  /**
   * Gets the total withdrawals across all accounts.
   *
   * @returns {number} Total withdrawal amount
   */
  get totalWithdrawals() {
    return this._withdrawals.total;
  }

  /**
   * Calculates the net cash flow (deposits minus withdrawals).
   *
   * @returns {number} Net cash flow amount
   */
  get netCashFlow() {
    return this.totalDeposits - this.totalWithdrawals;
  }

  /**
   * Calculates the effective tax rate based on total income and federal taxes.
   *
   * @returns {number} Effective tax rate as decimal (e.g., 0.22 for 22%)
   */
  getEffectiveTaxRate() {
    const totalIncome = this._incomeBreakdown.totalIncome;
    if (totalIncome <= 0) return 0;
    return this._taxes.federalTaxesOwed / totalIncome;
  }

  /**
   * Calculates the spendable income ratio.
   *
   * @returns {number} Ratio of net income to spending
   */
  getSpendableIncomeRatio() {
    if (this.spend <= 0) return 0;
    return this._incomeBreakdown.netIncome / this.spend;
  }

  //   /**
  //    * Gets the income breakdown by source as percentages.
  //    *
  //    * @returns {Object} Income breakdown percentages
  //    */
  //   getIncomeBreakdownPercentages() {
  //     const totalIncome = this.getTotalIncome();
  //     if (totalIncome <= 0) {
  //       return {
  //         socialSec: 0,
  //         pension: 0,
  //         interest: 0,
  //         rmd: 0,
  //         otherTaxable: 0,
  //         taxFree: 0,
  //       };
  //     }

  //     const breakdown = this.income.breakdown || {};
  //     return {
  //       socialSec: (breakdown.socialSec || 0) / totalIncome,
  //       pension: (breakdown.pension || 0) / totalIncome,
  //       interest: (breakdown.interest || 0) / totalIncome,
  //       rmd: (breakdown.rmd || 0) / totalIncome,
  //       otherTaxable: (breakdown.otherTaxableIncome || 0) / totalIncome,
  //       taxFree: (breakdown.taxFreeIncome || 0) / totalIncome,
  //     };
  //   }

  /**
   * Gets the deposits breakdown by account type as percentages.
   *
   * @returns {Object} Deposits breakdown percentages
   */
  get depositsBreakdownPercentages() {
    const totalDeposits = this.totalDeposits;
    if (totalDeposits <= 0) {
      return { savings: 0, roth: 0, trad401k: 0 };
    }

    return {
      savings: (this._deposits.savings || 0) / totalDeposits,
      roth: (this._deposits.roth || 0) / totalDeposits,
      trad401k: (this._deposits.trad401k || 0) / totalDeposits,
    };
  }

  /**
   * Gets the withdrawals breakdown by account type as percentages.
   *
   * @returns {Object} Withdrawals breakdown percentages
   */
  get withdrawalsBreakdownPercentages() {
    const totalWithdrawals = this.totalWithdrawals;
    if (totalWithdrawals <= 0) {
      return { savings: 0, roth: 0, trad401k: 0 };
    }

    return {
      savings: (this._withdrawals.savings || 0) / totalWithdrawals,
      roth: (this._withdrawals.roth || 0) / totalWithdrawals,
      trad401k: (this._withdrawals.trad401k || 0) / totalWithdrawals,
    };
  }

  /**
   * Validates debug data for logical consistency.
   *
   * @returns {Object} Validation result containing:
   *   - isValid: Whether all values are valid
   *   - errors: Array of validation error messages
   *   - warnings: Array of validation warning messages
   */
  validate() {
    const errors = [];
    const warnings = [];

    if (this._demographics.age < 0 || this._demographics.age > 150) {
      errors.push("Age must be between 0 and 150");
    }

    if (this.spend < 0) {
      errors.push("Spending cannot be negative");
    }

    if (this._taxes.federalTaxesOwed < 0) {
      warnings.push(
        "Federal taxes are negative - possible tax credit scenario"
      );
    }

    const totalIncome = this._incomeBreakdown.totalIncome;
    if (totalIncome < 0) {
      errors.push("Total income cannot be negative");
    }

    // Check if spending exceeds net income by a significant margin
    if (this.spend > this._incomeBreakdown.netIncome * 1.5) {
      warnings.push("Spending significantly exceeds net income");
    }

    // Check for unusually high tax rate
    const effectiveTaxRate = this.getEffectiveTaxRate();
    if (effectiveTaxRate > 0.5) {
      warnings.push("Effective tax rate exceeds 50%");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  /**
   * Creates a comprehensive summary of all debug data and calculated metrics.
   *
   * @returns {Object} Summary containing all debug information and analysis
   */
  getSummary() {
    // const incomeBreakdown = this.getIncomeBreakdownPercentages();
    const depositsBreakdown = this.depositsBreakdownPercentages;
    const withdrawalsBreakdown = this.withdrawalsBreakdownPercentages;
    const validation = this.validate();

    return {
      // Basic demographics and spending
      age: this._demographics.age,
      spend: this.spend,

      // Income analysis
      totalIncome: this._incomeBreakdown.totalIncome,
      incomeBreakdown: {
        raw: this._incomeBreakdown,
        // percentages: incomeBreakdown,
      },

      // Tax analysis
      federalTaxes: this._taxes.federalTaxesOwed,
      netIncome: this._incomeBreakdown.netIncome,
      effectiveTaxRate: (this.getEffectiveTaxRate() * 100).toFixed(2) + "%",

      // Cash flow analysis
      totalDeposits: this.totalDeposits,
      totalWithdrawals: this.totalWithdrawals,
      netCashFlow: this.netCashFlow,
      depositsBreakdown: depositsBreakdown,
      withdrawalsBreakdown: withdrawalsBreakdown,

      // Financial ratios
      spendableIncomeRatio: this.getSpendableIncomeRatio().toFixed(2),

      //   // Account information
      //   accountsCount: Object.keys(this.accounts).length,

      // Validation results
      validation: validation,
    };
  }

  /**
   * Factory method to create a DebugData from calculation results and account data.
   *
   * This method provides a convenient way to construct DebugData objects
   * by extracting data from demographics, fiscal data, calculation results,
   * and account information.
   *
   * @param {Demographics} demographics - Demographic information
   * @param {FiscalData} fiscalData - Fiscal data for the calculation year
   * @param {IncomeBreakdown} incomeBreakdown - Income streams object with calculation methods
   * @param {Deposits} deposits - Deposits information
   * @param {Withdrawals} withdrawals - Withdrawals information
   * @param {AccountsManager} accounts - Account group with all account types
   * @param {Taxes} taxes - Tax calculation results:
   * @param {string} [description="Debug Data"] - Optional description
   *
   * @returns {DebugData} A new debug data instance with calculation results
   *
   * @example
   * // Create debug data from calculation results
   * const debugData = DebugData.CreateUsing(
   *   demographics,
   *   fiscalData,
   *   calculationResult,
   *   accountGroup,
   *   taxResults,
   *   incomeResults
   * );
   *
   * console.log(debugData.getSummary());
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(
    demographics,
    fiscalData,
    incomeBreakdown,
    deposits,
    withdrawals,
    accounts,
    taxes,
    description = "Debug Data"
  ) {
    // const income = {
    //   total:
    //     resultObj.incomeStreams &&
    //     typeof resultObj.incomeStreams.totalIncome === "function"
    //       ? resultObj.incomeStreams.totalIncome()
    //       : 0,
    //   breakdown: {
    //     socialSec:
    //       resultObj.incomeStreams &&
    //       typeof resultObj.incomeStreams.ssIncome === "function"
    //         ? resultObj.incomeStreams.ssIncome()
    //         : 0,
    //     pension:
    //       resultObj.incomeStreams &&
    //       typeof resultObj.incomeStreams.pensionIncome === "function"
    //         ? resultObj.incomeStreams.pensionIncome()
    //         : 0,
    //     interest:
    //       accounts.savings &&
    //       typeof accounts.savings.calculateInterestForYear === "function"
    //         ? accounts.savings
    //             .calculateInterestForYear(
    //               typeof INTEREST_CALCULATION_EPOCH !== "undefined"
    //                 ? INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    //                 : "ignore_deposits",
    //               fiscalData.taxYear
    //             )
    //             .asCurrency()
    //         : 0,
    //     rmd: resultObj.incomeStreams ? resultObj.incomeStreams.rmd || 0 : 0,
    //     otherTaxableIncome: resultObj.incomeStreams
    //       ? resultObj.incomeStreams.otherTaxableIncomeAdjustments || 0
    //       : 0,
    //     taxFreeIncome: resultObj.incomeStreams
    //       ? resultObj.incomeStreams.taxFreeIncomeAdjustment || 0
    //       : 0,
    //   },
    // };

    // // Build deposits object with total method
    // const deposits = {
    //   /** @returns {number} */
    //   total() {
    //     return (
    //       /** @type {any} */ (this.savings || 0) +
    //       /** @type {any} */ (this.roth || 0) +
    //       /** @type {any} */ (this.trad401k || 0)
    //     );
    //   },
    //   savings:
    //     accounts.savings &&
    //     typeof accounts.savings.depositsForYear === "function"
    //       ? accounts.savings.depositsForYear(fiscalData.taxYear)
    //       : 0,
    //   roth:
    //     accounts.rothIra &&
    //     typeof accounts.rothIra.depositsForYear === "function"
    //       ? accounts.rothIra.depositsForYear(fiscalData.taxYear)
    //       : 0,
    //   trad401k:
    //     accounts.trad401k &&
    //     typeof accounts.trad401k.depositsForYear === "function"
    //       ? accounts.trad401k.depositsForYear(fiscalData.taxYear)
    //       : 0,
    // };

    // // Build withdrawals object with total method
    // const withdrawals = {
    //   /** @returns {number} */
    //   total() {
    //     return (
    //       /** @type {any} */ (this.savings || 0) +
    //       /** @type {any} */ (this.roth || 0) +
    //       /** @type {any} */ (this.trad401k || 0)
    //     );
    //   },
    //   savings:
    //     accounts.savings &&
    //     typeof accounts.savings.withdrawalsForYear === "function"
    //       ? accounts.savings.withdrawalsForYear(fiscalData.taxYear)
    //       : 0,
    //   roth:
    //     accounts.rothIra &&
    //     typeof accounts.rothIra.withdrawalsForYear === "function"
    //       ? accounts.rothIra.withdrawalsForYear(fiscalData.taxYear)
    //       : 0,
    //   trad401k:
    //     accounts.trad401k &&
    //     typeof accounts.trad401k.withdrawalsForYear === "function"
    //       ? accounts.trad401k.withdrawalsForYear(fiscalData.taxYear)
    //       : 0,
    // };

    return new DebugData(
      demographics,
      fiscalData,
      incomeBreakdown,
      taxes,
      incomeBreakdown.netIncome,
      deposits,
      withdrawals,
      accounts,
      description
    );
  }

  //   /**
  //    * Factory method to create a DebugData from individual values.
  //    *
  //    * @param {number} age - Current age
  //    * @param {number} spend - Annual spending
  //    * @param {number} totalIncome - Total income amount
  //    * @param {number} federalTaxes - Federal tax liability
  //    * @param {number} netIncome - Net income after taxes
  //    * @param {Object} [incomeBreakdown={}] - Income breakdown by source
  //    * @param {Object} [accountDeposits={}] - Deposits by account type
  //    * @param {Object} [accountWithdrawals={}] - Withdrawals by account type
  //    * @param {string} [description="Debug Data"] - Optional description
  //    *
  //    * @returns {DebugData} A new debug data instance with specified values
  //    *
  //    * @example
  //    * // Create debug data from known values
  //    * const debugData = DebugData.CreateFrom(
  //    *   65,     // age
  //    *   50000,  // spending
  //    *   60000,  // total income
  //    *   8000,   // federal taxes
  //    *   52000   // net income
  //    * );
  //    *
  //    * @static
  //    * @since 1.0.0
  //    */
  //   static CreateFrom(
  //     age,
  //     spend,
  //     totalIncome,
  //     federalTaxes,
  //     netIncome,
  //     incomeBreakdown = {},
  //     accountDeposits = {},
  //     accountWithdrawals = {},
  //     description = "Debug Data"
  //   ) {
  //     const income = {
  //       total: totalIncome,
  //       breakdown: incomeBreakdown,
  //     };

  //     const deposits = {
  //       /** @returns {number} */
  //       total() {
  //         return (
  //           /** @type {any} */ (this.savings || 0) +
  //           /** @type {any} */ (this.roth || 0) +
  //           /** @type {any} */ (this.trad401k || 0)
  //         );
  //       },
  //       ...accountDeposits,
  //     };

  //     const withdrawals = {
  //       /** @returns {number} */
  //       total() {
  //         return (
  //           /** @type {any} */ (this.savings || 0) +
  //           /** @type {any} */ (this.roth || 0) +
  //           /** @type {any} */ (this.trad401k || 0)
  //         );
  //       },
  //       ...accountWithdrawals,
  //     };

  //     return new DebugData(
  //       age,
  //       spend,
  //       income,
  //       federalTaxes,
  //       netIncome,
  //       deposits,
  //       withdrawals,
  //       {},
  //       description
  //     );
  //   }

  //   /**
  //    * Factory method to create an empty DebugData instance.
  //    *
  //    * @param {string} [description="Debug Data"] - Optional description
  //    * @returns {DebugData} A new debug data instance with zero/empty values
  //    *
  //    * @example
  //    * // Create empty debug data for later population
  //    * const debugData = DebugData.Empty();
  //    * debugData.updateDebugData({
  //    *   age: 45,
  //    *   spend: 40000
  //    * });
  //    *
  //    * @static
  //    * @since 1.0.0
  //    */
  //   static Empty(description = "Debug Data") {
  //     return new DebugData(0, 0, {}, 0, 0, {}, {}, {}, description);
  //   }
}

// Maintain backward compatibility - this will need all the context data
// const debugData = DebugData.CreateUsing(demographics, fiscalData, result, accounts, taxes, incomeResults);
