// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.asCurrency = function () {
  return this.round(2);
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
    calculate401kNetWhen401kGrossIs,
    determine401kWithdrawalToHitNetTargetOf,
    getTaxBrackets,
    getStandardDeduction,
  } = require("./retirement");
}

// Constants
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
function calculateRMD(age, balances) {
  if (age < 73 || balances.traditional401k <= 0) return 0;

  const accountBalances = balances.traditional401k;

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

  return accountBalances / factor;
}

/**
 * Calculate one year of accumulation phase (working years)
 */
function calculateWorkingYearData(inputs, year, salary, rollingBalances) {
  // Declare and initialize the result object at the top
  const result = {
    age: 0,
    salary: 0,
    spend: 0,
    contributions: {},
    withdrawals: {},
    bal: {},
    savingsBreakdown: {},
    ssBreakdown: {},
    spouseSsBreakdown: {},
    pen: {},
    ss: {},
    pensionBreakdown: {},
    spousePensionBreakdown: {},
    taxes: {},
  };

  const taxes = {
    total: 0,
    otherTaxes: 0,
    penTaxes: 0,
    nonTaxableIncome: 0,
    taxableIncome: 0,
    taxableInterest: 0,
    effectiveTaxRate: 0,
    standardDeduction: 0,
  };

  const bal = {
    balSavings: 0,
    balPre: 0,
    balRoth: 0,
    total: 0,
  };

  const pen = {
    myPen: 0,
    myPenGross: 0,
    spousePen: 0,
    spousePenGross: 0,
    taxes: 0,
  };

  const ss = {
    mySs: 0,
    mySsGross: 0,
    spouseSs: 0,
    spouseSsGross: 0,
    taxes: 0,
    provisionalIncome: 0,
  };

  const totals = {
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
  };

  const contributions = {
    my401k: 0,
    myRoth: 0,
    spouse401k: 0,
    spouseRoth: 0,
    savings: 0,
    employerMatch: 0,
    total: 0,
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
  let desired401kContribution = salary * inputs.pretaxPct;
  let desiredRothContribution = salary * inputs.rothPct;

  // 401k/Roth 401k elective deferral cap (employee-only)
  let electiveLimit =
    EMPLOYEE_401K_LIMIT_2025 + (age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0);
  const totalDesiredContribution =
    desired401kContribution + desiredRothContribution;
  let scale =
    totalDesiredContribution > 0
      ? Math.min(1, electiveLimit / totalDesiredContribution)
      : 1;
  const cap401kContribution = desired401kContribution * scale;
  const capRothContribution = desiredRothContribution * scale;

  // Employer match based on actual pre-tax contribution %, capped by matchCap
  const emp401kContributionPct = salary > 0 ? cap401kContribution / salary : 0;
  const match =
    Math.min(emp401kContributionPct, inputs.matchCap) *
    salary *
    inputs.matchRate;

  // Calculate taxes on working income including taxable interest
  const taxableInterestIncome = rollingBalances.savings * inputs.retSavings;

  // Get taxable income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age) || 0;

  let grossTaxableIncome =
    salary -
    cap401kContribution +
    taxableInterestIncome +
    taxableIncomeAdjustment;

  const workingYearTaxes = calculateFederalTax(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflation
  );

  // After-tax income calculations
  // Total gross income includes salary plus additional taxable income
  const totalGrossIncome = salary + taxableIncomeAdjustment;
  const afterTaxIncome =
    totalGrossIncome -
    cap401kContribution -
    workingYearTaxes -
    capRothContribution;
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
  const savingsStartBalance = rollingBalances.savings;
  const taxableInterestEarned = rollingBalances.savings * inputs.retSavings;

  rollingBalances.traditional401k =
    (rollingBalances.traditional401k + cap401kContribution + match) *
    (1 + inputs.ret401k);
  rollingBalances.rothIra =
    (rollingBalances.rothIra + capRothContribution) * (1 + inputs.retRoth);
  rollingBalances.savings =
    (rollingBalances.savings + cTax + taxFreeIncomeAdjustment) *
    (1 + inputs.retSavings);

  const withdrawals = {
    net: 0,
    retirementAccountNet: 0,
    savingsRothNet: 0,
    gross: 0,
    retirementAccountGross: 0,
    savingsGross: 0,
    rothGross: 0,
  };

  const taxableIncome = calculateTaxableIncome(
    grossTaxableIncome,
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflation
  );

  const standardDeduction = getStandardDeduction(
    inputs.filingStatus,
    TAX_BASE_YEAR + year,
    inputs.inflation
  );

  taxes.total = workingYearTaxes;
  taxes.otherTaxes = workingYearTaxes;
  taxes.nonTaxableIncome = taxFreeIncomeAdjustment;
  taxes.taxableIncome = taxableIncome;
  taxes.taxableInterest = taxableInterestIncome;
  taxes.effectiveTaxRate =
    taxableIncome > 0 ? (workingYearTaxes / taxableIncome) * 100 : 0;
  taxes.standardDeduction = standardDeduction;

  bal.balSavings = rollingBalances.savings;
  bal.balPre = rollingBalances.traditional401k;
  bal.balRoth = rollingBalances.rothIra;
  bal.total =
    rollingBalances.savings +
    rollingBalances.traditional401k +
    rollingBalances.rothIra;

  totals.totalIncome = totalGrossIncome + taxableInterestIncome;
  totals.totalNetIncome = afterTaxIncome + taxFreeIncomeAdjustment;
  totals.totalGrossIncome = totalGrossIncome + taxableInterestIncome;

  // Update all the final values in the result object

  contributions.my401k = cap401kContribution;
  contributions.myRoth = capRothContribution;
  contributions.savings = cTax;
  contributions.employerMatch = match;
  contributions.total =
    cap401kContribution + capRothContribution + cTax + match;
  // Note: Spouse contributions not handled in working year calculations

  result.contributions = contributions;

  result.ss = ss;
  result.pen = pen;
  result.spend = currentYearSpending;
  result.withdrawals = withdrawals;

  result.taxes = taxes;

  result.totals = totals;

  result.bal = bal;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: savingsStartBalance,
    withdrawals: 0,
    overageDeposit: 0,
    taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
    regularDeposit: cTax,
    interestEarned: taxableInterestEarned,
    endingBalance: rollingBalances.savings,
    growthRate: inputs.retSavings * 100,
  };

  result.ssBreakdown = {
    ssGross: 0,
    ssTaxableAmount: 0,
    ssNonTaxable: 0,
    ssTaxes: 0,
  };

  result.spouseSsBreakdown = {
    ssGross: 0,
    ssTaxableAmount: 0,
    ssNonTaxable: 0,
    ssTaxes: 0,
  };

  result.pensionBreakdown = {
    penGross: 0,
    penTaxableAmount: 0,
    penNonTaxable: 0,
    penTaxes: 0,
    pensionTaxRate: 0,
  };

  result.spousePensionBreakdown = {
    penGross: 0,
    penTaxableAmount: 0,
    penNonTaxable: 0,
    penTaxes: 0,
    pensionTaxRate: 0,
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
 * Create withdrawal function for a specific retirement year
 */
function buildWithdrawalFunctions(
  inputs,
  closuredCopyOfRunningBalances,
  closuredCopyOfFixedPortionOfTaxableIncome,
  year = 0,
  ssBenefits = 0
) {
  // Declare and initialize the result object at the top
  const result = {
    withdrawFrom: null,
    getTaxesThisYear: null,
    getWithdrawalsBySource: null,
    getLastTaxCalculation: null,
  };

  if (isNaN(closuredCopyOfFixedPortionOfTaxableIncome)) {
    console.error(
      `closuedCopyOfFixedPortionOfTaxableIncome is NaN.  This is a fatal error`
    );
    return result;
  }

  if (
    closuredCopyOfRunningBalances == null ||
    !closuredCopyOfRunningBalances ||
    Object.keys(closuredCopyOfRunningBalances).length === 0
  ) {
    console.error(
      `closuredCopyOfRunningBalances is null or undefined.  This is a fatal error`
    );
    return result;
  }

  let taxesThisYear = 0;

  let withdrawalsBySource = {
    retirementAccount: 0,
    savingsAccount: 0,
    roth: 0,
  };
  let last401kNetCalculationResults = null; // Store the most recent detailed tax calculation

  function withdrawFrom(kind, desiredNetAmount) {
    const result = {
      gross401kWithdrawal: 0,
      net401kWithdrawal: 0,
      grossRothWithdrawal: 0,
      netRothWithdrawal: 0,
      grossSavingsWithdrawal: 0,
      netSavingsWithdrawal: 0,
    };

    // **************
    // Sanity checks
    // **************
    // Validate kind parameter
    if (!kind || typeof kind !== "string") {
      console.error("Invalid withdrawal kind:", kind);
      return result;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = ["savings", "pretax", "roth"];
    if (!validKinds.includes(kind)) {
      console.error("Withdrawal target not defined or not supported:", kind);
      console.error("Expected one of:", validKinds.join(", "));
      return result;
    }

    if (desiredNetAmount <= 0) return result;

    // Determine balance reference and setter function
    const targetedAccount = {
      getBalance: null,
      setBalance: null,
    };

    switch (kind) {
      case "savings":
        targetedAccount.getBalance = () =>
          closuredCopyOfRunningBalances.savings;
        targetedAccount.setBalance = (v) => {
          closuredCopyOfRunningBalances.savings = v;
        };
        break;
      case "pretax":
        targetedAccount.getBalance = () =>
          closuredCopyOfRunningBalances.traditional401k;
        targetedAccount.setBalance = (v) => {
          closuredCopyOfRunningBalances.traditional401k = v;
        };
        break;
      case "roth":
        targetedAccount.getBalance = () =>
          closuredCopyOfRunningBalances.rothIra;
        targetedAccount.setBalance = (v) => {
          closuredCopyOfRunningBalances.rothIra = v;
        };
        break;
      default:
        console.error("Unknown withdrawal kind:", kind);
        return result;
    }

    const standardDeduction = getStandardDeduction(
      inputs.filingStatus,
      year, // year is already the actual year (e.g., 2040)
      inputs.inflation
    );

    const taxBrackets = getTaxBrackets(
      inputs.filingStatus,
      year,
      inputs.inflation
    );

    // debugger;
    const opts = {
      fixedPortionOfTaxableIncome: closuredCopyOfFixedPortionOfTaxableIncome,
      combinedSsGrossIncome: ssBenefits, // Include Social Security benefits in tax calculation
      standardDeduction,
      brackets: taxBrackets,
      precision: 0.01, // Precision for binary search convergence
    };

    // For pretax withdrawals, use sophisticated tax calculations from retirement.js
    let gross401kWithdrawal, netReceived;

    if (kind === "pretax") {
      // Use binary search optimization from retirement.js for accurate withdrawal calculation
      // Construct the opts object that these functions expect
      // Add comprehensive NaN protection for otherTaxableIncome

      const withdrawalResult = determine401kWithdrawalToHitNetTargetOf(
        desiredNetAmount,
        opts
      );

      // Only take what is available in the account
      gross401kWithdrawal = Math.min(
        withdrawalResult.withdrawalNeeded,
        targetedAccount.getBalance()
      );

      // Calculate actual net using the sophisticated tax calculation
      const netResult = calculate401kNetWhen401kGrossIs(
        gross401kWithdrawal,
        opts
      );
      last401kNetCalculationResults = netResult; // Store detailed tax calculation results

      netReceived = netResult.net;
      targetedAccount.setBalance(
        targetedAccount.getBalance() - gross401kWithdrawal
      );
    } else {
      // debugger;
      const netResult = calculate401kNetWhen401kGrossIs(0, opts);
      // For Savings/Roth accounts, there is no tax impact; simply withdraw the desired amount
      netReceived = Math.min(
        desiredNetAmount - netResult.net,
        targetedAccount.getBalance()
      );
      gross401kWithdrawal = netReceived; // Gross equals net for Savings/Roth
      targetedAccount.setBalance(targetedAccount.getBalance() - netReceived);
    }

    // Track withdrawals by source
    if (kind === "pretax") {
      withdrawalsBySource.retirementAccount += gross401kWithdrawal;
    } else if (kind === "savings") {
      withdrawalsBySource.savingsAccount += gross401kWithdrawal;
    } else if (kind === "roth") {
      withdrawalsBySource.roth += gross401kWithdrawal;
    }

    // Add pre-tax withdrawals to Taxable Income for subsequent calculations
    if (kind === "pretax") {
      const safeGrossTake = isNaN(gross401kWithdrawal)
        ? 0
        : gross401kWithdrawal;
      closuredCopyOfFixedPortionOfTaxableIncome.value += safeGrossTake;
    }

    return { gross: gross401kWithdrawal, net: netReceived };
  }

  // Populate the result object
  result.withdrawFrom = withdrawFrom;
  result.getTaxesThisYear = () => taxesThisYear;
  result.getWithdrawalsBySource = () => withdrawalsBySource;
  result.getLastTaxCalculation = () => last401kNetCalculationResults;

  return result;
}

function extractSpouseBenefitInputs(inputs, age, benefitAmounts) {
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
  rollingBalances,
  benefitAmounts,
  spend
) {
  // Declare and initialize the result object at the top
  const result = {
    year: 0,
    age: 0,
    salary: 0,
    contrib: 0,
    spend: 0,

    withdrawals: {},
    taxes: {},
    ss: {},
    totals: {},
    bal: {},
    pen: {},
    savings: {},

    savingsBreakdown: {},
    withdrawalBreakdown: {},
    ssBreakdown: {},
    pensionBreakdown: {},
  };

  const taxes = {
    total: 0,
    otherTaxes: 0,
    penTaxes: 0,
    nonTaxableIncome: 0,
    taxableIncome: 0,
    taxableInterest: 0,
    effectiveTaxRate: 0,
    standardDeduction: 0,
  };

  const ss = {
    mySs: 0,
    mySsGross: 0,
    spouseSs: 0,
    spouseSsGross: 0,
    taxes: 0,
    provisionalIncome: 0,
  };

  const pen = {
    myPen: 0,
    myPenGross: 0,
    spousePen: 0,
    spousePenGross: 0,
    taxes: 0,
  };

  const totals = {
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
  };

  const bal = {
    balSavings: 0,
    balPre: 0,
    balRoth: 0,
    total: 0,
  };

  const contributions = {
    my401k: 0,
    myRoth: 0,
    spouse401k: 0,
    spouseRoth: 0,
    savings: 0,
    employerMatch: 0,
    total: 0,
  };

  const savings = {
    startingBalance: rollingBalances.savings,
    withdrawals: 0,
    extraWithdrawals: 0,
    balanceSubjectToInterest: 0,
    interestEarned: 0,
    overageDeposit: 0,
    taxFreeIncomeDeposit: 0,
    regularDeposit: 0,
    endingBalance: 0,
    growthRate: inputs.retSavings,
  };

  // debugger;
  const age = inputs.retireAge + yearIndex;

  // kill the logger for now
  LOG_LEVEL = 0;

  const retirementYear =
    new Date().getFullYear() + inputs.totalWorkingYears + yearIndex;
  // Set basic values in result object

  result.year = retirementYear;
  result.age = age;
  result.contributions = contributions;

  const DUMP_TO_CONSOLE = age == 200;

  if (DUMP_TO_CONSOLE) {
    console.log(
      `-----------------------------------------------\n--- Retirement Year ${
        yearIndex + 1
      } (Age ${age}) (Year ${retirementYear}) ---\n-----------------------------------------------`
    );
  }

  const withdrawals = {
    savingsRothNet: 0,
    gross: 0,
    net: 0,
    retirementAccountGross: 0,
    retirementAccountNet: 0,
    savingsGross: 0,
    rothGross: 0,
    taxes: 0,
  };

  // Income sources (gross amounts)
  const eligibleForSs = age >= inputs.ssStartAge;
  const hasPen = age >= inputs.penStartAge && inputs.penMonthly > 0;

  const mySsBenefits = {
    gross: eligibleForSs ? benefitAmounts.ssAnnual : 0,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const myPensionBenefits = {
    gross: hasPen ? benefitAmounts.penAnnual : 0,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const spouse = extractSpouseBenefitInputs(inputs, age, benefitAmounts);

  const spouseSsBenefits = {
    gross: spouse.ssGross,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const spousePensionBenefits = {
    gross: spouse.penGross,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  // Get income adjustments for this age
  const taxableIncomeAdjustment = getTaxableIncomeOverride(age) || 0;
  const taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(age) || 0;

  // Get spending need (with additional spending)
  let additionalSpending = getSpendingOverride(age);

  if (additionalSpending !== null && additionalSpending > 0) {
    if (DUMP_TO_CONSOLE) {
      console.log(
        `Age ${age}: Adding extra spending $${additionalSpending.toLocaleString()} to base $${spend.toLocaleString()} = total $${totalSpend.toLocaleString()}`
      );
    }
  }
  if (additionalSpending === null) {
    setSpendingFieldValue(age, spend);
    additionalSpending = 0;
  }

  // Add the additional spend to spend and track as totalSpend
  const totalSpend = spend + additionalSpending;

  // Calculate savings breakdown (track starting balance BEFORE any adjustments for current year)
  const savingsStartBalance = rollingBalances.savings;
  // Track taxable interest earned last year
  const taxableInterest = savingsStartBalance * inputs.retSavings; // rollingBalances.taxableInterestEarned;

  // Treat RMDs as a non-adjustable income source
  const rmdAmount =
    inputs.useRMD && age >= 73 ? calculateRMD(age, rollingBalances) : 0;
  if (rmdAmount > 0) {
    if (DUMP_TO_CONSOLE) {
      console.log(`RMD required at age ${age}: $${rmdAmount.toLocaleString()}`);
    }
  }

  // Build complete taxable income picture for withdrawal functions
  const fixedPortionOfTaxableIncome =
    myPensionBenefits.gross +
    spousePensionBenefits.gross +
    taxableInterest +
    taxableIncomeAdjustment +
    rmdAmount;

  // debugger;
  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Spending Need Debug:");
    console.log("- spend".padEnd(30), spend);
    console.log("- additionalSpending".padEnd(30), additionalSpending);
    console.log("- totalNeedNet".padEnd(30), totalSpend);
    console.log("- rmd".padEnd(30), rmdAmount);
    console.log(
      "- taxableIncomeAdjustment".padEnd(30),
      taxableIncomeAdjustment
    );
    console.log("- taxableInterest".padEnd(30), taxableInterest);
    console.log(
      "- fixedPortionOfTaxableIncome".padEnd(30),
      fixedPortionOfTaxableIncome
    );
  }

  // debugger;
  const withdrawalFunctions = buildWithdrawalFunctions(
    inputs,
    rollingBalances,
    fixedPortionOfTaxableIncome,
    retirementYear,
    mySsBenefits.gross + spouseSsBenefits.gross // Pass SS benefits to withdrawal functions
  );

  // Calculate withdrawal needs and execute withdrawals
  const aggregatedWithdrawals = {
    gross: 0,
    net: 0,
  };

  let remainingSpendNeeded = Math.max(0, totalSpend);

  // debugger;
  // Handle remaining withdrawals using the specified order
  for (const k of inputs.order) {
    if (remainingSpendNeeded <= 0) break;
    const { grossWithdrawal = 0, netWithdrawal = 0 } =
      withdrawalFunctions.withdrawFrom(k, remainingSpendNeeded) || {};
    remainingSpendNeeded = Math.max(0, remainingSpendNeeded - netWithdrawal);
    aggregatedWithdrawals.gross += grossWithdrawal;
    aggregatedWithdrawals.net += netWithdrawal;
  }

  // Get withdrawal breakdown and tax information from sophisticated retirement.js functions
  const withdrawalsBySource = withdrawalFunctions.getWithdrawalsBySource();
  let taxCalculation = withdrawalFunctions.getLastTaxCalculation();

  // debugger;
  // If no withdrawals were made, we still need to calculate taxes on pension/SS income
  if (!taxCalculation && fixedPortionOfTaxableIncome > 0) {
    if (DUMP_TO_CONSOLE) {
      console.log(
        "No withdrawals made, but calculating taxes on pension/SS income..."
      );
    }
    const opts = {
      otherTaxableIncome: fixedPortionOfTaxableIncome,
      ssBenefit: mySsBenefits.gross + spouseSsBenefits.gross, // Include Social Security benefits in tax calculation
      standardDeduction: getStandardDeduction(
        inputs.filingStatus,
        retirementYear,
        inputs.inflation
      ),
      brackets: getTaxBrackets(
        inputs.filingStatus,
        retirementYear,
        inputs.inflation
      ),
      precision: 0.01, // Precision for binary search convergence
    };

    // Calculate taxes with zero 401k withdrawal (just pension/SS income)
    taxCalculation = calculate401kNetWhen401kGrossIs(0, opts);
  }

  // Extract tax information from retirement.js calculations
  let taxesThisYear = 0;
  let totalTaxableIncomeAfterDeduction = 0;
  let totalSsTaxable = 0;
  let provisionalIncome = 0;
  let ssCalculationDetails = null;

  if (taxCalculation) {
    taxesThisYear = taxCalculation.tax || 0;
    totalTaxableIncomeAfterDeduction = taxCalculation.actualTaxableIncome || 0;
    totalSsTaxable = taxCalculation.taxableSSAmt || 0;
    // Note: retirement.js doesn't currently return provisional income, so we'll need to calculate it
    // or add it to the return values in retirement.js
  }

  // Get detailed Social Security calculation results for breakdown objects
  if (mySsBenefits.gross > 0 || spouseSsBenefits.gross > 0) {
    const totalOtherTaxableIncome =
      fixedPortionOfTaxableIncome +
      (taxCalculation ? taxCalculation.withdrawalIncome || 0 : 0);

    const ssResult = determineTaxablePortionOfSocialSecurity(
      mySsBenefits.gross + spouseSsBenefits.gross,
      totalOtherTaxableIncome
    );

    ssCalculationDetails = ssResult.calculationDetails;
  }

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js
  const mySsNonTaxable =
    mySsBenefits.gross -
    (totalSsTaxable * mySsBenefits.gross) /
      (mySsBenefits.gross + spouseSsBenefits.gross || 1);
  const spouseSsNonTaxable =
    spouseSsBenefits.gross -
    (totalSsTaxable * spouseSsBenefits.gross) /
      (mySsBenefits.gross + spouseSsBenefits.gross || 1);

  // Calculate net income and handle overage BEFORE growing balances
  const grossIncomeFromBenefitsAndWithdrawals =
    mySsBenefits.gross +
    spouseSsBenefits.gross +
    myPensionBenefits.gross +
    spousePensionBenefits.gross +
    aggregatedWithdrawals.gross;
  const netIncomeFromTaxableSources =
    grossIncomeFromBenefitsAndWithdrawals - taxesThisYear;
  const spendingTarget = totalSpend;
  const shortfall = Math.max(0, spendingTarget - netIncomeFromTaxableSources);

  // Handle shortfall with additional savings withdrawal
  let additionalSavingsWithdrawal = Math.min(
    shortfall,
    savings.startingBalance
  );

  if (additionalSavingsWithdrawal > 0) {
    // balances.savings -= additionalSavingsWithdrawal;
    withdrawalsBySource.savingsAccount += additionalSavingsWithdrawal;
  }

  // debugger;
  let actualSavingsWithdrawal = withdrawalsBySource.savingsAccount; // Track the actual amount withdrawn from savings

  // Calculate total net income
  const totalNetIncome = (
    netIncomeFromTaxableSources + additionalSavingsWithdrawal
  ).round(0);

  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Net Income Debug:");
    console.log("- netIncomeFromTaxableSources:", netIncomeFromTaxableSources);
    console.log("- additionalSavingsWithdrawal:", additionalSavingsWithdrawal);
    console.log("- totalNetIncome:", totalNetIncome);
    console.log("- spendingTarget:", spendingTarget);
  }

  // Update final withdrawal amounts to include any additional savings withdrawal
  const totalWithdrawals =
    aggregatedWithdrawals.gross + additionalSavingsWithdrawal;

  // Calculate balance before growth (after all deposits/withdrawals)
  const savingsBalanceBeforeGrowth = rollingBalances.savings;

  savings.withdrawals = withdrawalsBySource.savingsAccount;
  savings.extraWithdrawals = additionalSavingsWithdrawal;
  savings.balanceSubjectToInterest = savingsBalanceBeforeGrowth;
  savings.interestEarned = rollingBalances.savings * inputs.retSavings; // Interest on starting balance before growth
  savings.overageDeposit = Math.max(
    0,
    totalNetIncome - spendingTarget - taxFreeIncomeAdjustment
  );
  savings.taxFreeIncomeDeposit = taxFreeIncomeAdjustment;
  savings.regularDeposit = 0; // No regular deposits in retirement
  savings.endingBalance = rollingBalances.savings; // Will be updated after growth

  result.savings = savings;

  // Apply conservative growth: interest is calculated on savings balance prior to any
  // deposits due to tax-free income adjustments or overage deposits
  const savingsInterestEarnedForTheYear =
    rollingBalances.savings * inputs.retSavings;

  // if (DUMP_TO_CONSOLE) {
  //   debugger;
  // }
  // Track taxable interest earned for reporting purposes and next year's taxes
  rollingBalances.taxableInterestEarned = savingsInterestEarnedForTheYear;
  // Note: interest is calculated on the balance before growth and before deposits
  // (tax-free income adjustments and overage deposits happen at end of year)
  // but after withdrawals
  // (withdrawals have already been subtracted from balances.savings)
  rollingBalances.savings += savingsInterestEarnedForTheYear;

  // Add tax-free income adjustment to savings balance (not taxable)
  // as if it was deposited on 12/31 of the current year, after growth
  // This simulates the idea of receiving this income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this adjustment is not taxable since it's from tax-free income
  // (it has already been taxed when earned or is a gift/inheritance)
  rollingBalances.savings += taxFreeIncomeAdjustment;

  // If there's an overage (excess income beyond targeted "spend"), add it to savings
  // as if deposited on 12/31 of the current year, AFTER savings growth has been determined
  // This simulates the idea of saving any excess income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this overage is not taxable since it's from after-tax income
  // (it has already been taxed when earned)
  const overage = Math.max(0, totalNetIncome - spendingTarget);
  if (overage > 0) {
    rollingBalances.savings += overage;
    contributions.savings = (contributions.savings || 0) + overage;
  }

  // Apply normal growth to other account types (withdrawals happen at specific times)
  rollingBalances.traditional401k *= 1 + inputs.ret401k;
  rollingBalances.rothIra *= 1 + inputs.retRoth;

  // Note: taxableInterestEarned was calculated earlier before withdrawals

  const totalBal =
    rollingBalances.savings +
    rollingBalances.traditional401k +
    rollingBalances.rothIra;

  // For display purposes: allocate taxes proportionally (only to taxable income sources)
  const ssNetAdjusted =
    mySsBenefits.gross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (mySsBenefits.gross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : mySsBenefits.gross;
  const spouseSsNetAdjusted =
    spouseSsBenefits.gross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spouseSsBenefits.gross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spouseSsBenefits.gross;
  const penNetAdjusted =
    myPensionBenefits.gross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (myPensionBenefits.gross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : myPensionBenefits.gross;
  const spousePenNetAdjusted =
    spousePensionBenefits.gross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (spousePensionBenefits.gross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : spousePensionBenefits.gross;
  const withdrawalNetAdjusted =
    aggregatedWithdrawals.gross > 0 && grossIncomeFromBenefitsAndWithdrawals > 0
      ? (aggregatedWithdrawals.gross / grossIncomeFromBenefitsAndWithdrawals) *
        netIncomeFromTaxableSources
      : aggregatedWithdrawals.gross;

  // // Update final withdrawal gross to include savings
  // const finalWGrossTotal = finalWGross + additionalSavingsWithdrawal;
  // const finalWNetTotal = withdrawalNetAdjusted + additionalSavingsWithdrawal;

  // if (age == 72) {
  //   debugger;
  // }
  // Calculate individual withdrawal net amounts for breakdown

  const withdrawalBreakdown = {
    pretax401kGross: withdrawalsBySource.retirementAccount,
    pretax401kNet:
      aggregatedWithdrawals.gross > 0
        ? (withdrawalsBySource.retirementAccount /
            aggregatedWithdrawals.gross) *
          withdrawalNetAdjusted
        : 0,
    // savingsGross: withdrawalsBySource.savingsAccount,
    savingsNet: withdrawalsBySource.savingsAccount, // Savings withdrawals are not taxed
    rothGross: withdrawalsBySource.roth,
    rothNet:
      aggregatedWithdrawals.gross > 0
        ? (withdrawalsBySource.roth / aggregatedWithdrawals.gross) *
          withdrawalNetAdjusted
        : withdrawalsBySource.roth,
    totalGross: aggregatedWithdrawals.gross + additionalSavingsWithdrawal,
    totalNet: withdrawalNetAdjusted + additionalSavingsWithdrawal,
  };

  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Withdrawal Debug:");
    console.log(
      "- withdrawalsBySource.savingsAccount:",
      withdrawalsBySource.savingsAccount
    );
    console.log(
      "- withdrawalBreakdown.savingsNet:",
      withdrawalBreakdown.savingsNet
    );
    console.log(
      "- withdrawalBreakdown.totalNet:",
      withdrawalBreakdown.totalNet
    );
  }

  // For tax allocation display purposes
  const ssTaxAllocated =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? ((mySsBenefits.gross + spouseSsBenefits.gross) /
          grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;
  const penTaxAllocated =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? ((myPensionBenefits.gross + spousePensionBenefits.gross) /
          grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;
  withdrawals.taxes =
    grossIncomeFromBenefitsAndWithdrawals > 0
      ? (aggregatedWithdrawals.gross / grossIncomeFromBenefitsAndWithdrawals) *
        taxesThisYear
      : 0;

  // For display purposes: ssTaxes shows allocated SS taxes, otherTaxes shows non-SS taxes
  const ssTaxes = ssTaxAllocated;
  const otherTaxes = taxesThisYear - ssTaxAllocated;

  // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals
  const totalNonTaxableIncome =
    mySsNonTaxable +
    spouseSsNonTaxable +
    myPensionBenefits.nonTaxable +
    spousePensionBenefits.nonTaxable +
    withdrawalsBySource.savingsAccount +
    withdrawalsBySource.roth +
    taxFreeIncomeAdjustment;

  // Gross taxable income includes pre-tax withdrawals + taxable interest earned + taxable portions of benefits + taxable income adjustments
  // Ensure all components are valid numbers to prevent NaN
  // Calculate gross taxable income for display purposes using retirement.js results
  const grossPenGross = isNaN(myPensionBenefits.gross)
    ? 0
    : myPensionBenefits.gross;
  const grossSpousePenGross = isNaN(spousePensionBenefits.gross)
    ? 0
    : spousePensionBenefits.gross;
  const grossSsTaxable = totalSsTaxable; // Use total from retirement.js calculation
  const grossSpouseSsTaxable = 0; // Spouse SS included in totalSsTaxable
  const grossRetirementWithdrawals = isNaN(
    withdrawalsBySource.retirementAccount
  )
    ? 0
    : withdrawalsBySource.retirementAccount;
  const grossTaxableInterest = isNaN(savingsInterestEarnedForTheYear)
    ? 0
    : savingsInterestEarnedForTheYear;
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
    mySsNonTaxable +
    spouseSsNonTaxable +
    myPensionBenefits.nonTaxable +
    spousePensionBenefits.nonTaxable +
    grossTaxableIncome;

  const totalIncome =
    ssNetAdjusted +
    penNetAdjusted +
    spouseSsNetAdjusted +
    spousePenNetAdjusted +
    withdrawalNetAdjusted +
    savingsInterestEarnedForTheYear +
    taxableIncomeAdjustment +
    taxFreeIncomeAdjustment;

  // Effective tax rate calculation
  const effectiveTaxRate =
    totalTaxableIncomeAfterDeduction > 0
      ? (taxesThisYear / totalTaxableIncomeAfterDeduction) * 100
      : 0;

  if (DUMP_TO_CONSOLE) {
    console.log(
      `Age ${age}: Total taxes = ${taxesThisYear}, Taxable income = ${totalTaxableIncomeAfterDeduction}`
    );
  }

  // Calculate standard deduction for this year
  const standardDeduction = getStandardDeduction(
    inputs.filingStatus,
    retirementYear, // retirementYear is already the actual year (e.g., 2040)
    inputs.inflation
  );

  // Update result objects with calculated values
  ss.mySs = ssNetAdjusted;
  ss.mySsGross = mySsBenefits.gross;
  ss.spouseSs = spouseSsNetAdjusted;
  ss.spouseSsGross = spouseSsBenefits.gross;
  ss.taxes = ssTaxes;
  ss.provisionalIncome = provisionalIncome;

  pen.myPen = penNetAdjusted;
  pen.myPenGross = myPensionBenefits.gross;
  pen.spousePen = spousePenNetAdjusted;
  pen.spousePenGross = spousePensionBenefits.gross;

  taxes.total = taxesThisYear;
  taxes.otherTaxes = otherTaxes;
  taxes.penTaxes = penTaxAllocated;
  taxes.nonTaxableIncome = totalNonTaxableIncome;
  taxes.taxableIncome = totalTaxableIncomeAfterDeduction;
  taxes.taxableInterest = savingsInterestEarnedForTheYear;
  taxes.effectiveTaxRate = effectiveTaxRate;
  taxes.standardDeduction = standardDeduction;

  totals.totalIncome = totalIncome;
  totals.totalNetIncome = totalNetIncome;
  totals.totalGrossIncome = totalGrossIncome;

  bal.balSavings = rollingBalances.savings;
  bal.balPre = rollingBalances.traditional401k;
  bal.balRoth = rollingBalances.rothIra;
  bal.total =
    rollingBalances.savings +
    rollingBalances.traditional401k +
    rollingBalances.rothIra;

  // result.withdrawals.gross = finalWGrossTotal;
  // result.withdrawals.net = finalWNetTotal;
  withdrawals.retirementAccountGross = withdrawalsBySource.retirementAccount;
  withdrawals.savingsGross = withdrawalsBySource.savingsAccount;
  withdrawals.rothGross = withdrawalsBySource.roth;
  withdrawals.retirementAccountNet = withdrawalBreakdown.pretax401kNet;
  withdrawals.savingsRothNet =
    withdrawalBreakdown.savingsNet + withdrawalBreakdown.rothNet;

  const pensionBreakdown = {
    penGross: myPensionBenefits.gross,
    penTaxableAmount: myPensionBenefits.gross, // Pensions are typically fully taxable
    penNonTaxable: myPensionBenefits.nonTaxable || 0,
    penTaxes:
      penTaxAllocated *
      (myPensionBenefits.gross /
        (myPensionBenefits.gross + spousePensionBenefits.gross || 1)),
    pensionTaxRate:
      myPensionBenefits.gross > 0
        ? (penTaxAllocated *
            (myPensionBenefits.gross /
              (myPensionBenefits.gross + spousePensionBenefits.gross || 1))) /
          myPensionBenefits.gross
        : 0,
    penSpouseGross: spousePensionBenefits.gross,
    penSpouseTaxableAmount: spousePensionBenefits.gross, // Pensions are typically fully taxable
    penSpouseNonTaxable: spousePensionBenefits.nonTaxable || 0,
    penSpouseTaxes:
      penTaxAllocated *
      (spousePensionBenefits.gross /
        (myPensionBenefits.gross + spousePensionBenefits.gross || 1)),
    pensionSpouseTaxRate:
      spousePensionBenefits.gross > 0
        ? (penTaxAllocated *
            (spousePensionBenefits.gross /
              (myPensionBenefits.gross + spousePensionBenefits.gross || 1))) /
          spousePensionBenefits.gross
        : 0,
    calculationDetails: null,
  };

  const ssBreakdown = {
    mySsGross: mySsBenefits.gross,
    mySsTaxableAmount:
      totalSsTaxable *
      (mySsBenefits.gross / (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    mySsNonTaxable: mySsNonTaxable,
    mySsTaxes:
      ssTaxAllocated *
      (mySsBenefits.gross / (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    ssSpouseGross: spouseSsBenefits.gross,
    ssSpouseTaxableAmount:
      totalSsTaxable *
      (spouseSsBenefits.gross /
        (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    ssSpouseNonTaxable: spouseSsNonTaxable,
    ssSpouseTaxes:
      ssTaxAllocated *
      (spouseSsBenefits.gross /
        (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    calculationDetails: ssCalculationDetails, // Detailed calculation methodology from retirement.js
    otherTaxableIncome: taxCalculation
      ? taxCalculation.totalTaxableIncome || 0
      : 0,
  };

  const savingsBreakdown = {
    startingBalance: savingsStartBalance,
    withdrawals: actualSavingsWithdrawal,
    overageDeposit: overage,
    taxFreeIncomeDeposit: taxFreeIncomeAdjustment,
    balanceBeforeGrowth: savingsBalanceBeforeGrowth,
    interestEarnedAtYearEnd: savingsInterestEarnedForTheYear,
    endingBalance: rollingBalances.savings,
    growthRate: inputs.retSavings * 100,
  };

  // Update all the final values in the result object
  result.spend = totalSpend;

  result.withdrawals = withdrawals;
  result.ss = ss;
  result.pen = pen;
  result.taxes = taxes;
  result.standardDeduction = standardDeduction;
  result.totals = totals;
  result.bal = bal;
  result.total = totalBal;

  // Add breakdown data
  result.savingsBreakdown = savingsBreakdown;
  result.withdrawalBreakdown = withdrawalBreakdown;
  result.ssBreakdown = ssBreakdown;
  result.pensionBreakdown = pensionBreakdown;

  // Dump the result to the console
  if (DUMP_TO_CONSOLE) {
    console.log("Retirement Year Result:", result);
  }

  return result;
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
  const rollingBalances = {
    traditional401k: inputs.trad401k,
    rothIra: inputs.rothIRA,
    savings: inputs.savings,
    // taxableInterestEarned:
    //   inputs.savings - inputs.savings / (1 + inputs.retSavings), // Track taxable interest earned each year
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
      rollingBalances
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
      rollingBalances,
      benefitAmounts,
      spend
    );
    calculations.push(yearData);

    const totalBal = yearData.total;
    totalTaxes += yearData.taxes12345;
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
