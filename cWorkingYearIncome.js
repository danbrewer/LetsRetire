import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { EmploymentInfo } from "./cEmploymentInfo.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
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
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;

  /** @type {Number | null} */
  #withholdings = null;

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
   * @param {FixedIncomeStreams} fixedIncomeStreams - Input configuration object containing salary, contribution rates, etc.
   * @param {Demographics} demographics - Demographic information for the individual
   * @param {FiscalData} fiscalData - Fiscal data including tax year and inflation rate
   * @param {AccountingYear} accountYear - Account group with savings and retirement accounts
   * @param {string} [description="Income"] - Optional description
   */

  constructor(
    fixedIncomeStreams,
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
    this.#fiscalData = /** @type {FiscalData} */ (Object.freeze(fiscalData));

    this.#fixedIncomeStreams = fixedIncomeStreams;

    this._description = description;
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

    if (this.combinedGrossWagesTipsAndCompensation < 0) {
      errors.push("Wages, tips and compensation cannot be negative");
    }

    if (this.taxableInterestOnSavings < 0) {
      errors.push("Taxable interest income cannot be negative");
    }

    if (this.combinedNonTaxableWagesAndCompensation < 0) {
      errors.push("Retirement account contributions cannot be negative");
    }

    const result = {
      isValid: errors.length === 0,
      errors: errors,
    };
    return result;
  }

  get combinedGrossWagesTipsAndCompensation() {
    const result = this.#fixedIncomeStreams.combinedWagesAndCompensationGross;
    return result;
  }

  get combinedNonTaxableWagesAndCompensation() {
    const result =
      this.#fixedIncomeStreams.subjectWagesAndCompensationNonTaxable +
      this.#fixedIncomeStreams.partnerWagesAndCompensationNonTaxable;
    return result;
  }

  get taxableWagesAndCompensation() {
    const result = this.#fixedIncomeStreams.combinedWagesAndCompensationGross;
    return result;
  }

  get taxableIncomeAdjustment() {
    const result = this.#fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings;
    return result;
  }

  get taxableIncome() {
    return this.#fixedIncomeStreams.taxableIncome; // this.taxableWagesAndCompensation + this.taxableIncomeAdjustment;
  }

  // get withholdings() {
  //   if (this.#withholdings === null) {
  //     this.calculateWithholdings();
  //   }
  //   const result = this.#withholdings ?? 0;
  //   return result;
  // }

  // get netIncomeAfterWithholdings() {
  //   return this.taxableIncome - this.withholdings;
  // }

  get totalPreSpendingReductions() {
    return this.annualRothContributions;
  }

  // get spendableIncome() {
  //   return Math.max(
  //     this.netIncomeAfterWithholdings - this.totalPreSpendingReductions,
  //     0
  //   );
  // }

  get annualSpend() {
    return this.#fiscalData.spend;
  }

  // get surplusSpend() {
  //   return Math.max(this.spendableIncome - this.annualSpend);
  // }

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
    const result = this.#fixedIncomeStreams.taxFreeIncomeAdjustment;
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

  get annualRothContributions() {
    return Math.min(
      this.#fixedIncomeStreams.subjectAllowedRothContribution,
      this.netIncome
    );
  }

  /**
   * Factory method to create a WorkingYearIncome from account data and demographics.
   *
   * This method provides a convenient way to construct WorkingYearIncome objects
   * by extracting data from account groups, fiscal data, and demographic information.
   *
   * @param {FixedIncomeStreams} fixedIncomeStreams - Annual salary amount
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
    fixedIncomeStreams,
    demographics,
    fiscalData,
    accountYear,
    description = "Income"
  ) {
    return new WorkingYearIncome(
      fixedIncomeStreams,
      demographics,
      fiscalData,
      accountYear,
      description
    );
  }
}

export { WorkingYearIncome };
