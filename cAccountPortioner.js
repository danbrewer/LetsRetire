import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { EnumBase } from "./cEnum.js";
import { Trad401kAvailabilityManager } from "./cTrad401kAvailabilityManager.js";
import { AccountPortioner401k } from "./cAccountPortioner401k.js";
import { TransactionCategory } from "./cTransaction.js";

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

  /** @type {number} */
  #totalActualWithdrawals = 0;

  /** @type {Trad401kAvailabilityManager} */
  #trad401kAccountPortioner;

  /** @type {AccountPortioner401k | null} */
  #final401kPortions = null;

  get totalActualWithdrawals() {
    return this.#totalActualWithdrawals;
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
   */
  constructor(accountYear, fiscalData, demographics) {
    this.#accountYear = accountYear;
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
    this.#trad401kAccountPortioner = new Trad401kAvailabilityManager(
      this.#fiscalData,
      this.#demographics,
      this.#accountYear
    );
  }

  get trad401kAccountPortions() {
    return this.#final401kPortions;
  }

  /**
   * @param {number} ask
   */
  calculatePortions(ask) {
    if (ask <= 0) return;

    let totalFundsAvailable =
      this.#availableSavings +
      this.#trad401kAccountPortioner.combined401kAllocatedForSpend +
      this.#availableRoth;

    totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

    this.#final401kPortions = this.#determineFinal401kPortions(
      this.#trad401kAccountPortioner,
      ask,
      totalFundsAvailable
    );

    ask -= this.#final401kPortions.combinedFinalWithdrawalNet.asCurrency();

    ask = Math.max(ask, 0).asCurrency();

    totalFundsAvailable = this.#availableSavings + this.#availableRoth;
    totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

    const pctThatIsSavings =
      totalFundsAvailable > 0
        ? this.#availableSavings / totalFundsAvailable
        : 0;
    const pctThatIsRoth =
      totalFundsAvailable > 0 ? this.#availableRoth / totalFundsAvailable : 0;

    const withdrawFromSavings = ask * pctThatIsSavings;
    this.#savingsWithdrawal = withdrawFromSavings;

    const withdrawFromRoth = ask * pctThatIsRoth;
    this.#rothIraWithdrawal = withdrawFromRoth;

    const withdrawFrom401k =
      this.#final401kPortions?.combinedFinalWithdrawalNet ?? 0;

    this.#totalActualWithdrawals =
      withdrawFrom401k + withdrawFromSavings + withdrawFromRoth;
  }

  /**
   * @param {Trad401kAvailabilityManager} trad401kFunds
   * @param {number} ask
   * @param {number} totalFundsAvailable
   */
  #determineFinal401kPortions(trad401kFunds, ask, totalFundsAvailable) {
    const result = new AccountPortioner401k(
      trad401kFunds,
      ask,
      totalFundsAvailable,
      this.#fiscalData
    );

    return result;
  }

  #savingsAvailable() {
    return this.#fiscalData.useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  get #availableSavings() {
    return this.#savingsAvailable();
  }

  get #availableRoth() {
    return this.#tradRothAvailable();
  }

  #tradRothAvailable() {
    if (this.#demographics.isSubjectEligibleFor401k === false) return 0;

    if (!this.#fiscalData.useRoth) return 0;

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
   * @returns {AccountPortioner}
   */
  static CreateFrom(accountYear, fiscalData, demographics) {
    const portioner = new AccountPortioner(
      accountYear,
      fiscalData,
      demographics
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
