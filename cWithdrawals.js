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
  /** @type {AccountingYear} */
  #accountYear;

  /** @type {string} */
  #description;

  /**
   * Creates a new Withdrawals instance with withdrawal data from all account types.
   * @param {AccountingYear} accountYear - AccountYear instance for accessing account data
   * @param {string} [description="Withdrawals Breakdown"] - Descriptive label for this withdrawal data
   */
  constructor(
    accountYear,
    description = "Withdrawals Breakdown"
    // trad401k,
    // savings,
    // roth,
    // taxYear,
    // calculationDetails = [],
    // description = "Withdrawals Breakdown"
  ) {
    this.#accountYear = accountYear;
    this.#description = description;
  }

  get description() {
    return this.#description;
  }

  get rmd() {
    // RMD is typically part of income streams, but we can calculate it here if needed
    // For now, we return 0 as a placeholder
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.TRAD_401K, TRANSACTION_CATEGORY.RMD)
      .asCurrency();
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
    return this.#accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS).asCurrency();
  }

  get roth() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.TRAD_ROTH)
      .asCurrency();
  }

  get trad401k() {
    return (
      this.#accountYear.getWithdrawals(ACCOUNT_TYPES.TRAD_401K).asCurrency() -
      this.rmd
    );
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

  get totalNonTaxableWithdrawals() {
    return this.savings;
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
  get withdrawalBreakdowns() {
    const total = this.total;
    if (total === 0) {
      return {
        trad401kPercent: "0.0%",
        savingsPercent: "0.0%",
        rothPercent: "0.0%",
        rmdPercent: "0.0%",
      };
    }

    return {
      trad401kPercent: `${(this.trad401k.asPercentageOf(total) * 100).toFixed(1)}%`,
      savingsPercent: `${(this.savings.asPercentageOf(total) * 100).toFixed(1)}%`,
      rothPercent: `${(this.roth.asPercentageOf(total) * 100).toFixed(1)}%`,
      rmdPercent: `${(this.rmd.asPercentageOf(total) * 100).toFixed(1)}%`,
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
   * Factory method to create an empty Withdrawals instance with all values set to zero.
   *
   * This method provides a convenient way to initialize a Withdrawals object with
   * no withdrawals, useful for scenarios where withdrawal calculations haven't been
   * performed yet or for baseline comparisons.
   *
   * @param {AccountingYear} accountYear - AccountYear instance
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
  // static Empty(description = "Withdrawals Breakdown") {
  //   return new Withdrawals(
  //     new Account("trad401k", 0, 0),
  //     new Account("savings", 0, 0),
  //     new Account("roth", 0, 0),
  //     0,
  //     [],
  //     description
  //   );
  // }

  /**
   * Factory method to create a Withdrawals instance from account group and income data.
   *
   * This method provides a convenient way to construct Withdrawals objects by
   * extracting withdrawal amounts from an AccountGroup and income breakdown for
   * a specific tax year. It handles the withdrawal calculations automatically.
   *
   * @param {AccountingYear} accountYear - AccountGroup instance containing all accounts
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
  static CreateUsing(accountYear, description = "Withdrawals Breakdown") {
    return new Withdrawals(
      accountYear,
      description
      // trad401k,
      // savings,
      // roth,
      // fiscalData.taxYear,
      // calculationDetails,
      // description
    );
  }
}

// Maintain backward compatibility - this will need account and income data context
// const withdrawals = Withdrawals.CreateUsing(accounts, incomeResults.incomeBreakdown, fiscalData);
