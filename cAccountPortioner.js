class AccountPortioner {
  #accounts = {};
  #taxYear = 0;
  #useSavings = false;
  #use401k = false;
  #useRothIRA = false;
  #ask = 0;

  constructor(accounts, fiscalData, spend) {
    this.#accounts = accounts;

    this.#useSavings = fiscalData.useSavings;
    this.#use401k = fiscalData.useTrad401k;
    this.#useRothIRA = fiscalData.useRoth;
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

  #traditional401kAvailable() {
    return this.#useSavings
      ? this.#accounts.traditional401k.endingBalanceForYear(this.#taxYear)
      : 0;
  }

  #traditional401kPortion() {
    return this.#totalAvailable() > 0
      ? this.#traditional401kAvailable() / this.#totalAvailable()
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
      this.#traditional401kAvailable() +
      this.#rothIraAvailable()
    );
  }

  savingsAsk() {
    return (this.#savingsPortion() * this.#ask).asCurrency();
  }
  traditional401kAsk() {
    return (this.#traditional401kPortion() * this.#ask).asCurrency();
  }
  rothAsk() {
    return (this.#rothIraPortion() * this.#ask).asCurrency();
  }
}
