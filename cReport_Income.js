/**
 * IncomeReport class
 */

import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { BaseReports } from "./cBaseReports.js";
import { TransactionCategory } from "./cTransaction.js";

class IncomeReport extends BaseReports {
  /**
   * Add a disbursement/withdrawal
   * @param {AccountingYear} accountYear
   */
  constructor(accountYear) {
    super(accountYear);
  }

  get wagesAndCompensationGross() {
    return this._accountYear
      .getDeposits(ACCOUNT_TYPES.SUBJECT_WAGES, TransactionCategory.IncomeGross)
      .asCurrency();
  }

  get wagesAndCompensationEstimatedWithholdings() {
    return this._accountYear.analyzers[ACCOUNT_TYPES.WITHHOLDINGS]
      .getTotalDeposits(TransactionCategory.Wages)
      .asCurrency();
  }
}

export { IncomeReport };
