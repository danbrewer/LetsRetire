import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";

class Trad401kAvailabilityManager {
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Inputs} */
  #inputs;

  /**
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   * @param {Inputs} inputs
   */
  constructor(fiscalData, demographics, accountYear, inputs) {
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#inputs = inputs;
  }

  get #flat401kWithholdingRate() {
    return this.#fiscalData.flatTrad401kWithholdingRate ?? 0;
  }

  get #subject401kBalance() {
    const balance =
      this.#fiscalData.useTrad401k &&
      this.#demographics.isSubjectEligibleFor401k
        ? this.#accountYear
            .getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
            .asCurrency()
        : 0;

    return balance;
  }

  get #subject401kGrossAvailable() {
    const withdrawalCap =
      this.#inputs.withdrawalCaps?.trad401kLimit ?? Infinity;
    const actualAvailable = this.#subject401kBalance;
    return Math.min(actualAvailable, withdrawalCap);
  }

  get #partner401kBalance() {
    const balance =
      this.#fiscalData.useTrad401k &&
      this.#demographics.isPartnerEligibleFor401k
        ? this.#accountYear
            .getStartingBalance(ACCOUNT_TYPES.PARTNER_401K)
            .asCurrency()
        : 0;

    return balance;
  }

  get #partner401kGrossAvailable() {
    const withdrawalCap =
      this.#inputs.withdrawalCaps?.trad401kLimit ?? Infinity;
    const actualAvailable = this.#partner401kBalance;

    return Math.min(actualAvailable, withdrawalCap);
  }

  get #combined401kBalance(){
    return this.#subject401kBalance + this.#partner401kBalance; 
  }

  get subject401kGrossAvailable() {
    return this.#subject401kGrossAvailable;
    const actualAvailable =
      this.#fiscalData.useTrad401k &&
      this.#demographics.isSubjectEligibleFor401k
        ? this.#accountYear
            .getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
            .asCurrency()
        : 0;

    return actualAvailable;
  }

  get subject401kTakeHomeAvailable() {
    return Common.convertGross401kToActual401k(
      this.#subject401kGrossAvailable,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get partner401kGrossAvailable() {
    return this.#partner401kGrossAvailable;
  }

  get partner401kTakeHomeAvailable() {
    return Common.convertGross401kToActual401k(
      this.#partner401kGrossAvailable,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get subject401kRMDGross() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#subject401kBalance
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
      this.#partner401kBalance
    ).asCurrency();
  }

  get partner401kRMDActualized() {
    return Common.convertGross401kToActual401k(
      this.partner401kRMDGross,
      this.#flat401kWithholdingRate
    ).asCurrency();
  }

  get combined401kGrossAvailable() {
    return this.#subject401kGrossAvailable + this.#partner401kGrossAvailable;
  }

  get combined401kTakehomeAvailable() {
    return (
      this.subject401kTakeHomeAvailable + this.partner401kTakeHomeAvailable
    );
  }

  get combined401kRMDActualized() {
    return this.subject401kRMDActualized + this.partner401kRMDActualized;
  }

  get subjectPortion() {
    return this.#combined401kBalance > 0
      ? this.#subject401kBalance / this.#combined401kBalance
      : 0;
  }

  get partnerPortion() {
    return this.#combined401kBalance > 0
      ? this.#partner401kBalance / this.#combined401kBalance
      : 0;
  }
}

export { Trad401kAvailabilityManager as Trad401kAvailabilityManager };
