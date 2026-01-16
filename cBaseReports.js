import { AccountingYear } from "./cAccountingYear.js";

class BaseReports {
  /** @type {AccountingYear} */
  _accountYear;

  /**
   * Add a disbursement/withdrawal
   * @param {AccountingYear} accountYear
   */
  constructor(accountYear) {
    this._accountYear = accountYear;
  }
}

export { BaseReports };