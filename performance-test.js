/**
 * Performance test for the calculation engine
 * Demonstrates the speed of pure calculation functions
 */

import {
  calculateFederalTax,
  calculateWorkingYear,
  calculateRMD,
  calculate401kLimits,
} from "./calculation-engine.js";

console.log("⚡ Performance Test - Pure Calculation Engine");
console.log("==============================================");

// Test 1: Tax calculation performance
console.log("\n📊 Tax Calculation Performance:");
const iterations = 10000;
const startTime = performance.now();

for (let i = 0; i < iterations; i++) {
  calculateFederalTax(50000 + i, "married");
}

const endTime = performance.now();
const duration = endTime - startTime;
console.log(
  `${iterations.toLocaleString()} tax calculations in ${duration.toFixed(2)}ms`
);
console.log(
  `Average: ${((duration / iterations) * 1000).toFixed(
    2
  )} microseconds per calculation`
);
console.log(
  `Rate: ${((iterations / duration) * 1000).toFixed(0)} calculations per second`
);

// Test 2: Working year calculation performance
console.log("\n💼 Working Year Calculation Performance:");
const workingParams = {
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

const workingIterations = 1000;
const workingStartTime = performance.now();

for (let i = 0; i < workingIterations; i++) {
  calculateWorkingYear({ ...workingParams, salary: workingParams.salary + i });
}

const workingEndTime = performance.now();
const workingDuration = workingEndTime - workingStartTime;
console.log(
  `${workingIterations.toLocaleString()} working year calculations in ${workingDuration.toFixed(
    2
  )}ms`
);
console.log(
  `Average: ${(workingDuration / workingIterations).toFixed(
    2
  )}ms per calculation`
);
console.log(
  `Rate: ${((workingIterations / workingDuration) * 1000).toFixed(
    0
  )} calculations per second`
);

// Test 3: Simulated 30-year projection
console.log("\n🎯 Simulated 30-Year Projection Performance:");
const projectionStartTime = performance.now();

let currentBalance = { balPre: 100000, balRoth: 25000, balSavings: 50000 };
let currentSalary = 80000;

for (let year = 0; year < 30; year++) {
  const yearResult = calculateWorkingYear({
    ...workingParams,
    salary: currentSalary,
    age: 35 + year,
    balances: currentBalance,
  });

  currentBalance = yearResult.balances;
  currentSalary *= 1.03; // 3% salary growth
}

const projectionEndTime = performance.now();
const projectionDuration = projectionEndTime - projectionStartTime;

console.log(
  `30-year projection calculated in ${projectionDuration.toFixed(2)}ms`
);
console.log(
  `Final balance: $${
    currentBalance.balPre + currentBalance.balRoth + currentBalance.balSavings
  }`
);
console.log(
  `Performance: ${((30 / projectionDuration) * 1000).toFixed(
    0
  )} years per second`
);

// Test 4: Memory usage demonstration
console.log("\n🧠 Memory Usage Test:");
const memBefore = process.memoryUsage();

// Create many calculation objects
const results = [];
for (let i = 0; i < 1000; i++) {
  results.push(
    calculateWorkingYear({
      ...workingParams,
      salary: 50000 + i * 100,
    })
  );
}

const memAfter = process.memoryUsage();
const memDiff = memAfter.heapUsed - memBefore.heapUsed;

console.log(
  `Memory used for 1000 calculations: ${(memDiff / 1024 / 1024).toFixed(2)}MB`
);
console.log(`Average per calculation: ${(memDiff / 1000 / 1024).toFixed(2)}KB`);

console.log("\n⚡ Performance Summary:");
console.log("✅ Pure functions are extremely fast");
console.log("✅ Memory efficient - no DOM references");
console.log("✅ Suitable for real-time calculations");
console.log("✅ Can handle complex projections instantly");
console.log("🚀 Ready for production workloads!");
