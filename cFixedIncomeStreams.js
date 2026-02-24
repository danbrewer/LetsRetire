import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { FixedIncomeCareerStreams } from "./cFixedIncomeCareerStreams.js";
import { FixedIncomeRetirementStreams } from "./cFixedIncomeRetirementStreams.js";
import { Inputs } from "./cInputs.js";
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
  }

  get career() {
    return this.#careerStreams;
  }

  get retirement() {
    return this.#retirementStreams;
  }

  get flat401kWithholdingRate() {
    return this.#inputs.flatCareerTrad401kWithholdingRate;
  }

  get subjectPensionGross() {
    let pension = this.#inputs.pensionAnnuities
      .filter((p) => p.owner === "subject")
      .reduce((acc, p) => {
        let annualPension =
          this.#demographics.currentAge >= p.startAge
            ? p.monthlyAmount * 12
            : 0;

        if (!this.#demographics.subjectIsLiving) {
          annualPension *= p.survivorshipPercent;
        }

        return acc + annualPension;
      }, 0);

    return pension.asCurrency();
  }

  get subjectPensionWithholdings() {
    let withholdings = this.#inputs.pensionAnnuities
      .filter((p) => p.owner === "subject")
      .reduce((acc, p) => {
        let annualPension =
          this.#demographics.currentAge >= p.startAge
            ? p.monthlyAmount * 12 * p.withholdingRate
            : 0;

        if (!this.#demographics.subjectIsLiving) {
          annualPension *= p.survivorshipPercent;
        }

        return acc + annualPension;
      }, 0);

    return withholdings.asCurrency();
  }

  get subjectPensionActualIncome() {
    return this.subjectPensionGross - this.subjectPensionWithholdings;
  }

  get subjectSsGross() {
    if (!this.#demographics.subjectIsLiving) return 0;

    let ssGross = this.#inputs.subjectSs;
    if (!this.#demographics.partnerIsLiving) {
      ssGross = Math.max(ssGross, this.#inputs.partnerSs);
    }

    return ssGross.asCurrency();
  }

  get subjectSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.subjectSsGross
    ).asCurrency();
  }

  get subjectSsActualIncome() {
    return this.subjectSsGross - this.subjectSsWithholdings;
  }


  /** @returns {import("./cPensionAnnuityStorage.js").PensionAnnuityBreakdown[]} */
  get pensionAnnunityBreakdowns(){
    const breakdown = this.#inputs.pensionAnnuities.map(p=>{
      let eligible = false;
      let isLiving = false;
      switch(p.owner){
        case "partner":
          eligible = this.#demographics.currentAgeOfPartner >= p.startAge;
          isLiving = this.#demographics.partnerIsLiving;
          break;
        case "subject":
          eligible = this.#demographics.currentAge >= p.startAge;
          isLiving = this.#demographics.subjectIsLiving;
          break;
      }

      let grossAmount =
        eligible
          ? p.monthlyAmount * 12
          : 0;

      if (!isLiving) {
        grossAmount *= p.survivorshipPercent;
      }

      let withholdingsAmount = grossAmount * p.withholdingRate;
      let takehomeAmount = grossAmount - withholdingsAmount;

      return {
        owner: p.owner === "partner" ? "Partner" : "Subject",
        name: p.name,
        withholdingRate: p.withholdingRate,
        grossAmount,
        withholdingsAmount,
        takehomeAmount
      }

    });

    return breakdown;
  }

  get partnerPensionGross() {
    let pension = this.#inputs.pensionAnnuities
      .filter((p) => p.owner === "partner")
      .reduce((acc, p) => {
        let annualPension =
          this.#demographics.currentAgeOfPartner >= p.startAge
            ? p.monthlyAmount * 12
            : 0;

        if (!this.#demographics.partnerIsLiving) {
          annualPension *= p.survivorshipPercent;
        }

        return acc + annualPension;
      }, 0);

    return pension.asCurrency();
  }

  get partnerPensionWithholdings() {
    let withholdings = this.#inputs.pensionAnnuities
      .filter((p) => p.owner === "partner")
      .reduce((acc, p) => {
        let withholdings =
          this.#demographics.currentAgeOfPartner >= p.startAge
            ? p.monthlyAmount * 12 * p.withholdingRate
            : 0;

        if (!this.#demographics.partnerIsLiving) {
          withholdings *= p.survivorshipPercent;
        }

        return acc + withholdings;
      }, 0);

    return withholdings.asCurrency();
  }

  get partnerPensionActualIncome() {
    return this.partnerPensionGross - this.partnerPensionWithholdings;
  }

  get partnerSsGross() {
    if (!this.#demographics.partnerIsLiving) return 0;

    let ssGross = this.#inputs.partnerSs;
    if (!this.#demographics.subjectIsLiving) {
      // Take the higher of the two SS benefits
      ssGross = Math.max(ssGross, this.#inputs.subjectSs);
    }

    return ssGross.asCurrency();
  }

  get partnerSsWithholdings() {
    return (
      this.#inputs.flatSsWithholdingRate * this.partnerSsGross
    ).asCurrency();
  }

  get partnerSsActualIncome() {
    return this.partnerSsGross - this.partnerSsWithholdings;
  }

  get miscTaxableIncome() {
    // debugger;
    const taxableIncomeOverride = this.#inputs.taxableIncomeOverrides.find(
      (item) => item.year === this.#demographics.currentAge
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
    const taxFreeIncomeOverride = this.#inputs.taxFreeIncomeOverrides.find(
      (item) => item.year === this.#demographics.currentAge
    );
    if (!taxFreeIncomeOverride) {
      return 0;
    }

    return taxFreeIncomeOverride.amount.asCurrency();
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
    const result =
      this.#inputs.subjectWorkingYearSavingsContributionFixedAmount ?? 0;
    return result.asCurrency();
  }

  get subjectSavingsContributionVariable() {
    const totalSalary = this.#inputs.subjectCareerSalary;
    return (
      this.#inputs.subjectWorkingYearSavingsContributionRate * totalSalary
    ).asCurrency();
  }

  get partnerSavingsContributionFixed() {
    const result =
      this.#inputs.partnerWorkingYearSavingsContributionFixedAmount ?? 0;
    return result.asCurrency();
  }

  get partnerSavingsContributionVariable() {
    const totalSalary = this.#inputs.partnerCareerSalary;
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

  get nonTaxableIncome() {
    const result =
      this.taxFreeIncomeAdjustment +
      this.#careerStreams.combinedWagesAndCompensationNonTaxable +
      this.#retirementStreams.combinedWagesAndCompensationNonTaxable;
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

  get retirementYearSpendingOverride() {
    debugger;
    const retirementYearIndex =
      this.#inputs.subjectAge - this.#inputs.subjectRetireAge + 1;
    if (retirementYearIndex < 1) {
      return 0;
    }

    const retirementYearSpendingOverride =
      this.#inputs.retirementYearSpendingOverrides.find(
        (item) => item.year === retirementYearIndex
      );
    if (!retirementYearSpendingOverride) {
      return 0;
    }

    return retirementYearSpendingOverride.amount.asCurrency();
  }
}

export { FixedIncomeStreams };
