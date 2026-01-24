// import { SocialSecurityReporting } from "./rSocialSecurity.js";
// import { IncomeReport } from "./rIncome.js";

// class IncomeBreakdownReport {
//   /** @type{TaxableIncomeReport} */
//   #taxableIncomeReport;
//   /** @type{SocialSecurityReporting} */
//   #socialSecurityReporting;

//   /**
//    * @param {TaxableIncomeReport} taxableIncomeReport
//    * @param {SocialSecurityReporting} socialSecurityReporting
//    */
//   constructor(taxableIncomeReport, socialSecurityReporting) {
//     this.#taxableIncomeReport = taxableIncomeReport;
//     this.#socialSecurityReporting = socialSecurityReporting;

//     this.nonTaxableIncome = 0;
//   }

//   get taxableIncome() {
//     return this.#taxableIncomeReport.adjustedGrossIncome;
//   }

//   get provisionalIncome() {
//     return this.#socialSecurityReporting.provisionalIncome;
//   }
// }

// export { IncomeBreakdownReport };
