class TaxCalculator {
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
    const yearsFromBase = fiscalData.taxYear - 2025;

    if (
      demographics.filingStatus ===
      constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY
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

    const taxBrackets = this.getTaxBrackets(fiscalData, demographics);
    for (const { upTo, rate } of taxBrackets) {
      const slice = Math.min(taxableIncome, upTo) - prev;
      if (slice > 0) tax += slice * rate;
      if (taxableIncome <= upTo) break;
      prev = upTo;
    }
    // log.info(`Total tax calculated is $${tax.asCurrency()}.`);

    return tax.asCurrency();
  }
}
