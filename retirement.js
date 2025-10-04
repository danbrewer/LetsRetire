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
      return this.myPortion() * this.taxablePortion;
    },
    spouseTaxablePortion() {
      return this.spousePortion() * this.taxablePortion;
    },
    myNonTaxablePortion() {
      return this.myPortion() * this.nonTaxablePortion();
    },
    spouseNonTaxablePortion() {
      return this.spousePortion() * this.nonTaxablePortion();
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
    ).asCurrency();

    calculationDetails.finalTaxableAmount = Math.min(
      0.5 * ssBenefits.totalBenefits(),
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
  let taxableSsInExcessOfTier2Threshold = 0.85 * excessOverTier2;

  taxableSSAmount = Math.min(
    0.85 * ssBenefits.totalBenefits(),
    taxableSsInExcessOfTier1Threshold + taxableSsInExcessOfTier2Threshold
  );

  // Update calculation details
  calculationDetails.incomeExceedingTier1 =
    calculationDetails.tier2Threshold - calculationDetails.tier1Threshold;
  calculationDetails.incomeExceedingTier2 = excessOverTier2;
  calculationDetails.tier1TaxableAmount = taxableSsInExcessOfTier1Threshold;
  calculationDetails.tier2TaxableAmount = Math.min(
    0.85 * ssBenefits.totalBenefits() - taxableSsInExcessOfTier1Threshold,
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

  return tax;
}

function retirementJS_calculateIncomeWhen401kWithdrawalIs(
  variableIncomeFactor,
  fixedIncomeFactorsArg
) {
  // Declare and initialize the result object at the top
  const result = {
    // savingsInterestEarned: 0,
    // allOtherIncome: 0,
    // allTaxableIncome() {
    //   return this.savingsInterestEarned + this.allOtherIncome;
    // },
    // federalTaxesPaid: 0,
    // allNetIncome() {
    //   return this.allTaxableIncome() - this.federalTaxesPaid;
    // },
    // allNetIncomeLessSavings() {
    //   return this.allNetIncome() - this.savingsInterestEarned;
    // },
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const fixedIncomeFactors = {
    estimatedInterestEarned: 0,
    myPension: 0,
    spousePension: 0,
    rmd: 0,
    otherTaxableIncomeAdjustments: 0,
    mySsBenefitsGross: 0,
    spouseSsBenefitsGross: 0,
    standardDeduction: 0,
    taxBrackets: [],
    precision: 0.01,
    ...fixedIncomeFactorsArg,
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
    estimatedInterestEarned: fixedIncomeFactors.estimatedInterestEarned,
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
    allIncome() {
      return (
        this.estimatedInterestEarned +
        this.myPension +
        this.spousePension +
        this.rmd +
        this.otherTaxableIncomeAdjustments +
        this.retirementAccountWithdrawal +
        this.socialSecurityIncome
      );
    },
    ssNonTaxablePortion() {
      return this.socialSecurityIncome - this.taxableSsIncome;
    },
    adjustedGrossIncome() {
      return this.allIncome() - this.ssNonTaxablePortion();
    },
    // grossTaxableIncomeWithoutSs() {
    //   return this.nonSsIncome + this.retirementAccountWithdrawal;
    // },
    taxableIncome() {
      return Math.max(0, this.adjustedGrossIncome() - this.standardDeduction);
    },
    netIncome() {
      return this.allIncome() - this.federalIncomeTax;
    },
    netIncomeLessEarnedInterest() {
      return (
        this.allIncome() - this.federalIncomeTax - this.estimatedInterestEarned
      );
    },
    effectiveTaxRate() {
      if (this.allIncome() === 0) return 0;
      return this.federalIncomeTax / this.allIncome();
    },
    incomeAsPercentageOfGross(amount = 0) {
      if (this.allIncome() === 0) return 0;
      return amount / this.allIncome();
    },
    translateGrossAmountToNet(amount = 0) {
      return this.incomeAsPercentageOfGross(amount) * this.netIncome();
    },
    translateGrossAmountToPortionOfFederalIncomeTax(amount = 0) {
      return this.incomeAsPercentageOfGross(amount) * this.federalIncomeTax;
    },
  };

  incomeBreakdown.federalIncomeTax = retirementJS_determineFederalIncomeTax(
    incomeBreakdown.taxableIncome,
    fixedIncomeFactors.taxBrackets
  );

  // Update all the final values in the result object
  // result.allTaxableIncome = incomeBreakdown.allIncome();
  // result.taxableIncome = incomeBreakdown.taxableIncome();
  // result.federalTaxesPaid = incomeBreakdown.federalIncomeTax;
  // result.allNetIncome(){ = incomeBreakdown.netIncome();

  result.ssBreakdown = ssBreakdown;
  result.incomeBreakdown = incomeBreakdown;

  return result;
}

function retirementJS_determine401kWithdrawalToHitNetTargetOf(
  targetAmount,
  fixedIncomeFactors
) {
  // Declare and initialize the result object at the top
  const result = {
    net: 0,
    withdrawalNeeded: 0,
    tax: 0,
  };

  let lo = 0,
    hi = targetAmount * 2;

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
        fixedIncomeFactors
      ),
    };

    log.info(`Target income is $${targetAmount.asCurrency()}.`);

    const highLow =
      income.incomeBreakdown.netIncome().asCurrency() >
      targetAmount.asCurrency()
        ? "TOO HIGH"
        : income.incomeBreakdown.netIncome().asCurrency() <
            targetAmount.asCurrency()
          ? "TOO LOW"
          : "JUST RIGHT";
    const highLowTextColor =
      income.incomeBreakdown.netIncome().asCurrency() >
      targetAmount.asCurrency()
        ? "\x1b[31m"
        : income.incomeBreakdown.netIncome().asCurrency() <
            targetAmount.asCurrency()
          ? "\x1b[34m"
          : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimate401kWithdrawal.round(
        0
      )} then the net income will be $${income.netIncome.round(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );

    if (
      income.incomeBreakdown.netIncome().asCurrency() ==
      targetAmount.asCurrency()
    )
      break;
    if (income.incomeBreakdown.netIncome() < targetAmount)
      lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.asCurrency() - lo.asCurrency() <= fixedIncomeFactors.precision)
      break;
  }

  // Update all the final values in the result object
  result.net = income.incomeBreakdown.netIncome();
  result.withdrawalNeeded = hi;
  result.tax = income.tax;

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
  const yearsFromBase = correctedYear - 2025;

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
    return adjusted;
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
    return adjusted;
  }
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
    retirementJS_determine401kWithdrawalToHitNetTargetOf,
    // Export some common tax brackets and standard deductions for convenience
    retirementJS_getTaxBrackets,
    retirementJS_getStandardDeduction,
    constsJS_FILING_STATUS,
    round: Number.prototype.round,
    adjustedForInflation: Number.prototype.adjustedForInflation,
  };
}
