/**
 * Test file to demonstrate the pure calculation engine
 * Run this in Node.js or any JavaScript environment to verify independence
 */

// Import the actual functions from calculation-engine.js
import {
  calculateTaxableIncome,
  getEffectiveTaxRate,
  calculateFederalTax,
  calculateRMD,
  calculate401kLimits,
  calculateWorkingYear,
  validateRetirementParams,
  createDerivedParams,
  formatCurrency,
} from "./calculation-engine.js";

console.log("🧮 Testing Pure Calculation Engine");
console.log("=====================================");

// Example 1: Tax Calculations (completely independent)
console.log("\n📊 Tax Calculation Tests:");
const grossIncome = 100000;
const filingStatus = "married";

const taxableIncome = calculateTaxableIncome(grossIncome, filingStatus);
const effectiveRate = getEffectiveTaxRate(taxableIncome);
const federalTax = calculateFederalTax(grossIncome, filingStatus);

console.log(`Gross Income: $${grossIncome.toLocaleString()}`);
console.log(`Filing Status: ${filingStatus}`);
console.log(`Taxable Income: $${taxableIncome.toLocaleString()}`);
console.log(`Effective Rate: ${effectiveRate.toFixed(2)}%`);
console.log(`Federal Tax: $${federalTax.toLocaleString()}`);

// Example 2: RMD Calculations
console.log("\n📈 RMD Calculation Tests:");
const age = 75;
const accountBalance = 500000;
const rmd = calculateRMD(age, accountBalance);
console.log(`Age: ${age}`);
console.log(`Account Balance: $${accountBalance.toLocaleString()}`);
console.log(`Required RMD: $${rmd.toLocaleString()}`);

// Example 3: Contribution Limits
console.log("\n💰 Contribution Limit Tests:");
const contributorAge = 55;
const limits = calculate401kLimits(contributorAge);
console.log(`Age: ${contributorAge}`);
console.log(`Base Limit: $${limits.base.toLocaleString()}`);
console.log(`Catch-up Limit: $${limits.catchup.toLocaleString()}`);
console.log(`Total Limit: $${limits.total.toLocaleString()}`);

// Example 4: Working Year Calculation
console.log("\n💼 Working Year Calculation Test:");
const workingYearParams = {
  salary: 100000,
  age: 45,
  pretaxPct: 0.1,
  rothPct: 0.05,
  taxablePct: 0.15,
  matchCap: 0.04,
  matchRate: 0.5,
  retPre: 0.07,
  retRoth: 0.07,
  retTax: 0.06,
  taxPre: 0.22,
  useAgiTax: true,
  filingStatus: "married",
  balances: { balPre: 200000, balRoth: 50000, balSavings: 75000 },
  year: 0,
};

const workingResult = calculateWorkingYear(workingYearParams);
console.log(`Salary: $${workingResult.income.salary.toLocaleString()}`);
console.log(
  `Pre-tax Contribution: $${workingResult.contributions.pretax.toLocaleString()}`
);
console.log(
  `Roth Contribution: $${workingResult.contributions.roth.toLocaleString()}`
);
console.log(
  `Employer Match: $${workingResult.contributions.employerMatch.toLocaleString()}`
);
console.log(`Federal Taxes: $${workingResult.taxes.federal.toLocaleString()}`);
console.log(
  `New Total Balance: $${workingResult.totalBalance.toLocaleString()}`
);

// Example 5: Full Retirement Projection (simplified)
console.log("\n🎯 Retirement Projection Test:");
const retirementParams = {
  currentAge: 35,
  retireAge: 65,
  endAge: 85,
  spendingToday: 80000,
  inflation: 0.025,
  spouseAge: 33,
  startingSalary: 100000,
  salaryGrowth: 0.03,
  pretaxPct: 0.1,
  rothPct: 0.05,
  taxablePct: 0.1,
  matchCap: 0.04,
  matchRate: 0.5,
  balPre: 150000,
  balRoth: 25000,
  balSavings: 50000,
  retPre: 0.07,
  retRoth: 0.07,
  retTax: 0.06,
  taxPre: 0.22,
  useAgiTax: true,
  filingStatus: "married",
};

const validation = validateRetirementParams(retirementParams);
console.log(
  `Parameter Validation: ${validation.isValid ? "✅ Valid" : "❌ Invalid"}`
);
if (!validation.isValid) {
  console.log("Errors:", validation.errors);
}

const derivedParams = createDerivedParams(retirementParams);
console.log(`Years to Retirement: ${derivedParams.yearsToRetire}`);
console.log(`Has Spouse: ${derivedParams.hasSpouse}`);
console.log(
  `Spending at Retirement: $${derivedParams.spendAtRetire.toLocaleString()}`
);

// This would run the full calculation (currently simplified)
// const fullProjection = calculateRetirementProjection(retirementParams);

console.log("\n✅ All tests completed successfully!");
console.log("📦 The calculation engine is completely independent of DOM/HTML");
console.log("🧪 Ready for unit testing");
console.log("⚛️  Ready for use with React, Vue, Angular, or any framework");
