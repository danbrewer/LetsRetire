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

// Function to calculate initial benefit amounts for retirement
function calculateInitialBenefitAmounts(inputs) {
  // Declare and initialize the result object at the top
  const result = {
    ssAnnual: 0,
    penAnnual: 0,
    spouseSsAnnual: 0,
    spousePenAnnual: 0,
  };

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

  if (inputs.hasSpouse) {
    result.spouseSsAnnual = inputs.spouseSsMonthly * 12;
    result.spousePenAnnual = inputs.spousePenMonthly * 12;
  }

  return result;
}

/**
 * Calculate a given retirement year with proper SS taxation based on total income
 */
function calculateRetirementYearData(
  inputs,
  yearIndex,
  accounts,
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
    contributions: {},
    withdrawals: {},
    balances: {},
    pen: {},
    savings: {},
    ss: {},
    incomeStreams: {},
    incomeBreakdown: {},
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
    ageOfSpouse: inputs.hasSpouse
      ? inputs.spouseAge + (this.age - inputs.currentAge)
      : undefined,
    ssStartAgeOfSpouse: inputs.hasSpouse ? inputs.spouseSsStartAge : undefined,
    penStartAgeOfSpouse: inputs.hasSpouse
      ? inputs.spousePenStartAge
      : undefined,
    filingStatus: inputs.filingStatus,
    useRmd: inputs.useRMD,
    eligibleForSs() {
      return this.age >= this.ssStartAge;
    },
    eligibleForPension() {
      return this.age >= this.penStartAge;
    },
    spouseEligibleForSs() {
      return this.hasSpouse && this.ageOfSpouse >= this.ssStartAgeOfSpouse;
    },
    spouseEligibleForPension() {
      return this.hasSpouse && this.ageOfSpouse >= this.penStartAgeOfSpouse;
    },
    _description: `Retirement Year ${this.yearIndex + 1} (Age ${this.age}) (Year ${this.retirementYear})`,
  };

  if (demographics.age == 65) debugger;

  const fiscalData = {
    _description: "Fiscal Year Data",
    inflationRate: inputs.inflation,
    filingStatus: inputs.filingStatus,
    retirementAccountRateOfReturn: inputs.ret401k,
    rothRateOfReturn: inputs.retRoth,
    savingsRateOfReturn: inputs.retSavings,
    taxYear: TAX_BASE_YEAR + yearIndex,
    yearIndex: yearIndex,
    spend: inputs.spendingToday.adjustedForInflation(
      inputs.inflation,
      yearIndex
    ),
  };

  const incomeStreams = {
    _description: "Income",
    estimatedInterestEarned:
      accounts.savings.startingBalance * inputs.retSavings,
    myPension: demographics.eligibleForPension() ? benefitAmounts.penAnnual : 0,
    spousePension: 0,
    mySs: demographics.eligibleForSs() ? benefitAmounts.ssAnnual : 0,
    spouseSs: demographics.spouseEligibleForSs()
      ? benefitAmounts.spouseSsAnnual
      : 0,
    rmd: calculateRMD(
      demographics.useRmd,
      demographics.age,
      accounts.traditional401k.startingBalance
    ),
    taxableIncomeAdjustment: getTaxableIncomeOverride(demographics.age),
    taxFreeIncomeAdjustment: getTaxFreeIncomeOverride(demographics.age),
    otherTaxableIncomeAdjustments: getTaxableIncomeOverride(demographics.age),
    totalIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.estimatedInterestEarned +
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
        this.estimatedInterestEarned +
        this.otherTaxableIncomeAdjustments +
        this.rmd +
        this.mySs +
        this.spouseSs
      );
    },
    ssIncome() {
      return this.mySs + this.spouseSs;
    },
    pensionIncome() {
      return this.myPension + this.spousePension;
    },
    nonSsIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.estimatedInterestEarned +
        this.otherTaxableIncomeAdjustments +
        this.rmd
      );
    },
  };

  // Build complete taxable income picture for withdrawal functions

  // debugger;
  const withdrawalFactory = withdrawalFactoryJS_createWithdrawalFactory(
    incomeStreams,
    fiscalData,
    demographics,
    accounts
  );

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

  const incomeResults = {
    ssBreakdown: {},
    incomeBreakdown: {},
    ...withdrawalFactory.getFinalIncomeResults(),
  };

  // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
  // But we can use the taxable amounts from retirement.js

  const mySsBenefits = {
    _description: "Social Security Benefits Breakdown",
    income: incomeStreams.mySs,
    taxablePortion: incomeResults.ssBreakdown.myTaxablePortion(),
    nonTaxablePortion: incomeResults.ssBreakdown.myNonTaxablePortion(),
    portionOfTotalBenefits: incomeResults.ssBreakdown.myPortion(),
    calculationDetails: [
      withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
      withLabel("incomeStreams", incomeStreams),
    ],
  };

  const withdrawalBreakdown = {
    retirementAccount: expenditureTracker.withdrawalsMade.from401k,
    savings: expenditureTracker.withdrawalsMade.fromSavings, // Savings withdrawals are not taxed
    roth: expenditureTracker.withdrawalsMade.fromRoth,
    totalWithdrawals() {
      return (
        this.retirementAccount + this.savings + this.roth + withdrawals.rmd
      );
    },
    calculationDetails: withLabel(
      "expenditureTracker.withdrawalsMade",
      expenditureTracker.withdrawalsMade
    ),
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
    calculationDetails: withLabel(
      "incomeResults.ssBreakdown",
      incomeResults.ssBreakdown
    ),
  };

  const taxes = {
    _description: "Taxes Breakdown",
    federalTaxes: incomeResults.incomeBreakdown.federalIncomeTax,
    effectiveTaxRate: incomeResults.incomeBreakdown.effectiveTaxRate(),
    standardDeduction: incomeResults.incomeBreakdown.standardDeduction,
    calculationDetails: withLabel(
      "incomeResults.incomeBreakdown",
      incomeResults.incomeBreakdown
    ),
  };

  const balances = {
    _description: "Account Balances",
    savings: accounts.savings.endingBalance().asCurrency(),
    traditional401k: accounts.traditional401k.endingBalance().asCurrency(),
    rothIra: accounts.rothIra.endingBalance().asCurrency(),
    total() {
      return this.savings + this.traditional401k + this.rothIra;
    },
    calculationDetails: withLabel("accountBalances", accounts),
  };
  //

  const withdrawals = {
    _description: "Withdrawals Breakdown",
    traditional401k: accounts.traditional401k.withdrawals,
    savings: accounts.savings.withdrawals,
    roth: accounts.rothIra.withdrawals,
    rmd: incomeResults.incomeBreakdown.rmd,
    total() {
      return this.traditional401k + this.savings + this.roth + this.rmd;
    },
    calculationDetails: [
      withLabel("expenditureTracker", expenditureTracker),
      withLabel("accounts", accounts),
    ],
  };

  const deposits = {
    _description: "Deposits Breakdown",
    traditional401k: accounts.traditional401k.deposits,
    savings: accounts.savings.deposits,
    roth: accounts.rothIra.deposits,
    rmd: incomeResults.incomeBreakdown.rmd,
    total() {
      return this.traditional401k + this.savings + this.roth + this.rmd;
    },
    calculationDetails: [
      withLabel("expenditureTracker", expenditureTracker),
      withLabel("accounts", accounts),
    ],
  };

  const totals = {
    _description: "Totals Breakdown",
    grossIncome: incomeResults.incomeBreakdown.allIncome(),
    taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
    netIncome: incomeResults.incomeBreakdown.netIncome(),
    calculationDetails: [
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
    ],
  };

  const savings = {
    _description: "Savings",
    startingBalance: accounts.savings.startingBalance,
    withdrawals: accounts.savings.withdrawals,
    earnedInterest: accounts.savings.interestEarned,
    deposits: accounts.savings.deposits,
    endingBalance: accounts.savings.endingBalance().asCurrency(),
    calculationDetails: [withLabel("accounts.savings", accounts.savings)],
  };

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
    calculationDetails: withLabel(
      "incomeResults.incomeBreakdown",
      incomeResults.incomeBreakdown
    ),
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
    calculationDetails: withLabel(
      "incomeResults.ssBreakdown",
      incomeResults.ssBreakdown
    ), // Detailed calculation methodology from retirement.js
  };

  const savingsBreakdown = {
    _description: "Savings Breakdown",
    startingBalance: savings.startingBalance,
    withdrawals: savings.withdrawals,
    growthRate: `${inputs.retSavings * 100}%`,
    interestEarned: savings.earnedInterest,
    deposits: savings.deposits,
    endingBalance: savings.endingBalance,
  };

  const retirementAccountBreakdown = {
    _description: "Retirement Account Breakdown",
    startingBalance: accounts.traditional401k.startingBalance,
    withdrawals: accounts.traditional401k.withdrawals,
    growthRate: `${inputs.ret401k * 100}%`,
    interestEarned: accounts.traditional401k.interestEarned,
    deposits: accounts.traditional401k.deposits,
    endingBalance: accounts.traditional401k.endingBalance().asCurrency(),
  };

  const rothAccountBreakdown = {
    _description: "Retirement Account Breakdown",
    startingBalance: accounts.rothIra.startingBalance,
    withdrawals: accounts.rothIra.withdrawals,
    growthRate: `${inputs.retRoth * 100}%`,
    interestEarned: accounts.rothIra.interestEarned,
    deposits: accounts.rothIra.deposits,
    endingBalance: accounts.rothIra.endingBalance().asCurrency(),
  };

  const expenditureBreakdown = {
    _description: "Expenditures Breakdown",
    budgeted: expenditureTracker.budgeted,
    additionalSpending: expenditureTracker.additionalSpending,
    totalBudgeted: expenditureTracker.totalBudgeted(),
    withdrawalsMade: expenditureTracker.withdrawalsMade.total(),
    depositsMade: expenditureTracker.depositsMade.total(),
    actualExpenditures: expenditureTracker.actualExpenditures(),
    shortfall: expenditureTracker.shortfall(),
    calculationDetails: [withLabel("expenditureTracker", expenditureTracker)],
  };

  const incomeBreakdown = {
    _description: "Income Breakdown",
    myPension: incomeResults.incomeBreakdown.myPension,
    spousePension: incomeResults.incomeBreakdown.spousePension,
    estimatedInterestEarned:
      incomeResults.incomeBreakdown.estimatedInterestEarned,
    actualEarnedInterest: incomeResults.incomeBreakdown.actualEarnedInterest,
    otherTaxableIncomeAdjustments:
      incomeResults.incomeBreakdown.otherTaxableIncomeAdjustments,
    rmd: incomeResults.incomeBreakdown.rmd,
    mySs: incomeResults.incomeBreakdown.mySs,
    spouseSs: incomeResults.incomeBreakdown.spouseSs,
    taxFreeIncomeAdjustment:
      incomeResults.incomeBreakdown.taxFreeIncomeAdjustment,
    totalIncome: incomeResults.incomeBreakdown.allIncome(),
    taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
    federalIncomeTax: incomeResults.incomeBreakdown.federalIncomeTax,
    netIncome: incomeResults.incomeBreakdown.netIncome(),
    calculationDetails: [
      withLabel("incomeStreams", incomeStreams),
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
    ],
  };

  const spouseSsBenefits = {
    _description: "Spouse Social Security Benefits Breakdown",
    income: incomeStreams.spouseSs,
    taxablePortion: incomeResults.ssBreakdown.spouseTaxablePortion(),
    nonTaxablePortion: incomeResults.ssBreakdown.spouseNonTaxablePortion(),
    portionOfTotalBenefits: incomeResults.ssBreakdown.spousePortion(),
    calculationDetails: [
      withLabel("incomeResults.ssBreakdown", incomeResults.ssBreakdown),
      withLabel("incomeStreams", incomeStreams),
    ],
  };

  const myPensionBenefits = {
    _description: "Pension Benefits Breakdown",
    income: incomeStreams.myPension,
  };

  const spousePensionBenefits = {
    _description: "Spouse Pension Benefits Breakdown",
    income: incomeStreams.spousePension,
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
  result.incomeStreams = incomeStreams;
  result.savings = savings;

  // Add breakdown data
  result.incomeBreakdown = incomeBreakdown;
  result.withdrawalBreakdown = withdrawalBreakdown;
  result.ssBreakdown = ssBreakdown;
  result.pensionBreakdown = pensionBreakdown;
  result.savingsBreakdown = savingsBreakdown;
  result.retirementAccountBreakdown = retirementAccountBreakdown;
  result.rothAccountBreakdown = rothAccountBreakdown;
  result.expendituresBreakdown = expenditureBreakdown;

  const description = `
-----------------------------------------------
--- Retirement Year ${fiscalData.yearIndex + 1} (Age ${demographics.age}) (Year ${demographics.retirementYear}) ---
-----------------------------------------------`;

  console.log(description);

  const debugData = {
    age: demographics.age,
    spend: fiscalData.spend,
    income: {
      total: result.incomeStreams.totalIncome(),
      breakdown: {
        socialSec: result.incomeStreams.ssIncome(),
        pension: result.incomeStreams.pensionIncome(),
        interest: result.incomeStreams.actualEarnedInterest,
        rmd: result.incomeStreams.rmd,
        otherTaxableIncome: result.incomeStreams.otherTaxableIncomeAdjustments,
        taxFreeIncome: result.incomeStreams.taxFreeIncomeAdjustment,
        otherTaxableIncome: result.incomeStreams.otherTaxableIncomeAdjustments,
      },
    },
    federalTaxes: taxes.federalTaxes,
    netIncome: incomeResults.incomeBreakdown.netIncome(),
    deposits: {
      total: deposits.total().asCurrency(),
      breakdown: {
        savings: deposits.savings,
        roth: deposits.roth,
        trad401k: deposits.traditional401k,
      },
    },
    withdrawals: {
      total: withdrawals.total(),
      breakdown: {
        savings: withdrawals.savings,
        roth: withdrawals.roth,
        trad401k: withdrawals.traditional401k,
        rmd: withdrawals.rmd,
      },
    },
    balances: {
      total: balances.total(),
      breakdown: {
        savings: balances.savings,
        traditional401k: balances.traditional401k,
        rothIra: balances.rothIra,
      },
    },
  };
  debugData.dump();

  result.dump();

  // result.income.dump();
  // result.balances.dump();
  debugger;
  return result;
}
