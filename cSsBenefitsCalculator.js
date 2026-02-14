import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Demographics } from "./cDemographics.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";

class SsBenefitsCalculator {
  /**
   * @param {SocialSecurityBreakdown} ssBreakdown
   */
  static #calculateSsBreakdown(ssBreakdown) {
    let excessOverTier1 = 0;
    let excessOverTier2 = 0;
    let taxableSsInTier1 = 0;
    let taxableSsInTier2 = 0;
    let taxablePortion = 0;

    // Case 1: No social security is taxable
    if (ssBreakdown.provisionalIncome <= ssBreakdown.tier1Threshold) {
      // nothing is taxable.  Woo-hoo!
    }

    // Case 2: Provisional income exceeds Tier 1 but not Tier 2
    else if (ssBreakdown.provisionalIncome <= ssBreakdown.tier2Threshold) {
      excessOverTier1 =
        ssBreakdown.provisionalIncome - ssBreakdown.tier1Threshold;

      let excessOfTier1TaxableAmt = (0.5 * excessOverTier1).asCurrency();

      // Taxable amount is the lesser of half of SS benefits or excess amount
      taxablePortion = Math.min(
        ssBreakdown.benefits_50pct,
        excessOfTier1TaxableAmt
      );
    } else {
      // Case 3: Provisional income exceeds Tier 2
      excessOverTier1 = ssBreakdown.tier2Threshold - ssBreakdown.tier1Threshold;

      let taxableTier1Amount = (0.5 * excessOverTier1).asCurrency();

      taxableSsInTier1 = Math.min(
        ssBreakdown.benefits_50pct,
        taxableTier1Amount
      ).asCurrency();

      excessOverTier2 =
        ssBreakdown.provisionalIncome - ssBreakdown.tier2Threshold;

      let taxableTier2Amount = (0.85 * excessOverTier2).asCurrency();

      taxableSsInTier2 = taxableTier2Amount; //Math.min(
      //   ssBreakdown.benefits_85pct,
      //   taxableTier2Amount
      // ).asCurrency();

      taxablePortion = Math.min(
        ssBreakdown.benefits_85pct,
        taxableSsInTier1 + taxableSsInTier2
      );
    }

    ssBreakdown.updateCalculatedValues(
      "irs-rules",
      excessOverTier1,
      excessOverTier2,
      taxableSsInTier1,
      taxableSsInTier2,
      taxablePortion
    );
  }

  /**
   * @param {Demographics} demographics
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @returns {SocialSecurityBreakdown}
   */
  static CalculateSsBreakdown(
    demographics,
    fixedIncomeStreams,
    adjustableIncomeStreams
  ) {
    const taxableNonSsIncome =
      adjustableIncomeStreams.combined401kGrossWithdrawals +
      fixedIncomeStreams.combinedPensionGross +
      fixedIncomeStreams.interestEarnedOnSavings;

    const ssBreakdown = new SocialSecurityBreakdown(
      fixedIncomeStreams.subjectSsGross,
      fixedIncomeStreams.partnerSsGross,
      taxableNonSsIncome,
      demographics.hasPartner
    );

    SsBenefitsCalculator.#calculateSsBreakdown(ssBreakdown);

    return ssBreakdown;
  }
}

export { SsBenefitsCalculator };
