// retirement.js

// Add method to Number prototype
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.adjustedForInflation = function (inflationRate, years) {
  const adjustedValue = this * Math.pow(1 + inflationRate, years);
  return adjustedValue;
};

// Global logging level (adjust at runtime)
LOG_LEVEL = 4; // 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG

const LEVELS = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

const log = {
  _shouldLog(level) {
    return LEVELS[level] <= LOG_LEVEL;
  },

  error(...args) {
    if (this._shouldLog("ERROR")) {
      const ts = new Date().toTimeString();
      console.error(`[ERROR] [${ts}]`, ...args);
    }
  },

  warn(...args) {
    if (this._shouldLog("WARN")) {
      const ts = new Date().toTimeString();
      console.warn(`[WARN]  [${ts}]`, ...args);
    }
  },

  info(...args) {
    if (this._shouldLog("INFO")) {
      const ts = ""; // ` [${new Date().toTimeString()}]`;
      console.info(`[INFO]  ${ts}`, ...args);
    }
  },

  debug(...args) {
    if (this._shouldLog("DEBUG")) {
      const ts = new Date().toTimeString();
      console.debug(`[DEBUG] [${ts}]`, ...args);
    }
  },
};

function calculateSsBenefits(
  mySsBenefitsGross,
  spouseSsBenefitsGross,
  allOtherIncome
) {
  // Declare and initialize the result object at the top
  debugger;

  const ssBenefits = {
    myBenefits: mySsBenefitsGross || 0,
    spouseBenefits: spouseSsBenefitsGross || 0,
    allOtherIncome: allOtherIncome || 0,
    taxablePortion: 0,
    oneHalfOfSSBenefits() {
      return (0.5 * (mySsBenefitsGross + spouseSsBenefitsGross)).asCurrency();
    },
    // derived values
    nonTaxablePortion() {
      return this.totalBenefits() - this.taxablePortion;
    },
    totalBenefits() {
      return (this.myBenefits + this.spouseBenefits).asCurrency();
    },
    myPortion() {
      return (this.myBenefits / (this.totalBenefits() || 1)).round(2);
    },
    spousePortion() {
      return (this.spouseBenefits / (this.totalBenefits() || 1)).round(2);
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
      return (this.oneHalfOfSSBenefits() + allOtherIncome).asCurrency();
    },
    effectiveTaxRate() {
      return this.calculationDetails.effectiveTaxRate;
    },
    calculationDetails: {},
  };

  if (isNaN(ssBenefits.totalBenefits()) || isNaN(ssBenefits.allOtherIncome)) {
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
    otherTaxableIncome: allOtherIncome,
    provisionalIncome: ssBenefits.provisionalIncome(),
    tier1Threshold: 32000,
    incomeExceedingTier1: 0,
    tier2Threshold: 44000,
    incomeExceedingTier2: 0,
    tier1TaxableAmount: 0,
    tier2TaxableAmount: 0,
    finalTaxableAmount: 0,
    effectiveTaxRate: 0,
  };

  ssBenefits.calculationDetails = calculationDetails;

  //   log.info("*** Social Security Benefits Taxation ***");
  log.info(
    `Social Security Income: $${ssBenefits.totalBenefits().asCurrency()}`
  );
  log.info(`. Provisional income is defined as 1/2 SS  + Other Taxable Income`);
  log.info(`. 1/2 of SS: $${ssBenefits.oneHalfOfSSBenefits()}`);
  log.info(
    `. Other Taxable Income: $${ssBenefits.allOtherIncome.asCurrency()}`
  );
  log.info(
    `. Provisional Income is $${ssBenefits.provisionalIncome()} ($${allOtherIncome.asCurrency()} + $${ssBenefits.oneHalfOfSSBenefits()})`
  );

  log.info(`Tier 1 threshold: $${calculationDetails.tier1Threshold}`);
  log.info(`Tier 2 threshold: $${calculationDetails.threshold2}`);

  // Case 1: No social security is taxable
  if (
    calculationDetails.provisionalIncome <= calculationDetails.tier1Threshold
  ) {
    log.info(
      `. Provisional income is below Tier 1 ($${calculationDetails.tier1Threshold}). No Social Security benefits are taxable.`
    );
    ssBenefits.taxablePortion = 0;
    debugger;
    return ssBenefits;
  }

  // Case 2: Provisional income exceeds Tier 1 but not Tier 2
  if (calculationDetails.provisionalIncome <= calculationDetails.threshold2) {
    calculationDetails.incomeExceedingTier1 =
      calculationDetails.provisionalIncome - calculationDetails.tier1Threshold;

    let excessOfTier1TaxableAmt = (
      0.5 * calculationDetails.incomeExceedingTier1
    ).asCurrency();

    log.info(`
. Provisional income exceeds Tier 1 ($${calculationDetails.tier1Threshold}) by $${amountInExcessOfBase}.
. Taxable amount of SS is the lesser of:
   50% of total SS benefit ($${0.5 * ssBenefits.totalBenefits()})
        -- or --
   50% of the amount over the Tier1 threshold ($${excessOfTier1TaxableAmt}).`);

    calculationDetails.finalTaxableAmount = Math.min(
      0.5 * ssBenefits.totalBenefits(),
      excessOfTier1TaxableAmt
    ).asCurrency();

    calculationDetails.tier1TaxableAmount =
      calculationDetails.finalTaxableAmount;

    log.info(
      `Amount of SS that is taxable is $${calculationDetails.finalTaxableAmount}.`
    );

    // Update calculation details

    calculationDetails.effectiveTaxRate =
      ssBenefits.totalBenefits() > 0
        ? calculationDetails.finalTaxableAmount / ssBenefits.totalBenefits()
        : 0;

    ssBenefits.taxablePortion = calculationDetails.finalTaxableAmount;
    return ssBenefits;
  }

  // Case 3: Provisional income exceeds Tier 2
  const excessOverBase2 =
    ssBenefits.provisionalIncome() - calculationDetails.tier2Threshold;
  log.info(
    `
. Provisional income exceeds Tier 1 in its entirety: $${calculationDetails.tier2Threshold - calculationDetails.tier1Threshold}.
. Provisional income exceeds Tier 2 threshold ($${calculationDetails.tier2Threshold}) by $${excessOverBase2}
. Taxable amount of SS is the lesser of:
   85% of total SS benefit ($${(
     0.85 * ssBenefits.totalBenefits()
   ).asCurrency()})
     -- or ---
    50% of excess over Tier 1 ($6000) + 85% of the excess over Tier 2 ($${
      0.85 * excessOverBase2
    }).`
  );

  let tier1TaxableAmount =
    0.5 *
    (calculationDetails.tier2Threshold - calculationDetails.tier1Threshold);
  let tier2TaxableAmount = 0.85 * excessOverBase2;

  taxableSSAmount = Math.min(
    0.85 * ssBenefits.totalBenefits(),
    tier1TaxableAmount + tier2TaxableAmount
  );
  log.info(`Taxable amount of SS is $${taxableSSAmount}.`);

  // Update calculation details
  calculationDetails.incomeExceedingTier1 =
    calculationDetails.tier2Threshold - calculationDetails.tier1Threshold;
  calculationDetails.incomeExceedingTier2 = excessOverBase2;
  calculationDetails.tier1TaxableAmount = tier1TaxableAmount;
  calculationDetails.tier2TaxableAmount = Math.min(
    0.85 * ssBenefits.totalBenefits() - tier1TaxableAmount,
    tier2TaxableAmount
  );
  calculationDetails.effectiveTaxRate =
    ssBenefits.totalBenefits() > 0
      ? taxableSSAmount / ssBenefits.totalBenefits()
      : 0;

  ssBenefits.taxablePortion = taxableSSAmount;

  return ssBenefits;
}

function determineTaxUsingBrackets(taxableIncome, brackets, opts) {
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

function calculate401kNetWhen401kGrossIs(gross401kIncome, opts) {
  // Declare and initialize the result object at the top
  const result = {
    totalIncome: 0,
    taxableIncome: 0,
    tax: 0,
    netIncome: 0,
    netIncomeLessSavingsInterest: 0,
    ssBreakdown: {},
    incomeBreakdown: {},
  };

  const {
    pensionAndMiscIncome,
    mySsBenefitsGross,
    spouseSsBenefitsGross,
    standardDeduction,
    brackets,
    precision = 0.01,
  } = opts;

  log.info(`*** Calculate401kNetWhen401kGrossIs ***`);
  log.info(`Inputs: ${JSON.stringify(opts)}`);
  log.info(
    `Calculating after-tax income when 401k withdrawal is $${gross401kIncome.asCurrency()}.`
  );

  const ssBreakdown = {
    ...calculateSsBenefits(
      mySsBenefitsGross,
      spouseSsBenefitsGross,
      pensionAndMiscIncome + gross401kIncome
    ),
  };

  const incomeBreakdown = {
    pensionAndMiscIncome: pensionAndMiscIncome,
    socialSecurityIncome: mySsBenefitsGross + spouseSsBenefitsGross,
    retirementAcctIncome: gross401kIncome,
    taxableSsIncome: ssBreakdown.taxablePortion,
    standardDeduction: standardDeduction,
    federalIncomeTax: 0,
    grossIncome() {
      return (
        this.pensionAndMiscIncome +
        this.retirementAcctIncome +
        this.socialSecurityIncome
      );
    },
    ssNonTaxablePortion() {
      return this.socialSecurityIncome - this.taxableSsIncome;
    },
    grossTaxableIncome() {
      return this.grossIncome() - this.ssNonTaxablePortion();
    },
    grossTaxableIncomeWithoutSs() {
      return this.pensionAndMiscIncome + this.retirementAcctIncome;
    },
    taxableIncome() {
      return Math.max(0, this.grossTaxableIncome() - this.standardDeduction);
    },
    netIncome() {
      return this.grossIncome() - this.federalIncomeTax;
    },
  };

  log.info(`Pension/Misc income is $${pensionAndMiscIncome.asCurrency()}.`);
  log.info(`401k income is $${gross401kIncome.asCurrency()}`);
  log.info(
    `Social Security income is $${(
      mySsBenefitsGross + spouseSsBenefitsGross
    ).asCurrency()}.`
  );
  // log.info(`All taxable income EXCLUDING SS is $${allTaxableIncomeExcludingSS.asCurrency()}.`);

  log.info(`Total income is $${incomeBreakdown.grossIncome().asCurrency()}.`);

  log.info(
    `Taxable income (excluding taxable SS portion) is $${incomeBreakdown.grossTaxableIncomeWithoutSs().asCurrency()} (Pension + 401k)`
  );
  log.info(
    `Taxable portion of SS is $${incomeBreakdown.taxableSsIncome.asCurrency()}.`
  );
  log.info(
    `Total taxable income is $${incomeBreakdown.grossTaxableIncome().round(0)}
    (Pension + 401k + Taxable SS Portion)`
  );
  log.info(
    `Standard deduction is $${incomeBreakdown.standardDeduction.asCurrency()}.`
  );

  log.info(
    `Actual taxable income is $${incomeBreakdown.taxableIncome().asCurrency()} (Total Taxable Income - Standard Deduction)`
  );

  incomeBreakdown.federalIncomeTax = determineTaxUsingBrackets(
    incomeBreakdown.taxableIncome,
    brackets,
    opts
  );

  // log.info(
  //   `Gross income from all sources is $${grossTaxableIncome.asCurrency()}.`
  // );
  log.info(`Taxes owed are $${incomeBreakdown.federalIncomeTax.asCurrency()}.`);

  log.info(
    `Net income is $${incomeBreakdown.netIncome().asCurrency()} (Pension + 401k + SS - Tax)`
  );

  // Update all the final values in the result object
  result.totalIncome = incomeBreakdown.grossIncome;
  result.taxableIncome = incomeBreakdown.taxableIncome();
  result.tax = incomeBreakdown.federalIncomeTax;
  result.netIncome = incomeBreakdown.netIncome();

  result.ssBreakdown = ssBreakdown;
  result.incomeBreakdown = incomeBreakdown;
  result.netIncomeLessSavingsInterest =
    result.netIncome - opts.taxableSavingsInterest;

  return result;
}

function determine401kWithdrawalToHitNetTargetOf(targetAmount, opts) {
  // Declare and initialize the result object at the top
  debugger;
  const result = {
    net: 0,
    withdrawalNeeded: 0,
    tax: 0,
  };

  let lo = 0,
    hi = targetAmount * 2,
    income;
  for (let i = 0; i < 80; i++) {
    log.info();
    log.info(
      `===== Iteration ${i}: lo=$${lo.asCurrency()}, hi=$${hi.asCurrency()} ======`
    );
    const guestimate401kWithdrawal = (lo + hi) / 2;
    log.info(
      `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.asCurrency()}`
    );

    const income = {
      totalIncome: 0,
      taxableIncome: 0,
      tax: 0,
      netIncome: 0,
      ssBreakdown: {},
      incomeBreakdown: {},
      ...calculate401kNetWhen401kGrossIs(guestimate401kWithdrawal, opts),
    };

    log.info(`Target income is $${targetAmount.asCurrency()}.`);

    const highLow =
      income.netIncome.asCurrency() > targetAmount.asCurrency()
        ? "TOO HIGH"
        : income.netIncome.asCurrency() < targetAmount.asCurrency()
          ? "TOO LOW"
          : "JUST RIGHT";
    const highLowTextColor =
      income.netIncome.asCurrency() > targetAmount.asCurrency()
        ? "\x1b[31m"
        : income.net.asCurrency() < targetAmount.asCurrency()
          ? "\x1b[34m"
          : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimate401kWithdrawal.round(
        0
      )} then the net income will be $${income.netIncome.round(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );

    if (income.netIncome.asCurrency() == targetAmount.asCurrency()) break;
    if (income.netIncome < targetAmount) lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.asCurrency() - lo.asCurrency() <= opts.precision) break;
  }

  // Update all the final values in the result object
  result.net = income.netIncome;
  result.withdrawalNeeded = hi;
  result.tax = income.tax;

  return result;
}

// 2025 Federal Income Tax Brackets
// Source: IRS inflation adjustments (effective Jan 1, 2025)

const TAX_TABLES_2025 = {
  single: [
    { rate: 0.1, upTo: 11600 },
    { rate: 0.12, upTo: 47150 },
    { rate: 0.22, upTo: 100525 },
    { rate: 0.24, upTo: 191950 },
    { rate: 0.32, upTo: 243725 },
    { rate: 0.35, upTo: 609350 },
    { rate: 0.37, upTo: Infinity },
  ],
  mfj: [
    { rate: 0.1, upTo: 23200 },
    { rate: 0.12, upTo: 94300 },
    { rate: 0.22, upTo: 201050 },
    { rate: 0.24, upTo: 383900 },
    { rate: 0.32, upTo: 487450 },
    { rate: 0.35, upTo: 731200 },
    { rate: 0.37, upTo: Infinity },
  ],
};

function getTaxBrackets(filingStatus, year, inflationRate) {
  // The year passed is the actual tax year (e.g., 2025, 2026, 2052, etc.)
  // The adjustedForInflation expects years from the base (2025)
  const yearsFromBase = year - 2025;

  if (filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY) {
    return TAX_TABLES_2025.mfj.map((bracket) => ({
      rate: bracket.rate,
      upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
    }));
  } else {
    return TAX_TABLES_2025.single.map((bracket) => ({
      rate: bracket.rate,
      upTo: bracket.upTo.adjustedForInflation(inflationRate, yearsFromBase),
    }));
  }
}

const STANDARD_DEDUCTION_2025 = {
  single: 14600,
  mfj: 29200,
};

const FILING_STATUS = {
  SINGLE: "single",
  MARRIED_FILING_JOINTLY: "married",
};

function getStandardDeduction(filingStatus, year, inflationRate) {
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
    correctedFilingStatus = FILING_STATUS.SINGLE;
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

  if (correctedFilingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY) {
    const baseAmount = STANDARD_DEDUCTION_2025.mfj;
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
    const baseAmount = STANDARD_DEDUCTION_2025.single;
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
    determineTaxablePortionOfSocialSecurity: calculateSsBenefits,
    determineTaxUsingBrackets,
    calculate401kNetWhen401kGrossIs,
    determine401kWithdrawalToHitNetTargetOf,
    // Export some common tax brackets and standard deductions for convenience
    getTaxBrackets,
    getStandardDeduction,
    FILING_STATUS,
    round: Number.prototype.round,
    adjustedForInflation: Number.prototype.adjustedForInflation,
  };
}
