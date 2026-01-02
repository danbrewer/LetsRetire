import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";

class IncomeEstimatorResults {
  /** @type {number} */
  #desiredNetTarget;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  /** @type {IncomeBreakdown | null} */
  #incomeBreakdown = null;

  /**
   * @param {number} desiredNetTarget - The desired net income target
   *  @param {FixedIncomeStreams} fixedIncomeStreams - Collection of income sources
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
    if (this.#incomeBreakdown === null) {
      return 0;
    }

    return (
      this.#incomeBreakdown.combined401kWithdrawalsGross +
      this.#incomeBreakdown.combinedSavingWithdrawals +
      this.#incomeBreakdown.combinedRothWithdrawals
    ).asCurrency();
  }

  // get rmd() {
  //   const gross401kWithdrawals = this.#incomeBreakdown?.combined401kWithdrawalsGross.asCurrency() ?? 0;
    
  //   if (gross401kWithdrawals === 0) {
  //     return 0;
  //   }



  //   return this.#fixedIncomeStreams.subjectRMD;
  // }

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
