import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
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
  // /** @type {RetirementIncomeCalculator} */
  // #retirementIncomeCalculator;
  /** @type {number} */
  #subject401kGrossWithdrawal = 0;
  /** @type {number} */
  #partner401kGrossWithdrawal = 0;
  /** @type {number} */
  #combined401kGrossWithdrawal = 0;

  /** @type {number} */
  #totalActualWithdrawals = 0;

  get totalActualWithdrawals() {
    return this.#totalActualWithdrawals;
  }

  get combined401kGrossWithdrawal() {
    return (
      this.#subject401kGrossWithdrawal.asCurrency() +
      this.#partner401kGrossWithdrawal.asCurrency()
    );
  }

  get subject401kGrossWithdrawal() {
    return this.#subject401kGrossWithdrawal.asCurrency();
  }

  get partner401kGrossWithdrawal() {
    return this.#partner401kGrossWithdrawal.asCurrency();
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
   */
  constructor(
    accountYear,
    fiscalData,
    demographics,
    incomeStreams
    // retirementIncomeCalculator
  ) {
    this.#accountYear = accountYear;
    this.#demographics = demographics;
    this.#fixedIncomeStreams = incomeStreams;
    this.#fiscalData = fiscalData;
  }

  #analyze401kFunds() {
    const flat401kWithholdingRate =
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0;

    const subject401kBalance = this.#fiscalData.useTrad401k
      ? this.#accountYear
          .getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
          .asCurrency()
      : 0;
    let a = this.#demographics.isPartnerEligibleForPension;
    const partner401kBalance = this.#demographics.isPartnerEligibleFor401k
      ? this.#fiscalData.useTrad401k
        ? this.#accountYear
            .getStartingBalance(ACCOUNT_TYPES.SPOUSE_401K)
            .asCurrency()
        : 0
      : 0;

    const combined401kBalance = subject401kBalance + partner401kBalance;

    const subject401kBalanceActualized = Common.convertGross401kToActual401k(
      subject401kBalance,
      flat401kWithholdingRate
    ).asCurrency();
    const partner401kBalanceActualized = Common.convertGross401kToActual401k(
      partner401kBalance,
      flat401kWithholdingRate
    ).asCurrency();
    // Satisfy any RMD requirement
    const grossSubject401kRMD = Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    );
    const subject401kRMDActualized = Common.convertGross401kToActual401k(
      grossSubject401kRMD,
      flat401kWithholdingRate
    ).asCurrency();

    const grossPartner401kRMD = Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAgeOfPartner,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SPOUSE_401K)
    ).asCurrency();
    const partner401kRMDActualized = Common.convertGross401kToActual401k(
      grossPartner401kRMD,
      flat401kWithholdingRate
    ).asCurrency();

    return {
      subject401kBalance,
      partner401kBalance,
      combined401kBalance: subject401kBalance + partner401kBalance,
      subject401kBalanceActualized,
      partner401kBalanceActualized,
      combined401kBalanceActualized:
        subject401kBalanceActualized + partner401kBalanceActualized,
      subject401kRMD: grossSubject401kRMD,
      partner401kRMD: grossPartner401kRMD,
      combined401kRMD: grossSubject401kRMD + grossPartner401kRMD,
      subject401kRMDActualized,
      partner401kRMDActualized,
      combined401kRMDActualized:
        subject401kRMDActualized + partner401kRMDActualized,
      subjectPortion:
        combined401kBalance > 0 ? subject401kBalance / combined401kBalance : 0,
      partnerPortion:
        combined401kBalance > 0 ? partner401kBalance / combined401kBalance : 0,
    };
  }

  /**
   * @param {number} ask
   */
  calculatePortions(ask) {
    if (ask <= 0) return;

    const availableSavings = this.#savingsAvailable();
    const availableRoth = this.#tradRothAvailable();
    const trad401kFunds = this.#analyze401kFunds();

    let totalFundsAvailable =
      availableSavings +
      trad401kFunds.combined401kBalanceActualized +
      availableRoth;

    totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

    const final401kPortions = this.#determineFinal401kPortions(
      trad401kFunds,
      ask,
      totalFundsAvailable
    );

    ask -= final401kPortions.combinedFinalActualWithdrawal.asCurrency();

    ask = Math.max(ask, 0).asCurrency();

    totalFundsAvailable = availableSavings + availableRoth;
    totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

    const pctThatIsSavings =
      totalFundsAvailable > 0 ? availableSavings / totalFundsAvailable : 0;
    const pctThatIsRoth =
      totalFundsAvailable > 0 ? availableRoth / totalFundsAvailable : 0;

    const withdrawFromSavings = ask * pctThatIsSavings;
    this.#savingsWithdrawal = withdrawFromSavings;

    const withdrawFromRoth = ask * pctThatIsRoth;
    this.#rothIraWithdrawal = withdrawFromRoth;

    this.#subject401kGrossWithdrawal =
      final401kPortions.subjectFinalGrossWithdrawal.asCurrency();
    this.#partner401kGrossWithdrawal =
      final401kPortions.partnerFinalGrossWithdrawal.asCurrency();
    this.#combined401kGrossWithdrawal =
      final401kPortions.combinedFinalGrossWithdrawal.asCurrency();

    this.#totalActualWithdrawals =
      final401kPortions.combinedFinalActualWithdrawal +
      withdrawFromSavings +
      withdrawFromRoth;
  }

  /**
   * @param {{ combined401kBalanceActualized: number; subjectPortion: number; subject401kRMDActualized: number; partner401kRMDActualized: number; }} trad401kFunds
   * @param {number} ask
   * @param {number} totalFundsAvailable
   */
  #determineFinal401kPortions(trad401kFunds, ask, totalFundsAvailable) {
    const result = {};

    result.percentageOfTotalFundsThatIsActualized401k =
      trad401kFunds.combined401kBalanceActualized / totalFundsAvailable;

    result.actualized401kPortionOfAsk = (
      ask * result.percentageOfTotalFundsThatIsActualized401k
    ).asCurrency();

    result.subjectActualizedPortionOf401kAsk = (
      result.actualized401kPortionOfAsk * trad401kFunds.subjectPortion
    ).asCurrency();

    result.partnerActualizedPortionOf401kAsk = (
      result.actualized401kPortionOfAsk -
      result.subjectActualizedPortionOf401kAsk
    ).asCurrency();

    result.subjectFinalActualPortion = Math.max(
      result.subjectActualizedPortionOf401kAsk,
      trad401kFunds.subject401kRMDActualized
    );

    result.subjectFinalGrossWithdrawal = Common.convertActual401kToGross401k(
      result.subjectFinalActualPortion,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    result.partnerFinalActualPortion = Math.max(
      result.partnerActualizedPortionOf401kAsk,
      trad401kFunds.partner401kRMDActualized
    );
    result.partnerFinalGrossWithdrawal = Common.convertActual401kToGross401k(
      result.partnerFinalActualPortion,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    result.combinedFinalGrossWithdrawal =
      result.subjectFinalGrossWithdrawal + result.partnerFinalGrossWithdrawal;
    result.combinedFinalActualWithdrawal = Common.convertGross401kToActual401k(
      result.combinedFinalGrossWithdrawal,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    ).asCurrency();

    return result;
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
   * @returns {AccountPortioner}
   */
  static CreateFrom(accountYear, fiscalData, demographics, incomeStreams) {
    const portioner = new AccountPortioner(
      accountYear,
      fiscalData,
      demographics,
      incomeStreams
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
