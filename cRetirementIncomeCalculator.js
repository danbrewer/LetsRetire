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
   * Calculate federal income tax based on taxable income and tax brackets
   * @param {number} taxableIncome - Taxable income amount
   * @param {{ rate: number; upTo: number; }[]} brackets - Tax bracket configuration
   * @returns {number} - Federal income tax amount
   */
  determineFederalIncomeTax(taxableIncome, brackets) {
    let tax = 0,
      prev = 0;

    for (const { upTo, rate } of brackets) {
      const slice = Math.min(taxableIncome, upTo) - prev;
      if (slice > 0) tax += slice * rate;
      if (taxableIncome <= upTo) break;
      prev = upTo;
    }
    // log.info(`Total tax calculated is $${tax.asCurrency()}.`);

    return tax.asCurrency();
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
   *
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
  calculateIncomeWhen401kWithdrawalIs(variableTaxableIncome, incomeStreams) {
    const standardDeduction = this.getStandardDeduction();
    const taxBrackets = this.getTaxBrackets();

    const ssBreakdown = SsBenefitsCalculator.CalculateUsing(
      incomeStreams.mySs,
      incomeStreams.spouseSs,
      incomeStreams.nonSsIncome + variableTaxableIncome
    );

    const incomeBreakdown = IncomeBreakdown.CreateFrom(
      incomeStreams,
      variableTaxableIncome,
      ssBreakdown,
      standardDeduction
    );

    incomeBreakdown.federalIncomeTax = this.determineFederalIncomeTax(
      incomeBreakdown.taxableIncome,
      taxBrackets
    );

    return new IncomeRs(ssBreakdown, incomeBreakdown);
  }

  /**
   * Determine 401k withdrawal amount needed to hit a specific net target income
   * @param {number} targetIncome - Target net income to achieve
   * @param {IncomeStreams} incomeStreams - Collection of income sources
   * @returns {{net: number, withdrawalNeeded: number, tax: number, rmd: number, calculationDetails: any}} - Withdrawal calculation results
   */
  determine401kWithdrawalsToHitNetTargetOf(targetIncome, incomeStreams) {
    // Declare and initialize the result object at the top
    /** @type {{net: number, withdrawalNeeded: number, tax: number, rmd: number, calculationDetails: any[]}} */
    const result = {
      net: 0,
      withdrawalNeeded: 0,
      tax: 0,
      rmd: 0,
      calculationDetails: [],
    };

    let lo = 0,
      hi = targetIncome * 2;

    /** @type {{ totalIncome: number, taxableIncome: number, tax: number, netIncome: number, ssBreakdown: SsBenefitsCalculator, incomeBreakdown: IncomeBreakdown}} */
    let income = {
      totalIncome: 0,
      taxableIncome: 0,
      tax: 0,
      netIncome: 0,
      ssBreakdown: SsBenefitsCalculator.Empty(),
      incomeBreakdown: IncomeBreakdown.Empty(),
    };

    for (let i = 0; i < 80; i++) {
      log.info();
      log.info(
        `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
      );
      const guestimate401kWithdrawal = (lo + hi) / 2;
      log.info(
        `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
      );

      let incomeRs = this.calculateIncomeWhen401kWithdrawalIs(
        guestimate401kWithdrawal,
        incomeStreams
      );

      income.incomeBreakdown = incomeRs.incomeBreakdown;
      income.ssBreakdown = incomeRs.ssBreakdown;

      log.info(`Target income is $${targetIncome.asCurrency()}.`);

      const netIncome = income.incomeBreakdown.netIncome.asCurrency();

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
    result.net = income.incomeBreakdown.netIncome.asCurrency();
    result.withdrawalNeeded = hi.asCurrency();
    result.rmd = incomeStreams.rmd;
    result.tax = income.incomeBreakdown.federalIncomeTax.asCurrency();
    result.calculationDetails = [
      withLabel("income", income),
      withLabel("incomeStreams", incomeStreams),
    ];

    return result;
  }

  /**
   * Get tax brackets for the configured filing status, year, and inflation rate
   * @returns {{ rate: number; upTo: number; }[]} - Array of tax brackets
   */
  getTaxBrackets() {
    // The year passed is the actual tax year (e.g., 2025, 2026, 2052, etc.)
    // The adjustedForInflation expects years from the base (2025)
    const yearsFromBase = this.#fiscalData.taxYear - 2025;

    if (
      this.#demographics.filingStatus ===
      constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY
    ) {
      return constsJS_TAX_TABLES_2025.mfj.map((bracket) => ({
        rate: bracket.rate,
        upTo: bracket.upTo.adjustedForInflation(
          this.#fiscalData.inflationRate,
          yearsFromBase
        ),
      }));
    } else {
      return constsJS_TAX_TABLES_2025.single.map((bracket) => ({
        rate: bracket.rate,
        upTo: bracket.upTo.adjustedForInflation(
          this.#fiscalData.inflationRate,
          yearsFromBase
        ),
      }));
    }
  }

  /**
   * Get standard deduction for the configured filing status, year, and inflation rate
   * @returns {number} - Standard deduction amount
   */
  getStandardDeduction() {
    // The year passed should be the actual tax year (e.g., 2025, 2026, 2052, etc.)
    // The adjustedForInflation expects years from the base (2025)
    const yearsFromBase = this.#fiscalData.taxYear - TAX_BASE_YEAR;

    if (
      this.#demographics.filingStatus ===
      constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY
    ) {
      const baseAmount = constsJS_STANDARD_DEDUCTION_2025.mfj;
      const adjusted = baseAmount.adjustedForInflation(
        this.#fiscalData.inflationRate,
        yearsFromBase
      );
      if (isNaN(adjusted)) {
        log.error(
          `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${this.#fiscalData.inflationRate}`
        );
        return 0;
      }
      return adjusted.asCurrency();
    } else {
      const baseAmount = constsJS_STANDARD_DEDUCTION_2025.single;
      const adjusted = baseAmount.adjustedForInflation(
        this.#fiscalData.inflationRate,
        yearsFromBase
      );
      if (isNaN(adjusted)) {
        log.error(
          `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${this.#fiscalData.inflationRate}`
        );
        return 0;
      }
      return adjusted.asCurrency();
    }
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
   * Calculate federal tax using the configured demographics and fiscal data
   * @param {number} taxableIncome - Taxable income amount
   * @returns {number} - Federal tax amount
   */
  calculateFederalTax(taxableIncome) {
    const taxBrackets = this.getTaxBrackets();
    return this.determineFederalIncomeTax(taxableIncome, taxBrackets);
  }

  /**
   * Get demographics information
   * @returns {Demographics} - Demographics instance
   */
  getDemographics() {
    return this.#demographics;
  }

  /**
   * Get fiscal data information
   * @returns {FiscalData} - Fiscal data instance
   */
  getFiscalData() {
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

// Legacy functions for backward compatibility
/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {number} taxableIncome
 * @param {{ rate: number; upTo: number; }[]} brackets
 */
function determineFederalIncomeTax(taxableIncome, brackets) {
  // Create a temporary calculator instance for the calculation
  const tempCalculator = RetirementIncomeCalculator.Empty();
  return tempCalculator.determineFederalIncomeTax(taxableIncome, brackets);
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

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {number} targetIncome
 * @param {IncomeStreams} incomeStreams
 * @param {Demographics} demographics
 * @param {FiscalData} fiscalData
 */
function determine401kWithdrawalsToHitNetTargetOf(
  targetIncome,
  incomeStreams,
  demographics,
  fiscalData
) {
  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.determine401kWithdrawalsToHitNetTargetOf(
    targetIncome,
    incomeStreams
  );
}

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {string} filingStatus
 * @param {number} year
 * @param {number} inflationRate
 */
function getTaxBrackets(filingStatus, year, inflationRate) {
  const demographics = Demographics.Empty();
  demographics.filingStatus = filingStatus;
  const fiscalData = FiscalData.Empty();
  fiscalData.taxYear = year;
  fiscalData.inflationRate = inflationRate;

  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.getTaxBrackets();
}

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {string} filingStatus
 * @param {number} year
 * @param {number} inflationRate
 */
function getStandardDeduction(filingStatus, year, inflationRate) {
  // Handle potential parameter order issues or missing parameters
  let correctedFilingStatus = filingStatus;
  let correctedYear = year;
  let correctedInflationRate = inflationRate;

  // If parameters seem to be in wrong order, try to auto-correct
  if (typeof filingStatus === "number" && typeof year === "string") {
    log.warn("Parameter order appears incorrect. Auto-correcting.");
    correctedFilingStatus = year;
    correctedYear = filingStatus;
  }

  // Provide defaults for missing parameters
  if (correctedInflationRate === undefined || correctedInflationRate === null) {
    correctedInflationRate = 0.025; // Default 2.5% inflation
    log.warn(
      `Missing inflationRate parameter. Using default: ${correctedInflationRate}`
    );
  }

  if (!correctedFilingStatus) {
    correctedFilingStatus = constsJS_FILING_STATUS.SINGLE;
    log.warn(
      `Missing filingStatus parameter. Using default: ${correctedFilingStatus}`
    );
  }

  if (correctedYear === undefined || correctedYear === null) {
    correctedYear = 2025;
    log.warn(`Missing year parameter. Using default: ${correctedYear}`);
  }

  const demographics = Demographics.Empty();
  demographics.filingStatus = correctedFilingStatus;
  const fiscalData = FiscalData.Empty();
  fiscalData.taxYear = correctedYear;
  fiscalData.inflationRate = correctedInflationRate;

  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.getStandardDeduction();
}

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {number} adjustedGrossIncome
 * @param {number} standardDeduction
 */
function calculateTaxableIncome(adjustedGrossIncome, standardDeduction) {
  const tempCalculator = RetirementIncomeCalculator.Empty();
  return tempCalculator.calculateTaxableIncome(
    adjustedGrossIncome,
    standardDeduction
  );
}

/**
 * @deprecated Use RetirementIncomeCalculator class instead
 * @param {number} taxableIncome
 * @param {string} filingStatus
 * @param {number} year
 * @param {number} inflationRate
 */
function calculateFederalTax(
  taxableIncome,
  filingStatus = constsJS_FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const demographics = Demographics.Empty();
  demographics.filingStatus = filingStatus;
  const fiscalData = FiscalData.Empty();
  fiscalData.taxYear = year;
  fiscalData.inflationRate = inflationRate;

  const calculator = new RetirementIncomeCalculator(demographics, fiscalData);
  return calculator.calculateFederalTax(taxableIncome);
}
