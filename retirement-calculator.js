// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.asCurrency = function () {
  return this.round(2);
};

Object.defineProperty(Object.prototype, "dumpToConsole", {
  value: function (title, depth = 0) {
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      const header = title || this._description || "Object Dump";
      console.log(`${header}:`);
    }

    if (Array.isArray(this)) {
      this.forEach((val, i) => {
        if (val && typeof val === "object") {
          console.log(`${indent}- [${i}]`);
          val.dumpToConsole(null, depth + 1);
        } else {
          console.log(`${indent}- [${i}] ${val}`);
        }
      });
      return;
    }

    for (const [key, value] of Object.entries(this)) {
      if (typeof value === "function") {
        try {
          console.log(`${indent}- ${key.padEnd(25)} ${value.call(this)}`);
        } catch {
          console.log(`${indent}- ${key.padEnd(25)} [function]`);
        }
      } else if (value && typeof value === "object") {
        console.log(`${indent}- ${key}:`);
        value.dumpToConsole(null, depth + 1);
      } else if (key === "_description") {
        // Skip _description at all levels
      } else {
        console.log(`${indent}- ${key.padEnd(25)} ${value}`);
      }
    }
  },
  enumerable: false,
});

function dedent(strings, ...values) {
  const raw = String.raw({ raw: strings }, ...values);

  // Find minimum indentation
  const lines = raw.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const indent = Math.min(
    ...nonEmpty.map((line) => line.match(/^(\s*)/)[0].length)
  );

  // Remove that indentation from every line
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}

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
function calculateTaxableIncome(adjustedGrossIncome, standardDeduction) {
  return Math.max(0, adjustedGrossIncome - standardDeduction);
}

// Wrapper for federal tax calculation using retirement.js functions
function calculateFederalTax(
  taxableIncome,
  filingStatus = FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const taxBrackets = getTaxBrackets(filingStatus, year, inflationRate);
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
function calculateWorkingYearData(inputs, yearIndex, salary, rollingBalances) {
  // Declare and initialize the result object at the top
  const result = {
    _description: "",
    contributions: {},
    withdrawals: {},
    bal: {},
    pen: {},
    ss: {},
    savings: {},
    income: {},
    taxes: {},
    pensionBreakdown: {},
    spousePensionBreakdown: {},
    savingsBreakdown: {},
    ssBreakdown: {},
    spouseSsBreakdown: {},
  };

  const fiscalData = {
    _description: "Fiscal Year Data",
    inflationRate: inputs.inflation,
    filingStatus: inputs.filingStatus,
    retirementAccountRateOfReturn: inputs.ret401k,
    rothRateOfReturn: inputs.retRoth,

    taxYear: TAX_BASE_YEAR + yearIndex,
    yearIndex: yearIndex,
    spend: inputs.spendingToday.adjustedForInflation(
      inputs.inflation,
      yearIndex
    ),
    actualSavingsContribution: 0,
    desiredSavingsContribution: salary * inputs.taxablePct,
    determineActualSavingsContribution(netIncome) {
      if (!netIncome || isNaN(netIncome)) return this.actualSavingsContribution;

      this.actualSavingsContribution = Math.max(netIncome - this.spend, 0);
      return this.actualSavingsContribution;
    },
  };

  const demographics = {
    _description: "Demographics",
    age: inputs.currentAge + yearIndex,
    ssStartAge: inputs.ssStartAge,
    penStartAge: inputs.penStartAge,
    retirementYear:
      new Date().getFullYear() + inputs.totalWorkingYears + yearIndex,
    isRetired: true,
    isWorking: false,
    hasSpouse: inputs.hasSpouse,
    filingStatus: inputs.filingStatus,
    eligibleForSs() {
      return this.age >= this.ssStartAge;
    },
    hasPen() {
      return this.age >= this.penStartAge;
    },
  };

  const taxes = {
    _description: "Taxes",
    grossTaxableIncome: 0,
    federalTaxesOwned: 0,
    total: 0,
    otherTaxes: 0,
    penTaxes: 0,
    taxableIncomeAdjustment: 0,
    effectiveTaxRate: 0,
    standardDeduction: 0,
    determineEffectiveTaxRate(grossIncome) {
      if (!grossIncome || isNaN(grossIncome)) return this.effectiveTaxRate;

      this.effectiveTaxRate =
        grossIncome > 0 ? this.federalTaxesOwned / this.grossTaxableIncome : 0;

      return this.effectiveTaxRate;
    },
  };

  const income = {
    _description: "Income",
    wagesTipsAndCompensation: salary,
    otherTaxableIncomeAdjustments:
      getTaxableIncomeOverride(demographics.age) || 0,
    taxableInterestIncome: 0,
    taxFreeIncomeAdjustment: getTaxFreeIncomeOverride(demographics.age) || 0,
    rollingOverIntoSavings: 0,
    retirementAccountContributions: 0,
    rothIraContributions: 0,
    taxableIncome: 0,
    netIncome: 0,
    totalIncome: 0,
    spendableIncome: 0,
    allIncomeSources() {
      return (
        this.wagesTipsAndCompensation +
        this.otherTaxableIncomeAdjustments +
        this.taxFreeIncomeAdjustment +
        this.taxableInterestIncome
      );
    },
    grossIncome() {
      return (
        this.wagesTipsAndCompensation +
        this.otherTaxableIncomeAdjustments +
        this.taxableInterestIncome
      );
    },
    adjustedGrossIncome() {
      return this.grossIncome() - this.retirementAccountContributions;
    },
    determineNetIncome(taxesOwed) {
      if (taxesOwed) {
        this.netIncome = Math.max(this.grossIncome() - taxesOwed, 0);
        this.spendableIncome =
          this.netIncome +
          this.taxFreeIncomeAdjustment -
          this.rothIraContributions;
      }
      this.totalIncome = this.grossIncome();
      return this.netIncome;
    },
    spendableIncome() {
      return this.netIncome() + this.taxFreeIncomeAdjustment;
    },
  };

  const balances = {
    _description: "Account Balances",
    savings: 0,
    traditional401k: 0,
    rothIra: 0,
    total() {
      return this.savings + this.traditional401k + this.rothIra;
    },
  };

  const pen = {
    _description: "Pension Benefits",
    myPen: 0,
    myPenGross: 0,
    spousePen: 0,
    spousePenGross: 0,
    taxes: 0,
  };

  const ss = {
    _description: "Social Security Benefits",
    mySs: 0,
    mySsGross: 0,
    spouseSs: 0,
    spouseSsGross: 0,
    taxes: 0,
    provisionalIncome: 0,
  };

  const totals = {
    _description: "Totals",
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
  };

  const contributions = {
    _description: "Contributions Breakdown",
    my401k: 0,
    myRoth: 0,
    spouse401k: 0,
    spouseRoth: 0,
    savings: 0,
    employerMatch: 0,
    total() {
      return (
        this.my401k +
        this.myRoth +
        this.spouse401k +
        this.spouseRoth +
        this.savings +
        this.employerMatch
      );
    },
  };

  const rothIra = {
    _description: "Roth IRA Breakdown",
    startingBalance: rollingBalances.rothIra,
    withdrawals: 0,
    contributions: 0,
    growthRate: inputs.retRoth,
    balanceSubjectToInterest() {
      return Math.max(0, this.startingBalance - this.withdrawals);
    },
    // these deposits do not contribute to interest calculation for the year
    earnedInterest() {
      return this.balanceSubjectToInterest() * this.growthRate;
    },
    endingBalance() {
      return (
        this.balanceSubjectToInterest() +
        this.contributions +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  const retirementAccount = {
    _description: "401(k) Breakdown",
    startingBalance: rollingBalances.traditional401k,
    withdrawals: 0,
    contributions: 0,
    growthRate: inputs.ret401k,
    balanceSubjectToInterest() {
      return Math.max(0, this.startingBalance - this.withdrawals);
    },
    earnedInterest() {
      return this.balanceSubjectToInterest() * this.growthRate;
    },
    endingBalance() {
      return (
        this.balanceSubjectToInterest() +
        this.contributions +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  const savings = {
    _description: "Savings Account Breakdown",
    startingBalance: rollingBalances.savings,
    withdrawals: 0,
    extraWithdrawals: 0,
    deposits: 0,
    taxFreeIncomeDeposit: 0,
    regularDeposit: 0,
    growthRate: inputs.retSavings,
    balanceSubjectToInterest() {
      return Math.max(
        0,
        this.startingBalance - this.withdrawals - this.extraWithdrawals
      );
    },
    // theses deposits do not contribute to interest calculation for the year
    earnedInterest() {
      return this.balanceSubjectToInterest() * this.growthRate;
    },
    endingBalance() {
      return (
        this.balanceSubjectToInterest() +
        this.deposits +
        this.taxFreeIncomeDeposit +
        this.regularDeposit +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  const employmentInfo = {
    _description: "Employment Info",
    isEmployed: yearIndex < inputs.totalWorkingYears,
    salary: salary,
    pretaxContributionPercentage: inputs.pretaxPct,
    rothContributionPercentage: inputs.rothPct,
    employeeMatchCap: inputs.matchCap,
    matchRate: inputs.matchRate,
    desired401kContribution() {
      return this.salary * this.pretaxContributionPercentage;
    },
    desiredRothContribution() {
      return this.salary * this.rothContributionPercentage;
    },
    electiveScale() {
      let electiveLimit =
        EMPLOYEE_401K_LIMIT_2025 +
        (demographics.age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0);
      const totalDesiredContribution =
        this.desired401kContribution() + this.desiredRothContribution();
      let scale =
        totalDesiredContribution > 0
          ? Math.min(1, electiveLimit / totalDesiredContribution)
          : 1;
      return scale;
    },
    cap401kContribution() {
      return this.desired401kContribution() * this.electiveScale();
    },
    capRothContribution() {
      return this.desiredRothContribution() * this.electiveScale();
    },
    emp401kContributionPct() {
      return this.salary > 0 ? this.cap401kContribution() / this.salary : 0;
    },
    employer401kMatch() {
      return (
        Math.min(this.emp401kContributionPct(), this.employeeMatchCap) *
        this.salary *
        this.matchRate
      );
    },
  };

  // **************
  // Calculations
  // **************

  // debugger;

  retirementAccount.contributions = employmentInfo.cap401kContribution();
  rothIra.contributions = employmentInfo.capRothContribution();

  income.retirementAccountContributions = retirementAccount.contributions;
  income.rothIraContributions = rothIra.contributions;
  income.taxableInterestIncome = savings.earnedInterest();

  taxes.grossTaxableIncome = income.adjustedGrossIncome();

  taxes.standardDeduction = getStandardDeduction(
    demographics.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );

  income.taxableIncome = calculateTaxableIncome(
    income.adjustedGrossIncome(),
    taxes.standardDeduction
  );

  taxes.federalTaxesOwned = calculateFederalTax(
    income.taxableIncome,
    fiscalData.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );
  taxes.determineEffectiveTaxRate(income.grossIncome());

  income.determineNetIncome(taxes.federalTaxesOwned);

  // Money not spent from income goes into savings
  fiscalData.determineActualSavingsContribution(income.netIncome);
  savings.deposits += fiscalData.actualSavingsContribution;

  rothIra.contributions = employmentInfo.capRothContribution();
  retirementAccount.contributions = employmentInfo.cap401kContribution();
  // debugger;
  rollingBalances.traditional401k = retirementAccount.endingBalance();
  rollingBalances.rothIra = rothIra.endingBalance();
  rollingBalances.savings = savings.endingBalance();

  const withdrawals = {
    retirementAccount: retirementAccount.withdrawals,
    savings: savings.withdrawals,
    rothIra: rothIra.withdrawals,
    total() {
      return this.retirementAccount + this.savings + this.rothIra;
    },
  };

  balances.savings = rollingBalances.savings;
  balances.traditional401k = rollingBalances.traditional401k;
  balances.rothIra = rollingBalances.rothIra;

  totals.totalIncome = income.allIncomeSources();
  totals.totalNetIncome =
    income.spendableIncome + income.taxFreeIncomeAdjustment;
  totals.totalGrossIncome = income.grossIncome();

  // Update all the final values in the result object
  contributions.my401k = employmentInfo.cap401kContribution();
  contributions.myRoth = employmentInfo.capRothContribution();
  contributions.savings = savings.deposits;
  contributions.employerMatch = employmentInfo.employer401kMatch();

  // Note: Spouse contributions not handled in working year calculations

  result.contributions = contributions;
  result.ss = ss;
  result.pen = pen;
  result.withdrawals = withdrawals;
  result.taxes = taxes;
  result.totals = totals;
  result.bal = balances;
  result.income = income;
  result.demographics = demographics;
  result.employmentInfo = employmentInfo;
  result.roth = rothIra;
  result.savings = savings;
  result.ret = retirementAccount;
  result.fiscalData = fiscalData;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: savings.startingBalance,
    withdrawals: savings.withdrawals,
    deposits: savings.deposits,
    taxFreeIncomeDeposit: income.taxFreeIncomeAdjustment,
    interestEarned: savings.earnedInterest(),
    endingBalance: savings.endingBalance(),
    growthRate: savings.growthRate * 100,
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

  result._description = `
-----------------------------------------------
--- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
-----------------------------------------------`;

  debugger;
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
  mySsBenefitsGross = 0,
  spouseSsBenefitsGross = 0
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
      mySsBenefitsGross: mySsBenefitsGross,
      spouseSsBenefitsGross: spouseSsBenefitsGross,
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
  estimatedAnnualSpending
) {
  // kill the logger for now
  LOG_LEVEL = 0;

  // Declare and initialize the result object at the top
  const result = {
    _description: `Retirement Year ${yearIndex + 1}`,
    salary: 0,
    contrib: 0,

    demographics: {},
    expenditures: {},
    bal: {},
    contributions: {},
    pen: {},
    savings: {},
    ss: {},
    taxes: {},
    totals: {},
    withdrawals: {},
    myPensionBenefits: {},
    spousePensionBenefits: {},
    mySsBenefits: {},
    spouseSsBenefits: {},

    savingsBreakdown: {},
    withdrawalBreakdown: {},
    ssBreakdown: {},
    pensionBreakdown: {},
  };

  const demographics = {
    yearIndex: yearIndex,
    age: inputs.retireAge + yearIndex,
    ssStartAge: inputs.ssStartAge,
    penStartAge: inputs.penStartAge,
    retirementYear:
      new Date().getFullYear() + inputs.totalWorkingYears + yearIndex,
    isRetired: true,
    isWorking: false,
    hasSpouse: inputs.hasSpouse,
    filingStatus: inputs.filingStatus,
    eligibleForSs() {
      return this.age >= this.ssStartAge;
    },
    hasPen() {
      return this.age >= this.penStartAge;
    },
    dump() {
      console.log(
        `-----------------------------------------------\n--- Retirement Year ${
          this.yearIndex + 1
        } (Age ${this.age}) (Year ${
          this.retirementYear
        }) ---\n-----------------------------------------------`
      );
    },
  };

  const expenditures = {
    _description: "Expenditures Breakdown",
    estimated: estimatedAnnualSpending,
    additionalSpending: 0,
    total() {
      return this.estimated + this.additionalSpending;
    },
  };

  const taxes = {
    _description: "Taxes Breakdown",
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
    _description: "Social Security Benefits Breakdown",
    mySs: 0,
    mySsGross: 0,
    spouseSs: 0,
    spouseSsGross: 0,
    taxes: 0,
    provisionalIncome: 0,
  };

  const pen = {
    _description: "Pension Benefits Breakdown",
    myPen: 0,
    myPenGross: 0,
    spousePen: 0,
    spousePenGross: 0,
    taxes: 0,
  };

  const totals = {
    _description: "Totals Breakdown",
    totalIncome: 0,
    totalNetIncome: 0,
    totalGrossIncome: 0,
  };

  const balances = {
    _description: "Account Balances",
    savings: 0,
    traditional401k: 0,
    rothIra: 0,
    total() {
      return this.savings + this.traditional401k + this.rothIra;
    },
  };

  const contributions = {
    _description: "Contributions Breakdown",
    my401k: 0,
    myRoth: 0,
    spouse401k: 0,
    spouseRoth: 0,
    savings: 0,
    employerMatch: 0,
    total() {
      return (
        this.my401k +
        this.myRoth +
        this.spouse401k +
        this.spouseRoth +
        this.savings +
        this.employerMatch
      );
    },
  };

  const savings = {
    _description: "Savings Breakdown",
    startingBalance: rollingBalances.savings,
    withdrawals: 0,
    extraWithdrawals: 0,
    balanceSubjectToInterest() {
      return Math.max(
        0,
        this.startingBalance - this.withdrawals - this.extraWithdrawals
      );
    },
    // theses deposits do not contribute to interest calculation for the year
    overageDeposit: 0,
    taxFreeIncomeDeposit: 0,
    regularDeposit: 0,
    growthRate: inputs.retSavings,
    earnedInterest() {
      return this.balanceSubjectToInterest() * this.growthRate;
    },
    endingBalance() {
      return (
        this.balanceSubjectToInterest() +
        this.overageDeposit +
        this.taxFreeIncomeDeposit +
        this.regularDeposit +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  const withdrawals = {
    _description: "Withdrawals Breakdown",
    savingsRothNet: 0,
    gross: 0,
    net: 0,
    retirementAccountGross: 0,
    retirementAccountNet: 0,
    rmd: 0,
    savingsGross: 0,
    rothGross: 0,
    taxes: 0,
  };

  const mySsBenefits = {
    _description: "Social Security Benefits Breakdown",
    gross: demographics.eligibleForSs ? benefitAmounts.ssAnnual : 0,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const myPensionBenefits = {
    _description: "Pension Benefits Breakdown",
    gross: demographics.hasPen() ? benefitAmounts.penAnnual : 0,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const spouseBenefitInputs = extractSpouseBenefitInputs(
    inputs,
    demographics.age,
    benefitAmounts
  );

  const spouseSsBenefits = {
    _description: "Spouse Social Security Benefits Breakdown",
    gross: spouseBenefitInputs.ssGross,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  const spousePensionBenefits = {
    _description: "Spouse Pension Benefits Breakdown",
    gross: spouseBenefitInputs.penGross,
    net: 0,
    taxable: 0,
    nonTaxable: 0,
    taxes: 0,
    taxRate: 0,
  };

  result.bal = balances;
  result.contributions = contributions;
  result.pen = pen;
  result.savings = savings;
  result.ss = ss;
  result.withdrawals = withdrawals;
  result.taxes = taxes;
  result.totals = totals;
  result.mySsBenefits = mySsBenefits;
  result.spouseSsBenefits = spouseSsBenefits;
  result.myPensionBenefits = myPensionBenefits;
  result.spousePensionBenefits = spousePensionBenefits;

  debugger;

  result.dumpToConsole();

  // For debugging: Dump detailed logs for specific ages
  // Example: Set age to 200 to never log, or to a specific age like 70 to log that year

  const DUMP_TO_CONSOLE = demographics.age == 200;

  if (DUMP_TO_CONSOLE) {
    demographics.dumpToConsole();
  }

  // Get income adjustments for this age
  const taxableIncomeAdjustment =
    getTaxableIncomeOverride(demographics.age) || 0;
  const taxFreeIncomeAdjustment =
    getTaxFreeIncomeOverride(demographics.age) || 0;

  // Get additinoal spending need
  let additionalSpending = getSpendingOverride(demographics.age);
  if (additionalSpending === null) {
    setSpendingFieldValue(demographics.age, expenditures.estimated);
    additionalSpending = 0;
  }
  // Add the additional spend to spend and track as spend.total()
  expenditures.additionalSpending = additionalSpending;

  // Treat RMDs as a fixed income source
  withdrawals.rmd =
    inputs.useRMD && demographics.age >= 73
      ? calculateRMD(demographics.age, rollingBalances)
      : 0;

  const grossIncome = {
    _description: "Gross Income Breakdown",
    myPension: myPensionBenefits.gross,
    spousePension: spousePensionBenefits.gross,
    taxableInterest: savings.earnedInterest(),
    taxableIncomeAdjustment: taxableIncomeAdjustment,
    rmd: withdrawals.rmd,
    fixedPortion() {
      return (
        this.myPension +
        this.spousePension +
        this.taxableInterest +
        this.taxableIncomeAdjustment +
        this.rmd
      );
    },
  };

  // Build complete taxable income picture for withdrawal functions

  // debugger;
  // if (DUMP_TO_CONSOLE) {
  //   console.log("Age", age, "Spending Need Debug:");
  //   console.log("- spend".padEnd(30), expenditures.estimated);
  //   console.log(
  //     "- additionalSpending".padEnd(30),
  //     expenditures.additionalSpending
  //   );
  //   console.log("- totalNeedNet".padEnd(30), expenditures.total());
  //   console.log("- rmd".padEnd(30), withdrawals.rmd);
  //   console.log(
  //     "- taxableIncomeAdjustment".padEnd(30),
  //     taxableIncomeAdjustment
  //   );
  //   console.log("- taxableInterest".padEnd(30), taxableInterest);
  //   console.log(
  //     "- fixedPortionOfTaxableIncome".padEnd(30),
  //     grossIncome.fixedPortion()
  //   );
  // }

  const withdrawalFunctions = buildWithdrawalProcessor(
    inputs,
    rollingBalances,
    grossIncome.fixedPortion(),
    demographics.retirementYear,
    mySsBenefits.gross,
    spouseSsBenefits.gross // Pass SS benefits to withdrawal functions
  );

  debugger;
  // At this point we have gross income from pensions and taxable interest,
  // and we know the fixed portion of taxable income
  // We need to withdraw enough from accounts to meet the spend.total() need after taxes
  // We will use the withdrawal functions to handle tax calculations and account balance updates
  let remainingSpendNeeded = Math.max(0, expenditures.total());
  for (const k of inputs.order) {
    if (remainingSpendNeeded <= 0) break;

    remainingSpendNeeded = withdrawalFunctions.withdrawFromTargetedAccount(
      k,
      remainingSpendNeeded
    );
  }

  // Get withdrawal breakdown and tax information from sophisticated retirement.js functions
  const withdrawalsBySource = withdrawalFunctions.getWithdrawalsMade();

  let incomeFigures = {
    ...withdrawalFunctions.getIncomeData(),
  };

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js
  const mySsNonTaxable =
    mySsBenefits.gross -
    (incomeFigures.ssBreakdown.taxablePortion * mySsBenefits.gross) /
      (mySsBenefits.gross + spouseSsBenefits.gross || 1);

  const spouseSsNonTaxable =
    spouseSsBenefits.gross -
    (incomeFigures.ssBreakdown.taxablePortion * spouseSsBenefits.gross) /
      (mySsBenefits.gross + spouseSsBenefits.gross || 1);

  // Calculate gross and net income from taxable sources
  const grossTaxableIncomeFromAllTaxableSources =
    mySsBenefits.gross +
    spouseSsBenefits.gross +
    myPensionBenefits.gross +
    spousePensionBenefits.gross +
    withdrawalsBySource.retirementAccount +
    withdrawals.rmd +
    taxableInterest;
  const netIncomeFromTaxableSources =
    grossTaxableIncomeFromAllTaxableSources - incomeFigures.tax;

  // Calculate total net income
  const totalNetIncome = (
    netIncomeFromTaxableSources + withdrawalsBySource.savingsAccount
  ).round(0);

  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Net Income Debug:");
    console.log("- netIncomeFromTaxableSources:", netIncomeFromTaxableSources);
    console.log("- totalNetIncome:", totalNetIncome);
    console.log("- spendingTarget:", expenditures.total());
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
    totalNetIncome - expenditures.total() - taxFreeIncomeAdjustment
  );
  savings.regularDeposit = 0; // No regular deposits in retirement
  savings.endingBalance =
    savings.startingBalance -
    savings.withdrawals +
    savings.interestEarned +
    savings.taxFreeIncomeDeposit +
    savings.overageDeposit; // Will be updated after growth

  result.savings = savings;

  // Track taxable interest earned for reporting purposes and next year's taxes
  rollingBalances.income.taxableInterestIncome = savings.interestEarned;
  rollingBalances.savings += savings.interestEarned;
  rollingBalances.savings += savings.taxFreeIncomeDeposit;

  // If there's an overage (excess income beyond targeted "spend"), add it to savings
  // as if deposited on 12/31 of the current year, AFTER savings growth has been determined
  // This simulates the idea of saving any excess income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this overage is not taxable since it's from after-tax income
  // (it has already been taxed when earned)
  const overage = Math.max(0, totalNetIncome - expenditures.total());
  if (overage > 0) {
    rollingBalances.savings += overage;
    contributions.savings += overage;
    savings.overageDeposit += overage;
  }

  // Apply normal growth to other account types (withdrawals happen at specific times)
  rollingBalances.traditional401k *= 1 + inputs.ret401k;
  rollingBalances.rothIra *= 1 + inputs.retRoth;

  // Note: income.taxableInterestIncome was calculated earlier before withdrawals

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
    withdrawalsBySource.retirementAccount + withdrawals.rmd > 0 &&
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((withdrawalsBySource.retirementAccount + withdrawals.rmd) /
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
    pretax401kGross: withdrawalsBySource.retirementAccount + withdrawals.rmd,
    pretax401kNet: retirementAccountNetAdjusted,
    // savingsGross: withdrawalsBySource.savingsAccount,
    savings: withdrawalsBySource.savingsAccount, // Savings withdrawals are not taxed
    roth: withdrawalsBySource.roth,
    totalNet:
      retirementAccountNetAdjusted +
      withdrawalsBySource.savingsAccount +
      withdrawalsBySource.roth,
  };

  if (DUMP_TO_CONSOLE) {
    console.log("Age", age, "Withdrawal Debug:");
    console.log(
      "- withdrawalsBySource.savingsAccount:",
      withdrawalsBySource.savingsAccount
    );
    console.log(
      "- withdrawalBreakdown.savingsNet:",
      withdrawalBreakdown.savings
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
        incomeFigures.tax
      : 0;
  const penTaxAllocated =
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((myPensionBenefits.gross + spousePensionBenefits.gross) /
          grossTaxableIncomeFromAllTaxableSources) *
        incomeFigures.tax
      : 0;
  withdrawals.taxes =
    grossTaxableIncomeFromAllTaxableSources > 0
      ? ((withdrawalBreakdown.pretax401kGross + withdrawals.rmd) /
          grossTaxableIncomeFromAllTaxableSources) *
        incomeFigures.tax
      : 0;

  // For display purposes: ssTaxes shows allocated SS taxes, otherTaxes shows non-SS taxes
  const ssTaxes = ssTaxAllocated;
  const otherTaxes = incomeFigures.tax - ssTaxAllocated;

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
  const grossSsTaxable = incomeFigures.ssBreakdown.taxablePortion; // Use total from retirement.js calculation
  const grossSpouseSsTaxable = 0; // Spouse SS included in incomeFigures.ssBreakdown.taxablePortion
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
    incomeFigures.taxableIncome > 0
      ? (incomeFigures.tax / incomeFigures.taxableIncome) * 100
      : 0;

  if (DUMP_TO_CONSOLE) {
    console.log(
      `Age ${age}: Total taxes = ${incomeFigures.tax}, Taxable income = ${incomeFigures.taxableIncome}`
    );
  }

  // Calculate standard deduction for this year
  const standardDeduction = getStandardDeduction(
    inputs.filingStatus,
    demographics.retirementYear, // retirementYear is already the actual year (e.g., 2040)
    inputs.inflation
  );

  // Update result objects with calculated values
  ss.mySs = mySsNetIncome;
  ss.mySsGross = mySsBenefits.gross;
  ss.spouseSs = spouseSsNetIncome;
  ss.spouseSsGross = spouseSsBenefits.gross;
  ss.taxes = ssTaxes;
  ss.incomeFigures.ssBreakdown.provisionalIncome =
    incomeFigures.ssBreakdown.provisionalIncome;

  pen.myPen = penNetAdjusted;
  pen.myPenGross = myPensionBenefits.gross;
  pen.spousePen = spousePenNetAdjusted;
  pen.spousePenGross = spousePensionBenefits.gross;

  taxes.total = incomeFigures.tax;
  taxes.otherTaxes = otherTaxes;
  taxes.penTaxes = penTaxAllocated;
  taxes.nonTaxableIncome = totalNonTaxableIncome;
  taxes.taxableIncome = incomeFigures.taxableIncome;
  taxes.taxableInterest = savingsInterestEarnedForTheYear;
  taxes.effectiveTaxRate = effectiveTaxRate;
  taxes.standardDeduction = standardDeduction;

  totals.totalIncome = totalIncome;
  totals.totalNetIncome = totalNetIncome;
  totals.totalGrossIncome = totalGrossIncome;

  balances.savings = rollingBalances.savings;
  balances.traditional401k = rollingBalances.traditional401k;
  balances.rothIra = rollingBalances.rothIra;

  // result.withdrawals.gross = finalWGrossTotal;
  // result.withdrawals.net = finalWNetTotal;
  withdrawals.retirementAccountGross = withdrawalsBySource.retirementAccount;
  withdrawals.savingsGross = withdrawalsBySource.savingsAccount;
  withdrawals.rothGross = withdrawalsBySource.roth;
  withdrawals.retirementAccountNet = withdrawalBreakdown.pretax401kNet;
  withdrawals.savingsRothNet =
    withdrawalBreakdown.savings + withdrawalBreakdown.rothNet;

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
    _description: "Social Security Benefits Breakdown",
    mySsGross: mySsBenefits.gross,
    mySsTaxableAmount:
      incomeFigures.ssBreakdown.taxablePortion *
      (mySsBenefits.gross / (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    mySsNonTaxable: mySsNonTaxable,
    mySsTaxes:
      ssTaxAllocated *
      (mySsBenefits.gross / (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    ssSpouseGross: spouseSsBenefits.gross,
    ssSpouseTaxableAmount:
      incomeFigures.ssBreakdown.taxablePortion *
      (spouseSsBenefits.gross /
        (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    ssSpouseNonTaxable: spouseSsNonTaxable,
    ssSpouseTaxes:
      ssTaxAllocated *
      (spouseSsBenefits.gross /
        (mySsBenefits.gross + spouseSsBenefits.gross || 1)),
    calculationDetails: incomeFigures.ssBreakdown.calculationDetails, // Detailed calculation methodology from retirement.js
    otherTaxableIncome: incomeFigures
      ? incomeFigures.totalTaxableIncome || 0
      : 0,
  };

  const savingsBreakdown = {
    _description: "Savings Breakdown",
    startingBalance: savings.startingBalance,
    withdrawals: savings.withdrawals,
    overageDeposit: 0,
    taxFreeIncomeDeposit: 0,
    growthRate: inputs.retSavings * 100,
    earnedInterest() {
      return (
        (this.startingBalance - this.withdrawals) * (this.growthRate / 100)
      );
    },
    endingBalance() {
      return (
        this.startingBalance -
        this.withdrawals +
        this.overageDeposit +
        this.taxFreeIncomeDeposit +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  savingsBreakdown.startingBalance = savingsBreakdown.startingBalance;
  savingsBreakdown.withdrawals = withdrawalsBySource.savingsAccount;
  savingsBreakdown.overageDeposit = savings.overageDeposit;
  savingsBreakdown.taxFreeIncomeDeposit = savings.taxFreeIncomeDeposit;
  savingsBreakdown.balanceBeforeGrowth = savingsBalanceBeforeGrowth;
  savingsBreakdown.interestEarnedAtYearEnd = savingsInterestEarnedForTheYear;
  savingsBreakdown.growthRate = inputs.retSavings * 100;

  // Update all the final values in the result object
  result.expenditures = expenditures.total();

  result.withdrawals = withdrawals;
  result.ss = ss;
  result.pen = pen;
  result.taxes = taxes;
  result.standardDeduction = standardDeduction;
  result.totals = totals;
  result.bal = balances;
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
    // income.taxableInterestIncome:
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
