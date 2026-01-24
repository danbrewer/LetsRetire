// import { BaseReports as BaseReport } from "./cBaseReports.js";
// import { ReportingYear } from "./cReporting.js";
// import { DemographicsReport } from "./rDemographics.js";
// import { SocialSecurityReporting as SocialSecurityReport } from "./rSocialSecurity.js";
// import { TaxReport as IncomeTaxReport } from "./rTaxes.js";
// // import { WagesAndCompensationReport } from "./rWagesAndCompensation.js";

// class IncomeReport extends BaseReport {
//   /** @type {DemographicsReport} */
//   #demographicsReport;
//   /** @type {WagesAndCompensationReport} */
//   #wagesAndCompensationReport;
//   /** @type {SocialSecurityReport} */
//   #socialSecurityReporting;
//   /** @type {IncomeTaxReport} */
//   #incomeTaxReport;

//   /**
//    * @param {DemographicsReport} demographicsReport
//    * @param {WagesAndCompensationReport} wagesAndCompensationReport
//    * @param {SocialSecurityReport} socialSecurityReport
//    * @param {IncomeTaxReport} incomeTaxReport
//    */
//   constructor(
//     demographicsReport,
//     wagesAndCompensationReport,
//     socialSecurityReport,
//     incomeTaxReport
//   ) {
//     super();    
//     this.#demographicsReport = demographicsReport;
//     this.#wagesAndCompensationReport = wagesAndCompensationReport;
//     this.#socialSecurityReporting = socialSecurityReport;
//     this.#incomeTaxReport = incomeTaxReport;

//      this.subjectGrossWages = 0;
//      this.subject401kContribution = 0;
//      this.subjectEstimatedWithholdings = 0;
//      this.subjectNonTaxableSalaryDeductions = 0;
//      this.subjectTakehomeWages = 0;

//      this.partnerGrossWages = 0;
//      this.partner401kContribution = 0;
//      this.partnerNonTaxableSalaryDeductions = 0;
//      this.partnerEstimatedWithholdings = 0;
//      this.partnerTakehomeWages = 0;

//     this.miscTaxableIncome = 0;
//     this.savingsInterest = 0;
//     this.subject401k = 0;
//     this.partner401k = 0;
//     this.subjectPension = 0;
//     this.partnerPension = 0;
//   }

//   get subjectWages() {
//     return this.#wagesAndCompensationReport.subjectGrossWages;
//   }
//   get partnerWages() {
//     return this.#wagesAndCompensationReport.partnerGrossWages;
//   }

//   get subjectTaxableSocialSecurity() {
//     return this.#socialSecurityReporting.subjectSsTaxable;
//   }
//   get partnerTaxableSocialSecurity() {
//     return this.#socialSecurityReporting.partnerSsTaxable;
//   }

//   get standardDeduction() {
//     return this.#incomeTaxReport.standardDeduction;
//   }

//   get filingStatus() {
//     return this.#demographicsReport.filingStatus;
//   }

//   get totalGrossTaxableIncome() {
//     return (
//       this.subjectWages +
//       this.partnerWages +
//       this.miscTaxableIncome +
//       this.savingsInterest +
//       this.subject401k +
//       this.partner401k +
//       this.subjectTaxableSocialSecurity +
//       this.partnerTaxableSocialSecurity +
//       this.subjectPension +
//       this.partnerPension
//     );
//   }

//   get adjustedGrossIncome() {
//     return this.totalGrossTaxableIncome - this.standardDeduction;
//   }
// }

// export { IncomeReport };
