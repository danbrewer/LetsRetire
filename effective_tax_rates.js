/**
 * Effective Tax Rate Table
 *
 * This table provides estimated effective federal tax rates for different AGI levels.
 * These rates are approximations based on 2024 tax brackets for single filers and
 * include standard deduction considerations.
 *
 * Note: These are simplified estimates and do not account for:
 * - State taxes
 * - Specific deductions beyond standard deduction
 * - Tax credits
 * - Different filing statuses (married filing jointly, etc.)
 * - FICA taxes on earned income
 * - Capital gains vs ordinary income distinctions
 *
 * For accurate tax planning, consult a tax professional.
 */

const EFFECTIVE_TAX_RATES = {
  // AGI: Effective Rate (%)
  0: 0.0,
  5000: 0.0,
  10000: 0.0,
  15000: 0.0,
  20000: 2.5,
  25000: 4.0,
  30000: 5.5,
  35000: 6.8,
  40000: 7.9,
  45000: 8.9,
  50000: 9.8,
  55000: 10.6,
  60000: 11.3,
  65000: 12.0,
  70000: 12.6,
  75000: 13.1,
  80000: 13.6,
  85000: 14.1,
  90000: 14.5,
  95000: 14.9,
  100000: 15.3,
  110000: 16.0,
  120000: 16.6,
  130000: 17.1,
  140000: 17.6,
  150000: 18.0,
  160000: 18.4,
  170000: 18.8,
  180000: 19.1,
  190000: 19.4,
  200000: 19.7,
};

/**
 * Calculate effective tax rate for a given AGI using linear interpolation
 * @param {number} agi - Adjusted Gross Income
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRate(agi) {
  // Handle edge cases
  if (agi <= 0) return 0;
  if (agi >= 200000) return EFFECTIVE_TAX_RATES[200000];

  // Find the two closest AGI levels for interpolation
  const agiLevels = Object.keys(EFFECTIVE_TAX_RATES)
    .map(Number)
    .sort((a, b) => a - b);

  // Find exact match
  if (EFFECTIVE_TAX_RATES[agi] !== undefined) {
    return EFFECTIVE_TAX_RATES[agi];
  }

  // Find interpolation points
  let lowerAgi = 0;
  let upperAgi = 200000;

  for (let i = 0; i < agiLevels.length - 1; i++) {
    if (agi >= agiLevels[i] && agi <= agiLevels[i + 1]) {
      lowerAgi = agiLevels[i];
      upperAgi = agiLevels[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerRate = EFFECTIVE_TAX_RATES[lowerAgi];
  const upperRate = EFFECTIVE_TAX_RATES[upperAgi];
  const ratio = (agi - lowerAgi) / (upperAgi - lowerAgi);

  return lowerRate + (upperRate - lowerRate) * ratio;
}

/**
 * Calculate effective tax rate for married filing jointly (approximately 2x the single brackets)
 * @param {number} agi - Adjusted Gross Income for married couple
 * @returns {number} Effective tax rate as a percentage (0-100)
 */
function getEffectiveTaxRateMarried(agi) {
  // Approximate married rates by using single rates at half the income
  // This is a simplification - actual married brackets are roughly 2x single brackets
  return getEffectiveTaxRate(agi / 2);
}

/**
 * Get tax amount based on AGI and filing status
 * @param {number} agi - Adjusted Gross Income
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated federal tax amount
 */
function calculateFederalTax(agi, filingStatus = "single") {
  const effectiveRate =
    filingStatus === "married"
      ? getEffectiveTaxRateMarried(agi)
      : getEffectiveTaxRate(agi);

  return agi * (effectiveRate / 100);
}

/**
 * Get marginal tax rate estimate for additional income
 * @param {number} currentAgi - Current AGI
 * @param {number} additionalIncome - Additional income to evaluate
 * @param {string} filingStatus - 'single' or 'married'
 * @returns {number} Estimated marginal tax rate as percentage
 */
function getMarginalTaxRate(
  currentAgi,
  additionalIncome = 1000,
  filingStatus = "single"
) {
  const currentTax = calculateFederalTax(currentAgi, filingStatus);
  const newTax = calculateFederalTax(
    currentAgi + additionalIncome,
    filingStatus
  );

  return ((newTax - currentTax) / additionalIncome) * 100;
}

/**
 * Display the full tax rate table for reference
 * @returns {string} Formatted table as string
 */
function displayTaxTable() {
  let table = "AGI\t\tEffective Rate\n";
  table += "---\t\t--------------\n";

  Object.entries(EFFECTIVE_TAX_RATES).forEach(([agi, rate]) => {
    const agiFormatted = parseInt(agi).toLocaleString();
    table += `$${agiFormatted}\t\t${rate}%\n`;
  });

  return table;
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    EFFECTIVE_TAX_RATES,
    getEffectiveTaxRate,
    getEffectiveTaxRateMarried,
    calculateFederalTax,
    getMarginalTaxRate,
    displayTaxTable,
  };
}

// Example usage (uncomment to test)
/*
console.log("Effective Tax Rate Examples:");
console.log(`AGI $50,000: ${getEffectiveTaxRate(50000).toFixed(1)}%`);
console.log(`AGI $75,000: ${getEffectiveTaxRate(75000).toFixed(1)}%`);
console.log(`AGI $100,000: ${getEffectiveTaxRate(100000).toFixed(1)}%`);
console.log(`AGI $125,000: ${getEffectiveTaxRate(125000).toFixed(1)}%`);

console.log("\nTax Amount Examples:");
console.log(`AGI $50,000: $${calculateFederalTax(50000).toLocaleString()}`);
console.log(`AGI $100,000: $${calculateFederalTax(100000).toLocaleString()}`);

console.log("\nMarginal Rate Examples:");
console.log(`At $50,000 AGI: ${getMarginalTaxRate(50000).toFixed(1)}%`);
console.log(`At $100,000 AGI: ${getMarginalTaxRate(100000).toFixed(1)}%`);
*/
