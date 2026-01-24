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

  get subjectCareerNonTaxableSalaryReductions() {
    return this.#inputs.subjectCareerNonTaxableSalaryReductions.asCurrency();
  }

  get partnerCareerNonTaxableSalaryReductions() {
    return this.#inputs.partnerCareerNonTaxableSalaryReductions.asCurrency();
  }

  get partnerCareerAllowed401kContribution() {
    return (
      this.#partnerCareerDesired401kContribution * this._getElectiveScale()
    ).asCurrency();
  }

  get nonTaxableBenefits() {
    return this.#inputs.subjectCareerNonTaxableSalaryReductions.asCurrency();
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
      this.#inputs.taxableIncomeAdjustment
    ).asCurrency();
  }

  get subjectCareerWagesAndCompensationNonTaxable() {
    return (
      this.subjectCareerAllowed401kContribution +
      this.#inputs.subjectCareerNonTaxableSalaryReductions
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
      this.#inputs.partnerCareerNonTaxableSalaryReductions
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
      this.#inputs.flatCareerWageWithholdingRate *
      this.subjectCareerWagesAndCompensationGross
    ).asCurrency();
  }

  get partnerCareerWagesAndCompensationEstimatedWithholdings() {
    return (
      this.#inputs.flatCareerWageWithholdingRate *
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
      this.subjectCareerNonTaxableSalaryReductions
    ).asCurrency();
  }

  get partnerCareerWagesAndCompensationActualIncome() {
    return (
      this.partnerCareerWagesAndCompensationGross -
      this.partnerCareerWagesAndCompensationEstimatedWithholdings -
      this.partnerCareerAllowed401kContribution -
      this.partnerCareerNonTaxableSalaryReductions
    ).asCurrency();
  }

  get combinedCareerWagesAndCompensationActualIncome() {
    return (
      this.subjectCareerWagesAndCompensationActualIncome +
      this.partnerCareerWagesAndCompensationActualIncome
    ).asCurrency();
  }

  get flatCareer401kWithholdingRate() {
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
    return this.#inputs.taxableIncomeAdjustment.asCurrency();
  }

  get miscTaxableIncomeWithholdings() {
    return (
      this.#inputs.flatCareerWageWithholdingRate * this.miscTaxableIncome
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
    return this.#inputs.subjectWorkingYearSavingsContributionFixed.asCurrency();
  }

  get subjectWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectCareerSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get partnerWorkingYearSavingsContributionFixed() {
    return this.#inputs.partnerWorkingYearSavingsContributionFixed.asCurrency();
  }

  get partnerWorkingYearSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerCareerSalary;
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
    const totalSalary = this.#inputs.partnerCareerSalary;
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
      this.combinedSsGross +
      this.combinedPensionGross +
      this.miscTaxableIncome +
      this.combinedCareerWagesAndCompensationTaxable +
      this.interestEarnedOnSavings +
      0
    );
  }

  get taxableIncome() {
    return (
      this.combinedCareerWagesAndCompensationTaxable +
      this.combinedPensionGross +
      this.interestEarnedOnSavings +
      this.miscTaxableIncome +
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
      this.miscTaxableIncome +
      this.combinedCareerWagesAndCompensationTaxable
    );
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
