import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { Inputs } from "./cInputs.js";
import { TransactionCategory } from "./tTransactionCategory.js";

class AdjustableIncomeStreams {
  /** @type {AccountingYear} */
  #accountYear;

  /**
   * @param {AccountingYear} accountYear - Accounts object containing savings and 401k accounts
   */
  constructor(accountYear) {
    this.#accountYear = accountYear;
    this._description = "AdjustableIncomeStreams";
  }

  get subjectActual401kGrossWithdrawal() {
    return (
      this.subject401kActualIncome.asCurrency() +
      this.subject401kWithholdings.asCurrency()
    );
  }

  get subject401kWithholdings() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.SUBJECT_401K,
        TransactionCategory.Withholdings
      )
      .asCurrency();
  }

  get subject401kActualIncome() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SUBJECT_401K, TransactionCategory.IncomeNet)
      .asCurrency();
  }

  get spouseActual401kGrossWithdrawal() {
    return (
      this.spouse401kActualIncome.asCurrency() +
      this.spouse401kWithholdings.asCurrency()
    );
  }

  get spouse401kWithholdings() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.PARTNER_401K,
        TransactionCategory.Withholdings
      )
      .asCurrency();
  }

  get spouse401kActualIncome() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.PARTNER_401K, TransactionCategory.IncomeNet)
      .asCurrency();
  }

  get combined401kGrossWithdrawals() {
    return (
      this.subjectActual401kGrossWithdrawal +
      this.spouseActual401kGrossWithdrawal
    ).asCurrency();
  }

  get combined401kActualIncome() {
    return (
      this.subject401kActualIncome + this.spouse401kActualIncome
    ).asCurrency();
  }

  get savingsWithdrawal() {
    return this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SAVINGS, TransactionCategory.CashTransfer)
      .asCurrency();
  }

  get subjectRothWithdrawal() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
        TransactionCategory.IncomeNet
      )
      .asCurrency();
  }

  get spouseRothWithdrawal() {
    return this.#accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.PARTNER_ROTH_IRA,
        TransactionCategory.IncomeNet
      )
      .asCurrency();
  }

  get combinedRothGrossWithdrawal() {
    return (
      this.subjectRothWithdrawal + this.spouseRothWithdrawal
    ).asCurrency();
  }

  get grossIncomeSubjectToTaxation() {
    return this.combined401kGrossWithdrawals;
  }
}

export { AdjustableIncomeStreams };
