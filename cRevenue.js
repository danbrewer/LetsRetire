/**
 * Revenue class - Extracts and analyzes revenue account data from AccountYear
 * Handles income tracking, revenue streams, and financial reporting for revenue accounts
 */

import { AccountingYear } from "./cAccountingYear.js";
import { TransactionCategory } from "./cTransaction.js";

class Income {
  /** @type {AccountingYear} */
  #accountYear;
  
  #accountType;

  /**
   * @param {AccountingYear} accountYear - AccountYear instance for accessing account data
   * @param {string} accountType - Type of account (e.g., REVENUE)
   */
  constructor(accountYear, accountType) {
    this.#accountYear = accountYear;
    this.#accountType = accountType;
  }

  get savings() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.Savings)
      .asCurrency();
  }

  get netSocialSecurity() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.SocialSecurity)
      .asCurrency();
  }

  get netPension() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.Pension)
      .asCurrency();
  }

  get netInterestOnSavings() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.Interest)
      .asCurrency();
  }

  get netTrad401k() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.Trad401k)
      .asCurrency();
  }

  get netOtherTaxableIncome() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.OtherTaxableIncome)
      .asCurrency();
  }

  get tradRoth() {
    return this.#accountYear
      .getDeposits(this.#accountType, TransactionCategory.TradRoth)
      .asCurrency();
  }

  get total() {
    return this.#accountYear.getDeposits(this.#accountType).asCurrency();
  }

  /**
   * Create an empty Income instance
   * @param {AccountingYear} accountYear - AccountYear instance
   * @param {string} accountType - Type of account (e.g., REVENUE)
   * @returns {Income}
   */
  static CreateUsing(accountYear, accountType) {
    return new Income(accountYear, accountType);
  }

  //   static Empty() {
  //     return new Income(AccountYear.Empty(), "");
  //   }
}

export { Income };