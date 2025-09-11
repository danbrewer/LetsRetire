// Include retirement.js as module
const {
  log,
  determine401kWithdrawalToHitNetTargetOf,
  getTaxBrackets,
  getStandardDeduction,
  FILING_STATUS,
} = require("./retirement.js");

// ---------------- CLI ----------------

// Parse named command line arguments
function parseArgs() {
  const args = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=");
      args[key.substring(2)] = value;
    }
  }

  return args;
}

function showUsage() {
  console.log(
    "Usage: node retirement_testing.js --target=<amount> --ss=<amount> [options]"
  );
  console.log("");
  console.log("Required:");
  console.log("  --target=<amount>     Target net income amount");
  console.log("  --ss=<amount>         Social Security benefit amount");
  console.log("");
  console.log("Optional:");
  console.log(
    "  --savings=<amount>    Tax-exempt savings contribution (default: 0)"
  );
  console.log("  --other=<amount>      Other taxable income (default: 0)");
  console.log(
    "  --year=<number>       Future year for COLA adjustments (default: 0)"
  );
  console.log("");
  console.log("Examples:");
  console.log("  node retirement_testing.js --target=100000 --ss=32307");
  console.log(
    "  node retirement_testing.js --target=100000 --ss=32307 --savings=10000 --other=5000"
  );
  console.log(
    "  node retirement_testing.js --target=100000 --ss=32307 --year=5"
  );
}

const args = parseArgs();

// Validate required parameters
if (!args.target || !args.ss) {
  console.error("Error: Missing required parameters.");
  console.error("");
  showUsage();
  process.exit(1);
}

// Parse and validate numeric values
const netTarget = parseFloat(args.target);
const ssBenefit = parseFloat(args.ss);
const savings = parseFloat(args.savings || "0");
const otherTaxableIncome = parseFloat(args.other || "0");
const year = parseInt(args.year || "0");

if (
  isNaN(netTarget) ||
  isNaN(ssBenefit) ||
  isNaN(savings) ||
  isNaN(otherTaxableIncome) ||
  isNaN(year)
) {
  console.error("Error: All parameters must be valid numbers.");
  console.error("");
  showUsage();
  process.exit(1);
}
const filingStatus = FILING_STATUS.MARRIED_FILING_JOINTLY;

// Use tax brackets and standard deduction for the specified year (with COLA if year > 0)
const brackets = getTaxBrackets(filingStatus, year);
const standardDeduction = getStandardDeduction(filingStatus, year);

// Remove savings because it is not taxable
const target_LessSavings = netTarget - savings;

const result = determine401kWithdrawalToHitNetTargetOf(
  target_LessSavings,
  {
    otherTaxableIncome,
    ssBenefit,
    standardDeduction,
    brackets,
  },
  year
);

log.info();
log.info("====================================");
log.info("*** Retirement Income Summary ***");
log.info("====================================");
log.info();
if (year > 0) {
  log.info(
    `Calculations for Year ${year} (with ${year * 2.5}% COLA adjustments)`
  );
  log.info();
}
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
