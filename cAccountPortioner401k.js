import { Common } from "./cCommon.js";
import { FiscalData } from "./cFiscalData.js";
import { Trad401kAvailabilityManager } from "./cTrad401kAvailabilityManager.js";

class AccountPortioner401k {
  /** @type {Trad401kAvailabilityManager} */
  #trad401kFunds;
  /** @type {number} */
  #ask;
  /** @type {number} */
  #totalFundsAvailable;
  /** @type {FiscalData} */
  #fiscalData;

  /**
   * @param {Trad401kAvailabilityManager} trad401kFunds
   * @param {number} ask
   * @param {number} totalFundsAvailable
   * @param {FiscalData} fiscalData
   */
  constructor(trad401kFunds, ask, totalFundsAvailable, fiscalData) {
    this.#trad401kFunds = trad401kFunds;
    this.#ask = ask;
    this.#totalFundsAvailable = totalFundsAvailable;
    this.#fiscalData = fiscalData;
  }

  get #percentageOfTotalAllocatedSpendFundsThatIsActualized401k() {
    if (this.#totalFundsAvailable === 0) return 0;
    return (
      this.#trad401kFunds.combined401kTakehomeAvailable /
      this.#totalFundsAvailable
    );
  }

  get #actualized401kPortionOfAsk() {
    return (
      this.#ask * this.#percentageOfTotalAllocatedSpendFundsThatIsActualized401k
    ).asCurrency();
  }

  get #subjectActualizedPortionOf401kAsk() {
    return (
      this.#actualized401kPortionOfAsk * this.#trad401kFunds.subjectPortion
    ).asCurrency();
  }

  get #partnerActualizedPortionOf401kAsk() {
    return (
      this.#actualized401kPortionOfAsk - this.#subjectActualizedPortionOf401kAsk
    ).asCurrency();
  }

  get subjectFinalWithdrawalNet() {
    return Math.max(
      this.#subjectActualizedPortionOf401kAsk,
      this.#trad401kFunds.subject401kRMDActualized
    ).asCurrency();
  }

  get subjectFinalWithdrawalGross() {
    return Common.convertActual401kToGross401k(
      this.subjectFinalWithdrawalNet,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    ).asCurrency();
  }

  get partnerFinalWithdrawalNet() {
    return Math.max(
      this.#partnerActualizedPortionOf401kAsk,
      this.#trad401kFunds.partner401kRMDActualized
    ).asCurrency();
  }

  get partnerFinalWithdrawalGross() {
    return Common.convertActual401kToGross401k(
      this.partnerFinalWithdrawalNet,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    ).asCurrency();
  }

  get combinedFinalWithdrawalGross() {
    return (
      this.subjectFinalWithdrawalGross + this.partnerFinalWithdrawalGross
    ).asCurrency();
  }

  get combinedFinalWithdrawalNet() {
    return this.subjectFinalWithdrawalNet + this.partnerFinalWithdrawalNet;
    return Common.convertGross401kToActual401k(
      this.combinedFinalWithdrawalGross,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    ).asCurrency();
  }
}

export { AccountPortioner401k };
