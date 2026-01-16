import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";

class AdjustableIncomeStreams {
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Inputs} */
  #inputs;
  /** @type {Demographics} */
  #demographics;

  /** @type {number} */
  #subject401kWithdrawalGross = 0;
  /** @type {number} */
  #spouse401kWithdrawalGross = 0;
  /** @type {number} */
  #savingsWithdrawal = 0;
  /** @type {number} */
  #subjectRothWithdrawalGross = 0;
  /** @type {number} */
  #spouseRothWithdrawalGross = 0;

  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   */
  constructor(demographics, accountYear, fiscalData, inputs) {
    this.#accountYear = accountYear;
    this.#inputs = inputs;
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;

    this._description = "AdjustableIncomeStreams";
  }

  get subject401kRMD() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    );
  }

  get spouse401kRMD() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAgeOfPartner,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.PARTNER_401K)
    );
  }

  get subjectActual401kGrossWithdrawal() {
    return this.#subject401kWithdrawalGross.asCurrency();
  }

  set subjectActual401kGrossWithdrawal(value) {
    this.#subject401kWithdrawalGross = value;
  }

  get subject401kWithholdings() {
    return (
      this.#inputs.flatTrad401kWithholdingRate *
      this.#subject401kWithdrawalGross
    ).asCurrency();
  }

  get subject401kActualIncome() {
    return (
      this.subjectActual401kGrossWithdrawal - this.subject401kWithholdings
    ).asCurrency();
  }

  get spouseActual401kGrossWithdrawal() {
    return this.#spouse401kWithdrawalGross.asCurrency();
  }

  set spouseActual401kGrossWithdrawal(value) {
    this.#spouse401kWithdrawalGross = value;
  }

  get spouse401kWithholdings() {
    return (
      this.#inputs.flatTrad401kWithholdingRate * this.#spouse401kWithdrawalGross
    ).asCurrency();
  }

  get spouse401kActualIncome() {
    return (
      this.spouseActual401kGrossWithdrawal - this.spouse401kWithholdings
    ).asCurrency();
  }

  get combined401kGrossWithdrawal() {
    return (
      this.subjectActual401kGrossWithdrawal +
      this.spouseActual401kGrossWithdrawal
    ).asCurrency();
  }

  get combined401kActualIncome() {
    return (
      this.subject401kActualIncome + this.spouse401kActualIncome
    ).asCurrency();
  }

  get savingsWithdrawal() {
    return this.#savingsWithdrawal.asCurrency();
  }

  set savingsWithdrawal(value) {
    this.#savingsWithdrawal = value;
    // should this trigger a recalculation of dependent values?
  }

  get subjectRothGrossWithdrawal() {
    return this.#subjectRothWithdrawalGross.asCurrency();
  }

  set subjectRothGrossWithdrawal(value) {
    this.#subjectRothWithdrawalGross = value;
  }

  get spouseRothGrossWithdrawal() {
    return this.#spouseRothWithdrawalGross.asCurrency();
  }

  set spouseRothGrossWithdrawal(value) {
    this.#spouseRothWithdrawalGross = value;
    // should this trigger a recalculation of dependent values?
  }

  get combinedRothGrossWithdrawal() {
    return (
      this.subjectRothGrossWithdrawal + this.spouseRothGrossWithdrawal
    ).asCurrency();
  }

  get combined401kWithdrawalsGross() {
    return this.#subject401kWithdrawalGross.asCurrency();
  }

  get grossIncomeSubjectToTaxation() {
    return this.combined401kWithdrawalsGross;
  }
}

export { AdjustableIncomeStreams };
