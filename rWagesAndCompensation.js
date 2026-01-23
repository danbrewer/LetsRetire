/**
 * IncomeReport class
 */

import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { BaseReports } from "./cBaseReports.js";
import { TransactionCategory } from "./cTransaction.js";

class WagesAndCompensationReport extends BaseReports {
  /**
   * Add a disbursement/withdrawal
   * @param {AccountingYear} accountYear
   */
  constructor(accountYear) {
    super(accountYear);
  }

  get subjectWagesAndCompensationGross() {
    return this._accountYear
      .getDeposits(ACCOUNT_TYPES.SUBJECT_WAGES, TransactionCategory.IncomeGross)
      .asCurrency();
  }

  get partnerWagesAndCompensationGross() {
    return this._accountYear
      .getDeposits(ACCOUNT_TYPES.PARTNER_WAGES, TransactionCategory.IncomeGross)
      .asCurrency();
  }

  get combinedWagesAndCompensationGross() {
    return (
      this.subjectWagesAndCompensationGross +
      this.partnerWagesAndCompensationGross
    );
  }

  get subjectWagesAndCompensationWithholdings() {
    return this._accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        TransactionCategory.Withholdings
      )
      .asCurrency();
  }

  get partnerWagesAndCompensationWithholdings() {
    return this._accountYear
      .getWithdrawals(
        ACCOUNT_TYPES.PARTNER_WAGES,
        TransactionCategory.Withholdings
      )
      .asCurrency();
  }

  get combinedWagesAndCompensationWithholdings() {
    return (
      this.subjectWagesAndCompensationWithholdings +
      this.partnerWagesAndCompensationWithholdings
    );
  }

  get subjectWagesAndCompensationNet() {
    return (
      this.subjectWagesAndCompensationGross -
      this.subjectWagesAndCompensationWithholdings
    );
  }

  get partnerWagesAndCompensationNet() {
    return (
      this.partnerWagesAndCompensationGross -
      this.partnerWagesAndCompensationWithholdings
    );
  }

  get combinedWagesAndCompensationNet() {
    return (
      this.subjectWagesAndCompensationNet + this.partnerWagesAndCompensationNet
    );
  }
}

export { WagesAndCompensationReport };
