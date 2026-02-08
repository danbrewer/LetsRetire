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
  return createInputsNoFussNoMuss();
  /** @type {import("../cInputs.js").InputsOptions} */
  const inputArgs = {
    subjectRetireAge: 62,
    partnerRetireAge: 62,
    // Ages / timeline
    startingYear: 2025,
    initialAgeSubject: 60,
    initialAgePartner: 56,
    subjectLifeSpan: 80,
    retirementYearExtraSpending: [
      // { year: 1, amount: 20000 },
      // { year: 2, amount: 20000 },
      // { year: 3, amount: 20000 },
      // { year: 4, amount: 20000 },
      // { year: 5, amount: 15000 },
      // { year: 6, amount: 15000 },
      // { year: 7, amount: 10000 },
      // { year: 8, amount: 10000 },
      // { year: 9, amount: 7500 },
      // { year: 10, amount: 5000 },
    ],
    // Cost of living
    spendingToday: 100000,
    inflationRate: 0.03,
    ssCola: 0.025,
    spendingDecline: 0.015,
    // partnerSsCola: 0, //0.02,
    // partnerPenCola: 0,
    // penCola: 0,

    // 401k
    flatCareerTrad401kWithholdingRate: 0.15,
    // partnerTaxSS: 0.1,
    subject401kStartAge: 62,
    partner401kStartAge: 62,
    subjectEmp401kMatchRate: 0,
    subject401kContributionRate: 0,

    // Pension
    subjectPensionStartAge: 65,
    partnerPenStartAge: 65,
    subjectPensionMonthly: 3500,
    partnerPenMonthly: 500,
    partnerPensionWithholdings: 0.2,

    // Social Security Benefits
    flatSsWithholdingRate: 0.07,
    subjectSsMonthly: 2500,
    partnerSsMonthly: 1000,
    subjectSsStartAge: 62,
    partnerSsStartAge: 62,

    // Salary / contributions
    subjectStartingSalary: 174500,
    partnerStartingSalary: 0,
    subjectCareer401kContributionRate: 0, // 0.05,
    partnerCareer401kContributionRate: 0, //0.05,
    subjectRothContributionRate: 0, //0.01,
    partnerRothContributionRate: 0, //0.01,

    subjectCareerMonthlyPayrollDeductions: 500,
    partnerCareerMonthlyPayrollDeductions: 0,

    subjectPayPeriods: 26,
    partnerPayPeriods: 26,

    // Growth rates
    subjectSalaryGrowthRate: 0.02,
    partnerSalaryGrowthRate: 0.02,
    subject401kInterestRate: 0.03,
    subjectRothInterestRate: 0.02,
    partner401kInterestRate: 0.03,
    partnerRothInterestRate: 0.02,
    savingsInterestRate: 0.03,

    // Starting balances
    savingsStartingBalance: 500000, //10000,
    subject401kStartingBalance: 500000, //1250,
    partner401kStartingBalance: 100000, //1250,
    subjectRothStartingBalance: 1500,
    partnerRothStartingBalance: 1500,

    // Tax settings
    filingStatus: "married",
    useRMD: true,
    flatPensionWithholdingRate: 0, // 0.2,
    flatWageWithholdingRate: 0, // 0.15,

    // Withdrawal order
    order: [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ],

    // Savings contributions
    subjectWorkingYearSavingsContributionFixedAmount: 0, // 50,
    subjectWorkingYearSavingsContributionRate: 0, // 0.05,
    partnerWorkingYearSavingsContributionFixedAmount: 0, //1,
    partnerWorkingYearSavingsContributionRate: 0, // 0.02,

    subjectRetirementYearSavingsContributionFixedAmount: 0,
    subjectRetirementYearSavingsContributionRate: 0,
    partnerRetirementYearSavingsContributionFixedAmount: 0,
    partnerRetirementYearSavingsContributionRate: 0,
  };

  inputArgs.dump("inputs");

  return new Inputs(inputArgs);
}

function createInputsNoFussNoMuss() {
  /** @type {import("../cInputs.js").InputsOptions} */
  const inputArgs = {
    subjectRetireAge: 62,
    partnerRetireAge: 62,
    // Ages / timeline
    startingYear: 2025,
    initialAgeSubject: 60,
    initialAgePartner: 60,
    subjectLifeSpan: 80,
    retirementYearExtraSpending: [
      { year: 1, amount: 5000 },
      { year: 2, amount: 4000 },
      { year: 3, amount: 3000 },
      { year: 4, amount: 2000 },
      { year: 5, amount: 1000 },
      { year: 6, amount: 500 },
      { year: 7, amount: 100 },
      // { year: 8, amount: 10000 },
      // { year: 9, amount: 7500 },
      // { year: 10, amount: 5000 },
    ],
    // Cost of living
    spendingToday: 50000,
    inflationRate: 0, //0.03,
    ssCola: 0, //0.025,
    spendingDecline: 0, //0.015,
    // partnerSsCola: 0, //0.02,
    // partnerPenCola: 0,
    // penCola: 0,

    // Salary / contributions
    subjectStartingSalary: 50000, //100000,
    partnerStartingSalary: 0,
    subjectCareer401kContributionRate: 0, // 0.05,
    partnerCareer401kContributionRate: 0, //0.05,
    subjectRothContributionRate: 0, //0.01,
    partnerRothContributionRate: 0, //0.01,

    subjectCareerMonthlyPayrollDeductions: 0,
    partnerCareerMonthlyPayrollDeductions: 0,

    subjectPayPeriods: 26,
    partnerPayPeriods: 26,

    // 401k
    flatCareerTrad401kWithholdingRate: 0,
    // partnerTaxSS: 0.1,
    subject401kStartAge: 62,
    partner401kStartAge: 62,
    subjectEmp401kMatchRate: 0,
    subject401kContributionRate: 0,

    // Pension
    subjectPensionStartAge: 65,
    partnerPenStartAge: 65,
    subjectPensionMonthly: 0, //500,
    partnerPenMonthly: 0, //500,
    partnerPensionWithholdings: 0,

    // Social Security Benefits
    flatSsWithholdingRate: 0,
    subjectSsMonthly: 0, //1000,
    partnerSsMonthly: 0, //1000,
    subjectSsStartAge: 62,
    partnerSsStartAge: 62,

    // Growth rates
    subjectSalaryGrowthRate: 0.0,
    partnerSalaryGrowthRate: 0.0,
    subject401kInterestRate: 0.0,
    subjectRothInterestRate: 0.0,
    partner401kInterestRate: 0.0,
    partnerRothInterestRate: 0.0,
    savingsInterestRate: 0.0,
    // Starting balances
    savingsStartingBalance: 500000, //10000,
    subject401kStartingBalance: 0, //500000, //1250,
    partner401kStartingBalance: 0, //100000, //1250,
    subjectRothStartingBalance: 0, //1500,
    partnerRothStartingBalance: 0, //1500,

    // Tax settings
    filingStatus: "married",
    useRMD: true,
    flatPensionWithholdingRate: 0, // 0.2,
    flatWageWithholdingRate: 0, // 0.15,

    // Withdrawal order
    order: [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ],

    // Savings contributions
    subjectWorkingYearSavingsContributionFixedAmount: 0, // 50,
    subjectWorkingYearSavingsContributionRate: 0, // 0.05,
    partnerWorkingYearSavingsContributionFixedAmount: 0, //1,
    partnerWorkingYearSavingsContributionRate: 0, // 0.02,

    subjectRetirementYearSavingsContributionFixedAmount: 0,
    subjectRetirementYearSavingsContributionRate: 0,
    partnerRetirementYearSavingsContributionFixedAmount: 0,
    partnerRetirementYearSavingsContributionRate: 0,
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
      // console.log(`UI.getTaxableIncomeOverride(age=${age})`);
      return 0 * age; // just to return zero
    },

    /**
     * @param {Number} age
     */
    getTaxFreeIncomeOverride(age) {
      // console.log(`UI.getTaxFreeIncomeOverride(age=${age})`);
      return 0 * age; // just to return zero
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
