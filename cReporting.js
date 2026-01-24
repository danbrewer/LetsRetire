import { WagesAndCompensationReport } from "./rWagesAndCompensation.js";

class ReportingYear {
  /** @type {WagesAndCompensationReport} */
  #wagesAndCompensation;
  constructor() {
    this.#wagesAndCompensation = new WagesAndCompensationReport();
  }

  get WagesAndCompensation() {
    return this.#wagesAndCompensation;
  }
}

export { ReportingYear };
