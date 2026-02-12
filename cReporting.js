// import { DemographicsReport } from "./rDemographics.js";
// import { SocialSecurityReporting } from "./rSocialSecurity.js";
// import { IncomeReport } from "./rIncome.js";
// import { TaxReport } from "./rTaxes.js";
// import { WagesAndCompensationReport } from "./rWagesAndCompensation.js";

import { ReportData } from "./rReportData.js";

class ReportingYear {
  /** @type {ReportData} */
  #reportData;

  constructor() {
    this.#reportData = new ReportData();
  }

  get ReportData() {
    return this.#reportData;
  }
}

export { ReportingYear };
