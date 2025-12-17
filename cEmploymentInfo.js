import { Demographics } from "./cDemographics.js";
import { Inputs } from "./cInputs.js";
import {
  EMPLOYEE_401K_LIMIT_2025,
  EMPLOYEE_401K_CATCHUP_50,
} from "./consts.js";

/**
 * Represents comprehensive employment information for retirement planning calculations.
 *
 * This class encapsulates all employment-related data including salary, contribution
 * percentages, matching parameters, and provides methods for calculating various
 * 401k and Roth contribution amounts based on IRS limits and employer matching rules.
 *
 * @class EmploymentInfo
 * @since 1.0.0
 */
class EmploymentInfo {
  /** @type {Demographics} */
  #demographics;

  /** @type {Inputs} */
  #inputs;

  /** @type {string} */
  _description;
  // /**
  //  * Creates a new EmploymentInfo instance with employment and contribution data.
  //  *
  //  * @param {number} [age = 0] - Employee age for contribution calculations
  //  * @param {number} [salary=0] - Annual salary amount
  //  * @param {number} [pretaxContributionPercentage=0] - Pretax 401k contribution percentage (as decimal)
  //  * @param {number} [rothContributionPercentage=0] - Roth 401k contribution percentage (as decimal)
  //  * @param {number} [employeeMatchCap=0] - Maximum percentage of salary eligible for employer match
  //  * @param {number} [matchRate=0] - Employer match rate (e.g., 0.5 for 50% match)
  //  * @param {string} [description="Employment Info"] - Descriptive label
  //  */

  /**
   *
   * @param {Demographics} demographics
   * @param {Inputs} inputs
   * @param {string} description
   */
  constructor(demographics, inputs, description = "Employment Info") {
    this.#demographics = demographics;
    this.#inputs = inputs;

    this._description = description;
  }
  // this._age = age;
  // this._description = description;
  // this.salary = salary;
  // this.pretaxContributionPercentage = pretaxContributionPercentage;
  // this.rothContributionPercentage = rothContributionPercentage;
  // this.employeeMatchCap = employeeMatchCap;
  // this.matchRate = matchRate;

  /**
   * Gets the descriptive label for this employment info.
   *
   * @returns {string} Description of the employment info
   */
  get description() {
    return this._description;
  }

  get salary() {
    return this.#inputs.wagesandOtherTaxableCompensation.asCurrency();
  }

  /**
   * Calculates the desired pretax 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired pretax contribution amount as currency
   */
  get desired401kContribution() {
    return (this.salary * this.#inputs.pretaxPct).asCurrency();
  }

  /**
   * Calculates the desired Roth 401k contribution amount based on salary and percentage.
   *
   * @returns {number} Desired Roth contribution amount as currency
   */
  get desiredRothContribution() {
    return (this.salary * this.#inputs.rothPct).asCurrency();
  }

  /**
   * Calculates the elective scaling factor to ensure contributions don't exceed IRS limits.
   *
   * This method determines what percentage of desired contributions can actually be made
   * based on annual contribution limits and catch-up provisions for employees 50+.
   *
   * @returns {number} Scaling factor (0-1) to apply to desired contributions
   */
  getElectiveScale() {
    // Use global constants if available, otherwise use 2025 values as defaults
    const baseLimit =
      typeof EMPLOYEE_401K_LIMIT_2025 !== "undefined"
        ? EMPLOYEE_401K_LIMIT_2025
        : 23000;
    const catchupLimit =
      typeof EMPLOYEE_401K_CATCHUP_50 !== "undefined"
        ? EMPLOYEE_401K_CATCHUP_50
        : 7500;

    let electiveLimit =
      baseLimit + (this.#demographics.currentAge >= 50 ? catchupLimit : 0);
    const totalDesiredContribution =
      this.desired401kContribution + this.desiredRothContribution;
    let scale =
      totalDesiredContribution > 0
        ? Math.min(1, electiveLimit / totalDesiredContribution)
        : 1;
    return scale;
  }

  /**
   * Calculates the actual pretax 401k contribution after applying IRS limits.
   *
   * @returns {number} Capped pretax contribution amount as currency
   */
  get trad401kContribution() {
    return (
      this.desired401kContribution * this.getElectiveScale()
    ).asCurrency();
  }

  get nonTaxableBenefits() {
    return this.#inputs.nonTaxableBenefits.asCurrency();
  }

  // /**
  //  * Calculates the actual Roth 401k contribution after applying IRS limits.
  //  *
  //  * @returns {number} Capped Roth contribution amount as currency
  //  */
  // get rothMaxContribution() {
  //   return (
  //     this.desiredRothContribution * this.getElectiveScale()
  //   ).asCurrency();
  // }

  // /**
  //  * Calculates the effective employee 401k contribution percentage after caps.
  //  *
  //  * @returns {number} Actual contribution percentage as decimal
  //  */
  // get emp401kContributionPct() {
  //   return this.salary > 0 ? this.trad401kContribution / this.salary : 0;
  // }

  // /**
  //  * Calculates the employer 401k matching contribution amount.
  //  *
  //  * The match is calculated on the lesser of the employee's actual contribution
  //  * percentage or the employer's matching cap, multiplied by the match rate.
  //  *
  //  * @returns {number} Employer match amount as currency
  //  */
  // get employer401kMatch() {
  //   return (
  //     Math.min(this.emp401kContributionPct, this.employeeMatchCap) *
  //     this.salary *
  //     this.matchRate
  //   ).asCurrency();
  // }

  // /**
  //  * Calculates the total employee contribution (pretax + Roth) after caps.
  //  *
  //  * @returns {number} Total employee contribution amount
  //  */
  // get totalEmployeeContribution() {
  //   return this.trad401kContribution + this.rothMaxContribution;
  // }

  // /**
  //  * Calculates the total contribution percentage (employee + employer).
  //  *
  //  * @returns {number} Total contribution percentage as decimal
  //  */
  // get totalContributionPct() {
  //   if (this.salary <= 0) return 0;
  //   return (
  //     (this.totalEmployeeContribution + this.employer401kMatch) / this.salary
  //   );
  // }

  /**
   * Gets the contribution split between pretax and Roth.
   *
   * @returns {Object} Object containing:
   *   - pretaxAmount: Pretax contribution amount
   *   - rothAmount: Roth contribution amount
   *   - pretaxPercentage: Pretax as percentage of total
   *   - rothPercentage: Roth as percentage of total
   */
  // get contributionSplit() {
  //   const pretaxAmount = this.trad401kContribution;
  //   const rothAmount = this.rothMaxContribution;
  //   const total = pretaxAmount + rothAmount;

  //   return {
  //     pretaxAmount: pretaxAmount,
  //     rothAmount: rothAmount,
  //     pretaxPercentage: total > 0 ? pretaxAmount / total : 0,
  //     rothPercentage: total > 0 ? rothAmount / total : 0,
  //   };
  // }

  // /**
  //  * Calculates the amount of unused contribution capacity.
  //  *
  //  * @returns {number} Unused contribution capacity amount
  //  */
  // get unusedContributionCapacity() {
  //   const baseLimit =
  //     typeof EMPLOYEE_401K_LIMIT_2025 !== "undefined"
  //       ? EMPLOYEE_401K_LIMIT_2025
  //       : 23000;
  //   const catchupLimit =
  //     typeof EMPLOYEE_401K_CATCHUP_50 !== "undefined"
  //       ? EMPLOYEE_401K_CATCHUP_50
  //       : 7500;

  //   const electiveLimit = baseLimit + (this._age >= 50 ? catchupLimit : 0);
  //   const actualContribution = this.totalEmployeeContribution;
  //   return Math.max(0, electiveLimit - actualContribution);
  // }

  // /**
  //  * Validates employment info for logical consistency.
  //  *
  //  * @returns {Object} Validation result containing:
  //  *   - isValid: Whether all values are valid
  //  *   - errors: Array of validation error messages
  //  */
  // validate() {
  //   const errors = [];

  //   if (this.salary < 0) {
  //     errors.push("Salary cannot be negative");
  //   }

  //   if (
  //     this.pretaxContributionPercentage < 0 ||
  //     this.pretaxContributionPercentage > 1
  //   ) {
  //     errors.push("Pretax contribution percentage must be between 0 and 1");
  //   }

  //   if (
  //     this.rothContributionPercentage < 0 ||
  //     this.rothContributionPercentage > 1
  //   ) {
  //     errors.push("Roth contribution percentage must be between 0 and 1");
  //   }

  //   if (this.employeeMatchCap < 0 || this.employeeMatchCap > 1) {
  //     errors.push("Employee match cap must be between 0 and 1");
  //   }

  //   if (this.matchRate < 0) {
  //     errors.push("Match rate cannot be negative");
  //   }

  //   const totalContributionPct =
  //     this.pretaxContributionPercentage + this.rothContributionPercentage;
  //   if (totalContributionPct > 1) {
  //     errors.push("Total contribution percentage cannot exceed 100%");
  //   }

  //   return {
  //     isValid: errors.length === 0,
  //     errors: errors,
  //   };
  // }

  // /**
  //  * Creates a comprehensive summary of employment and contribution information.
  //  *
  //  * @returns {Object} Summary containing all employment info and calculated values
  //  */
  // getSummary() {
  //   const contributionSplit = this.contributionSplit;
  //   const validation = this.validate();

  //   return {
  //     salary: this.salary,
  //     pretaxContributionPercentage:
  //       (this.pretaxContributionPercentage * 100).toFixed(1) + "%",
  //     rothContributionPercentage:
  //       (this.rothContributionPercentage * 100).toFixed(1) + "%",
  //     employeeMatchCap: (this.employeeMatchCap * 100).toFixed(1) + "%",
  //     matchRate: (this.matchRate * 100).toFixed(1) + "%",
  //     desired401kContribution: this.desired401kContribution,
  //     desiredRothContribution: this.desiredRothContribution,
  //     cap401kContribution: this.trad401kContribution,
  //     capRothContribution: this.rothMaxContribution,
  //     totalEmployeeContribution: this.totalEmployeeContribution,
  //     employer401kMatch: this.employer401kMatch,
  //     totalContributionPct: (this.totalContributionPct * 100).toFixed(1) + "%",
  //     electiveScale: this.getElectiveScale(),
  //     unusedCapacity: this.unusedContributionCapacity,
  //     contributionSplit: contributionSplit,
  //     validation: validation,
  //   };
  // }

  /**
   * Factory method to create an EmploymentInfo from input data and salary.
   *
   * This method provides a convenient way to construct EmploymentInfo objects
   * from the standard inputs structure used throughout the retirement calculator.
   *
   * @param {Demographics} demographics - Fiscal data context for contribution limits
   * @param {Inputs} inputs - Input configuration containing contribution percentages and match info
   * @param {string} [description="Employment Info"] - Optional description
   *
   * @returns {EmploymentInfo} A new EmploymentInfo instance with input data
   *
   * @example
   * // Create employment info from inputs
   * const inputs = RetirementInputs.CreateUsing(inputData);
   * const employment = EmploymentInfo.CreateUsing(75000, inputs);
   *
   * console.log(employment.getSummary(45)); // Summary for 45-year-old
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(demographics, inputs, description = "Employment Info") {
    return new EmploymentInfo(demographics, inputs, description);
  }

  /**
   * Factory method to create an EmploymentInfo from individual values.
   *
   * @param {number} age - Employee age for contribution calculations
   * @param {number} salary - Annual salary amount
   * @param {number} pretaxPct - Pretax contribution percentage (as decimal)
   * @param {number} rothPct - Roth contribution percentage (as decimal)
   * @param {number} matchCap - Employee match cap percentage (as decimal)
   * @param {number} matchRate - Employer match rate (as decimal)
   * @param {string} [description="Employment Info"] - Optional description
   *
   * @returns {EmploymentInfo} A new EmploymentInfo instance with specified values
   *
   * @example
   * // Create employment info from known values
   * const employment = EmploymentInfo.CreateFrom(
   *   80000,  // salary
   *   0.10,   // 10% pretax
   *   0.05,   // 5% Roth
   *   0.06,   // 6% match cap
   *   0.50    // 50% match rate
   * );
   *
   * @static
   * @since 1.0.0
   */
  // static CreateFrom(
  //   age,
  //   salary,
  //   pretaxPct,
  //   rothPct,
  //   matchCap,
  //   matchRate,
  //   description = "Employment Info"
  // ) {
  //   return new EmploymentInfo(
  //     age,
  //     salary,
  //     pretaxPct,
  //     rothPct,
  //     matchCap,
  //     matchRate,
  //     description
  //   );
  // }

  /**
   * Factory method to create an empty EmploymentInfo instance.
   *
   * @param {string} [description="Employment Info"] - Optional description
   * @returns {EmploymentInfo} A new EmploymentInfo instance with zero values
   *
   * @example
   * // Create empty employment info for later population
   * const employment = EmploymentInfo.Empty();
   * employment.updateEmploymentInfo({
   *   salary: 70000,
   *   pretaxContributionPercentage: 0.08
   * });
   *
   * @static
   * @since 1.0.0
   */
  // static Empty(description = "Employment Info") {
  //   return new EmploymentInfo(0, 0, 0, 0, 0, 0, description);
  // }
}

// Maintain backward compatibility - this will need salary and inputs context
// const employmentInfo = EmploymentInfo.CreateUsing(salary, inputs);

export { EmploymentInfo };