// ignore type-checking in this file for now

// @ts-nocheck

// Test script to verify NaN fix in retirement calculations

// First load retirement.js to make its functions available
const retirement = require("./retirement.js");

// Now load retirement-calculator.js which should have access to retirement functions
require("./retirement-calculator.js");

// Test inputs that would trigger the retirement year calculation
const testInputs = {
  currentAge: 60,
  retirementAge: 62,
  currentSalary: 80000,
  desiredMonthlyIncome: 5000,
  currentSavings: 100000,
  current401k: 150000,
  currentPension: 50000,
  inflationRate: 0.03,
  rateOfGrowth: 0.07,
  rateOfSavings: 0.02,
  filingStatus: "marriedJointly",
  socialSecurityAtAge: 62,
  spouseBirthYear: 1964,
  pensionAge: 65,
  pensionMonthlyAmount: 1500,
  spousePensionAge: 65,
  spousePensionMonthlyAmount: 1000,
  order: [
    ACCOUNT_TYPES.SUBJECT_SAVINGS,
    ACCOUNT_TYPES.SUBJECT_TRAD_401K,
    ACCOUNT_TYPES.SUBJECT_TRAD_ROTH,
  ], // Default withdrawal order
};

// Test balances for age 62 (retirement year 1)
const testBalances = {
  balSavings: 106120,
  bal401k: 159000,
  balPension: 53000,
};

console.log("Testing calculateRetirementYearData for Age 62...");
console.log("Test inputs:", testInputs);
console.log("Test balances:", testBalances);

try {
  // calculateRetirementYearData(inputs, yearIndex, balances, benefitAmounts, spend)
  // yearIndex 1 = age 62 (retirement age + 1 - 1)
  const yearIndex = 1;
  const benefitAmounts = {
    socialSecurity: 25000, // Example SS benefit
    spouseSocialSecurity: 15000, // Example spouse SS benefit
    pension: 18000, // Example pension benefit
    spousePension: 12000, // Example spouse pension benefit
  };
  const spend = testInputs.desiredMonthlyIncome * 12; // Annual spending need

  const result = calculateRetirementYearData(
    testInputs,
    yearIndex,
    testBalances,
    benefitAmounts,
    spend
  );

  console.log("Result:", JSON.stringify(result, null, 2));

  // Check for NaN values in the result
  const hasNaN = JSON.stringify(result).includes("NaN");
  if (hasNaN) {
    console.log("❌ FOUND NaN values in result!");
  } else {
    console.log("✅ No NaN values found in result");
  }
} catch (error) {
  console.error("❌ Error during calculation:", error.message);
  console.error(error.stack);
}
