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

  /** @type {number} */
  #totalActualWithdrawals = 0;

  get totalActualWithdrawals() {
    return this.#totalActualWithdrawals;
  }

  get trad401kGrossWithdrawal() {
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

    const trad401kBalance = this.#fiscalData.useTrad401k
      ? this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
      : 0;
    const flat401kWithholdingRate =
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0;

    const availableSavings = this.#savingsAvailable();
    const availableRoth = this.#tradRothAvailable();
    const availableActualized401k = Common.determineActual401kFromGross(
      trad401kBalance,
      flat401kWithholdingRate
    );
    let totalFundsAvailable =
      availableSavings + availableActualized401k + availableRoth;

    if (totalFundsAvailable <= 0) return;

    // Satisfy any RMD requirement
    const gross401kRMD = Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    );
    const actualized401kRMD = Common.determineActual401kFromGross(
      gross401kRMD,
      flat401kWithholdingRate
    );

    const pctThatIsActualized401k =
      availableActualized401k / totalFundsAvailable;
    let actualized401kPortionOfAsk = ask * pctThatIsActualized401k;

    // Take the higher of the calculated portion or the RMD amount to
    const actualized401kPortion = Math.max(
      actualized401kPortionOfAsk,
      actualized401kRMD
    );

    const withdrawFrom401kGross = Common.determineGross401kFromActual(
      actualized401kPortion,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );
    this.#trad401kWithdrawal = withdrawFrom401kGross;

    ask -= actualized401kPortion.asCurrency();

    totalFundsAvailable = availableSavings + availableRoth;
    const pctThatIsSavings = availableSavings / totalFundsAvailable;
    const pctThatIsRoth = availableRoth / totalFundsAvailable;

    if (totalFundsAvailable <= 0) return;
    if (ask <= 0) return;

    const withdrawFromSavings = ask * pctThatIsSavings;
    this.#savingsWithdrawal = withdrawFromSavings;

    const withdrawFromRoth = ask * pctThatIsRoth;
    this.#rothIraWithdrawal = withdrawFromRoth;

    this.#totalActualWithdrawals =
      actualized401kPortion + withdrawFromSavings + withdrawFromRoth;
  }

  #savingsAvailable() {
    return this.#fiscalData.useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
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
