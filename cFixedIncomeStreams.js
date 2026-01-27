import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { FixedIncomeCareerStreams } from "./cFixedIncomeCareerStreams.js";
import { FixedIncomeRetirementStreams } from "./cFixedIncomeRetirementStreams.js";
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

  /** @type {FixedIncomeCareerStreams} */
  #careerStreams;

  /** @type {FixedIncomeRetirementStreams} */
  #retirementStreams;

  /**
   * @param {Demographics} demographics - Instance of Demographics class
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   * @param {Inputs} inputs - Input data object containing tax adjustments
   */

  constructor(demographics, accountYear, inputs) {
    this.#demographics = demographics;
    this.#accountYear = accountYear;
    this.#inputs = inputs;

    this.#careerStreams = FixedIncomeCareerStreams.CreateUsing(
      demographics,
      accountYear,
      inputs
    );

    this.#retirementStreams = FixedIncomeRetirementStreams.CreateUsing(
      demographics,
      accountYear,
      inputs
    );

    this._description = "FixedIncomeStreams";

    // stub these in for now; later we can implement retirement income streams
    // this.subjectRetirementWagesAndCompensationGross = 0;
    // this.subjectRetirementWagesAndCompensationEstimatedWithholdings = 0;
    // this.subjectRetirementWagesAndCompensationActualIncome = 0;
    // this.partnerRetirementWagesAndCompensationGross = 0;
    // this.partnerRetirementWagesAndCompensationEstimatedWithholdings = 0;
    // this.partnerRetirementWagesAndCompensationActualIncome = 0;
    // this.subjectRetirementNonTaxableSalaryReductions = 0;
    // this.partnerRetirementNonTaxableSalaryReductions = 0;
  }

  get career() {
    return this.#careerStreams;
  }

  get retirement() {
    return this.#retirementStreams;
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

  get subjectSavingsContributionFixed() {
    const result = this.#inputs.subjectWorkingYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get subjectSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectCareerSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionVariable * totalSalary
    ).asCurrency();
  }

  get partnerSavingsContributionFixed() {
    const result = this.#inputs.partnerWorkingYearSavingsContributionFixed ?? 0;
    return result.asCurrency();
  }

  get partnerSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerCareerSalary;
    return (
      this.#inputs.partnerWorkingYearSavingsContributionVariable * totalSalary
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

  get #wagesAndCompensationTaxable() {
    return this.#demographics.isWorking
      ? this.#careerStreams.combinedWagesAndCompensationTaxable
      : this.#retirementStreams.combinedWagesAndCompensationTaxable;
  }

  get grossTaxableIncome() {
    const result =
      this.combinedSsGross +
      this.combinedPensionGross +
      this.miscTaxableIncome +
      this.#wagesAndCompensationTaxable +
      this.interestEarnedOnSavings +
      0;
    return result.asCurrency();
  }

  get taxableIncome() {
    const result =
      this.#wagesAndCompensationTaxable +
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
      this.#wagesAndCompensationTaxable;
    return result.asCurrency();
  }

  get #wagesAndCompensationActualIncome() {
    return this.#demographics.isWorking
      ? this.#careerStreams.combinedWagesAndCompensationActualIncome
      : this.#retirementStreams.combinedWagesAndCompensationActualIncome;
  }

  get totalActualFixedIncome() {
    const total =
      this.combinedPensionActualIncome +
      this.combinedSsActualIncome +
      this.#wagesAndCompensationActualIncome;
    return total.asCurrency();
  }
}

export { FixedIncomeStreams };
