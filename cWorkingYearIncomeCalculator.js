/**
 * WorkingYearIncomeCalculator class - Handles working year income and accumulation calculations
 * Provides comprehensive analysis for the accumulation phase of retirement planning
 */
class WorkingYearIncomeCalculator {
  /** @type {Inputs} */
  #inputs;

  /**
   * Create working year income calculator with input configuration
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   */
  constructor(inputs) {
    this.#inputs = inputs;
  }

  /**
   * Calculate one year of accumulation phase (working years)
   * @param {number} salary - Annual salary for this year
   * @param {AccountYear} accountYear - AccountYear instance containing all accounts
   * @returns {WorkingYearData} Comprehensive working year calculation results
   */
  calculateWorkingYearData(salary, accountYear) {
    // Declare and initialize the result object at the top
    const result = WorkingYearData.CreateEmpty();

    // debugger;
    const fiscalData = FiscalData.CreateUsing(this.#inputs, TAX_BASE_YEAR);
    const demographics = Demographics.CreateUsing(this.#inputs, false, true);
    const employmentInfo = EmploymentInfo.CreateUsing(
      demographics,
      salary,
      this.#inputs
    );

    // Create income calculator for tax calculations
    const incomeCalculator = new RetirementIncomeCalculator(
      demographics,
      fiscalData
    );

    // **************
    // Calculations
    // **************
    // debugger;
    accountYear.deposit(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.CONTRIBUTION,
      employmentInfo.max401kContribution
    );
    accountYear.deposit(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.INTEREST,
      accountYear.calculateInterestForYear(
        ACCOUNT_TYPES.TRAD_401K,
        INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE
      )
    );

    const savingsInterestEarned = accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.SAVINGS,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    accountYear.deposit(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.INTEREST,
      savingsInterestEarned
    );

    accountYear.deposit(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.CONTRIBUTION,
      employmentInfo.rothMaxContribution
    );

    const rothInterestEarned = accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.TRAD_ROTH,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    accountYear.deposit(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.INTEREST,
      rothInterestEarned
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
      accountYear
    );

    taxes.taxableIncome = income.adjustedGrossIncome;

    taxes.standardDeduction = incomeCalculator.getStandardDeduction();

    taxes.federalTaxesOwed = incomeCalculator.calculateFederalTax(
      income.getTaxableIncome()
    );

    income.federalTaxesOwed = taxes.federalTaxesOwed;

    // Money not spent from income goes into savings
    // fiscalData.determineActualSavingsContribution(income.getNetIncome);

    const withdrawals = {
      retirementAccount: accountYear.getWithdrawals(ACCOUNT_TYPES.TRAD_401K),
      savings: accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
      rothIra: accountYear.getWithdrawals(ACCOUNT_TYPES.TRAD_ROTH),
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
    // result.roth = accountYear.rothIra;
    // result.savings = accountYear.savings;
    // result.retirementAccount = accountYear.trad401k;
    result.fiscalData = fiscalData;

    // Add breakdown data
    result.savingsBreakdown = {
      startingBalance: accountYear.getStartingBalance(ACCOUNT_TYPES.SAVINGS),
      withdrawals: accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
      deposits: accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
      taxFreeIncomeDeposit: income.taxFreeIncomeAdjustment,
      interestEarned: accountYear.getDeposits(
        ACCOUNT_TYPES.SAVINGS,
        TRANSACTION_CATEGORY.INTEREST
      ),
      endingBalance: accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS),
      growthRate: fiscalData.savingsRateOfReturn,
      calculationDetails: [
        withLabel("accountYear", accountYear),
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

  /**
   * Get input configuration
   * @returns {Inputs} - Input configuration object
   */
  getInputs() {
    return this.#inputs;
  }
}
