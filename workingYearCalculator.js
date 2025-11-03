/**
 * Calculate one year of accumulation phase (working years)
 * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
 * @param {number} yearIndex - Index of the current year (0-based)
 * @param {number} salary - Annual salary for this year
 * @param {AccountYear} accountYear - AccountGroup instance containing all accounts
 * @returns {WorkingYearData} Comprehensive working year calculation results
 */
function calculateWorkingYearData(inputs, yearIndex, salary, accountYear) {
  // Declare and initialize the result object at the top
  const result = WorkingYearData.CreateEmpty();

  // debugger;
  const fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR + yearIndex);
  const demographics = Demographics.CreateUsing(inputs, false, true);
  const employmentInfo = EmploymentInfo.CreateUsing(
    demographics,
    salary,
    inputs
  );

  // **************
  // Calculations
  // **************
  // debugger;
  accountYear.deposit(
    ACCOUNT_TYPES.SUBJECT_TRAD_401K,
    TRANSACTION_CATEGORY.CONTRIBUTION,
    employmentInfo.max401kContribution
  );
  accountYear.deposit(
    ACCOUNT_TYPES.SUBJECT_TRAD_401K,
    TRANSACTION_CATEGORY.INTEREST,
    accountYear.trad401k.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE,
      fiscalData.taxYear
    )
  );

  accountYear.deposit(
    ACCOUNT_TYPES.SUBJECT_SAVINGS,
    TRANSACTION_CATEGORY.INTEREST,
    accountYear.savings.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    )
  );

  accountYear.deposit(
    ACCOUNT_TYPES.SUBJECT_TRAD_ROTH,
    TRANSACTION_CATEGORY.CONTRIBUTION,
    employmentInfo.rothMaxContribution
  );

  accountYear.deposit(
    ACCOUNT_TYPES.SUBJECT_TRAD_ROTH,
    TRANSACTION_CATEGORY.INTEREST,
    accountYear.rothIra.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    )
  );

  const taxes = new Taxes();

  const contributions = Contributions.CreateUsing(
    accountYear,
    employmentInfo,
    undefined,
    [
      withLabel("employmentInfo", employmentInfo),
      withLabel("accountGroup.savings", accountYear),
    ]
  );

  const income = WorkingYearIncome.CreateUsing(
    salary,
    demographics,
    accountYear,
    fiscalData
  );

  taxes.taxableIncome = income.adjustedGrossIncome;

  taxes.standardDeduction = retirementJS_getStandardDeduction(
    demographics.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );

  taxes.federalTaxesOwed = retirementJS_calculateFederalTax(
    income.getTaxableIncome(),
    fiscalData.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );

  income.federalTaxesOwed = taxes.federalTaxesOwed;

  // Money not spent from income goes into savings
  // fiscalData.determineActualSavingsContribution(income.getNetIncome);

  const withdrawals = {
    retirementAccount: accountYear.trad401k.withdrawalsForYear(
      fiscalData.taxYear
    ),
    savings: accountYear.savings.withdrawalsForYear(fiscalData.taxYear),
    rothIra: accountYear.rothIra.withdrawalsForYear(fiscalData.taxYear),
    total() {
      return this.retirementAccount + this.savings + this.rothIra;
    },
  };

  const balances = Balances.Empty();

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
    calculationDetails: {},
  };

  balances.savings = accountYear.savings.endingBalanceForYear(
    fiscalData.taxYear
  );
  balances.trad401k = accountYear.trad401k.endingBalanceForYear(
    fiscalData.taxYear
  );
  balances.rothIra = accountYear.rothIra.endingBalanceForYear(
    fiscalData.taxYear
  );

  totals.totalIncome = income.allIncomeSources;
  totals.totalNetIncome = income.netIncome;
  totals.grossTaxableIncome = income.grossIncome;
  totals.calculationDetails = withLabel("income", income);

  // Update all the final values in the result object
  // contributions.my401k = employmentInfo.max401kContribution;
  // contributions.myRoth = employmentInfo.rothMaxContribution;
  // contributions.savings = accountYear.getDeposits(
  //   ACCOUNT_TYPES.SUBJECT_SAVINGS,
  //   TRANSACTION_CATEGORY.CONTRIBUTION
  // );
  // contributions.employerMatch = employmentInfo.employer401kMatch;
  // contributions.calculationDetails = [
  //   withLabel("employmentInfo", employmentInfo),
  //   withLabel("accountGroup.savings", accountGroup.savings),
  // ];

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
  result.roth = accountYear.rothIra;
  result.savings = accountYear.savings;
  result.retirementAccount = accountYear.trad401k;
  result.fiscalData = fiscalData;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: accountYear.savings.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accountYear.savings.withdrawalsForYear(fiscalData.taxYear),
    deposits: accountYear.savings.depositsForYear(fiscalData.taxYear),
    taxFreeIncomeDeposit: income.taxFreeIncomeAdjustment,
    interestEarned: accountYear.savings.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    endingBalance: accountYear.savings.endingBalanceForYear(fiscalData.taxYear),
    growthRate: fiscalData.savingsRateOfReturn,
    calculationDetails: [
      withLabel("savings", accountYear.savings),
      withLabel(
        "income.taxFreeIncomeAdjustment",
        income.taxFreeIncomeAdjustment
      ),
    ],
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
