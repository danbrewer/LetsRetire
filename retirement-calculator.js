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
  year = 2025
) {
  const standardDeduction = getStandardDeduction(year, filingStatus);
  return Math.max(0, grossIncome - standardDeduction);
}

// Wrapper for federal tax calculation using retirement.js functions
function calculateFederalTax(
  grossIncome,
  filingStatus = FILING_STATUS.SINGLE,
  year = 2025
) {
  const taxBrackets = getTaxBrackets(year, filingStatus);
  const standardDeduction = getStandardDeduction(year, filingStatus);
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
    TAX_BASE_YEAR + year
  );
  result.taxableInterest = taxableInterestIncome;
  result.totalIncome = totalGrossIncome + taxableInterestIncome;
  result.totalNetIncome = afterTaxIncome + taxFreeIncomeAdjustment;
  result.totalGrossIncome = totalGrossIncome + taxableInterestIncome;
  result.effectiveTaxRate =
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
      : 0;
  result.provisionalIncome = 0;
  result.standardDeduction = getStandardDeduction(
    TAX_BASE_YEAR + year,
    inputs.filingStatus
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
 * Calculate pension taxation for a given year
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

  // Pensions are typically fully taxable, but we track for consistency
  const penNonTaxable = 0; // 0% non-taxable

  // Don't calculate separate pension taxes - will be included in total income tax calculation
  const penTaxes = 0;
  const penNet = penGross; // Full gross amount; taxes calculated on total income

  // Update result object
  result.penTaxes = penTaxes;
  result.penNet = penNet;
  result.penNonTaxable = penNonTaxable;
  result.pensionTaxRate = 0; // Will be calculated as part of total income

  return result;
}

/**
 * Create withdrawal function for a specific retirement year
 */
function createWithdrawalFunctions(
  inputs,
  closuredCopyOfBalances,
  closuredCopyOfTotalTaxableIncome,
  year = 0
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
      const opts = {
        otherTaxableIncome: closuredCopyOfTotalTaxableIncome.value,
        ssBenefit: 0, // Regular withdrawals don't include Social Security benefits
        standardDeduction: getStandardDeduction(
          2025 + year,
          inputs.filingStatus
        ),
        brackets: getTaxBrackets(2025 + year, inputs.filingStatus),
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
    const opts = {
      otherTaxableIncome: closuredCopyOfTotalTaxableIncome.value,
      ssBenefit: 0, // RMD doesn't include Social Security benefits
      standardDeduction: getStandardDeduction(
        TAX_BASE_YEAR + year,
        inputs.filingStatus
      ),
      brackets: getTaxBrackets(TAX_BASE_YEAR + year, inputs.filingStatus),
      precision: 0.01, // Precision for binary search convergence
    };

    const netResult = calculateNetWhen401kIncomeIs(actualGross, opts);
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

  // STEP 3: Estimate initial withdrawal need (before SS taxation)
  // Use net amounts (after tax) for spending calculation
  let preliminaryNeedNet = Math.max(
    0,
    actualSpend - (penResults.penNet + spousePenResults.penNet)
  );

  // STEP 4: Make preliminary withdrawals to estimate total income for SS calculation
  let copyOfBalances = { ...balances }; // Work with copy for estimation
  const safeTotalTaxableValue = isNaN(totalTaxableIncome.value)
    ? 0
    : totalTaxableIncome.value;
  let copyOfTotalTaxableIncome = { value: safeTotalTaxableValue };

  // createWithdrawalFunction is a utility to generate withdrawal functions
  // for each account type (e.g., savings, 401k, IRA)
  // It returns an object containing withdrawal functions for each account type
  // Each function takes a gross withdrawal amount and returns the net amount after taxes
  const preliminaryWithdrawalFunctions = createWithdrawalFunctions(
    inputs,
    copyOfBalances,
    copyOfTotalTaxableIncome,
    retirementYear
  );

  // Apply RMDs first (preliminary)
  let preliminaryRmdAmount = 0;

  if (inputs.useRMD && age >= 73) {
    preliminaryRmdAmount = calculateRMD(age, copyOfBalances.balPre);
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
  const totalTaxableIncomeForSS = isNaN(copyOfTotalTaxableIncome.value)
    ? 0
    : copyOfTotalTaxableIncome.value;
  const ssResults = calculateSocialSecurityTaxation(
    inputs,
    ssGross,
    totalTaxableIncomeForSS,
    retirementYear
  );
  const spouseSsResults = calculateSocialSecurityTaxation(
    inputs,
    spouse.ssGross,
    totalTaxableIncomeForSS + ssResults.ssTaxableAmount,
    retirementYear
  );

  // STEP 6: Recalculate final withdrawals with correct SS net amounts
  // Only include taxable portions in taxable income reference
  // Ensure all components are valid numbers to prevent NaN
  const updatedPenGross = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const updatedSpousePenGross = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const updatedSsTaxable = isNaN(ssResults.ssTaxableAmount)
    ? 0
    : ssResults.ssTaxableAmount;
  const updatedSpouseSsTaxable = isNaN(spouseSsResults.ssTaxableAmount)
    ? 0
    : spouseSsResults.ssTaxableAmount;
  const updatedTaxableInterest = isNaN(taxableInterestEarned)
    ? 0
    : taxableInterestEarned;
  const updatedTaxableAdjustment = isNaN(taxableIncomeAdjustment)
    ? 0
    : taxableIncomeAdjustment;

  totalTaxableIncome.value =
    updatedPenGross +
    updatedSpousePenGross +
    updatedSsTaxable +
    updatedSpouseSsTaxable +
    updatedTaxableInterest +
    updatedTaxableAdjustment;

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

  const finalWithdrawalFunctions = createWithdrawalFunctions(
    inputs,
    balances,
    totalTaxableIncome,
    retirementYear
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
  // Ensure all components are valid numbers to prevent NaN in final SS calculation
  const finalPenGross = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const finalSpousePenGross = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const finalRetirementWithdrawals = isNaN(
    withdrawalsBySource.retirementAccount
  )
    ? 0
    : withdrawalsBySource.retirementAccount;
  const finalTaxableInterest = isNaN(taxableInterestEarned)
    ? 0
    : taxableInterestEarned;
  const finalTaxableAdjustment = isNaN(taxableIncomeAdjustment)
    ? 0
    : taxableIncomeAdjustment;

  const finalTaxableIncomeForSS =
    finalPenGross +
    finalSpousePenGross +
    finalRetirementWithdrawals +
    finalTaxableInterest +
    finalTaxableAdjustment;

  const finalSsResults = calculateSocialSecurityTaxation(
    inputs,
    ssGross,
    finalTaxableIncomeForSS,
    retirementYear
  );
  const finalSpouseSsResults = calculateSocialSecurityTaxation(
    inputs,
    spouse.ssGross,
    finalTaxableIncomeForSS +
      (isNaN(finalSsResults.ssTaxableAmount)
        ? 0
        : finalSsResults.ssTaxableAmount),
    retirementYear
  );

  // Calculate total taxes on all taxable income (proper approach)
  // Total taxable income includes: SS taxable + pension taxable + pretax withdrawals + taxable interest
  // Ensure all components are valid numbers to prevent NaN
  const totalPenGross = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const totalSpousePenGross = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const totalSsTaxable = isNaN(finalSsResults.ssTaxableAmount)
    ? 0
    : finalSsResults.ssTaxableAmount;
  const totalSpouseSsTaxable = isNaN(finalSpouseSsResults.ssTaxableAmount)
    ? 0
    : finalSpouseSsResults.ssTaxableAmount;
  const totalRetirementWithdrawals = isNaN(
    withdrawalsBySource.retirementAccount
  )
    ? 0
    : withdrawalsBySource.retirementAccount;
  const totalTaxableInterest = isNaN(taxableInterestEarned)
    ? 0
    : taxableInterestEarned;
  const totalTaxableAdjustment = isNaN(taxableIncomeAdjustment)
    ? 0
    : taxableIncomeAdjustment;

  const totalGrossTaxableIncome =
    totalPenGross +
    totalSpousePenGross +
    totalSsTaxable +
    totalSpouseSsTaxable +
    totalRetirementWithdrawals +
    totalTaxableInterest +
    totalTaxableAdjustment;

  // Calculate total income tax on the combined taxable income
  taxesThisYear = calculateFederalTax(
    totalGrossTaxableIncome,
    inputs.filingStatus,
    retirementYear
  );

  // Also calculate the taxable income after deduction for display purposes
  const totalTaxableIncomeAfterDeduction = calculateTaxableIncome(
    totalGrossTaxableIncome,
    inputs.filingStatus,
    retirementYear
  );

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
    finalSsResults.ssNonTaxable +
    finalSpouseSsResults.ssNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    withdrawalsBySource.savingsAccount +
    withdrawalsBySource.roth +
    taxFreeIncomeAdjustment;

  // Gross taxable income includes pre-tax withdrawals + taxable interest earned + taxable portions of benefits + taxable income adjustments
  // Ensure all components are valid numbers to prevent NaN
  const grossPenGross = isNaN(penResults.penGross) ? 0 : penResults.penGross;
  const grossSpousePenGross = isNaN(spousePenResults.penGross)
    ? 0
    : spousePenResults.penGross;
  const grossSsTaxable = isNaN(ssResults.ssTaxableAmount)
    ? 0
    : ssResults.ssTaxableAmount;
  const grossSpouseSsTaxable = isNaN(spouseSsResults.ssTaxableAmount)
    ? 0
    : spouseSsResults.ssTaxableAmount;
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
    finalSsResults.ssNonTaxable +
    finalSpouseSsResults.ssNonTaxable +
    penResults.penNonTaxable +
    spousePenResults.penNonTaxable +
    grossTaxableIncome;

  // Taxable income after standard deduction (this is what gets taxed)
  const taxableIncomeAfterDeduction = calculateTaxableIncome(
    grossTaxableIncome,
    inputs.filingStatus,
    retirementYear
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
    retirementYear,
    inputs.filingStatus
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
  result.taxableIncome = taxableIncomeAfterDeduction;
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
    ssTaxableAmount: finalSsResults.ssTaxableAmount,
    ssNonTaxable: finalSsResults.ssNonTaxable,
    ssTaxes: ssTaxAllocated,
    calculationDetails: finalSsResults.calculationDetails,
    otherTaxableIncome: finalTaxableIncomeForSS,
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
