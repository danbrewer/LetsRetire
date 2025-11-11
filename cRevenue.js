/**
 * Revenue class - Extracts and analyzes revenue account data from AccountYear
 * Handles income tracking, revenue streams, and financial reporting for revenue accounts
 */

class Revenue {
  /** @type {AccountYear} */
  #accountYear;

  /**
   * @param {AccountYear} accountYear - AccountYear instance for accessing account data
   */
  constructor(accountYear) {
    this.#accountYear = accountYear;
  }

  get savings() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.SAVINGS)
      .asCurrency();
  }

  get trad401k() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.TRAD_401K)
      .asCurrency();
  }

  get roth() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.TRAD_ROTH)
      .asCurrency();
  }

  get other() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.OTHER_INCOME)
      .asCurrency();
  }

  get ss() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.SOCIAL_SEC)
      .asCurrency();
  }

  get pension() {
    return this.#accountYear
      .getDeposits(ACCOUNT_TYPES.REVENUE, TRANSACTION_CATEGORY.PENSION)
      .asCurrency();
  }

  get totalRevenue() {
    return this.#accountYear.getDeposits(ACCOUNT_TYPES.REVENUE).asCurrency();
  }

  /**
   * Create an empty Revenue instance
   * @param {AccountYear} accountYear - AccountYear instance
   * @returns {Revenue}
   */
  static CreateFrom(accountYear) {
    return new Revenue(accountYear);
  }

  static Empty() {
    return new Revenue(AccountYear.Empty());
  }
}
