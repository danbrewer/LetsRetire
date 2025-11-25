/**
 * RetirementIncomeCalculator class - Handles retirement income and tax calculations
 * Provides comprehensive income analysis for retirement planning scenarios
 */
class WorkingIncomeCalculator {
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
  calculateIncome(incomeStreams) {
    const standardDeduction = TaxCalculator.getStandardDeduction(
      this.#fiscalData,
      this.#demographics
    );

    const incomeBreakdown = IncomeBreakdown.CreateFrom(
      incomeStreams,
      0,
      null,
      standardDeduction,
      this.#demographics,
      this.#fiscalData
    );

    return new IncomeRs(null, incomeBreakdown);
  }

  /**
   * @param {IncomeStreams} incomeStreams
   */
  // calculateFixedIncomeOnly(incomeStreams) {
  //   const nonSsIncomeSources = [
  //     incomeStreams.myPension,
  //     incomeStreams.spousePension,
  //     incomeStreams.rmd,
  //     incomeStreams.miscTaxableIncome,
  //   ];
  //   return this.calculateIncomeWhen401kWithdrawalIs(
  //     0,
  //     incomeStreams,
  //     nonSsIncomeSources
  //   );
  // }

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

  /**
   * Create an empty RetirementIncomeCalculator instance
   * @returns {RetirementIncomeCalculator} - Empty calculator instance
   */
  static Empty() {
    return new RetirementIncomeCalculator(
      Demographics.Empty(),
      FiscalData.Empty()
    );
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

// /**
//  * @deprecated Use RetirementIncomeCalculator class instead
//  * @param {number} targetIncome
//  * @param {IncomeStreams} incomeStreams
//  * @param {Demographics} demographics
//  * @param {FiscalData} fiscalData
//  */
// function determine401kWithdrawalsToHitNetTargetOf(
//   targetIncome,
//   incomeStreams,
//   demographics,
//   fiscalData
// ) {
//   const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
//   return calculator.determine401kWithdrawalsToHitNetTargetOf(
//     targetIncome,
//     incomeStreams
//   );
// }

// /**
//  * @deprecated Use RetirementIncomeCalculator class instead
//  * @param {string} filingStatus
//  * @param {number} year
//  * @param {number} inflationRate
//  */
// function getTaxBrackets(filingStatus, year, inflationRate) {
//   const demographics = Demographics.Empty();
//   demographics.filingStatus = filingStatus;
//   const fiscalData = FiscalData.Empty();
//   fiscalData.taxYear = year;
//   fiscalData.inflationRate = inflationRate;

//   const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
//   return calculator.getTaxBrackets();
// }

// /**
//  * @deprecated Use RetirementIncomeCalculator class instead
//  * @param {number} taxableIncome
//  * @param {string} filingStatus
//  * @param {number} year
//  * @param {number} inflationRate
//  */
// function calculateFederalTax(
//   taxableIncome,
//   filingStatus = constsJS_FILING_STATUS.SINGLE,
//   year = 2025,
//   inflationRate = 0.025
// ) {
//   const demographics = Demographics.Empty();
//   demographics.filingStatus = filingStatus;
//   const fiscalData = FiscalData.Empty();
//   fiscalData.taxYear = year;
//   fiscalData.inflationRate = inflationRate;

//   const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
//   return calculator.calculateFederalTax(taxableIncome);
// }
