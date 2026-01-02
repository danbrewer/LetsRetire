import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";
import { TransactionCategory } from "./cTransaction.js";

class FixedIncomeStreams {
  /** @type {AccountingYear} */
  #accountYear;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Inputs} */
  #inputs;

  /** @type {Demographics} */
  #demographics;

  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   */

  constructor(demographics, accountYear, fiscalData, inputs) {
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#fiscalData = fiscalData;
    this.#inputs = inputs;

    this._description = "IncomeStreams";
  }

  get wagesAndCompensationGross() {
    return this.#inputs.taxableWagesandOtherTaxableCompensation.asCurrency();
  }

  get wagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate *
      this.#inputs.taxableWagesandOtherTaxableCompensation
    ).asCurrency();
  }

  get wagesAndCompensationActualIncome() {
    return (
      this.wagesAndCompensationGross -
      this.wagesAndCompensationEstimatedWithholdings
    ).asCurrency();
  }

  get trad401kWithholdingRate() {
    return this.#inputs.flatTrad401kWithholdingRate;
  }

  get subjectPensionGross() {
    return this.#inputs.subjectPension.asCurrency();
  }

  get subjectPensionWithholdings() {
    return (
      this.#inputs.flatPensionWithholdingRate * this.#inputs.subjectPension
    ).asCurrency();
  }

  get subjectPensionActualIncome() {
    return this.subjectPensionGross - this.subjectPensionWithholdings;
  }

  get subjectSsGross() {
    return this.#inputs.subjectSs.asCurrency();
  }

  get subjectSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.#inputs.subjectSs
    ).asCurrency();
  }

  get subjectSsActualIncome() {
    return this.subjectSsGross - this.subjectSsWithholdings;
  }

  get spousePensionGross() {
    return this.#inputs.spousePension.asCurrency();
  }

  get spousePensionWithholdings() {
    return (
      this.#inputs.flatPensionWithholdingRate * this.#inputs.spousePension
    ).asCurrency();
  }

  get spousePensionActualIncome() {
    return this.spousePensionGross - this.spousePensionWithholdings;
  }

  get spouseSsGross() {
    return this.#inputs.spouseSs.asCurrency();
  }

  get spouseSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.#inputs.spouseSs
    ).asCurrency();
  }

  get spouseSsActualIncome() {
    return this.spouseSsGross - this.spouseSsWithholdings;
  }

  get miscTaxableIncomeWithNoWithholdings() {
    return this.#inputs.taxableIncomeAdjustment.asCurrency();
  }

  get taxFreeIncomeAdjustment() {
    return this.#inputs.taxFreeIncomeAdjustment.asCurrency();
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {FiscalData} fiscalData - Instance of FiscalData class
   * @param {Inputs} inputs - Input data object containing tax adjustments
   * @returns {FixedIncomeStreams} New IncomeStreams instance
   */
  static CreateUsing(demographics, accountYear, fiscalData, inputs) {
    const rmd = Common.calculateRMD(
      fiscalData.useRmd,
      demographics.currentAge,
      accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
    );

    return new FixedIncomeStreams(
      demographics,
      accountYear,
      fiscalData,
      inputs
    );
  }

  get interestEarnedOnSavings() {
    return (
      this.#accountYear
        ?.getDeposits(ACCOUNT_TYPES.SAVINGS, TransactionCategory.Interest)
        .asCurrency() ?? 0
    );
  }

  get grossTaxableIncome() {
    return (
      this.wagesAndCompensationGross +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.combinedSsGross
    );
  }

  get taxableIncome() {
    return (
      this.wagesAndCompensationGross +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.combinedSsGross
    );
  }

  get combinedSsGross() {
    return this.subjectSsGross + this.spouseSsGross;
  }

  get combinedGrossSsWithholdings() {
    return this.subjectSsWithholdings + this.spouseSsWithholdings;
  }

  get combinedSsActualIncome() {
    return this.subjectSsActualIncome + this.spouseSsActualIncome;
  }

  get combinedPensionGross() {
    return this.subjectPensionGross + this.spousePensionGross;
  }

  get combinedPensionWithholdings() {
    return this.subjectPensionWithholdings + this.spousePensionWithholdings;
  }

  get combinedPensionActualIncome() {
    return this.subjectPensionActualIncome + this.spousePensionActualIncome;
  }

  get nonSsGrossIncome() {
    return (
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.wagesAndCompensationGross
    );
  }

  get totalActualFixedIncome() {
    const total =
      this.combinedPensionActualIncome +
      this.combinedSsActualIncome +
      this.wagesAndCompensationActualIncome;
    return total.asCurrency();
  }

  get incomeBreakdown() {
    return {
      wagesAndCompensation: this.wagesAndCompensationGross,
      pension: this.combinedPensionGross,
      socialSecurity: this.combinedSsGross,
      // rmd: this.subjectRMD,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncomeWithNoWithholdings,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

export { FixedIncomeStreams };
