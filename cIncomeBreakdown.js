import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
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

  get combinedEarnedIncomeGross() {
    return this.#fixedIncomeStreams.wagesAndCompensationGross; // for now; later only if we add earned income streams
  }

  get combinedEarnedIncomeWithholdings() {
    return this.#fixedIncomeStreams.wagesAndCompensationEstimatedWithholdings; // for now; later only if we add earned income streams
  }

  get combinedEarnedIncomeTakehome() {
    return this.#fixedIncomeStreams.wagesAndCompensationActualIncome; // for now; later only if we add earned income streams
  }

  get combinedSocialSecGross() {
    return this.#fixedIncomeStreams.combinedSsGross.asCurrency();
    // #ssCalculationDetails?.totalSsBenefits.asCurrency() ?? 0;
  }

  get combinedSocialSecWithholdings() {
    return this.#fixedIncomeStreams.combinedGrossSsWithholdings.asCurrency();
  }

  get combinedSocialSecActualIncome() {
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

  get interestEarnedOnSavings() {
    return this.#fixedIncomeStreams.interestEarnedOnSavings.asCurrency();
  }

  get miscIncome() {
    return this.#fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings.asCurrency();
  }

  get nonTaxableIncome() {
    return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
  }

  get grossIncome() {
    return this.#grossRevenue.asCurrency();
  }

  get actualIncome() {
    return this.#actualIncome.asCurrency();
  }

  get #grossRevenue() {
    return (
      this.combinedEarnedIncomeGross +
      this.combinedSocialSecGross +
      this.combinedPensionGross +
      this.miscIncome +
      this.#adjustableIncomeStreams.combined401kGrossWithdrawal +
      this.combinedPensionGross +
      this.interestEarnedOnSavings
    ).asCurrency();
  }

  get #actualIncome() {
    return (
      this.interestEarnedOnSavings +
      this.combinedPensionActualIncome +
      this.miscIncome +
      this.#adjustableIncomeStreams.combined401kActualIncome +
      this.combinedSocialSecActualIncome
    ).asCurrency();
  }

  get standardDeduction() {
    return this.#standardDeduction;
  }

  get adjustedGrossIncome() {
    return Math.max(0, this.grossIncome - this.standardDeduction);
  }

  // get federalIncomeTax() {
  //   return TaxCalculations.determineFederalIncomeTax(
  //     this.adjustedGrossIncome,
  //     this.#fiscalData,
  //     this.#demographics
  //   ).asCurrency();
  // }

  // get incomeExceedingTier1() {
  //   throw new Error("incomeExceedingTier1 is not implemented yet");
  //   // return this.#ssCalculationDetails?.incomeExceedingTier1 ?? 0;
  // }

  // get incomeExceedingTier2() {
  //   throw new Error("incomeExceedingTier2 is not implemented yet");
  //   // return this.#ssCalculationDetails?.incomeExceedingTier2 ?? 0;
  // }

  // get tier1TaxableAmount() {
  //   throw new Error("tier1TaxableAmount is not implemented yet");
  //   // return this.#ssCalculationDetails?.tier1TaxableAmount ?? 0;
  // }

  // get tier2TaxableAmount() {
  //   throw new Error("tier2TaxableAmount is not implemented yet");
  //   // return this.#ssCalculationDetails?.tier2TaxableAmount ?? 0;
  // }

  // getNetIncomeMinusReportedEarnedInterest() {
  //   return (
  //     this.#grossIncome -
  //     this.federalIncomeTax -
  //     this.#fixedIncomeStreams.interestEarnedOnSavings
  //   ).asCurrency();
  // }

  // get netIncome() {
  //   return (this.#actualIncome - this.federalIncomeTax).asCurrency();
  // }

  // get effectiveTaxRate() {
  //   if (this.grossIncome === 0) return 0;
  //   return (this.federalIncomeTax / this.grossIncome).round(3);
  // }

  // grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount = 0) {
  //   if (this.#grossRevenue === 0) return 0;
  //   return amount / this.#grossRevenue;
  // }

  // grossIncomeAmountAsPercentageOfNetIncome(amount = 0) {
  //   return (
  //     this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
  //     this.netIncome
  //   ) // this.getNetIncomeMinusReportedEarnedInterest()
  //     .asCurrency();
  // }

  // grossIncomeAmountAsPercentageOfFederalIncomeTax(amount = 0) {
  //   return (
  //     this.grossIncomeAmountAsPercentageOfTotalIncomeStreamGross(amount) *
  //     this.federalIncomeTax
  //   ).asCurrency();
  // }

  get trad401kTakeHome() {
    return this.#adjustableIncomeStreams.combined401kActualIncome;
    // return this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.combined401kWithdrawalsGross
    // );
  }

  // get rmdNetIncome() {
  //   return this.grossIncomeAmountAsPercentageOfNetIncome(this.rmd);
  // }

  get combinedPensionTakeHome() {
    return this.combinedPensionActualIncome;
    // return this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.combinedPensionGross
    // );
  }

  get socialSecurityTakeHome() {
    return this.combinedSocialSecActualIncome;
  }

  get miscTaxableActualIncome() {
    return this.miscIncome;
    // this.grossIncomeAmountAsPercentageOfNetIncome(
    //   this.miscTaxableIncome
    // );
  }

  get miscNonTaxableActualIncome() {
    return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
  }

  // get earnedInterestNetIncome() {
  //   return this.grossIncomeAmountAsPercentageOfNetIncome(
  //     this.#fixedIncomeStreams.interestEarnedOnSavings
  //   );
  // }

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
      otherTaxable: this.miscIncome,
    };
  }

  get hasPositiveTaxableIncome() {
    return this.adjustedGrossIncome > 0;
  }

  // get netToGrossIncomeRatio() {
  //   return this.actualIncome > 0 ? this.netIncome / this.actualIncome : 0;
  // }


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
