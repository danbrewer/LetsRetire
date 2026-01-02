import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { EmploymentInfo } from "./cEmploymentInfo.js";
import { TransactionCategory } from "./cTransaction.js";
import { withLabel } from "./debugUtils.js";

/**
 * Represents comprehensive contribution breakdown for retirement planning.
 *
 * This class encapsulates all contribution types including employee 401k,
 * Roth IRA, spouse contributions, savings, and employer matching. It provides
 * methods for calculating totals, contribution percentages, and analyzing
 * the overall contribution strategy across all account types.
 *
 * @class Contributions
 * @since 1.0.0
 */
class Contributions {
  #accountYear;

  /**
   * Creates a new Contributions instance with contribution breakdown data.
   *
   * @param {AccountingYear} accountYear
   * @param {EmploymentInfo} employmentInfo - Employment information for the primary individual
   * @param {any[]} [calculationDetails=[]] - Detailed calculation information
   */
  constructor(accountYear, employmentInfo, calculationDetails = []) {
    this.#accountYear = accountYear;
    this.subjectEmploymentInfo = employmentInfo;
    this.calculationDetails = calculationDetails;
  }

  get tradRoth() {
    return this.#accountYear.getDeposits(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      TransactionCategory.Contribution
    );
  }

  get savings() {
    return this.#accountYear.getDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Contribution
    );
  }

  get trad401k() {
    return this.#accountYear.getDeposits(
      ACCOUNT_TYPES.SUBJECT_401K,
      TransactionCategory.Contribution
    );
  }

  /**
   * Calculates the total contributions across all accounts and sources.
   *
   * @returns {number} Total contribution amount
   */
  get total() {
    return this.trad401k + this.tradRoth + this.savings;
  }

  //   /**
  //    * Calculates total employee contributions (excluding employer match).
  //    *
  //    * @returns {number} Total employee contribution amount
  //    */
  //   getEmployeeTotal() {
  //     return (
  //       this.my401k +
  //       this.myRoth +
  //       this.spouse401k +
  //       this.spouseRoth +
  //       this.savings
  //     );
  //   }

  /**
   * Calculates total retirement account contributions (401k + Roth).
   *
   * @returns {number} Total retirement account contributions
   */
  get retirementContributionsTotal() {
    return this.trad401k + this.tradRoth;
  }

  /**
   * Calculates total 401k contributions (employee + spouse).
   *
   * @returns {number} Total 401k contributions
   */
  get trad401kContributions() {
    return this.trad401k + this.trad401k;
  }

  /**
   * Calculates total Roth IRA contributions (employee + spouse).
   *
   * @returns {number} Total Roth IRA contributions
   */
  get rothContributions() {
    return this.tradRoth;
  }

  //   /**
  //    * Calculates total spouse contributions (401k + Roth).
  //    *
  //    * @returns {number} Total spouse contributions
  //    */
  //   getSpouseTotal() {
  //     return this.spouse401k + this.spouseRoth;
  //   }

  //   /**
  //    * Calculates total employee contributions (my 401k + my Roth + savings).
  //    *
  //    * @returns {number} Total primary employee contributions
  //    */
  //   getMyTotal() {
  //     return this.my401k + this.myRoth + this.savings;
  //   }

  //   /**
  //    * Gets the contribution breakdown as percentages of total contributions.
  //    *
  //    * @returns {Object} Contribution breakdown percentages:
  //    *   - my401k: Employee 401k as percentage of total
  //    *   - myRoth: Employee Roth as percentage of total
  //    *   - spouse401k: Spouse 401k as percentage of total
  //    *   - spouseRoth: Spouse Roth as percentage of total
  //    *   - savings: Savings as percentage of total
  //    *   - employerMatch: Employer match as percentage of total
  //    */
  //   getContributionBreakdown() {
  //     const totalContributions = this.total();
  //     if (totalContributions <= 0) {
  //       return {
  //         my401k: 0,
  //         myRoth: 0,
  //         spouse401k: 0,
  //         spouseRoth: 0,
  //         savings: 0,
  //         employerMatch: 0,
  //       };
  //     }

  //     return {
  //       my401k: this.my401k / totalContributions,
  //       myRoth: this.myRoth / totalContributions,
  //       spouse401k: this.spouse401k / totalContributions,
  //       spouseRoth: this.spouseRoth / totalContributions,
  //       savings: this.savings / totalContributions,
  //       employerMatch: this.employerMatch / totalContributions,
  //     };
  //   }

  //   /**
  //    * Calculates the employer match rate as a percentage of employee contributions.
  //    *
  //    * @returns {number} Employer match rate as decimal (e.g., 0.5 for 50% match)
  //    */
  //   getEmployerMatchRate() {
  //     const employeeContributions = this.getEmployeeTotal();
  //     if (employeeContributions <= 0) return 0;
  //     return this.employerMatch / employeeContributions;
  //   }

  //   /**
  //    * Calculates the Roth vs Traditional contribution ratio.
  //    *
  //    * @returns {Object} Roth vs Traditional breakdown:
  //    *   - rothPercentage: Roth contributions as percentage of retirement total
  //    *   - traditionalPercentage: Traditional 401k as percentage of retirement total
  //    *   - rothAmount: Total Roth contribution amount
  //    *   - traditionalAmount: Total traditional 401k amount
  //    */
  //   getRothVsTraditionalBreakdown() {
  //     const rothTotal = this.rothContributions();
  //     const traditional401kTotal = this.trad401kContributions();
  //     const retirementTotal = rothTotal + traditional401kTotal;

  //     if (retirementTotal <= 0) {
  //       return {
  //         rothPercentage: 0,
  //         traditionalPercentage: 0,
  //         rothAmount: 0,
  //         traditionalAmount: 0,
  //       };
  //     }

  //     return {
  //       rothPercentage: rothTotal / retirementTotal,
  //       traditionalPercentage: traditional401kTotal / retirementTotal,
  //       rothAmount: rothTotal,
  //       traditionalAmount: traditional401kTotal,
  //     };
  //   }

  //   /**
  //    * Calculates contribution efficiency metrics.
  //    *
  //    * @returns {Object} Efficiency metrics:
  //    *   - employeeMatchUtilization: How much of employer match is being captured
  //    *   - retirementVsSavingsRatio: Ratio of retirement to savings contributions
  //    *   - spouseContributionRatio: Spouse contributions as ratio of total employee
  //    */
  //   getContributionEfficiency() {
  //     const employeeTotal = this.getEmployeeTotal();
  //     const retirementTotal = this.retirementContributionsTotal();
  //     const spouseTotal = this.getSpouseTotal();

  //     return {
  //       employeeMatchUtilization: this.getEmployerMatchRate(),
  //       retirementVsSavingsRatio:
  //         this.savings > 0
  //           ? retirementTotal / this.savings
  //           : retirementTotal > 0
  //             ? Number.POSITIVE_INFINITY
  //             : 0,
  //       spouseContributionRatio:
  //         employeeTotal > 0 ? spouseTotal / employeeTotal : 0,
  //     };
  //   }

  //   /**
  //    * Validates contributions for logical consistency.
  //    *
  //    * @returns {Object} Validation result containing:
  //    *   - isValid: Whether all values are valid
  //    *   - errors: Array of validation error messages
  //    *   - warnings: Array of validation warning messages
  //    */
  //   validate() {
  //     const errors = [];
  //     const warnings = [];

  //     // Check for negative contributions
  //     if (this.my401k < 0)
  //       errors.push("Employee 401k contribution cannot be negative");
  //     if (this.myRoth < 0)
  //       errors.push("Employee Roth contribution cannot be negative");
  //     if (this.spouse401k < 0)
  //       errors.push("Spouse 401k contribution cannot be negative");
  //     if (this.spouseRoth < 0)
  //       errors.push("Spouse Roth contribution cannot be negative");
  //     if (this.savings < 0)
  //       errors.push("Savings contribution cannot be negative");
  //     if (this.employerMatch < 0)
  //       errors.push("Employer match cannot be negative");

  //     // // Check for unusually high contributions (potential data entry errors)
  //     // const total = this.total();
  //     // if (total > 100000) {
  //     //   warnings.push(
  //     //     "Total contributions exceed $100,000 - please verify amounts"
  //     //   );
  //     }

  //     // Check for employer match without employee contributions
  //     if (this.employerMatch > 0 && this.trad401kContributions() === 0) {
  //       warnings.push(
  //         "Employer match present but no 401k contributions - verify match eligibility"
  //       );
  //     }

  //     // Check for very high employer match rate
  //     const matchRate = this.getEmployerMatchRate();
  //     if (matchRate > 1) {
  //       warnings.push(
  //         "Employer match rate exceeds 100% of employee contributions"
  //       );
  //     }

  //     return {
  //       isValid: errors.length === 0,
  //       errors: errors,
  //       warnings: warnings,
  //     };
  //   }

  //   /**
  //    * Creates a comprehensive summary of contributions data and calculations.
  //    *
  //    * @returns {Object} Summary containing all contribution metrics and analysis
  //    */
  //   getSummary() {
  //     const breakdown = this.getContributionBreakdown();
  //     const rothVsTraditional = this.getRothVsTraditionalBreakdown();
  //     const efficiency = this.getContributionEfficiency();
  //     const validation = this.validate();

  //     return {
  //       // Individual contribution amounts
  //       my401k: this.my401k,
  //       myRoth: this.myRoth,
  //       spouse401k: this.spouse401k,
  //       spouseRoth: this.spouseRoth,
  //       savings: this.savings,
  //       employerMatch: this.employerMatch,

  //       // Calculated totals
  //       total: this.total(),
  //       employeeTotal: this.getEmployeeTotal(),
  //       retirementTotal: this.retirementContributionsTotal(),
  //       rothTotal: this.rothContributions(),
  //       traditional401kTotal: this.trad401kContributions(),
  //       spouseTotal: this.getSpouseTotal(),
  //       myTotal: this.getMyTotal(),

  //       // Percentage breakdowns
  //       contributionBreakdown: {
  //         percentages: breakdown,
  //         formatted: {
  //           my401k:
  //             /** @type {any} */ ((breakdown.my401k || 0) * 100).toFixed(1) + "%",
  //           myRoth:
  //             /** @type {any} */ ((breakdown.myRoth || 0) * 100).toFixed(1) + "%",
  //           spouse401k:
  //             /** @type {any} */ ((breakdown.spouse401k || 0) * 100).toFixed(1) +
  //             "%",
  //           spouseRoth:
  //             /** @type {any} */ ((breakdown.spouseRoth || 0) * 100).toFixed(1) +
  //             "%",
  //           savings:
  //             /** @type {any} */ ((breakdown.savings || 0) * 100).toFixed(1) +
  //             "%",
  //           employerMatch:
  //             /** @type {any} */ ((breakdown.employerMatch || 0) * 100).toFixed(
  //               1
  //             ) + "%",
  //         },
  //       },

  //       // Strategic analysis
  //       rothVsTraditional: {
  //         ...rothVsTraditional,
  //         formattedRothPercentage:
  //           /** @type {any} */ (
  //             (rothVsTraditional.rothPercentage || 0) * 100
  //           ).toFixed(1) + "%",
  //         formattedTraditionalPercentage:
  //           /** @type {any} */ (
  //             (rothVsTraditional.traditionalPercentage || 0) * 100
  //           ).toFixed(1) + "%",
  //       },

  //       // Efficiency metrics
  //       efficiency: {
  //         ...efficiency,
  //         formattedMatchUtilization:
  //           /** @type {any} */ (
  //             (efficiency.employeeMatchUtilization || 0) * 100
  //           ).toFixed(1) + "%",
  //         formattedSpouseRatio:
  //           /** @type {any} */ (
  //             (efficiency.spouseContributionRatio || 0) * 100
  //           ).toFixed(1) + "%",
  //       },

  //       // Calculation details
  //       calculationDetailsCount: this.calculationDetails.length,

  //       // Validation results
  //       validation: validation,
  //     };
  //   }

  //   /**
  //    * Updates contribution values for corrections or adjustments.
  //    *
  //    * @param {Object} updates - Object containing contribution updates:
  //    * @param {number} [updates.my401k] - New employee 401k contribution
  //    * @param {number} [updates.myRoth] - New employee Roth contribution
  //    * @param {number} [updates.spouse401k] - New spouse 401k contribution
  //    * @param {number} [updates.spouseRoth] - New spouse Roth contribution
  //    * @param {number} [updates.savings] - New savings contribution
  //    * @param {number} [updates.employerMatch] - New employer match amount
  //    * @param {any[]} [updates.calculationDetails] - New calculation details
  //    */
  //   updateContributions(updates) {
  //     if (updates.my401k !== undefined) {
  //       this.my401k = updates.my401k;
  //     }
  //     if (updates.myRoth !== undefined) {
  //       this.myRoth = updates.myRoth;
  //     }
  //     if (updates.spouse401k !== undefined) {
  //       this.spouse401k = updates.spouse401k;
  //     }
  //     if (updates.spouseRoth !== undefined) {
  //       this.spouseRoth = updates.spouseRoth;
  //     }
  //     if (updates.savings !== undefined) {
  //       this.savings = updates.savings;
  //     }
  //     if (updates.employerMatch !== undefined) {
  //       this.employerMatch = updates.employerMatch;
  //     }
  //     if (updates.calculationDetails !== undefined) {
  //       this.calculationDetails = updates.calculationDetails;
  //     }
  //   }

  /**
   * Adds a calculation detail entry to track contribution logic.
   *
   * @param {Object} detail - Calculation detail object
   * @param {string} detail.description - Description of the calculation
   * @param {number} detail.amount - Amount involved in calculation
   * @param {string} [detail.accountType] - Account type affected
   */
  addCalculationDetail(detail) {
    this.calculationDetails.push(detail);
  }

  /**
   * Clears all calculation details.
   */
  clearCalculationDetails() {
    this.calculationDetails = [];
  }

  /**
   * Factory method to create a Contributions from employment and account data.
   *
   * This method provides a convenient way to construct Contributions objects
   * by extracting data from employment information, account groups, and
   * contribution calculations.
   *
   * @param {AccountingYear} accountingYear - Accounting year for the contributions
   * @param {EmploymentInfo} employmentInfo - Employment information
   *
   * @returns {Contributions} A new contributions instance with employment-derived data
   *
   * @example
   * // Create contributions from employment data
   * const employment = EmploymentInfo.CreateUsing(salary, inputs);
   * const spouseEmployment = EmploymentInfo.CreateUsing(spouseSalary, spouseInputs);
   * const contributions = Contributions.CreateUsing(employment, spouseEmployment);
   *
   * console.log(contributions.getSummary());
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(accountingYear, employmentInfo) {
    // Get primary employee contributions
    // const my401k =
    //   employmentInfo && typeof employmentInfo.cap401kContribution === "function"
    //     ? employmentInfo.cap401kContribution()
    //     : 0;
    // const myRoth =
    //   employmentInfo && typeof employmentInfo.capRothContribution === "function"
    //     ? employmentInfo.capRothContribution()
    //     : 0;
    // const employerMatch =
    //   employmentInfo && typeof employmentInfo.employer401kMatch === "function"
    //     ? employmentInfo.employer401kMatch()
    //     : 0;

    // // Get spouse contributions if available
    // const spouse401k =
    //   spouseEmploymentInfo &&
    //   typeof spouseEmploymentInfo.cap401kContribution === "function"
    //     ? spouseEmploymentInfo.cap401kContribution()
    //     : 0;
    // const spouseRoth =
    //   spouseEmploymentInfo &&
    //   typeof spouseEmploymentInfo.capRothContribution === "function"
    //     ? spouseEmploymentInfo.capRothContribution()
    //     : 0;

    const calculationDetails = [withLabel("employmentInfo", employmentInfo)];

    return new Contributions(
      accountingYear,
      employmentInfo,
      calculationDetails
    );
  }
}

// Maintain backward compatibility - this will need employment and account context
// const contributions = Contributions.CreateUsing(employmentInfo, spouseEmploymentInfo, accountGroup, calculationDetails);

export { Contributions };
