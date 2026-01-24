// import { ACCOUNT_TYPES } from "./cAccount.js";
// import { AccountingYear } from "./cAccountingYear.js";
// import { BaseReports } from "./cBaseReports.js";
// import { Demographics } from "./cDemographics.js";
// import { FiscalData } from "./cFiscalData.js";
// import { ReportingYear } from "./cReporting.js";
// import { TaxCalculations } from "./cTaxCalculations.js";
// import { TransactionCategory } from "./tTransactionCategory.js";

// class TaxReport extends BaseReports {
//   constructor() {
//     super();

//     this.standardDeduction = 0;
//     this.ssTaxableIncome = 0;
//     this.nonSsTaxableIncome = 0;
//     this.miscIncomeWithholdings = 0;
//     this.subjectWagesWithholdings = 0;
//     this.partnerWagesWithholdings = 0;
//     this.subject401kWithholdings = 0;
//     this.partner401kWithholdings = 0;
//     this.subjectPensionWithholdings = 0;
//     this.partnerPensionWithholdings = 0;
//     this.additionalWithholdings = 0;
//   }

//   //   get standardDeduction(){
//   //     return this._standardDeduction;
//   //   }

//   //   get subjectTaxableIncome() {
//   //     return this._accountYear
//   //       .getDeposits(ACCOUNT_TYPES.SUBJECT_WAGES, TransactionCategory.IncomeGross)
//   //       .asCurrency();
//   //   }

//   //   get partnerTaxableIncome() {
//   //     return this._accountYear
//   //       .getDeposits(ACCOUNT_TYPES.PARTNER_WAGES, TransactionCategory.IncomeGross)
//   //       .asCurrency();
//   //   }

//   //   get combinedTaxableIncome() {
//   //     return this.subjectTaxableIncome + this.partnerTaxableIncome;
//   //   }

//   //   get subjectNonTaxableIncome() {
//   //     return this._accountYear
//   //       .getDeposits(
//   //         ACCOUNT_TYPES.SUBJECT_WAGES,
//   //         TransactionCategory.OtherNonTaxable
//   //       )
//   //       .asCurrency();
//   //   }

//   //   get partnerNonTaxableIncome() {
//   //     return this._accountYear
//   //       .getDeposits(
//   //         ACCOUNT_TYPES.PARTNER_WAGES,
//   //         TransactionCategory.OtherNonTaxable
//   //       )
//   //       .asCurrency();
//   //   }

//   //   get combinedNonTaxableIncome() {
//   //     return this.subjectNonTaxableIncome + this.partnerNonTaxableIncome;
//   //   }
// }

// export { TaxReport };
