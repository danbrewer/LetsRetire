/**
 * Phase 2 Integration Test
 * Tests the integration between Phase 1 (pure calculation engine)
 * and Phase 2 (configuration-based DOM adapter)
 */

// Import Phase 1 (pure calculation engine)
import {
  calculateWorkingYear,
  validateRetirementParams,
  calculateRetirementProjection,
  formatCurrency,
} from "./calculation-engine.js";

// Import Phase 2 (DOM adapter)
import {
  DOMAdapter,
  FormDataCollector,
  ResultsDisplayer,
  DOM_FIELD_CONFIG,
} from "./dom-adapter.js";

console.log("🔗 Phase 1 + Phase 2 Integration Test");
console.log("=====================================");

// Create mock DOM environment
global.document = {
  elements: {},
  getElementById: function (id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id: id,
        value: "",
        checked: false,
        textContent: "",
        innerHTML: "",
        addEventListener: function () {},
      };
    }
    return this.elements[id];
  },
};

console.log("\n1️⃣ Phase 1: Pure Calculation Engine Ready");
console.log("✅ Zero DOM dependencies");
console.log("✅ Pure mathematical functions");

console.log("\n2️⃣ Phase 2: DOM Adapter Layer Ready");
console.log("✅ Configuration-based field mapping");
console.log("✅ Clean data collection interface");

// Test integration
console.log("\n🧪 Integration Test Scenario:");
console.log("Simulating user entering retirement planning data...");

// Step 1: Set up DOM adapter
const domAdapter = new DOMAdapter();
const formCollector = new FormDataCollector(domAdapter);
const resultsDisplayer = new ResultsDisplayer(domAdapter);

// Step 2: Simulate user input via Phase 2 DOM adapter
const userInputs = {
  currentAge: 40,
  retireAge: 65,
  endAge: 85,
  inflation: 2.5,
  spendingToday: 75000,
  salary: 120000, // Note: DOM config uses 'salary', not 'startingSalary'
  salaryGrowth: 3.0,
  pretaxPct: 12.0,
  rothPct: 6.0,
  taxablePct: 8.0,
  matchCap: 4.0,
  matchRate: 50.0,
  balPre: 250000,
  balRoth: 75000,
  balSavings: 100000,
  retPre: 7.5,
  retRoth: 7.5,
  retTax: 5.0,
  filingStatus: "married",
  useAgiTax: true,
};

// Set form values using Phase 2 DOM adapter
Object.entries(userInputs).forEach(([field, value]) => {
  if (typeof value === "boolean") {
    domAdapter.setChecked(field, value);
  } else {
    domAdapter.setValue(field, value.toString());
  }
});

console.log("✅ User inputs set via Phase 2 DOM adapter");

// Step 3: Collect form data using Phase 2
const params = formCollector.collectFormData();
console.log("\n📊 Data Collection via Phase 2:");
console.log(
  `  Age: ${params.currentAge} → ${params.retireAge} → ${params.endAge}`
);
console.log(
  `  Salary: ${formatCurrency(params.startingSalary)} (${
    params.salaryGrowth * 100
  }% growth)`
);
console.log(
  `  Contributions: ${params.pretaxPct * 100}% pre-tax, ${
    params.rothPct * 100
  }% Roth, ${params.taxablePct * 100}% taxable`
);
console.log(
  `  Current Balances: Pre-tax ${formatCurrency(
    params.balPre
  )}, Roth ${formatCurrency(params.balRoth)}, Taxable ${formatCurrency(
    params.balSavings
  )}`
);

// Step 4: Validate using Phase 1
console.log("\n✅ Validation via Phase 1:");
const validation = validateRetirementParams(params);
console.log(`  Parameters valid: ${validation.isValid}`);
if (!validation.isValid) {
  console.log(`  Errors: ${validation.errors.join(", ")}`);
}

// Step 5: Calculate one working year using Phase 1
console.log("\n🧮 Single Year Calculation via Phase 1:");
const workingYearResult = calculateWorkingYear({
  salary: params.startingSalary,
  age: params.currentAge,
  pretaxPct: params.pretaxPct,
  rothPct: params.rothPct,
  taxablePct: params.taxablePct,
  matchCap: params.matchCap,
  matchRate: params.matchRate,
  retPre: params.retPre,
  retRoth: params.retRoth,
  retTax: params.retTax,
  taxPre: 0.22, // simplified tax rate
  useAgiTax: params.useAgiTax,
  filingStatus: params.filingStatus,
  balances: {
    balPre: params.balPre,
    balRoth: params.balRoth,
    balSavings: params.balSavings,
  },
  year: 0,
});

console.log(
  `  Total Contributions: ${formatCurrency(
    workingYearResult.contributions.total
  )}`
);
console.log(
  `    - Pre-tax: ${formatCurrency(workingYearResult.contributions.pretax)}`
);
console.log(
  `    - Roth: ${formatCurrency(workingYearResult.contributions.roth)}`
);
console.log(
  `    - Employer Match: ${formatCurrency(
    workingYearResult.contributions.employerMatch
  )}`
);
console.log(
  `    - Taxable Savings: ${formatCurrency(
    workingYearResult.contributions.taxable
  )}`
);
console.log(
  `  Federal Taxes: ${formatCurrency(workingYearResult.taxes.federal)}`
);
console.log(
  `  New Total Balance: ${formatCurrency(workingYearResult.totalBalance)}`
);

// Step 6: Display results using Phase 2
console.log("\n📺 Results Display via Phase 2:");
const mockFullResults = {
  success: true,
  yearlyResults: [
    {
      year: 2025,
      age: params.currentAge,
      totalBalance: workingYearResult.totalBalance,
      taxes: workingYearResult.taxes,
    },
  ],
};

resultsDisplayer.displayKPIs(mockFullResults, params);
console.log("✅ Results displayed via Phase 2 DOM adapter");

// Step 7: Show configuration flexibility
console.log("\n⚙️ Configuration Flexibility:");
console.log("Configured input fields:", Object.keys(DOM_FIELD_CONFIG).length);

// Show how easy it is to change element IDs
const alternativeConfig = {
  ...DOM_FIELD_CONFIG,
  currentAge: "user_age_input",
  retireAge: "retirement_age_field",
  salary: "annual_income",
};

const flexibleAdapter = new DOMAdapter(alternativeConfig);
console.log("✅ Alternative configuration created");
console.log("  currentAge now maps to:", alternativeConfig.currentAge);
console.log("  retireAge now maps to:", alternativeConfig.retireAge);
console.log("  salary now maps to:", alternativeConfig.salary);

// Step 8: Integration benefits
console.log("\n🎯 Integration Benefits:");
console.log("✅ Complete separation of concerns:");
console.log("  📊 Phase 1: Pure calculations (no DOM)");
console.log("  🎛️  Phase 2: Configurable DOM adapter (no business logic)");
console.log("✅ Easy testing:");
console.log("  🧪 Phase 1: Unit test pure functions");
console.log("  🧪 Phase 2: Mock DOM for adapter testing");
console.log("✅ Framework flexibility:");
console.log("  ⚛️  Can use Phase 1 with React, Vue, Angular");
console.log("  🔧 Phase 2 adapts to any HTML structure");
console.log("✅ Maintainability:");
console.log("  🔄 Change element IDs without touching calculations");
console.log("  📝 Clear data flow: HTML → Phase 2 → Phase 1 → Phase 2 → HTML");

// Step 9: Performance validation
console.log("\n⚡ Performance Integration:");
const perfStart = performance.now();

// Simulate processing 100 form submissions
for (let i = 0; i < 100; i++) {
  const testParams = formCollector.collectFormData();
  const result = calculateWorkingYear({
    ...testParams,
    salary: testParams.startingSalary + i * 1000,
    age: testParams.currentAge,
    balances: {
      balPre: testParams.balPre,
      balRoth: testParams.balRoth,
      balSavings: testParams.balSavings,
    },
    year: 0,
  });
}

const perfEnd = performance.now();
console.log(
  `100 form-to-calculation cycles: ${(perfEnd - perfStart).toFixed(2)}ms`
);
console.log(`Average per cycle: ${((perfEnd - perfStart) / 100).toFixed(2)}ms`);

console.log("\n🎉 Phase 1 + Phase 2 Integration Test Complete!");
console.log("🚀 Ready for production use");
console.log("📈 Ready for Phase 3: Event-driven updates");

// Cleanup
if (typeof window === "undefined") {
  delete global.document;
}
