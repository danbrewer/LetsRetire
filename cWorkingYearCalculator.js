/**
 * WorkingYearIncomeCalculator class - Handles working year income and accumulation calculations
 * Provides comprehensive analysis for the accumulation phase of retirement planning
 */
class WorkingYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;

  /**
   * Create working year income calculator with input configuration
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   * @param {AccountYear} accountYear - AccountYear instance containing all accounts
   */
  constructor(inputs, accountYear) {
    this.#inputs = inputs;
    this.accountYear = accountYear;
    this.#demographics = Demographics.CreateUsing(inputs, false, true);
    this.#fiscalData = FiscalData.CreateUsing(this.#inputs, TAX_BASE_YEAR);
  }

  calculateWorkingYearData() {
    // Declare and initialize the result object at the top
    const result = WorkingYearData.CreateEmpty();

    result.accountYear = this.accountYear;

    // debugger;
    const employmentInfo = EmploymentInfo.CreateUsing(
      this.#demographics,
      this.#inputs
    );

    // Create income calculator for tax calculations
    const incomeCalculator = new RetirementIncomeCalculator(
      this.#demographics,
      this.#fiscalData
    );

    // **************
    // Calculations
    // **************
    // debugger;
    this.accountYear.deposit(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.CONTRIBUTION,
      employmentInfo.max401kContribution
    );
    this.accountYear.deposit(
      ACCOUNT_TYPES.TRAD_401K,
      TRANSACTION_CATEGORY.INTEREST,
      this.accountYear.calculateInterestForYear(
        ACCOUNT_TYPES.TRAD_401K,
        INTEREST_CALCULATION_EPOCH.AVERAGE_BALANCE
      )
    );

    const savingsInterestEarned = this.accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.SAVINGS,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    this.accountYear.deposit(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.INTEREST,
      savingsInterestEarned
    );

    this.accountYear.deposit(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.CONTRIBUTION,
      employmentInfo.rothMaxContribution
    );

    const rothInterestEarned = this.accountYear.calculateInterestForYear(
      ACCOUNT_TYPES.TRAD_ROTH,
      INTEREST_CALCULATION_EPOCH.IGNORE_DEPOSITS
    );
    this.accountYear.deposit(
      ACCOUNT_TYPES.TRAD_ROTH,
      TRANSACTION_CATEGORY.INTEREST,
      rothInterestEarned
    );

    const contributions = Contributions.CreateUsing(
      this.accountYear,
      employmentInfo,
      undefined,
      [
        withLabel("employmentInfo", employmentInfo),
        withLabel("accountGroup.savings", this.accountYear),
      ]
    );

    const workingYearIncome = WorkingYearIncome.CreateUsing(
      this.#inputs,
      this.#demographics,
      this.#fiscalData,
      this.accountYear
    );

    const taxes = Taxes.CreateForWorkingYearIncome(
      workingYearIncome,
      this.#fiscalData,
      this.#demographics
    );

    // const standardDeduction = TaxCalculator.getStandardDeduction(
    //   this.#fiscalData,
    //   this.#demographics
    // );

    // const federalIncomeTaxOwed = TaxCalculator.determineFederalIncomeTax(
    //   workingYearIncome.getTaxableIncome(),
    //   this.#fiscalData,
    //   this.#demographics
    // );

    // const taxes = new Taxes(
    //   workingYearIncome.grossIncome,
    //   workingYearIncome.adjustedGrossIncome,
    //   standardDeduction,
    //   workingYearIncome.adjustedGrossIncome - standardDeduction,
    //   federalIncomeTaxOwed,
    //   0
    // );
    // Money not spent from income goes into savings
    // fiscalData.determineActualSavingsContribution(income.getNetIncome);

    const withdrawals = {
      retirementAccount: this.accountYear.getWithdrawals(
        ACCOUNT_TYPES.TRAD_401K
      ),
      savings: this.accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
      rothIra: this.accountYear.getWithdrawals(ACCOUNT_TYPES.TRAD_ROTH),
      total() {
        return this.retirementAccount + this.savings + this.rothIra;
      },
    };

    // const balances = Balances.Empty();

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

    totals.totalIncome = workingYearIncome.allIncomeSources;
    totals.totalNetIncome = workingYearIncome.netIncome;
    totals.grossTaxableIncome = workingYearIncome.grossIncome;
    totals.calculationDetails = withLabel("income", workingYearIncome);

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
    // result.balances = balances;
    result.income = workingYearIncome;
    result.demographics = this.#demographics;
    result.employmentInfo = employmentInfo;
    // result.roth = accountYear.rothIra;
    // result.savings = accountYear.savings;
    // result.retirementAccount = accountYear.trad401k;
    result.fiscalData = this.#fiscalData;

    // Add breakdown data
    result.savingsBreakdown = {
      startingBalance: this.accountYear.getStartingBalance(
        ACCOUNT_TYPES.SAVINGS
      ),
      withdrawals: this.accountYear.getWithdrawals(ACCOUNT_TYPES.SAVINGS),
      deposits: this.accountYear.getDeposits(ACCOUNT_TYPES.SAVINGS),
      taxFreeIncomeDeposit: workingYearIncome.taxFreeIncomeAdjustment,
      interestEarned: this.accountYear.getDeposits(
        ACCOUNT_TYPES.SAVINGS,
        TRANSACTION_CATEGORY.INTEREST
      ),
      endingBalance: this.accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS),
      growthRate: this.#fiscalData.savingsRateOfReturn,
      calculationDetails: [
        withLabel("accountYear", this.accountYear),
        withLabel(
          "income.taxFreeIncomeAdjustment",
          workingYearIncome.taxFreeIncomeAdjustment
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
--- Working Year ${this.#fiscalData.yearIndex + 1} (Age ${this.#demographics.age}) (Year ${this.#demographics.retirementYear}) ---
-----------------------------------------------`;

    return result;
  }
}
