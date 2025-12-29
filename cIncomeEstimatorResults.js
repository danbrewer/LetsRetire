import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { IncomeStreams } from "./cIncomeStreams.js";

class IncomeEstimatorResults {
  /** @type {number} */
  #desiredNetTarget;
  /** @type {IncomeStreams} */
  #fixedIncomeStreams;
  /** @type {IncomeBreakdown | null} */
  #incomeBreakdown = null;

  /**
   * @param {number} desiredNetTarget - The desired net income target
   *  @param {IncomeStreams} fixedIncomeStreams - Collection of income sources
   */
  constructor(desiredNetTarget, fixedIncomeStreams) {
    this.#desiredNetTarget = desiredNetTarget;
    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.actualNetTarget = 0;
    this.tax = 0;
    /** @type {IncomeBreakdown | null} */
    this.incomeBreakdown = null;
  }

  get desiredNetTarget() {
    return this.#desiredNetTarget;
  }

  get variableIncomeNeededToHitTarget() {
    return this.#incomeBreakdown?.trad401kWithdrawal.asCurrency() ?? 0;
  }

  get rmd() {
    return this.#fixedIncomeStreams.subjectRMD;
  }

  get federalIncomeTax() {
    return this.#incomeBreakdown?.federalIncomeTax.asCurrency() ?? 0;
  }

  get fixedIncomeStreams() {
    return this.#fixedIncomeStreams;
  }

  /** @param {IncomeBreakdown | null} incomeBreakdown */
  set incomeBreakdown(incomeBreakdown) {
    this.#incomeBreakdown = incomeBreakdown;
  }
}

export { IncomeEstimatorResults };
