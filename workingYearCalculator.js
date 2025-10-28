/**
 * Calculate one year of accumulation phase (working years)
 * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
 * @param {number} yearIndex - Index of the current year (0-based)
 * @param {number} salary - Annual salary for this year
 * @param {AccountGroup} accountGroup - AccountGroup instance containing all accounts
 * @returns {WorkingYearData} Comprehensive working year calculation results
 */
function calculateWorkingYearData(inputs, yearIndex, salary, accountGroup) {
  // Declare and initialize the result object at the top
  const result = WorkingYearData.CreateEmpty();
  // const result = {
  //   _description: "",
  //   demographics: {},
  //   fiscalData: {},
  //   totals: {},
  //   contributions: {},
  //   withdrawals: {},
  //   balances: {},
  //   pen: {},
  //   ss: {},
  //   savings: {},
  //   retirementAccount: {},
  //   roth: {},
  //   income: {},
  //   taxes: {},
  //   pensionBreakdown: {},
  //   spousePensionBreakdown: {},
  //   savingsBreakdown: {},
  //   ssBreakdown: {},
  //   spouseSsBreakdown: {},
  //   employmentInfo: {},
  // };

  // debugger;
  const fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR + yearIndex);
  // {
  //   _description: "Fiscal Year Data",
  //   inflationRate: inputs.inflation,
  //   filingStatus: inputs.filingStatus,
  //   retirementAccountRateOfReturn: inputs.ret401k,
  //   rothRateOfReturn: inputs.retRoth,
  //   savingsRateOfReturn: inputs.retSavings,
  //   taxYear: TAX_BASE_YEAR + yearIndex,
  //   yearIndex: yearIndex,
  //   spend: inputs.spend,
  //   actualSavingsContribution: 0,
  //   desiredSavingsContribution: (salary * inputs.taxablePct).asCurrency(),
  //   determineActualSavingsContribution(netIncome) {
  //     if (!netIncome || isNaN(netIncome)) return 0;

  //     this.actualSavingsContribution = Math.max(netIncome - this.spend, 0);
  //     return this.actualSavingsContribution;
  //   },
  // };

  const demographics = Demographics.CreateUsing(inputs, false, true);
  // const demographics = {
  //   _description: "Demographics",
  //   age: inputs.currentAge + yearIndex,
  //   ssStartAge: inputs.ssStartAge,
  //   penStartAge: inputs.penStartAge,
  //   retirementYear:
  //     new Date().getFullYear() + inputs.totalWorkingYears + yearIndex,
  //   isRetired: false,
  //   isWorking: true,
  //   hasSpouse: inputs.hasSpouse,
  //   filingStatus: inputs.filingStatus,
  //   eligibleForSs() {
  //     return this.age >= this.ssStartAge;
  //   },
  //   hasPen() {
  //     return this.age >= this.penStartAge;
  //   },
  // };

  // const employmentInfo = {
  //   _description: "Employment Info",
  //   salary: salary,
  //   pretaxContributionPercentage: inputs.pretaxPct,
  //   rothContributionPercentage: inputs.rothPct,
  //   employeeMatchCap: inputs.matchCap,
  //   matchRate: inputs.matchRate,
  //   desired401kContribution() {
  //     return (this.salary * this.pretaxContributionPercentage).asCurrency();
  //   },
  //   desiredRothContribution() {
  //     return (this.salary * this.rothContributionPercentage).asCurrency();
  //   },
  //   electiveScale() {
  //     let electiveLimit =
  //       EMPLOYEE_401K_LIMIT_2025 +
  //       (demographics.age >= 50 ? EMPLOYEE_401K_CATCHUP_50 : 0);
  //     const totalDesiredContribution =
  //       this.desired401kContribution() + this.desiredRothContribution();
  //     let scale =
  //       totalDesiredContribution > 0
  //         ? Math.min(1, electiveLimit / totalDesiredContribution)
  //         : 1;
  //     return scale;
  //   },
  //   cap401kContribution() {
  //     return (
  //       this.desired401kContribution() * this.electiveScale()
  //     ).asCurrency();
  //   },
  //   capRothContribution() {
  //     return (
  //       this.desiredRothContribution() * this.electiveScale()
  //     ).asCurrency();
  //   },
  //   emp401kContributionPct() {
  //     return this.salary > 0 ? this.cap401kContribution() / this.salary : 0;
  //   },
  //   employer401kMatch() {
  //     return (
  //       Math.min(this.emp401kContributionPct(), this.employeeMatchCap) *
  //       this.salary *
  //       this.matchRate
  //     ).asCurrency();
  //   },
  // };
  const employmentInfo = EmploymentInfo.CreateUsing(salary, inputs);

  // **************
  // Calculations
  // **************
  // debugger;
  accountGroup.trad401k.deposit(
    employmentInfo.cap401kContribution(),
    TRANSACTION_CATEGORY.CONTRIBUTION,
    fiscalData.taxYear
  );
  accountGroup.trad401k.deposit(
    accountGroup.trad401k.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE,
      fiscalData.taxYear
    ),
    TRANSACTION_CATEGORY.INTEREST,
    fiscalData.taxYear
  );

  accountGroup.savings.deposit(
    accountGroup.savings.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    TRANSACTION_CATEGORY.INTEREST,
    fiscalData.taxYear
  );

  accountGroup.rothIra.deposit(
    employmentInfo.capRothContribution(),
    TRANSACTION_CATEGORY.CONTRIBUTION,
    fiscalData.taxYear
  );
  accountGroup.rothIra.deposit(
    accountGroup.rothIra.calculateInterestForYear(
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS,
      fiscalData.taxYear
    ),
    TRANSACTION_CATEGORY.INTEREST,
    fiscalData.taxYear
  );

  // const taxes = {
  //   _description: "Taxes",
  //   grossIncome: 0,
  //   standardDeduction: 0,
  //   taxableIncome: 0,
  //   federalTaxesOwed: 0,
  //   otherTaxes: 0,
  //   taxableIncomeAdjustment: 0,
  // };

  const taxes = new Taxes();

  const contributions = {
    _description: "Contributions Breakdown",
    my401k: 0,
    myRoth: 0,
    spouse401k: 0,
    spouseRoth: 0,
    savings: 0,
    employerMatch: 0,
    calculationDetails: [],
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

  // const income = {
  //   _description: "Income",
  //   wagesTipsAndCompensation: salary,
  //   otherTaxableIncomeAdjustments:
  //     getTaxableIncomeOverride(demographics.age) || 0,
  //   taxableInterestIncome: accountGroup.savings
  //     .depositsForYear(fiscalData.taxYear, TRANSACTION_CATEGORY.INTEREST)
  //     .asCurrency(),
  //   rollingOverIntoSavings: 0,
  //   retirementAccountContributions: accountGroup.trad401k.depositsForYear(
  //     fiscalData.taxYear,
  //     TRANSACTION_CATEGORY.CONTRIBUTION
  //   ),
  //   rothIraContributions: accountGroup.rothIra.depositsForYear(
  //     fiscalData.taxYear,
  //     TRANSACTION_CATEGORY.CONTRIBUTION
  //   ),
  //   federalTaxesOwed: 0,
  //   taxFreeIncomeAdjustment: getTaxFreeIncomeOverride(demographics.age) || 0,
  //   getTaxableIncome() {
  //     return retirementJS_calculateTaxableIncome(
  //       this.getAdjustedGrossIncome(),
  //       taxes.standardDeduction
  //     );
  //   },
  //   spendableIncome: 0,
  //   getAllIncomeSources() {
  //     return (
  //       this.wagesTipsAndCompensation +
  //       this.otherTaxableIncomeAdjustments +
  //       this.taxFreeIncomeAdjustment +
  //       this.taxableInterestIncome
  //     );
  //   },
  //   getGrossIncome() {
  //     return (
  //       this.wagesTipsAndCompensation +
  //       this.otherTaxableIncomeAdjustments +
  //       this.taxableInterestIncome
  //     );
  //   },
  //   getAdjustedGrossIncome() {
  //     return Math.max(
  //       this.getGrossIncome() - this.retirementAccountContributions,
  //       0
  //     );
  //   },
  //   getNetIncome() {
  //     return Math.max(this.getGrossIncome() - this.federalTaxesOwed, 0);
  //   },
  //   getSpendableIncome() {
  //     return Math.max(
  //       this.netIncome() +
  //         this.taxFreeIncomeAdjustment -
  //         this.rothIraContributions,
  //       0
  //     );
  //   },
  // };

  const income = WorkingYearIncome.CreateUsing(
    salary,
    demographics,
    accountGroup,
    fiscalData
  );

  taxes.taxableIncome = income.getAdjustedGrossIncome();

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
  taxes.effectiveTaxRate =
    income.getGrossIncome() > 0
      ? taxes.federalTaxesOwed / income.getGrossIncome()
      : 0;

  income.federalTaxesOwed = taxes.federalTaxesOwed;

  // Money not spent from income goes into savings
  // fiscalData.determineActualSavingsContribution(income.getNetIncome);

  const withdrawals = {
    retirementAccount: accountGroup.trad401k.withdrawalsForYear(
      fiscalData.taxYear
    ),
    savings: accountGroup.savings.withdrawalsForYear(fiscalData.taxYear),
    rothIra: accountGroup.rothIra.withdrawalsForYear(fiscalData.taxYear),
    total() {
      return this.retirementAccount + this.savings + this.rothIra;
    },
  };

  const balances = Balances.Empty();

  // const balances = {
  //   _description: "Account Balances",
  //   savings: 0,
  //   trad401k: 0,
  //   rothIra: 0,
  //   total() {
  //     return this.savings + this.trad401k + this.rothIra;
  //   },
  // };

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

  balances.savings = accountGroup.savings.endingBalanceForYear(
    fiscalData.taxYear
  );
  balances.trad401k = accountGroup.trad401k.endingBalanceForYear(
    fiscalData.taxYear
  );
  balances.rothIra = accountGroup.rothIra.endingBalanceForYear(
    fiscalData.taxYear
  );

  totals.totalIncome = income.getAllIncomeSources();
  totals.totalNetIncome = income.getNetIncome();
  totals.grossTaxableIncome = income.getGrossIncome();
  totals.calculationDetails = withLabel("income", income);

  // Update all the final values in the result object
  contributions.my401k = employmentInfo.cap401kContribution();
  contributions.myRoth = employmentInfo.capRothContribution();
  contributions.savings = accountGroup.savings.depositsForYear(
    fiscalData.taxYear,
    TRANSACTION_CATEGORY.CONTRIBUTION
  );
  contributions.employerMatch = employmentInfo.employer401kMatch();
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
  result.roth = accountGroup.rothIra;
  result.savings = accountGroup.savings;
  result.retirementAccount = accountGroup.trad401k;
  result.fiscalData = fiscalData;

  // Add breakdown data
  result.savingsBreakdown = {
    startingBalance: accountGroup.savings.startingBalanceForYear(
      fiscalData.taxYear
    ),
    withdrawals: accountGroup.savings.withdrawalsForYear(fiscalData.taxYear),
    deposits: accountGroup.savings.depositsForYear(fiscalData.taxYear),
    taxFreeIncomeDeposit: income.taxFreeIncomeAdjustment,
    interestEarned: accountGroup.savings.depositsForYear(
      fiscalData.taxYear,
      TRANSACTION_CATEGORY.INTEREST
    ),
    endingBalance: accountGroup.savings.endingBalanceForYear(
      fiscalData.taxYear
    ),
    growthRate: fiscalData.savingsRateOfReturn,
    calculationDetails: [
      withLabel("savings", accountGroup.savings),
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
