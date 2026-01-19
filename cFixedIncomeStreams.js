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
      this.#subjectDesired401kContribution +
      this.#subjectDesiredRothContribution;
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
  get #subjectDesired401kContribution() {
    return (
      this.#inputs.subjectSalary * this.#inputs.subject401kContributionRate
    ).asCurrency();
  }

  get #partnerDesired401kContribution() {
    return (
      this.#inputs.partnerSalary * this.#inputs.partner401kContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the desired Roth 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired Roth contribution amount as currency
   */
  get #subjectDesiredRothContribution() {
    return (
      this.#inputs.subjectSalary * this.#inputs.subjectRothContributionRate
    ).asCurrency();
  }

  get #partnerDesiredRothContribution() {
    return (
      this.#inputs.partnerSalary * this.#inputs.partnerRothContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the actual pretax 401k contribution after applying IRS limits.
   *
   * @returns {number} Capped pretax contribution amount as currency
   */
  get subjectAllowed401kContribution() {
    return (
      this.#subjectDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get subjectNonTaxableSalaryReductions() {
    return this.#inputs.subjectNonTaxableSalaryReductions.asCurrency();
  }

  get partnerNonTaxableSalaryReductions() {
    return this.#inputs.partnerNonTaxableSalaryReductions.asCurrency();
  }

  get partnerAllowed401kContribution() {
    return (
      this.#partnerDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get subjectAllowedRothContribution() {
    return (
      this.#subjectDesiredRothContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get partnerAllowedRothContribution() {
    return (
      this.#partnerDesiredRothContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get nonTaxableBenefits() {
    return this.#inputs.subjectNonTaxableSalaryReductions.asCurrency();
  }

  get subjectWagesAndCompensationGross() {
    return this.#inputs.subjectSalary.asCurrency();
  }

  get partnerWagesAndCompensationGross() {
    return this.#inputs.partnerSalary.asCurrency();
  }

  get combinedWagesAndCompensationGross() {
    return (
      this.subjectWagesAndCompensationGross +
      this.partnerWagesAndCompensationGross +
      this.#inputs.taxableIncomeAdjustment
    ).asCurrency();
  }

  get subjectWagesAndCompensationNonTaxable() {
    return (
      this.subjectAllowed401kContribution +
      this.#inputs.subjectNonTaxableSalaryReductions
    ).asCurrency();
  }

  get partnerWagesAndCompensationNonTaxable() {
    return (
      this.partnerAllowed401kContribution +
      this.#inputs.partnerNonTaxableSalaryReductions
    ).asCurrency();
  }

  get combinedWagesAndCompensationNonTaxable() {
    return (
      this.subjectWagesAndCompensationNonTaxable +
      this.partnerWagesAndCompensationNonTaxable
    ).asCurrency();
  }

  get combinedWagesAndCompensationTaxable() {
    return (
      this.combinedWagesAndCompensationGross -
      this.combinedWagesAndCompensationNonTaxable
    ).asCurrency();
  }

  get subjectWagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate *
      this.subjectWagesAndCompensationGross
    ).asCurrency();
  }

  get partnerWagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate *
      this.partnerWagesAndCompensationGross
    ).asCurrency();
  }

  get combinedWagesAndCompensationEstimatedWithholdings() {
    return (
      this.subjectWagesAndCompensationEstimatedWithholdings +
      this.partnerWagesAndCompensationEstimatedWithholdings
    ).asCurrency();
  }

  get subjectWagesAndCompensationActualIncome() {
    return (
      this.subjectWagesAndCompensationGross -
      this.subjectWagesAndCompensationEstimatedWithholdings -
      this.subjectAllowed401kContribution -
      this.subjectNonTaxableSalaryReductions
    ).asCurrency();
  }

  get partnerWagesAndCompensationActualIncome() {
    return (
      this.partnerWagesAndCompensationGross -
      this.partnerWagesAndCompensationEstimatedWithholdings -
      this.partnerAllowed401kContribution -
      this.partnerNonTaxableSalaryReductions
    ).asCurrency();
  }

  get combinedWagesAndCompensationActualIncome() {
    return (
      this.subjectWagesAndCompensationActualIncome +
      this.partnerWagesAndCompensationActualIncome
    ).asCurrency();
  }

  get flat401kWithholdingRate() {
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

  get partnerPensionGross() {
    return this.#inputs.partnerPension.asCurrency();
  }

  get partnerPensionWithholdings() {
    return (
      this.#inputs.flatPensionWithholdingRate * this.#inputs.partnerPension
    ).asCurrency();
  }

  get partnerPensionActualIncome() {
    return this.partnerPensionGross - this.partnerPensionWithholdings;
  }

  get partnerSsGross() {
    return this.#inputs.partnerSs.asCurrency();
  }

  get partnerSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.#inputs.partnerSs
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

  get subjectWorkingYearSavingsContributionFixed() {
    return this.#inputs.subjectWorkingYearSavingsContributionFixed.asCurrency();
  }

  get subjectWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get partnerWorkingYearSavingsContributionFixed() {
    return this.#inputs.partnerWorkingYearSavingsContributionFixed.asCurrency();
  }

  get partnerWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerSalary;
    return (
      this.#inputs.partnerWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get subjectRetirementYearSavingsContributionFixed() {
    return this.#inputs.subjectRetirementYearSavingsContributionFixed.asCurrency();
  }

  get subjectRetirementYearSavingsContributionVariable() {
    return this.#inputs.subjectRetirementYearSavingsContributionVariable ?? 0;
  }

  get partnerRetirementYearSavingsContributionFixed() {
    return this.#inputs.partnerRetirementYearSavingsContributionFixed.asCurrency();
  }

  get partnerRetirementYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerSalary;
    return (
      this.#inputs.partnerRetirementYearSavingsContributionVariable *
      totalSalary
    ).asCurrency();
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
      this.combinedWagesAndCompensationTaxable +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncomeWithNoWithholdings +
      this.combinedSsGross
    );
  }

  get taxableIncome() {
    return (
      this.combinedWagesAndCompensationTaxable +
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
    return this.subjectPensionGross + this.partnerPensionGross;
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
      this.combinedWagesAndCompensationTaxable
    );
  }

  get totalActualFixedIncome() {
    const total =
      this.combinedPensionActualIncome +
      this.combinedSsActualIncome +
      this.combinedWagesAndCompensationActualIncome;
    return total.asCurrency();
  }

  get fixedIncomeBreakdown() {
    return {
      wagesAndCompensation: this.combinedWagesAndCompensationTaxable,
      pension: this.combinedPensionGross,
      socialSecurity: this.combinedSsGross,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncomeWithNoWithholdings,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

export { FixedIncomeStreams };
