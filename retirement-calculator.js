// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

// Add default implementations for UI override functions when not available
if (typeof getTaxableIncomeOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : {})
    );
  })();

  globalThis.getTaxableIncomeOverride = function getTaxableIncomeOverride(age) {
    return 0; // Default to no override
  };
}

if (typeof getTaxFreeIncomeOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : {})
    );
  })();

  globalThis.getTaxFreeIncomeOverride = function getTaxFreeIncomeOverride(age) {
    return 0; // Default to no override
  };
}

if (typeof getSpendingOverride === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : {})
    );
  })();

  globalThis.getSpendingOverride = function getSpendingOverride(age) {
    return null; // Default to no override
  };
}

if (typeof setSpendingFieldValue === "undefined") {
  const globalThis = (function () {
    return (
      this ||
      (typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
        ? global
        : {})
    );
  })();

  globalThis.setSpendingFieldValue = function setSpendingFieldValue(
    age,
    value
  ) {
    // No-op in non-UI context
  };
}

if (typeof require === "function") {
  // Running in Node.js
  const {
    FILING_STATUS,
    determineTaxablePortionOfSocialSecurity,
    determineTaxUsingBrackets,
    calculateNetWhen401kIncomeIs,
    determine401kWithdrawalToHitNetTargetOf,
    getTaxBrackets,
    getStandardDeduction,
  } = require("./retirement");
}

// Constants
const INFLATION_RATE = 0.025; // 2.5% annual inflation
const INVESTMENT_RETURN_RATE = 0.07; // 7% annual return
const COLA_SOCIAL_SECURITY = 0.02; // 2% COLA for Social Security
const TAX_BASE_YEAR = 2025; // Base year for tax calculations

// --- Added by patch: 2025 elective deferral limits (401k/Roth 401k) ---
const EMPLOYEE_401K_LIMIT_2025 = 23000; // elective deferral
const EMPLOYEE_401K_CATCHUP_50 = 7500; // catch-up age 50+

// Track previous ages to only regenerate spending fields when they change
let lastRetireAge = null;
let lastEndAge = null;
let lastCurrentAge = null;

const compoundedRate = (r, n) => Math.pow(1 + r, n);

/**
 * Tax calculations now use the sophisticated functions from retirement.js
 * This provides better accuracy for:
 * - Social Security taxation using provisional income rules
 * - Proper tax bracket calculations with standard deductions
 * - Binary search for optimal 401k withdrawals
 * - COLA adjustments and inflation-indexed deductions
 */

// Wrapper function for backward compatibility with existing calls
function calculateTaxableIncome(
  grossIncome,
  filingStatus = FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const standardDeduction = getStandardDeduction(
    filingStatus,
    year,
    inflationRate
  );
  return Math.max(0, grossIncome - standardDeduction);
}

// Wrapper for federal tax calculation using retirement.js functions
function calculateFederalTax(
  grossIncome,
  filingStatus = FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const taxBrackets = getTaxBrackets(filingStatus, year, inflationRate);
  const standardDeduction = getStandardDeduction(
    filingStatus,
    year,
    inflationRate
  );
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  return determineTaxUsingBrackets(taxableIncome, taxBrackets);
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
  // Declare and initialize the result object at the top
  const result = {
    age: 0,
    salary: 0,
    contrib: 0,
    ss: 0,
    pen: 0,
    spouseSs: 0,
    spousePen: 0,
    spend: 0,
    wNet: 0,
    w401kNet: 0,
    wSavingsRothNet: 0,
    wGross: 0,
    w401kGross: 0,
    wSavingsGross: 0,
    wRothGross: 0,
    taxes: 0,
    ssTaxes: 0,
    otherTaxes: 0,
    nonTaxableIncome: 0,
    taxableIncome: 0,
    taxableInterest: 0,
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
    effectiveTaxRate: 0,
    provisionalIncome: 0,
    standardDeduction: 0,
    balSavings: 0,
    balPre: 0,
    balRoth: 0,
    total: 0,
    savingsBreakdown: {},
    ssBreakdown: {},
  };

  const age = inputs.currentAge + year;

  // Set basic values in result object
  result.age = age;
  result.salary = salary;

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
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age) || 0;

  let grossTaxableIncome =
    salary - cPre + taxableInterestIncome + taxableIncomeAdjustment;

  const workingYearTaxes = calculateFederalTax(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflationRate
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
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age) || 0;

  // Track savings breakdown for working years
  const savingsStartBalance = balances.balSavings;
  const taxableInterestEarned = balances.balSavings * inputs.rateOfSavings;

  balances.balPre = (balances.balPre + cPre + match) * (1 + inputs.retPre);
  balances.balRoth = (balances.balRoth + cRoth) * (1 + inputs.retRoth);
  balances.balSavings =
    (balances.balSavings + cTax + taxFreeIncomeAdjustment) *
    (1 + inputs.rateOfSavings);

  // Update all the final values in the result object
  result.contrib = cPre + cRoth + cTax + match;
  result.ss = 0;
  result.pen = 0;
  result.spouseSs = 0;
  result.spousePen = 0;
  result.spend = currentYearSpending;
  result.wNet = 0;
  result.w401kNet = 0;
  result.wSavingsRothNet = 0;
  result.wGross = 0;
  result.w401kGross = 0;
  result.wSavingsGross = 0;
  result.wRothGross = 0;
  result.taxes = workingYearTaxes;
  result.ssTaxes = 0;
  result.otherTaxes = workingYearTaxes;
  result.nonTaxableIncome = taxFreeIncomeAdjustment;
  result.taxableIncome = calculateTaxableIncome(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflationRate
  );
  result.taxableInterest = taxableInterestIncome;
  result.totalIncome = totalGrossIncome + taxableInterestIncome;
  result.totalNetIncome = afterTaxIncome + taxFreeIncomeAdjustment;
  result.totalGrossIncome = totalGrossIncome + taxableInterestIncome;
  result.effectiveTaxRate =
    calculateTaxableIncome(
      grossTaxableIncome,
      inputs.filingStatus,
      TAX_BASE_YEAR + year,
      inputs.inflationRate
    ) > 0
      ? (workingYearTaxes /
          calculateTaxableIncome(
            grossTaxableIncome,
            inputs.filingStatus,
            TAX_BASE_YEAR + year,
            inputs.inflationRate
          )) *
        100
      : 0;
  result.provisionalIncome = 0;
  result.standardDeduction = getStandardDeduction(
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflationRate
  );
  result.balSavings = balances.balSavings;
  result.balPre = balances.balPre;
  result.balRoth = balances.balRoth;
  result.total = balances.balSavings + balances.balPre + balances.balRoth;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: savingsStartBalance,
    withdrawals: 0,
    overageDeposit: 0,
    taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
    regularDeposit: cTax,
    interestEarned: taxableInterestEarned,
    endingBalance: balances.balSavings,
    growthRate: inputs.rateOfSavings * 100,
  };

  result.ssBreakdown = {
    ssGross: 0,
    ssTaxableAmount: 0,
    ssNonTaxable: 0,
    ssTaxes: 0,
  };

  return result;
}

/**
 * Calculate spouse benefit amounts at the time of primary person's retirement
 */
function calculateSpouseBenefits(inputs) {
  // Declare and initialize the result object at the top
  const result = {
    spouseSsAnnual: 0,
    spousePenAnnual: 0,
  };

  if (inputs.hasSpouse) {
    result.spouseSsAnnual = inputs.spouseSsMonthly * 12;
    result.spousePenAnnual = inputs.spousePenMonthly * 12;
  }

  return result;
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
  // Use the sophisticated Social Security taxation calculation from retirement.js
  return determineTaxablePortionOfSocialSecurity(ssGross, otherTaxableIncome);
}

/**
 * Calculate pension info for a given year
 * Simplified since final taxes are calculated properly on total combined income
 */
function buildPensionTracker(penGross) {
  // Declare and initialize the result object at the top
  const result = {
    penGross: 0,
    penTaxes: 0,
    penNet: 0,
    penNonTaxable: 0,
    pensionTaxRate: 0,
  };

  if (!penGross || penGross <= 0) {
    return result;
  }

  // Set basic values in result object
  result.penGross = penGross;

  // Pensions are typically fully taxable
  const penNonTaxable = 0; // 0% non-taxable

  // Don't estimate taxes here - final taxes calculated on total combined income
  const penTaxes = 0;
  const penNet = penGross; // Placeholder - actual net calculated in final tax step

  // Update result object
  result.penTaxes = penTaxes;
  result.penNet = penNet;
  result.penNonTaxable = penNonTaxable;
  result.pensionTaxRate = 0;

  return result;
}

/**
 * Create withdrawal function for a specific retirement year
 */
function createWithdrawalFunctions(
  inputs,
  closuredCopyOfBalances,
  closuredCopyOfTotalTaxableIncome,
  year = 0,
  ssBenefits = 0
) {
  // Declare and initialize the result object at the top
  const result = {
    withdrawFrom: null,
    withdrawRMD: null,
    getTaxesThisYear: null,
    getWithdrawalsBySource: null,
  };

  let taxesThisYear = 0;
  let withdrawalsBySource = {
    retirementAccount: 0,
    savingsAccount: 0,
    roth: 0,
  };
  let lastTaxCalculation = null; // Store the most recent detailed tax calculation

  function withdrawFrom(kind, desiredNetAmount) {
    // console.log(`withdrawFrom called with kind: "${kind}", netAmount: ${netAmount}`);
    if (desiredNetAmount <= 0) return { gross: 0, net: 0 };

    // Validate kind parameter
    if (!kind || typeof kind !== "string") {
      console.error("Invalid withdrawal kind:", kind);
      return { gross: 0, net: 0 };
    }

    // Determine balance reference and setter function
    let targetedAccountBalance = 0,
      updateTargetedAccountBalance;

    if (kind === "savings") {
      targetedAccountBalance = closuredCopyOfBalances.balSavings;
      updateTargetedAccountBalance = (v) => {
        closuredCopyOfBalances.balSavings = v;
      };
    } else if (kind === "pretax") {
      targetedAccountBalance = closuredCopyOfBalances.balPre;
      updateTargetedAccountBalance = (v) => {
        closuredCopyOfBalances.balPre = v;
      };
    } else if (kind === "roth") {
      targetedAccountBalance = closuredCopyOfBalances.balRoth;
      updateTargetedAccountBalance = (v) => {
        closuredCopyOfBalances.balRoth = v;
      };
    } else {
      console.error("Unknown withdrawal kind:", kind);
      return { gross: 0, net: 0 };
    }

    // For pretax withdrawals, use sophisticated tax calculations from retirement.js
    let grossTake, netReceived;

    if (kind === "pretax") {
      // Use binary search optimization from retirement.js for accurate withdrawal calculation
      // Construct the opts object that these functions expect
      // Add comprehensive NaN protection for otherTaxableIncome
      const otherTaxableIncomeValue = isNaN(
        closuredCopyOfTotalTaxableIncome.value
      )
        ? 0
        : closuredCopyOfTotalTaxableIncome.value;

      if (isNaN(closuredCopyOfTotalTaxableIncome.value)) {
        console.warn(
          `[NaN Protection] otherTaxableIncome was NaN, using 0 instead`
        );
      }

      const opts = {
        otherTaxableIncome: otherTaxableIncomeValue,
        ssBenefit: ssBenefits, // Include Social Security benefits in tax calculation
        standardDeduction: getStandardDeduction(
          inputs.filingStatus,
          year, // year is already the actual year (e.g., 2040)
          inputs.inflationRate
        ),
        brackets: getTaxBrackets(
          inputs.filingStatus,
          year,
          inputs.inflationRate
        ),
        precision: 0.01, // Precision for binary search convergence
      };

      const withdrawalResult = determine401kWithdrawalToHitNetTargetOf(
        desiredNetAmount,
        opts
      );

      grossTake = Math.min(
        withdrawalResult.withdrawalNeeded,
        targetedAccountBalance
      );

      // Calculate actual net using the sophisticated tax calculation
      const netResult = calculateNetWhen401kIncomeIs(grossTake, opts);
      lastTaxCalculation = netResult; // Store detailed tax calculation results

      netReceived = netResult.netIncome;
      updateTargetedAccountBalance(targetedAccountBalance - grossTake);
    } else {
      // For Savings/Roth accounts, there is no tax impact; simply withdraw the desired amount
      grossTake = Math.min(desiredNetAmount, targetedAccountBalance);
      netReceived = grossTake;
      updateTargetedAccountBalance(targetedAccountBalance - grossTake);
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
      const safeGrossTake = isNaN(grossTake) ? 0 : grossTake;
      closuredCopyOfTotalTaxableIncome.value += safeGrossTake;
    }

    return { gross: grossTake, net: netReceived };
  }

  // Special function for RMD withdrawals (gross amount based)
  function withdrawRMD(grossAmount) {
    if (grossAmount <= 0 || closuredCopyOfBalances.balPre <= 0)
      return { gross: 0, net: 0 };

    const actualGross = Math.min(grossAmount, closuredCopyOfBalances.balPre);

    // Calculate net amount using the sophisticated tax calculation from retirement.js
    // Construct the opts object that calculateNetWhen401kIncomeIs expects
    // Add comprehensive NaN protection for otherTaxableIncome
    const otherTaxableIncomeValue = isNaN(
      closuredCopyOfTotalTaxableIncome.value
    )
      ? 0
      : closuredCopyOfTotalTaxableIncome.value;

    if (isNaN(closuredCopyOfTotalTaxableIncome.value)) {
      console.warn(
        `[NaN Protection] RMD otherTaxableIncome was NaN, using 0 instead`
      );
    }

    const opts = {
      otherTaxableIncome: otherTaxableIncomeValue,
      ssBenefit: ssBenefits, // Include Social Security benefits in RMD tax calculation too
      standardDeduction: getStandardDeduction(
        inputs.filingStatus,
        year, // year is already the actual year (e.g., 2040)
        inputs.inflationRate
      ),
      brackets: getTaxBrackets(inputs.filingStatus, year, inputs.inflationRate),
      precision: 0.01, // Precision for binary search convergence
    };

    const netResult = calculateNetWhen401kIncomeIs(actualGross, opts);
    lastTaxCalculation = netResult; // Store detailed tax calculation results for RMD too
    const netAmount = netResult.netIncome;

    closuredCopyOfBalances.balPre -= actualGross;
    const safeActualGross = isNaN(actualGross) ? 0 : actualGross;
    closuredCopyOfTotalTaxableIncome.value += safeActualGross;

    // Track RMD withdrawals as retirement account
    withdrawalsBySource.retirementAccount += actualGross;

    return { gross: actualGross, net: netAmount };
  }

  // Populate the result object
  result.withdrawFrom = withdrawFrom;
  result.withdrawRMD = withdrawRMD;
  result.getTaxesThisYear = () => taxesThisYear;
  result.getWithdrawalsBySource = () => withdrawalsBySource;
  result.getLastTaxCalculation = () => lastTaxCalculation;

  return result;
}

function extractSpouseInputs(inputs, age, benefitAmounts) {
  const spouse = {
    ssGross: 0,
    penGross: 0,
  };

  if (inputs.hasSpouse) {
    const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
    const hasSpouseSS = spouseCurrentAge >= inputs.spouseSsStartAge;
    const hasSpousePen = spouseCurrentAge >= inputs.spousePenStartAge;

    spouse.ssGross = hasSpouseSS ? benefitAmounts.spouseSsAnnual : 0;
    spouse.penGross = hasSpousePen ? benefitAmounts.spousePenAnnual : 0;
  }

  return spouse;
}

/**
 * Calculate a given retirement year with proper SS taxation based on total income
 */
function calculateRetirementYearData(
  inputs,
  yearIndex,
  balances,
  benefitAmounts,
  spend
) {
  // Declare and initialize the result object at the top
  const result = {
    year: 0,
    age: 0,
    salary: 0,
    contrib: 0,
    ss: 0,
    pen: 0,
    spouseSs: 0,
    spousePen: 0,
    spend: 0,
    wNet: 0,
    w401kNet: 0,
    wSavingsRothNet: 0,
    wGross: 0,
    w401kGross: 0,
    wSavingsGross: 0,
    wRothGross: 0,
    ssGross: 0,
    penGross: 0,
    spouseSsGross: 0,
    spousePenGross: 0,
    taxes: 0,
    ssTaxes: 0,
    otherTaxes: 0,
    penTaxes: 0,
    withdrawalTaxes: 0,
    nonTaxableIncome: 0,
    taxableIncome: 0,
    taxableInterest: 0,
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
    effectiveTaxRate: 0,
    provisionalIncome: 0,
    standardDeduction: 0,
    balSavings: 0,
    balPre: 0,
    balRoth: 0,
    total: 0,
    savingsBreakdown: {},
    withdrawalBreakdown: {},
    ssBreakdown: {},
  };

  // debugger;
  const age = inputs.retireAge + yearIndex;
  const retirementYear =
    new Date().getFullYear() + inputs.totalWorkingYears + yearIndex;

  // Set basic values in result object
  result.year = retirementYear;
  result.age = age;
  result.salary = 0;
  result.contrib = 0;

  console.log(
    `\n--- Retirement Year ${
      yearIndex + 1
    } (Age ${age}) (Year ${retirementYear}) ---`
  );

  // Income sources (gross amounts)
  const hasSS = age >= inputs.ssStartAge;
  const hasPen = age >= inputs.penStartAge && inputs.penMonthly > 0;

  const ssGross = hasSS ? benefitAmounts.ssAnnual : 0;
  const penGross = hasPen ? benefitAmounts.penAnnual : 0;

  const spouse = extractSpouseInputs(inputs, age, benefitAmounts);

  // Get income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age) || 0;
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age) || 0;
  // Get spending need (with additional spending)
  const additionalSpending = getSpendingOverride(age);

  // Calculate savings breakdown (track starting balance BEFORE any adjustments for current year)
  const savingsStartBalance = balances.balSavings;

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
    actualSpend - (ssGross + spouse.ssGross + penGross + spouse.penGross);

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

  // Add tax-free income adjustment to savings balance (not taxable)
  // as if it was deposited on 12/31 of the current year
  balances.balSavings += taxFreeIncomeAdjustment;

  // STEP 2: Track pensions
  const penResults = buildPensionTracker(penGross);
  const spousePenResults = buildPensionTracker(spouse.penGross);

  // Track taxable income reference to include only
  // taxable portions plus taxable interest
  // Ensure all components are valid numbers to prevent NaN
  const penGrossTotal = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const spousePenGrossTotal = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const taxableInterest = isNaN(taxableInterestEarned)
    ? 0
    : taxableInterestEarned;
  const taxableAdjustment = isNaN(taxableIncomeAdjustment)
    ? 0
    : taxableIncomeAdjustment;

  let totalTaxableIncome = {
    value:
      penGrossTotal + spousePenGrossTotal + taxableInterest + taxableAdjustment,
  };

  // Calculate spending need from all benefit sources
  // Since pensions are fully taxable, we use gross amounts and let the
  // retirement.js functions handle the complete tax calculation including SS
  const totalBenefitGross =
    penGross + spouse.penGross + ssGross + spouse.ssGross;
  const baseSpendNeed = Math.max(0, spend - 0); // We'll let withdrawal functions handle all income
  const additionalSpendNeed = additionalSpending || 0;
  const totalNeedNet = baseSpendNeed + additionalSpendNeed;

  // Build complete income picture for withdrawal functions
  const completeIncomeForWithdrawals = {
    value:
      penGrossTotal + spousePenGrossTotal + taxableInterest + taxableAdjustment,
  };

  const withdrawalFunctions = createWithdrawalFunctions(
    inputs,
    balances,
    completeIncomeForWithdrawals,
    retirementYear,
    ssGross + spouse.ssGross // Pass SS benefits to withdrawal functions
  );

  // Calculate withdrawal needs and execute withdrawals
  let finalWGross = 0,
    finalWNet = 0;

  // Apply RMDs first if required
  let rmdAmount = 0;
  if (inputs.useRMD && age >= 73) {
    rmdAmount = calculateRMD(age, balances.balPre);
    if (rmdAmount > 0) {
      const rmdWithdrawal = withdrawalFunctions.withdrawRMD(rmdAmount);
      finalWGross += rmdWithdrawal.gross;
      finalWNet += rmdWithdrawal.net;
      console.log(
        `RMD at age ${age}: Required $${rmdAmount.toLocaleString()}, Withdrew $${rmdWithdrawal.gross.toLocaleString()} gross, $${rmdWithdrawal.net.toLocaleString()} net`
      );
    }
  }

  // Calculate remaining spending need after RMD and other benefits
  // Since retirement.js functions handle all tax calculations including SS,
  // we can calculate the net benefit amounts directly
  const netBenefitsFromRetirementJs = finalWNet; // Start with what we got from RMD

  let remainingNeedNet = Math.max(
    0,
    totalNeedNet - netBenefitsFromRetirementJs
  );

  // Handle remaining withdrawals using the specified order
  if (remainingNeedNet > 0) {
    if (inputs.order[0] === "50/50") {
      const result = withdraw50_50(withdrawalFunctions, remainingNeedNet);
      finalWGross += result.totalGross;
      finalWNet += result.totalNet;
    } else {
      // Standard withdrawal order strategy
      for (const k of inputs.order) {
        if (remainingNeedNet <= 0) break;
        const { gross = 0, net = 0 } =
          withdrawalFunctions.withdrawFrom(k, remainingNeedNet) || {};
        remainingNeedNet = Math.max(0, remainingNeedNet - net);
        finalWGross += gross;
        finalWNet += net;
      }
    }
  }

  // Get withdrawal breakdown and tax information from sophisticated retirement.js functions
  const withdrawalsBySource = withdrawalFunctions.getWithdrawalsBySource();
  let taxCalculation = withdrawalFunctions.getLastTaxCalculation();

  // If no withdrawals were made, we still need to calculate taxes on pension/SS income
  if (
    !taxCalculation &&
    (penGross > 0 || spouse.penGross > 0 || ssGross > 0 || spouse.ssGross > 0)
  ) {
    console.log(
      "No withdrawals made, but calculating taxes on pension/SS income..."
    );
    const opts = {
      otherTaxableIncome:
        penGrossTotal +
        spousePenGrossTotal +
        taxableInterest +
        taxableAdjustment,
      ssBenefit: ssGross + spouse.ssGross,
      standardDeduction: getStandardDeduction(
        inputs.filingStatus,
        retirementYear,
        inputs.inflationRate
      ),
      brackets: getTaxBrackets(
        inputs.filingStatus,
        retirementYear,
        inputs.inflationRate
      ),
      precision: 0.01, // Precision for binary search convergence
    };

    // Calculate taxes with zero 401k withdrawal (just pension/SS income)
    taxCalculation = calculateNetWhen401kIncomeIs(0, opts);
  }

  // Extract tax information from retirement.js calculations
  let taxesThisYear = 0;
  let totalTaxableIncomeAfterDeduction = 0;
  let totalSsTaxable = 0;
  let provisionalIncome = 0;

  if (taxCalculation) {
    taxesThisYear = taxCalculation.tax || 0;
    totalTaxableIncomeAfterDeduction = taxCalculation.actualTaxableIncome || 0;
    totalSsTaxable = taxCalculation.taxableSSAmt || 0;
    // Note: retirement.js doesn't currently return provisional income, so we'll need to calculate it
    // or add it to the return values in retirement.js
  }

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js
  const ssNonTaxable =
    ssGross - (totalSsTaxable * ssGross) / (ssGross + spouse.ssGross || 1);
  const spouseSsNonTaxable =
    spouse.ssGross -
    (totalSsTaxable * spouse.ssGross) / (ssGross + spouse.ssGross || 1);

  // Calculate net income and handle overage BEFORE growing balances
  const grossIncomeFromBenefitsAndWithdrawals =
    ssGross + spouse.ssGross + penGross + spouse.penGross + finalWGross;
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

  // For display purposes: allocate taxes proportionally (only to taxable income sources)
  const ssNetAdjusted =
    ssGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (ssGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : ssGross;
  const spouseSsNetAdjusted =
    spouse.ssGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spouse.ssGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spouse.ssGross;
  const penNetAdjusted =
    penGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (penGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : penGross;
  const spousePenNetAdjusted =
    spouse.penGross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spouse.penGross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spouse.penGross;
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
      ? ((ssGross + spouse.ssGross) / grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;
  const penTaxAllocated =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? ((penGross + spouse.penGross) / grossIncomeFromBenefitsAndWithdrawals) *
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
    ssNonTaxable +
    spouseSsNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    withdrawalsBySource.savingsAccount +
    withdrawalsBySource.roth +
    taxFreeIncomeAdjustment;

  // Gross taxable income includes pre-tax withdrawals + taxable interest earned + taxable portions of benefits + taxable income adjustments
  // Ensure all components are valid numbers to prevent NaN
  // Calculate gross taxable income for display purposes using retirement.js results
  const grossPenGross = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const grossSpousePenGross = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const grossSsTaxable = totalSsTaxable; // Use total from retirement.js calculation
  const grossSpouseSsTaxable = 0; // Spouse SS included in totalSsTaxable
  const grossRetirementWithdrawals = isNaN(
    withdrawalsBySource.retirementAccount
  )
    ? 0
    : withdrawalsBySource.retirementAccount;
  const grossTaxableInterest = isNaN(taxableInterestEarned)
    ? 0
    : taxableInterestEarned;
  const grossTaxableAdjustment = isNaN(taxableIncomeAdjustment)
    ? 0
    : taxableIncomeAdjustment;

  const grossTaxableIncome =
    grossPenGross +
    grossSpousePenGross +
    grossSsTaxable +
    grossSpouseSsTaxable +
    grossRetirementWithdrawals +
    grossTaxableInterest +
    grossTaxableAdjustment;

  // Use grossTaxableIncome for Total Gross column (excludes non-taxable withdrawals)
  const totalGrossIncome =
    ssNonTaxable +
    spouseSsNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    grossTaxableIncome;

  // Effective tax rate calculation
  const effectiveTaxRate =
    totalTaxableIncomeAfterDeduction > 0
      ? (taxesThisYear / totalTaxableIncomeAfterDeduction) * 100
      : 0;

  console.log(
    `Age ${age}: Total taxes = ${taxesThisYear}, Taxable income = ${totalTaxableIncomeAfterDeduction}`
  );

  // Calculate standard deduction for this year
  const standardDeduction = getStandardDeduction(
    inputs.filingStatus,
    retirementYear, // retirementYear is already the actual year (e.g., 2040)
    inputs.inflationRate
  );

  // Update all the final values in the result object
  result.ss = ssNetAdjusted;
  result.pen = penNetAdjusted;
  result.spouseSs = spouseSsNetAdjusted;
  result.spousePen = spousePenNetAdjusted;
  result.spend = actualSpend;
  result.wNet = finalWNetTotal;
  result.w401kNet = withdrawalBreakdown.pretax401kNet;
  result.wSavingsRothNet =
    withdrawalBreakdown.savingsNet + withdrawalBreakdown.rothNet;
  result.wGross = finalWGrossTotal;
  result.w401kGross = withdrawalsBySource.retirementAccount;
  result.wSavingsGross = withdrawalsBySource.savingsAccount;
  result.wRothGross = withdrawalsBySource.roth;
  result.ssGross = ssGross;
  result.penGross = penGross;
  result.spouseSsGross = spouse.ssGross;
  result.spousePenGross = spouse.penGross;
  result.taxes = taxesThisYear;
  result.ssTaxes = ssTaxAllocated;
  result.otherTaxes = otherTaxes;
  result.penTaxes = penTaxAllocated;
  result.withdrawalTaxes = withdrawalTaxes;
  result.nonTaxableIncome = totalNonTaxableIncome;
  result.taxableIncome = totalTaxableIncomeAfterDeduction;
  result.taxableInterest = taxableInterestEarned;
  result.totalIncome =
    ssNetAdjusted +
    penNetAdjusted +
    spouseSsNetAdjusted +
    spousePenNetAdjusted +
    withdrawalNetAdjusted +
    taxableInterestEarned +
    taxableIncomeAdjustment +
    taxFreeIncomeAdjustment;
  result.totalNetIncome = totalNetIncome;
  result.totalGrossIncome = totalGrossIncome;
  result.effectiveTaxRate = effectiveTaxRate;
  result.provisionalIncome = provisionalIncome;
  result.standardDeduction = standardDeduction;
  result.balSavings = balances.balSavings;
  result.balPre = balances.balPre;
  result.balRoth = balances.balRoth;
  result.total = totalBal;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: savingsStartBalance,
    withdrawals: actualSavingsWithdrawal,
    overageDeposit: overage,
    taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
    balanceBeforeGrowth: savingsBeforeGrowth,
    interestEarned: savingsGrowth,
    endingBalance: balances.balSavings,
    growthRate: inputs.rateOfSavings * 100,
  };

  result.withdrawalBreakdown = withdrawalBreakdown;

  result.ssBreakdown = {
    ssGross: ssGross,
    ssTaxableAmount: totalSsTaxable,
    ssNonTaxable: ssNonTaxable,
    ssTaxes: ssTaxAllocated,
    calculationDetails: null, // Would need to extract from retirement.js if needed
    otherTaxableIncome: taxCalculation
      ? taxCalculation.totalTaxableIncome || 0
      : 0,
  };

  return result;
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
  // Declare and initialize the result object at the top
  const result = {
    ssAnnual: 0,
    penAnnual: 0,
    spouseSsAnnual: 0,
    spousePenAnnual: 0,
  };

  const age = inputs.retireAge - inputs.ssStartAge;

  result.ssAnnual =
    inputs.ssMonthly *
    12 *
    (inputs.retireAge >= inputs.ssStartAge
      ? compoundedRate(inputs.ssCola, inputs.retireAge - inputs.ssStartAge)
      : 1);
  result.penAnnual =
    inputs.penMonthly *
    12 *
    (inputs.retireAge >= inputs.penStartAge
      ? compoundedRate(inputs.penCola, inputs.retireAge - inputs.penStartAge)
      : 1);

  const spouseBenefits = calculateSpouseBenefits(inputs);
  result.spouseSsAnnual = spouseBenefits.spouseSsAnnual;
  result.spousePenAnnual = spouseBenefits.spousePenAnnual;

  return result;
}

function calc() {
  // debugger;
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
  for (let y = 0; y < inputs.totalWorkingYears; y++) {
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

  // debugger;
  // Retirement years
  for (
    let retirementYear = 0;
    retirementYear < inputs.totalLivingYears - inputs.totalWorkingYears;
    retirementYear++
  ) {
    const benefitAmounts = {
      ssAnnual,
      penAnnual,
      spouseSsAnnual,
      spousePenAnnual,
    };
    const yearData = calculateRetirementYearData(
      inputs,
      retirementYear,
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
    if (age >= inputs.ssStartAge) ssAnnual *= 1 + inputs.ssCola;
    if (age >= inputs.penStartAge && inputs.penMonthly > 0)
      penAnnual *= 1 + inputs.penCola;

    if (inputs.hasSpouse) {
      const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
      if (spouseCurrentAge >= inputs.spouseSsStartAge)
        spouseSsAnnual *= 1 + inputs.spouseSsCola;
      if (
        spouseCurrentAge >= inputs.spousePenStartAge &&
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
