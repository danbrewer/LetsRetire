import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { withLabel } from "./debugUtils.js";

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
  #accountYear;

  /**
   * Creates a new Balances instance with account balance data.
   *
   * @param {AccountingYear} accountYear -Accounting year
   * @param {string} [description="Account Balances"] - Descriptive label for this balance snapshot
   */
  constructor(accountYear, description = "Account Balances") {
    this._description = description;
    this.#accountYear = accountYear;
  }

  get savings() {
    return this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS);
  }

  get trad401k() {
    return this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_401K);
  }

  get rothIra() {
    return this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_ROTH_IRA);
  }

  //   /**
  //    * Gets the descriptive label for this balance snapshot.
  //    *
  //    * @returns {string} Description of the account balances
  //    */
  //   get description() {
  //     return this._description;
  //   }

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
  get allBalances() {
    return this.savings + this.trad401k + this.rothIra;
  }

  // /**
  //  * Gets the total retirement account balance (401k + Roth, excluding savings).
  //  *
  //  * @returns {number} Combined retirement account balance
  //  */
  // get retirementAccountBalances() {
  //   return this.trad401k + this.rothIra;
  // }

  /**
   * Gets the percentage of total portfolio held in each account type.
   *
   * @returns {Object} Allocation percentages:
   *   - savingsPercent: Percentage in savings account
   *   - trad401kPercent: Percentage in traditional 401k
   *   - rothIraPercent: Percentage in Roth IRA
   */
  get allocationPercentages() {
    const total = this.allBalances;
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
  get hasNegativeBalances() {
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

  // /**
  //  * Creates a summary object with formatted balance information.
  //  *
  //  * @returns {Object} Summary containing:
  //  *   - savings: Savings account balance
  //  *   - trad401k: Traditional 401k balance
  //  *   - rothIra: Roth IRA balance
  //  *   - total: Total portfolio value
  //  *   - retirementTotal: Combined retirement account balance
  //  *   - allocations: Percentage allocation by account type
  //  *   - largestAccount: Account with highest balance
  //  *   - hasNegativeBalances: Whether any balances are negative
  //  */
  // getSummary() {
  //   return {
  //     savings: this.savings,
  //     trad401k: this.trad401k,
  //     rothIra: this.rothIra,
  //     total: this.allBalances,
  //     retirementTotal: this.retirementAccountBalances,
  //     allocations: this.allocationPercentages,
  //     largestAccount: this.getLargestAccount(),
  //     hasNegativeBalances: this.hasNegativeBalances,
  //   };
  // }

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
   * @param {AccountingYear} accountYear - AccountYear instance containing account data
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
  static CreateUsing(accountYear, description = "Account Balances") {
    return new Balances(accountYear, description);
  }

  // static Empty() {
  //   return new Balances(AccountYear.Empty());
  // }
}
export { Balances };
