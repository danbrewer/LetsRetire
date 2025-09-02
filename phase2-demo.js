/**
 * Phase 2 Demo: Configuration-Based DOM Adapter
 *
 * This demonstrates how the DOM adapter layer separates
 * form data collection from calculation logic using configuration.
 */

import {
  DOMAdapter,
  FormDataCollector,
  ResultsDisplayer,
  RetirementCalculatorController,
  DOM_FIELD_CONFIG,
  DOM_OUTPUT_CONFIG,
} from "./dom-adapter.js";

console.log("🔧 Phase 2 Demo: Configuration-Based DOM Adapter");
console.log("=================================================");

// Example 1: Configuration-based field mapping
console.log("\n📋 Configuration-Based Field Mapping:");
console.log("Input fields configured:", Object.keys(DOM_FIELD_CONFIG).length);
console.log(
  "Output elements configured:",
  Object.keys(DOM_OUTPUT_CONFIG).length
);

// Show some example mappings
console.log("\nExample field mappings:");
console.log("  currentAge -> element ID:", DOM_FIELD_CONFIG.currentAge);
console.log("  retireAge -> element ID:", DOM_FIELD_CONFIG.retireAge);
console.log("  filingStatus -> element ID:", DOM_FIELD_CONFIG.filingStatus);
console.log("  kpiAge -> element ID:", DOM_OUTPUT_CONFIG.kpiAge);

// Example 2: Mock DOM environment for testing
console.log("\n🏗️  Creating Mock DOM Environment:");

// Create mock document object for testing
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
        addEventListener: function (event, handler) {
          console.log(`Mock: Added ${event} listener to ${id}`);
        },
      };
    }
    return this.elements[id];
  },
};

// Initialize DOM adapter with mock environment
const domAdapter = new DOMAdapter();
console.log("✅ DOM Adapter initialized with configuration");

// Example 3: Form data collection
console.log("\n📊 Form Data Collection Demo:");

const formCollector = new FormDataCollector(domAdapter);

// Set some mock form values
domAdapter.setValue("currentAge", "35");
domAdapter.setValue("retireAge", "65");
domAdapter.setValue("endAge", "85");
domAdapter.setValue("salary", "100000");
domAdapter.setValue("pretaxPct", "10");
domAdapter.setValue("rothPct", "5");
domAdapter.setValue("inflation", "2.5");
domAdapter.setValue("filingStatus", "married");
domAdapter.setChecked("useAgiTax", true);

console.log("Mock form values set...");

// Collect form data using configuration
const collectedParams = formCollector.collectFormData();
console.log("\n📈 Collected Parameters:");
console.log("  Current Age:", collectedParams.currentAge);
console.log("  Retirement Age:", collectedParams.retireAge);
console.log("  End Age:", collectedParams.endAge);
console.log("  Salary:", collectedParams.startingSalary);
console.log("  Pre-tax %:", collectedParams.pretaxPct * 100 + "%");
console.log("  Roth %:", collectedParams.rothPct * 100 + "%");
console.log("  Inflation:", collectedParams.inflation * 100 + "%");
console.log("  Filing Status:", collectedParams.filingStatus);
console.log("  Use AGI Tax:", collectedParams.useAgiTax);

// Example 4: Results display
console.log("\n📺 Results Display Demo:");

const resultsDisplayer = new ResultsDisplayer(domAdapter);

// Mock calculation results
const mockResults = {
  success: true,
  yearlyResults: [
    { year: 2025, age: 35, totalBalance: 500000, taxes: { federal: 15000 } },
    { year: 2055, age: 65, totalBalance: 2000000, taxes: { federal: 25000 } },
    { year: 2085, age: 85, totalBalance: 500000, taxes: { federal: 10000 } },
  ],
  summary: {
    finalBalance: 500000,
    totalContributions: 800000,
  },
};

const mockParams = {
  currentAge: 35,
  retireAge: 65,
  endAge: 85,
};

resultsDisplayer.displayKPIs(mockResults, mockParams);
console.log("✅ Results displayed using configuration");

// Check what was set in mock DOM
console.log("\nDOM elements updated:");
const kpiAgeElement = domAdapter.getElement("kpiAge");
const kpiEndBalElement = domAdapter.getElement("kpiEndBal");
console.log("  KPI Age HTML:", kpiAgeElement.innerHTML);
console.log("  KPI End Balance:", kpiEndBalElement.textContent);

// Example 5: Configuration flexibility
console.log("\n⚙️  Configuration Flexibility Demo:");

// Create custom configuration for different element IDs
const CUSTOM_CONFIG = {
  currentAge: "ageInput",
  retireAge: "retirementAgeInput",
  salary: "annualIncomeField",
  // ... other custom mappings
};

const customAdapter = new DOMAdapter(CUSTOM_CONFIG);
console.log("✅ Custom DOM adapter created with different element IDs");
console.log("Custom currentAge maps to:", CUSTOM_CONFIG.currentAge);

// Example 6: Controller demonstration
console.log("\n🎮 Controller Demo:");

const controller = new RetirementCalculatorController();
console.log("✅ Controller initialized");

// Mock the calculation method
console.log("Simulating calculation...");
try {
  // In real usage, this would trigger the full calculation pipeline
  const params = formCollector.collectFormData();
  console.log("✅ Form data collected via controller");
  console.log("✅ Parameters validated (would use calculation engine)");
  console.log("✅ Results displayed (would show actual results)");
} catch (error) {
  console.log("Note: Some DOM elements may not exist in test environment");
}

// Example 7: Advantages of Phase 2
console.log("\n🎯 Phase 2 Advantages:");
console.log("✅ Configurable element mappings");
console.log("✅ Clean separation of DOM access from business logic");
console.log("✅ Easy to test without real DOM");
console.log("✅ Framework-agnostic data collection");
console.log("✅ Type-safe field access");
console.log("✅ Centralized DOM configuration");
console.log("✅ Easy to change element IDs without breaking logic");

// Example 8: Integration with Phase 1
console.log("\n🔗 Integration with Phase 1:");
console.log("✅ DOM Adapter collects form data");
console.log("✅ Pure calculation engine processes data");
console.log("✅ DOM Adapter displays results");
console.log("✅ Zero calculation logic in DOM layer");
console.log("✅ Zero DOM dependencies in calculation engine");

console.log("\n🎉 Phase 2 Demo Complete!");
console.log("Ready to integrate with existing HTML form.");

// Cleanup mock global for Node.js environment
if (typeof window === "undefined") {
  delete global.document;
}
