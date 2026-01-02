import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { RetirementIncomeCalculator } from "./cRetirementIncomeCalculator.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { EnumBase } from "./cEnum.js";

const ProportionStrategyNames = /** @type {const} */ ({
  EqualShares: "equalShares",
  NontaxableFirst: "nontaxableFirst",
  TaxableFirst: "taxableFirst",
  Custom: "custom",
});

/**
 * @typedef {typeof ProportionStrategyNames[keyof typeof ProportionStrategyNames]} ProportionStrategyName
 */

class ProportionStrategyEnum extends EnumBase {
  constructor() {
    super("ProportionStrategy", Object.values(ProportionStrategyNames));
  }

  get EqualShares() {
    return this.map.equalShares;
  }

  get NontaxableFirst() {
    return this.map.nontaxableFirst;
  }

  get TaxableFirst() {
    return this.map.taxableFirst;
  }

  get Custom() {
    return this.map.custom;
  }

  /**
   * @param {symbol} sym
   * @returns {ProportionStrategyName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid ProportionStrategy symbol: ${String(sym)}`);
    return /** @type {ProportionStrategyName} */ (name);
  }
}

const ProportionStrategy = new ProportionStrategyEnum();

/**
 * @typedef {typeof ProportionStrategy.EqualShares
 *         | typeof ProportionStrategy.NontaxableFirst
 *         | typeof ProportionStrategy.TaxableFirst
 *         | typeof ProportionStrategy.Custom} ProportionStrategySymbol
 */

class AccountPortioner {
  #ask = 0;

  /** @type {AccountingYear} */
  #accountYear;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  /** @type {RetirementIncomeCalculator} */
  #retirementIncomeCalculator;
  /** @type {number} */
  #trad401kWithdrawal = 0;

  get trad401kWithdrawal() {
    return this.#trad401kWithdrawal.asCurrency();
  }

  /** @type {number} */
  #savingsWithdrawal = 0;

  get savingsWithdrawal() {
    return this.#savingsWithdrawal.asCurrency();
  }

  /** @type {number} */
  #rothIraWithdrawal = 0;

  get rothIraWithdrawal() {
    return this.#rothIraWithdrawal.asCurrency();
  }

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {FixedIncomeStreams} incomeStreams
   * @param {RetirementIncomeCalculator} retirementIncomeCalculator
   */
  constructor(
    accountYear,
    fiscalData,
    demographics,
    incomeStreams,
    retirementIncomeCalculator
  ) {
    this.#accountYear = accountYear;
    this.#demographics = demographics;
    this.#fixedIncomeStreams = incomeStreams;
    this.#retirementIncomeCalculator = retirementIncomeCalculator;
    this.#fiscalData = fiscalData;
  }

  /**
   * @param {number} ask
   */
  calculatePortions(ask) {
    if (ask <= 0) return;

    const gross401kAvailable = this.#fiscalData.useTrad401k
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_401K)
      : 0;

    const savingsAvailable = this.#savingsAvailable();
    const tradRothAvailable = this.#tradRothAvailable();
    const actual401kAvailable =
      this.#determineActual401kFromGross(gross401kAvailable);

    let totalPoolAvailable =
      savingsAvailable + actual401kAvailable + tradRothAvailable;

    if (totalPoolAvailable <= 0) return;

    this.#ask = ask;

    const gross401kRMD = Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    );

    const actual401kRMD = this.#determineActual401kFromGross(gross401kRMD);

    let actual401kPortionOfAsk =
      ask * (actual401kAvailable / totalPoolAvailable);

    // ensure RMD is met
    if (actual401kRMD > actual401kPortionOfAsk.asCurrency()) {
      actual401kPortionOfAsk = actual401kRMD;
    }
    this.#trad401kWithdrawal = this.#determineGross401kFromActual(
      actual401kPortionOfAsk
    );

    ask -= actual401kPortionOfAsk.asCurrency();
    totalPoolAvailable = savingsAvailable + tradRothAvailable;

    if (totalPoolAvailable <= 0) return;
    if (ask <= 0) return;

    const savingsPortionOfAsk = ask * (savingsAvailable / totalPoolAvailable);
    this.#savingsWithdrawal = savingsPortionOfAsk;

    const rothPortionOfAsk = ask - savingsPortionOfAsk.asCurrency();
    this.#rothIraWithdrawal = rothPortionOfAsk;
  }

  #savingsAvailable() {
    return this.#fiscalData.useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  /**
   * @param {number} gross401kAmount
   * @returns {number}
   */
  #determineActual401kFromGross(gross401kAmount) {
    const flatRate = this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
    const taxWithheld = gross401kAmount * flatRate;
    const actual401kAmount = gross401kAmount - taxWithheld;

    return actual401kAmount;
  }

  /**
   * @param {number} actual401kAmount
   * @returns {number}
   */
  #determineGross401kFromActual(actual401kAmount) {
    /* Reverse calculation to find gross amount needed to yield actual amount after tax withholding
    
    G: Gross Amount
    W: Withholding Rate
    A: Actual Amount

    A = G - (G * W)
    A = G * (1 - W)

    Therefore,

    G = A / (1 - W)

    Or in terms of our variable names:
    
    grossAmt - (grossAmt * withholdingRate) = actual401kAmount
    grossAmt * (1 - withholdingRate) = actual401kAmount
    grossAmt = actual401kAmount / (1 - withholdingRate)
    */

    const withholdingRate = this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
    const gross401kAmount = actual401kAmount / (1 - withholdingRate);

    return gross401kAmount;
  }

  // #actual401kAvailable() {
  //   const gross401kAvailable = this.#fiscalData.useTrad401k
  //     ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_401K)
  //     : 0;

  //   const flatRate = this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
  //   const taxWithheld = gross401kAvailable * flatRate;
  //   const net401kAvailable = gross401kAvailable - taxWithheld;

  //   return net401kAvailable;
  // }

  // #actual401kPortion() {
  //   const net401kPortion =
  //     this.#totalAvailable() > 0
  //       ? this.#actual401kAvailable() / this.#totalAvailable()
  //       : 0;

  //   return net401kPortion;
  // }

  #tradRothAvailable() {
    return this.#fiscalData.useRoth
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_ROTH_IRA)
      : 0;
  }

  // #rothIraPortion() {
  //   return this.#totalAvailable() > 0
  //     ? this.#tradRothAvailable() / this.#totalAvailable()
  //     : 0;
  // }

  // #totalAvailable() {
  //   return (
  //     this.#savingsAvailable() +
  //     this.#actual401kAvailable() +
  //     this.#tradRothAvailable()
  //   );
  // }

  // get savingsPortion() {
  //   return (this.#savingsPortion() * this.#ask).asCurrency();
  // }

  // get trad401kPortion() {
  //   return (this.#actual401kPortion() * this.#ask).asCurrency();
  // }

  // get rothPortion() {
  //   return (this.#rothIraPortion() * this.#ask).asCurrency();
  // }

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {FixedIncomeStreams} incomeStreams
   * @param {RetirementIncomeCalculator} retirementIncomeCalculator
   * @returns {AccountPortioner}
   */
  static CreateFrom(
    accountYear,
    fiscalData,
    demographics,
    incomeStreams,
    retirementIncomeCalculator
  ) {
    const portioner = new AccountPortioner(
      accountYear,
      fiscalData,
      demographics,
      incomeStreams,
      retirementIncomeCalculator
    );
    return portioner;
  }

  // calculatePortions() {
  //   let ask = this.#fiscalData.spend;

  //   // estimated income from SS, pension, RMDs, etc. will reduce the "ask"
  //   const netFixedIncome = this.#fixedIncomeStreams.totalActualFixedIncome;

  //   ask = (ask - netFixedIncome).asCurrency();

  //   if (ask <= 0) {
  //     this.#ask = 0;
  //     return;
  //   }

  //   const rmd = Common.calculateRMD(
  //     this.#fiscalData.useRmd,
  //     this.#demographics.currentAge,
  //     this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
  //   );

  //   const available401k = this.#actual401kAvailable();

  //   // We know what the "ask" is, so we can interpolate the portions based on a binary search
  //   let lo = 0;
  //   let hi = Math.min(ask * 2, this.#actual401kAvailable());

  //   this.#ask = hi;
  //   const maximumIterations = 80;
  //   let guestimatedVariableIncomeNeeded = 0;

  //   let incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

  //   if (incomeBreakdown?.netIncome.asCurrency() < ask) {
  //     for (let i = 0; i < maximumIterations; i++) {
  //       this.#ask = (lo + hi) / 2;

  //       incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

  //       const netIncome = incomeBreakdown?.netIncome.asCurrency() ?? 0;

  //       if (netIncome == ask.asCurrency()) break;
  //       if (netIncome < ask) lo = guestimatedVariableIncomeNeeded;
  //       else hi = guestimatedVariableIncomeNeeded;
  //       if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
  //     }
  //   }
  // }

  // /** @param {number} variableIncomeAmount
  //  * @return {IncomeBreakdown}
  //  */
  // #calculateIncomeBreakdown(variableIncomeAmount) {
  //   const incomeStream =
  //     this.#retirementIncomeCalculator.calculateIncomeBreakdown(
  //       variableIncomeAmount,
  //       this.#incomeStreams
  //     );

  //   return incomeStream;
  // }
}

export { AccountPortioner };
