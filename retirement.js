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

function determineTaxablePortionOfSocialSecurity(ssGross, otherIncome) {
  // Declare and initialize the result object at the top
  const result = {
    taxablePortion: 0,
    provisionalIncome: 0,
    calculationDetails: {
      method: "irs-rules",
      threshold1: 32000,
      threshold2: 44000,
      otherTaxableIncome: 0,
      halfSSBenefit: 0,
      excessIncome1: 0,
      excessIncome2: 0,
      tier1Amount: 0,
      tier2Amount: 0,
      effectiveRate: 0,
    },
  };

  // Ensure inputs are valid numbers to prevent NaN propagation
  const safeSSGross = isNaN(ssGross) ? 0 : ssGross;
  const safeOtherIncome = isNaN(otherIncome) ? 0 : otherIncome;

  if (safeSSGross !== ssGross || safeOtherIncome !== otherIncome) {
    log.warn(
      `determineTaxablePortionOfSocialSecurity received NaN values: ssGross=${ssGross}, otherIncome=${otherIncome}. Using safe values: ssGross=${safeSSGross}, otherIncome=${safeOtherIncome}`
    );
  }

  const provisionalIncome = safeOtherIncome + 0.5 * safeSSGross;
  result.provisionalIncome = provisionalIncome;

  // Update calculation details
  result.calculationDetails.otherTaxableIncome = safeOtherIncome;
  result.calculationDetails.halfSSBenefit = 0.5 * safeSSGross;

  let taxableSSAmount = 0;
  //   log.info("*** Social Security Benefits Taxation ***");
  log.info(`Social Security Income: $${safeSSGross.asCurrency()}`);
  log.info(`. Provisional income is defined as 1/2 SS  + Other Taxable Income`);
  log.info(`. 1/2 of SS: $${(0.5 * safeSSGross).asCurrency()}`);
  log.info(`. Other Taxable Income: $${safeOtherIncome.asCurrency()}`);
  log.info(
    `. Provisional Income is $${provisionalIncome.round(
      2
    )} ($${safeOtherIncome.asCurrency()} + $${(
      0.5 * safeSSGross
    ).asCurrency()})`
  );

  const base1 = 32000;
  const base2 = 44000;
  log.info(`Tier 1 threshold: $${base1}`);
  log.info(`Tier 2 threshold: $${base2}`);

  if (provisionalIncome <= base1) {
    log.info(
      `. Provisional income is below Tier 1 ($${base1}). No Social Security benefits are taxable.`
    );
    result.taxablePortion = taxableSSAmount;
    result.calculationDetails.effectiveRate = 0;
    return result;
  }

  if (provisionalIncome <= base2) {
    let amountInExcessOfBase = provisionalIncome - base1;
    let tier1TaxableAmount = 0.5 * amountInExcessOfBase;

    log.info(
      `. Provisional income exceeds Tier 1 ($${base1}) by $${amountInExcessOfBase.round(
        2
      )}.`
    );
    log.info(`   50% of SS benefit ($${(0.5 * safeSSGross).asCurrency()})`);
    log.info(`     -- or --`);
    log.info(
      `   50% of the amount over the Tier1 threshold ($${tier1TaxableAmount.round(
        2
      )}).`
    );

    taxableSSAmount = Math.min(0.5 * safeSSGross, tier1TaxableAmount);

    log.info(
      `Amount of SS that is taxable is $${taxableSSAmount.asCurrency()}.`
    );

    // Update calculation details
    result.calculationDetails.excessIncome1 = amountInExcessOfBase;
    result.calculationDetails.tier1Amount = taxableSSAmount;
    result.calculationDetails.effectiveRate =
      safeSSGross > 0 ? taxableSSAmount / safeSSGross : 0;

    result.taxablePortion = taxableSSAmount;
    return result;
  }

  const excessOverBase2 = provisionalIncome - base2;
  log.info(
    `. Provisional income exceeds Tier 1 in its entirety: $${base2 - base1}.`
  );
  log.info(
    `. Provisional income exceeds Tier 2 threshold ($${base2}) by $${excessOverBase2.round(
      2
    )}`
  );
  log.info(`. Taxable amount of SS is the lesser of:`);
  log.info(
    `    85% of total SS benefit ($${(0.85 * safeSSGross).asCurrency()})`
  );
  log.info(`     -- or ---`);
  log.info(
    `    50% of excess over Tier 1 ($6000) + 85% of the excess over Tier 2 ($${(
      0.85 * excessOverBase2
    ).asCurrency()}).`
  );

  let tier1Max = 0.5 * (base2 - base1);
  let tier2TaxableAmount = 0.85 * excessOverBase2;

  taxableSSAmount = Math.min(0.85 * safeSSGross, tier1Max + tier2TaxableAmount);
  log.info(`Amount of SS that is taxable is $${taxableSSAmount.asCurrency()}.`);

  // Update calculation details
  result.calculationDetails.excessIncome1 = base2 - base1;
  result.calculationDetails.excessIncome2 = excessOverBase2;
  result.calculationDetails.tier1Amount = tier1Max;
  result.calculationDetails.tier2Amount = Math.min(
    0.85 * safeSSGross - tier1Max,
    tier2TaxableAmount
  );
  result.calculationDetails.effectiveRate =
    safeSSGross > 0 ? taxableSSAmount / safeSSGross : 0;

  result.taxablePortion = taxableSSAmount;
  return result;
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

function calculate401kNetWhen401kGrossIs(gross401k, opts) {
  // Declare and initialize the result object at the top
  const result = {
    net: 0,
    tax: 0,
    taxablePortionOfSS: 0,
    allTaxableIncomeExcludingSs: 0,
    grossIncome: 0,
    taxableIncome: 0,
  };

  const {
    fixedPortionOfTaxableIncome,
    combinedSsGrossIncome,
    standardDeduction,
    brackets,
    precision = 0.01,
  } = opts;

  log.info(`*** calculate401kNetWhen401kGrossIs ***`);
  log.info(`Inputs: ${JSON.stringify(opts)}`);
  log.info(
    `Calculating after-tax income when 401k withdrawal is $${gross401k.asCurrency()}.`
  );
  const allTaxableIncomeExcludingSS = gross401k + fixedPortionOfTaxableIncome;
  const ssBreakdown = determineTaxablePortionOfSocialSecurity(
    combinedSsGrossIncome,
    allTaxableIncomeExcludingSS
  );

  const grossIncome = allTaxableIncomeExcludingSS + ssBreakdown.taxablePortion;

  const taxableIncome = Math.max(0, grossIncome - standardDeduction);

  log.info(
    `Fixed portion of gross income is $${fixedPortionOfTaxableIncome.asCurrency()}.`
  );
  log.info(`401k withdrawal is $${gross401k.asCurrency()}.`);
  log.info(
    `Gross income (excluding taxable SS portion) is $${allTaxableIncomeExcludingSS.asCurrency()}.`
  );
  log.info(
    `Taxable portion of SS is $${ssBreakdown.taxablePortion.asCurrency()}.`
  );
  log.info(
    `Gross income is $${grossIncome.round(
      0
    )}. (${allTaxableIncomeExcludingSS.asCurrency()} + ${ssBreakdown.taxablePortion.asCurrency()})`
  );
  log.info(`Standard deduction is $${standardDeduction.asCurrency()}.`);
  log.info(`Taxable income is $${taxableIncome.asCurrency()}.`);

  // debugger;
  const incomeTaxOwed = determineTaxUsingBrackets(
    taxableIncome,
    brackets,
    opts
  );

  log.info(`Gross income from all sources is $${grossIncome.asCurrency()}.`);
  log.info(`Taxes owed are $${incomeTaxOwed.asCurrency()}.`);

  const netIncome =
    allTaxableIncomeExcludingSS + combinedSsGrossIncome - incomeTaxOwed;

  log.info(`Net income after taxes is $${netIncome.asCurrency()}.`);

  // Update all the final values in the result object
  result.net = netIncome;
  result.tax = incomeTaxOwed;
  result.taxablePortionOfSS = ssBreakdown.taxablePortion;
  result.allTaxableIncomeExcludingSs = allTaxableIncomeExcludingSS;
  result.grossIncome = grossIncome;
  result.taxableIncome = taxableIncome;

  return result;
}

function determine401kWithdrawalToHitNetTargetOf(targetAmount, opts) {
  // Declare and initialize the result object at the top
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

    income = calculate401kNetWhen401kGrossIs(guestimate401kWithdrawal, opts);

    log.info(`Target income is $${targetAmount.asCurrency()}.`);

    const highLow =
      income.net.asCurrency() > targetAmount.asCurrency()
        ? "TOO HIGH"
        : income.net.asCurrency() < targetAmount.asCurrency()
        ? "TOO LOW"
        : "JUST RIGHT";
    const highLowTextColor =
      income.net.asCurrency() > targetAmount.asCurrency()
        ? "\x1b[31m"
        : income.net.asCurrency() < targetAmount.asCurrency()
        ? "\x1b[34m"
        : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimate401kWithdrawal.round(
        0
      )} then the net income will be $${income.net.round(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );

    if (income.net.asCurrency() == targetAmount.asCurrency()) break;
    if (income.net < targetAmount) lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.asCurrency() - lo.asCurrency() <= opts.precision) break;
  }

  // Update all the final values in the result object
  result.net = income.net;
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
    determineTaxablePortionOfSocialSecurity,
    determineTaxUsingBrackets,
    calculate401kNetWhen401kGrossIs: calculate401kNetWhen401kGrossIs,
    determine401kWithdrawalToHitNetTargetOf,
    // Export some common tax brackets and standard deductions for convenience
    getTaxBrackets,
    getStandardDeduction,
    FILING_STATUS,
    round: Number.prototype.round,
    adjustedForInflation: Number.prototype.adjustedForInflation,
  };
}
