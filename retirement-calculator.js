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
function buildWithdrawalProcessor(
  inputs = {},
  closuredCopyOfRunningBalances = {},
  closuredCopyOfFixedPortionOfTaxableIncome = {},
  year = 0,
  ssBenefits = 0
) {
  const withdrawalTracking = {
    retirementAccount: 0,
    savingsAccount: 0,
    roth: 0,
  };

  let incomeData = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
  };
  // Declare and initialize the result object at the top
  const result = {
    withdrawFromTargetedAccount: () => {},
    getWithdrawalsMade: () => withdrawalTracking,
    getIncomeData: () => incomeData,
  };

  // **************
  // Sanity checks
  // **************
  if (isNaN(closuredCopyOfFixedPortionOfTaxableIncome)) {
    console.error(
      `closuedCopyOfFixedPortionOfTaxableIncome is NaN.  This is a fatal error`
    );
    return result;
  }
  if (!closuredCopyOfRunningBalances) {
    console.error(
      `closuredCopyOfRunningBalances is null or undefined.  This is a fatal error`
    );
    return result;
  }
  // **************

  function withdrawFrom(kind, desiredSpend) {
    // **************
    // Sanity checks
    // **************
    // Validate kind parameter
    if (!kind || typeof kind !== "string") {
      console.error("Invalid withdrawal kind:", kind);
      return 0;
    }
    // verify kind is one of the expected values and error if not
    const validKinds = ["savings", "pretax", "roth"];
    if (!validKinds.includes(kind)) {
      console.error("Withdrawal target not defined or not supported:", kind);
      console.error("Expected one of:", validKinds.join(", "));
      return 0;
    }

    if (desiredSpend <= 0) return 0;

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
          result.savingsWithdrawal += v;
        };
        break;
      case "pretax":
        targetedAccount.getBalance = () =>
          closuredCopyOfRunningBalances.traditional401k;
        targetedAccount.setBalance = (v) => {
          result.gross401kWithdrawal += v;
          closuredCopyOfRunningBalances.traditional401k = v;
        };
        break;
      case "roth":
        targetedAccount.getBalance = () =>
          closuredCopyOfRunningBalances.rothIra;
        targetedAccount.setBalance = (v) => {
          closuredCopyOfRunningBalances.rothIra = v;
          result.grossRothWithdrawal += v;
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
      pensionAndMiscIncome: closuredCopyOfFixedPortionOfTaxableIncome,
      combinedSsGrossIncome: ssBenefits, // Include Social Security benefits in tax calculation
      standardDeduction,
      brackets: taxBrackets,
      precision: 0.01, // Precision for binary search convergence
    };

    // For pretax withdrawals, use sophisticated tax calculations from retirement.js
    let targetedAccountWithdrawalAmount, netIncome;
    if (kind === "pretax") {
      // Use binary search optimization from retirement.js for accurate withdrawal calculation
      // Construct the opts object that these functions expect
      // Add comprehensive NaN protection for otherTaxableIncome

      const ideal401kWithdrawal = determine401kWithdrawalToHitNetTargetOf(
        desiredSpend,
        opts
      );

      // Only take what is available in the 401k account
      targetedAccountWithdrawalAmount = Math.min(
        ideal401kWithdrawal.withdrawalNeeded,
        targetedAccount.getBalance()
      );

      // Calculate actual net using the sophisticated tax calculation
      incomeData = {
        ...calculate401kNetWhen401kGrossIs(
          targetedAccountWithdrawalAmount,
          opts
        ),
      };

      targetedAccount.setBalance(
        targetedAccount.getBalance() - targetedAccountWithdrawalAmount
      );

      withdrawalTracking.retirementAccount += targetedAccountWithdrawalAmount;

      closuredCopyOfFixedPortionOfTaxableIncome +=
        targetedAccountWithdrawalAmount;

      netIncome = incomeData.netIncome;
    } else {
      // Check if incomeData has already been calculated by a previous withdrawal
      const incomeDataHasBeenRecognized = incomeData.totalIncome > 0;
      const incomeDataHasNotYetBeenRecognized = !incomeDataHasBeenRecognized;

      // We use tempIncomeData here because it's possible savings can't cover the entire desiredSpend
      // When that happens, we only want to reduce the desiredSpend by the amount withdrawn from savings/Roth
      let tempIncomeData = {};

      if (incomeDataHasBeenRecognized) {
        // Reference previously recognized incomeData for calculating desired withdrawal
        tempIncomeData = {
          ...incomeData,
        };
      } else {
        // Estimate incomeData with $0 401k withdrawal to determine current net income
        tempIncomeData = {
          ...calculate401kNetWhen401kGrossIs(0, opts),
        };
      }

      // Determine how much to withdraw to meet the desired spend
      targetedAccountWithdrawalAmount = Math.min(
        desiredSpend - tempIncomeData.netIncome,
        targetedAccount.getBalance()
      );

      if (kind === "savings") {
        withdrawalTracking.savingsAccount += targetedAccountWithdrawalAmount;
      }
      if (kind === "roth") {
        withdrawalTracking.roth += targetedAccountWithdrawalAmount;
      }

      // Reduce the account balance by the net received amount
      targetedAccount.setBalance(
        targetedAccount.getBalance() - targetedAccountWithdrawalAmount
      );

      let remainingSpendNeeded = desiredSpend - targetedAccountWithdrawalAmount;

      // Try to zero out the remaining spend needed with net income if it hasn't been recognized yet
      if (incomeDataHasNotYetBeenRecognized) {
        remainingSpendNeeded -= tempIncomeData.netIncome;
      }

      // If the remaining needed is not yet zero, don't include the incomeData yet
      if (remainingSpendNeeded > 0) {
        // Only reduce the remaining spend need by the amount actually withdrawn
        remainingSpendNeeded = desiredSpend - targetedAccountWithdrawalAmount;
      } else {
        // Net income + savings/Roth covered the entire desired spend
        if (incomeDataHasNotYetBeenRecognized) {
          // Store the incomeData only if it hasn't been recognized yet
          incomeData = { ...tempIncomeData };
        }
      }

      return remainingSpendNeeded;
    }
  }

  // Populate the result object
  result.withdrawFromTargetedAccount = withdrawFrom;

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
  const withdrawalFunctions = buildWithdrawalProcessor(
    inputs,
    rollingBalances,
    fixedPortionOfTaxableIncome,
    retirementYear,
    mySsBenefits.gross + spouseSsBenefits.gross // Pass SS benefits to withdrawal functions
  );

  // At this point we have gross income from pensions and taxable interest,
  // and we know the fixed portion of taxable income
  // We need to withdraw enough from accounts to meet the totalSpend need after taxes
  // We will use the withdrawal functions to handle tax calculations and account balance updates
  {
    let remainingSpendNeeded = Math.max(0, totalSpend);

    for (const k of inputs.order) {
      if (remainingSpendNeeded <= 0) break;

      remainingSpendNeeded = withdrawalFunctions.withdrawFromTargetedAccount(
        k,
        remainingSpendNeeded
      );
    }
  }

  // Get withdrawal breakdown and tax information from sophisticated retirement.js functions
  const withdrawalsBySource = withdrawalFunctions.getWithdrawalsMade();

  debugger;

  let incomeFigures = {
    ...withdrawalFunctions.getIncomeData(),
  };

  // Extract tax information from retirement.js calculations
  let taxesThisYear = incomeFigures.tax;
  let totalTaxableIncomeAfterDeduction = incomeFigures.taxableIncome;
  let totalSsTaxable = incomeFigures.ssBreakdown.taxablePortion;
  let provisionalIncome = incomeFigures.ssBreakdown.provisionalIncome;
  let ssCalculationDetails = incomeFigures.ssBreakdown.calculationDetails;

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

  // Calculate gross and net income from taxable sources
  const grossTaxableIncomeFromAllTaxableSources =
    mySsBenefits.gross +
    spouseSsBenefits.gross +
    myPensionBenefits.gross +
    spousePensionBenefits.gross +
    withdrawalsBySource.retirementAccount +
    rmdAmount;
  const netIncomeFromTaxableSources =
    grossTaxableIncomeFromAllTaxableSources - taxesThisYear;

  // Calculate total net income
  const totalNetIncome = (
    netIncomeFromTaxableSources + withdrawalsBySource.savingsAccount
  ).round(0);

  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Net Income Debug:");
    console.log("- netIncomeFromTaxableSources:", netIncomeFromTaxableSources);
    console.log("- totalNetIncome:", totalNetIncome);
    console.log("- spendingTarget:", totalSpend);
  }

  // Update final withdrawal amounts to include any additional savings withdrawal
  const totalWithdrawals =
    withdrawalsBySource.savingsAccount +
    withdrawalsBySource.roth +
    withdrawalsBySource.retirementAccount;

  // Calculate balance before growth (after all deposits/withdrawals)
  const savingsBalanceBeforeGrowth = rollingBalances.savings;

  savings.withdrawals = withdrawalsBySource.savingsAccount;
  // savings.extraWithdrawals = additionalSavingsWithdrawal;
  savings.balanceSubjectToInterest =
    savings.startingBalance - savings.withdrawals; // Before growth
  savings.interestEarned = savings.balanceSubjectToInterest * inputs.retSavings; // Interest on starting balance before growth
  savings.taxFreeIncomeDeposit = taxFreeIncomeAdjustment;
  // overageDeposit is whatever is left after spending need is met
  savings.overageDeposit = Math.max(
    0,
    totalNetIncome - totalSpend - taxFreeIncomeAdjustment
  );
  savings.regularDeposit = 0; // No regular deposits in retirement
  savings.endingBalance =
    savings.startingBalance -
    savings.withdrawals +
    savings.interestEarned +
    savings.taxFreeIncomeDeposit +
    savings.overageDeposit; // Will be updated after growth

  result.savings = savings;

  // if (DUMP_TO_CONSOLE) {
  //   debugger;
  // }
  // Track taxable interest earned for reporting purposes and next year's taxes
  rollingBalances.taxableInterestEarned = savings.interestEarned;

  // Note: interest is calculated on the balance before growth and before deposits
  // (tax-free income adjustments and overage deposits happen at end of year)
  // but after withdrawals
  // (withdrawals have already been subtracted from balances.savings)
  rollingBalances.savings += savings.interestEarned;

  // Add tax-free income adjustment to savings balance (not taxable)
  // as if it was deposited on 12/31 of the current year, after growth
  // This simulates the idea of receiving this income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this adjustment is not taxable since it's from tax-free income
  // (it has already been taxed when earned or is a gift/inheritance)
  rollingBalances.savings += savings.taxFreeIncomeDeposit;

  // If there's an overage (excess income beyond targeted "spend"), add it to savings
  // as if deposited on 12/31 of the current year, AFTER savings growth has been determined
  // This simulates the idea of saving any excess income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this overage is not taxable since it's from after-tax income
  // (it has already been taxed when earned)
  const overage = Math.max(0, totalNetIncome - totalSpend);
  if (overage > 0) {
    rollingBalances.savings += overage;
    contributions.savings += overage;
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
  const mySsNetIncome =
    mySsBenefits.gross > 0 && grossTaxableIncomeFromAllTaxableSources > 0
      ? (mySsBenefits.gross / grossTaxableIncomeFromAllTaxableSources) *
        netIncomeFromTaxableSources
      : 0;

  const spouseSsNetIncome =
    spouseSsBenefits.gross > 0 && grossTaxableIncomeFromAllTaxableSources > 0
      ? (spouseSsBenefits.gross / grossTaxableIncomeFromAllTaxableSources) *
        netIncomeFromTaxableSources
      : 0;
  const penNetAdjusted =
    myPensionBenefits.gross > 0 && grossTaxableIncomeFromAllTaxableSources > 0
      ? (myPensionBenefits.gross / grossTaxableIncomeFromAllTaxableSources) *
        netIncomeFromTaxableSources
      : 0;
  const spousePenNetAdjusted =
    spousePensionBenefits.gross > 0 &&
    grossTaxableIncomeFromAllTaxableSources > 0
      ? (spousePensionBenefits.gross /
          grossTaxableIncomeFromAllTaxableSources) *
        netIncomeFromTaxableSources
      : 0;
  const retirementAccountNetAdjusted =
    withdrawalsBySource.retirementAccount + rmdAmount > 0 &&
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((withdrawalsBySource.retirementAccount + rmdAmount) /
          grossTaxableIncomeFromAllTaxableSources) *
        netIncomeFromTaxableSources
      : 0;

  // // Update final withdrawal gross to include savings
  // const finalWGrossTotal = finalWGross + additionalSavingsWithdrawal;
  // const finalWNetTotal = withdrawalNetAdjusted + additionalSavingsWithdrawal;

  // if (age == 72) {
  //   debugger;
  // }
  // Calculate individual withdrawal net amounts for breakdown

  const withdrawalBreakdown = {
    pretax401kGross: withdrawalsBySource.retirementAccount + rmdAmountx,
    pretax401kNet:
      aggregatedWithdrawals.gross > 0
        ? (withdrawalsBySource.retirementAccount /
            aggregatedWithdrawals.gross) *
          retirementAccountNetAdjusted
        : 0,
    // savingsGross: withdrawalsBySource.savingsAccount,
    savingsNet: withdrawalsBySource.savingsAccount, // Savings withdrawals are not taxed
    rothGross: withdrawalsBySource.roth,
    rothNet:
      aggregatedWithdrawals.gross > 0
        ? (withdrawalsBySource.roth / aggregatedWithdrawals.gross) *
          retirementAccountNetAdjusted
        : withdrawalsBySource.roth,
    totalGross: aggregatedWithdrawals.gross + additionalSavingsWithdrawal,
    totalNet: retirementAccountNetAdjusted + additionalSavingsWithdrawal,
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
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((mySsBenefits.gross + spouseSsBenefits.gross) /
          grossTaxableIncomeFromAllTaxableSources) *
        taxesThisYear
      : 0;
  const penTaxAllocated =
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((myPensionBenefits.gross + spousePensionBenefits.gross) /
          grossTaxableIncomeFromAllTaxableSources) *
        taxesThisYear
      : 0;
  withdrawals.taxes =
    grossTaxableIncomeFromAllTaxableSources > 0
      ? (aggregatedWithdrawals.gross /
          grossTaxableIncomeFromAllTaxableSources) *
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
  const grossPenGross = myPensionBenefits.gross;
  const grossSpousePenGross = spousePensionBenefits.gross;
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
    mySsNetIncome +
    penNetAdjusted +
    spouseSsNetIncome +
    spousePenNetAdjusted +
    retirementAccountNetAdjusted +
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
  ss.mySs = mySsNetIncome;
  ss.mySsGross = mySsBenefits.gross;
  ss.spouseSs = spouseSsNetIncome;
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
    otherTaxableIncome: incomeFigures
      ? incomeFigures.totalTaxableIncome || 0
      : 0,
  };

  const savingsBreakdown = {
    startingBalance: savingsStartBalance,
    withdrawals: withdrawalsBySource.savingsAccount,
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
