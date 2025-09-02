/**
 * Test script to verify calculation results and display
 */

// Since calculation-engine.js is browser-compatible, we need to simulate the browser environment
global.window = {};

// Load the calculation engine by evaluating it
const fs = require("fs");
const calculationEngineCode = fs.readFileSync(
  "./calculation-engine.js",
  "utf8"
);

// Execute the code in our context
eval(calculationEngineCode);

// Now we should have the CalculationEngine available
console.log("🧮 Testing calculation engine directly...");

const testParams = {
  // Required validation parameters
  currentAge: 30,
  retireAge: 65,
  endAge: 90,

  // Financial parameters
  inflation: 0.025, // 2.5%
  spendingToday: 48000, // $4000/month * 12
  spendingDecline: 0,

  // Income
  startingSalary: 75000,
  salaryGrowth: 0.03, // 3%

  // 401k contributions
  pretaxPct: 0.1, // 10%
  rothPct: 0,
  taxablePct: 0,

  // Employer match
  matchRate: 0.5, // 50%
  matchCap: 0.06, // 6%

  // Starting balances
  balPre: 15000,
  balRoth: 0,
  balSavings: 0,

  // Investment returns
  retPre: 0.07,
  retRoth: 0.07,
  retTax: 0.05,

  // Social Security
  ssMonthly: 0,
  ssStart: 65,
  ssCola: 0.025,

  // Pension
  penMonthly: 0,
  penStart: 65,
  penCola: 0,

  // Tax settings
  taxPre: 0.22,
  taxTaxable: 0.15,
  taxRoth: 0,
  taxSS: 0.15,
  filingStatus: "single",
  useAgiTax: false,
  useSSRules: true,
  useRMD: true,
  order: "pretax_first",

  // Spouse (not used)
  spouseAge: 0,
  spouseRetireAge: 0,
  spouseSsMonthly: 0,
  spouseSsStart: 0,
  spouseSsCola: 0,
  spousePenMonthly: 0,
  spousePenStart: 0,
  spousePenCola: 0,
  spouseTaxSS: 0,
  spouseTaxPension: 0,
};

try {
  // Test validation
  console.log("📋 Testing parameter validation...");
  const validation = CalculationEngine.validateParameters(testParams);
  console.log("Validation result:", validation);

  if (validation.valid) {
    console.log("✅ Parameters are valid");

    // Test calculation
    console.log("🔢 Running calculation...");
    const result = CalculationEngine.calculateRetirement(testParams);

    console.log("📊 Calculation completed successfully!");
    console.log("Result structure:", {
      hasProjections: !!result.projections,
      projectionsLength: result.projections ? result.projections.length : 0,
      hasSummary: !!result.summary,
      summaryKeys: result.summary ? Object.keys(result.summary) : [],
    });

    if (result.projections && result.projections.length > 0) {
      console.log("📈 Sample projection data (first year):");
      console.log(result.projections[0]);

      console.log("📈 Sample projection data (retirement year):");
      const retirementYear = result.projections.find(
        (p) => p.age === testParams.retireAge
      );
      if (retirementYear) {
        console.log(retirementYear);
      }
    }

    if (result.summary) {
      console.log("📋 Summary data:");
      console.log(result.summary);
    }
  } else {
    console.log("❌ Validation failed:", validation.errors);
  }
} catch (error) {
  console.error("💥 Calculation failed:", error);
}

console.log("\n🔍 Now let's test what the demo form would produce...");

// Simulate demo form data
const demoFormData = {
  currentAge: 30,
  retireAge: 65,
  endAge: 90,
  inflationRate: 2.5,
  monthlyExpenses: 4000,
  currentSalary: 75000,
  salaryGrowthRate: 3,
  currentContribution: 10,
  employerMatch: 50,
  employerMatchLimit: 6,
  currentSavings: 15000,
};

console.log("📝 Demo form data:", demoFormData);

// Test the parameter conversion
function convertToCalculationParams(demoData) {
  return {
    // Required validation parameters
    currentAge: demoData.currentAge || 30,
    retireAge: demoData.retireAge || 65,
    endAge: demoData.endAge || 90,

    // Financial parameters with proper conversions
    inflation: (demoData.inflationRate || 2.5) / 100, // Percentage to decimal
    spendingToday: (demoData.monthlyExpenses || 4000) * 12, // Monthly to annual
    spendingDecline: 0, // Default

    // Income and salary
    startingSalary: demoData.currentSalary || 75000,
    salaryGrowth: (demoData.salaryGrowthRate || 3) / 100, // Percentage to decimal

    // 401k contributions (convert percentages to decimals)
    pretaxPct: (demoData.currentContribution || 10) / 100,
    rothPct: 0, // Default for demo
    taxablePct: 0, // Default for demo

    // Employer match
    matchRate: (demoData.employerMatch || 50) / 100, // Percentage to decimal
    matchCap: (demoData.employerMatchLimit || 6) / 100, // Percentage to decimal

    // Starting balances
    balPre: demoData.currentSavings || 15000,
    balRoth: 0, // Default for demo
    balSavings: 0, // Default for demo

    // Investment returns (defaults)
    retPre: 0.07, // 7% default return
    retRoth: 0.07, // 7% default return
    retTax: 0.05, // 5% default return for taxable accounts

    // Social Security (defaults for demo)
    ssMonthly: 0, // Will be calculated
    ssStart: Math.max(62, demoData.retireAge || 65),
    ssCola: 0.025, // 2.5% COLA

    // Pension (defaults)
    penMonthly: 0,
    penStart: demoData.retireAge || 65,
    penCola: 0,

    // Tax settings (defaults)
    taxPre: 0.22, // 22% tax rate on pre-tax withdrawals
    taxTaxable: 0.15, // 15% tax rate on taxable account gains
    taxRoth: 0, // 0% tax on Roth withdrawals
    taxSS: 0.15, // 15% tax on Social Security
    filingStatus: "single",
    useAgiTax: false,
    useSSRules: true,
    useRMD: true,
    order: "pretax_first",

    // Spouse defaults (not used in demo)
    spouseAge: 0,
    spouseRetireAge: 0,
    spouseSsMonthly: 0,
    spouseSsStart: 0,
    spouseSsCola: 0,
    spousePenMonthly: 0,
    spousePenStart: 0,
    spousePenCola: 0,
    spouseTaxSS: 0,
    spouseTaxPension: 0,
  };
}

const convertedParams = convertToCalculationParams(demoFormData);
console.log("🔄 Converted parameters:", convertedParams);

try {
  const validation2 = CalculationEngine.validateParameters(convertedParams);
  console.log("✅ Demo conversion validation:", validation2);

  if (validation2.valid) {
    const result2 = CalculationEngine.calculateRetirement(convertedParams);
    console.log("🎉 Demo calculation successful!");
    console.log("Demo result structure:", {
      hasProjections: !!result2.projections,
      projectionsLength: result2.projections ? result2.projections.length : 0,
      hasSummary: !!result2.summary,
    });
  }
} catch (error) {
  console.error("💥 Demo calculation failed:", error);
}
