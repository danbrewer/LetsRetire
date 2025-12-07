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
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Inputs} */
  #inputs;
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Taxes | null} */
  #estimatedTaxes = null;

  /** @type {EmploymentInfo} */
  #employmentInfo;

  /** @type {Number | null} */
  #estimatedInterestIncome = null;
  /** @type {Number | null} */
  #estimatedWithholdings = null;

  /** @type {Account} */
  #withholdingsAccount = new Account("withholdings", 0, 0);

  /** @type {Number} */
  #taxesDue = 0;
  /** @type {Number} */
  #netIncome = 0;
  /** @type {Number} */
  #taxOverpayment = 0;
  /** @type {Number} */
  #taxUnderpayment = 0;

  /**
   *
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   * @param {Demographics} demographics - Demographic information for the individual
   * @param {FiscalData} fiscalData - Fiscal data including tax year and inflation rate
   * @param {AccountingYear} accountYear - Account group with savings and retirement accounts
   * @param {string} [description="Income"] - Optional description
   */

  constructor(
    inputs,
    demographics,
    fiscalData,
    accountYear,
    description = "Income"
  ) {
    this.#accountYear = accountYear;
    this.#demographics = demographics;
    this.#inputs = inputs;
    this.#fiscalData = fiscalData;

    this.#employmentInfo = EmploymentInfo.CreateUsing(
      this.#demographics,
      this.#inputs
    );

    this._description = description;
  }

  #getEstimatedInterestIncome() {
    if (this.#estimatedInterestIncome === null) {
      this.#estimatedInterestIncome = this.#accountYear
        .calculateInterestForYear(
          ACCOUNT_TYPES.SAVINGS,
          INTEREST_CALCULATION_EPOCH.ROLLING_BALANCE
        )
        .asCurrency();
    }
    return this.#estimatedInterestIncome;
  }

  #getEstimatedTotalTaxableIncome() {
    return (
      this.wagesTipsAndCompensation -
      this.nonTaxableIncomeReductions +
      this.taxableIncomeAdjustment +
      this.#getEstimatedInterestIncome()
    );
  }

  #getEstimatedWithholdings() {
    const estimatedFederalTax = TaxCalculations.determineFederalIncomeTax(
      this.#getEstimatedTotalTaxableIncome(),
      this.#getEstimatedTotalTaxableIncome(),
      this.#fiscalData,
      this.#demographics
    );

    return estimatedFederalTax.asCurrency();
  }

  /**
   * Validates income data for logical consistency.
   *
   * @returns {Object} Validation result containing:
   *   - isValid: Whether all values are valid
   *   - errors: Array of validation error messages
   */
  #validate() {
    const errors = [];

    if (this.wagesTipsAndCompensation < 0) {
      errors.push("Wages, tips and compensation cannot be negative");
    }

    if (this.actualSavingsInterestEarned < 0) {
      errors.push("Taxable interest income cannot be negative");
    }

    if (this.nonTaxableIncomeReductions < 0) {
      errors.push("Retirement account contributions cannot be negative");
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }

  get wagesTipsAndCompensation() {
    return this.#inputs.wagesandOtherTaxableCompensation;
  }

  get nonTaxableIncomeReductions() {
    return (
      this.#employmentInfo.trad401kContribution +
      this.#employmentInfo.nonTaxableBenefits
    );
  }

  get withholdings() {
    return this.#withholdingsAccount
      .endingBalanceForYear(this.#accountYear.taxYear)
      .asCurrency();
  }

  get actualSavingsInterestEarned() {
    const interestAmount = this.#accountYear.getDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.INTEREST
    );
    return interestAmount.asCurrency();
  }

  get taxableIncomeAdjustment() {
    return this.#inputs.taxableIncomeAdjustment;
  }

  /**
   * Calculates gross income from taxable sources only.
   *
   * @returns {number} Gross taxable income before deductions
   */
  get totalTaxableIncome() {
    return (
      this.wagesTipsAndCompensation -
      this.nonTaxableIncomeReductions +
      this.taxableIncomeAdjustment +
      this.actualSavingsInterestEarned
    );
  }

  get adjustedGrossIncome() {
    return Math.max(
      this.totalTaxableIncome - this.nonTaxableIncomeReductions,
      0
    );
  }

  get taxFreeIncome() {
    return this.#inputs.taxFreeIncomeAdjustment;
  }

  get federalIncomeTaxWithheld() {
    return this.#getEstimatedWithholdings();
  }

  get federalIncomeTaxOwed() {
    return this.#taxesDue;
  }

  get overpayment() {
    return this.#taxOverpayment;
  }

  get underpayment() {
    return this.#taxUnderpayment;
  }

  get netIncome() {
    return this.#netIncome + this.taxFreeIncome;
  }
  get estimatedNetIncome() {
    return Math.max(
      this.#getEstimatedTotalTaxableIncome() - this.#getEstimatedWithholdings(),
      0
    );
  }

  /**
   * Sets a new description for this income data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  estimateWithholdings() {
    const estimatedTaxes = Taxes.CreateFromTaxableIncome(
      this.#getEstimatedTotalTaxableIncome(),
      this.#getEstimatedTotalTaxableIncome(),
      this.#fiscalData,
      this.#demographics
    );

    this.#estimatedTaxes = estimatedTaxes;

    // Estimate tax withholdings
    this.#withholdingsAccount.processAsPeriodicDeposits(
      this.#accountYear.taxYear,
      this.#estimatedTaxes.totalTaxes.asCurrency(),
      TRANSACTION_CATEGORY.TAXES,
      PERIODIC_FREQUENCY.MONTHLY
    );
  }

  reconcileTaxes() {
    const actualTaxes = Taxes.CreateFromTaxableIncome(
      this.totalTaxableIncome,
      this.adjustedGrossIncome,
      this.#fiscalData,
      this.#demographics
    );

    this.#taxesDue = actualTaxes.totalTaxes.asCurrency();

    this.#taxOverpayment = Math.max(
      this.#withholdingsAccount
        .endingBalanceForYear(this.#accountYear.taxYear)
        .asCurrency() - this.#taxesDue,
      0
    );

    this.#taxUnderpayment = Math.max(
      this.#taxesDue -
        this.#withholdingsAccount
          .endingBalanceForYear(this.#accountYear.taxYear)
          .asCurrency(),
      0
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.TAX_REFUND,
      this.#taxOverpayment
    );

    this.#accountYear.withdrawal(
      ACCOUNT_TYPES.SAVINGS,
      TRANSACTION_CATEGORY.TAX_PAYMENT,
      this.#taxUnderpayment
    );

    this.#netIncome = Math.max(this.adjustedGrossIncome - this.#taxesDue, 0);
  }

  /**
   * Factory method to create a WorkingYearIncome from account data and demographics.
   *
   * This method provides a convenient way to construct WorkingYearIncome objects
   * by extracting data from account groups, fiscal data, and demographic information.
   *
   * @param {Inputs} inputs - Annual salary amount
   * @param {Demographics} demographics - Demographic information for the individual
   * @param {FiscalData} fiscalData - Fiscal data including tax year and inflation rate
   * @param {AccountingYear} accountYear - Account group with savings and retirement accounts
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
    inputs,
    demographics,
    fiscalData,
    accountYear,
    description = "Income"
  ) {
    return new WorkingYearIncome(
      inputs,
      demographics,
      fiscalData,
      accountYear,
      description
    );
  }
}
