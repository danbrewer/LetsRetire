// retirement.js

// Add method to Number prototype
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

// Global logging level (adjust at runtime)
LOG_LEVEL = 0; // 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG

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
      const ts = new Date().toISOString();
      console.error(`[ERROR] [${ts}]`, ...args);
    }
  },

  warn(...args) {
    if (this._shouldLog("WARN")) {
      const ts = new Date().toISOString();
      console.warn(`[WARN]  [${ts}]`, ...args);
    }
  },

  info(...args) {
    if (this._shouldLog("INFO")) {
      const ts = new Date().toISOString();
      console.info(`[INFO]  [${ts}]`, ...args);
    }
  },

  debug(...args) {
    if (this._shouldLog("DEBUG")) {
      const ts = new Date().toISOString();
      console.debug(`[DEBUG] [${ts}]`, ...args);
    }
  },
};

function taxableSS(ssBenefit, otherIncome) {
  const provisional = otherIncome + 0.5 * ssBenefit;
  //   log.info("*** Social Security Benefits Taxation ***");
  log.info(`Social Security Income: $${ssBenefit.round(2)}`);
  log.info(`. Provisional income is defined as 1/2 SS  + Other Taxable Income`);
  log.info(`. 1/2 of SS: $${(0.5 * ssBenefit).round(2)}`);
  log.info(`. Other Taxable Income: $${otherIncome.round(2)}`);
  log.info(
    `. Provisional Income is $${provisional.round(2)} ($${otherIncome.round(
      2
    )} + $${(0.5 * ssBenefit).round(2)})`
  );

  const base1 = 32000;
  const base2 = 44000;
  log.info(`Tier 1 threshold: $${base1}`);
  log.info(`Tier 2 threshold: $${base2}`);

  if (provisional <= base1) {
    log.info(
      `. Provisional income is below Tier 1 ($${base1}). No Social Security benefits are taxable.`
    );
    return 0;
  }

  if (provisional <= base2) {
    log.info(
      `. Provisional income exceeds Tier 1 ($${base1}) by $${(
        provisional - base1
      ).round(2)}.`
    );
    log.info(`. Taxable SS amount is the lesser of:`);
    log.info(`   50% of SS benefit ($${(0.5 * ssBenefit).round(2)})`);
    log.info(`     -- or --`);
    log.info(
      `   50% of the amount over the Tier1 threshold ($${(
        0.5 *
        (provisional - base1)
      ).round(2)}).`
    );
    log.info(
      `Amount of SS that is taxable is $${Math.min(
        0.5 * ssBenefit,
        0.5 * (provisional - base1)
      ).round(2)}.`
    );
    return Math.min(0.5 * ssBenefit, 0.5 * (provisional - base1));
  }

  const excessOverBase2 = provisional - base2;
  log.info(
    `. Provisional income exceeds Tier 1 in its entirety: $${base2 - base1}.`
  );
  log.info(
    `. Provisional income exceeds Tier 2 threshold ($${base2}) by $${excessOverBase2.round(
      2
    )}`
  );
  log.info(`. Taxable amount of SS is the lesser of:`);
  log.info(`    85% of total SS benefit ($${(0.85 * ssBenefit).round(2)})`);
  log.info(`     -- or ---`);
  log.info(
    `    50% of excess over Tier 1 ($6000) + 85% of the excess over Tier 2 ($${(
      0.85 * excessOverBase2
    ).round(2)}).`
  );
  const taxableSSAmount = Math.min(
    0.85 * ssBenefit,
    0.5 * (base2 - base1) + 0.85 * excessOverBase2
  );
  log.info(`Amount of SS that is taxable is $${taxableSSAmount.round(2)}.`);
  return taxableSSAmount;
}

function taxFromBrackets(taxable, brackets) {
  let tax = 0,
    prev = 0;
  for (const { upto, rate } of brackets) {
    const slice = Math.min(taxable, upto) - prev;
    if (slice > 0) tax += slice * rate;
    if (taxable <= upto) break;
    prev = upto;
  }
  log.info(`Total tax calculated is $${tax.round(2)}.`);
  return tax;
}

function reverseCalculate401kWithdrawalToHitNetTargetOf(targetAmount, opts) {
  const {
    otherTaxableIncome,
    ssBenefit,
    standardDeduction,
    brackets,
    precision = 0.01, // within 1 cent
  } = opts;

  function calculateNetWhenTaxableIncomeIs(guestimateFor401k, taxableIncome) {
    log.info(`*** calculateNetWhenTaxableIncomeIs ***`);
    log.info(
      `Calculating net income when other taxable income is $${taxableIncome.round(
        2
      )}.`
    );
    const totalTaxableIncome = guestimateFor401k + taxableIncome;
    const taxableSSAmt = taxableSS(ssBenefit, totalTaxableIncome);
    const grossTaxableIncome = totalTaxableIncome + taxableSSAmt;
    const actualTaxableIncome = Math.max(
      0,
      grossTaxableIncome - standardDeduction
    );
    log.info(`Other taxable income is $${totalTaxableIncome.round(2)}.`);
    log.info(`Taxable SS amount is $${taxableSSAmt.round(2)}.`);
    log.info(
      `Gross taxable income is $${grossTaxableIncome.round(
        0
      )}. (${totalTaxableIncome.round(2)} + ${taxableSSAmt.round(2)})`
    );
    log.info(`Standard deduction is $${standardDeduction.round(2)}.`);
    log.info(`Actual taxable income is $${actualTaxableIncome.round(2)}.`);

    const tax = taxFromBrackets(actualTaxableIncome, brackets);

    log.info(
      `Total income from all sources is $${(
        totalTaxableIncome + ssBenefit
      ).round(2)}.`
    );
    log.info(`Taxes owed are $${tax.round(2)}.`);

    const netIncome = totalTaxableIncome + ssBenefit - tax;

    log.info(`Net income after taxes is $${netIncome.round(2)}.`);

    log.info(`Target income is $${targetAmount.round(2)}.`);

    const highLow =
      netIncome.round(2) > targetAmount.round(2)
        ? "TOO HIGH"
        : netIncome.round(2) < targetAmount.round(2)
        ? "TOO LOW"
        : "JUST RIGHT";
    const highLowTextColor =
      netIncome.round(2) > targetAmount.round(2)
        ? "\x1b[31m"
        : netIncome.round(2) < targetAmount.round(2)
        ? "\x1b[34m"
        : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    log.info(
      `When 401k withdrawal is $${guestimateFor401k.round(
        0
      )} then the net income will be $${netIncome.round(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );
    return {
      netIncome,
      tax,
    };
  }

  //   debugger;
  if (otherTaxableIncome) {
    let net = calculateNetWhenTaxableIncomeIs(0, otherTaxableIncome);
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
    net = calculateNetWhenTaxableIncomeIs(
      guestimate401kWithdrawal,
      otherTaxableIncome
    );
    if (net.netIncome.round(2) == targetAmount.round(2)) break;
    if (net.netIncome < targetAmount) lo = guestimate401kWithdrawal;
    else hi = guestimate401kWithdrawal;
    if (hi.round(2) - lo.round(2) <= precision) break;
  }

  return {
    net: net.netIncome,
    withdrawalNeeded: hi,
    tax: net.tax,
  };
}

// ---------------- CLI ----------------

// Grab args: node retirement.js 100000 32307 [savings] [otherTaxableIncomeStr]
const [, , targetNetStr, ssBenefitStr, savingsStr, otherTaxableIncomeStr] =
  process.argv;

if (!targetNetStr || !ssBenefitStr) {
  console.error(
    "Usage: node retirement.js <targetNet> <ssBenefit> [taxExemptSavings]"
  );
  process.exit(1);
}

const netTarget = parseFloat(targetNetStr);
const ssBenefit = parseFloat(ssBenefitStr);
const savings = parseFloat(savingsStr || "0");
const otherTaxableIncome = parseFloat(otherTaxableIncomeStr || "0");

// Example 2024 MFJ brackets
const brackets = [
  { upto: 23200, rate: 0.1 },
  { upto: 94300, rate: 0.12 },
  { upto: 201050, rate: 0.22 },
  { upto: Infinity, rate: 0.24 },
];

// Remove savings because it is not taxable
const targetLessSavings = netTarget - savings;

const result = reverseCalculate401kWithdrawalToHitNetTargetOf(
  targetLessSavings,
  {
    otherTaxableIncome,
    ssBenefit,
    standardDeduction: 29200, // MFJ 2024 demo
    brackets,
  }
);
log.info();
log.info("====================================");
log.info("*** Retirement Income Summary ***");
log.info("====================================");
log.info();
log.info("Target Net Income:          $", netTarget.toFixed(0));
log.info();
log.info("Social Security Benefit:    $", ssBenefit.toFixed(0));
log.info("+ other Taxable Income:     $", otherTaxableIncome.toFixed(0));
log.info("+ 401k Withdrawal Needed:   $", result.withdrawalNeeded.toFixed(0));
log.info("---------------------------------------");
log.info(
  "Total Income:               $",
  (otherTaxableIncome + ssBenefit + result.withdrawalNeeded).toFixed(0)
);
log.info("- Taxes:                    $", result.tax.toFixed(0));
log.info("=======================================");
log.info("Net income:                 $", result.net.toFixed(0));
log.info("+ savings contribution:     $", savings.toFixed(0));
log.info(
  "Final spend:                $",
  (
    otherTaxableIncome +
    ssBenefit +
    savings +
    result.withdrawalNeeded -
    result.tax
  ).toFixed(0)
);
