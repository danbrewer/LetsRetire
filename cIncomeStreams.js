import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";
import { TransactionCategory } from "./cTransaction.js";

class IncomeStreams {
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

  get wagesAndCompensation() {
    return this.#inputs.wagesandOtherTaxableCompensation.asCurrency();
  }

  get subjectPensionGross() {
    return this.#inputs.subjectPension.asCurrency();
  }

  get subjectPensionWithholdings() {
    return (
      this.#inputs.flatPensionWithholdingRate * this.#inputs.subjectPension
    ).asCurrency();
  }

  get subjectPensionIncome() {
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

  get subjectSsIncome() {
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

  get spousePensionIncome() {
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

  get spouseSsIncome() {
    return this.spouseSsGross - this.spouseSsWithholdings;
  }

  get subjectRMD() {
    return Common.calculateRMD(
      this.#fiscalData.useRmd,
      this.#demographics.currentAge,
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.TRAD_401K)
    );
  }

  get miscTaxableIncome() {
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
   * @returns {IncomeStreams} New IncomeStreams instance
   */
  static CreateUsing(demographics, accountYear, fiscalData, inputs) {
    const rmd = Common.calculateRMD(
      fiscalData.useRmd,
      demographics.currentAge,
      accountYear.getStartingBalance(ACCOUNT_TYPES.TRAD_401K)
    );

    return new IncomeStreams(demographics, accountYear, fiscalData, inputs);
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
      this.wagesAndCompensation +
      this.subjectPensionGross +
      this.spousePensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.subjectRMD +
      this.subjectSsGross +
      this.spouseSsGross +
      this.taxFreeIncomeAdjustment
    );
  }

  get taxableIncome() {
    return (
      this.wagesAndCompensation +
      this.subjectPensionGross +
      this.spousePensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.subjectRMD +
      this.subjectSsGross +
      this.spouseSsGross
    );
  }

  get ssIncome() {
    return this.subjectSsGross + this.spouseSsGross;
  }

  get pensionIncome() {
    return this.subjectPensionGross + this.spousePensionGross;
  }

  get nonSsIncome() {
    return (
      this.subjectPensionGross +
      this.spousePensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.subjectRMD
    );
  }

  // Utility methods for income stream management
  get hasSocialSecurityIncome() {
    return this.ssIncome > 0;
  }

  get hasPensionIncome() {
    return this.pensionIncome > 0;
  }

  get hasRmdIncome() {
    return this.subjectRMD > 0;
  }

  get incomeBreakdown() {
    return {
      wagesAndCompensation: this.wagesAndCompensation,
      pension: this.pensionIncome,
      socialSecurity: this.ssIncome,
      rmd: this.subjectRMD,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncome,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

export { IncomeStreams };
