import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { IncomeStreams } from "./cIncomeStreams.js";
import { RetirementIncomeCalculator } from "./cRetirementIncomeCalculator.js";

class AccountPortioner {
  #ask = 0;

  /** @type {AccountingYear} */
  #accountYear;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {IncomeStreams} */
  #incomeStreams;
  /** @type {RetirementIncomeCalculator} */
  #retirementIncomeCalculator;

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {IncomeStreams} incomeStreams
   * @param {RetirementIncomeCalculator} retirementIncomeCalculator
   */
  constructor(
    accountYear,
    fiscalData,
    incomeStreams,
    retirementIncomeCalculator
  ) {
    this.#accountYear = accountYear;
    this.#incomeStreams = incomeStreams;
    this.#retirementIncomeCalculator = retirementIncomeCalculator;
    this.#fiscalData = fiscalData;
  }

  #savingsAvailable() {
    return this.#fiscalData.useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  #savingsPortion() {
    return this.#totalAvailable() > 0
      ? this.#savingsAvailable() / this.#totalAvailable()
      : 0;
  }

  #actual401kAvailable() {
    const gross401kAvailable = this.#fiscalData.useTrad401k
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.TRAD_401K)
      : 0;

    const flatRate = this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
    const taxWithheld = gross401kAvailable * flatRate;
    const net401kAvailable = gross401kAvailable - taxWithheld;

    return net401kAvailable;
  }

  #actual401kPortion() {
    const net401kPortion =
      this.#totalAvailable() > 0
        ? this.#actual401kAvailable() / this.#totalAvailable()
        : 0;

    return net401kPortion;
  }

  #tradRothAvailable() {
    return this.#fiscalData.useRoth
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
      this.#actual401kAvailable() +
      this.#tradRothAvailable()
    );
  }

  get savingsAsk() {
    return (this.#savingsPortion() * this.#ask).asCurrency();
  }
  get trad401kAsk() {
    return (this.#actual401kPortion() * this.#ask).asCurrency();
  }
  get rothAsk() {
    return (this.#rothIraPortion() * this.#ask).asCurrency();
  }

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {IncomeStreams} incomeStreams
   * @param {RetirementIncomeCalculator} retirementIncomeCalculator
   */
  static CalculatePortions(
    accountYear,
    fiscalData,
    incomeStreams,
    retirementIncomeCalculator
  ) {
    const portioner = new AccountPortioner(
      accountYear,
      fiscalData,
      incomeStreams,
      retirementIncomeCalculator
    );
    portioner.#calculatePortions();
    return portioner;
  }

  #calculatePortions() {
    let ask = this.#fiscalData.spend;

    // estimated income from SS, pension, RMDs, etc. will reduce the "ask"
    const fixedIncomeBreakdown = this.#calculateIncomeBreakdown(0);
    const netFixedIncome = fixedIncomeBreakdown.netIncome.asCurrency();

    ask = (ask - netFixedIncome).asCurrency();

    if (ask <= 0) {
      this.#ask = 0;
      return;
    }

    // We know what the "ask" is, so we can interpolate the portions based on a binary search
    let lo = 0;
    let hi = Math.min(ask * 2, this.#actual401kAvailable());

    this.#ask = hi;
    const maximumIterations = 80;
    let guestimatedVariableIncomeNeeded = 0;

    let incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

    if (incomeBreakdown?.netIncome.asCurrency() < ask) {
      for (let i = 0; i < maximumIterations; i++) {
        this.#ask = (lo + hi) / 2;

        incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

        const netIncome = incomeBreakdown?.netIncome.asCurrency() ?? 0;

        if (netIncome == ask.asCurrency()) break;
        if (netIncome < ask) lo = guestimatedVariableIncomeNeeded;
        else hi = guestimatedVariableIncomeNeeded;
        if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
      }
    }
  }

  /** @param {number} variableIncomeAmount
   * @return {IncomeBreakdown}
   */
  #calculateIncomeBreakdown(variableIncomeAmount) {
    const incomeStream =
      this.#retirementIncomeCalculator.calculateIncomeBreakdown(
        variableIncomeAmount,
        this.#incomeStreams
      );

    return incomeStream;
  }
}

export { AccountPortioner };
