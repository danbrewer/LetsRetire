class AccountPortioner {
  #accounts;
  #useSavings = false;
  // #use401k = false;
  // #useRothIRA = false;
  #ask = 0;

  /**
   * @param {AccountYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {number} spend
   */
  constructor(accountYear, fiscalData, spend) {
    this.#accounts = accountYear;

    this.#useSavings = fiscalData.useSavings;
    // this.#use401k = fiscalData.useTrad401k;
    // this.#useRothIRA = fiscalData.useRoth;

    this.#ask = spend;
  }

  #savingsAvailable() {
    return this.#useSavings
      ? this.#accounts.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  #savingsPortion() {
    return this.#totalAvailable() > 0
      ? this.#savingsAvailable() / this.#totalAvailable()
      : 0;
  }

  #trad401kAvailable() {
    return this.#useSavings
      ? this.#accounts.getEndingBalance(ACCOUNT_TYPES.TRAD_401K)
      : 0;
  }

  #trad401kPortion() {
    return this.#totalAvailable() > 0
      ? this.#trad401kAvailable() / this.#totalAvailable()
      : 0;
  }

  #rothIraAvailable() {
    return this.#useSavings
      ? this.#accounts.getEndingBalance(ACCOUNT_TYPES.TRAD_ROTH)
      : 0;
  }

  #rothIraPortion() {
    return this.#totalAvailable() > 0
      ? this.#rothIraAvailable() / this.#totalAvailable()
      : 0;
  }

  #totalAvailable() {
    return (
      this.#savingsAvailable() +
      this.#trad401kAvailable() +
      this.#rothIraAvailable()
    );
  }

  get savingsAsk() {
    return (this.#savingsPortion() * this.#ask).asCurrency();
  }
  get trad401kAsk() {
    return (this.#trad401kPortion() * this.#ask).asCurrency();
  }
  get rothAsk() {
    return (this.#rothIraPortion() * this.#ask).asCurrency();
  }
}
