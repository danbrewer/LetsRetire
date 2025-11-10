/**
 * Represents withdrawal amounts across all retirement and savings accounts.
 *
 * This class encapsulates the withdrawal breakdown for all account types in a retirement
 * calculation year, providing structured access to individual account withdrawals and
 * total withdrawal amounts. It includes Required Minimum Distributions (RMD) and serves
 * as a comprehensive view of all fund distributions for reporting and analysis.
 *
 * @class Withdrawals
 * @since 1.0.0
 */
class Withdrawals {
  /**
   * Creates a new Withdrawals instance with withdrawal data from all account types.
   *
   * @param {Account} trad401k - Traditional 401k deposits for the year
   * @param {Account} savings - Savings account deposits for the year
   * @param {Account}  roth - Roth IRA deposits for the year
   * @param {number} taxYear - The tax year for which these deposits apply
   * @param {any[]} [calculationDetails=[]] - Reference objects for debugging and analysis
   * @param {string} [description="Withdrawals Breakdown"] - Descriptive label for this withdrawal snapshot
   */
  constructor(
    trad401k,
    savings,
    roth,
    taxYear,
    calculationDetails = [],
    description = "Withdrawals Breakdown"
  ) {
    this._description = description;
    this._trad401k = trad401k;
    this._savings = savings;
    this._roth = roth;
    this._taxYear = taxYear;
    // this.rmd = rmd;
    this.calculationDetails = calculationDetails;
  }

  get rmd() {
    // RMD is typically part of income streams, but we can calculate it here if needed
    // For now, we return 0 as a placeholder
    return this._trad401k.withdrawalsForYear(
      this._taxYear,
      TRANSACTION_CATEGORY.RMD
    );
  }

  //   /**
  //    * Gets the descriptive label for this withdrawal breakdown.
  //    *
  //    * @returns {string} Description of the withdrawals
  //    */
  //   get description() {
  //     return this._description;
  //   }

  get savings() {
    return this._savings.withdrawalsForYear(this._taxYear);
  }

  get roth() {
    return this._roth.withdrawalsForYear(this._taxYear);
  }

  get trad401k() {
    return this._trad401k.withdrawalsForYear(this._taxYear) - this.rmd;
  }

  /**
   * Sets a new description for this withdrawal breakdown.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the total withdrawal amount across all accounts and sources.
   *
   * @returns {number} Sum of all withdrawals including RMD
   */
  get total() {
    return this.trad401k + this.savings + this.roth + this.rmd;
  }

  /**
   * Gets total withdrawals from retirement accounts only (401k + Roth, excluding savings and RMD).
   *
   * @returns {number} Combined retirement account withdrawals
   */
  get totalRetirementWithdrawals() {
    return this.trad401k + this.roth;
  }

  /**
   * Gets total taxable withdrawals (401k + savings, excluding Roth and RMD).
   * Note: RMD taxation depends on account type and is handled separately.
   *
   * @returns {number} Combined taxable withdrawals
   */
  get totalTaxableWithdrawals() {
    return this.trad401k + this.roth;
  }

  /**
   * Gets the percentage breakdown of withdrawals by source.
   *
   * @returns {Object} Withdrawal source percentages:
   *   - trad401kPercent: Percentage from traditional 401k
   *   - savingsPercent: Percentage from savings account
   *   - rothPercent: Percentage from Roth IRA
   *   - rmdPercent: Percentage from RMD
   */
  get withdrawalPercentages() {
    const total = this.total;
    if (total === 0) {
      return {
        trad401kPercent: 0,
        savingsPercent: 0,
        rothPercent: 0,
        rmdPercent: 0,
      };
    }

    return {
      trad401kPercent: ((this.trad401k / total) * 100).toFixed(2),
      savingsPercent: ((this.savings / total) * 100).toFixed(2),
      rothPercent: ((this.roth / total) * 100).toFixed(2),
      rmdPercent: ((this.rmd / total) * 100).toFixed(2),
    };
  }

  /**
   * Checks if any withdrawal amount is negative (error condition).
   *
   * @returns {boolean} True if any withdrawal is negative
   */
  get hasNegativeWithdrawals() {
    return (
      this.trad401k < 0 || this.savings < 0 || this.roth < 0 || this.rmd < 0
    );
  }

  /**
   * Gets the largest withdrawal source and amount.
   *
   * @returns {Object} Largest withdrawal information:
   *   - source: Name of the account with largest withdrawal
   *   - amount: The withdrawal amount
   */
  getLargestWithdrawal() {
    const amounts = {
      trad401k: this.trad401k,
      savings: this.savings,
      roth: this.roth,
      rmd: this.rmd,
    };

    const largest = Object.entries(amounts).reduce(
      (max, [source, amount]) => {
        return amount > max.amount ? { source, amount } : max;
      },
      { source: "none", amount: 0 }
    );

    return largest;
  }

  /**
   * Checks if there are any withdrawals at all.
   *
   * @returns {boolean} True if total withdrawals are greater than zero
   */
  get hasWithdrawals() {
    return this.total > 0;
  }

  /**
   * Creates a summary object with formatted withdrawal information.
   *
   * @returns {Object} Summary containing:
   *   - trad401k: Traditional 401k withdrawals
   *   - savings: Savings account withdrawals
   *   - roth: Roth IRA withdrawals
   *   - rmd: Required Minimum Distribution amount
   *   - total: Total withdrawal amount
   *   - retirementTotal: Combined retirement account withdrawals
   *   - taxableTotal: Combined taxable withdrawals
   *   - percentages: Percentage breakdown by source
   *   - largestWithdrawal: Source with highest withdrawal
   *   - hasNegativeWithdrawals: Whether any withdrawals are negative
   *   - hasWithdrawals: Whether any withdrawals occurred
   */
  getSummary() {
    return {
      trad401k: this._trad401k,
      savings: this._savings,
      roth: this._roth,
      rmd: this.rmd,
      total: this.total,
      retirementTotal: this.totalRetirementWithdrawals,
      taxableTotal: this.totalTaxableWithdrawals,
      percentages: this.withdrawalPercentages,
      largestWithdrawal: this.getLargestWithdrawal(),
      hasNegativeWithdrawals: this.hasNegativeWithdrawals,
      hasWithdrawals: this.hasWithdrawals,
    };
  }

  /**
   * Factory method to create an empty Withdrawals instance with all values set to zero.
   *
   * This method provides a convenient way to initialize a Withdrawals object with
   * no withdrawals, useful for scenarios where withdrawal calculations haven't been
   * performed yet or for baseline comparisons.
   *
   * @param {string} [description="Withdrawals Breakdown"] - Optional description
   *
   * @returns {Withdrawals} A new Withdrawals instance with all values set to zero
   *
   * @example
   * // Create empty withdrawals for initialization
   * const withdrawals = Withdrawals.Empty();
   * console.log(withdrawals.total()); // 0
   * console.log(withdrawals.hasWithdrawals()); // false
   *
   * // Later, update with actual withdrawal amounts
   * withdrawals.updateWithdrawals({
   *   trad401k: 25000,
   *   rmd: 5000
   * });
   * console.log(withdrawals.total()); // 30000
   *
   * @since 1.0.0
   */
  static Empty(description = "Withdrawals Breakdown") {
    return new Withdrawals(
      new Account("trad401k", 0, 0),
      new Account("savings", 0, 0),
      new Account("roth", 0, 0),
      0,
      [],
      description
    );
  }

  /**
   * Factory method to create a Withdrawals instance from account group and income data.
   *
   * This method provides a convenient way to construct Withdrawals objects by
   * extracting withdrawal amounts from an AccountGroup and income breakdown for
   * a specific tax year. It handles the withdrawal calculations automatically.
   *
   * @param {AccountsManager} accounts - AccountGroup instance containing all accounts
   * @param {IncomeStreams} incomeStreams - Income breakdown containing RMD information
   * @param {FiscalData} fiscalData - Fiscal data containing the target tax year
   * @param {string} [description="Withdrawals Breakdown"] - Optional description
   *
   * @returns {Withdrawals} A new Withdrawals instance with current withdrawal amounts
   *
   * @example
   * // Create withdrawals from account group for current tax year
   * const accounts = AccountGroup.CreateUsing(accountData);
   * const incomeBreakdown = IncomeBreakdown.CreateFrom(incomeData);
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   *
   * const withdrawals = Withdrawals.CreateUsing(accounts, incomeBreakdown, fiscalData);
   * console.log(withdrawals.total()); // Total withdrawal amount
   * console.log(withdrawals.getWithdrawalPercentages()); // Source breakdown
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(
    accounts,
    incomeStreams,
    fiscalData,
    description = "Withdrawals Breakdown"
  ) {
    const trad401k = accounts.trad401k;
    const savings = accounts.savings;
    const roth = accounts.rothIra;

    const calculationDetails = [];
    if (typeof withLabel === "function") {
      calculationDetails.push(
        withLabel("incomeStreams", incomeStreams),
        withLabel("accounts", accounts)
      );
    } else {
      calculationDetails.push(incomeStreams, accounts);
    }

    return new Withdrawals(
      trad401k,
      savings,
      roth,
      fiscalData.taxYear,
      calculationDetails,
      description
    );
  }

  /**
   * Factory method to create a Withdrawals instance from individual withdrawal amounts.
   *
   * @param {Account} trad401k - Traditional 401k withdrawal amount
   * @param {Account} savings - Savings withdrawal amount
   * @param {Account} roth - Roth IRA withdrawal amount
   * @param {number} taxYear - tax year
   * @param {string} [description="Withdrawals Breakdown"] - Optional description
   *
   * @returns {Withdrawals} A new Withdrawals instance with specified amounts
   *
   * @example
   * // Create withdrawals from known amounts
   * const withdrawals = Withdrawals.CreateFrom(25000, 10000, 5000, 8000);
   * console.log(withdrawals.total()); // 48000
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    trad401k,
    savings,
    roth,
    taxYear,
    description = "Withdrawals Breakdown"
  ) {
    return new Withdrawals(trad401k, savings, roth, taxYear, [], description);
  }
}

// Maintain backward compatibility - this will need account and income data context
// const withdrawals = Withdrawals.CreateUsing(accounts, incomeResults.incomeBreakdown, fiscalData);
