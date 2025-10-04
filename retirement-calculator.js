// retirement-calculator.js

// Add Number prototype extensions needed by retirement.js functions

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
    constsJS_FILING_STATUS,
    retirementJS_determineFederalIncomeTax,
    retirementJS_getTaxBrackets,
    retirementJS_getStandardDeduction,
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
  filingStatus = constsJS_FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const taxBrackets = retirementJS_getTaxBrackets(
    filingStatus,
    year,
    inflationRate
  );
  return retirementJS_determineFederalIncomeTax(taxableIncome, taxBrackets);
}

// Required Minimum Distribution (RMD) calculation
// Based on IRS Uniform Lifetime Table for 2024+
function calculateRMD(useRmd, age, retirementAccountBalance) {
  if (!useRmd || age < 73 || retirementAccountBalance <= 0) return 0;

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

  return retirementAccountBalance / factor;
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

function determineQualifyingSpouseBenefits(inputs, age, benefitAmounts) {
  const spouseBenefits = {
    ssIncome: 0,
    pensionIncome: 0,
  };

  if (inputs.hasSpouse) {
    const spouseCurrentAge = inputs.spouseAge + (age - inputs.currentAge);
    const hasSpouseSS = spouseCurrentAge >= inputs.spouseSsStartAge;
    const hasSpousePen = spouseCurrentAge >= inputs.spousePenStartAge;

    spouseBenefits.ssIncome = hasSpouseSS ? benefitAmounts.spouseSsAnnual : 0;
    spouseBenefits.pensionIncome = hasSpousePen
      ? benefitAmounts.spousePenAnnual
      : 0;
  }

  return spouseBenefits;
}

/**
 * Calculate one year of accumulation phase (working years)
 */
function calculateWorkingYearData(inputs, yearIndex, salary, rollingBalances) {
  // Declare and initialize the result object at the top
  const result = {
    _description: "",
    demographics: {},
    fiscalData: {},
    totals: {},
    contributions: {},
    withdrawals: {},
    balances: {},
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
    federalTaxesOwed: 0,
    total: 0,
    otherTaxes: 0,
    penTaxes: 0,
    taxableIncomeAdjustment: 0,
    effectiveTaxRate: 0,
    standardDeduction: 0,
    determineEffectiveTaxRate(grossIncome) {
      if (!grossIncome || isNaN(grossIncome)) return this.effectiveTaxRate;

      this.effectiveTaxRate =
        grossIncome > 0 ? this.federalTaxesOwed / this.grossTaxableIncome : 0;

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
    taxesOwed: 0,
    getAllIncomeSources() {
      return (
        this.wagesTipsAndCompensation +
        this.otherTaxableIncomeAdjustments +
        this.taxFreeIncomeAdjustment +
        this.taxableInterestIncome
      );
    },
    getGrossTaxableIncome() {
      return (
        this.wagesTipsAndCompensation +
        this.otherTaxableIncomeAdjustments +
        this.taxableInterestIncome
      );
    },
    getAdjustedGrossIncome() {
      return this.getGrossTaxableIncome() - this.retirementAccountContributions;
    },
    getNetIncome() {
      return Math.max(this.getGrossTaxableIncome() - this.taxesOwed, 0);
    },
    getSpendableIncome() {
      return this.netIncome() + this.income.taxFreeIncomeAdjustment;
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
    grossTaxableIncome: 0,
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

  taxes.grossTaxableIncome = income.getAdjustedGrossIncome();

  taxes.standardDeduction = retirementJS_getStandardDeduction(
    demographics.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );

  income.taxableIncome = calculateTaxableIncome(
    income.getAdjustedGrossIncome(),
    taxes.standardDeduction
  );

  taxes.federalTaxesOwed = calculateFederalTax(
    income.taxableIncome,
    fiscalData.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );
  taxes.determineEffectiveTaxRate(income.getGrossTaxableIncome());

  income.taxesOwed = taxes.federalTaxesOwed;

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

  totals.totalIncome = income.getAllIncomeSources();
  totals.totalNetIncome = income.getNetIncome();
  totals.grossTaxableIncome = income.getGrossTaxableIncome();

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
  result.balances = balances;
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

  return result;
}

/**
 * Calculate a given retirement year with proper SS taxation based on total income
 */
function calculateRetirementYearData(
  inputs,
  yearIndex,
  rollingBalances,
  benefitAmounts
) {
  // kill the logger for now
  LOG_LEVEL = 0;

  // Declare and initialize the result object at the top
  const result = {
    _description: "",
    demographics: {},
    fiscalData: {},
    expenditures: {},
    balances: {},
    contributions: {},
    withdrawals: {},
    pen: {},
    savings: {},
    ss: {},
    income: {},
    taxes: {},
    totals: {},
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
    useRmd: inputs.useRMD,
    eligibleForSs() {
      return this.age >= this.ssStartAge;
    },
    hasPen() {
      return this.age >= this.penStartAge;
    },
    _description: `-----------------------------------------------\n--- Retirement Year ${
      this.yearIndex + 1
    } (Age ${this.age}) (Year ${
      this.retirementYear
    }) ---\n-----------------------------------------------`,
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
  };

  const expenditureTracker = {
    _description: "Expenditures Breakdown",
    budgeted: inputs.spendAtRetire,
    additionalSpending: getSpendingOverride(demographics.age),
    withdrawalsMade: {
      fromSavings: 0,
      from401k: 0,
      fromRoth: 0,
      total() {
        return this.fromSavings + this.from401k + this.fromRoth;
      },
    },
    depositsMade: {
      toSavings: 0,
      to401k: 0,
      toRoth: 0,
      total() {
        return this.toSavings + this.to401k + this.toRoth;
      },
    },
    totalBudgeted() {
      return this.budgeted + this.additionalSpending;
    },
    actualExpenditures() {
      return this.withdrawalsMade.total();
    },
    shortfall() {
      return Math.max(0, this.totalBudgeted() - this.actualExpenditures());
    },
  };

  // const pensionIncome = {
  //   _description: "Pension Benefits Breakdown",
  //   myPen: 0,
  //   myPenGross: 0,
  //   spousePen: 0,
  //   spousePenGross: 0,
  // };

  const totals = {
    _description: "Totals Breakdown",
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

  const savings = {
    _description: "Savings",
    startingBalance: rollingBalances.savings,
    withdrawals: 0,
    growthRate: inputs.retSavings,
    // interestEarnedLastYear() {
    //   return (this.startingBalance * this.growthRate) / (1 + this.growthRate);
    // },
    earnedInterest() {
      return (this.startingBalance - this.withdrawals) * this.growthRate;
    },
    deposits: 0,
    endingBalance() {
      return (
        this.startingBalance -
        this.withdrawals +
        this.deposits +
        this.earnedInterest()
      ).asCurrency();
    },
  };

  const mySsBenefits = {
    _description: "Social Security Benefits Breakdown",
    income: demographics.eligibleForSs ? benefitAmounts.ssAnnual : 0,
    taxablePortion: 0,
    nonTaxablePortion: 0,
    portionOfTotalBenefits: 0,
  };

  const myPensionBenefits = {
    _description: "Pension Benefits Breakdown",
    income: demographics.hasPen() ? benefitAmounts.penAnnual : 0,
  };

  const qualifyingSpousalBenefits = {
    ssIncome: 0,
    pensionIncome: 0,
    ...determineQualifyingSpouseBenefits(
      inputs,
      demographics.age,
      benefitAmounts
    ),
  };

  const spouseSsBenefits = {
    _description: "Spouse Social Security Benefits Breakdown",
    income: qualifyingSpousalBenefits.ssIncome,
    taxablePortion: 0,
    nonTaxablePortion: 0,
    breakDownSsBenefitPortions(totalTaxableSs, spouseGross) {
      if (!totalTaxableSs || isNaN(totalTaxableSs)) return 0;

      this.taxable = Math.round(
        (totalTaxableSs * this.income) / (this.income + spouseGross || 1)
      );
      this.nonTaxable = this.income - this.taxable;
      return `Taxable Portion: ${this.taxable}, Non-Taxable Portion: ${this.nonTaxable}`;
    },
  };

  const spousePensionBenefits = {
    _description: "Spouse Pension Benefits Breakdown",
    income: qualifyingSpousalBenefits.pensionIncome,
  };

  const incomeStreams = {
    _description: "Income",
    taxableSavingsInterestEarned: savings.earnedInterest(),
    myPension: myPensionBenefits.income,
    spousePension: spousePensionBenefits.income,
    mySs: mySsBenefits.income,
    spouseSs: spouseSsBenefits.income,
    rmd: calculateRMD(
      demographics.useRmd,
      demographics.age,
      rollingBalances.traditional401k
    ),
    taxableIncomeAdjustment: getTaxableIncomeOverride(demographics.age),
    taxFreeIncomeAdjustment: getTaxFreeIncomeOverride(demographics.age),
    otherTaxableIncomeAdjustments: getTaxableIncomeOverride(demographics.age),
    totalIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.taxableSavingsInterestEarned +
        this.otherTaxableIncomeAdjustments +
        this.rmd +
        this.mySs +
        this.spouseSs +
        this.taxFreeIncomeAdjustment
      );
    },
    taxableIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.taxableSavingsInterestEarned +
        this.otherTaxableIncomeAdjustments +
        this.rmd +
        this.mySs +
        this.spouseSs
      );
    },
    fixedIncomeIncludingSavingsInterest() {
      return (
        this.myPension +
        this.spousePension +
        this.taxableSavingsInterestEarned +
        this.taxableIncomeAdjustment +
        this.rmd +
        this.mySs +
        this.spouseSs
      );
    },
    fixedIncomeExludingSavingsInterest() {
      return (
        this.fixedIncomeIncludingSavingsInterest() -
        this.taxableSavingsInterestEarned
      );
    },
    otherIncomeForPurposesOfSsTaxation() {
      return (
        this.myPension +
        this.spousePension +
        this.rmd +
        this.taxableIncomeAdjustment +
        this.taxableSavingsInterestEarned
      );
    },
    ssIncome() {
      return this.mySs + this.spouseSs;
    },
    nonSsIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.taxableSavingsInterestEarned +
        this.otherTaxableIncomeAdjustments +
        this.rmd
      );
    },
  };

  // For debugging: Dump detailed logs for specific ages
  // Example: Set age to 200 to never log, or to a specific age like 70 to log that year

  const DUMP_TO_CONSOLE = demographics.age == 200;

  // Build complete taxable income picture for withdrawal functions

  // debugger;
  const withdrawalFactory = withdrawalFactoryJS_createWithdrawalFactory(
    incomeStreams,
    fiscalData,
    demographics,
    rollingBalances
  );

  // At this point we have gross income from pensions and taxable interest,
  // and we know the fixed portion of taxable income
  // We need to withdraw enough from accounts to meet the spend.total() need after taxes
  // We will use the withdrawal functions to handle tax calculations and account balance updates
  for (const accountType of inputs.order) {
    if (expenditureTracker.shortfall() == 0) break;

    withdrawalFactory.withdrawFromTargetedAccount(
      accountType,
      expenditureTracker
    );
  }

  // Get withdrawal breakdown and tax information from sophisticated retirement.js functions
  // NOW PART OF EXPENDITURE TRACKER
  // const withdrawalsMade = {
  //   retirementAccount: 0,
  //   savingsAccount: 0,
  //   roth: 0,
  //   ...withdrawalFactory.getWithdrawalsMade(),
  // };

  const incomeResults = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
    ...withdrawalFactory.getFinalIncomeResults(),
  };

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js

  // debugger;

  mySsBenefits.taxablePortion = incomeResults.ssBreakdown.myTaxablePortion();
  mySsBenefits.nonTaxablePortion =
    incomeResults.ssBreakdown.myNonTaxablePortion();
  mySsBenefits.portionOfTotalBenefits = incomeResults.ssBreakdown.myPortion();

  spouseSsBenefits.taxable = incomeResults.ssBreakdown.spouseTaxablePortion();
  spouseSsBenefits.nonTaxable =
    incomeResults.ssBreakdown.spouseNonTaxablePortion();
  spouseSsBenefits.portionOfTotalBenefits =
    incomeResults.ssBreakdown.spousePortion();

  // Calculate gross and net income from taxable sources
  // const grossTaxableIncomeFromAllTaxableSources =
  //   mySsBenefits.income +
  //   spouseSsBenefits.income +
  //   incomeStreams.myPension +
  //   incomeStreams.spousePension +
  //   withdrawalsMade.retirementAccount +
  //   incomeStreams.rmd +
  //   incomeStreams.taxableInterest;

  // const netIncomeFromTaxableSources =
  //   grossTaxableIncomeFromAllTaxableSources -
  //   withdrawalFactoryIncomeResults.tax;

  // // Calculate total net income
  // const totalNetIncome = netIncomeFromTaxableSources.asCurrency();

  // Update final withdrawal amounts to include any additional savings withdrawal
  // const totalWithdrawals =
  //   withdrawalsMade.savingsAccount +
  //   withdrawalsMade.roth +
  //   withdrawalsMade.retirementAccount;

  savings.withdrawals = expenditureTracker.withdrawalsMade.fromSavings;
  savings.deposits = expenditureTracker.depositsMade.toSavings;

  // Track taxable interest earned for reporting purposes and next year's taxes

  // If there's an overage (excess income beyond targeted "spend"), add it to savings
  // as if deposited on 12/31 of the current year, AFTER savings growth has been determined
  // This simulates the idea of saving any excess income at the end of the year
  // rather than letting it sit idle in a checking account
  // Note: this overage is not taxable since it's from after-tax income
  // (it has already been taxed when earned)
  // const overage = Math.max(0, totalNetIncome - expenditures.total());
  // if (overage > 0) {
  //   rollingBalances.savings += overage;
  //   contributions.savings += overage;
  //   savings.overageDeposit += overage;
  // }

  // Apply normal growth to other account types (withdrawals happen at specific times)
  rollingBalances.traditional401k *= 1 + inputs.ret401k;
  rollingBalances.rothIra *= 1 + inputs.retRoth;

  // Note: income.taxableInterestIncome was calculated earlier before withdrawals

  // // Update final withdrawal gross to include savings
  // const finalWGrossTotal = finalWGross + additionalSavingsWithdrawal;
  // const finalWNetTotal = withdrawalNetAdjusted + additionalSavingsWithdrawal;

  // if (age == 72) {
  //   debugger;
  // }
  // Calculate individual withdrawal net amounts for breakdown

  const withdrawalBreakdown = {
    retirementAccount: expenditureTracker.withdrawalsMade.from401k,
    savings: expenditureTracker.withdrawalsMade.fromSavings, // Savings withdrawals are not taxed
    roth: expenditureTracker.withdrawalsMade.fromRoth,
    totalWithdrawals() {
      return (
        this.retirementAccount + this.savings + this.roth + withdrawals.rmd
      );
    },
    calculationDetails: expenditureTracker.withdrawalsMade,
  };

  // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

  const ssIncome = {
    _description: "Social Security Benefits Breakdown",
    mySsGross: incomeResults.ssBreakdown.myPortion(),
    myTaxablePortion: incomeResults.ssBreakdown.myTaxablePortion(),
    myNonTaxablePortion: incomeResults.ssBreakdown.myNonTaxablePortion(),
    spouseSsGross: incomeResults.ssBreakdown.spousePortion(),
    spouseTaxablePortion: incomeResults.ssBreakdown.spouseTaxablePortion() || 0,
    spouseNonTaxable: incomeResults.ssBreakdown.spouseNonTaxablePortion() || 0,
    provisionalIncome: incomeResults.ssBreakdown.provisionalIncome(),
    calculationDetails: incomeResults.ssBreakdown,
  };

  const taxes = {
    _description: "Taxes Breakdown",
    federalTaxes: incomeResults.incomeBreakdown.federalIncomeTax,
    effectiveTaxRate: incomeResults.incomeBreakdown.effectiveTaxRate(),
    standardDeduction: incomeResults.incomeBreakdown.standardDeduction,
    calculationDetails: incomeResults.incomeBreakdown,
  };

  const balances = {
    _description: "Account Balances",
    savings: rollingBalances.savings.asCurrency(),
    traditional401k: rollingBalances.traditional401k.asCurrency(),
    rothIra: rollingBalances.rothIra.asCurrency(),
    total() {
      return this.savings + this.traditional401k + this.rothIra;
    },
    calculationDetails: rollingBalances,
  };
  //

  const withdrawals = {
    _description: "Withdrawals Breakdown",
    retirementAccountGross: expenditureTracker.withdrawalsMade.from401k,
    savingsGross: expenditureTracker.withdrawalsMade.fromSavings,
    rothGross: expenditureTracker.withdrawalsMade.fromRoth,
    rmd: incomeResults.incomeBreakdown.rmd,
    total() {
      return (
        this.retirementAccountGross +
        this.savingsGross +
        this.rothGross +
        this.rmd
      );
    },
    calculationDetails: {
      expenditureTracker: expenditureTracker,
      incomeBreakdown: incomeResults.incomeBreakdown,
    },
  };
  // result.withdrawals.gross = finalWGrossTotal;
  // result.withdrawals.net = finalWNetTotal;

  const pensionBreakdown = {
    myIncome: incomeResults.incomeBreakdown.myPension,
    myFederalTaxes:
      incomeResults.incomeBreakdown.translateGrossAmountToPortionOfFederalIncomeTax(
        incomeResults.incomeBreakdown.myPension
      ),
    myNetIncome: incomeResults.incomeBreakdown.translateGrossAmountToNet(
      incomeResults.incomeBreakdown.myPension
    ),
    spouseIncome: incomeResults.incomeBreakdown.spousePension,
    spouseFederalTaxes:
      incomeResults.incomeBreakdown.translateGrossAmountToPortionOfFederalIncomeTax(
        incomeResults.incomeBreakdown.spousePension
      ),
    spouseNetIncome: incomeResults.incomeBreakdown.translateGrossAmountToNet(
      incomeResults.incomeBreakdown.spousePension
    ),
    _description: "Pension Benefits Breakdown",
    calculationDetails: incomeResults.incomeBreakdown,
  };

  const ssBreakdown = {
    _description: "Social Security Benefits Breakdown",
    mySsGross: incomeResults.ssBreakdown.myPortion(), // Total gross SS benefits from retirement.js
    mySsTaxableAmount: incomeResults.ssBreakdown.myTaxablePortion(), // Total taxable portion from retirement.js
    mySsNonTaxable: incomeResults.ssBreakdown.myNonTaxablePortion(), // Total non-taxable portion from retirement.js
    ssSpouseTaxableAmount:
      incomeResults.ssBreakdown.spouseTaxablePortion() || 0, // Total taxable portion from retirement.js
    ssSpouseNonTaxable:
      incomeResults.ssBreakdown.spouseNonTaxablePortion() || 0,
    calculationDetails: incomeResults.ssBreakdown.calculationDetails, // Detailed calculation methodology from retirement.js
  };

  const savingsBreakdown = {
    _description: "Savings Breakdown",
    startingBalance: savings.startingBalance,
    withdrawals: savings.withdrawals,
    growthRate: `${inputs.retSavings * 100}%`,
    interestEarned: savings.earnedInterest(),
    deposits: savings.deposits,
    endingBalance: savings.endingBalance(),
  };

  // Update all the final values in the result object
  result.expenditures = expenditureTracker.totalBudgeted();

  result.withdrawals = withdrawals;
  result.ss = ssIncome;
  // result.pen = pensionIncome;
  result.taxes = taxes;
  result.standardDeduction = incomeResults.incomeBreakdown.standardDeduction;
  result.totals = totals;
  result.balances = balances;
  result.fiscalData = fiscalData;
  result.demographics = demographics;
  result.mySsBenefits = mySsBenefits;
  result.spouseSsBenefits = spouseSsBenefits;
  result.myPensionBenefits = myPensionBenefits;
  result.spousePensionBenefits = spousePensionBenefits;
  result.contributions = contributions;
  result.income = incomeStreams;
  result.savings = savings;

  // Add breakdown data
  result.savingsBreakdown = savingsBreakdown;
  result.withdrawalBreakdown = withdrawalBreakdown;
  result.ssBreakdown = ssBreakdown;
  result.pensionBreakdown = pensionBreakdown;

  // Dump the result to the console
  if (DUMP_TO_CONSOLE) {
    console.log("Retirement Year Result:", result);
  }

  result._description = `
-----------------------------------------------
--- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
-----------------------------------------------`;
  debugger;
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
      benefitAmounts
    );
    calculations.push(yearData);

    const totalBal = yearData.bal.total();
    totalTaxes += yearData.taxes.federalTaxes;
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

    const annualIncreaseInSpending = inputs.spendAtRetire * inputs.inflation;
    const annualDecreaseInSpending =
      inputs.spendAtRetire * inputs.spendingDecline * -1;

    inputs.spendAtRetire += annualIncreaseInSpending + annualDecreaseInSpending;
  }

  console.log("Calculations: ", calculations);

  // Generate final output
  generateOutputAndSummary(inputs, rows, totalTaxes, maxDrawdown);
}
