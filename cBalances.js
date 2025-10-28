/**
 * Represents account balances across all retirement and savings accounts.
 *
 * This class encapsulates the ending balances for all account types in a retirement
 * calculation year, providing structured access to individual account balances and
 * total portfolio value. It serves as a comprehensive view of account positions
 * for reporting and analysis purposes.
 *
 * @class Balances
 * @since 1.0.0
 */
class Balances {
  /**
   * Creates a new Balances instance with account balance data.
   *
   * @param {number} [savings=0] - Savings account ending balance
   * @param {number} [trad401k=0] - Traditional 401k account ending balance
   * @param {number} [rothIra=0] - Roth IRA account ending balance
   * @param {any} [calculationDetails=null] - Reference to underlying account objects for debugging
   * @param {string} [description="Account Balances"] - Descriptive label for this balance snapshot
   */
  constructor(
    savings = 0,
    trad401k = 0,
    rothIra = 0,
    calculationDetails = null,
    description = "Account Balances"
  ) {
    this._description = description;
    this.savings = savings;
    this.trad401k = trad401k;
    this.rothIra = rothIra;
    this.calculationDetails = calculationDetails;
  }

  /**
   * Gets the descriptive label for this balance snapshot.
   *
   * @returns {string} Description of the account balances
   */
  get description() {
    return this._description;
  }

  /**
   * Sets a new description for this balance snapshot.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the total portfolio value across all accounts.
   *
   * @returns {number} Sum of all account balances
   */
  total() {
    return this.savings + this.trad401k + this.rothIra;
  }

  /**
   * Gets the total retirement account balance (401k + Roth, excluding savings).
   *
   * @returns {number} Combined retirement account balance
   */
  getTotalRetirementAccounts() {
    return this.trad401k + this.rothIra;
  }

  /**
   * Gets the percentage of total portfolio held in each account type.
   *
   * @returns {Object} Allocation percentages:
   *   - savingsPercent: Percentage in savings account
   *   - trad401kPercent: Percentage in traditional 401k
   *   - rothIraPercent: Percentage in Roth IRA
   */
  getAllocationPercentages() {
    const total = this.total();
    if (total === 0) {
      return {
        savingsPercent: 0,
        trad401kPercent: 0,
        rothIraPercent: 0,
      };
    }

    return {
      savingsPercent: ((this.savings / total) * 100).toFixed(2),
      trad401kPercent: ((this.trad401k / total) * 100).toFixed(2),
      rothIraPercent: ((this.rothIra / total) * 100).toFixed(2),
    };
  }

  /**
   * Checks if any account has a negative balance (error condition).
   *
   * @returns {boolean} True if any account balance is negative
   */
  hasNegativeBalances() {
    return this.savings < 0 || this.trad401k < 0 || this.rothIra < 0;
  }

  /**
   * Gets the largest account balance and its type.
   *
   * @returns {Object} Largest account information:
   *   - accountType: Name of the account with largest balance
   *   - balance: The balance amount
   */
  getLargestAccount() {
    if (this.savings >= this.trad401k && this.savings >= this.rothIra) {
      return { accountType: "savings", balance: this.savings };
    } else if (this.trad401k >= this.rothIra) {
      return { accountType: "trad401k", balance: this.trad401k };
    } else {
      return { accountType: "rothIra", balance: this.rothIra };
    }
  }

  /**
   * Creates a summary object with formatted balance information.
   *
   * @returns {Object} Summary containing:
   *   - savings: Savings account balance
   *   - trad401k: Traditional 401k balance
   *   - rothIra: Roth IRA balance
   *   - total: Total portfolio value
   *   - retirementTotal: Combined retirement account balance
   *   - allocations: Percentage allocation by account type
   *   - largestAccount: Account with highest balance
   *   - hasNegativeBalances: Whether any balances are negative
   */
  getSummary() {
    return {
      savings: this.savings,
      trad401k: this.trad401k,
      rothIra: this.rothIra,
      total: this.total(),
      retirementTotal: this.getTotalRetirementAccounts(),
      allocations: this.getAllocationPercentages(),
      largestAccount: this.getLargestAccount(),
      hasNegativeBalances: this.hasNegativeBalances(),
    };
  }

  /**
   * Updates balance values for account rebalancing or corrections.
   *
   * @param {Object} updates - Object containing balance updates:
   *   - savings: New savings account balance
   *   - trad401k: New traditional 401k balance
   *   - rothIra: New Roth IRA balance
   */
  //   updateBalances(updates) {
  //     if (updates.savings !== undefined) {
  //       this.savings = updates.savings;
  //     }
  //     if (updates.trad401k !== undefined) {
  //       this.trad401k = updates.trad401k;
  //     }
  //     if (updates.rothIra !== undefined) {
  //       this.rothIra = updates.rothIra;
  //     }
  //   }

  /**
   * Factory method to create a Balances instance from account group data.
   *
   * This method provides a convenient way to construct Balances objects by
   * extracting ending balances from an AccountGroup for a specific tax year.
   * It handles the account balance calculations and currency formatting automatically.
   *
   * @param {AccountGroup} accounts - AccountGroup instance containing all accounts
   * @param {FiscalData} fiscalData - Fiscal data containing the target tax year
   * @param {string} [description="Account Balances"] - Optional description
   *
   * @returns {Balances} A new Balances instance with current account balances
   *
   * @example
   * // Create balances from account group for current tax year
   * const accounts = AccountGroup.CreateUsing(accountData);
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   *
   * const balances = Balances.CreateUsing(accounts, fiscalData);
   * console.log(balances.total()); // Total portfolio value
   * console.log(balances.getAllocationPercentages()); // Account allocation
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(accounts, fiscalData, description = "Account Balances") {
    const savings = accounts.savings
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency();

    const trad401k = accounts.trad401k
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency();

    const rothIra = accounts.rothIra
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency();

    const calculationDetails =
      typeof withLabel === "function"
        ? withLabel("accountBalances", accounts)
        : accounts;

    return new Balances(
      savings,
      trad401k,
      rothIra,
      calculationDetails,
      description
    );
  }

  /**
   * Factory method to create a Balances instance from individual balance amounts.
   *
   * @param {number} savings - Savings account balance
   * @param {number} trad401k - Traditional 401k balance
   * @param {number} rothIra - Roth IRA balance
   * @param {string} [description="Account Balances"] - Optional description
   *
   * @returns {Balances} A new Balances instance with specified balances
   *
   * @example
   * // Create balances from known amounts
   * const balances = Balances.CreateFrom(50000, 300000, 150000);
   * console.log(balances.total()); // 500000
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    savings,
    trad401k,
    rothIra,
    description = "Account Balances"
  ) {
    return new Balances(savings, trad401k, rothIra, null, description);
  }

  static Empty() {
    return new Balances(0, 0, 0, null, "Empty Balances");
  }
}

// Maintain backward compatibility - this will need account and fiscal data context
// const balances = Balances.CreateUsing(accounts, fiscalData);
