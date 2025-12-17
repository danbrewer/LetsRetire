import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";

class AccountPortioner {
  #accountYear;
  #useSavings = false;
  #useTrad401k = false;
  #useTradRoth = false;
  #ask = 0;

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {number} spend
   */
  constructor(accountYear, fiscalData, spend) {
    this.#accountYear = accountYear;

    this.#useSavings = fiscalData.useSavings;
    this.#useTrad401k = fiscalData.useTrad401k;
    this.#useTradRoth = fiscalData.useRoth;

    this.#ask = spend;
  }

  #savingsAvailable() {
    return this.#useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  #savingsPortion() {
    return this.#totalAvailable() > 0
      ? this.#savingsAvailable() / this.#totalAvailable()
      : 0;
  }

  #trad401kAvailable() {
    return this.#useTrad401k
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.TRAD_401K)
      : 0;
  }

  #trad401kPortion() {
    return this.#totalAvailable() > 0
      ? this.#trad401kAvailable() / this.#totalAvailable()
      : 0;
  }

  #tradRothAvailable() {
    return this.#useTradRoth
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.TRAD_ROTH)
      : 0;
  }

  #rothIraPortion() {
    return this.#totalAvailable() > 0
      ? this.#tradRothAvailable() / this.#totalAvailable()
      : 0;
  }

  #totalAvailable() {
    return (
      this.#savingsAvailable() +
      this.#trad401kAvailable() +
      this.#tradRothAvailable()
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

export { AccountPortioner };