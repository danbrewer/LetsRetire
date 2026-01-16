// @ts-check

console.log("==========================================");
console.log("Retirement Calculator — Workbench");
console.log("==========================================");

import { calc } from "../retirement-calculator.js";
import { Inputs } from "../cInputs.js";
import { Calculations } from "../cCalculation.js";
import { ACCOUNT_TYPES } from "../cAccount.js";
import { assert, assertEqual, runTest, TestTracker } from "./baseTest.js";

const testTracker = new TestTracker("Retirement Calculator Workbench");

//------------------------------------------------------------
// Canonical test scenario (mapped to constructor)
//------------------------------------------------------------
function createInputs() {
  return new Inputs(
    /* initialAge */ 60,
    /* initialAgeSpouse */ 56,
    /* retireAge */ 62,
    /* ssStartAge */ 62,
    /* penStartAge */ 65,
    /* endAge */ 120,
    /* inflation */ 0.03,
    /* spendingToday */ 100000,
    /* spendingDecline */ 0.01,

    /* spouseRetireAge */ 62,
    /* spouseSsMonthly */ 1000,
    /* spouseSsStartAge */ 62,
    /* spouseSsCola */ 0.02,
    /* spousePenMonthly */ 500,
    /* spousePenStartAge */ 65,
    /* spouse401kStartAge */ 62,
    /* spousePenCola */ 0,
    /* spouseTaxSS */ 0.1,
    /* spouseTaxPension */ 0.2,

    /* startingSalary */ 174500,
    /* salaryGrowth */ 0.02,
    /* pretaxPct */ 0,
    /* rothPct */ 0,
    /* taxablePct */ 0.35,
    /* matchCap */ 0,
    /* matchRate */ 0,

    /* trad401k */ 500000,
    /* rothIRA */ 0,
    /* spouse401k */ 100000,
    /* spouseRoth */ 0,
    /* savings */ 500000,

    /* ret401k */ 0.03,
    /* retRoth */ 0,
    /* retSpouse401k */ 0.03,
    /* retSpouseRoth */ 0.03,
    /* retSavings */ 0.03,

    /* ssMonthly */ 2500,
    /* ssCola */ 0.025,
    /* penMonthly */ 3500,
    /* penCola */ 0,

    /* filingStatus */ "married",
    /* useRMD */ true,
    /* flatSsWithholdingRate */ 0.07,
    /* flatTrad401kWithholdingRate */ 0.2,
    /* flatPensionWithholdingRate */ 0.2,
    /* flatWageWithholdingRate */ 0.22,
    /* order */ [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ]
  );
}

//------------------------------------------------------------
// Mock RetirementUIFunctions (Node-safe)
//------------------------------------------------------------
/**
 * @param {Inputs} inputs
 */
function createMockUI(inputs) {
  return {
    parseInputParameters() {
      console.log("UI.parseInputParameters()");
      return inputs;
    },

    regenerateSpendingFields() {
      console.log("UI.regenerateSpendingFields()");
    },

    regenerateTaxableIncomeFields() {
      console.log("UI.regenerateTaxableIncomeFields()");
    },

    regenerateTaxFreeIncomeFields() {
      console.log("UI.regenerateTaxFreeIncomeFields()");
    },

    /**
     * @param {number} age
     */
    getSpendingOverride(age) {
      console.log(`UI.getSpendingOverride(age=${age})`);
      return 0;
    },

    /**
     * @param {number} age
     */
    getTaxableIncomeOverride(age) {
      console.log(`UI.getTaxableIncomeOverride(age=${age})`);
      return 0;
    },

    /**
     * @param {Number} age
     */
    getTaxFreeIncomeOverride(age) {
      console.log(`UI.getTaxFreeIncomeOverride(age=${age})`);
      return 0;
    },
  };
}

//------------------------------------------------------------
// TEST 1 — Inputs constructor + derived values
//------------------------------------------------------------
// runTest(
//   "Inputs constructor computes derived values correctly",
//   () => {
//     const inputs = createInputs();

//     assertEqual(inputs.totalWorkingYears, 2, "Working years mismatch");
//     assertEqual(inputs.totalLivingYears, 30, "Living years mismatch");
//     assert(inputs.hasSpouse, "Should detect spouse");
//     assert(inputs.spendAtRetire > 0, "Spend-at-retire should be computed");
//   },
//   testTracker
// );

//------------------------------------------------------------
// TEST 2 — calc() executes end-to-end
//------------------------------------------------------------
runTest(
  "calc() executes end-to-end using real Inputs",
  () => {
    const inputs = createInputs();
    const UI = createMockUI(inputs);
    const calculations = new Calculations();

    calc(calculations, UI);

    console.log(
      `Calculations created: ${calculations.getAllCalculations().length}`
    );
    assert(
      calculations.getAllCalculations().length > 0,
      "Expected calculations"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 3 — Calculation count matches timeline
//------------------------------------------------------------
runTest(
  "calc() creates one Calculation per living year",
  () => {
    const inputs = createInputs();
    const UI = createMockUI(inputs);
    const calculations = new Calculations();

    calc(calculations, UI);

    assertEqual(
      calculations.getAllCalculations().length,
      inputs.totalLivingYears,
      "Calculation count should equal totalLivingYears"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 4 — Inspect first working year
//------------------------------------------------------------
runTest(
  "First Calculation represents working year",
  () => {
    const inputs = createInputs();
    const UI = createMockUI(inputs);
    const calculations = new Calculations();

    calc(calculations, UI);

    const first = calculations.getAllCalculations()[0];
    console.log("\n--- FIRST YEAR DUMP ---");
    first.dump?.("Working Year 0");

    assert(first.taxYear > 0, "Tax year must be set");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 5 — Inspect retirement transition
//------------------------------------------------------------
runTest(
  "Transition year aligns with retireAge",
  () => {
    const inputs = createInputs();
    const UI = createMockUI(inputs);
    const calculations = new Calculations();

    calc(calculations, UI);

    const idx = inputs.totalWorkingYears;
    const transition = calculations.getAllCalculations()[idx];

    console.log("\n--- RETIREMENT TRANSITION DUMP ---");
    transition.dump?.("First Retirement Year");

    assert(transition !== undefined, "Retirement transition should exist");
  },
  testTracker
);

//------------------------------------------------------------
// SUMMARY
//------------------------------------------------------------
console.log("\n==========================================");
console.log("              TEST SUMMARY");
console.log("==========================================");
console.log(`Total tests run:    ${testTracker.testsRun}`);
console.log(`Passed:             ${testTracker.testsPassed}`);
console.log(`Failed:             ${testTracker.testsFailed}`);

if (testTracker.testsFailed === 0) {
  console.log("\n🎉 WORKBENCH READY — ALL TESTS PASSED\n");
} else {
  console.log(
    `\n🔥 ${testTracker.testsFailed} TEST(S) FAILED — REVIEW REQUIRED\n`
  );
}
