/**
 * Calculate Social Security taxation for a given year
 */
function calculateSocialSecurityTaxation(
  inputs,
  ssGross,
  otherTaxableIncome,
  year = 0
) {
  // Use the sophisticated Social Security taxation calculation from retirement.js
  return determineTaxablePortionOfSocialSecurity(ssGross, otherTaxableIncome);
}

/**
 * Calculate pension info for a given year
 * Simplified since final taxes are calculated properly on total combined income
 */
function buildPensionTracker(penGross) {
  // Declare and initialize the result object at the top
  const result = {
    penGross: 0,
    penTaxes: 0,
    penNet: 0,
    penNonTaxable: 0,
    pensionTaxRate: 0,
  };

  if (!penGross || penGross <= 0 || isNaN(penGross)) {
    return result;
  }

  // Set basic values in result object
  result.penGross = penGross;

  // Pensions are typically fully taxable
  const penNonTaxable = 0; // 0% non-taxable

  // Don't estimate taxes here - final taxes calculated on total combined income
  const penTaxes = 0;
  const penNet = penGross; // Placeholder - actual net calculated in final tax step

  // Update result object
  result.penTaxes = penTaxes;
  result.penNet = penNet;
  result.penNonTaxable = penNonTaxable;
  result.pensionTaxRate = 0;

  return result;
}

/**
 * 50/50 Withdrawal Strategy
 * Takes equal net amounts from savings (taxable) and 401k (pretax) accounts
 * The 401k withdrawal is grossed up to account for taxes so net amounts are equal
 */
function withdraw50_50(withdrawalFunctions, totalNetNeeded) {
  if (totalNetNeeded <= 0) {
    return { totalGross: 0, totalNet: 0 };
  }

  // Target net amount from each source (half each)
  const targetNetPerSource = totalNetNeeded / 2;

  let totalGross = 0;
  let totalNet = 0;

  // Try to withdraw equal net amounts from both sources
  // Start with savings (no tax impact)
  const savingsResult = withdrawalFunctions.withdrawFromTargetedAccount(
    "savings",
    targetNetPerSource
  );
  // Don't add savings to totalGross - savings withdrawals are not taxable income
  totalNet += savingsResult.net;

  // Then try to get equal net amount from pretax (401k)
  // This will automatically gross up to account for taxes
  const pretaxResult = withdrawalFunctions.withdrawFromTargetedAccount(
    "401k",
    targetNetPerSource
  );
  totalGross += pretaxResult.gross;
  totalNet += pretaxResult.net;

  // If we couldn't get enough from one source, try to make up the difference from the other
  const remaining = totalNetNeeded - totalNet;
  if (remaining > 0) {
    // Try savings first for any remaining amount
    if (remaining > 0) {
      const additionalSavings = withdrawalFunctions.withdrawFromTargetedAccount(
        "savings",
        remaining
      );
      // Don't add savings to totalGross - savings withdrawals are not taxable income
      totalNet += additionalSavings.net;
    }

    // Then try pretax for any still remaining amount
    const stillRemaining = totalNetNeeded - totalNet;
    if (stillRemaining > 0) {
      const additionalPretax = withdrawalFunctions.withdrawFromTargetedAccount(
        "401k",
        stillRemaining
      );
      totalGross += additionalPretax.gross;
      totalNet += additionalPretax.net;
    }

    // Finally try Roth if both other sources are exhausted
    const finalRemaining = totalNetNeeded - totalNet;
    if (finalRemaining > 0) {
      const rothResult = withdrawalFunctions.withdrawFromTargetedAccount(
        "roth",
        finalRemaining
      );
      totalGross += rothResult.gross;
      totalNet += rothResult.net;
    }
  }

  return { totalGross, totalNet };
}

// Special function for RMD withdrawals (gross amount based)
function withdrawRMD(grossAmount) {
  if (grossAmount <= 0 || closuredCopyOfRunningBalances.balPre <= 0)
    return { gross: 0, net: 0 };

  const actualGross = Math.min(
    grossAmount,
    closuredCopyOfRunningBalances.balPre
  );

  // Calculate net amount using the sophisticated tax calculation from retirement.js
  // Construct the opts object that calculate401kNetWhen401kGrossIs expects
  // Add comprehensive NaN protection for otherTaxableIncome
  const otherTaxableIncomeValue = isNaN(
    closuredCopyOfFixedPortionOfTaxableIncome.value
  )
    ? 0
    : closuredCopyOfFixedPortionOfTaxableIncome.value;

  if (isNaN(closuredCopyOfFixedPortionOfTaxableIncome.value)) {
    console.warn(
      `[NaN Protection] RMD otherTaxableIncome was NaN, using 0 instead`
    );
  }

  const opts = {
    otherTaxableIncome: otherTaxableIncomeValue,
    ssBenefit: ssBenefits, // Include Social Security benefits in RMD tax calculation too
    standardDeduction: retirementJS_getStandardDeduction(
      inputs.filingStatus,
      year, // year is already the actual year (e.g., 2040)
      inputs.inflation
    ),
    brackets: retirementJS_getTaxBrackets(
      inputs.filingStatus,
      year,
      inputs.inflation
    ),
    precision: 0.01, // Precision for binary search convergence
  };

  const netResult = calculate401kNetWhen401kGrossIs(actualGross, opts);
  lastTaxCalculation = netResult; // Store detailed tax calculation results for RMD too
  const netAmount = netResult.net;

  closuredCopyOfRunningBalances.balPre -= actualGross;
  const safeActualGross = isNaN(actualGross) ? 0 : actualGross;
  closuredCopyOfFixedPortionOfTaxableIncome.value += safeActualGross;

  // Track RMD withdrawals as retirement account
  withdrawalsBySource.retirementAccount += actualGross;

  return { gross: actualGross, net: netAmount };
}
