import { Demographics } from "./cDemographics.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { SocialSecurityBreakdown } from "./cSsCalculationDetails.js";

class SsBenefitsCalculator {
  // /** @type {SocialSecurityBreakdown} */
  // #ssBreakdown;

  // /**
  //  * @param {SocialSecurityBreakdown} calculationDetails
  //  */
  // constructor(calculationDetails) {
  //   ssBreakdown = calculationDetails;
  // }

  // get socialSecurityBreakdown() {
  //   return ssBreakdown;
  // }

  // Private method to calculate the taxable portion based on IRS rules
  /**
   * @param {SocialSecurityBreakdown} ssBreakdown
   */
  static #calculateSsBreakdown(ssBreakdown) {
    let excessOverTier1 = 0;
    let excessOverTier2 = 0;

    // Case 1: No social security is taxable
    if (ssBreakdown.provisionalIncome <= ssBreakdown.tier1Threshold) {
      ssBreakdown.taxableAmount = 0;
      return;
    }

    // Case 2: Provisional income exceeds Tier 1 but not Tier 2
    if (ssBreakdown.provisionalIncome <= ssBreakdown.tier2Threshold) {
      const incomeExceedingTier1 =
        ssBreakdown.provisionalIncome - ssBreakdown.tier1Threshold;

      let excessOfTier1TaxableAmt = (0.5 * incomeExceedingTier1).asCurrency();

      // Taxable amount is the lesser of half of SS benefits or excess amount
      const taxableSSAmount = Math.min(
        ssBreakdown.benefits_50pct,
        excessOfTier1TaxableAmt
      );

      ssBreakdown.taxableAmount = taxableSSAmount;
    }

    // Case 3: Provisional income exceeds Tier 2
    excessOverTier1 = ssBreakdown.tier2Threshold - ssBreakdown.tier1Threshold;

    let taxableTier1Amount = (0.5 * excessOverTier1).asCurrency();

    let taxableSsInTier1 = Math.min(
      ssBreakdown.benefits_50pct,
      taxableTier1Amount
    ).asCurrency();

    excessOverTier2 =
      ssBreakdown.provisionalIncome - ssBreakdown.tier2Threshold;

    let taxableTier2Amount = (0.85 * excessOverTier2).asCurrency();

    let taxableSsInTier2 = Math.min(
      ssBreakdown.benefits_85pct,
      taxableTier2Amount
    ).asCurrency();

    let taxablePortion = Math.min(
      ssBreakdown.benefits_85pct,
      taxableSsInTier1 + taxableSsInTier2
    );

    // Update calculation details
    ssBreakdown.method = "irs-rules";
    ssBreakdown.incomeExceedingTier1 = excessOverTier1;
    ssBreakdown.incomeExceedingTier2 = excessOverTier2;
    ssBreakdown.tier1TaxableAmount = taxableSsInTier1;
    ssBreakdown.tier2TaxableAmount = taxableSsInTier2;
    ssBreakdown.taxableAmount = taxablePortion;
  }

  /**
   * @param {Demographics} demographics
   * @param {FixedIncomeStreams} incomeStreams
   * @param {Number} taxableNonSsIncome
   * @returns {SocialSecurityBreakdown}
   */
  static CalculateSsBreakdown(demographics, incomeStreams, taxableNonSsIncome) {
    const ssBreakdown = new SocialSecurityBreakdown(
      incomeStreams.subjectSsGross,
      incomeStreams.spouseSsGross,
      taxableNonSsIncome,
      demographics.hasPartner
    );

    SsBenefitsCalculator.#calculateSsBreakdown(ssBreakdown);

    return ssBreakdown;
  }
}

export { SsBenefitsCalculator };
