// Include retirement.js as module
const {
  log,
  determine401kWithdrawalToHitNetTargetOf,
  getTaxBrackets,
  getStandardDeduction,
  FILING_STATUS,
} = require("./retirement.js");

// ---------------- CLI ----------------

// Grab args: node retirement_testing.js 100000 32307 [savings] [otherTaxableIncomeStr]
const [, , targetNetStr, ssBenefitStr, savingsStr, otherTaxableIncomeStr] =
  process.argv;

if (!targetNetStr || !ssBenefitStr) {
  console.error(
    "Usage: node retirement_testing.js <targetNet> <ssBenefit> [taxExemptSavings]"
  );
  process.exit(1);
}

const netTarget = parseFloat(targetNetStr);
const ssBenefit = parseFloat(ssBenefitStr);
const savings = parseFloat(savingsStr || "0");
const otherTaxableIncome = parseFloat(otherTaxableIncomeStr || "0");
const filingStatus = FILING_STATUS.MARRIED_FILING_JOINTLY;

// Use 2024 MFJ brackets from module
const brackets = getTaxBrackets(filingStatus);
const standardDeduction = getStandardDeduction(filingStatus);

// Remove savings because it is not taxable
const target_LessSavings = netTarget - savings;

const result = determine401kWithdrawalToHitNetTargetOf(target_LessSavings, {
  otherTaxableIncome,
  ssBenefit,
  standardDeduction,
  brackets,
});

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
