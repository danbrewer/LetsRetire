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
  /** @type {import("../cInputs.js").InputsOptions} */
  const inputArgs = {
    // Ages / timeline
    startingYear: 2025,
    initialAgeSubject: 60,
    initialAgePartner: 56,
    subjectRetireAge: 62,
    subjectSsStartAge: 62,
    subjectPensionStartAge: 65,
    subject401kStartAge: 62,
    endSubjectAge: 95,

    // Spending
    inflationRate: 0.03,
    spendingToday: 100000,
    spendingDecline: 0.01,

    // Partner
    partnerRetireAge: 62,
    partnerSsMonthly: 1000,
    partnerSsStartAge: 62,
    partnerSsCola: 0.02,
    partnerPenMonthly: 500,
    partnerPenStartAge: 65,
    partner401kStartAge: 62,
    partnerPenCola: 0,
    partnerTaxSS: 0.1,
    partnerTaxPension: 0.2,

    // Salary / contributions
    subjectStartingSalary: 174500,
    partnerStartingSalary: 0,
    subjectSalaryGrowthRate: 0.02,
    partnerSalaryGrowthRate: 0,
    subject401kContributionRate: 0.05,
    partner401kContributionRate: 0.05,
    subjectRothContributionRate: 0.01,
    partnerRothContributionRate: 0.01,
    taxablePct: 0.35,
    matchCap: 0,
    subject401kMatchRate: 0,
    subjectPayrollDeductions: 500,
    subjectPayPeriods: 26,
    partnerPayrollDeductions: 0,
    partnerPayPeriods: 26,

    // Starting balances
    subject401kStartingBalance: 500000,
    subjectRothStartingBalance: 1000,
    partner401kStartingBalance: 100000,
    partnerRothStartingBalance: 1000,
    savingsStartingBalance: 500000,

    // Returns
    subject401kInterestRate: 0.03,
    subjectRothInterestRate: 0.02,
    partner401kInterestRate: 0.03,
    partnerRothInterestRate: 0.02,
    savingsInterestRate: 0.03,

    // Benefits
    ssMonthly: 2500,
    ssCola: 0.025,
    penMonthly: 3500,
    penCola: 0,

    // Tax settings
    filingStatus: "married",
    useRMD: true,
    flatSsWithholdingRate: 0.07,
    flatTrad401kWithholdingRate: 0.15,
    flatPensionWithholdingRate: 0.2,
    flatWageWithholdingRate: 0.15,

    // Withdrawal order
    order: [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ],

    // Savings contributions
    subjectWorkingYearSavingsContributionFixed: 50,
    subjectWorkingYearSavingsContributionVariable: 0.05,
    partnerWorkingYearSavingsContributionFixed: 1,
    partnerWorkingYearSavingsContributionVariable: 0.02,
    subjectRetirementYearSavingsContributionFixed: 100,
    subjectRetirementYearSavingsContributionVariable: 0.01,
    partnerRetirementYearSavingsContributionFixed: 0,
    partnerRetirementYearSavingsContributionVariable: 0,
  };

  inputArgs.dump("inputs");

  return new Inputs(inputArgs);
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
      if (age < 0) return 0;
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
//     assert(inputs.hasPartner, "Should detect partner");
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
