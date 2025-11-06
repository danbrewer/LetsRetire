class Inputs {
  /**
   * @param {number} currentAge - Current age of the person
   * @param {number} currentSpouseAge - Current age of spouse (0 if no spouse)
   * @param {number} retireAge - Age at retirement
   * @param {number} ssStartAge - Age when Social Security benefits start
   * @param {number} penStartAge - Age when pension benefits start
   * @param {number} endAge - Age at end of planning period
   * @param {number} inflation - Annual inflation rate as decimal
   * @param {number} spendingToday - Current annual spending amount
   * @param {number} spendingDecline - Spending decline rate in retirement as decimal
   * @param {number} spouseRetireAge - Spouse retirement age
   * @param {number} spouseSsMonthly - Monthly spouse Social Security benefits
   * @param {number} spouseSsStartAge - Age when spouse SS benefits start
   * @param {number} spouseSsCola - Spouse SS cost of living adjustment as decimal
   * @param {number} spousePenMonthly - Monthly spouse pension benefits
   * @param {number} spousePenStartAge - Age when spouse pension benefits start
   * @param {number} spousePenCola - Spouse pension cost of living adjustment as decimal
   * @param {number} spouseTaxSS - Spouse Social Security tax rate as decimal
   * @param {number} spouseTaxPension - Spouse pension tax rate as decimal
   * @param {number} startingSalary - Starting annual salary
   * @param {number} salaryGrowth - Annual salary growth rate as decimal
   * @param {number} pretaxPct - Pre-tax 401k contribution percentage as decimal
   * @param {number} rothPct - Roth IRA contribution percentage as decimal
   * @param {number} taxablePct - Taxable savings percentage as decimal
   * @param {number} matchCap - Employer match cap percentage as decimal
   * @param {number} matchRate - Employer match rate as decimal
   * @param {number} trad401k - Current traditional 401k balance
   * @param {number} rothIRA - Current Roth IRA balance
   * @param {number} savings - Current savings balance
   * @param {number} ret401k - 401k rate of return as decimal
   * @param {number} retRoth - Roth IRA rate of return as decimal
   * @param {number} retSavings - Savings rate of return as decimal
   * @param {number} ssMonthly - Monthly Social Security benefits
   * @param {number} ssCola - Social Security cost of living adjustment as decimal
   * @param {number} penMonthly - Monthly pension benefits
   * @param {number} penCola - Pension cost of living adjustment as decimal
   * @param {string} filingStatus - Tax filing status
   * @param {boolean} useRMD - Whether to use Required Minimum Distributions
   * @param {string[]} order - Withdrawal order for accounts
   */
  constructor(
    currentAge = 0,
    currentSpouseAge = 0,
    retireAge = 0,
    ssStartAge = 0,
    penStartAge = 0,
    endAge = 0,
    inflation = 0,
    spendingToday = 0,
    spendingDecline = 0,
    spouseRetireAge = 0,
    spouseSsMonthly = 0,
    spouseSsStartAge = 0,
    spouseSsCola = 0,
    spousePenMonthly = 0,
    spousePenStartAge = 0,
    spousePenCola = 0,
    spouseTaxSS = 0,
    spouseTaxPension = 0,
    startingSalary = 0,
    salaryGrowth = 0,
    pretaxPct = 0,
    rothPct = 0,
    taxablePct = 0,
    matchCap = 0,
    matchRate = 0,
    trad401k = 0,
    rothIRA = 0,
    savings = 0,
    ret401k = 0,
    retRoth = 0,
    retSavings = 0,
    ssMonthly = 0,
    ssCola = 0,
    penMonthly = 0,
    penCola = 0,
    filingStatus = "single",
    useRMD = false,
    order = [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.TRAD_401K,
      ACCOUNT_TYPES.TRAD_ROTH,
    ]
  ) {
    // Personal information
    /** @type {number} */
    this.currentAge = currentAge;

    /** @type {number} */
    this.currentSpouseAge = currentSpouseAge;

    /** @type {number} */
    this.retireAge = retireAge;

    /** @type {number} */
    this.ssStartAge = ssStartAge;

    /** @type {number} */
    this.penStartAge = penStartAge;

    /** @type {number} */
    this.endAge = endAge;

    /** @type {number} */
    this.inflation = inflation;

    /** @type {number} */
    this.spendingToday = spendingToday;

    /** @type {number} */
    this.spendingDecline = spendingDecline;

    // Spouse information
    /** @type {number} */
    this.spouseRetireAge = spouseRetireAge;

    /** @type {number} */
    this.spouseSsMonthly = spouseSsMonthly;

    /** @type {number} */
    this.spouseSsStartAge = spouseSsStartAge;

    /** @type {number} */
    this.spouseSsCola = spouseSsCola;

    /** @type {number} */
    this.spousePenMonthly = spousePenMonthly;

    /** @type {number} */
    this.spousePenStartAge = spousePenStartAge;

    /** @type {number} */
    this.spousePenCola = spousePenCola;

    /** @type {number} */
    this.spouseTaxSS = spouseTaxSS;

    /** @type {number} */
    this.spouseTaxPension = spouseTaxPension;

    // Employment and contributions
    /** @type {number} */
    this.startingSalary = startingSalary;

    /** @type {number} */
    this.salaryGrowth = salaryGrowth;

    /** @type {number} */
    this.pretaxPct = pretaxPct;

    /** @type {number} */
    this.rothPct = rothPct;

    /** @type {number} */
    this.taxablePct = taxablePct;

    /** @type {number} */
    this.matchCap = matchCap;

    /** @type {number} */
    this.matchRate = matchRate;

    // Account balances and returns
    /** @type {number} */
    this.trad401k = trad401k;

    /** @type {number} */
    this.rothIRA = rothIRA;

    /** @type {number} */
    this.savings = savings;

    /** @type {number} */
    this.ret401k = ret401k;

    /** @type {number} */
    this.retRoth = retRoth;

    /** @type {number} */
    this.retSavings = retSavings;

    // Income sources
    /** @type {number} */
    this.ssMonthly = ssMonthly;

    /** @type {number} */
    this.ssCola = ssCola;

    /** @type {number} */
    this.penMonthly = penMonthly;

    /** @type {number} */
    this.penCola = penCola;

    // Tax rates and settings
    /** @type {string} */
    this.filingStatus = filingStatus;

    /** @type {boolean} */
    this.useRMD = useRMD;

    /** @type {string[]} */
    this.order = order;

    /** @type {number} */
    this.totalWorkingYears = 0;
    /** @type {number} */
    this.totalLivingYears = 0;
    /** @type {boolean} */
    this.hasSpouse = false;
    /** @type {number} */
    this.spendAtRetire = 0;
    /** @type {number} */
    this.additionalSpending = 0;
    /** @type {number} */
    this.spend = 0;
    /** @type {number} */
    this.taxableIncomeAdjustment = 0;
    /** @type {number} */
    this.taxFreeIncomeAdjustment = 0;
    /** @type {number} */
    this.otherTaxableIncomeAdjustments = 0;

    /** @type {number} */
    this.savingsUseAge = this.retireAge;
    /** @type {number} */
    this.trad401kUseAge = this.retireAge;
    /** @type {number} */
    this.rothUseAge = this.retireAge;

    /** @type {boolean} */
    this.useSavings = false;
    /** @type {boolean} */
    this.useTrad401k = false;
    /** @type {boolean} */
    this.useRoth = false;

    /** @type {number} */
    this.retirementYear = 0;
    /** @type {number} */
    this.age = 0;
    /** @type {number} */
    this.yearIndex = 0;
    /** @type {number} */
    this.spouseAge = 0;

    // Calculate derived values
    this.#calculateDerivedValues();
  }

  /**
   * Private method to calculate derived values
   */
  #calculateDerivedValues() {
    /** @type {boolean} */
    this.hasSpouse = this.currentSpouseAge > 0;

    /** @type {number} */
    this.totalWorkingYears = this.retireAge - this.currentAge;

    /** @type {number} */
    this.totalLivingYears = this.endAge - this.currentAge;

    /** @type {number} */
    this.spendAtRetire =
      this.spendingToday *
      compoundedRate(this.inflation, this.totalWorkingYears);
  }

  // Utility methods for input validation and analysis
  isValid() {
    return this.retireAge <= this.currentAge || this.endAge <= this.retireAge;
  }

  hasValidAges() {
    return (
      this.currentAge > 0 &&
      this.retireAge > this.currentAge &&
      this.endAge > this.retireAge
    );
  }

  hasValidFinancials() {
    return (
      this.inflation >= 0 &&
      this.spendingToday >= 0 &&
      this.ret401k >= 0 &&
      this.retRoth >= 0 &&
      this.retSavings >= 0
    );
  }

  getWorkingYearsRemaining() {
    return Math.max(0, this.totalWorkingYears);
  }

  getRetirementYearsRemaining() {
    return Math.max(0, this.endAge - this.retireAge);
  }

  getTotalAccountBalance() {
    return this.trad401k + this.rothIRA + this.savings;
  }

  getTotalMonthlyBenefits() {
    return (
      this.ssMonthly +
      this.penMonthly +
      this.spouseSsMonthly +
      this.spousePenMonthly
    );
  }

  getTotalAnnualBenefits() {
    return this.getTotalMonthlyBenefits() * 12;
  }

  getInputSummary() {
    return {
      personal: {
        currentAge: this.currentAge,
        retireAge: this.retireAge,
        endAge: this.endAge,
        hasSpouse: this.hasSpouse,
      },
      financial: {
        spendingToday: this.spendingToday,
        inflation: this.inflation,
        totalAccountBalance: this.getTotalAccountBalance(),
        totalAnnualBenefits: this.getTotalAnnualBenefits(),
      },
      timeline: {
        workingYearsRemaining: this.getWorkingYearsRemaining(),
        retirementYearsRemaining: this.getRetirementYearsRemaining(),
        totalLivingYears: this.totalLivingYears,
      },
    };
  }
}
