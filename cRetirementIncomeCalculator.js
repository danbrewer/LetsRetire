import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
// import { IncomeEstimatorResults } from "./cIncomeEstimatorResults.js";
import { IncomeRs } from "./cIncomeRs.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { SsBenefitsCalculator } from "./cSsBenefitsCalculator.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
import { withLabel, log } from "./debugUtils.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
/**
 * RetirementIncomeCalculator class - Handles retirement income and tax calculations
 * Provides comprehensive income analysis for retirement planning scenarios
 */
class RetirementIncomeCalculator {
  /** @type {Demographics} */
  #demographics;

  /** @type {FiscalData} */
  #fiscalData;

  /**
   * Create retirement income calculator for specific demographics and fiscal parameters
   * @param {Demographics} demographics - Demographic information for tax calculations
   * @param {FiscalData} fiscalData - Fiscal data including tax year and inflation rate
   */
  constructor(demographics, fiscalData) {
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
  }

  /**
   * Calculate comprehensive income breakdown when a specific 401k withdrawal amount is applied.
   *
   * This function performs a complete income calculation for a retirement year by:
   * 1. Determining the appropriate tax brackets and standard deduction for the given year
   * 2. Calculating Social Security benefit taxation based on total provisional income
   * 3. Creating a detailed income breakdown including all sources (pension, SS, interest, RMD)
   * 4. Computing federal taxes and net income after applying the variable 401k withdrawal
   *
   * The function is commonly used in iterative calculations to determine optimal withdrawal
   * strategies or to model income scenarios with different retirement account distributions.
   *
   * @param {FixedIncomeStreams} fixedIncomeStreams - Collection of all income sources containing:
   *   - mySs: Primary person's Social Security benefits
   *   - spouseSs: Spouse's Social Security benefits (if applicable)
   *   - myPension: Primary person's pension income
   *   - spousePension: Spouse's pension income (if applicable)
   *   - reportedEarnedInterest: Taxable interest income from savings
   *   - rmd: Required Minimum Distribution amounts
   *   - otherTaxableIncomeAdjustments: Additional taxable income sources
   *   - nonSsIncome(): Method returning total non-Social Security income
   *   - nonSsIncomeSources: Array of non-Social Security income sources
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams - Variable taxable income amount (e.g., 401k withdrawal)
   * @param {Array<number> | null} [nonSsIncomeSources] - (Optional) Array of non-Social Security income sources
   * @returns {IncomeBreakdown} Comprehensive income calculation results containing:
   *   - ssBreakdown: Social Security taxation breakdown with taxable/non-taxable portions,
   *     provisional income calculations, and detailed methodology
   *   - incomeBreakdown: Complete income analysis including reportable income, taxable income,
   *     federal taxes, net income, and utility methods for income analysis
   *
   * @throws {Error} When required properties are missing from input objects
   * @throws {Error} When tax calculation methods fail due to invalid data
   *
   * @example
   * // Calculate income with $50,000 401k withdrawal
   * const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
   * const results = calculator.calculateIncomeWhen401kWithdrawalIs(50000, incomeStreams);
   *
   * console.log(`Total reportable income: ${results.incomeBreakdown.reportableIncome()}`);
   * console.log(`Federal taxes: ${results.incomeBreakdown.federalIncomeTax}`);
   * console.log(`Net income: ${results.incomeBreakdown.netIncome()}`);
   * console.log(`Taxable SS benefits: ${results.ssBreakdown.totalTaxablePortion()}`);
   *
   * @since 1.0.0
   * @author Retirement Calculator System
   */
  calculateIncomeBreakdown(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    nonSsIncomeSources
  ) {
    const ssBreakdown = this.calculateSocialSecurityBreakdown(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      nonSsIncomeSources
    );

    const incomeBreakdown = IncomeBreakdown.CreateFrom(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      this.#demographics,
      this.#fiscalData
    );

    // const result = IncomeRs.CreateUsing(incomeBreakdown);

    return incomeBreakdown;
  }

  /**
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {Array<number> | null} [nonSsIncomeSources] - (Optional) Array of non-Social Security income sources
   * @returns {SocialSecurityBreakdown} Comprehensive income calculation results containing:
   */
  calculateSocialSecurityBreakdown(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    nonSsIncomeSources
  ) {
    if (!nonSsIncomeSources || nonSsIncomeSources.length === 0) {
      nonSsIncomeSources = [
        fixedIncomeStreams.combinedPensionGross,
        fixedIncomeStreams.interestEarnedOnSavings,
        fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings,
        adjustableIncomeStreams?.grossIncomeSubjectToTaxation ?? 0,
      ];
    }

    const totalNonSsIncome = nonSsIncomeSources.reduce(
      (sum, val) => sum + val,
      0
    );
    const taxableNonSsIncome = totalNonSsIncome;

    const result = SsBenefitsCalculator.CalculateSsBreakdown(
      this.#demographics,
      fixedIncomeStreams,
      adjustableIncomeStreams
    );

    return result;
  }

  // /**
  //  * @param {FixedIncomeStreams} incomeStreams
  //  */
  // calculateFixedIncomeOnly(incomeStreams) {
  //   const nonSsIncomeSources = [
  //     incomeStreams.subjectPensionGross,
  //     incomeStreams.spousePensionGross,
  //     // incomeStreams.subjectRMD,
  //     incomeStreams.miscTaxableIncome,
  //   ];
  //   return this.calculateIncomeBreakdown(incomeStreams, null, nonSsIncomeSources);
  // }

  /**
   * Determine total IRA/savings withdrawal amount needed to hit a specific net target income
   * @param {number} targetIncome - Target net income to achieve
   * @param {FixedIncomeStreams} fixedIncomeStreams - Collection of income sources
   * @returns {number} - Withdrawal calculation results
   */
  determineGrossAdjustableIncomeNeededToHitNetTargetOf(
    targetIncome,
    fixedIncomeStreams
  ) {
    const actualFixedIncome =
      fixedIncomeStreams.combinedSsActualIncome +
      fixedIncomeStreams.combinedPensionActualIncome +
      fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings;

    const requiredAdjustableIncome = targetIncome - actualFixedIncome;

    return Math.max(0, requiredAdjustableIncome);

    // Declare and initialize the result object at the top
    /** @type {IncomeEstimatorResults} */
    // const result = new IncomeEstimatorResults(targetIncome, fixedIncomeStreams);
    // let lo = 0;
    // let hi = targetIncome * 2;

    // const maximumIterations = 80;
    // let guestimatedVariableIncomeNeeded = 0;

    // /** @type {IncomeBreakdown | null}} */
    // let incomeBreakdown = this.calculateIncomeBreakdown(
    //   guestimatedVariableIncomeNeeded,
    //   fixedIncomeStreams
    // );
    // if (incomeBreakdown?.netIncome.asCurrency() < targetIncome) {
    //   for (let i = 0; i < maximumIterations; i++) {
    //     logIteration(i, lo, hi);

    //     guestimatedVariableIncomeNeeded = (lo + hi) / 2;
    //     logGuestimate(guestimatedVariableIncomeNeeded);

    //     incomeBreakdown = this.calculateIncomeBreakdown(
    //       guestimatedVariableIncomeNeeded,
    //       fixedIncomeStreams
    //     );

    //     const netIncome = incomeBreakdown?.netIncome.asCurrency() ?? 0;

    //     logGuessResults(
    //       netIncome,
    //       targetIncome,
    //       guestimatedVariableIncomeNeeded
    //     );

    //     if (netIncome == targetIncome.asCurrency()) break;
    //     if (netIncome < targetIncome) lo = guestimatedVariableIncomeNeeded;
    //     else hi = guestimatedVariableIncomeNeeded;
    //     if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
    //   }
    // }

    // result.incomeBreakdown = incomeBreakdown;

    // // Update all the final values in the result object
    // // result.desiredNetTarget =
    // //   incomeBreakdown?.netIncome //getNetIncomeMinusReportedEarnedInterest()
    // //     .asCurrency() ?? 0;
    // // result.variableIncomeNeededToHitTarget =
    // //   incomeBreakdown?.trad401kWithdrawal.asCurrency() ?? 0; // hi.asCurrency();
    // // result.rmd = fixedIncomeStreams.rmd;
    // // result.federalIncomeTax =
    // //   incomeBreakdown?.federalIncomeTax.asCurrency() ?? 0;
    // // result.calculationDetails = [
    // //   withLabel("incomeBreakdown", incomeBreakdown),
    // //   withLabel("fixedIncomeStreams", fixedIncomeStreams),
    // // ];

    // return result;
  }

  /**
   * Calculate taxable income from adjusted gross income and standard deduction
   * @param {number} adjustedGrossIncome - Adjusted gross income
   * @param {number} standardDeduction - Standard deduction amount
   * @returns {number} - Taxable income amount
   */
  calculateTaxableIncome(adjustedGrossIncome, standardDeduction) {
    return Math.max(0, adjustedGrossIncome - standardDeduction);
  }

  /**
   * Get demographics information
   * @returns {Demographics} - Demographics instance
   */
  get demographics() {
    return this.#demographics;
  }

  /**
   * Get fiscal data information
   * @returns {FiscalData} - Fiscal data instance
   */
  get fiscalData() {
    return this.#fiscalData;
  }
}

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {FixedIncomeStreams} fixedIncomeStreams
 * @param {AdjustableIncomeStreams} adjustableIncomeStreams
 * @param {Demographics} demographics
 * @param {FiscalData} fiscalData
 */
function calculateIncomeWhenAdjustableIncomeIs(
  fixedIncomeStreams,
  adjustableIncomeStreams,
  demographics,
  fiscalData
) {
  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.calculateIncomeBreakdown(
    fixedIncomeStreams,
    adjustableIncomeStreams
  );
}

/**
 * @param {number} i
 * @param {number} lo
 * @param {number} hi
 */
function logIteration(i, lo, hi) {
  return;
  log.info();
  log.info(
    `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
  );
}

/**
 * @param {number} guestimate401kWithdrawal
 */
function logGuestimate(guestimate401kWithdrawal) {
  return;
  log.info(
    `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
  );
}

/**
 * @param {number} netIncome
 * @param {number} targetIncome
 * @param {number} guestimatedVariableIncomeNeeded
 */
function logGuessResults(
  netIncome,
  targetIncome,
  guestimatedVariableIncomeNeeded
) {
  return;
  const highLow =
    netIncome > targetIncome.asCurrency()
      ? "TOO HIGH"
      : netIncome < targetIncome.asCurrency()
        ? "TOO LOW"
        : "JUST RIGHT";
  const highLowTextColor =
    netIncome > targetIncome.asCurrency()
      ? "\x1b[31m"
      : netIncome < targetIncome.asCurrency()
        ? "\x1b[34m"
        : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
  log.info(
    `When 401k withdrawal is $${guestimatedVariableIncomeNeeded.round(
      0
    )} then the net income will be $${netIncome} ${highLowTextColor}(${highLow})\x1b[0m`
  );
}
