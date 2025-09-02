/**
 * Retirement Calculation Engine - Pure Logic Layer
 *
 * This module contains all mathematical and financial calculations
 * with ZERO DOM dependencies. Functions are pure and testable.
 */

// --- Constants ---
const EMPLOYEE_401K_LIMIT_2025 = 23000;
const EMPLOYEE_401K_CATCHUP_50 = 7500;

const STANDARD_DEDUCTIONS = {
  single: 15000,
  married: 32600,
};

const EFFECTIVE_TAX_RATES = {
  0: 0.0,
  5000: 10.0,
  10000: 10.0,
  15000: 10.0,
  20000: 10.0,
  23200: 10.0,
  30000: 10.5,
  40000: 10.8,
  50000: 11.1,
  60000: 11.2,
  70000: 11.3,
  74900: 11.4,
  80000: 11.4,
  90000: 11.5,
  94300: 11.5,
  100000: 12.1,
  110000: 12.7,
  120000: 13.5,
  130000: 14.1,
  140000: 14.9,
  150000: 15.5,
  160000: 16.0,
  170000: 16.4,
  180000: 16.9,
  190000: 17.3,
  200000: 17.6,
  201050: 17.7,
  220000: 18.1,
  240000: 18.5,
  260000: 18.9,
  280000: 19.2,
  300000: 19.5,
};

// --- Pure Mathematical Functions ---

/**
 * Calculate compound growth: (1 + rate)^periods
 */
export function compoundGrowth(rate, periods) {
  return Math.pow(1 + rate, periods);
}

/**
 * Format number as currency string
 */
export function formatCurrency(amount) {
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/**
 * Convert percentage to decimal
 */
export function percentToDecimal(percentage) {
  return isNaN(percentage) ? 0 : Number(percentage) / 100;
}

// --- Tax Calculation Functions ---

/**
 * Calculate Taxable Income by subtracting standard deduction from gross income
 */
export function calculateTaxableIncome(grossIncome, filingStatus = "single") {
  const standardDeduction =
    STANDARD_DEDUCTIONS[filingStatus] || STANDARD_DEDUCTIONS.single;
  return Math.max(0, grossIncome - standardDeduction);
}

/**
 * Calculate effective tax rate for a given Taxable Income using linear interpolation
 */
export function getEffectiveTaxRate(taxableIncome) {
  if (taxableIncome <= 0) return 0;
  if (taxableIncome >= 300000) return EFFECTIVE_TAX_RATES[300000];

  // Find exact match
  if (EFFECTIVE_TAX_RATES[taxableIncome] !== undefined) {
    return EFFECTIVE_TAX_RATES[taxableIncome];
  }

  // Find interpolation points
  const taxableIncomeLevels = Object.keys(EFFECTIVE_TAX_RATES)
    .map(Number)
    .sort((a, b) => a - b);

  let lowerAgi = 0;
  let upperAgi = 300000;

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
 * Calculate federal tax amount based on gross income and filing status
 */
export function calculateFederalTax(grossIncome, filingStatus = "single") {
  const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus);
  const effectiveRate = getEffectiveTaxRate(taxableIncome);
  return taxableIncome * (effectiveRate / 100);
}

/**
 * Get marginal tax rate estimate for additional income
 */
export function getMarginalTaxRate(
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

// --- Social Security Functions ---

/**
 * Calculate Social Security taxation based on provisional income
 */
export function calculateSSTaxableAmount(
  ssGross,
  otherTaxableIncome,
  isMarried = false
) {
  if (ssGross <= 0) return 0;

  const provisionalIncome = otherTaxableIncome + ssGross * 0.5;

  const threshold1 = isMarried ? 32000 : 25000;
  const threshold2 = isMarried ? 44000 : 34000;

  let taxableAmount = 0;

  if (provisionalIncome <= threshold1) {
    taxableAmount = 0;
  } else if (provisionalIncome <= threshold2) {
    const excessIncome = provisionalIncome - threshold1;
    taxableAmount = Math.min(ssGross * 0.5, excessIncome * 0.5);
  } else {
    const tier1ExcessIncome = threshold2 - threshold1;
    const tier1Max = Math.min(ssGross * 0.5, tier1ExcessIncome * 0.5);

    const tier2ExcessIncome = provisionalIncome - threshold2;
    const tier2Amount = Math.min(ssGross * 0.35, tier2ExcessIncome * 0.85);

    taxableAmount = Math.min(ssGross * 0.85, tier1Max + tier2Amount);
  }

  return taxableAmount;
}

// --- RMD Functions ---

/**
 * Required Minimum Distribution calculation based on IRS Uniform Lifetime Table
 */
export function calculateRMD(age, accountBalance) {
  if (age < 73 || accountBalance <= 0) return 0;

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

  let factor;
  if (age <= 100) {
    factor = lifeFactor[age] || lifeFactor[100];
  } else {
    factor = Math.max(1.0, lifeFactor[100] - (age - 100) * 0.1);
  }

  return accountBalance / factor;
}

// --- Contribution Limit Functions ---

/**
 * Calculate contribution limits for 401k/Roth 401k based on age
 */
export function calculate401kLimits(age) {
  const baseLimit = EMPLOYEE_401K_LIMIT_2025;
  const catchupLimit = age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0;
  return {
    base: baseLimit,
    catchup: catchupLimit,
    total: baseLimit + catchupLimit,
  };
}

/**
 * Apply contribution limits to desired amounts
 */
export function applyContributionLimits(desiredPretax, desiredRoth, age) {
  const limits = calculate401kLimits(age);
  const totalDesired = desiredPretax + desiredRoth;

  if (totalDesired <= limits.total) {
    return { pretax: desiredPretax, roth: desiredRoth, scale: 1 };
  }

  const scale = limits.total / totalDesired;
  return {
    pretax: desiredPretax * scale,
    roth: desiredRoth * scale,
    scale: scale,
  };
}

// --- Working Year Calculations ---

/**
 * Calculate employer match based on employee contribution percentage
 */
export function calculateEmployerMatch(
  salary,
  employeeContrib,
  matchCap,
  matchRate
) {
  if (salary <= 0) return 0;
  const actualContribPct = employeeContrib / salary;
  return Math.min(actualContribPct, matchCap) * salary * matchRate;
}

/**
 * Calculate one year of working/accumulation phase
 */
export function calculateWorkingYear(params) {
  const {
    salary,
    age,
    pretaxPct,
    rothPct,
    taxablePct,
    matchCap,
    matchRate,
    retPre,
    retRoth,
    retTax,
    taxPre,
    useAgiTax,
    filingStatus,
    balances, // { balPre, balRoth, balSavings }
    year, // years from current age
  } = params;

  // Calculate desired contributions
  const desiredPretax = salary * pretaxPct;
  const desiredRoth = salary * rothPct;

  // Apply contribution limits
  const contributions = applyContributionLimits(
    desiredPretax,
    desiredRoth,
    age
  );
  const pretaxContrib = contributions.pretax;
  const rothContrib = contributions.roth;

  // Calculate employer match
  const employerMatch = calculateEmployerMatch(
    salary,
    pretaxContrib,
    matchCap,
    matchRate
  );

  // Calculate taxable interest income
  const taxableInterest = balances.balSavings * retTax;

  // Calculate taxes on working income
  const grossTaxableIncome = salary - pretaxContrib + taxableInterest;
  const workingTaxes = useAgiTax
    ? calculateFederalTax(grossTaxableIncome, filingStatus)
    : grossTaxableIncome * taxPre;

  // Calculate after-tax available for spending and saving
  const afterTaxIncome = salary - pretaxContrib - workingTaxes - rothContrib;
  const desiredTaxableSavings = salary * taxablePct;

  // Update balances (return new balances, don't mutate)
  const newBalances = {
    balPre: (balances.balPre + pretaxContrib + employerMatch) * (1 + retPre),
    balRoth: (balances.balRoth + rothContrib) * (1 + retRoth),
    balSavings:
      (balances.balSavings +
        Math.min(desiredTaxableSavings, Math.max(0, afterTaxIncome))) *
      (1 + retTax),
  };

  return {
    contributions: {
      pretax: pretaxContrib,
      roth: rothContrib,
      employerMatch: employerMatch,
      taxable: Math.min(desiredTaxableSavings, Math.max(0, afterTaxIncome)),
      total:
        pretaxContrib +
        rothContrib +
        employerMatch +
        Math.min(desiredTaxableSavings, Math.max(0, afterTaxIncome)),
    },
    income: {
      salary: salary,
      taxableInterest: taxableInterest,
      grossTaxable: grossTaxableIncome,
      afterTax: afterTaxIncome,
    },
    taxes: {
      federal: workingTaxes,
      effectiveRate:
        grossTaxableIncome > 0 ? (workingTaxes / grossTaxableIncome) * 100 : 0,
    },
    balances: newBalances,
    totalBalance:
      newBalances.balPre + newBalances.balRoth + newBalances.balSavings,
  };
}

// --- Benefit Calculations ---

/**
 * Calculate annual benefit amount with COLA adjustments
 */
export function calculateAnnualBenefit(
  monthlyAmount,
  startAge,
  currentAge,
  cola
) {
  if (currentAge < startAge) return 0;
  const yearsOfCola = currentAge - startAge;
  return monthlyAmount * 12 * compoundGrowth(cola, yearsOfCola);
}

/**
 * Calculate spouse benefits at a given age
 */
export function calculateSpouseBenefits(params, targetAge) {
  const {
    spouseAge,
    currentAge,
    spouseSsMonthly,
    spouseSsStart,
    spouseSsCola,
    spousePenMonthly,
    spousePenStart,
    spousePenCola,
  } = params;

  if (spouseAge <= 0) {
    return { ssAnnual: 0, penAnnual: 0 };
  }

  const spouseTargetAge = spouseAge + (targetAge - currentAge);

  const ssAnnual = calculateAnnualBenefit(
    spouseSsMonthly,
    spouseSsStart,
    spouseTargetAge,
    spouseSsCola
  );
  const penAnnual = calculateAnnualBenefit(
    spousePenMonthly,
    spousePenStart,
    spouseTargetAge,
    spousePenCola
  );

  return { ssAnnual, penAnnual };
}

// --- Validation Functions ---

/**
 * Validate retirement calculation parameters
 */
export function validateRetirementParams(params) {
  const errors = [];

  if (!params.currentAge || params.currentAge < 0) {
    errors.push("Current age must be a positive number");
  }

  if (!params.retireAge || params.retireAge <= params.currentAge) {
    errors.push("Retirement age must be greater than current age");
  }

  if (!params.endAge || params.endAge <= params.retireAge) {
    errors.push("End age must be greater than retirement age");
  }

  if (params.inflation < 0 || params.inflation > 0.2) {
    errors.push("Inflation rate should be between 0% and 20%");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// --- Pure Parameter Processing ---

/**
 * Create derived parameters from base inputs
 */
export function createDerivedParams(baseParams) {
  return {
    ...baseParams,
    hasSpouse: baseParams.spouseAge > 0,
    yearsToRetire: baseParams.retireAge - baseParams.currentAge,
    yearsTotal: baseParams.endAge - baseParams.currentAge,
    spendAtRetire:
      baseParams.spendingToday *
      compoundGrowth(
        baseParams.inflation,
        baseParams.retireAge - baseParams.currentAge
      ),
  };
}

/**
 * Example of a pure function that calculates the entire projection
 * This would be the main entry point for the calculation engine
 */
export function calculateRetirementProjection(inputParams) {
  // Validate inputs
  const validation = validateRetirementParams(inputParams);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }

  // Create derived parameters
  const params = createDerivedParams(inputParams);

  // Initialize state
  let balances = {
    balPre: params.balPre,
    balRoth: params.balRoth,
    balSavings: params.balSavings,
  };

  const yearlyResults = [];
  let currentSalary = params.startingSalary;

  // Working years (simplified example - would need full implementation)
  for (let year = 0; year < params.yearsToRetire; year++) {
    const age = params.currentAge + year;

    const yearResult = calculateWorkingYear({
      salary: currentSalary,
      age: age,
      pretaxPct: params.pretaxPct,
      rothPct: params.rothPct,
      taxablePct: params.taxablePct,
      matchCap: params.matchCap,
      matchRate: params.matchRate,
      retPre: params.retPre,
      retRoth: params.retRoth,
      retTax: params.retTax,
      taxPre: params.taxPre,
      useAgiTax: params.useAgiTax,
      filingStatus: params.filingStatus,
      balances: balances,
      year: year,
    });

    // Update for next year
    balances = yearResult.balances;
    currentSalary *= 1 + params.salaryGrowth;

    yearlyResults.push({
      year: new Date().getFullYear() + year,
      age: age,
      phase: "working",
      ...yearResult,
    });
  }

  // TODO: Add retirement years calculation
  // This would include withdrawal strategies, RMDs, etc.

  return {
    success: true,
    yearlyResults: yearlyResults,
    finalBalance: balances.balPre + balances.balRoth + balances.balSavings,
    summary: {
      workingYears: params.yearsToRetire,
      retirementYears: params.endAge - params.retireAge,
      totalContributions: yearlyResults.reduce(
        (sum, year) => sum + year.contributions.total,
        0
      ),
      finalBalance: balances.balPre + balances.balRoth + balances.balSavings,
    },
  };
}
