// retirement.js

// Add method to Number prototype
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

function taxableSS(ssBenefit, otherIncome) {
  const provisional = otherIncome + 0.5 * ssBenefit;
  console.log("*** Social Security Benefits Taxation ***");
  console.log(`. Social Security Income: $${ssBenefit.round(2)}`);
  console.log(". Provisional income is 1/2 SS  + Other Income");
  console.log(`. 1/2 of SS: $${(0.5 * ssBenefit).round(2)}`);
  console.log(`. 401k Withdrawal: $${otherIncome.round(2)}`);
  console.log(
    `. Provisional Income: $${otherIncome.round(2)} + $${(
      0.5 * ssBenefit
    ).round(2)} = $${provisional.round(2)}`
  );

  const base1 = 32000;
  const base2 = 44000;

  if (provisional <= base1) {
    console.log(
      "Provisional income is below $32,000. No Social Security benefits are taxable."
    );
    return 0;
  }

  if (provisional <= base2) {
    console.log(
      `Provisional income is ${provisional.round(
        0
      )}, between $32,000 and $44,000. Up to 50% of Social Security benefits may be taxable.`
    );
    console.log(
      `Taxable SS amount is the lesser of 50% of SS benefit ($${(
        0.5 * ssBenefit
      ).round(2)}) or 50% of the amount over $32,000 ($${(
        0.5 *
        (provisional - base1)
      ).round(2)}).`
    );
    console.log(
      `Amount of SS that is taxable is $${Math.min(
        0.5 * ssBenefit,
        0.5 * (provisional - base1)
      ).round(2)}.`
    );
    return Math.min(0.5 * ssBenefit, 0.5 * (provisional - base1));
  }

  const excessOverBase2 = provisional - base2;
  console.log(
    `Provisional income is $${provisional.round(
      0
    )}, which is $${excessOverBase2.round(
      0
    )} in excess of $44,000. 85% of this excess is $${(
      0.85 * excessOverBase2
    ).round(2)}.`
  );
  console.log(
    `Taxable amount is the lesser of 85% of SS benefit ($${(
      0.85 * ssBenefit
    ).round(2)}) or $6000 + the 85% of the excess over $44,000 ($${(
      0.85 * excessOverBase2
    ).round(2)}).`
  );
  console.log(
    `Amount of SS that is taxable is $${Math.min(
      0.85 * ssBenefit,
      0.5 * (base2 - base1) + 0.85 * excessOverBase2
    ).round(2)}.`
  );
  return Math.min(
    0.85 * ssBenefit,
    0.5 * (base2 - base1) + 0.85 * excessOverBase2
  );
}

function taxFromBrackets(taxable, brackets) {
  console.log("*** Tax Calculation ***");
  let tax = 0,
    prev = 0;
  for (const { upto, rate } of brackets) {
    const slice = Math.min(taxable, upto) - prev;
    if (slice > 0) tax += slice * rate;
    if (taxable <= upto) break;
    prev = upto;
  }
  console.log(`Total taxable income is $${taxable.round(2)}.`);
  console.log(`Total tax calculated is $${tax.round(2)}.`);
  return tax;
}

function reverseCalculate401kWithdrawlToHitTargetNet(targetAmount, opts) {
  const {
    otherTaxableIncome,
    ssBenefit,
    standardDeduction,
    brackets,
    precision = 0.01, // within 1 cent
  } = opts;

  function calculateNetWhenOtherIncomeIs(otherIncome) {
    const taxableSSAmt = taxableSS(ssBenefit, otherIncome);
    const grossTaxableIncome = otherIncome + taxableSSAmt;
    const actualTaxableIncome = Math.max(
      0,
      grossTaxableIncome - standardDeduction
    );
    console.log(`Total income is $${(ssBenefit + otherIncome).round(2)}.`);
    console.log(`Other income is $${otherIncome.round(2)}.`);
    console.log(`Taxable SS amount is $${taxableSSAmt.round(2)}.`);
    console.log(
      `Gross taxable income is $${grossTaxableIncome.round(
        0
      )}. (${otherIncome.round(2)} + ${taxableSSAmt.round(2)})`
    );
    console.log(`Standard deduction is $${standardDeduction.round(2)}.`);
    console.log(`Actual taxable income is $${actualTaxableIncome.round(2)}.`);

    const tax = taxFromBrackets(actualTaxableIncome, brackets);

    console.log(
      `Total income from all sources is $${(
        otherIncome +
        ssBenefit +
        savings
      ).round(2)}.`
    );
    console.log(`Taxes owed are $${tax.round(2)}.`);

    const netIncome = otherIncome + ssBenefit + savings - tax;

    console.log(`Net income after taxes is $${netIncome.round(2)}.`);

    console.log(`Target income is $${targetAmount.round(2)}.`);

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
    console.log(
      `With other income is $${otherIncome.round(
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
  if (opts.otherTaxableIncome) {
    let net = calculateNetWhenOtherIncomeIs(opts.otherTaxableIncome);
    if (net.netIncome.round(2) > targetAmount.round(2)) {
      console.log(`Other income makes it unnecessary to withdraw from 401k`);
      console.log(`Net income with other income is $${net.netIncome.round(2)}`);
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
    console.log(
      `===== Iteration ${i}: lo=$${lo.round(2)}, hi=$${hi.round(2)} ======`
    );
    const guestimate401kWithdrawal = (lo + hi) / 2;
    console.log(`Guestimate withdrawal: $${guestimate401kWithdrawal.round(2)}`);
    net = calculateNetWhenOtherIncomeIs(
      guestimate401kWithdrawal + otherTaxableIncome
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

const targetNet = parseFloat(targetNetStr);
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

const targetWithoutSavings = targetNet - savings;

const result = reverseCalculate401kWithdrawlToHitTargetNet(
  targetWithoutSavings,
  {
    otherTaxableIncome,
    ssBenefit,
    standardDeduction: 29200, // MFJ 2024 demo
    brackets,
  }
);

console.log("====================================");
console.log("*** Retirement Income Summary ***");
console.log("====================================");
console.log();
console.log("Target Net Income:          $", targetNet.toFixed(0));
console.log();
// console.log(
//   "Total Income (incl SS):     $",
//   (otherTaxableIncome + ssBenefit).round(2)
// );
console.log("Social Security Benefit:    $", ssBenefit.toFixed(0));
console.log("+ other Taxable Income:     $", otherTaxableIncome.toFixed(0));
console.log(
  "+ 401k Withdrawal Needed:   $",
  result.withdrawalNeeded.toFixed(0)
);
console.log("---------------------------------------");
console.log(
  "Total Income:               $",
  (otherTaxableIncome + ssBenefit + result.withdrawalNeeded).toFixed(0)
);
console.log("- Taxes:                    $", result.tax.toFixed(0));
console.log("=======================================");
console.log(
  "Net income:                 $",
  (
    otherTaxableIncome +
    ssBenefit +
    result.withdrawalNeeded -
    result.tax
  ).toFixed(0)
);
console.log("+ savings contribution:     $", savings.toFixed(0));
console.log("Net income:                 $", result.net.toFixed(0));
