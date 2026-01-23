// import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
// import { Demographics } from "./cDemographics.js";
// import { FiscalData } from "./cFiscalData.js";
// import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
// import { TaxCalculations } from "./cTaxCalculations.js";

// class IncomeBreakdown {
//   /** @type {number} */
//   #standardDeduction = 0;
//   /** @type {FixedIncomeStreams} */
//   #fixedIncomeStreams;

//   /** @type {AdjustableIncomeStreams} */
//   #adjustableIncomeStreams;

//   /**
//    * @param {FixedIncomeStreams} fixedIncomeStreams
//    * @param {AdjustableIncomeStreams} adjustableIncomeStreams
//    * @param {Demographics} demographics
//    * @param {FiscalData} fiscalData
//    *
//    */
//   constructor(
//     fixedIncomeStreams,
//     adjustableIncomeStreams,
//     demographics,
//     fiscalData
//   ) {
//     this.#fixedIncomeStreams = fixedIncomeStreams;
//     this.#adjustableIncomeStreams = adjustableIncomeStreams;
//     this.#standardDeduction = TaxCalculations.getStandardDeduction(
//       fiscalData,
//       demographics
//     );
//   }

//   get combinedEarnedIncomeGrossCareer() {
//     return this.#fixedIncomeStreams.combinedCareerWagesAndCompensationTaxable; // for now; later only if we add earned income streams
//   }

//   get combinedEarnedIncomeWithholdingsCareer() {
//     return this.#fixedIncomeStreams
//       .combinedCareerWagesAndCompensationEstimatedWithholdings; // for now; later only if we add earned income streams
//   }

//   get combinedEarnedIncomeWithholdingsRetirement() {
//     return this.#fixedIncomeStreams
//       .combinedRetirementWagesAndCompensationEstimatedWithholdings; // for now; later only if we add earned income streams
//   }

//   get combinedEarnedIncomeTakehomeCareer() {
//     return this.#fixedIncomeStreams
//       .combinedCareerWagesAndCompensationActualIncome; // for now; later only if we add earned income streams
//   }

//   get combinedSocialSecGross() {
//     return this.#fixedIncomeStreams.combinedSsGross.asCurrency();
//   }

//   get combinedSocialSecWithholdings() {
//     return this.#fixedIncomeStreams.combinedGrossSsWithholdings.asCurrency();
//   }

//   get combinedSocialSecActualIncome() {
//     return this.#fixedIncomeStreams.combinedSsActualIncome.asCurrency();
//   }

//   get combinedPensionGross() {
//     return this.#fixedIncomeStreams.combinedPensionGross.asCurrency();
//   }

//   get combinedPensionWithholdings() {
//     return this.#fixedIncomeStreams.combinedPensionWithholdings.asCurrency();
//   }

//   get combinedPensionActualIncome() {
//     return this.#fixedIncomeStreams.combinedPensionActualIncome.asCurrency();
//   }

//   get interestEarnedOnSavings() {
//     return this.#fixedIncomeStreams.interestEarnedOnSavings.asCurrency();
//   }

//   get miscIncome() {
//     return this.#fixedIncomeStreams.miscTaxableIncomeWithNoWithholdings.asCurrency();
//   }

//   get nonTaxableIncome() {
//     return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
//   }

//   get grossIncome() {
//     return this.#grossRevenue.asCurrency();
//   }

//   get actualIncome() {
//     return this.#actualIncome.asCurrency();
//   }

//   get #grossRevenue() {
//     return (
//       // this.combinedEarnedIncomeGrossRetirement +
//       (
//         this.combinedSocialSecGross +
//         this.combinedPensionGross +
//         this.miscIncome +
//         this.#adjustableIncomeStreams.combined401kGrossWithdrawals +
//         this.combinedPensionGross +
//         this.interestEarnedOnSavings
//       ).asCurrency()
//     );
//   }

//   get #actualIncome() {
//     return (
//       this.interestEarnedOnSavings +
//       this.combinedPensionActualIncome +
//       this.miscIncome +
//       this.#adjustableIncomeStreams.combined401kActualIncome +
//       this.combinedSocialSecActualIncome
//     ).asCurrency();
//   }

//   get standardDeduction() {
//     return this.#standardDeduction;
//   }

//   get adjustedGrossIncome() {
//     return Math.max(0, this.grossIncome - this.standardDeduction);
//   }

//   get trad401kTakeHome() {
//     return this.#adjustableIncomeStreams.combined401kActualIncome;
//   }

//   get combinedPensionTakeHome() {
//     return this.combinedPensionActualIncome;
//   }

//   get socialSecurityTakeHome() {
//     return this.combinedSocialSecActualIncome;
//   }

//   get miscTaxableActualIncome() {
//     return this.miscIncome;
//   }

//   get miscNonTaxableActualIncome() {
//     return this.#fixedIncomeStreams.taxFreeIncomeAdjustment.asCurrency();
//   }

//   get combined401kWithdrawalsGross() {
//     return this.#adjustableIncomeStreams.combined401kGrossWithdrawals;
//   }

//   get combinedSavingWithdrawals() {
//     return this.#adjustableIncomeStreams.savingsWithdrawal;
//   }

//   get combinedRothWithdrawals() {
//     return this.#adjustableIncomeStreams.combinedRothGrossWithdrawal;
//   }

//   // Private utility methods for income breakdown analysis
//   #getTotalPensionIncome() {
//     return this.combinedPensionGross;
//   }

//   getIncomeSourceBreakdown() {
//     return {
//       pension: this.#getTotalPensionIncome(),
//       earnedInterest: this.#fixedIncomeStreams.interestEarnedOnSavings,
//       otherTaxable: this.miscIncome,
//     };
//   }

//   get hasPositiveTaxableIncome() {
//     return this.adjustedGrossIncome > 0;
//   }

//   // Factory method for backward compatibility and dependency injection
//   /**
//    * @param {FixedIncomeStreams} fixedIncomeStreams
//    * @param {AdjustableIncomeStreams} adjustableIncomeStreams
//    * @param {Demographics} demographics
//    * @param {FiscalData} fiscalData
//    **/
//   //   @param {{ rate: number; upTo: number; }[]} taxBrackets

//   static CreateFrom(
//     fixedIncomeStreams,
//     adjustableIncomeStreams,
//     demographics,
//     fiscalData
//   ) {
//     return new IncomeBreakdown(
//       fixedIncomeStreams,
//       adjustableIncomeStreams,
//       demographics,
//       fiscalData
//     );
//   }
// }

// export { IncomeBreakdown };
