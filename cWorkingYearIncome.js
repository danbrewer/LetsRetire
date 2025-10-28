/**
 * Represents comprehensive income information for a working year in retirement planning.
 *
 * This class encapsulates all income sources, tax calculations, and derived income
 * metrics for a specific working year. It provides methods for calculating taxable
 * income, adjusted gross income, net income, and spendable income based on various
 * income sources, deductions, and tax obligations.
 *
 * @class WorkingYearIncome
 * @since 1.0.0
 */
class WorkingYearIncome {
  /**
   * Creates a new WorkingYearIncome instance with income and tax data.
   *
   * @param {number} [wagesTipsAndCompensation=0] - Primary employment income
   * @param {number} [otherTaxableIncomeAdjustments=0] - Additional taxable income adjustments
   * @param {number} [taxableInterestIncome=0] - Interest income from taxable accounts
   * @param {number} [rollingOverIntoSavings=0] - Amount rolling over into savings
   * @param {number} [retirementAccountContributions=0] - Pretax retirement contributions
   * @param {number} [rothIraContributions=0] - After-tax Roth IRA contributions
   * @param {number} [federalTaxesOwed=0] - Federal tax liability
   * @param {number} [taxFreeIncomeAdjustment=0] - Tax-free income adjustments
   * @param {number} [spendableIncome=0] - Available spendable income
   * @param {string} [description="Income"] - Descriptive label
   */
  constructor(
    wagesTipsAndCompensation = 0,
    otherTaxableIncomeAdjustments = 0,
    taxableInterestIncome = 0,
    rollingOverIntoSavings = 0,
    retirementAccountContributions = 0,
    rothIraContributions = 0,
    federalTaxesOwed = 0,
    taxFreeIncomeAdjustment = 0,
    spendableIncome = 0,
    description = "Income"
  ) {
    this._description = description;
    this.wagesTipsAndCompensation = wagesTipsAndCompensation;
    this.otherTaxableIncomeAdjustments = otherTaxableIncomeAdjustments;
    this.taxableInterestIncome = taxableInterestIncome;
    this.rollingOverIntoSavings = rollingOverIntoSavings;
    this.retirementAccountContributions = retirementAccountContributions;
    this.rothIraContributions = rothIraContributions;
    this.federalTaxesOwed = federalTaxesOwed;
    this.taxFreeIncomeAdjustment = taxFreeIncomeAdjustment;
    this.spendableIncome = spendableIncome;
  }

  /**
   * Gets the descriptive label for this income data.
   *
   * @returns {string} Description of the income data
   */
  get description() {
    return this._description;
  }

  /**
   * Sets a new description for this income data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  /**
   * Calculates the taxable income using standard tax calculation methods.
   *
   * This method calls the global retirementJS_calculateTaxableIncome function
   * if available, otherwise calculates a basic taxable income.
   *
   * @param {number} [standardDeduction=0] - Standard deduction amount
   * @returns {number} Calculated taxable income
   */
  getTaxableIncome(standardDeduction = 0) {
    const adjustedGrossIncome = this.getAdjustedGrossIncome();

    // Use global tax calculation function if available
    if (typeof retirementJS_calculateTaxableIncome === "function") {
      return retirementJS_calculateTaxableIncome(
        adjustedGrossIncome,
        standardDeduction
      );
    }

    // Fallback calculation
    return Math.max(adjustedGrossIncome - standardDeduction, 0);
  }

  /**
   * Calculates total income from all sources including tax-free adjustments.
   *
   * @returns {number} Total income from all sources
   */
  getAllIncomeSources() {
    return (
      this.wagesTipsAndCompensation +
      this.otherTaxableIncomeAdjustments +
      this.taxFreeIncomeAdjustment +
      this.taxableInterestIncome
    );
  }

  /**
   * Calculates gross income from taxable sources only.
   *
   * @returns {number} Gross taxable income before deductions
   */
  getGrossIncome() {
    return (
      this.wagesTipsAndCompensation +
      this.otherTaxableIncomeAdjustments +
      this.taxableInterestIncome
    );
  }

  /**
   * Calculates adjusted gross income after retirement account contributions.
   *
   * @returns {number} Adjusted gross income (AGI)
   */
  getAdjustedGrossIncome() {
    return Math.max(
      this.getGrossIncome() - this.retirementAccountContributions,
      0
    );
  }

  /**
   * Calculates net income after federal taxes.
   *
   * @returns {number} Net income after taxes
   */
  getNetIncome() {
    return Math.max(this.getGrossIncome() - this.federalTaxesOwed, 0);
  }

  /**
   * Calculates spendable income after all deductions and contributions.
   *
   * This represents the actual amount available for spending after taxes,
   * retirement contributions, and other deductions.
   *
   * @returns {number} Available spendable income
   */
  getSpendableIncome() {
    return Math.max(
      this.getNetIncome() +
        this.taxFreeIncomeAdjustment -
        this.rothIraContributions,
      0
    );
  }

  /**
   * Calculates the effective tax rate based on gross income and taxes owed.
   *
   * @returns {number} Effective tax rate as decimal (e.g., 0.22 for 22%)
   */
  getEffectiveTaxRate() {
    const grossIncome = this.getGrossIncome();
    if (grossIncome <= 0) return 0;
    return this.federalTaxesOwed / grossIncome;
  }

  /**
   * Calculates the savings rate based on retirement contributions and gross income.
   *
   * @returns {number} Savings rate as decimal (e.g., 0.15 for 15%)
   */
  getSavingsRate() {
    const grossIncome = this.getGrossIncome();
    if (grossIncome <= 0) return 0;
    return (
      (this.retirementAccountContributions + this.rothIraContributions) /
      grossIncome
    );
  }

  /**
   * Calculates the percentage of gross income that is spendable.
   *
   * @returns {number} Spendable income rate as decimal
   */
  getSpendableIncomeRate() {
    const grossIncome = this.getGrossIncome();
    if (grossIncome <= 0) return 0;
    return this.getSpendableIncome() / grossIncome;
  }

  /**
   * Gets the breakdown of income by category as percentages of gross income.
   *
   * @returns {Object} Income breakdown containing:
   *   - wages: Wages as percentage of gross
   *   - otherTaxable: Other taxable income as percentage
   *   - interest: Interest income as percentage
   *   - taxFree: Tax-free adjustments as percentage
   */
  getIncomeBreakdown() {
    const grossIncome = this.getGrossIncome();
    const allIncome = this.getAllIncomeSources();

    return {
      wages: grossIncome > 0 ? this.wagesTipsAndCompensation / grossIncome : 0,
      otherTaxable:
        grossIncome > 0 ? this.otherTaxableIncomeAdjustments / grossIncome : 0,
      interest: grossIncome > 0 ? this.taxableInterestIncome / grossIncome : 0,
      taxFree: allIncome > 0 ? this.taxFreeIncomeAdjustment / allIncome : 0,
    };
  }

  /**
   * Validates income data for logical consistency.
   *
   * @returns {Object} Validation result containing:
   *   - isValid: Whether all values are valid
   *   - errors: Array of validation error messages
   */
  validate() {
    const errors = [];

    if (this.wagesTipsAndCompensation < 0) {
      errors.push("Wages, tips and compensation cannot be negative");
    }

    if (this.taxableInterestIncome < 0) {
      errors.push("Taxable interest income cannot be negative");
    }

    if (this.retirementAccountContributions < 0) {
      errors.push("Retirement account contributions cannot be negative");
    }

    if (this.rothIraContributions < 0) {
      errors.push("Roth IRA contributions cannot be negative");
    }

    if (this.federalTaxesOwed < 0) {
      errors.push("Federal taxes owed cannot be negative");
    }

    // Check if contributions exceed gross income by a reasonable margin
    const totalContributions =
      this.retirementAccountContributions + this.rothIraContributions;
    const grossIncome = this.getGrossIncome();
    if (totalContributions > grossIncome * 1.5) {
      errors.push(
        "Total retirement contributions seem unusually high relative to gross income"
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Creates a comprehensive summary of income data and calculations.
   *
   * @param {number} [standardDeduction=0] - Standard deduction for tax calculation
   * @returns {Object} Summary containing all income metrics and calculations
   */
  getSummary(standardDeduction = 0) {
    const incomeBreakdown = this.getIncomeBreakdown();
    const validation = this.validate();

    return {
      // Raw income sources
      wagesTipsAndCompensation: this.wagesTipsAndCompensation,
      otherTaxableIncomeAdjustments: this.otherTaxableIncomeAdjustments,
      taxableInterestIncome: this.taxableInterestIncome,
      taxFreeIncomeAdjustment: this.taxFreeIncomeAdjustment,

      // Calculated income metrics
      allIncomeSources: this.getAllIncomeSources(),
      grossIncome: this.getGrossIncome(),
      adjustedGrossIncome: this.getAdjustedGrossIncome(),
      taxableIncome: this.getTaxableIncome(standardDeduction),
      netIncome: this.getNetIncome(),
      spendableIncome: this.getSpendableIncome(),

      // Deductions and contributions
      retirementAccountContributions: this.retirementAccountContributions,
      rothIraContributions: this.rothIraContributions,
      federalTaxesOwed: this.federalTaxesOwed,

      // Calculated rates
      effectiveTaxRate: (this.getEffectiveTaxRate() * 100).toFixed(2) + "%",
      savingsRate: (this.getSavingsRate() * 100).toFixed(2) + "%",
      spendableIncomeRate:
        (this.getSpendableIncomeRate() * 100).toFixed(2) + "%",

      // Breakdown and validation
      incomeBreakdown: incomeBreakdown,
      validation: validation,
    };
  }

  /**
   * Updates income values for corrections or adjustments.
   *
   * @param {Object} updates - Object containing income updates:
   * @param {number} [updates.wagesTipsAndCompensation] - New wages amount
   * @param {number} [updates.otherTaxableIncomeAdjustments] - New other taxable income
   * @param {number} [updates.taxableInterestIncome] - New interest income
   * @param {number} [updates.rollingOverIntoSavings] - New rollover amount
   * @param {number} [updates.retirementAccountContributions] - New retirement contributions
   * @param {number} [updates.rothIraContributions] - New Roth contributions
   * @param {number} [updates.federalTaxesOwed] - New federal taxes
   * @param {number} [updates.taxFreeIncomeAdjustment] - New tax-free adjustments
   * @param {number} [updates.spendableIncome] - New spendable income
   */
  updateIncome(updates) {
    if (updates.wagesTipsAndCompensation !== undefined) {
      this.wagesTipsAndCompensation = updates.wagesTipsAndCompensation;
    }
    if (updates.otherTaxableIncomeAdjustments !== undefined) {
      this.otherTaxableIncomeAdjustments =
        updates.otherTaxableIncomeAdjustments;
    }
    if (updates.taxableInterestIncome !== undefined) {
      this.taxableInterestIncome = updates.taxableInterestIncome;
    }
    if (updates.rollingOverIntoSavings !== undefined) {
      this.rollingOverIntoSavings = updates.rollingOverIntoSavings;
    }
    if (updates.retirementAccountContributions !== undefined) {
      this.retirementAccountContributions =
        updates.retirementAccountContributions;
    }
    if (updates.rothIraContributions !== undefined) {
      this.rothIraContributions = updates.rothIraContributions;
    }
    if (updates.federalTaxesOwed !== undefined) {
      this.federalTaxesOwed = updates.federalTaxesOwed;
    }
    if (updates.taxFreeIncomeAdjustment !== undefined) {
      this.taxFreeIncomeAdjustment = updates.taxFreeIncomeAdjustment;
    }
    if (updates.spendableIncome !== undefined) {
      this.spendableIncome = updates.spendableIncome;
    }
  }

  /**
   * Factory method to create a WorkingYearIncome from account data and demographics.
   *
   * This method provides a convenient way to construct WorkingYearIncome objects
   * by extracting data from account groups, fiscal data, and demographic information.
   *
   * @param {number} salary - Annual salary amount
   * @param {Demographics} demographics - Demographic information including age
   * @param {AccountGroup} accountGroup - Account group with savings and retirement accounts
   * @param {FiscalData} fiscalData - Fiscal data containing the target tax year
   * @param {string} [description="Income"] - Optional description
   *
   * @returns {WorkingYearIncome} A new income instance with account-derived data
   *
   * @example
   * // Create income from account data
   * const accountGroup = AccountGroup.CreateUsing(accountData);
   * const demographics = Demographics.CreateUsing(demoData);
   * const fiscalData = FiscalData.CreateUsing(inputs, 2024);
   *
   * const income = WorkingYearIncome.CreateUsing(
   *   75000,
   *   demographics,
   *   accountGroup,
   *   fiscalData
   * );
   *
   * @static
   * @since 1.0.0
   */
  static CreateUsing(
    salary,
    demographics,
    accountGroup,
    fiscalData,
    description = "Income"
  ) {
    // Get taxable income override if function exists
    let otherTaxableIncomeAdjustments = 0;
    if (typeof getTaxableIncomeOverride === "function") {
      otherTaxableIncomeAdjustments =
        getTaxableIncomeOverride(demographics.age) || 0;
    }

    // Get tax-free income override if function exists
    let taxFreeIncomeAdjustment = 0;
    if (typeof getTaxFreeIncomeOverride === "function") {
      taxFreeIncomeAdjustment = getTaxFreeIncomeOverride(demographics.age) || 0;
    }

    // Get interest income from savings account
    let taxableInterestIncome = 0;
    if (
      accountGroup.savings &&
      typeof accountGroup.savings.depositsForYear === "function"
    ) {
      const interestCategory =
        typeof TRANSACTION_CATEGORY !== "undefined"
          ? TRANSACTION_CATEGORY.INTEREST
          : "interest";
      const interestAmount = accountGroup.savings.depositsForYear(
        fiscalData.taxYear,
        interestCategory
      );
      taxableInterestIncome =
        typeof interestAmount.asCurrency === "function"
          ? interestAmount.asCurrency()
          : interestAmount;
    }

    // Get retirement account contributions
    let retirementAccountContributions = 0;
    if (
      accountGroup.trad401k &&
      typeof accountGroup.trad401k.depositsForYear === "function"
    ) {
      const contributionCategory =
        typeof TRANSACTION_CATEGORY !== "undefined"
          ? TRANSACTION_CATEGORY.CONTRIBUTION
          : "contribution";
      retirementAccountContributions = accountGroup.trad401k.depositsForYear(
        fiscalData.taxYear,
        contributionCategory
      );
    }

    // Get Roth IRA contributions
    let rothIraContributions = 0;
    if (
      accountGroup.rothIra &&
      typeof accountGroup.rothIra.depositsForYear === "function"
    ) {
      const contributionCategory =
        typeof TRANSACTION_CATEGORY !== "undefined"
          ? TRANSACTION_CATEGORY.CONTRIBUTION
          : "contribution";
      rothIraContributions = accountGroup.rothIra.depositsForYear(
        fiscalData.taxYear,
        contributionCategory
      );
    }

    return new WorkingYearIncome(
      salary,
      otherTaxableIncomeAdjustments,
      taxableInterestIncome,
      0, // rollingOverIntoSavings
      retirementAccountContributions,
      rothIraContributions,
      0, // federalTaxesOwed - to be calculated separately
      taxFreeIncomeAdjustment,
      0, // spendableIncome - to be calculated separately
      description
    );
  }

  /**
   * Factory method to create a WorkingYearIncome from individual values.
   *
   * @param {number} wages - Wages, tips and compensation
   * @param {number} otherTaxable - Other taxable income adjustments
   * @param {number} interest - Taxable interest income
   * @param {number} retirementContrib - Retirement account contributions
   * @param {number} rothContrib - Roth IRA contributions
   * @param {number} taxes - Federal taxes owed
   * @param {number} [taxFree=0] - Tax-free income adjustments
   * @param {string} [description="Income"] - Optional description
   *
   * @returns {WorkingYearIncome} A new income instance with specified values
   *
   * @example
   * // Create income from known values
   * const income = WorkingYearIncome.CreateFrom(
   *   80000, // wages
   *   5000,  // other taxable
   *   1200,  // interest
   *   8000,  // retirement contributions
   *   6000,  // Roth contributions
   *   15000  // federal taxes
   * );
   *
   * @static
   * @since 1.0.0
   */
  static CreateFrom(
    wages,
    otherTaxable,
    interest,
    retirementContrib,
    rothContrib,
    taxes,
    taxFree = 0,
    description = "Income"
  ) {
    return new WorkingYearIncome(
      wages,
      otherTaxable,
      interest,
      0, // rollingOverIntoSavings
      retirementContrib,
      rothContrib,
      taxes,
      taxFree,
      0, // spendableIncome - calculated separately
      description
    );
  }

  /**
   * Factory method to create an empty WorkingYearIncome instance.
   *
   * @param {string} [description="Income"] - Optional description
   * @returns {WorkingYearIncome} A new income instance with zero values
   *
   * @example
   * // Create empty income for later population
   * const income = WorkingYearIncome.Empty();
   * income.updateIncome({
   *   wagesTipsAndCompensation: 70000,
   *   retirementAccountContributions: 7000
   * });
   *
   * @static
   * @since 1.0.0
   */
  static Empty(description = "Income") {
    return new WorkingYearIncome(0, 0, 0, 0, 0, 0, 0, 0, 0, description);
  }
}

// Maintain backward compatibility - this will need salary, demographics, accountGroup, and fiscalData context
// const income = WorkingYearIncome.CreateUsing(salary, demographics, accountGroup, fiscalData);
