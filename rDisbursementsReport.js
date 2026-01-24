/**
 * Disbursements class - Tracks withdrawals from savings, 401k, and Roth IRA accounts for a given year
 * Provides detailed tracking of withdrawal amounts, types, and sources
 */

import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { BaseReports } from "./cBaseReports.js";
import { TransactionCategory } from "./cTransaction.js";

class DisbursementsReport extends BaseReports {
  constructor() {
    super();
  }

  // /**
  //  * Get savings disbursements for a year
  //  * @returns {number}
  //  */
  // get fromSavings() {
  //   return this._accountYear
  //     .getWithdrawals(ACCOUNT_TYPES.SAVINGS, TransactionCategory.Disbursement)
  //     .asCurrency();
  // }

  // /**
  //  * Get 401k disbursements for a year
  //  * @returns {number}
  //  */
  // get fromSubject401k() {
  //   return this._accountYear.analyzers[ACCOUNT_TYPES.SUBJECT_401K]
  //     .getTotalWithdrawals()
  //     .asCurrency();
  // }

  // /**
  //  * Get 401k disbursements for a year
  //  * @returns {number}
  //  */
  // get fromPartner401k() {
  //   return this._accountYear.analyzers[ACCOUNT_TYPES.PARTNER_401K]
  //     .getTotalWithdrawals()
  //     .asCurrency();
  // }

  // /**
  //  * Get Roth disbursements for a year
  //  * @returns {number}
  //  */
  // get fromSubjectRoth() {
  //   return this._accountYear.analyzers[ACCOUNT_TYPES.SUBJECT_ROTH_IRA]
  //     .getTotalWithdrawals()
  //     .asCurrency();
  // }

  // get fromPartnerRoth() {
  //   return this._accountYear.analyzers[ACCOUNT_TYPES.PARTNER_ROTH_IRA]
  //     .getTotalWithdrawals()
  //     .asCurrency();
  // }

  // /**
  //  * @param {AccountingYear} accountYear
  //  */
  // static CreateUsing(accountYear) {
  //   return new DisbursementsReport(accountYear);
  // }

  // /**
  //  * Create an empty Disbursements instance
  //  * @returns {Disbursements}
  //  */
  // //   static Empty() {
  // //     return new Disbursements(AccountYear.Empty());
  // //   }
}
