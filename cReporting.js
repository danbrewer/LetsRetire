// import { DemographicsReport } from "./rDemographics.js";
// import { SocialSecurityReporting } from "./rSocialSecurity.js";
// import { IncomeReport } from "./rIncome.js";
// import { TaxReport } from "./rTaxes.js";
// import { WagesAndCompensationReport } from "./rWagesAndCompensation.js";

import { ReportData } from "./rReportData.js";

class ReportingYear {
  // /** @type {WagesAndCompensationReport} */
  // #wagesAndCompensation;
  // /** @type {SocialSecurityReporting} */
  // #socialSecurity;
  // /** @type {IncomeReport} */
  // #taxableIncome;
  // /** @type {TaxReport} */
  // #taxes;
  // /** @type {DemographicsReport} */
  // #demographics;
  /** @type {ReportData} */
  #reportData;

  constructor() {
    // this.#wagesAndCompensation = new WagesAndCompensationReport();
    // this.#socialSecurity = new SocialSecurityReporting();
    // this.#taxes = new TaxReport();
    // this.#demographics = new DemographicsReport();

    // this.#taxableIncome = new IncomeReport(
    //   this.#demographics,
    //   this.#wagesAndCompensation,
    //   this.#socialSecurity,
    //   this.#taxes
    // );
    this.#reportData = new ReportData();
  }

  // get WagesAndCompensation() {
  //   return this.#wagesAndCompensation;
  // }

  // get SocialSecurity() {
  //   return this.#socialSecurity;
  // }

  // get TaxableIncome() {
  //   return this.#taxableIncome;
  // }

  // get Taxes() {
  //   return this.#taxes;
  // }

  // get Demographics() {
  //   return this.#demographics;
  // }
  get ReportData() {
    return this.#reportData;
  }
}

export { ReportingYear };
