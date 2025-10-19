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

  debugger;
  // For ages beyond 100, use declining factors
  let factor;
  if (age <= 100) {
    factor = lifeFactor[age] || lifeFactor[100];
  } else {
    // Linear decline after 100
    factor = Math.max(1.0, lifeFactor[100] - (age - 100) * 0.1);
  }

  return (retirementAccountBalance / factor).asCurrency();
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

function distributeWithdrawalsAcrossAccounts(amount, accountProportions) {}

/**
 * Calculate a given retirement year with proper SS taxation based on total income
 */
function calculateRetirementYearData(inputs, accounts, benefitAmounts) {
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
    age: inputs.age,
    ssStartAge: inputs.ssStartAge,
    penStartAge: inputs.penStartAge,
    retirementYear: inputs.retirementYear,
    isRetired: true,
    isWorking: false,
    hasSpouse: inputs.hasSpouse,
    ageOfSpouse: inputs.spouseAge,
    ssStartAgeOfSpouse: inputs.hasSpouse ? inputs.spouseSsStartAge : undefined,
    penStartAgeOfSpouse: inputs.hasSpouse
      ? inputs.spousePenStartAge
      : undefined,
    filingStatus: inputs.filingStatus,
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
    _description: `Retirement Year ${inputs.yearIndex + 1} (Age ${this.age}) (Year ${this.retirementYear})`,
  };

  // if (demographics.age == 65) debugger;

  const fiscalData = {
    _description: "Fiscal Year Data",
    inflationRate: inputs.inflation,
    filingStatus: inputs.filingStatus,
    retirementAccountRateOfReturn: inputs.ret401k,
    rothRateOfReturn: inputs.retRoth,
    savingsRateOfReturn: inputs.retSavings,
    taxYear: TAX_BASE_YEAR + inputs.yearIndex,
    yearIndex: inputs.yearIndex,
    spend: inputs.spend,
    useRmd: inputs.useRMD,
    useSavings: inputs.useSavings,
    useTrad401k: inputs.useTrad401k,
    useRoth: inputs.useRoth,
  };

  const incomeStreams = {
    _description: "Income",
    myPension: demographics.eligibleForPension() ? benefitAmounts.penAnnual : 0,
    reportedEarnedInterest: accounts.savings
      .calculateInterestForYear(
        INTEREST_CALCULATION_EPOCH.STARTING_BALANCE,
        fiscalData.taxYear
      )
      .asCurrency(),
    spousePension: 0,
    mySs: demographics.eligibleForSs() ? benefitAmounts.ssAnnual : 0,
    spouseSs: demographics.spouseEligibleForSs()
      ? benefitAmounts.spouseSsAnnual
      : 0,
    rmd: calculateRMD(
      fiscalData.useRmd,
      demographics.age,
      accounts.traditional401k.startingBalance
    ),
    taxableIncomeAdjustment: inputs.taxableIncomeAdjustment,
    taxFreeIncomeAdjustment: inputs.taxFreeIncomeAdjustment,
    otherTaxableIncomeAdjustments: inputs.otherTaxableIncomeAdjustments,
    totalIncome() {
      return (
        this.myPension +
        this.spousePension +
        this.reportedEarnedInterest +
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
        this.reportedEarnedInterest +
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
        this.reportedEarnedInterest +
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

  // const expenditureTracker = {
  //   _description: "Expenditures Breakdown",
  //   budgeted: inputs.spendAtRetire,
  //   additionalSpending: inputs.additionalSpending,
  //   withdrawalsMade: {
  //     fromSavings: 0,
  //     from401k: 0,
  //     fromRoth: 0,
  //     total() {
  //       return (this.fromSavings + this.from401k + this.fromRoth).asCurrency();
  //     },
  //   },
  //   depositsMade: {
  //     toSavings: 0,
  //     to401k: 0,
  //     toRoth: 0,
  //     total() {
  //       return this.toSavings + this.to401k + this.toRoth;
  //     },
  //   },
  //   totalBudgeted() {
  //     return (this.budgeted + this.additionalSpending).asCurrency();
  //   },
  //   actualExpenditures() {
  //     return this.withdrawalsMade.total().asCurrency();
  //   },
  //   shortfall() {
  //     return Math.max(0, this.totalBudgeted() - this.actualExpenditures());
  //   },
  // };
  // At this point we have gross income from pensions and taxable interest,
  // and we know the fixed portion of taxable income
  // We need to withdraw enough from accounts to meet the spend.total() need after taxes
  // We will use the withdrawal functions to handle tax calculations and account balance updates
  let spend = (inputs.spendAtRetire + inputs.additionalSpending).asCurrency();
  // for (const accountType of inputs.order) {
  //   if (remainingSpend <= 0) break;

  //   let thisSpend = spend;
  //   switch (accountType) {
  //     case ACCOUNT_TYPES.TRADITIONAL_401K:
  //       thisSpend *= 0.6;
  //       break;
  //     case ACCOUNT_TYPES.SAVINGS:
  //       thisSpend *= 0.3;
  //       break;
  //     case ACCOUNT_TYPES.ROTH_IRA:
  //       thisSpend *= 0.1;
  //       break;
  //   }

  //   let amountWithdrawn = withdrawalFactory.withdrawFromTargetedAccount(
  //     thisSpend,
  //     accountType
  //   );
  //   remainingSpend -= amountWithdrawn;
  // }

  const estimatedIncomeBefore401kWithdrawal =
    retirementJS_calculateIncomeWhen401kWithdrawalIs(
      0,
      incomeStreams,
      demographics,
      fiscalData
    );

  // reduce the spend temporarily to determine the shortfall that needs to be covered by 401k, savings, and roth

  const estimatedFixedRecurringIncomeNet =
    estimatedIncomeBefore401kWithdrawal.incomeBreakdown.netIncomeLessReportedEarnedInterest();

  // reduce the spend by the estimated net income from SS, Pension, etc
  let shortfall = spend - estimatedFixedRecurringIncomeNet; // whittle down recurring net income by 5%

  const accountPortioner = new AccountPortioner(
    accounts,
    fiscalData,
    shortfall,
    incomeStreams
  );

  let totalWithdrawals = 0;

  const withdrawalBreakdown = {
    retirementAccount: 0,
    savings: 0,
    roth: 0,
    rmd: incomeStreams.rmd,
    totalWithdrawals() {
      return this.retirementAccount + this.savings + this.roth + this.rmd;
    },
  };

  if (shortfall > 0) {
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      accountPortioner.savingsAsk(),
      ACCOUNT_TYPES.SAVINGS
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.savings = withdrawal;
  }

  if (shortfall > 0) {
    // let thisSpend = spend * 0.1;
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      accountPortioner.rothAsk(),
      ACCOUNT_TYPES.ROTH_IRA
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.roth = withdrawal;
  }
  if (shortfall > 0) {
    // let thisSpend = spend * 0.6;
    const withdrawal = withdrawalFactory.withdrawFromTargetedAccount(
      //accountPortioner.traditional401kAsk(),
      shortfall + estimatedFixedRecurringIncomeNet,
      ACCOUNT_TYPES.TRADITIONAL_401K,
      false
    );
    shortfall -= withdrawal;
    withdrawalBreakdown.retirementAccount = withdrawal;
  }

  // if anything hasn't already been accounted for, try taking it from Savings
  if (shortfall > 0) {
    shortfall -= withdrawalFactory.withdrawFromTargetedAccount(
      shortfall,
      ACCOUNT_TYPES.SAVINGS,
      false
    );
  }

  //TODO: What if remainingSpend still isn't zero at this point?

  // Deposit interest earned into accounts

  incomeStreams.actualEarnedInterest =
    accounts.savings.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    );

  accounts.savings.deposit(
    incomeStreams.actualEarnedInterest,
    "interest",
    fiscalData.taxYear
  );

  const actualSpend = Math.min(
    accounts.savings.endingBalanceForYear(fiscalData.taxYear),
    fiscalData.spend.asCurrency()
  );
  accounts.savings.withdrawal(
    actualSpend,
    TRANSACTION_CATEGORY.DISBURSEMENT,
    fiscalData.taxYear
  );

  accounts.traditional401k.deposit(
    accounts.traditional401k.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    "interest",
    fiscalData.taxYear
  );
  accounts.rothIra.deposit(
    accounts.rothIra.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    "interest",
    fiscalData.taxYear
  );

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
    savings: accounts.savings
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
    traditional401k: accounts.traditional401k
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
    rothIra: accounts.rothIra
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
    total() {
      return this.savings + this.traditional401k + this.rothIra;
    },
    calculationDetails: withLabel("accountBalances", accounts),
  };
  //

  const withdrawals = {
    _description: "Withdrawals Breakdown",
    traditional401k: accounts.traditional401k.withdrawalsForYear(
      fiscalData.taxYear
    ),
    savings: accounts.savings.withdrawalsForYear(fiscalData.taxYear),
    roth: accounts.rothIra.withdrawalsForYear(fiscalData.taxYear),
    rmd: incomeResults.incomeBreakdown.rmd,
    total() {
      return this.traditional401k + this.savings + this.roth + this.rmd;
    },
    calculationDetails: [
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
      withLabel("accounts", accounts),
    ],
  };

  const deposits = {
    _description: "Deposits Breakdown",
    traditional401k: accounts.traditional401k.depositsForYear(
      fiscalData.taxYear
    ),
    savings: accounts.savings.depositsForYear(fiscalData.taxYear),
    roth: accounts.rothIra.depositsForYear(fiscalData.taxYear),
    rmd: incomeResults.incomeBreakdown.rmd,
    total() {
      return this.traditional401k + this.savings + this.roth + this.rmd;
    },
    calculationDetails: [
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
      withLabel("accounts", accounts),
    ],
  };

  const totals = {
    _description: "Totals Breakdown",
    reportableIncome: incomeResults.incomeBreakdown.reportableIncome(),
    taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
    netIncome:
      incomeResults.incomeBreakdown.netIncomeLessReportedEarnedInterest(),
    calculationDetails: [
      withLabel("incomeResults.incomeBreakdown", incomeResults.incomeBreakdown),
    ],
  };

  const savings = {
    _description: "Savings",
    startingBalance: accounts.savings.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accounts.savings.withdrawalsForYear(fiscalData.taxYear),
    earnedInterest: accounts.savings.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    deposits: accounts.savings.depositsForYear(fiscalData.taxYear),
    endingBalance: accounts.savings
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
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
    calculationDetails: [withLabel("savings", savings)],
  };

  const retirementAccountBreakdown = {
    _description: "Retirement Account Breakdown",
    startingBalance: accounts.traditional401k.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accounts.traditional401k.withdrawalsForYear(
      fiscalData.taxYear
    ),
    growthRate: `${inputs.ret401k * 100}%`,
    interestEarned: accounts.traditional401k.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    deposits: accounts.traditional401k.depositsForYear(fiscalData.taxYear),
    endingBalance: accounts.traditional401k
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
  };

  const rothAccountBreakdown = {
    _description: "Retirement Account Breakdown",
    startingBalance: accounts.rothIra.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accounts.rothIra.withdrawalsForYear(fiscalData.taxYear),
    growthRate: `${inputs.retRoth * 100}%`,
    interestEarned: accounts.rothIra.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    deposits: accounts.rothIra.depositsForYear(fiscalData.taxYear),
    endingBalance: accounts.rothIra
      .endingBalanceForYear(fiscalData.taxYear)
      .asCurrency(),
  };

  // const expenditureBreakdown = {
  //   _description: "Expenditures Breakdown",
  //   budgeted: expenditureTracker.budgeted,
  //   additionalSpending: expenditureTracker.additionalSpending,
  //   totalBudgeted: expenditureTracker.totalBudgeted(),
  //   withdrawalsMade: expenditureTracker.withdrawalsMade.total(),
  //   depositsMade: expenditureTracker.depositsMade.total(),
  //   actualExpenditures: expenditureTracker.actualExpenditures(),
  //   shortfall: expenditureTracker.shortfall(),
  //   calculationDetails: [withLabel("expenditureTracker", expenditureTracker)],
  // };

  const incomeBreakdown = {
    _description: "Income Breakdown",
    myPension: incomeResults.incomeBreakdown.myPension,
    spousePension: incomeResults.incomeBreakdown.spousePension,
    reportedEarnedInterest:
      incomeResults.incomeBreakdown.reportedEarnedInterest,
    actualEarnedInterest: incomeResults.incomeBreakdown.actualEarnedInterest,
    otherTaxableIncomeAdjustments:
      incomeResults.incomeBreakdown.otherTaxableIncomeAdjustments,
    rmd: incomeResults.incomeBreakdown.rmd,
    mySs: incomeResults.incomeBreakdown.mySs,
    spouseSs: incomeResults.incomeBreakdown.spouseSs,
    taxFreeIncomeAdjustment:
      incomeResults.incomeBreakdown.taxFreeIncomeAdjustment,
    reportableIncome: incomeResults.incomeBreakdown.reportableIncome(),
    taxableIncome: incomeResults.incomeBreakdown.taxableIncome(),
    federalIncomeTax: incomeResults.incomeBreakdown.federalIncomeTax,
    netIncome:
      incomeResults.incomeBreakdown.netIncomeLessReportedEarnedInterest(),
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
  // result.expenditures = expenditureTracker.totalBudgeted();

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
  // result.expendituresBreakdown = expenditureBreakdown;

  // debugger;
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
        interest: accounts.savings.interestEarned,
        rmd: result.incomeStreams.rmd,
        otherTaxableIncome: result.incomeStreams.otherTaxableIncomeAdjustments,
        taxFreeIncome: result.incomeStreams.taxFreeIncomeAdjustment,
        otherTaxableIncome: result.incomeStreams.otherTaxableIncomeAdjustments,
      },
    },
    federalTaxes: taxes.federalTaxes,
    netIncome: incomeResults.incomeBreakdown.netIncome,
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
    accounts: { ...accounts },
  };

  const temp = {
    income: {
      netIncome: incomeResults.incomeBreakdown
        .netIncomeLessReportedEarnedInterest()
        .asCurrency(),
      interestIncome: savings.earnedInterest,
      spend: fiscalData.spend.asCurrency(),
      shortfall: Math.max(
        fiscalData.spend -
          savings.earnedInterest -
          accounts.savings.depositsForYear(fiscalData.taxYear),
        0
      ).asCurrency(),
      overage: Math.max(
        accounts.savings.depositsForYear(fiscalData.taxYear) -
          savings.earnedInterest -
          fiscalData.spend,
        0
      ).asCurrency(),
    },
    savings: {
      startingBalance: accounts.savings
        .startingBalanceForYear(fiscalData.taxYear)
        .asCurrency(),
      withdrawals: accounts.savings
        .withdrawalsForYear(fiscalData.taxYear)
        .asCurrency(),
      deposits: accounts.savings
        .depositsForYear(fiscalData.taxYear)
        .asCurrency(),
      endingBalance: accounts.savings
        .endingBalanceForYear(fiscalData.taxYear)
        .asCurrency(),
      // interestEarned: accounts.savings
      //   .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
      //   .asCurrency(),
    },
    traditional401k: {
      startingBalance: accounts.traditional401k
        .startingBalanceForYear(fiscalData.taxYear)
        .asCurrency(),
      withdrawals: accounts.traditional401k.withdrawalsForYear(
        fiscalData.taxYear
      ),
      deposits: accounts.traditional401k
        .depositsForYear(fiscalData.taxYear)
        .asCurrency(),
      endingBalance: accounts.traditional401k
        .endingBalanceForYear(fiscalData.taxYear)
        .asCurrency(),
      interestEarned: accounts.traditional401k
        .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
        .asCurrency(),
    },
  };

  // temp.dump("Balances");
  // debugger;
  // debugData.dump("debugData");
  // accounts.savings.dump("Savings");
  // accounts.traditional401k.dump("401k");
  // debugger;

  // result.dump("result");

  // result.income.dump();
  // result.balances.dump();
  return result;
}
