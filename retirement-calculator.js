// retirement-calculator.js

if (typeof require === "function") {
  // Running in Node.js
  // const fs = require("retirement.js");
  const { FILING_STATUS } = require("./retirement");
}

// --- Added by patch: 2025 elective deferral limits (401k/Roth 401k) ---
const EMPLOYEE_401K_LIMIT_2025 = 23000; // elective deferral
const EMPLOYEE_401K_CATCHUP_50 = 7500; // catch-up age 50+

// Track previous ages to only regenerate spending fields when they change
let lastRetireAge = null;
let lastEndAge = null;
let lastCurrentAge = null;

const compoundedRate = (r, n) => Math.pow(1 + r, n);

/**
 * Effective Tax Rate Table and Standard Deductions
 *
 * This table provides estimated effective federal tax rates for different Taxable Income levels.
 * These rates are based on 2025 tax brackets and include proper
 * standard deduction handling.
 *
 * 2025 Standard Deductions:
 * - Single filers: $15,000 (estimated)
 * - Married filing jointly: $32,600
 *
 * Note: These are simplified estimates and do not account for:
 * - State taxes
 * - Itemized deductions beyond standard deduction
 * - Tax credits
 * - FICA taxes on earned income
 * - Capital gains vs ordinary income distinctions
 * - Additional standard deduction for seniors (65+)
 *
 * For accurate tax planning, consult a tax professional.
 */

// Tax calculation base year and standard deductions
// To update for a new year: Change TAX_BASE_YEAR and update STANDARD_DEDUCTIONS_BASE with current values
const TAX_BASE_YEAR = 2025;
const STANDARD_DEDUCTIONS_BASE = {
  single: 15000,
  married: 32600,
};

/**
 * Calculate inflation-adjusted standard deduction for a given year
 *
 * Tax Policy Assumptions:
 * - Standard deductions are inflation-indexed annually (since 1986)
 * - Uses 2.5% annual inflation rate for projections
 * - Social Security provisional income thresholds remain static at $25K/$32K (unchanged since 1983)
 *
 * @param {number} year - The tax year
 * @param {string} filingStatus - "single" or "married"
 * @returns {number} Inflation-adjusted standard deduction
 */
function getStandardDeduction(year, filingStatus = FILING_STATUS.SINGLE) {
  const inflationRate = 0.025; // 2.5% annual inflation
  const yearsFromBase = year - TAX_BASE_YEAR;

  const baseDeduction =
    STANDARD_DEDUCTIONS_BASE[filingStatus] || STANDARD_DEDUCTIONS_BASE.single;

  // Apply compound inflation adjustment
  const adjustedDeduction =
    baseDeduction * Math.pow(1 + inflationRate, yearsFromBase);

  return Math.round(adjustedDeduction);
}

const EFFECTIVE_TAX_RATES = {
  // Taxable Income: Effective Rate (%) - Based on 2025 Married Filing Jointly Tax Brackets
  // 10%: $0 – $23,200, 12%: $23,200 – $94,300, 22%: $94,300 – $201,050, 24%: $201,050+
  // These rates are applied to Taxable Income (after standard deduction)
  0: 0.0,
  5000: 10.0, // $5,000 × 10% = $500 → 10.0%
  10000: 10.0, // $10,000 × 10% = $1,000 → 10.0%
  15000: 10.0, // $15,000 × 10% = $1,500 → 10.0%
  20000: 10.0, // $20,000 × 10% = $2,000 → 10.0%
  23200: 10.0, // $23,200 × 10% = $2,320 → 10.0%
  30000: 10.5, // $2,320 + $6,800×12% = $3,136 → 10.5%
  40000: 10.8, // $2,320 + $16,800×12% = $4,336 → 10.8%
  50000: 11.1, // $2,320 + $26,800×12% = $5,536 → 11.1%
  60000: 11.2, // $2,320 + $36,800×12% = $6,736 → 11.2%
  70000: 11.3, // $2,320 + $46,800×12% = $7,936 → 11.3%
  74900: 11.4, // $2,320 + $51,700×12% = $8,524 → 11.4% (matches your example)
  80000: 11.4, // $2,320 + $56,800×12% = $9,136 → 11.4%
  90000: 11.5, // $2,320 + $66,800×12% = $10,336 → 11.5%
  94300: 11.5, // $2,320 + $71,100×12% = $10,852 → 11.5%
  100000: 12.1, // $10,852 + $5,700×22% = $12,106 → 12.1%
  110000: 12.7, // $10,852 + $15,700×22% = $14,306 → 13.0%
  120000: 13.5, // $10,852 + $25,700×22% = $16,506 → 13.8%
  130000: 14.1, // $10,852 + $35,700×22% = $18,706 → 14.4%
  140000: 14.9, // $10,852 + $45,700×22% = $20,906 → 14.9%
  150000: 15.5, // $10,852 + $55,700×22% = $23,106 → 15.4%
  160000: 16.0, // $10,852 + $65,700×22% = $25,306 → 15.8%
  170000: 16.4, // $10,852 + $75,700×22% = $27,506 → 16.2%
  180000: 16.9, // $10,852 + $85,700×22% = $29,706 → 16.5%
  190000: 17.3, // $10,852 + $95,700×22% = $31,906 → 16.8%
  200000: 17.6, // $10,852 + $105,700×22% = $34,106 → 17.1%
  201050: 17.7, // $10,852 + $106,750×22% = $34,337 → 17.1%
  220000: 18.1, // $34,337 + $18,950×24% = $38,885 → 17.7%
  240000: 18.5, // $34,337 + $38,950×24% = $43,685 → 18.2%
  260000: 18.9, // $34,337 + $58,950×24% = $48,485 → 18.6%
  280000: 19.2, // $34,337 + $78,950×24% = $53,285 → 19.0%
  300000: 19.5, // $34,337 + $98,950×24% = $58,085 → 19.4%
};

/**
 * Calculate Taxable Income by subtracting standard deduction from gross income
 * @param {number} grossIncome - Total gross income
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Adjusted Gross Income (cannot be negative)
 */
/**
 * Calculate taxable income with inflation-adjusted standard deduction
 *
 * @param {number} grossIncome - Gross income for the year
 * @param {string} filingStatus - "single" or "married"
 * @param {number} year - Tax year for inflation-adjusted deduction
 * @returns {number} Taxable income after standard deduction
 */
function calculateTaxableIncome(
  grossIncome,
  filingStatus = "single",
  year = TAX_BASE_YEAR
) {
  const standardDeduction = getStandardDeduction(year, filingStatus);
  return Math.max(0, grossIncome - standardDeduction);
}

/**
 * Calculate effective tax rate for a given Taxable Income using linear interpolation
 * @param {number} taxableIncome - Adjusted Gross Income
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRate(taxableIncome) {
  // Handle edge cases
  if (taxableIncome <= 0) return 0;
  if (taxableIncome >= 200000) return EFFECTIVE_TAX_RATES[200000];

  // Find the two closest taxable income levels for interpolation
  const taxableIncomeLevels = Object.keys(EFFECTIVE_TAX_RATES)
    .map(Number)
    .sort((a, b) => a - b);

  // Find exact match
  if (EFFECTIVE_TAX_RATES[taxableIncome] !== undefined) {
    return EFFECTIVE_TAX_RATES[taxableIncome];
  }

  // Find interpolation points
  let lowerAgi = 0;
  let upperAgi = 200000;

  for (let i = 0; i < taxableIncomeLevels.length - 1; i++) {
    if (
      taxableIncome >= taxableIncomeLevels[i] &&
      taxableIncome <= taxableIncomeLevels[i + 1]
    ) {
      lowerAgi = taxableIncomeLevels[i];
      upperAgi = taxableIncomeLevels[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerRate = EFFECTIVE_TAX_RATES[lowerAgi];
  const upperRate = EFFECTIVE_TAX_RATES[upperAgi];
  const ratio = (taxableIncome - lowerAgi) / (upperAgi - lowerAgi);

  return lowerRate + (upperRate - lowerRate) * ratio;
}

/**
 * Calculate effective tax rate for married filing jointly (approximately 2x the single brackets)
 * @param {number} taxableIncome - Adjusted Gross Income for married couple
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRateMarried(taxableIncome) {
  // For married filing jointly, use the same rates as single but on the full Taxable Income
  // The standard deduction is already doubled in calculateTaxableIncome()
  // The tax brackets for MFJ are roughly 2x single brackets, so rates are similar
  return getEffectiveTaxRate(taxableIncome);
}

/**
 * Get tax amount based on gross income and filing status
 * @param {number} grossIncome - Total gross income before standard deduction
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated federal tax amount
 */
function calculateFederalTax(
  grossIncome,
  filingStatus = "single",
  year = TAX_BASE_YEAR
) {
  // First calculate Taxable Income by subtracting standard deduction
  const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus, year);

  // Then get effective rate based on Taxable Income
  const effectiveRate =
    filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
      ? getEffectiveTaxRateMarried(taxableIncome)
      : getEffectiveTaxRate(taxableIncome);

  // Tax is calculated on the Taxable Income, not gross income
  return taxableIncome * (effectiveRate / 100);
}

/**
 * Get marginal tax rate estimate for additional income
 * @param {number} currentGrossIncome - Current gross income
 * @param {number} additionalIncome - Additional income to evaluate
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated marginal tax rate as percentage
 */
function getMarginalTaxRate(
  currentGrossIncome,
  additionalIncome = 1000,
  filingStatus = "single"
) {
  const currentTax = calculateFederalTax(currentGrossIncome, filingStatus);
  const newTax = calculateFederalTax(
    currentGrossIncome + additionalIncome,
    filingStatus
  );

  return ((newTax - currentTax) / additionalIncome) * 100;
}

// /**
//  * Display tax calculation examples for reference
//  * @param {string} filingStatus - 'single' or 'married'
//  */
// function displayTaxExamples(filingStatus = "single") {
//   // console.log(`\n=== Tax Rate Examples (${filingStatus} filer) ===`);
//   // console.log(`Standard Deduction: $${STANDARD_DEDUCTIONS[filingStatus].toLocaleString()}`);
//   const testGrossIncomes = [25000, 50000, 75000, 100000, 150000, 200000];

//   testGrossIncomes.forEach((grossIncome) => {
//     const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus);
//     const effectiveRate =
//       filingStatus === "married"
//         ? getEffectiveTaxRateMarried(taxableIncome)
//         : getEffectiveTaxRate(taxableIncome);
//     const taxAmount = calculateFederalTax(grossIncome, filingStatus);
//     const marginalRate = getMarginalTaxRate(grossIncome, 1000, filingStatus);

//     // console.log(`Gross $${grossIncome.toLocaleString()} → Taxable Income $${taxableIncome.toLocaleString()}: Effective ${effectiveRate.toFixed(1)}%, Tax $${Math.round(taxAmount).toLocaleString()}, Marginal ${marginalRate.toFixed(1)}%`);
//   });
//   // console.log("=================================\n");
// }

// Social Security taxation calculation based on provisional income
function calculateSSTaxableAmount(
  ssGross,
  otherTaxableIncome,
  isMarried = false
) {
  if (ssGross <= 0) return 0;

  // Calculate provisional income:
  // All taxable Income + 50% of SS benefits
  const provisionalIncome = otherTaxableIncome + ssGross * 0.5;

  // Set thresholds based on filing status
  const threshold1 = isMarried ? 32000 : 25000; // 0% to 50% transition
  const threshold2 = isMarried ? 44000 : 34000; // 50% to 85% transition

  let taxableAmount = 0;

  if (provisionalIncome <= threshold1) {
    // No SS benefits are taxable
    taxableAmount = 0;
  } else if (provisionalIncome <= threshold2) {
    // Up to 50% of SS benefits are taxable
    const excessIncome = provisionalIncome - threshold1;
    taxableAmount = Math.min(ssGross * 0.5, excessIncome * 0.5);
  } else {
    // Up to 85% of SS benefits are taxable
    // First calculate tier 1 amount (same as if we were in tier 1)
    const tier1ExcessIncome = threshold2 - threshold1; // Full range of tier 1
    const tier1Max = Math.min(ssGross * 0.5, tier1ExcessIncome * 0.5);

    // Then calculate tier 2 amount
    const tier2ExcessIncome = provisionalIncome - threshold2;
    const tier2Amount = Math.min(ssGross * 0.35, tier2ExcessIncome * 0.85); // Additional 35% (85% - 50%)

    taxableAmount = Math.min(ssGross * 0.85, tier1Max + tier2Amount);
  }

  return taxableAmount;
}

// Required Minimum Distribution (RMD) calculation
// Based on IRS Uniform Lifetime Table for 2024+
function calculateRMD(age, accountBalance) {
  if (age < 73 || accountBalance <= 0) return 0;

  // IRS Uniform Lifetime Table (simplified version for common ages)
  const lifeFactor = {
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22.0,
    79: 21.1,
    80: 20.2,
    81: 19.4,
    82: 18.5,
    83: 17.7,
    84: 16.8,
    85: 16.0,
    86: 15.2,
    87: 14.4,
    88: 13.7,
    89: 12.9,
    90: 12.2,
    91: 11.5,
    92: 10.8,
    93: 10.1,
    94: 9.5,
    95: 8.9,
    96: 8.4,
    97: 7.8,
    98: 7.3,
    99: 6.8,
    100: 6.4,
  };

  // For ages beyond 100, use declining factors
  let factor;
  if (age <= 100) {
    factor = lifeFactor[age] || lifeFactor[100];
  } else {
    // Linear decline after 100
    factor = Math.max(1.0, lifeFactor[100] - (age - 100) * 0.1);
  }

  return accountBalance / factor;
}

/**
 * Calculate one year of accumulation phase (working years)
 */
function calculateWorkingYearData(inputs, year, salary, balances) {
  const age = inputs.currentAge + year;

  // Calculate current year living expenses (retirement spending adjusted to current year)
  const currentYearSpending = inputs.spendingToday.adjustedForInflation(
    inputs.inflation,
    year
  );

  // Desired contributions this year
  let desiredPre = salary * inputs.pretaxPct;
  let desiredRoth = salary * inputs.rothPct;

  // 401k/Roth 401k elective deferral cap (employee-only)
  let electiveLimit =
    EMPLOYEE_401K_LIMIT_2025 + (age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0);
  const totalDesired = desiredPre + desiredRoth;
  let scale = totalDesired > 0 ? Math.min(1, electiveLimit / totalDesired) : 1;
  const cPre = desiredPre * scale;
  const cRoth = desiredRoth * scale;

  // Employer match based on actual pre-tax contribution %, capped by matchCap
  const actualPrePct = salary > 0 ? cPre / salary : 0;
  const match =
    Math.min(actualPrePct, inputs.matchCap) * salary * inputs.matchRate;

  // Calculate taxes on working income including taxable interest
  const taxableInterestIncome = balances.balSavings * inputs.rateOfSavings;

  // Get taxable income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age);

  let grossTaxableIncome =
    salary - cPre + taxableInterestIncome + taxableIncomeAdjustment;

  const workingYearTaxes = calculateFederalTax(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year
  );

  // // Debug tax calculation for first few years
  // if (year < 3) {
  //   const taxableIncomeAfterDeduction = calculateTaxableIncome(
  //     grossTaxableIncome,
  //     inputs.filingStatus,
  //     TAX_BASE_YEAR + year
  //   );
  //   const effectiveRate =
  //     inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
  //       ? getEffectiveTaxRateMarried(taxableIncomeAfterDeduction)
  //       : getEffectiveTaxRate(taxableIncomeAfterDeduction);
  // }

  // After-tax income calculations
  // Total gross income includes salary plus additional taxable income
  const totalGrossIncome = salary + taxableIncomeAdjustment;
  const afterTaxIncome = totalGrossIncome - cPre - workingYearTaxes - cRoth;
  const availableForSpendingAndSavings = afterTaxIncome;
  const remainingAfterSpending = Math.max(
    0,
    availableForSpendingAndSavings - currentYearSpending
  );
  const desiredTaxableSavings = salary * inputs.taxablePct;
  const cTax = Math.min(desiredTaxableSavings, remainingAfterSpending);

  // Update balances
  // Get tax-free income adjustments for this age
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age);

  // Track savings breakdown for working years
  const savingsStartBalance = balances.balSavings;
  const taxableInterestEarned = balances.balSavings * inputs.rateOfSavings;

  balances.balPre = (balances.balPre + cPre + match) * (1 + inputs.retPre);
  balances.balRoth = (balances.balRoth + cRoth) * (1 + inputs.retRoth);
  balances.balSavings =
    (balances.balSavings + cTax + taxFreeIncomeAdjustment) *
    (1 + inputs.rateOfSavings);

  return {
    age,
    salary,
    contrib: cPre + cRoth + cTax + match,
    ss: 0,
    pen: 0,
    spouseSs: 0,
    spousePen: 0,
    spend: currentYearSpending,
    wNet: 0,
    w401kNet: 0,
    wSavingsRothNet: 0,
    wGross: 0,
    w401kGross: 0,
    wSavingsGross: 0,
    wRothGross: 0,
    taxes: workingYearTaxes,
    ssTaxes: 0,
    otherTaxes: workingYearTaxes,
    nonTaxableIncome: taxFreeIncomeAdjustment, // Tax-free income adjustment
    taxableIncome: calculateTaxableIncome(
      grossTaxableIncome,
      inputs.filingStatus,
      TAX_BASE_YEAR + year
    ), // Working year taxable income after standard deduction
    taxableInterest: taxableInterestIncome, // Track taxable interest earned
    totalIncome: totalGrossIncome + taxableInterestIncome, // Total income for working years including adjustments
    totalNetIncome: afterTaxIncome + taxFreeIncomeAdjustment, // Net income including tax-free adjustments
    totalGrossIncome: totalGrossIncome + taxableInterestIncome, // Gross income for working years including adjustments
    effectiveTaxRate:
      calculateTaxableIncome(
        grossTaxableIncome,
        inputs.filingStatus,
        TAX_BASE_YEAR + year
      ) > 0
        ? (workingYearTaxes /
            calculateTaxableIncome(
              grossTaxableIncome,
              inputs.filingStatus,
              TAX_BASE_YEAR + year
            )) *
          100
        : 0,
    provisionalIncome: 0, // No Social Security during working years
    standardDeduction: getStandardDeduction(
      TAX_BASE_YEAR + year,
      inputs.filingStatus
    ), // Standard deduction for this tax year
    balSavings: balances.balSavings,
    balPre: balances.balPre,
    balRoth: balances.balRoth,
    total: balances.balSavings + balances.balPre + balances.balRoth,
    // Add savings breakdown data for popup
    savingsBreakdown: {
      startingBalance: savingsStartBalance,
      withdrawals: 0, // No withdrawals during working years
      overageDeposit: 0, // No overage during working years
      taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
      regularDeposit: cTax, // Regular taxable savings contribution
      interestEarned: taxableInterestEarned,
      endingBalance: balances.balSavings,
      growthRate: inputs.rateOfSavings * 100,
    },
    // Add empty SS breakdown for working years
    ssBreakdown: {
      ssGross: 0,
      ssTaxableAmount: 0,
      ssNonTaxable: 0,
      ssTaxes: 0,
    },
  };
}

/**
 * Calculate spouse benefit amounts at the time of primary person's retirement
 */
function calculateSpouseBenefits(inputs) {
  let spouseSsAnnual = 0;
  let spousePenAnnual = 0;

  if (inputs.hasSpouse) {
    const spouseCurrentYear = inputs.retireAge - inputs.currentAge; // Years from now when primary person retires
    const spouseAgeAtPrimaryRetirement = inputs.spouseAge + spouseCurrentYear;

    spouseSsAnnual = inputs.spouseSsMonthly * 12;
    // spouseSsColaRate = inputs.spouseSsCola;

    // spouseSsAnnual =
    //   spouseSsAnnual *
    //   (spouseAgeAtPrimaryRetirement >= inputs.spouseSsStart
    //     ? compoundedRate(
    //         spouseSsColaRate,
    //         spouseAgeAtPrimaryRetirement - inputs.spouseSsStart
    //       )
    //     : 1);
    spousePenAnnual = inputs.spousePenMonthly * 12;
    //  *
    // (spouseAgeAtPrimaryRetirement >= inputs.spousePenStart
    //   ? compoundedRate(
    //       inputs.spousePenCola,
    //       spouseAgeAtPrimaryRetirement - inputs.spousePenStart
    //     )
    //   : 1);
  }

  return { spouseSsAnnual, spousePenAnnual };
}

/**
 * Calculate Social Security taxation for a given year
 */
function calculateSocialSecurityTaxation(
  inputs,
  ssGross,
  otherTaxableIncome,
  year = 0
) {
  if (!ssGross || ssGross <= 0) {
    return {
      ssNet: 0,
      ssTaxableAmount: 0,
      ssNonTaxable: 0,
      ssTaxes: 0,
      calculationDetails: {
        provisionalIncome: 0,
        threshold1: 0,
        threshold2: 0,
        tier1Amount: 0,
        tier2Amount: 0,
        method: "none",
      },
    };
  }

  const isMarried =
    inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY;

  // Use proper SS taxation rules based on provisional income
  // Calculate provisional income: Taxable Income + non-taxable interest + 50% of SS benefits
  const provisionalIncome = otherTaxableIncome + ssGross * 0.5;

  // Set thresholds based on filing status
  const threshold1 = isMarried ? 32000 : 25000; // 50% taxable inflection point
  const threshold2 = isMarried ? 44000 : 34000; // 85% taxable inflection point

  let ssTaxableDollars = 0;
  let tier1TaxableDollars = 0;
  let tier2TaxableDollars = 0;

  if (provisionalIncome <= threshold1) {
    // No SS benefits are taxable
    ssTaxableDollars = 0;
    tier1TaxableDollars = 0;
    tier2TaxableDollars = 0;
  } else if (provisionalIncome <= threshold2) {
    // Up to 50% of SS benefits are taxable
    const incomeInExcessOfTier1 = provisionalIncome - threshold1;
    tier1TaxableDollars = Math.min(ssGross * 0.5, incomeInExcessOfTier1 * 0.5);
    tier2TaxableDollars = 0;
    ssTaxableDollars = tier1TaxableDollars;
  } else {
    // Up to 85% of SS benefits are taxable
    // First calculate tier 1 amount (same as if we were in tier 1)
    const provIncomeInExcessOfTier1 = threshold2 - threshold1; // 50% of dollars in tier1 are taxable
    tier1TaxableDollars = Math.min(
      ssGross * 0.5,
      provIncomeInExcessOfTier1 * 0.5
    );

    // Then calculate tier 2 amount
    const provIncomeInExcessOfTier2 = provisionalIncome - threshold2;
    tier2TaxableDollars = Math.min(
      ssGross * 0.85,
      provIncomeInExcessOfTier2 * 0.85
    );

    ssTaxableDollars = Math.min(
      ssGross * 0.85,
      tier1TaxableDollars + tier2TaxableDollars
    );
  }

  const ssNonTaxable = ssGross - ssTaxableDollars;

  // Don't calculate separate SS taxes - the taxable SS amount will be included in total taxable income
  return {
    ssGross,
    ssTaxableAmount: ssTaxableDollars,
    ssNonTaxable,
    ssTaxes: 0, // No separate SS taxes - included in total income tax calculation
    calculationDetails: {
      provisionalIncome,
      threshold1,
      threshold2,
      tier1Amount: tier1TaxableDollars,
      tier2Amount: tier2TaxableDollars,
      excessIncome1: Math.max(0, provisionalIncome - threshold1),
      excessIncome2: Math.max(0, provisionalIncome - threshold2),
      effectiveRate: 0, // Will be calculated on total income
      method: "irs-rules",
    },
  };
}

/**
 * Calculate pension taxation for a given year
 */
function buildPensionTracker(inputs, penGross, totalTaxableIncome, year = 0) {
  if (!penGross || penGross <= 0) {
    return {
      penGross: 0,
      penTaxes: 0,
      penNet: 0,
      penNonTaxable: 0,
      pensionTaxRate: 0,
    };
  }

  // Pensions are typically fully taxable, but we track for consistency
  const penTaxableAmount = penGross; // 100% taxable
  const penNonTaxable = 0; // 0% non-taxable

  // Don't calculate separate pension taxes - will be included in total income tax calculation
  const penTaxes = 0;
  const penNet = penGross; // Full gross amount; taxes calculated on total income

  return {
    penGross,
    penTaxes,
    penNet,
    penNonTaxable,
    pensionTaxRate: 0, // Will be calculated as part of total income
  };
}

/**
 * Create withdrawal function for a specific retirement year
 */
function createWithdrawalFunction(
  inputs,
  balances,
  totalTaxableIncomeRef,
  year = 0
) {
  let taxesThisYear = 0;
  let withdrawalsBySource = {
    retirementAccount: 0,
    savingsAccount: 0,
    roth: 0,
  };

  function withdrawFrom(kind, desiredNetAmount) {
    // console.log(`withdrawFrom called with kind: "${kind}", netAmount: ${netAmount}`);
    if (desiredNetAmount <= 0) return { gross: 0, net: 0 };

    // Validate kind parameter
    if (!kind || typeof kind !== "string") {
      console.error("Invalid withdrawal kind:", kind);
      return { gross: 0, net: 0 };
    }

    // Determine balance reference and setter function
    let balRef = 0,
      setBal;

    if (kind === "savings") {
      balRef = balances.balSavings;
      setBal = (v) => {
        balances.balSavings = v;
      };
    } else if (kind === "pretax") {
      balRef = balances.balPre;
      setBal = (v) => {
        balances.balPre = v;
      };
    } else if (kind === "roth") {
      balRef = balances.balRoth;
      setBal = (v) => {
        balances.balRoth = v;
      };
    } else {
      console.error("Unknown withdrawal kind:", kind);
      return { gross: 0, net: 0 };
    }

    // Use Taxable Income-based calculation for pre-tax withdrawals if enabled
    let taxRate = 0;

    if (kind === "pretax") {
      const projectedGrossIncome = totalTaxableIncomeRef.value;

      const projectedTaxableIncome = calculateTaxableIncome(
        projectedGrossIncome,
        inputs.filingStatus,
        TAX_BASE_YEAR + year
      );
      const taxableIncomeBasedRate =
        inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
          ? getEffectiveTaxRateMarried(projectedTaxableIncome)
          : getEffectiveTaxRate(projectedTaxableIncome);

      const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
      taxRate = taxableIncomeRateDecimal;
    }

    // For pretax withdrawals, estimate tax rate and gross up to meet net need
    let grossTake, netReceived;
    if (kind === "pretax") {
      // Estimate tax rate for grossing up the withdrawal
      const projectedGrossIncome =
        totalTaxableIncomeRef.value + desiredNetAmount;
      const projectedTaxableIncome = calculateTaxableIncome(
        projectedGrossIncome,
        inputs.filingStatus,
        TAX_BASE_YEAR + year
      );
      const taxableIncomeBasedRate =
        inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
          ? getEffectiveTaxRateMarried(projectedTaxableIncome)
          : getEffectiveTaxRate(projectedTaxableIncome);
      const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
      taxRate = taxableIncomeRateDecimal;

      // Gross up the withdrawal to account for taxes
      const grossNeeded = desiredNetAmount / (1 - taxRate);
      grossTake = Math.min(grossNeeded, balRef);
      netReceived = grossTake * (1 - taxRate); // Estimated net after taxes
      setBal(balRef - grossTake);
    } else {
      // For Savings/Roth accounts, there is no tax impact to consider; simply withdraw the desired amount
      grossTake = Math.min(desiredNetAmount, balRef);
      netReceived = grossTake;
      setBal(balRef - grossTake);
    }

    // Track withdrawals by source
    if (kind === "pretax") {
      withdrawalsBySource.retirementAccount += grossTake;
    } else if (kind === "savings") {
      withdrawalsBySource.savingsAccount += grossTake;
    } else if (kind === "roth") {
      withdrawalsBySource.roth += grossTake;
    }

    // Add pre-tax withdrawals to Taxable Income for subsequent calculations
    if (kind === "pretax") {
      totalTaxableIncomeRef.value += grossTake;
    }

    return { gross: grossTake, net: netReceived };
  }

  // Special function for RMD withdrawals (gross amount based)
  function withdrawRMD(grossAmount) {
    if (grossAmount <= 0 || balances.balPre <= 0) return { gross: 0, net: 0 };

    const actualGross = Math.min(grossAmount, balances.balPre);

    let taxRate = 0;

    {
      const projectedGrossIncome = totalTaxableIncomeRef.value + actualGross;
      const projectedTaxableIncome = calculateTaxableIncome(
        projectedGrossIncome,
        inputs.filingStatus,
        TAX_BASE_YEAR + year
      );
      const taxableIncomeBasedRate =
        inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
          ? getEffectiveTaxRateMarried(projectedTaxableIncome)
          : getEffectiveTaxRate(projectedTaxableIncome);
      const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
      taxRate = taxableIncomeRateDecimal;
    }

    // For RMD, estimate taxes to provide realistic net amount
    const projectedGrossIncome = totalTaxableIncomeRef.value + actualGross;
    const projectedTaxableIncome = calculateTaxableIncome(
      projectedGrossIncome,
      inputs.filingStatus,
      TAX_BASE_YEAR + year
    );
    const taxableIncomeBasedRate =
      inputs.filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
        ? getEffectiveTaxRateMarried(projectedTaxableIncome)
        : getEffectiveTaxRate(projectedTaxableIncome);
    const taxableIncomeRateDecimal = taxableIncomeBasedRate / 100;
    const rmdTaxRate = taxableIncomeRateDecimal;

    const netReceived = actualGross * (1 - rmdTaxRate); // Estimated net after taxes
    balances.balPre -= actualGross;
    totalTaxableIncomeRef.value += actualGross;

    // Track RMD withdrawals as retirement account
    withdrawalsBySource.retirementAccount += actualGross;

    return { gross: actualGross, net: netReceived };
  }

  return {
    withdrawFrom,
    withdrawRMD,
    getTaxesThisYear: () => taxesThisYear,
    getWithdrawalsBySource: () => withdrawalsBySource,
  };
}

/**
 * Calculate a given retirement year with proper SS taxation based on total income
 */
function calculateRetirementYearData(
  inputs,
  year,
  balances,
  benefitAmounts,
  spend
) {
  const age = inputs.currentAge + year;
  const yearNum = new Date().getFullYear() + year;

  console.log(`\n--- Retirement Year ${year + 1} (Age ${age}) ---`);

  // Income sources (gross amounts)
  const hasSS = age >= inputs.ssStart;
  const hasPen = age >= inputs.penStart && inputs.penMonthly > 0;
  const ssGross = hasSS ? benefitAmounts.ssAnnual : 0;
  const penGross = hasPen ? benefitAmounts.penAnnual : 0;

  // Spouse income sources
  let spouseSsGross = 0;
  let spousePenGross = 0;

  // if (age == 72) {
  //   debugger;
  // }

  spouseSsGross = 0;
  spousePenGross = 0;
  if (inputs.hasSpouse) {
    const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
    const hasSpouseSS = spouseCurrentAge >= inputs.spouseSsStart;
    const hasSpousePen = spouseCurrentAge >= inputs.spousePenStart;

    spouseSsGross = hasSpouseSS ? benefitAmounts.spouseSsAnnual : 0;
    spousePenGross = hasSpousePen ? benefitAmounts.spousePenAnnual : 0;
  }

  // Get income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age);
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age);
  // Get spending need (with additional spending)
  const additionalSpending = getSpendingOverride(age);

  // Calculate savings breakdown (track starting balance BEFORE any adjustments for current year)
  const savingsStartBalance = balances.balSavings;

  // Add tax-free income adjustment to savings balance (not taxable)
  balances.balSavings += taxFreeIncomeAdjustment;

  if (additionalSpending !== null && additionalSpending > 0) {
    console.log(
      `Age ${age}: Adding extra spending $${additionalSpending.toLocaleString()} to base $${spend.toLocaleString()} = total $${actualSpend.toLocaleString()}`
    );
  }
  if (additionalSpending === null) {
    setSpendingFieldValue(age, spend);
  }

  // Add the additional spend to spend and track as actualSpend
  const actualSpend = spend + (additionalSpending || 0);

  // STEP 1: Calculate estimated withdrawals for
  // more conservative interest calculation
  // Estimate total withdrawals that will happen during the year
  let estimatedSpendShortfall =
    actualSpend - (ssGross + spouseSsGross + penGross + spousePenGross);

  if (estimatedSpendShortfall < 0) {
    estimatedSpendShortfall = 0;
  }

  const estimatedSavingsWithdrawals = Math.min(
    estimatedSpendShortfall,
    balances.balSavings
  );

  // Calculate taxable interest on balance AFTER subtracting estimated withdrawals (more conservative)
  const savingsBalanceAfterWithdrawals = Math.max(
    0,
    balances.balSavings - estimatedSavingsWithdrawals
  );
  const taxableInterestEarned =
    savingsBalanceAfterWithdrawals * inputs.rateOfSavings;

  // STEP 2: Track pensions
  const penResults = buildPensionTracker(penGross);
  const spousePenResults = buildPensionTracker(spousePenGross);

  // Track taxable income reference to include only
  // taxable portions plus taxable interest
  let totalTaxableIncomeRef = {
    value:
      penResults.penGross +
      spousePenResults.penGross +
      taxableInterestEarned +
      taxableIncomeAdjustment,
  };

  // STEP 3: Estimate initial withdrawal need (before SS taxation)
  // Use net amounts (after tax) for spending calculation
  let preliminaryNeedNet = Math.max(
    0,
    actualSpend - (penResults.penNet + spousePenResults.penNet)
  );

  // STEP 4: Make preliminary withdrawals to estimate total income for SS calculation
  let balancesCopy = { ...balances }; // Work with copy for estimation
  let totalTaxableIncomeCopy = { value: totalTaxableIncomeRef.value };

  // createWithdrawalFunction is a utility to generate withdrawal functions
  // for each account type (e.g., savings, 401k, IRA)
  // It returns an object containing withdrawal functions for each account type
  // Each function takes a gross withdrawal amount and returns the net amount after taxes
  const preliminaryWithdrawalFunctions = createWithdrawalFunction(
    inputs,
    balancesCopy,
    totalTaxableIncomeCopy,
    year
  );

  // Apply RMDs first (preliminary)
  let preliminaryRmdAmount = 0;

  if (inputs.useRMD && age >= 73) {
    preliminaryRmdAmount = calculateRMD(age, balancesCopy.balPre);
    if (preliminaryRmdAmount > 0) {
      const rmdWithdrawal =
        preliminaryWithdrawalFunctions.withdrawRMD(preliminaryRmdAmount);
      preliminaryNeedNet = Math.max(0, preliminaryNeedNet - rmdWithdrawal.net);
    }
  }

  // Then regular withdrawals (preliminary)
  if (inputs.order[0] === "50/50") {
    // Special 50/50 strategy: equal net amounts from savings and 401k
    if (preliminaryNeedNet > 0) {
      const fiftyFiftyResults = withdraw50_50(
        preliminaryWithdrawalFunctions,
        preliminaryNeedNet
      );
      preliminaryNeedNet = Math.max(
        0,
        preliminaryNeedNet - fiftyFiftyResults.totalNet
      );
    }
  } else {
    // Standard withdrawal order strategy
    for (const k of inputs.order) {
      if (preliminaryNeedNet <= 0) break;
      const { gross = 0, net = 0 } =
        preliminaryWithdrawalFunctions.withdrawFrom(k, preliminaryNeedNet) ||
        {};
      preliminaryNeedNet = Math.max(0, preliminaryNeedNet - net);
    }
  }

  // STEP 5: Now calculate SS taxation based on total taxable income (excluding non-taxable savings withdrawals)
  // The totalTaxableIncomeCopy.value now contains only truly taxable income: pensions + pre-tax withdrawals + taxable interest
  const totalTaxableIncomeForSS = totalTaxableIncomeCopy.value;
  const ssResults = calculateSocialSecurityTaxation(
    inputs,
    ssGross,
    totalTaxableIncomeForSS,
    year
  );
  const spouseSsResults = calculateSocialSecurityTaxation(
    inputs,
    spouseSsGross,
    totalTaxableIncomeForSS + ssResults.ssTaxableAmount,
    year
  );

  // STEP 6: Recalculate final withdrawals with correct SS net amounts
  // Only include taxable portions in taxable income reference
  totalTaxableIncomeRef.value =
    penResults.penGross +
    spousePenResults.penGross +
    ssResults.ssTaxableAmount +
    spouseSsResults.ssTaxableAmount +
    taxableInterestEarned +
    taxableIncomeAdjustment;

  // Use full net amounts (including non-taxable portions) for spending calculation
  // Calculate base spending need and additional spending need separately
  const baseSpendNeed = Math.max(
    0,
    spend -
      (ssResults.ssNet +
        penResults.penNet +
        spouseSsResults.ssNet +
        spousePenResults.penNet)
  );
  const additionalSpendNeed = additionalSpending || 0;
  const totalNeedNet = baseSpendNeed + additionalSpendNeed;

  if (additionalSpendNeed > 0) {
    console.log(
      `Age ${age}: Base spending need: $${baseSpendNeed.toLocaleString()}, Additional spending need: $${additionalSpendNeed.toLocaleString()}, Total: $${totalNeedNet.toLocaleString()}`
    );
  }

  const finalWithdrawalFunctions = createWithdrawalFunction(
    inputs,
    balances,
    totalTaxableIncomeRef,
    year
  );

  // Final withdrawal amounts
  let finalWGross = 0,
    finalWNet = 0;
  // Start with no taxes - will calculate on total taxable income at the end
  let taxesThisYear = 0;

  // Apply RMDs (final)
  if (inputs.useRMD && age >= 73 && preliminaryRmdAmount > 0) {
    //debugger;
    const rmdWithdrawal =
      finalWithdrawalFunctions.withdrawRMD(preliminaryRmdAmount);
    let remainingNeedNet = Math.max(0, totalNeedNet - rmdWithdrawal.net);
    finalWGross += rmdWithdrawal.gross;
    finalWNet += rmdWithdrawal.net;
    // console.log(`RMD at age ${age}: Required $${preliminaryRmdAmount.toLocaleString()}, Withdrew $${rmdWithdrawal.gross.toLocaleString()} gross, $${rmdWithdrawal.net.toLocaleString()} net`);

    // Handle remaining withdrawals after RMD
    if (remainingNeedNet > 0) {
      // Handle additional spending first with tax-optimized approach
      let remainingAdditionalNeed = Math.min(
        remainingNeedNet,
        additionalSpendNeed
      );
      if (remainingAdditionalNeed > 0) {
        // For additional spending, prioritize Savings first, then 401k
        const savingsWithdrawal = finalWithdrawalFunctions.withdrawFrom(
          "savings",
          remainingAdditionalNeed
        );
        // Don't add savings to finalWGross - savings withdrawals are not taxable income
        finalWNet += savingsWithdrawal.net;
        remainingNeedNet -= savingsWithdrawal.net;

        const stillNeedForAdditional = Math.max(
          0,
          remainingAdditionalNeed - savingsWithdrawal.net
        );
        if (stillNeedForAdditional > 0) {
          // Not enough in savings, use 401k for the remainder
          const pretaxWithdrawal = finalWithdrawalFunctions.withdrawFrom(
            "pretax",
            stillNeedForAdditional
          );
          finalWGross += pretaxWithdrawal.gross;
          finalWNet += pretaxWithdrawal.net;
          remainingNeedNet -= pretaxWithdrawal.net;
        }
      }

      // Handle remaining base spending with normal withdrawal order
      if (remainingNeedNet > 0) {
        if (inputs.order[0] === "50/50") {
          const result = withdraw50_50(
            finalWithdrawalFunctions,
            remainingNeedNet
          );
          finalWGross += result.totalGross;
          finalWNet += result.totalNet;
        } else {
          for (const k of inputs.order) {
            if (remainingNeedNet <= 0) break;
            const { gross = 0, net = 0 } =
              finalWithdrawalFunctions.withdrawFrom(k, remainingNeedNet) || {};
            remainingNeedNet = Math.max(0, remainingNeedNet - net);
            finalWGross += gross;
            finalWNet += net;
          }
        }
      }
    }
  } else {
    // No RMD - handle all withdrawals
    let remainingNeedNet = totalNeedNet;

    // Handle additional spending first with tax-optimized approach
    if (additionalSpendNeed > 0) {
      // For additional spending, prioritize Savings first, then 401k
      const savingsWithdrawal = finalWithdrawalFunctions.withdrawFrom(
        "savings",
        additionalSpendNeed
      );
      // Don't add savings to finalWGross - savings withdrawals are not taxable income
      finalWNet += savingsWithdrawal.net;
      remainingNeedNet -= savingsWithdrawal.net;

      const remainingAdditional = Math.max(
        0,
        additionalSpendNeed - savingsWithdrawal.net
      );
      if (remainingAdditional > 0) {
        // Not enough in savings, use 401k for the remainder
        const pretaxWithdrawal = finalWithdrawalFunctions.withdrawFrom(
          "pretax",
          remainingAdditional
        );
        finalWGross += pretaxWithdrawal.gross;
        finalWNet += pretaxWithdrawal.net;
        remainingNeedNet -= pretaxWithdrawal.net;
      }
    }

    // Handle remaining base spending with normal withdrawal order
    if (remainingNeedNet > 0) {
      if (inputs.order[0] === "50/50") {
        const result = withdraw50_50(
          finalWithdrawalFunctions,
          remainingNeedNet
        );
        finalWGross += result.totalGross;
        finalWNet += result.totalNet;
      } else {
        for (const k of inputs.order) {
          if (remainingNeedNet <= 0) break;
          const { gross = 0, net = 0 } =
            finalWithdrawalFunctions.withdrawFrom(k, remainingNeedNet) || {};
          remainingNeedNet = Math.max(0, remainingNeedNet - net);
          finalWGross += gross;
          finalWNet += net;
        }
      }
    }
  }

  // Get withdrawal breakdown by source first
  const withdrawalsBySource = finalWithdrawalFunctions.getWithdrawalsBySource();

  // Recalculate SS taxation using FINAL taxable income (including withdrawals)
  const finalTaxableIncomeForSS =
    penResults.penGross +
    spousePenResults.penGross +
    withdrawalsBySource.retirementAccount +
    taxableInterestEarned +
    taxableIncomeAdjustment;

  const finalSsResults = calculateSocialSecurityTaxation(
    inputs,
    ssGross,
    finalTaxableIncomeForSS,
    year
  );
  const finalSpouseSsResults = calculateSocialSecurityTaxation(
    inputs,
    spouseSsGross,
    finalTaxableIncomeForSS + finalSsResults.ssTaxableAmount,
    year
  );

  // Calculate total taxes on all taxable income (proper approach)
  // Total taxable income includes: SS taxable + pension taxable + pretax withdrawals + taxable interest
  const totalGrossTaxableIncome =
    penResults.penGross +
    spousePenResults.penGross +
    finalSsResults.ssTaxableAmount +
    finalSpouseSsResults.ssTaxableAmount +
    withdrawalsBySource.retirementAccount +
    taxableInterestEarned +
    taxableIncomeAdjustment;

  // Calculate total income tax on the combined taxable income
  taxesThisYear = calculateFederalTax(
    totalGrossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year
  );

  // Also calculate the taxable income after deduction for display purposes
  const totalTaxableIncomeAfterDeduction = calculateTaxableIncome(
    totalGrossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year
  );

  // Calculate net income and handle overage BEFORE growing balances
  const grossIncomeFromBenefitsAndWithdrawals =
    ssGross + spouseSsGross + penGross + spousePenGross + finalWGross;
  const netIncomeFromTaxableSources =
    grossIncomeFromBenefitsAndWithdrawals - taxesThisYear;
  const spendingTarget = actualSpend;
  const shortfall = Math.max(0, spendingTarget - netIncomeFromTaxableSources);

  // Handle shortfall with additional savings withdrawal
  let additionalSavingsWithdrawal = Math.min(shortfall, balances.balSavings);

  if (additionalSavingsWithdrawal > 0) {
    balances.balSavings -= additionalSavingsWithdrawal;
    withdrawalsBySource.savingsAccount += additionalSavingsWithdrawal;
  }

  let actualSavingsWithdrawal = withdrawalsBySource.savingsAccount; // Track the actual amount withdrawn from savings

  // Calculate total net income
  const totalNetIncome =
    netIncomeFromTaxableSources + additionalSavingsWithdrawal;

  // Update final withdrawal amounts to include any additional savings withdrawal
  const totalWithdrawals = finalWGross + additionalSavingsWithdrawal;

  // If there's an overage (excess income beyond spending target), add it to savings BEFORE growth
  const overage = Math.max(0, totalNetIncome - spendingTarget);
  if (overage > 0) {
    balances.balSavings += overage;
  }

  // Add any tax-free income adjustments
  balances.balSavings += taxFreeIncomeAdjustment;

  // Calculate balance before growth (after all deposits/withdrawals)
  const savingsBeforeGrowth = balances.balSavings;

  // Apply conservative growth: interest calculated on current balance
  // (withdrawals have already been subtracted from balances.balSavings)
  const savingsGrowth = savingsBeforeGrowth * inputs.rateOfSavings;
  balances.balSavings += savingsGrowth;

  // Apply normal growth to other account types (withdrawals happen at specific times)
  balances.balPre *= 1 + inputs.retPre;
  balances.balRoth *= 1 + inputs.retRoth;

  // Note: taxableInterestEarned was calculated earlier before withdrawals

  const totalBal = balances.balSavings + balances.balPre + balances.balRoth;

  // Debug RMD years to show actual total net income
  // if (inputs.useRMD && age >= 73) {
  //   console.log(`\n=== RMD YEAR DEBUG (Age ${age}) ===`);
  //   console.log(`Spending target: ${fmt(spendingTarget)}`);
  //   console.log(`RMD required: ${fmt(preliminaryRmdAmount)}`);
  //   console.log(
  //     `Gross income (SS/Pension/Withdrawals): ${fmt(
  //       grossIncomeFromBenefitsAndWithdrawals
  //     )}`
  //   );
  //   console.log(`Total taxes: ${fmt(taxesThisYear)}`);
  //   console.log(
  //     `Net from taxable sources: ${fmt(netIncomeFromTaxableSources)}`
  //   );
  //   console.log(`Shortfall: ${fmt(shortfall)}`);
  //   console.log(
  //     `Additional savings withdrawal: ${fmt(additionalSavingsWithdrawal)}`
  //   );
  //   console.log(`Final Total Net Income: ${fmt(totalNetIncome)}`);
  //   if (totalNetIncome > spendingTarget) {
  //     const excess = totalNetIncome - spendingTarget;
  //     console.log(
  //       `✓ Total Net exceeds spending target by ${fmt(excess)} (RMD excess)`
  //     );
  //     console.log(`✓ Adding ${fmt(excess)} to savings account`);
  //   }
  //   console.log(`=== END RMD DEBUG ===\n`);
  // }

  // For display purposes: allocate taxes proportionally (only to taxable income sources)
  const ssNetAdjusted =
    ssGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (ssGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : ssGross;
  const spouseSsNetAdjusted =
    spouseSsGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spouseSsGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spouseSsGross;
  const penNetAdjusted =
    penGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (penGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : penGross;
  const spousePenNetAdjusted =
    spousePenGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spousePenGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spousePenGross;
  const withdrawalNetAdjusted =
    finalWGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (finalWGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : finalWGross;

  // Update final withdrawal gross to include savings
  const finalWGrossTotal = finalWGross + additionalSavingsWithdrawal;
  const finalWNetTotal = withdrawalNetAdjusted + additionalSavingsWithdrawal;

  // if (age == 72) {
  //   debugger;
  // }
  // Calculate individual withdrawal net amounts for breakdown
  const withdrawalBreakdown = {
    pretax401kGross: withdrawalsBySource.retirementAccount,
    pretax401kNet:
      finalWGross > 0
        ? (withdrawalsBySource.retirementAccount / finalWGross) *
          withdrawalNetAdjusted
        : 0,
    // savingsGross: withdrawalsBySource.savingsAccount,
    savingsNet: withdrawalsBySource.savingsAccount, // Savings withdrawals are not taxed
    rothGross: withdrawalsBySource.roth,
    rothNet:
      finalWGross > 0
        ? (withdrawalsBySource.roth / finalWGross) * withdrawalNetAdjusted
        : withdrawalsBySource.roth,
    totalGross: finalWGrossTotal,
    totalNet: finalWNetTotal,
  };

  // For tax allocation display purposes
  const ssTaxAllocated =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? ((ssGross + spouseSsGross) / grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;
  const penTaxAllocated =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? ((penGross + spousePenGross) / grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;
  const withdrawalTaxes =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? (finalWGross / grossIncomeFromBenefitsAndWithdrawals) * taxesThisYear
      : 0;

  // For display purposes: ssTaxes shows allocated SS taxes, otherTaxes shows non-SS taxes
  const ssTaxes = ssTaxAllocated;
  const otherTaxes = taxesThisYear - ssTaxAllocated;

  // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals
  const totalNonTaxableIncome =
    finalSsResults.ssNonTaxable +
    finalSpouseSsResults.ssNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    withdrawalsBySource.savingsAccount +
    withdrawalsBySource.roth +
    taxFreeIncomeAdjustment;

  // Gross taxable income includes pre-tax withdrawals + taxable interest earned + taxable portions of benefits + taxable income adjustments
  const grossTaxableIncome =
    penResults.penGross +
    spousePenResults.penGross +
    ssResults.ssTaxableAmount +
    spouseSsResults.ssTaxableAmount +
    withdrawalsBySource.retirementAccount +
    taxableInterestEarned +
    taxableIncomeAdjustment;

  // Use grossTaxableIncome for Total Gross column (excludes non-taxable withdrawals)
  const totalGrossIncome =
    finalSsResults.ssNonTaxable +
    finalSpouseSsResults.ssNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    grossTaxableIncome;

  // Taxable income after standard deduction (this is what gets taxed)
  const taxableIncomeAfterDeduction = calculateTaxableIncome(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year
  );

  // Effective tax rate should be based on TOTAL taxes vs taxable income
  // This includes both income taxes and SS taxes for a complete picture
  const effectiveTaxRate =
    taxableIncomeAfterDeduction > 0
      ? (taxesThisYear / taxableIncomeAfterDeduction) * 100
      : 0;

  // Calculate provisional income for display
  const provisionalIncome =
    finalSsResults.calculationDetails?.provisionalIncome || 0;

  console.log(
    `Age ${age}: Provisional Income = ${provisionalIncome}, SS Results:`,
    finalSsResults.calculationDetails
  );

  // Calculate standard deduction for this year
  const standardDeduction = getStandardDeduction(
    TAX_BASE_YEAR + year,
    inputs.filingStatus
  );

  return {
    year: yearNum,
    age,
    salary: 0,
    contrib: 0,
    ss: ssNetAdjusted,
    pen: penNetAdjusted,
    spouseSs: spouseSsNetAdjusted,
    spousePen: spousePenNetAdjusted,
    spend: actualSpend,
    wNet: finalWNetTotal,
    w401kNet: withdrawalBreakdown.pretax401kNet,
    wSavingsRothNet:
      withdrawalBreakdown.savingsNet + withdrawalBreakdown.rothNet,
    wGross: finalWGrossTotal,
    w401kGross: withdrawalsBySource.retirementAccount,
    wSavingsGross: withdrawalsBySource.savingsAccount,
    wRothGross: withdrawalsBySource.roth,
    ssGross: ssGross,
    penGross: penGross,
    spouseSsGross: spouseSsGross,
    spousePenGross: spousePenGross,
    taxes: taxesThisYear,
    ssTaxes: ssTaxAllocated,
    otherTaxes: otherTaxes,
    penTaxes: penTaxAllocated,
    withdrawalTaxes: withdrawalTaxes,
    nonTaxableIncome: totalNonTaxableIncome,
    taxableIncome: taxableIncomeAfterDeduction, // Taxable income after standard deduction (this is what appears in the table)
    taxableInterest: taxableInterestEarned,
    totalIncome:
      ssNetAdjusted +
      penNetAdjusted +
      spouseSsNetAdjusted +
      spousePenNetAdjusted +
      withdrawalNetAdjusted +
      taxableInterestEarned +
      taxableIncomeAdjustment +
      taxFreeIncomeAdjustment, // Total income including all adjustments
    totalNetIncome: totalNetIncome, // Use calculated total that meets spending target
    totalGrossIncome: totalGrossIncome, // Use the corrected gross taxable income calculation
    effectiveTaxRate,
    provisionalIncome, // Provisional income for Social Security taxation
    standardDeduction, // Standard deduction for this tax year
    balSavings: balances.balSavings,
    balPre: balances.balPre,
    balRoth: balances.balRoth,
    total: totalBal,
    // Add savings breakdown data for popup
    savingsBreakdown: {
      startingBalance: savingsStartBalance,
      withdrawals: actualSavingsWithdrawal,
      overageDeposit: overage,
      taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
      balanceBeforeGrowth: savingsBeforeGrowth,
      interestEarned: savingsGrowth, // Use the conservative growth calculation
      endingBalance: balances.balSavings,
      growthRate: inputs.rateOfSavings * 100,
    },
    // Add withdrawal breakdown data for popup
    withdrawalBreakdown: withdrawalBreakdown,
    // Add SS breakdown data for popup
    ssBreakdown: {
      ssGross: ssGross,
      ssTaxableAmount: finalSsResults.ssTaxableAmount,
      ssNonTaxable: finalSsResults.ssNonTaxable,
      ssTaxes: ssTaxAllocated, // Show allocated tax amount
      calculationDetails: finalSsResults.calculationDetails,
      otherTaxableIncome: finalTaxableIncomeForSS,
    },
  };
}

/**
 * 50/50 Withdrawal Strategy
 * Takes equal net amounts from savings (taxable) and 401k (pretax) accounts
 * The 401k withdrawal is grossed up to account for taxes so net amounts are equal
 */
function withdraw50_50(withdrawalFunctions, totalNetNeeded) {
  if (totalNetNeeded <= 0) {
    return { totalGross: 0, totalNet: 0 };
  }

  // Target net amount from each source (half each)
  const targetNetPerSource = totalNetNeeded / 2;

  let totalGross = 0;
  let totalNet = 0;

  // Try to withdraw equal net amounts from both sources
  // Start with savings (no tax impact)
  const savingsResult = withdrawalFunctions.withdrawFrom(
    "savings",
    targetNetPerSource
  );
  // Don't add savings to totalGross - savings withdrawals are not taxable income
  totalNet += savingsResult.net;

  // Then try to get equal net amount from pretax (401k)
  // This will automatically gross up to account for taxes
  const pretaxResult = withdrawalFunctions.withdrawFrom(
    "pretax",
    targetNetPerSource
  );
  totalGross += pretaxResult.gross;
  totalNet += pretaxResult.net;

  // If we couldn't get enough from one source, try to make up the difference from the other
  const remaining = totalNetNeeded - totalNet;
  if (remaining > 0) {
    // Try savings first for any remaining amount
    if (remaining > 0) {
      const additionalSavings = withdrawalFunctions.withdrawFrom(
        "savings",
        remaining
      );
      // Don't add savings to totalGross - savings withdrawals are not taxable income
      totalNet += additionalSavings.net;
    }

    // Then try pretax for any still remaining amount
    const stillRemaining = totalNetNeeded - totalNet;
    if (stillRemaining > 0) {
      const additionalPretax = withdrawalFunctions.withdrawFrom(
        "pretax",
        stillRemaining
      );
      totalGross += additionalPretax.gross;
      totalNet += additionalPretax.net;
    }

    // Finally try Roth if both other sources are exhausted
    const finalRemaining = totalNetNeeded - totalNet;
    if (finalRemaining > 0) {
      const rothResult = withdrawalFunctions.withdrawFrom(
        "roth",
        finalRemaining
      );
      totalGross += rothResult.gross;
      totalNet += rothResult.net;
    }
  }

  return { totalGross, totalNet };
}

// Function to calculate initial benefit amounts for retirement
function calculateInitialBenefitAmounts(inputs) {
  let ssAnnual =
    inputs.ssMonthly *
    12 *
    (inputs.retireAge >= inputs.ssStart
      ? compoundedRate(inputs.ssCola, inputs.retireAge - inputs.ssStart)
      : 1);
  let penAnnual =
    inputs.penMonthly *
    12 *
    (inputs.retireAge >= inputs.penStart
      ? compoundedRate(inputs.penCola, inputs.retireAge - inputs.penStart)
      : 1);

  const spouseBenefits = calculateSpouseBenefits(inputs);
  let spouseSsAnnual = spouseBenefits.spouseSsAnnual;
  let spousePenAnnual = spouseBenefits.spousePenAnnual;

  return {
    ssAnnual,
    penAnnual,
    spouseSsAnnual,
    spousePenAnnual,
  };
}

function calc() {
  // Enhanced retirement calculator with realistic working year modeling
  const inputs = parseInputParameters();

  if (!inputs) return;

  // Auto-regenerate spending override fields only if ages have changed
  if (
    inputs.retireAge > 0 &&
    inputs.endAge > inputs.retireAge &&
    (lastRetireAge !== inputs.retireAge || lastEndAge !== inputs.endAge)
  ) {
    regenerateSpendingFields();
    lastRetireAge = inputs.retireAge;
    lastEndAge = inputs.endAge;
  }

  // Auto-regenerate income adjustment fields only if ages have changed
  if (
    inputs.currentAge > 0 &&
    inputs.endAge > inputs.currentAge &&
    (lastCurrentAge !== inputs.currentAge || lastEndAge !== inputs.endAge)
  ) {
    regenerateTaxableIncomeFields();
    regenerateTaxFreeIncomeFields();
    lastCurrentAge = inputs.currentAge;
  }

  // Initialize balances object for tracking
  const balances = {
    balPre: inputs.balPre,
    balRoth: inputs.balRoth,
    balSavings: inputs.balSavings,
  };

  // Reset calculations array
  calculations = [];

  let currentSalary = inputs.startingSalary;
  let totalTaxes = 0;
  let maxDrawdown = { year: null, value: Infinity };

  // Working years
  for (let y = 0; y < inputs.yearsToRetire; y++) {
    const yearData = calculateWorkingYearData(
      inputs,
      y,
      currentSalary,
      balances
    );

    calculations.push({
      year: new Date().getFullYear() + y,
      ...yearData,
    });

    // Track total taxes paid during working years
    totalTaxes += yearData.taxes;

    // Update salary for next year
    currentSalary *= 1 + inputs.salaryGrowth;
  }

  // Setup retirement years; calculate initial benefit amounts
  const initialBenefits = calculateInitialBenefitAmounts(inputs);
  let ssAnnual = initialBenefits.ssAnnual;
  let penAnnual = initialBenefits.penAnnual;
  let spouseSsAnnual = initialBenefits.spouseSsAnnual;
  let spousePenAnnual = initialBenefits.spousePenAnnual;

  let spend = inputs.spendAtRetire;

  // Retirement years
  for (let y = inputs.yearsToRetire; y < inputs.yearsTotal; y++) {
    const benefitAmounts = {
      ssAnnual,
      penAnnual,
      spouseSsAnnual,
      spousePenAnnual,
    };

    const yearData = calculateRetirementYearData(
      inputs,
      y,
      balances,
      benefitAmounts,
      spend
    );
    calculations.push(yearData);

    const totalBal = yearData.total;
    totalTaxes += yearData.taxes;
    if (totalBal < maxDrawdown.value) {
      maxDrawdown = { year: yearData.year, value: totalBal };
    }

    // Step next year: Apply COLAs to benefits
    const age = yearData.age;
    if (age >= inputs.ssStart) ssAnnual *= 1 + inputs.ssCola;
    if (age >= inputs.penStart && inputs.penMonthly > 0)
      penAnnual *= 1 + inputs.penCola;

    if (inputs.hasSpouse) {
      const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
      if (spouseCurrentAge >= inputs.spouseSsStart)
        spouseSsAnnual *= 1 + inputs.spouseSsCola;
      if (
        spouseCurrentAge >= inputs.spousePenStart &&
        inputs.spousePenMonthly > 0
      )
        spousePenAnnual *= 1 + inputs.spousePenCola;
    }

    spend *= 1 + inputs.inflation;
    spend *= 1 - inputs.spendingDecline;
  }

  console.log("Calculations: ", calculations);

  // Generate final output
  generateOutputAndSummary(inputs, rows, totalTaxes, maxDrawdown);
}
