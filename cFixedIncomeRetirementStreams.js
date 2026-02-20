import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { Inputs } from "./cInputs.js";
import {
  EMPLOYEE_401K_CATCHUP_50,
  EMPLOYEE_401K_LIMIT_2025,
} from "./consts.js";
import { TransactionCategory } from "./cTransaction.js";

class FixedIncomeRetirementStreams {
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Inputs} */
  #inputs;
  /** @type {Demographics} */
  #demographics;

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {Inputs} inputs - Input data object containing tax adjustments
   * @returns {FixedIncomeRetirementStreams} New FixedIncomeStreams instance
   */
  static CreateUsing(demographics, accountYear, inputs) {
    return new FixedIncomeRetirementStreams(demographics, accountYear, inputs);
  }

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
      this.#inputs.subjectRetirementSalary *
      this.#inputs.subjectRetirement401kContributionRate
    ).asCurrency();
  }

  get #partnerDesired401kContribution() {
    return (
      this.#inputs.partnerRetirementSalary *
      this.#inputs.partnerRetirement401kContributionRate
    ).asCurrency();
  }

  /**
   * Calculates the desired Roth 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired Roth contribution amount as currency
   */
  get #subjectDesiredRothContribution() {
    return (
      this.#inputs.subjectRetirementSalary *
      this.#inputs.subjectRothContributionRate
    ).asCurrency();
  }

  get #partnerDesiredRothContribution() {
    return (
      this.#inputs.partnerRetirementSalary *
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
      this.#inputs.subjectRetirementPayrollDeductions *
      this.#inputs.subjectRetirementPayPeriods
    ).asCurrency();
  }

  get partnerNonTaxableSalaryDeductions() {
    return (
      this.#inputs.partnerRetirementPayrollDeductions *
      this.#inputs.partnerRetirementPayPeriods
    ).asCurrency();
  }

  get partnerAllowed401kContribution() {
    return (
      this.#partnerDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get subjectWagesAndCompensationGross() {
    return this.#inputs.subjectRetirementSalary.asCurrency();
  }

  get partnerWagesAndCompensationGross() {
    return this.#inputs.partnerRetirementSalary.asCurrency();
  }

  get combinedWagesAndCompensationGross() {
    return (
      this.subjectWagesAndCompensationGross +
      this.partnerWagesAndCompensationGross +
      this.miscTaxableIncome
    ).asCurrency();
  }

  get subjectWagesAndCompensationNonTaxable() {
    return (
      this.subjectAllowed401kContribution + this.subjectPayrollDeductions
    ).asCurrency();
  }

  get subjectAllowed401kContribution() {
    return (
      this.#subjectDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get partnerWagesAndCompensationNonTaxable() {
    return (
      this.partnerAllowed401kContribution +
      this.#inputs.partnerRetirementPayrollDeductions
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
      this.subjectPayrollDeductions
    ).asCurrency();
  }

  get partnerWagesAndCompensationActualIncome() {
    return (
      this.partnerWagesAndCompensationGross -
      this.partnerWagesAndCompensationEstimatedWithholdings -
      this.partnerAllowed401kContribution -
      this.partnerNonTaxableSalaryDeductions
    ).asCurrency();
  }

  get combinedWagesAndCompensationActualIncome() {
    return (
      this.subjectWagesAndCompensationActualIncome +
      this.partnerWagesAndCompensationActualIncome
    ).asCurrency();
  }

  get flat401kWithholdingRate() {
    return this.#inputs.flatCareerTrad401kWithholdingRate;
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
    const retirementYearIndex =
      this.#inputs.subjectAge - this.#inputs.subjectRetireAge + 1;
    if (retirementYearIndex < 1) {
      return 0;
    }

    const taxableIncomeOverride = this.#inputs.taxableIncomeOverrides.find(
      (item) => item.year === retirementYearIndex
    );
    if (!taxableIncomeOverride) {
      return 0;
    }

    return taxableIncomeOverride.amount.asCurrency();
  }

  get miscTaxableIncomeWithholdings() {
    return (
      this.#inputs.flatWageWithholdingRate * this.miscTaxableIncome
    ).asCurrency();
  }

  get taxFreeIncomeAdjustment() {
    const retirementYearIndex =
      this.#inputs.subjectAge - this.#inputs.subjectRetireAge + 1;
    if (retirementYearIndex < 1) {
      return 0;
    }

    const taxFreeIncomeOverride = this.#inputs.taxFreeIncomeOverrides.find(
      (item) => item.year === retirementYearIndex
    );
    if (!taxFreeIncomeOverride) {
      return 0;
    }

    return taxFreeIncomeOverride.amount.asCurrency();
  }

  get subjectWorkingYearSavingsContributionFixed() {
    const result =
      this.#inputs.subjectWorkingYearSavingsContributionFixedAmount ?? 0;
    return result.asCurrency();
  }

  get subjectWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectRetirementSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionRate * totalSalary
    ).asCurrency();
  }

  get partnerWorkingYearSavingsContributionFixed() {
    const result =
      this.#inputs.partnerWorkingYearSavingsContributionFixedAmount ?? 0;
    return result.asCurrency();
  }

  get partnerWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerRetirementSalary;
    return (
      this.#inputs.partnerWorkingYearSavingsContributionRate * totalSalary
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
      this.miscTaxableIncome +
      this.combinedWagesAndCompensationTaxable +
      this.interestEarnedOnSavings +
      0;
    return result.asCurrency();
  }

  get taxableIncome() {
    const result =
      this.combinedWagesAndCompensationTaxable +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome;
    return result.asCurrency();
  }

  get totalActualFixedIncome() {
    const total = this.combinedWagesAndCompensationActualIncome;
    return total.asCurrency();
  }
}

export { FixedIncomeRetirementStreams };
