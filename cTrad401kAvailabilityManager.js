import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";

class Trad401kAvailabilityManager {
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;
  /** @type {AccountingYear} */
  #accountYear;

  /**
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   */
  constructor(fiscalData, demographics, accountYear) {
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;
  }

  get #flat401kWithholdingRate() {
    return this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
  }

  get subject401kGrossAvailable() {
    return this.#fiscalData.useTrad401k &&
      this.#demographics.isSubjectEligibleFor401k
      ? this.#accountYear
          .getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
          .asCurrency()
      : 0;
  }

  get subject401kTakeHomeAvailable() {
    return Common.convertGross401kToActual401k(
      this.subject401kGrossAvailable,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get partner401kGrossAvailable() {
    return this.#fiscalData.useTrad401k &&
      this.#demographics.isPartnerEligibleFor401k
      ? this.#fiscalData.useTrad401k
        ? this.#accountYear
            .getStartingBalance(ACCOUNT_TYPES.PARTNER_401K)
            .asCurrency()
        : 0
      : 0;
  }

  get partner401kTakeHomeAvailable() {
    return Common.convertGross401kToActual401k(
      this.partner401kGrossAvailable,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get subject401kRMDGross() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    ).asCurrency();
  }

  get subject401kRMDActualized() {
    return Common.convertGross401kToActual401k(
      this.subject401kRMDGross,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get partner401kRMDGross() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAgeOfPartner,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.PARTNER_401K)
    ).asCurrency();
  }

  get partner401kRMDActualized() {
    return Common.convertGross401kToActual401k(
      this.partner401kRMDGross,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get combined401kGrossAvailable() {
    return this.subject401kGrossAvailable + this.partner401kGrossAvailable;
  }

  get combined401kTakehomeAvailable() {
    return (
      this.subject401kTakeHomeAvailable + this.partner401kTakeHomeAvailable
    );
  }

  get combined401kRMDActualized() {
    return this.subject401kRMDActualized + this.partner401kRMDActualized;
  }

  get combined401kRMDGross() {
    return this.subject401kRMDGross + this.partner401kRMDGross;
  }

  get subjectPortion() {
    return this.combined401kGrossAvailable > 0
      ? this.subject401kGrossAvailable / this.combined401kGrossAvailable
      : 0;
  }

  get partnerPortion() {
    return this.combined401kGrossAvailable > 0
      ? this.partner401kGrossAvailable / this.combined401kGrossAvailable
      : 0;
  }
}

export { Trad401kAvailabilityManager as Trad401kAvailabilityManager };
