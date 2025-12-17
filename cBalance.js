import { AccountingYear } from "./cAccountingYear.js";

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
class Balance {
  #accountYear;
  #accountType;

  /**
   * Creates a new Balances instance with account balance data.
   *
   * @param {AccountingYear} accountYear -Accounting year
   * @param {string} accountType
   */
  constructor(accountYear, accountType) {
    this._description = accountType;
    this.#accountYear = accountYear;
    this.#accountType = accountType;
  }

  get startingBalance() {
    return this.#accountYear.getStartingBalance(this.#accountType).asCurrency();
  }

  get withdrawals() {
    return this.#accountYear.getWithdrawals(this.#accountType);
  }

  get deposits() {
    return this.#accountYear.getDeposits(this.#accountType);
  }

  get endingBalance() {
    return this.#accountYear.getEndingBalance(this.#accountType).asCurrency();
  }

  /**
   * @param {AccountingYear} accountYear
   * @param {string} accountType
   */
  static CreateUsing(accountYear, accountType) {
    return new Balance(accountYear, accountType);
  }
}

export { Balance };