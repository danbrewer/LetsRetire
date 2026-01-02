import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { SocialSecurityBreakdown } from "./cSsCalculationDetails.js";
import { TaxCalculations } from "./cTaxCalculations.js";

class IncomeBreakdown {
  // /** @type {SocialSecurityBreakdown | null} */
  // #ssCalculationDetails;
  /** @type {number} */
  #standardDeduction = 0;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;

  /** @type {AdjustableIncomeStreams} */
  #adjustableIncomeStreams;

  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;

  /**
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   *
   */
  constructor(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    demographics,
    fiscalData
  ) {
    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#adjustableIncomeStreams = adjustableIncomeStreams;
    this.#standardDeduction = TaxCalculations.getStandardDeduction(
      fiscalData,
      demographics
    );
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
  }

  get interestEarnedOnSavings() {
    return this.#fixedIncomeStreams.interestEarnedOnSavings.asCurrency();
  }

  get combinedSocialSecurityGross() {
    return this.#fixedIncomeStreams.combinedSsGross.asCurrency();
    // #ssCalculationDetails?.totalSsBenefits.asCurrency() ?? 0;
  }

  get combinedSoecialSecurityWithholdings() {
    return this.#fixedIncomeStreams.combinedGrossSsWithholdings.asCurrency();
  }

  get combinedSocialSecurityActualIncome() {
    return this.#fixedIncomeStreams.combinedSsActualIncome.asCurrency();
  }

  get combinedPensionGross() {
    return this.#fixedIncomeStreams.combinedPensionGross.asCurrency();
  }

  get combinedPensionWithholdings() {
    return this.#fixedIncomeStreams.combinedPensionWithholdings.asCurrency();
  }

  get combinedPensionActualIncome() {
    return this.#fixedIncomeStreams.combinedPensionActualIncome.asCurrency();
  }

  get earnedIncomeGross() {
    return 0; // for now; later only if we add earned income streams
  }

  get earnedIncomeWithholdings() {
    return 0; // for now; later only if we add earned income streams
  }

  get earnedIncomeNetIncome() {
    return this.earnedIncomeGross - this.earnedIncomeWithholdings; // for now; later only if we add earned income streams
  }

  // get rmd() {
  //   return this.#fixedIncomeStreams.subjectRMD.asCurrency();
  // }

  get miscTaxableIncome() {
    return this.#fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings.asCurrency();
  }

  get totalIncome() {
    return this.#actualIncome.asCurrency();
  }

  get nonTaxableIncome() {
    throw new Error("nonTaxableIncome is not implemented yet");
    // return this.#ssCalculationDetails?.nonTaxableAmount.asCurrency() ?? 0;
  }

  get grossIncome() {
    return this.#grossRevenue.asCurrency();
  }

  get #grossRevenue() {
    return (
      this.earnedIncomeGross +
      this.combinedSocialSecurityGross +
      this.combinedPensionGross +
      this.miscTaxableIncome +
      this.#adjustableIncomeStreams.combined401kGrossWithdrawal +
      this.combinedPensionGross +
      this.interestEarnedOnSavings
    ).asCurrency();
  }

  get #actualIncome() {
    return (
      this.interestEarnedOnSavings +
      this.combinedPensionActualIncome +
      this.miscTaxableIncome +
      this.#adjustableIncomeStreams.combined401kActualIncome +
      this.combinedSocialSecurityActualIncome
    ).asCurrency();
  }

  get standardDeduction() {
    return this.#standardDeduction;
  }

  get taxableIncome() {
    return Math.max(0, this.grossIncome - this.standardDeduction);
  }

  get federalIncomeTax() {
    return TaxCalculations.determineFederalIncomeTax(
      this.taxableIncome,
      this.#fiscalData,
      this.#demographics
    ).asCurrency();
  }

  // getNetIncomeMinusReportedEarnedInterest() {
  //   return (
  //     this.#grossIncome -
  //     this.federalIncomeTax -
  //     this.#fixedIncomeStreams.interestEarnedOnSavings
  //   ).asCurrency();
  // }

  get netIncome() {
    return (this.#actualIncome - this.federalIncomeTax).asCurrency();
  }

  get effectiveTaxRate() {
    if (this.grossIncome === 0) return 0;
    return (this.federalIncomeTax / this.grossIncome).round(3);
  }

  grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount = 0) {
    if (this.#grossRevenue === 0) return 0;
    return amount / this.#grossRevenue;
  }

  grossIncomeAmountAsPercentageOfNetIncome(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
      this.netIncome
    ) // this.getNetIncomeMinusReportedEarnedInterest()
      .asCurrency();
  }

  grossIncomeAmountAsPercentageOfFederalIncomeTax(amount = 0) {
    return (
      this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
      this.federalIncomeTax
    ).asCurrency();
  }

  get trad401kTakeHome() {
    return this.#adjustableIncomeStreams.combined401kActualIncome;
    // return this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.combined401kWithdrawalsGross
    // );
  }

  // get rmdNetIncome() {
  //   return this.grossIncomeAmountAsPercentageOfNetIncome(this.rmd);
  // }

  get pensionTakeHome() {
    return this.combinedPensionActualIncome;
    // return this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.combinedPensionGross
    // );
  }

  get socialSecurityTakeHome() {
    return this.combinedSocialSecurityActualIncome;
  }

  get miscTaxableActualIncome() {
    return this.miscTaxableIncome;
    // this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.miscTaxableIncome
    // );
  }

  get miscNonTaxableActualIncome() {
    return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
  }

  get earnedInterestNetIncome() {
    return this.grossIncomeAmountAsPercentageOfNetIncome(
      this.#fixedIncomeStreams.interestEarnedOnSavings
    );
  }

  get combined401kWithdrawalsGross() {
    return this.#adjustableIncomeStreams.combined401kGrossWithdrawal;
  }

  get combinedSavingWithdrawals() {
    return this.#adjustableIncomeStreams.savingsWithdrawal;
  }

  get combinedRothWithdrawals() {
    return this.#adjustableIncomeStreams.combinedRothGrossWithdrawal;
  }

  // Private utility methods for income breakdown analysis
  #getTotalPensionIncome() {
    return this.combinedPensionGross;
  }

  // #getTotalRetirementIncome() {
  //   return this.#adjustableIncomeStreams.combined401kGrossWithdrawal;
  // }

  getIncomeSourceBreakdown() {
    return {
      pension: this.#getTotalPensionIncome(),
      // socialSecurity: this.#ssCalculationDetails?.totalSsBenefits ?? 0, // Total SS income for breakdown
      // socialSecurityTaxable: this.#ssCalculationDetails?.taxableAmount ?? 0, // Just the taxable portion
      // retirement: this.#getTotalRetirementIncome(),
      earnedInterest: this.#fixedIncomeStreams.interestEarnedOnSavings,
      otherTaxable: this.miscTaxableIncome,
    };
  }

  get hasPositiveTaxableIncome() {
    return this.taxableIncome > 0;
  }

  get netToGrossIncomeRatio() {
    return this.totalIncome > 0 ? this.netIncome / this.totalIncome : 0;
  }

  get ssCalculationDetails() {
    throw new Error("ssCalculationDetails is not implemented yet");
    // if (!this.#ssCalculationDetails) {
    //   throw new Error("SS Calculation Details not available");
    // }
    // return this.#ssCalculationDetails;
  }

  // Factory method for backward compatibility and dependency injection
  /**
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {Demographics} demographics
   * @param {FiscalData} fiscalData
   **/
  //   @param {{ rate: number; upTo: number; }[]} taxBrackets

  static CreateFrom(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    demographics,
    fiscalData
  ) {
    return new IncomeBreakdown(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      demographics,
      fiscalData
    );
  }
}

export { IncomeBreakdown };
