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
  const savingsResult = withdrawalFunctions.withdrawFrom(
    "savings",
    targetNetPerSource
  );
  // Don't add savings to totalGross - savings withdrawals are not taxable income
  totalNet += savingsResult.net;

  // Then try to get equal net amount from pretax (401k)
  // This will automatically gross up to account for taxes
  const pretaxResult = withdrawalFunctions.withdrawFrom(
    "pretax",
    targetNetPerSource
  );
  totalGross += pretaxResult.gross;
  totalNet += pretaxResult.net;

  // If we couldn't get enough from one source, try to make up the difference from the other
  const remaining = totalNetNeeded - totalNet;
  if (remaining > 0) {
    // Try savings first for any remaining amount
    if (remaining > 0) {
      const additionalSavings = withdrawalFunctions.withdrawFrom(
        "savings",
        remaining
      );
      // Don't add savings to totalGross - savings withdrawals are not taxable income
      totalNet += additionalSavings.net;
    }

    // Then try pretax for any still remaining amount
    const stillRemaining = totalNetNeeded - totalNet;
    if (stillRemaining > 0) {
      const additionalPretax = withdrawalFunctions.withdrawFrom(
        "pretax",
        stillRemaining
      );
      totalGross += additionalPretax.gross;
      totalNet += additionalPretax.net;
    }

    // Finally try Roth if both other sources are exhausted
    const finalRemaining = totalNetNeeded - totalNet;
    if (finalRemaining > 0) {
      const rothResult = withdrawalFunctions.withdrawFrom(
        "roth",
        finalRemaining
      );
      totalGross += rothResult.gross;
      totalNet += rothResult.net;
    }
  }

  return { totalGross, totalNet };
}
