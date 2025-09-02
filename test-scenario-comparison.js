/**
 * Quick test to compare all three retirement scenarios
 */

// Updated scenarios
const youngProfessional = {
  currentAge: 30,
  retireAge: 65,
  startingSalary: 75000,
  balPre: 15000,
  pretaxPct: 0.1,
  salaryGrowth: 0.03,
  retPre: 0.07,
  matchRate: 0.5,
  matchCap: 0.06,
};

const midCareer = {
  currentAge: 45,
  retireAge: 65,
  startingSalary: 95000,
  balPre: 85000,
  pretaxPct: 0.12,
  salaryGrowth: 0.02,
  retPre: 0.07,
  matchRate: 0.5,
  matchCap: 0.06,
};

const preRetirement = {
  currentAge: 60,
  retireAge: 65,
  startingSalary: 105000,
  balPre: 320000,
  pretaxPct: 0.2,
  salaryGrowth: 0.01,
  retPre: 0.07,
  matchRate: 0.5,
  matchCap: 0.06,
};

function calculateSimpleProjection(params, name) {
  const workingYears = params.retireAge - params.currentAge;
  let balance = params.balPre;
  let currentSalary = params.startingSalary;

  console.log(`\n=== ${name.toUpperCase()} ===`);
  console.log(`Starting age: ${params.currentAge}`);
  console.log(`Working years: ${workingYears}`);
  console.log(`Starting balance: $${balance.toLocaleString()}`);
  console.log(`Starting salary: $${currentSalary.toLocaleString()}`);
  console.log(`Contribution rate: ${params.pretaxPct * 100}%`);

  for (let year = 0; year < workingYears; year++) {
    // Annual contribution (employee + employer match)
    const employeeContrib = currentSalary * params.pretaxPct;
    const matchableAmount = Math.min(
      employeeContrib,
      currentSalary * params.matchCap
    );
    const employerMatch = matchableAmount * params.matchRate;
    const totalContrib = employeeContrib + employerMatch;

    // Add contributions and grow the balance
    balance = (balance + totalContrib) * (1 + params.retPre);

    // Grow salary
    currentSalary *= 1 + params.salaryGrowth;

    if (year === workingYears - 1) {
      console.log(`Final year contribution: $${totalContrib.toLocaleString()}`);
    }
  }

  console.log(`Final balance at retirement: $${balance.toLocaleString()}`);

  // Monthly income (4% withdrawal rule)
  const monthlyIncome = (balance * 0.04) / 12;
  console.log(`Monthly retirement income: $${monthlyIncome.toLocaleString()}`);

  return balance;
}

const youngResult = calculateSimpleProjection(
  youngProfessional,
  "Young Professional (30)"
);
const midCareerResult = calculateSimpleProjection(midCareer, "Mid-Career (45)");
const preRetirementResult = calculateSimpleProjection(
  preRetirement,
  "Pre-Retirement (60)"
);

console.log("\n=== FINAL COMPARISON ===");
console.log(`Young Professional (30): $${youngResult.toLocaleString()}`);
console.log(`Mid-Career (45): $${midCareerResult.toLocaleString()}`);
console.log(`Pre-Retirement (60): $${preRetirementResult.toLocaleString()}`);

console.log("\n=== KEY INSIGHT ===");
const youngAdvantage = ((youngResult / midCareerResult - 1) * 100).toFixed(1);
const midVsPre = ((midCareerResult / preRetirementResult - 1) * 100).toFixed(1);
console.log(`Young Professional beats Mid-Career by: ${youngAdvantage}%`);
console.log(`Mid-Career beats Pre-Retirement by: ${midVsPre}%`);
console.log(`This demonstrates the power of starting early!`);
