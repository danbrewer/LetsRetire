/**
 * IncomeReport class
 */

import { ReportingYear } from "./cReporting.js";

class WagesAndCompensationReport {
  constructor() {
    this.subjectGrossIncome = 0;
    this.subject401kContribution = 0;
    this.subjectEstimatedWithholdings = 0;
    this.subjectNonTaxableSalaryReductions = 0;
    this.subjectActualIncome = 0;
    this.partnerGrossIncome = 0;
    this.partner401kContribution = 0;
    this.partnerNonTaxableSalaryReductions = 0;
    this.partnerEstimatedWithholdings = 0;
    this.partnerActualIncome = 0;
  }

  // get subjectWagesAndCompensationGross() {
  //   return this._accountYear
  //     .deposits(ACCOUNT_TYPES.SUBJECT_WAGES, TransactionCategory.IncomeGross)
  //     .asCurrency();
  // }

  // get partnerWagesAndCompensationGross() {
  //   return this._accountYear
  //     .getDeposits(ACCOUNT_TYPES.PARTNER_WAGES, TransactionCategory.IncomeGross)
  //     .asCurrency();
  // }

  // get combinedWagesAndCompensationGross() {
  //   return (
  //     this.subjectWagesAndCompensationGross +
  //     this.partnerWagesAndCompensationGross
  //   );
  // }

  // get subjectWagesAndCompensationWithholdings() {
  //   return this._accountYear
  //     .getWithdrawals(
  //       ACCOUNT_TYPES.SUBJECT_WAGES,
  //       TransactionCategory.Withholdings
  //     )
  //     .asCurrency();
  // }

  // get partnerWagesAndCompensationWithholdings() {
  //   return this._accountYear
  //     .getWithdrawals(
  //       ACCOUNT_TYPES.PARTNER_WAGES,
  //       TransactionCategory.Withholdings
  //     )
  //     .asCurrency();
  // }

  // get combinedWagesAndCompensationWithholdings() {
  //   return (
  //     this.subjectWagesAndCompensationWithholdings +
  //     this.partnerWagesAndCompensationWithholdings
  //   );
  // }

  // get subjectWagesAndCompensationNet() {
  //   return (
  //     this.subjectWagesAndCompensationGross -
  //     this.subjectWagesAndCompensationWithholdings
  //   );
  // }

  // get partnerWagesAndCompensationNet() {
  //   return (
  //     this.partnerWagesAndCompensationGross -
  //     this.partnerWagesAndCompensationWithholdings
  //   );
  // }

  // get combinedWagesAndCompensationNet() {
  //   return (
  //     this.subjectWagesAndCompensationNet + this.partnerWagesAndCompensationNet
  //   );
  // }
}

export { WagesAndCompensationReport };
