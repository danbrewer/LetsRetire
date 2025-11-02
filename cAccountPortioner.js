class AccountPortioner {
  #accounts;
  #taxYear = 0;
  #useSavings = false;
  // #use401k = false;
  // #useRothIRA = false;
  #ask = 0;

  /**
   * @param {AccountsManager} accounts
   * @param {FiscalData} fiscalData
   * @param {number} spend
   */
  constructor(accounts, fiscalData, spend) {
    this.#accounts = accounts;

    this.#useSavings = fiscalData.useSavings;
    // this.#use401k = fiscalData.useTrad401k;
    // this.#useRothIRA = fiscalData.useRoth;
    this.#taxYear = fiscalData.taxYear;

    this.#ask = spend;
  }

  #savingsAvailable() {
    return this.#useSavings
      ? this.#accounts.savings.endingBalanceForYear(this.#taxYear)
      : 0;
  }

  #savingsPortion() {
    return this.#totalAvailable() > 0
      ? this.#savingsAvailable() / this.#totalAvailable()
      : 0;
  }

  #trad401kAvailable() {
    return this.#useSavings
      ? this.#accounts.trad401k.endingBalanceForYear(this.#taxYear)
      : 0;
  }

  #trad401kPortion() {
    return this.#totalAvailable() > 0
      ? this.#trad401kAvailable() / this.#totalAvailable()
      : 0;
  }

  #rothIraAvailable() {
    return this.#useSavings
      ? this.#accounts.rothIra.endingBalanceForYear(this.#taxYear)
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
