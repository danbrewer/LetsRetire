import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { IncomeRs } from "./cIncomeRs.js";
import { IncomeStreams } from "./cIncomeStreams.js";
import { SsBenefitsCalculator } from "./cSsBenefitsCalculator.js";
import { withLabel, log } from "./debugUtils.js";
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
   * @param {number} variableTaxableIncome - The 401k/traditional retirement account withdrawal
   *   amount to include in income calculations. This variable amount affects both reportable
   *   income and Social Security taxation calculations.
   *
   * @param {IncomeStreams} incomeStreams - Collection of all income sources containing:
   *   - mySs: Primary person's Social Security benefits
   *   - spouseSs: Spouse's Social Security benefits (if applicable)
   *   - myPension: Primary person's pension income
   *   - spousePension: Spouse's pension income (if applicable)
   *   - reportedEarnedInterest: Taxable interest income from savings
   *   - rmd: Required Minimum Distribution amounts
   *   - otherTaxableIncomeAdjustments: Additional taxable income sources
   *   - nonSsIncome(): Method returning total non-Social Security income
   *   - nonSsIncomeSources: Array of non-Social Security income sources
   * @param {Array<number> | null} [nonSsIncomeSources] - (Optional) Array of non-Social Security income sources
   * @returns {IncomeRs} Comprehensive income calculation results containing:
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
  calculateIncomeWhen401kWithdrawalIs(
    variableTaxableIncome,
    incomeStreams,
    nonSsIncomeSources
  ) {
    if (!nonSsIncomeSources || nonSsIncomeSources.length === 0) {
      nonSsIncomeSources = [
        incomeStreams.myPension,
        incomeStreams.spousePension,
        incomeStreams.interestEarnedOnSavings,
        incomeStreams.rmd,
        incomeStreams.miscTaxableIncome,
      ];
    }

    const nonSsIncome = nonSsIncomeSources.reduce((sum, val) => sum + val, 0);

    const ssBreakdown = SsBenefitsCalculator.CalculateUsing(
      incomeStreams.mySs,
      incomeStreams.spouseSs,
      nonSsIncome + variableTaxableIncome,
      this.#demographics.hasPartner
    );

    const incomeBreakdown = IncomeBreakdown.CreateFrom(
      incomeStreams,
      variableTaxableIncome,
      ssBreakdown.calculationDetails,
      this.#demographics,
      this.#fiscalData
    );

    return new IncomeRs(ssBreakdown, incomeBreakdown);
  }

  /**
   * @param {IncomeStreams} incomeStreams
   */
  calculateFixedIncomeOnly(incomeStreams) {
    const nonSsIncomeSources = [
      incomeStreams.myPension,
      incomeStreams.spousePension,
      incomeStreams.rmd,
      incomeStreams.miscTaxableIncome,
    ];
    return this.calculateIncomeWhen401kWithdrawalIs(
      0,
      incomeStreams,
      nonSsIncomeSources
    );
  }

  /**
   * Determine 401k withdrawal amount needed to hit a specific net target income
   * @param {number} targetIncome - Target net income to achieve
   * @param {IncomeStreams} incomeStreams - Collection of income sources
   * @returns {{desiredNetTarget: number, trad401kWithdrawalNeeded: number, tax: number, rmd: number, calculationDetails: any[]}} - Withdrawal calculation results
   */
  determine401kWithdrawalsToHitNetTargetOf(targetIncome, incomeStreams) {
    // Declare and initialize the result object at the top
    /** @type {{desiredNetTarget: number, trad401kWithdrawalNeeded: number, tax: number, rmd: number, calculationDetails: any[]}} */
    const result = {
      desiredNetTarget: 0,
      trad401kWithdrawalNeeded: 0,
      tax: 0,
      rmd: 0,
      calculationDetails: [],
    };

    let lo = 0,
      hi = targetIncome * 2;

    /** @type {IncomeRs | null}} */
    let incomeRs = null;

    for (let i = 0; i < 80; i++) {
      log.info();
      log.info(
        `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
      );
      const guestimate401kWithdrawal = (lo + hi) / 2;
      log.info(
        `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
      );

      incomeRs = this.calculateIncomeWhen401kWithdrawalIs(
        guestimate401kWithdrawal,
        incomeStreams
      );

      //   income.incomeBreakdown = incomeRs.incomeBreakdown;
      //   income.ssBreakdown = incomeRs.ssBreakdown;

      log.info(`Target income is $${targetIncome.asCurrency()}.`);

      const netIncome =
        incomeRs?.incomeBreakdown.netIncome //getNetIncomeMinusReportedEarnedInterest()
          .asCurrency() ?? 0;

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
        `When 401k withdrawal is $${guestimate401kWithdrawal.round(
          0
        )} then the net income will be $${netIncome} ${highLowTextColor}(${highLow})\x1b[0m`
      );

      if (netIncome == targetIncome.asCurrency()) break;
      if (netIncome < targetIncome) lo = guestimate401kWithdrawal;
      else hi = guestimate401kWithdrawal;
      if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
    }

    // Update all the final values in the result object
    result.desiredNetTarget =
      incomeRs?.incomeBreakdown.netIncome //getNetIncomeMinusReportedEarnedInterest()
        .asCurrency() ?? 0;
    result.trad401kWithdrawalNeeded =
      incomeRs?.incomeBreakdown.trad401kWithdrawal.asCurrency() ?? 0; // hi.asCurrency();
    result.rmd = incomeStreams.rmd;
    result.tax = incomeRs?.incomeBreakdown.federalIncomeTax.asCurrency() ?? 0;
    result.calculationDetails = [
      withLabel("incomeRs", incomeRs),
      withLabel("incomeStreams", incomeStreams),
    ];

    return result;
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
 * @param {number} variableIncomeFactor
 * @param {IncomeStreams} incomeStreams
 * @param {Demographics} demographics
 * @param {FiscalData} fiscalData
 */
function calculateIncomeWhen401kWithdrawalIs(
  variableIncomeFactor,
  incomeStreams,
  demographics,
  fiscalData
) {
  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.calculateIncomeWhen401kWithdrawalIs(
    variableIncomeFactor,
    incomeStreams
  );
}

export {
  RetirementIncomeCalculator,
  calculateIncomeWhen401kWithdrawalIs,
};