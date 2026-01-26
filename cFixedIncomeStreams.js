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

    // stub these in for now; later we can implement retirement income streams
    this.subjectRetirementWagesAndCompensationGross = 0;
    this.subjectRetirementWagesAndCompensationEstimatedWithholdings = 0;
    this.subjectRetirementWagesAndCompensationActualIncome = 0;
    this.partnerRetirementWagesAndCompensationGross = 0;
    this.partnerRetirementWagesAndCompensationEstimatedWithholdings = 0;
    this.partnerRetirementWagesAndCompensationActualIncome = 0;
    this.subjectRetirementNonTaxableSalaryReductions = 0;
    this.partnerRetirementNonTaxableSalaryReductions = 0;
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
      this.#subjectCareerDesired401kContribution +
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
  get #subjectCareerDesired401kContribution() {
    return (
      this.#inputs.subjectCareerSalary *
      this.#inputs.subjectCareer401kContributionRate
    ).asCurrency();
  }

  get #partnerCareerDesired401kContribution() {
    return (
      this.#inputs.partnerCareerSalary *
      this.#inputs.partnerCareer401kContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the desired Roth 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired Roth contribution amount as currency
   */
  get #subjectDesiredRothContribution() {
    return (
      this.#inputs.subjectCareerSalary *
      this.#inputs.subjectRothContributionRate
    ).asCurrency();
  }

  get #partnerDesiredRothContribution() {
    return (
      this.#inputs.partnerCareerSalary *
      this.#inputs.partnerRothContributionRate
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

  get subjectPayrollDeductions() {
    return (
      this.#inputs.subjectPayrollDeductions * this.#inputs.subjectPayPeriods
    ).asCurrency();
  }

  get partnerCareerNonTaxableSalaryDeductions() {
    return (
      this.#inputs.partnerPayrollDeductions * this.#inputs.partnerPayPeriods
    ).asCurrency();
  }

  get partnerCareerAllowed401kContribution() {
    return (
      this.#partnerCareerDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get nonTaxableBenefits() {
    return this.subjectPayrollDeductions.asCurrency();
  }

  get subjectCareerWagesAndCompensationGross() {
    return this.#inputs.subjectCareerSalary.asCurrency();
  }

  get partnerCareerWagesAndCompensationGross() {
    return this.#inputs.partnerCareerSalary.asCurrency();
  }

  get combinedCareerWagesAndCompensationGross() {
    return (
      this.subjectCareerWagesAndCompensationGross +
      this.partnerCareerWagesAndCompensationGross +
      this.miscTaxableIncome
    ).asCurrency();
  }

  get subjectCareerWagesAndCompensationNonTaxable() {
    return (
      this.subjectCareerAllowed401kContribution + this.subjectPayrollDeductions
    ).asCurrency();
  }

  /**
   * Calculates the actual pretax 401k contribution after applying IRS limits.
   *
   * @returns {number} Capped pretax contribution amount as currency
   */
  get subjectCareerAllowed401kContribution() {
    return (
      this.#subjectCareerDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get partnerCareerWagesAndCompensationNonTaxable() {
    return (
      this.partnerCareerAllowed401kContribution +
      this.#inputs.partnerPayrollDeductions
    ).asCurrency();
  }

  get combinedCareerWagesAndCompensationNonTaxable() {
    return (
      this.subjectCareerWagesAndCompensationNonTaxable +
      this.partnerCareerWagesAndCompensationNonTaxable
    ).asCurrency();
  }

  get combinedCareerWagesAndCompensationTaxable() {
    return (
      this.combinedCareerWagesAndCompensationGross -
      this.combinedCareerWagesAndCompensationNonTaxable
    ).asCurrency();
  }

  get subjectCareerWagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate *
      this.subjectCareerWagesAndCompensationGross
    ).asCurrency();
  }

  get partnerCareerWagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate *
      this.partnerCareerWagesAndCompensationGross
    ).asCurrency();
  }

  get combinedCareerWagesAndCompensationEstimatedWithholdings() {
    return (
      this.subjectCareerWagesAndCompensationEstimatedWithholdings +
      this.partnerCareerWagesAndCompensationEstimatedWithholdings
    ).asCurrency();
  }

  get combinedRetirementWagesAndCompensationEstimatedWithholdings() {
    return (
      this.subjectRetirementWagesAndCompensationEstimatedWithholdings +
      this.partnerRetirementWagesAndCompensationEstimatedWithholdings
    ).asCurrency();
  }

  get subjectCareerWagesAndCompensationActualIncome() {
    return (
      this.subjectCareerWagesAndCompensationGross -
      this.subjectCareerWagesAndCompensationEstimatedWithholdings -
      this.subjectCareerAllowed401kContribution -
      this.subjectPayrollDeductions
    ).asCurrency();
  }

  get partnerCareerWagesAndCompensationActualIncome() {
    return (
      this.partnerCareerWagesAndCompensationGross -
      this.partnerCareerWagesAndCompensationEstimatedWithholdings -
      this.partnerCareerAllowed401kContribution -
      this.partnerCareerNonTaxableSalaryDeductions
    ).asCurrency();
  }

  get combinedCareerWagesAndCompensationActualIncome() {
    return (
      this.subjectCareerWagesAndCompensationActualIncome +
      this.partnerCareerWagesAndCompensationActualIncome
    ).asCurrency();
  }

  get flatCareer401kWithholdingRate() {
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

  get miscTaxableIncome() {
    return this.#inputs.taxableIncomeAdjustment.asCurrency();
  }

  get miscTaxableIncomeWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate * this.miscTaxableIncome
    ).asCurrency();
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
    const result = this.#inputs.subjectWorkingYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get subjectWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectCareerSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get partnerWorkingYearSavingsContributionFixed() {
    const result = this.#inputs.partnerWorkingYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get partnerWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerCareerSalary;
    return (
      this.#inputs.partnerWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get subjectRetirementYearSavingsContributionFixed() {
    const result =
      this.#inputs.subjectRetirementYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get subjectRetirementYearSavingsContributionVariable() {
    const result =
      this.#inputs.subjectRetirementYearSavingsContributionVariable ?? 0;
    return result.asCurrency();
  }

  get partnerRetirementYearSavingsContributionFixed() {
    const result =
      this.#inputs.partnerRetirementYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get partnerRetirementYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerCareerSalary;
    return (
      this.#inputs.partnerRetirementYearSavingsContributionVariable *
      totalSalary
    ).asCurrency();
  }

  get interestEarnedOnSavings() {
    const result =
      this.#accountYear?.getDeposits(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.Interest
      ) ?? 0;
    return result.asCurrency();
  }

  get grossTaxableIncome() {
    const result =
      this.combinedSsGross +
      this.combinedPensionGross +
      this.miscTaxableIncome +
      this.combinedCareerWagesAndCompensationTaxable +
      this.interestEarnedOnSavings +
      0;
    return result.asCurrency();
  }

  get taxableIncome() {
    const result =
      this.combinedCareerWagesAndCompensationTaxable +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.combinedSsGross;
    return result.asCurrency();
  }

  get combinedSsGross() {
    const result = this.subjectSsGross + this.partnerSsGross;
    return result.asCurrency();
  }

  get combinedGrossSsWithholdings() {
    const result = this.subjectSsWithholdings + this.partnerSsWithholdings;
    return result.asCurrency();
  }

  get combinedSsActualIncome() {
    const result = this.subjectSsActualIncome + this.partnerSsActualIncome;
    return result.asCurrency();
  }

  get combinedPensionGross() {
    const result = this.subjectPensionGross + this.partnerPensionGross;
    return result.asCurrency();
  }

  get combinedPensionWithholdings() {
    const result =
      this.subjectPensionWithholdings + this.partnerPensionWithholdings;
    return result.asCurrency();
  }

  get combinedPensionActualIncome() {
    const result =
      this.subjectPensionActualIncome + this.partnerPensionActualIncome;
    return result.asCurrency();
  }

  get nonSsGrossIncome() {
    const result =
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
      this.combinedCareerWagesAndCompensationTaxable;
    return result.asCurrency();
  }

  get totalActualFixedIncome() {
    const total =
      this.combinedPensionActualIncome +
      this.combinedSsActualIncome +
      this.combinedCareerWagesAndCompensationActualIncome;
    return total.asCurrency();
  }

  get fixedIncomeBreakdown() {
    return {
      wagesAndCompensation: this.combinedCareerWagesAndCompensationTaxable,
      pension: this.combinedPensionGross,
      socialSecurity: this.combinedSsGross,
      earnedInterest: this.interestEarnedOnSavings,
      taxableAdjustments: this.miscTaxableIncome,
      taxFreeAdjustments: this.taxFreeIncomeAdjustment,
    };
  }
}

export { FixedIncomeStreams };
