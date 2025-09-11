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
      const ts = new Date().toTimeString();
      console.info(`[INFO]  [${ts}]`, ...args);
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
  const provisionalIncome = otherIncome + 0.5 * ssGross;
  let taxableSSAmount = 0;
  //   log.info("*** Social Security Benefits Taxation ***");
  log.info(`Social Security Income: $${ssGross.round(2)}`);
  log.info(`. Provisional income is defined as 1/2 SS  + Other Taxable Income`);
  log.info(`. 1/2 of SS: $${(0.5 * ssGross).round(2)}`);
  log.info(`. Other Taxable Income: $${otherIncome.round(2)}`);
  log.info(
    `. Provisional Income is $${provisionalIncome.round(
      2
    )} ($${otherIncome.round(2)} + $${(0.5 * ssGross).round(2)})`
  );

  const base1 = 32000;
  const base2 = 44000;
  log.info(`Tier 1 threshold: $${base1}`);
  log.info(`Tier 2 threshold: $${base2}`);

  if (provisionalIncome <= base1) {
    log.info(
      `. Provisional income is below Tier 1 ($${base1}). No Social Security benefits are taxable.`
    );
    return {
      taxableSSAmount,
      provisionalIncome,
    };
  }

  if (provisionalIncome <= base2) {
    let amountInExcessOfBase = 0.5 * (provisionalIncome - base1);
    log.info(
      `. Provisional income exceeds Tier 1 ($${base1}) by $${amountInExcessOfBase.round(
        2
      )}.`
    );
    log.info(`. Taxable SS amount is the lesser of:`);
    log.info(`   50% of SS benefit ($${(0.5 * ssGross).round(2)})`);
    log.info(`     -- or --`);
    log.info(
      `   50% of the amount over the Tier1 threshold ($${(
        0.5 * amountInExcessOfBase
      ).round(2)}).`
    );
    log.info(
      `Amount of SS that is taxable is $${Math.min(
        0.5 * ssGross,
        0.5 * amountInExcessOfBase
      ).round(2)}.`
    );

    taxableSSAmount = Math.min(0.5 * ssGross, 0.5 * amountInExcessOfBase);

    return {
      taxableSSAmount,
      provisionalIncome,
    };
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
  log.info(`    85% of total SS benefit ($${(0.85 * ssGross).round(2)})`);
  log.info(`     -- or ---`);
  log.info(
    `    50% of excess over Tier 1 ($6000) + 85% of the excess over Tier 2 ($${(
      0.85 * excessOverBase2
    ).round(2)}).`
  );
  taxableSSAmount = Math.min(
    0.85 * ssGross,
    0.5 * (base2 - base1) + 0.85 * excessOverBase2
  );
  log.info(`Amount of SS that is taxable is $${taxableSSAmount.round(2)}.`);
  return {
    taxableSSAmount,
    provisionalIncome,
  };
}

function determineTaxUsingBrackets(
  taxableIncome,
  brackets,
  inflationRate,
  yearNum
) {
  let tax = 0,
    prev = 0;

  for (const { upTo, rate } of brackets) {
    const slice = Math.min(taxableIncome, upTo) - prev;
    if (slice > 0) tax += slice * rate;
    if (taxableIncome <= upTo) break;
    prev = upTo;
  }
  log.info(`Total tax calculated is $${tax.round(2)}.`);

  return tax;
}

function calculateNetWhen401kIncomeIs(guestimateFor401k, opts) {
  const { otherTaxableIncome, ssBenefit, standardDeduction, brackets } = opts;

  log.info(`*** calculateNetWhen401kIncomeIs ***`);
  log.info(
    `Calculating net income when 401k withdrawal is $${guestimateFor401k.round(
      2
    )}.`
  );
  const allTaxableIncomeExcludingSS = guestimateFor401k + otherTaxableIncome;
  const taxableSSResult = determineTaxablePortionOfSocialSecurity(
    ssBenefit,
    allTaxableIncomeExcludingSS
  );
  const grossIncome =
    allTaxableIncomeExcludingSS + taxableSSResult.taxableSSAmount;
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  log.info(`Other taxable income is $${otherTaxableIncome.round(2)}.`);
  log.info(`401k withdrawal is $${guestimateFor401k.round(2)}.`);
  log.info(
    `Taxable income (excluding SS) is $${allTaxableIncomeExcludingSS.round(2)}.`
  );
  log.info(
    `Taxable SS amount is $${taxableSSResult.taxableSSAmount.round(2)}.`
  );
  log.info(
    `Gross taxable income is $${grossIncome.round(
      0
    )}. (${allTaxableIncomeExcludingSS.round(
      2
    )} + ${taxableSSResult.taxableSSAmount.round(2)})`
  );
  log.info(`Standard deduction is $${standardDeduction.round(2)}.`);
  log.info(`Actual taxable income is $${taxableIncome.round(2)}.`);

  const tax = determineTaxUsingBrackets(taxableIncome, brackets);

  log.info(
    `Total income from all sources is $${(
      allTaxableIncomeExcludingSS + ssBenefit
    ).round(2)}.`
  );
  log.info(`Taxes owed are $${tax.round(2)}.`);

  const netIncome = allTaxableIncomeExcludingSS + ssBenefit - tax;

  log.info(`Net income after taxes is $${netIncome.round(2)}.`);

  return {
    netIncome,
    tax,
    taxableSSAmt: taxableSSResult.taxableSSAmount,
    totalTaxableIncome: allTaxableIncomeExcludingSS,
    grossTaxableIncome: grossIncome,
    actualTaxableIncome: taxableIncome,
  };
}

function determine401kWithdrawalToHitNetTargetOf(targetAmount, opts) {
  if (opts.otherTaxableIncome) {
    let net = calculateNetWhen401kIncomeIs(0, opts);
    if (net.netIncome.round(2) > targetAmount.round(2)) {
      log.info(`Other income makes it unnecessary to withdraw from 401k`);
      log.info(`Net income with other income is $${net.netIncome.round(2)}`);
      return {
        net: net.netIncome,
        withdrawalNeeded: 0,
        tax: net.tax,
      };
    }
  }

  let lo = 0,
    hi = targetAmount * 2,
    net;
  for (let i = 0; i < 80; i++) {
    log.info();
    log.info(
      `===== Iteration ${i}: lo=$${lo.round(2)}, hi=$${hi.round(2)} ======`
    );
    const guestimate401kWithdrawal = (lo + hi) / 2;
    log.info(
      `Guestimate 401k withdrawal: $${guestimate401kWithdrawal.round(2)}`
    );

    net = calculateNetWhen401kIncomeIs(guestimate401kWithdrawal, opts);

    log.info(`Target income is $${targetAmount.round(2)}.`);

    const highLow =
      net.netIncome.round(2) > targetAmount.round(2)
        ? "TOO HIGH"
        : net.netIncome.round(2) < targetAmount.round(2)
        ? "TOO LOW"
        : "JUST RIGHT";
    const highLowTextColor =
      net.netIncome.round(2) > targetAmount.round(2)
        ? "\x1b[31m"
        : net.netIncome.round(2) < targetAmount.round(2)
        ? "\x1b[34m"
        : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimate401kWithdrawal.round(
        0
      )} then the net income will be $${net.netIncome.round(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );

    if (net.netIncome.round(2) == targetAmount.round(2)) break;
    if (net.netIncome < targetAmount) lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.round(2) - lo.round(2) <= opts.precision) break;
  }

  return {
    net: net.netIncome,
    withdrawalNeeded: hi,
    tax: net.tax,
  };
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

function getTaxBrackets(filingStatus) {
  if (filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY) {
    return TAX_TABLES_2025.mfj;
  } else {
    return TAX_TABLES_2025.single;
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

function getStandardDeduction(filingStatus) {
  if (filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY) {
    return STANDARD_DEDUCTION_2025.mfj;
  } else {
    return STANDARD_DEDUCTION_2025.single;
  }
}

// ---------------- MODULE EXPORTS ----------------

// Only export as module if we're in Node.js environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    log,
    determineTaxablePortionOfSocialSecurity,
    determineTaxUsingBrackets,
    calculateNetWhen401kIncomeIs,
    determine401kWithdrawalToHitNetTargetOf,
    // Export some common tax brackets and standard deductions for convenience
    getTaxBrackets,
    getStandardDeduction,
    FILING_STATUS,
    round: Number.prototype.round,
    adjustedForInflation: Number.prototype.adjustedForInflation,
  };
}
