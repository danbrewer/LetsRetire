// retirement.js

function taxableSS(ssBenefit, otherIncome, taxExemptInterest = 0) {
  const provisional = otherIncome + 0.5 * ssBenefit + taxExemptInterest;
  console.log("*** Social Security Benefits Taxation ***");
  console.log(`. Social Security Income: $${ssBenefit.toFixed(0)}`);
  console.log(". Provisional income is 1/2 SS  + Other Income");
  console.log(`. 1/2 of SS: $${(0.5 * ssBenefit).toFixed(0)}`);
  console.log(`. 401k Withdrawal: $${otherIncome.toFixed(0)}`);
  console.log(
    `. Provisional Income: $${otherIncome.toFixed(0)} + $${(
      0.5 * ssBenefit
    ).toFixed(0)} = $${provisional.toFixed(0)}`
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
      `Provisional income is ${provisional.toFixed(
        0
      )}, between $32,000 and $44,000. Up to 50% of Social Security benefits may be taxable.`
    );
    console.log(
      `Taxable SS amount is the lesser of 50% of SS benefit ($${(
        0.5 * ssBenefit
      ).toFixed(0)}) or 50% of the amount over $32,000 ($${(
        0.5 *
        (provisional - base1)
      ).toFixed(0)}).`
    );
    console.log(
      `Amount of SS that is taxable is $${Math.min(
        0.5 * ssBenefit,
        0.5 * (provisional - base1)
      ).toFixed(0)}.`
    );
    return Math.min(0.5 * ssBenefit, 0.5 * (provisional - base1));
  }

  const excessOverBase2 = provisional - base2;
  console.log(
    `Provisional income is $${provisional.toFixed(
      0
    )}, which is $${excessOverBase2.toFixed(
      0
    )} in excess of $44,000. 85% of this excess is $${(
      0.85 * excessOverBase2
    ).toFixed(0)}.`
  );
  console.log(
    `Taxable amount is the lesser of 85% of SS benefit ($${(
      0.85 * ssBenefit
    ).toFixed(0)}) or $6000 + the 85% of the excess over $44,000 ($${(
      0.85 * excessOverBase2
    ).toFixed(0)}).`
  );
  console.log(
    `Amount of SS that is taxable is $${Math.min(
      0.85 * ssBenefit,
      0.5 * (base2 - base1) + 0.85 * excessOverBase2
    ).toFixed(0)}.`
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
  console.log(`Total taxable income is $${taxable.toFixed(0)}.`);
  console.log(`Total tax calculated is $${tax.toFixed(0)}.`);
  return tax;
}

function grossFromNetWithSS(targetNet, opts) {
  const {
    ssBenefit,
    taxExemptInterest = 0,
    standardDeduction,
    brackets,
    precision = 1.0, // within 1 dollar
  } = opts;

  function netOf(withdrawal) {
    const taxableSSAmt = taxableSS(ssBenefit, withdrawal, taxExemptInterest);
    const AGI = withdrawal + taxableSSAmt + taxExemptInterest;
    const taxable = Math.max(0, AGI - standardDeduction);
    console.log(
      `Total income is $${(ssBenefit + withdrawal + taxExemptInterest).toFixed(
        0
      )}.`
    );
    console.log(`Taxable 401k withdrawal is $${withdrawal.toFixed(0)}.`);
    console.log(`Taxable SS amount is $${taxableSSAmt.toFixed(0)}.`);
    console.log(
      `Gross taxable income is $${AGI.toFixed(0)}. (${withdrawal.toFixed(
        0
      )} + ${taxableSSAmt.toFixed(0)})`
    );
    console.log(`Standard deduction is $${standardDeduction.toFixed(0)}.`);
    console.log(`Actual taxable income is $${taxable.toFixed(0)}.`);

    const tax = taxFromBrackets(taxable, brackets);

    console.log(
      `Total income from all sources is $${(
        withdrawal +
        ssBenefit +
        taxExemptInterest
      ).toFixed(0)}.`
    );
    console.log(`Taxes owed are $${tax.toFixed(0)}.`);

    const netIncome = withdrawal + ssBenefit + taxExemptInterest - tax;

    console.log(`Net income after taxes is $${netIncome.toFixed(0)}.`);

    console.log(`Target income is $${targetNet.toFixed(0)}.`);

    const highLow =
      Math.round(netIncome) > Math.round(targetNet)
        ? "TOO HIGH"
        : Math.round(netIncome) < Math.round(targetNet)
        ? "TOO LOW"
        : "JUST RIGHT";
    const highLowTextColor =
      Math.round(netIncome) > Math.round(targetNet)
        ? "\x1b[31m"
        : Math.round(netIncome) < Math.round(targetNet)
        ? "\x1b[34m"
        : "\x1b[32m"; // Red for too high, Blue for too low, Green for just right
    console.log(
      `Withdrawing $${withdrawal.toFixed(
        0
      )} results in a net income of $${netIncome.toFixed(
        0
      )} ${highLowTextColor}(${highLow})\x1b[0m`
    );
    return netIncome;
  }

  let lo = 0,
    hi = targetNet * 2;
  for (let i = 0; i < 80; i++) {
    console.log(
      `===== Iteration ${i}: lo=$${lo.toFixed(0)}, hi=$${hi.toFixed(0)} ======`
    );
    const mid = (lo + hi) / 2;
    console.log(`Guestimate withdrawal: $${mid.toFixed(0)}`);
    const net = netOf(mid);
    if (Math.round(net) == Math.round(targetNet)) break;
    if (net < targetNet) lo = mid;
    else hi = mid;
    if (Math.round(hi - lo) <= precision) break;
  }

  return {
    withdrawalNeeded: hi,
    totalGross: hi + ssBenefit + taxExemptInterest,
  };
}

// ---------------- CLI ----------------

// Grab args: node retirement.js 100000 32307 [taxExemptInterest]
const [, , targetNetStr, ssBenefitStr, taxExemptStr] = process.argv;

if (!targetNetStr || !ssBenefitStr) {
  console.error(
    "Usage: node retirement.js <targetNet> <ssBenefit> [taxExemptInterest]"
  );
  process.exit(1);
}

const targetNet = parseFloat(targetNetStr);
const ssBenefit = parseFloat(ssBenefitStr);
const taxExemptInterest = parseFloat(taxExemptStr || "0");

// Example 2024 MFJ brackets
const brackets = [
  { upto: 23200, rate: 0.1 },
  { upto: 94300, rate: 0.12 },
  { upto: 201050, rate: 0.22 },
  { upto: Infinity, rate: 0.24 },
];

const result = grossFromNetWithSS(targetNet, {
  ssBenefit,
  taxExemptInterest,
  standardDeduction: 29200, // MFJ 2024 demo
  brackets,
});

console.log("====================================");
console.log("*** Retirement Income Summary ***");
console.log("====================================");
console.log("Target Net Income:          $", targetNet.toFixed(0));
console.log("Social Security Benefit:    $", ssBenefit.toFixed(0));
console.log("Tax-Exempt Interest:        $", taxExemptInterest.toFixed(0));
console.log(
  "401k Withdrawal Needed:     $",
  result.withdrawalNeeded.toFixed(0)
);
console.log("Total Gross Income (incl SS): $", result.totalGross.toFixed(0));
