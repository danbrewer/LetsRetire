import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { EmploymentInfo } from "./cEmploymentInfo.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";
import { INTEREST_CALCULATION_EPOCH, PERIODIC_FREQUENCY } from "./consts.js";
import { TaxCalculations } from "./cTaxCalculations.js";
import { Taxes } from "./cTaxes.js";
import { TransactionCategory } from "./cTransaction.js";

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

  /** @type {EmploymentInfo} */
  #employmentInfo;

  // /** @type {Number | null} */
  // #estimatedInterestIncome = null;
  /** @type {Number | null} */
  #withholdings = null;

  // /** @type {Account} */
  // #withholdingsAccount =  Account.createWithOpeningBalance(ACCOUNT_TYPES.WITHHOLDINGS, 0, new Date(this.#fiscalData.taxYear, 0, 1), 0);

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
    this.#accountYear = /** @type {AccountingYear} */ (
      Object.freeze(accountYear)
    );
    this.#demographics = /** @type {Demographics} */ (
      Object.freeze(demographics)
    );
    this.#inputs = /** @type {Inputs} */ (Object.freeze(inputs));
    this.#fiscalData = /** @type {FiscalData} */ (Object.freeze(fiscalData));

    this.#employmentInfo = EmploymentInfo.CreateUsing(
      this.#demographics,
      this.#inputs
    );

    this._description = description;
  }
  /* ********* DI'd properties start ********* */
  get accountYear() {
    return this.#accountYear;
  }

  get demographics() {
    return this.#demographics;
  }

  get inputs() {
    return this.#inputs;
  }

  get fiscalData() {
    return this.#fiscalData;
  }
  /* ********* DI'd properties end ********* */

  /**
   * Validates income data for logical consistency.
   *
   * @returns {Object} Validation result containing:
   *   - isValid: Whether all values are valid
   *   - errors: Array of validation error messages
   */
  #validate() {
    const errors = [];

    if (this.grossWagesTipsAndCompensation < 0) {
      errors.push("Wages, tips and compensation cannot be negative");
    }

    if (this.taxableInterestOnSavings < 0) {
      errors.push("Taxable interest income cannot be negative");
    }

    if (this.nonTaxableWagesAndCompensation < 0) {
      errors.push("Retirement account contributions cannot be negative");
    }

    const result = {
      isValid: errors.length === 0,
      errors: errors,
    };
    return result;
  }

  get grossWagesTipsAndCompensation() {
    const result = this.#inputs.taxableWagesandOtherTaxableCompensation;
    return result;
  }

  get nonTaxableWagesAndCompensation() {
    const result =
      this.#employmentInfo.allowed401kContribution +
      this.#employmentInfo.nonTaxableBenefits;
    return result;
  }

  get taxableWagesAndCompensation() {
    const result =
      this.grossWagesTipsAndCompensation - this.nonTaxableWagesAndCompensation;
    return result;
  }

  get taxableIncomeAdjustment() {
    const result = this.#inputs.taxableIncomeAdjustment;
    return result;
  }

  // get estimatedInterestIncome() {
  //   if (this.#estimatedInterestIncome === null) {
  //     this.#estimatedInterestIncome = this.#accountYear
  //       .calculateInterestForYear(
  //         ACCOUNT_TYPES.SAVINGS,
  //         INTEREST_CALCULATION_EPOCH.ROLLING_BALANCE
  //       )
  //       .asCurrency();
  //   }
  //   return this.#estimatedInterestIncome;
  // }

  get taxableIncome() {
    return this.taxableWagesAndCompensation + this.taxableIncomeAdjustment;
  }

  get withholdings() {
    if (this.#withholdings === null) {
      this.calculateWithholdings();
    }
    const result = this.#withholdings ?? 0;
    return result;
  }

  get netIncomeAfterWithholdings() {
    return this.taxableIncome - this.withholdings;
  }

  get totalPreSpendingReductions() {
    return this.annualRothContributions;
  }

  get spendableIncome() {
    return Math.max(
      this.netIncomeAfterWithholdings - this.totalPreSpendingReductions,
      0
    );
  }

  get annualSpend() {
    return this.#fiscalData.spend;
  }

  get surplusSpend() {
    return Math.max(this.spendableIncome - this.annualSpend);
  }

  get taxableInterestOnSavings() {
    const interestAmount = this.#accountYear.getDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Interest
    );
    return interestAmount.asCurrency();
  }

  /**
   * Calculates gross income from taxable sources only.
   *
   * @returns {number} Gross taxable income before deductions
   */
  get totalTaxableIncome() {
    const result =
      this.taxableWagesAndCompensation +
      this.taxableIncomeAdjustment +
      this.taxableInterestOnSavings;
    return result;
  }

  get federalIncomeTaxDue() {
    const result = this.#taxesDue;
    return result;
  }

  get overpayment() {
    const result = this.#taxOverpayment;
    return result;
  }

  get underpayment() {
    const result = this.#taxUnderpayment;
    return result;
  }

  get taxFreeIncome() {
    const result = this.#inputs.taxFreeIncomeAdjustment;
    return result;
  }

  get netIncome() {
    const result = this.#netIncome + this.taxFreeIncome;
    return result;
  }

  /**
   * Sets a new description for this income data.
   *
   * @param {string} newDescription - New descriptive label
   */
  set description(newDescription) {
    this._description = newDescription;
  }

  calculateWithholdings() {
    if (this.#withholdings !== null) {
      return; // Already estimated
    }

    const incomeTaxes = Taxes.CreateFromTaxableIncome(
      this.taxableIncome,
      this.taxableIncome,
      this.#fiscalData,
      this.#demographics
    );

    this.#withholdings = incomeTaxes.federalTaxesOwed.asCurrency();

    // Estimate tax withholdings
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.WITHHOLDINGS,
      TransactionCategory.Taxes,
      this.#withholdings,
      PERIODIC_FREQUENCY.MONTHLY,
      "Estimated tax withholdings"
    );
  }

  reconcileIncomeTaxes() {
    const actualTaxes = Taxes.CreateFromTaxableIncome(
      this.totalTaxableIncome,
      this.totalTaxableIncome,
      this.#fiscalData,
      this.#demographics
    );

    this.#taxesDue = actualTaxes.federalTaxesOwed.asCurrency();

    this.#taxOverpayment = Math.max(
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.WITHHOLDINGS),
      0
    );

    this.#taxUnderpayment = Math.max(
      this.#taxesDue -
        this.#accountYear.getEndingBalance(ACCOUNT_TYPES.WITHHOLDINGS),
      0
    );

    if (this.#taxOverpayment > 0)
      this.#accountYear.deposit(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.TaxRefund,
        this.#taxOverpayment,
        12,
        31
      );

    if (this.#taxUnderpayment > 0)
      this.#accountYear.withdrawal(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.TaxPayment,
        this.#taxUnderpayment,
        12,
        31
      );

    this.#netIncome = Math.max(this.totalTaxableIncome - this.#taxesDue, 0);
  }

  process401kContributions() {
    // Dump any 401k contributions into the Traditional 401k account
    this.accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_401K,
      TransactionCategory.Contribution,
      this.#employmentInfo.allowed401kContribution,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#record401kInterest();
  }

  #record401kInterest() {
    this.accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SUBJECT_401K);
  }

  applySavingsInterest() {
    this.accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
  }

  processRothIraContributions() {
    // Any Roth IRA contributions go into the Roth account
    this.accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      TransactionCategory.Contribution,
      this.annualRothContributions,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
  }

  get annualRothContributions() {
    return Math.min(
      this.#employmentInfo.allowedRothContribution,
      this.netIncome
    );
  }

  processMonthlySpending() {
    // Any income left after spending goes into savings

    if (this.surplusSpend == 0) return;

    // Deposit surplus income into savings account
    this.accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Income,
      this.surplusSpend,
      PERIODIC_FREQUENCY.MONTHLY,
      "spending surplus"
    );
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

export { WorkingYearIncome };
