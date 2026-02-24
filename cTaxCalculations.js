import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import {
  TAX_BASE_YEAR,
  constsJS_FILING_STATUS,
  constsJS_TAX_TABLES_2025,
  constsJS_STANDARD_DEDUCTION_2025,
} from "./consts.js";
import { log } from "./debugUtils.js";

class TaxCalculations {
  /**
   * @param {Demographics} demographics
   */
  static determineStandardDeduction(demographics) {
    // Logic to determine standard deduction based on demographics
    if (demographics.filingStatus === "single") {
      return 13850; // Example value for single filers in 2024
    } else if (demographics.filingStatus === "married_filing_jointly") {
      return 27700; // Example value for married filing jointly in 2024
    }
    // Add more filing statuses as needed
    return 0;
  }

  /**
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  static getTaxBrackets(fiscalData, demographics) {
    // The year passed is the actual tax year (e.g., 2025, 2026, 2052, etc.)
    // The adjustedForInflation expects years from the base (2025)

    const yearsFromBase = fiscalData.taxYear - TAX_BASE_YEAR;
    if (
      demographics.filingStatus ===
        constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY &&
      !demographics.isWidowed
    ) {
      return constsJS_TAX_TABLES_2025.mfj.map((bracket) => ({
        rate: bracket.rate,
        upTo: bracket.upTo.adjustedForInflation(
          fiscalData.inflationRate,
          yearsFromBase
        ),
      }));
    } else {
      return constsJS_TAX_TABLES_2025.single.map((bracket) => ({
        rate: bracket.rate,
        upTo: bracket.upTo.adjustedForInflation(
          fiscalData.inflationRate,
          yearsFromBase
        ),
      }));
    }
  }

  /**
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  static getStandardDeduction(fiscalData, demographics) {
    // The year passed should be the actual tax year (e.g., 2025, 2026, 2052, etc.)
    // The adjustedForInflation expects years from the base (2025)
    const yearsFromBase = fiscalData.taxYear - TAX_BASE_YEAR;

    if (
      demographics.filingStatus ===
      constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY
    ) {
      const baseAmount = constsJS_STANDARD_DEDUCTION_2025.mfj;
      const adjusted = baseAmount.adjustedForInflation(
        fiscalData.inflationRate,
        yearsFromBase
      );
      if (isNaN(adjusted)) {
        log.error(
          `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${fiscalData.inflationRate}`
        );
        return 0;
      }
      return adjusted.asCurrency();
    } else {
      const baseAmount = constsJS_STANDARD_DEDUCTION_2025.single;
      const adjusted = baseAmount.adjustedForInflation(
        fiscalData.inflationRate,
        yearsFromBase
      );
      if (isNaN(adjusted)) {
        log.error(
          `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${fiscalData.inflationRate}`
        );
        return 0;
      }
      return adjusted.asCurrency();
    }
  }

  /**
   * @param {number} taxableIncome
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  static determineFederalIncomeTax(taxableIncome, fiscalData, demographics) {
    let tax = 0,
      prev = 0;

    const standardDeduction = this.getStandardDeduction(
      fiscalData,
      demographics
    );
    if (taxableIncome < standardDeduction) {
      return 0;
    }

    // debugger;
    const taxBrackets = this.getTaxBrackets(fiscalData, demographics);
    console.log(`Brackets for year: ${fiscalData.taxYear}`);
    console.log(JSON.stringify(taxBrackets, null, 2));
    // taxBrackets.dump("Calculating federal income tax with brackets:");
    for (const { upTo, rate } of taxBrackets) {
      const slice = Math.min(taxableIncome, upTo) - prev;
      if (slice > 0) tax += slice * rate;
      if (taxableIncome <= upTo) break;
      prev = upTo;
    }

    const isTaxCalculationValid = this.#isCalculationValid(
      taxableIncome,
      tax,
      this.getStandardDeduction(fiscalData, demographics)
    );

    if (!isTaxCalculationValid) {
      log.error(
        `Tax calculation validation failed: taxableIncome=${taxableIncome}, federalTaxesOwed=${tax}, standardDeduction=${this.getStandardDeduction(fiscalData, demographics)}`
      );
      throw new Error("Invalid tax calculation");
    }

    return tax.asCurrency();
  }

  /**
   * Validates that the tax calculations are internally consistent.
   * @returns {boolean} True if tax calculations appear valid
   * @param {number} taxableIncome
   * @param {number} federalTaxesOwed
   * @param {number} standardDeduction
   */
  static #isCalculationValid(
    taxableIncome,
    federalTaxesOwed,
    standardDeduction
  ) {
    // Basic validation checks
    if (taxableIncome < 0 || federalTaxesOwed < 0 || standardDeduction < 0) {
      return false;
    }

    // Federal taxes should not exceed gross income (extreme case check)
    if (federalTaxesOwed > taxableIncome) {
      return false;
    }

    return true;
  }
}

export { TaxCalculations };
