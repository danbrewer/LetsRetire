/**
 * Disbursements class - Tracks withdrawals from savings, 401k, and Roth IRA accounts for a given year
 * Provides detailed tracking of withdrawal amounts, types, and sources
 */

import { ACCOUNT_TYPES } from "./cAccount";
import { AccountingYear } from "./cAccountingYear";

class Disbursements {
  #accountYear;

  /**
   * Add a disbursement/withdrawal
   * @param {AccountingYear} accountYear
   */
  constructor(accountYear) {
    this.#accountYear = accountYear;
  }

  //   /**
  //    * Get total disbursements for a year
  //    * @returns {number}
  //    */
  //   get total() {
  //     let total = 0;
  //     this.#accountYear.getAllAccounts().forEach((account) => {
  //       total += this.#accountYear.getWithdrawals(
  //         account.name,
  //         TRANSACTION_CATEGORY.DISBURSEMENT
  //       );
  //     });

  //     return total.asCurrency();
  //   }

  /**
   * Get savings disbursements for a year
   * @returns {number}
   */
  get savings() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SAVINGS, TRANSACTION_CATEGORY.DISBURSEMENT)
      .asCurrency();
  }

  get interestEarnedOnSavings() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SAVINGS, TRANSACTION_CATEGORY.INTEREST)
      .asCurrency();
  }

  /**
   * Get 401k disbursements for a year
   * @returns {number}
   */
  get trad401k() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.TRAD_401K,
        TRANSACTION_CATEGORY.DISBURSEMENT
      )
      .asCurrency();
  }

  /**
   * Get Roth disbursements for a year
   * @returns {number}
   */
  get roth() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.TRAD_ROTH,
        TRANSACTION_CATEGORY.DISBURSEMENT
      )
      .asCurrency();
  }

  /**
   * @param {AccountingYear} accountYear
   */
  static CreateUsing(accountYear) {
    return new Disbursements(accountYear);
  }

  /**
   * Create an empty Disbursements instance
   * @returns {Disbursements}
   */
  //   static Empty() {
  //     return new Disbursements(AccountYear.Empty());
  //   }
}
