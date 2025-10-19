// retirement.js

function _calculateSsBenefits(mySsBenefits, spouseSsBenefits, nonSsIncome) {
  // Declare and initialize the result object at the top
  // debugger;
  // debugger;
  const ssBenefits = {
    inputs: {
      myBenefits: mySsBenefits || 0,
      spouseBenefits: spouseSsBenefits || 0,
      nonSsIncome: nonSsIncome || 0,
    },
    taxablePortion: 0,
    oneHalfOfSSBenefits() {
      return (0.5 * this.totalBenefits()).asCurrency();
    },
    // derived values
    nonTaxablePortion() {
      return this.totalBenefits() - this.taxablePortion;
    },
    totalBenefits() {
      return (this.inputs.myBenefits + this.inputs.spouseBenefits).asCurrency();
    },
    myPortion() {
      return (this.inputs.myBenefits / this.totalBenefits()).asCurrency();
    },
    spousePortion() {
      return (this.inputs.spouseBenefits / this.totalBenefits()).asCurrency();
    },
    myTaxablePortion() {
      return (this.myPortion() * this.taxablePortion).asCurrency();
    },
    spouseTaxablePortion() {
      return (this.spousePortion() * this.taxablePortion).asCurrency();
    },
    myNonTaxablePortion() {
      return (this.myPortion() * this.nonTaxablePortion()).asCurrency();
    },
    spouseNonTaxablePortion() {
      return (this.spousePortion() * this.nonTaxablePortion()).asCurrency();
    },
    provisionalIncome() {
      return (
        this.oneHalfOfSSBenefits() + this.inputs.nonSsIncome
      ).asCurrency();
    },
    calculationDetails: {},
  };

  if (
    isNaN(ssBenefits.totalBenefits()) ||
    isNaN(ssBenefits.inputs.nonSsIncome)
  ) {
    log.error(
      `determineTaxablePortionOfSocialSecurity received NaN values: result.totalBenefits() was ${ssBenefits.totalBenefits()}, allOtherIncome was ${
        ssBenefits.allOtherIncome
      }`
    );
    throw new Error("Invalid input: NaN values detected");
  }

  const calculationDetails = {
    method: "irs-rules",
    totalBenefits: ssBenefits.totalBenefits(),
    halfSSBenefit: ssBenefits.oneHalfOfSSBenefits(),
    otherTaxableIncome: nonSsIncome,
    provisionalIncome: ssBenefits.provisionalIncome(),
    tier1Threshold: 32000,
    incomeExceedingTier1: 0,
    tier2Threshold: 44000,
    incomeExceedingTier2: 0,
    finalTaxableAmount: 0,
  };

  ssBenefits.calculationDetails = calculationDetails;

  // Case 1: No social security is taxable
  if (
    calculationDetails.provisionalIncome <= calculationDetails.tier1Threshold
  ) {
    // Provisional income does not exceed Tier 1 threshold; no taxable SS
    ssBenefits.taxablePortion = 0;
    // debugger;
    return ssBenefits;
  }

  // Case 2: Provisional income exceeds Tier 1 but not Tier 2
  if (calculationDetails.provisionalIncome <= calculationDetails.threshold2) {
    calculationDetails.incomeExceedingTier1 =
      calculationDetails.provisionalIncome - calculationDetails.tier1Threshold;

    let excessOfTier1TaxableAmt = (
      0.5 * calculationDetails.incomeExceedingTier1
    )
      .asCurrency()
      .asCurrency();

    calculationDetails.finalTaxableAmount = Math.min(
      (0.5 * ssBenefits.totalBenefits()).asCurrency(),
      excessOfTier1TaxableAmt
    ).asCurrency();

    ssBenefits.taxablePortion = calculationDetails.finalTaxableAmount;
    return ssBenefits;
  }

  // Case 3: Provisional income exceeds Tier 2
  const excessOverTier2 =
    ssBenefits.provisionalIncome() - calculationDetails.tier2Threshold;

  let taxableSsInExcessOfTier1Threshold =
    0.5 *
    (calculationDetails.tier2Threshold - calculationDetails.tier1Threshold);
  let taxableSsInExcessOfTier2Threshold = (0.85 * excessOverTier2).asCurrency();

  taxableSSAmount = Math.min(
    (0.85 * ssBenefits.totalBenefits()).asCurrency(),
    taxableSsInExcessOfTier1Threshold + taxableSsInExcessOfTier2Threshold
  );

  // Update calculation details
  calculationDetails.incomeExceedingTier1 =
    calculationDetails.tier2Threshold - calculationDetails.tier1Threshold;
  calculationDetails.incomeExceedingTier2 = excessOverTier2;
  calculationDetails.tier1TaxableAmount = taxableSsInExcessOfTier1Threshold;
  calculationDetails.tier2TaxableAmount = Math.min(
    (0.85 * ssBenefits.totalBenefits()).asCurrency() -
      taxableSsInExcessOfTier1Threshold,
    taxableSsInExcessOfTier2Threshold
  );

  ssBenefits.taxablePortion = taxableSSAmount;

  return ssBenefits;
}

function retirementJS_determineFederalIncomeTax(taxableIncome, brackets) {
  let tax = 0,
    prev = 0;

  for (const { upTo, rate } of brackets) {
    const slice = Math.min(taxableIncome, upTo) - prev;
    if (slice > 0) tax += slice * rate;
    if (taxableIncome <= upTo) break;
    prev = upTo;
  }
  // log.info(`Total tax calculated is $${tax.asCurrency()}.`);

  return tax.asCurrency();
}

function retirementJS_calculateIncomeWhen401kWithdrawalIs(
  variableIncomeFactor,
  incomeStreams,
  demographics,
  fiscalData
) {
  // Declare and initialize the result object at the top
  const result = {
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const standardDeduction = retirementJS_getStandardDeduction(
    demographics.filingStatus,
    fiscalData.taxYear, // year is already the actual year (e.g., 2040)
    fiscalData.inflationRate
  );

  const taxBrackets = retirementJS_getTaxBrackets(
    demographics.filingStatus,
    fiscalData.taxYear,
    fiscalData.inflationRate
  );

  const fixedIncomeFactors = {
    reportedEarnedInterest: incomeStreams.reportedEarnedInterest,
    myPension: incomeStreams.myPension,
    spousePension: incomeStreams.spousePension,
    rmd: incomeStreams.rmd,
    otherTaxableIncomeAdjustments: incomeStreams.otherTaxableIncomeAdjustments,
    mySsBenefitsGross: incomeStreams.mySs,
    spouseSsBenefitsGross: incomeStreams.spouseSs,
    standardDeduction: standardDeduction,
    nonSsIncome: incomeStreams.nonSsIncome(),
    ssIncome: incomeStreams.ssIncome(),
    precision: 0.01, // Precision for binary search convergence
  };

  const ssBreakdown = {
    inputs: {},
    taxablePortion: 0,
    oneHalfOfSSBenefits: {},
    nonTaxablePortion: {},
    totalBenefits: {},
    myPortion: {},
    spousePortion: {},
    myTaxablePortion: {},
    spouseTaxablePortion: {},
    myNonTaxablePortion: {},
    spouseNonTaxablePortion: {},
    provisionalIncome: {},
    calculationDetails: {},
    ..._calculateSsBenefits(
      fixedIncomeFactors.mySsBenefitsGross,
      fixedIncomeFactors.spouseSsBenefitsGross,
      fixedIncomeFactors.nonSsIncome
    ),
  };

  const incomeBreakdown = {
    reportedEarnedInterest: fixedIncomeFactors.reportedEarnedInterest,
    myPension: fixedIncomeFactors.myPension,
    spousePension: fixedIncomeFactors.spousePension,
    rmd: fixedIncomeFactors.rmd,
    otherTaxableIncomeAdjustments:
      fixedIncomeFactors.otherTaxableIncomeAdjustments,
    retirementAccountWithdrawal: variableIncomeFactor,
    standardDeduction: fixedIncomeFactors.standardDeduction,
    federalIncomeTax: 0,
    socialSecurityIncome:
      ssBreakdown.inputs.myBenefits + ssBreakdown.inputs.spouseBenefits,
    taxableSsIncome: ssBreakdown.taxablePortion,
    standardDeduction: standardDeduction,
    reportableIncome() {
      return (
        this.reportedEarnedInterest +
        this.myPension +
        this.spousePension +
        this.rmd +
        this.otherTaxableIncomeAdjustments +
        this.retirementAccountWithdrawal +
        this.socialSecurityIncome
      );
    },
    rmdPortionOfReportableIncome() {
      return this.reportableIncome() > 0
        ? this.rmd / this.reportableIncome()
        : 0;
    },
    retirementAccountWidthdrawaPortionOfReportableIncome() {
      return this.reportableIncome() > 0
        ? (this.retirementAccountWithdrawal / this.reportableIncome()).round(3)
        : 0;
    },
    ssNonTaxablePortion() {
      return this.socialSecurityIncome - this.taxableSsIncome;
    },
    adjustedGrossIncome() {
      return this.reportableIncome() - this.ssNonTaxablePortion();
    },
    // grossTaxableIncomeWithoutSs() {
    //   return this.nonSsIncome + this.retirementAccountWithdrawal;
    // },
    taxableIncome() {
      return Math.max(0, this.adjustedGrossIncome() - this.standardDeduction);
    },
    netIncome() {
      return this.reportableIncome() - this.federalIncomeTax;
    },
    netIncomeLessReportedEarnedInterest() {
      return this.netIncome() - this.reportedEarnedInterest;
    },
    effectiveTaxRate() {
      if (this.reportableIncome() === 0) return 0;
      return (this.federalIncomeTax / this.reportableIncome()).round(3);
    },
    incomeAsPercentageOfGross(amount = 0) {
      if (this.reportableIncome() === 0) return 0;
      return amount / this.reportableIncome();
    },
    translateGrossAmountToNet(amount = 0) {
      return (
        this.incomeAsPercentageOfGross(amount) * this.netIncome()
      ).asCurrency();
    },
    translateGrossAmountToPortionOfFederalIncomeTax(amount = 0) {
      return (
        this.incomeAsPercentageOfGross(amount) * this.federalIncomeTax
      ).asCurrency();
    },
  };

  incomeBreakdown.federalIncomeTax = retirementJS_determineFederalIncomeTax(
    incomeBreakdown.taxableIncome(),
    taxBrackets
  );

  // Update all the final values in the result object
  // result.allTaxableIncome = incomeBreakdown.reportableIncome();
  // result.taxableIncome = incomeBreakdown.taxableIncome();
  // result.federalTaxesPaid = incomeBreakdown.federalIncomeTax;
  // result.allNetIncome(){ = incomeBreakdown.netIncome();

  result.ssBreakdown = ssBreakdown;
  result.incomeBreakdown = incomeBreakdown;

  return result;
}

function retirementJS_determine401kWithdrawalsToHitNetTargetOf(
  targetIncome,
  incomeStreams,
  demographics,
  fiscalData
) {
  // Declare and initialize the result object at the top
  const result = {
    net: 0,
    withdrawalNeeded: 0,
    tax: 0,
  };

  let lo = 0,
    hi = targetIncome * 2;

  let income = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  for (let i = 0; i < 80; i++) {
    log.info();
    log.info(
      `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
    );
    const guestimate401kWithdrawal = (lo + hi) / 2;
    log.info(
      `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
    );

    income = {
      ...retirementJS_calculateIncomeWhen401kWithdrawalIs(
        guestimate401kWithdrawal,
        incomeStreams,
        demographics,
        fiscalData
      ),
    };

    log.info(`Target income is $${targetIncome.asCurrency()}.`);

    const netIncome = income.incomeBreakdown
      .netIncomeLessReportedEarnedInterest()
      .asCurrency();

    const highLow =
      netIncome > targetIncome.asCurrency()
        ? "TOO HIGH"
        : netIncome < targetIncome.asCurrency()
          ? "TOO LOW"
          : "JUST RIGHT";
    const highLowTextColor =
      netIncome > targetIncome.asCurrency()
        ? "\x1b[31m"
        : netIncome < targetIncome.asCurrency()
          ? "\x1b[34m"
          : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimate401kWithdrawal.round(
        0
      )} then the net income will be $${netIncome} ${highLowTextColor}(${highLow})\x1b[0m`
    );

    if (netIncome == targetIncome.asCurrency()) break;
    if (netIncome < targetIncome) lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
  }

  // Update all the final values in the result object
  result.net = income.incomeBreakdown
    .netIncomeLessReportedEarnedInterest()
    .asCurrency();
  result.withdrawalNeeded = hi.asCurrency();
  result.rmd = incomeStreams.rmd;
  result.tax = income.incomeBreakdown.federalIncomeTax.asCurrency();
  result.calculationDetails = [
    withLabel("income", income),
    withLabel("incomeStreams", incomeStreams),
  ];

  return result;
}

function retirementJS_getTaxBrackets(filingStatus, year, inflationRate) {
  // The year passed is the actual tax year (e.g., 2025, 2026, 2052, etc.)
  // The adjustedForInflation expects years from the base (2025)
  const yearsFromBase = year - 2025;

  if (filingStatus === constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY) {
    return constsJS_TAX_TABLES_2025.mfj.map((bracket) => ({
      rate: bracket.rate,
      upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
    }));
  } else {
    return constsJS_TAX_TABLES_2025.single.map((bracket) => ({
      rate: bracket.rate,
      upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
    }));
  }
}

function retirementJS_getStandardDeduction(filingStatus, year, inflationRate) {
  // Handle potential parameter order issues or missing parameters
  let correctedFilingStatus = filingStatus;
  let correctedYear = year;
  let correctedInflationRate = inflationRate;

  // If parameters seem to be in wrong order, try to auto-correct
  if (typeof filingStatus === "number" && typeof year === "string") {
    log.warn("Parameter order appears incorrect. Auto-correcting.");
    correctedFilingStatus = year;
    correctedYear = filingStatus;
  }

  // Provide defaults for missing parameters
  if (correctedInflationRate === undefined || correctedInflationRate === null) {
    correctedInflationRate = 0.025; // Default 2.5% inflation
    log.warn(
      `Missing inflationRate parameter. Using default: ${correctedInflationRate}`
    );
  }

  if (!correctedFilingStatus) {
    correctedFilingStatus = constsJS_FILING_STATUS.SINGLE;
    log.warn(
      `Missing filingStatus parameter. Using default: ${correctedFilingStatus}`
    );
  }

  if (correctedYear === undefined || correctedYear === null) {
    correctedYear = 2025;
    log.warn(`Missing year parameter. Using default: ${correctedYear}`);
  }

  // The year passed should be the actual tax year (e.g., 2025, 2026, 2052, etc.)
  // The adjustedForInflation expects years from the base (2025)
  const yearsFromBase = correctedYear - TAX_BASE_YEAR;

  if (correctedFilingStatus === constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY) {
    const baseAmount = constsJS_STANDARD_DEDUCTION_2025.mfj;
    const adjusted = baseAmount.adjustedForInflation(
      correctedInflationRate,
      yearsFromBase
    );
    if (isNaN(adjusted)) {
      log.error(
        `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${correctedInflationRate}`
      );
      return 0;
    }
    return adjusted.asCurrency();
  } else {
    const baseAmount = constsJS_STANDARD_DEDUCTION_2025.single;
    const adjusted = baseAmount.adjustedForInflation(
      correctedInflationRate,
      yearsFromBase
    );
    if (isNaN(adjusted)) {
      log.error(
        `Standard deduction calculation resulted in NaN: base=${baseAmount}, yearsFromBase=${yearsFromBase}, inflationRate=${correctedInflationRate}`
      );
      return 0;
    }
    return adjusted.asCurrency();
  }
}

// Wrapper function for backward compatibility with existing calls
function retirementJS_calculateTaxableIncome(
  adjustedGrossIncome,
  standardDeduction
) {
  return Math.max(0, adjustedGrossIncome - standardDeduction);
}

// Wrapper for federal tax calculation using retirement.js functions
function retirementJS_calculateFederalTax(
  taxableIncome,
  filingStatus = constsJS_FILING_STATUS.SINGLE,
  year = 2025,
  inflationRate = 0.025
) {
  const taxBrackets = retirementJS_getTaxBrackets(
    filingStatus,
    year,
    inflationRate
  );
  return retirementJS_determineFederalIncomeTax(taxableIncome, taxBrackets);
}

// ---------------- MODULE EXPORTS ----------------

// Only export as module if we're in Node.js environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    log,
    determineTaxablePortionOfSocialSecurity: _calculateSsBenefits,
    retirementJS_determineFederalIncomeTax:
      retirementJS_determineFederalIncomeTax,
    retirementJS_calculateIncomeWhen401kWithdrawalIs:
      retirementJS_calculateIncomeWhen401kWithdrawalIs,
    retirementJS_determine401kWithdrawalsToHitNetTargetOf,
    // Export some common tax brackets and standard deductions for convenience
    retirementJS_getTaxBrackets,
    retirementJS_getStandardDeduction,
    constsJS_FILING_STATUS,
    round: Number.prototype.round,
    adjustedForInflation: Number.prototype.adjustedForInflation,
  };
}
