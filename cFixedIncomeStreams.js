import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { Inputs } from "./cInputs.js";
import {
  EMPLOYEE_401K_CATCHUP_50,
  EMPLOYEE_401K_LIMIT_2025,
} from "./consts.js";
import { TransactionCategory } from "./cTransaction.js";

class FixedIncomeStreams {
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Inputs} */
  #inputs;
  /** @type {Demographics} */
  #demographics;

  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {Inputs} inputs - Input data object containing tax adjustments
   */

  constructor(demographics, accountYear, inputs) {
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#inputs = inputs;
    this._description = "FixedIncomeStreams";
  }

  /**
   * Calculates the elective scaling factor to ensure contributions don't exceed IRS limits.
   *
   * This method determines what percentage of desired contributions can actually be made
   * based on annual contribution limits and catch-up provisions for employees 50+.
   *
   * @returns {number} Scaling factor (0-1) to apply to desired contributions
   */
  _getElectiveScale() {
    // Use global constants if available, otherwise use 2025 values as defaults
    const baseLimit =
      typeof EMPLOYEE_401K_LIMIT_2025 !== "undefined"
        ? EMPLOYEE_401K_LIMIT_2025
        : 23000;
    const catchupLimit =
      typeof EMPLOYEE_401K_CATCHUP_50 !== "undefined"
        ? EMPLOYEE_401K_CATCHUP_50
        : 7500;

    let maximumContributionAllowed =
      baseLimit + (this.#demographics.currentAge >= 50 ? catchupLimit : 0);
    const totalDesiredContribution =
      this._desired401kContribution + this._desiredRothContribution;
    let scale =
      totalDesiredContribution > 0
        ? Math.min(1, maximumContributionAllowed / totalDesiredContribution)
        : 1;
    return scale;
  }

  /**
   * Calculates the desired pretax 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired pretax contribution amount as currency
   */
  get _desired401kContribution() {
    return (
      this.#inputs.subjectSalary * this.#inputs.subject401kContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the desired Roth 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired Roth contribution amount as currency
   */
  get _desiredRothContribution() {
    return (
      this.#inputs.subjectSalary * this.#inputs.subjectRothContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the actual pretax 401k contribution after applying IRS limits.
   *
   * @returns {number} Capped pretax contribution amount as currency
   */
  get allowed401kContribution() {
    return (
      this._desired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get allowedRothContribution() {
    return (
      this._desiredRothContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get nonTaxableBenefits() {
    return this.#inputs.benefitsNonTaxable.asCurrency();
  }

  get wagesAndCompensationGross() {
    return (
      this.#inputs.subjectSalary + this.#inputs.taxableIncomeAdjustment
    ).asCurrency();
  }

  get wagesAndCompensationNonTaxable() {
    return (
      this.#inputs.subjectGrossSalaryReductions +
      this.allowed401kContribution +
      this.#inputs.benefitsNonTaxable
    );
  }

  get wagesAndCompensationTaxable() {
    return (
      this.wagesAndCompensationGross - this.wagesAndCompensationNonTaxable
    ).asCurrency();
  }

  get wagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate * this.wagesAndCompensationTaxable
    ).asCurrency();
  }

  get wagesAndCompensationActualIncome() {
    return (
      this.wagesAndCompensationTaxable -
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

  get partnerPensionWithholdings() {
    return (
      this.#inputs.flatPensionWithholdingRate * this.#inputs.spousePension
    ).asCurrency();
  }

  get partnerPensionActualIncome() {
    return this.spousePensionGross - this.partnerPensionWithholdings;
  }

  get partnerSsGross() {
    return this.#inputs.spouseSs.asCurrency();
  }

  get partnerSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.#inputs.spouseSs
    ).asCurrency();
  }

  get partnerSsActualIncome() {
    return this.partnerSsGross - this.partnerSsWithholdings;
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
   * @param {Inputs} inputs - Input data object containing tax adjustments
   * @returns {FixedIncomeStreams} New FixedIncomeStreams instance
   */
  static CreateUsing(demographics, accountYear, inputs) {
    return new FixedIncomeStreams(demographics, accountYear, inputs);
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
      this.wagesAndCompensationTaxable +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.combinedSsGross
    );
  }

  get taxableIncome() {
    return (
      this.wagesAndCompensationTaxable +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.combinedSsGross
    );
  }

  get combinedSsGross() {
    return this.subjectSsGross + this.partnerSsGross;
  }

  get combinedGrossSsWithholdings() {
    return this.subjectSsWithholdings + this.partnerSsWithholdings;
  }

  get combinedSsActualIncome() {
    return this.subjectSsActualIncome + this.partnerSsActualIncome;
  }

  get combinedPensionGross() {
    return this.subjectPensionGross + this.spousePensionGross;
  }

  get combinedPensionWithholdings() {
    return this.subjectPensionWithholdings + this.partnerPensionWithholdings;
  }

  get combinedPensionActualIncome() {
    return this.subjectPensionActualIncome + this.partnerPensionActualIncome;
  }

  get nonSsGrossIncome() {
    return (
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.wagesAndCompensationTaxable
    );
  }

  get totalActualFixedIncome() {
    const total =
      this.combinedPensionActualIncome +
      this.combinedSsActualIncome +
      this.wagesAndCompensationActualIncome;
    return total.asCurrency();
  }

  get fixedIncomeBreakdown() {
    return {
      wagesAndCompensation: this.wagesAndCompensationTaxable,
      pension: this.combinedPensionGross,
      socialSecurity: this.combinedSsGross,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncomeWithNoWithholdings,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

export { FixedIncomeStreams };
