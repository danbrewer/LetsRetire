/**
 * Revenue class - Extracts and analyzes revenue account data from AccountYear
 * Handles income tracking, revenue streams, and financial reporting for revenue accounts
 */

class Income {
  /** @type {AccountYear} */
  #accountYear;
  #accountType;

  /**
   * @param {AccountYear} accountYear - AccountYear instance for accessing account data
   * @param {string} accountType - Type of account (e.g., REVENUE)
   */
  constructor(accountYear, accountType) {
    this.#accountYear = accountYear;
    this.#accountType = accountType;
  }

  get savings() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.SAVINGS)
      .asCurrency();
  }

  get trad401k() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.TRAD_401K)
      .asCurrency();
  }

  get roth() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.TRAD_ROTH)
      .asCurrency();
  }

  get other() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.OTHER_INCOME)
      .asCurrency();
  }

  get ss() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.SOCIAL_SEC)
      .asCurrency();
  }

  get pension() {
    return this.#accountYear
      .getDeposits(this.#accountType, TRANSACTION_CATEGORY.PENSION)
      .asCurrency();
  }

  get total() {
    return this.#accountYear.getDeposits(this.#accountType).asCurrency();
  }

  /**
   * Create an empty Income instance
   * @param {AccountYear} accountYear - AccountYear instance
   * @param {string} accountType - Type of account (e.g., REVENUE)
   * @returns {Income}
   */
  static CreateFrom(accountYear, accountType) {
    return new Income(accountYear, accountType);
  }

  static Empty() {
    return new Income(AccountYear.Empty(), "");
  }
}
