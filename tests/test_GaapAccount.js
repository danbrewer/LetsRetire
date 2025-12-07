// @ts-nocheck
// ignore type-checking in this file for now to simplify runtime testing

console.log("==========================================");
console.log("Testing GAAP Account System");
console.log("==========================================");

const { EnumBase } = require("../cEnum.js");
// Load your GAAP module
const {
  GaapAccountTypeNames,
  GaapAccountType,
  GaapNormalBalance,
  GAAP_NORMAL_BALANCE_BY_TYPE,
  GaapAccount,
  GaapTransactionSide,
} = require("../cGaap.js");

//------------------------------------------------------------
// Simple Assertion Utilities (same style as your other tests)
//------------------------------------------------------------
function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: ${message}. Expected ${expected}, got ${actual}`
    );
  }
}

function runTest(name, fn) {
  try {
    console.log(`\n🧪 Running test: ${name}`);
    fn();
    console.log(`✅ PASSED: ${name}`);
  } catch (e) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${e.message}`);
  }
}

//------------------------------------------------------------
// TEST 1 — GaapAccountTypeNames integrity
//------------------------------------------------------------
runTest("GaapAccountTypeNames contains correct literal values", () => {
  assertEqual(GaapAccountTypeNames.Asset, "Asset", "Asset name mismatch");
  assertEqual(
    GaapAccountTypeNames.Liability,
    "Liability",
    "Liability mismatch"
  );
  assertEqual(GaapAccountTypeNames.Equity, "Equity", "Equity mismatch");
  assertEqual(GaapAccountTypeNames.Income, "Income", "Income mismatch");
  assertEqual(GaapAccountTypeNames.Expense, "Expense", "Expense mismatch");
});

//------------------------------------------------------------
// TEST 2 — GaapAccountType symbols + toName()
//------------------------------------------------------------
runTest("GaapAccountType exposes symbols and toName works", () => {
  const assetSym = GaapAccountType.Asset;
  assert(typeof assetSym === "symbol", "Asset should be a symbol");

  const name = GaapAccountType.toName(assetSym);
  assertEqual(name, "Asset", "toName should return 'Asset'");
});

//------------------------------------------------------------
// TEST 3 — toName throws on invalid symbol
//------------------------------------------------------------
runTest("GaapAccountType.toName throws on invalid symbol", () => {
  const bogus = Symbol("NotARealEnumValue");
  let caught = false;
  try {
    GaapAccountType.toName(bogus);
  } catch {
    caught = true;
  }
  assert(caught, "Should throw on invalid symbol");
});

//------------------------------------------------------------
// TEST 4 — GAAP_NORMAL_BALANCE_BY_TYPE correctness
//------------------------------------------------------------
runTest("Normal balance mapping is GAAP-correct", () => {
  assertEqual(
    GAAP_NORMAL_BALANCE_BY_TYPE.Asset,
    GaapNormalBalance.Debit,
    "Assets should have debit normal balance"
  );

  assertEqual(
    GAAP_NORMAL_BALANCE_BY_TYPE.Expense,
    GaapNormalBalance.Debit,
    "Expenses should have debit normal balance"
  );

  assertEqual(
    GAAP_NORMAL_BALANCE_BY_TYPE.Liability,
    GaapNormalBalance.Credit,
    "Liabilities should have credit normal balance"
  );

  assertEqual(
    GAAP_NORMAL_BALANCE_BY_TYPE.Income,
    GaapNormalBalance.Credit,
    "Income should have credit normal balance"
  );
});

//------------------------------------------------------------
// TEST 5 — GaapAccount constructor
//------------------------------------------------------------
runTest(
  "GaapAccount constructor assigns id, name, type, and normalBalance",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);

    assert(acct.id > 0, "Account should get an id");
    assertEqual(acct.name, "Cash", "Account name mismatch");
    assertEqual(acct.type, GaapAccountType.Asset, "Account type mismatch");
    assertEqual(
      acct.normalBalance,
      GaapNormalBalance.Debit,
      "Cash should have debit normal balance"
    );
  }
);

//------------------------------------------------------------
// TEST 6 — apply() logic for Asset accounts
//------------------------------------------------------------
runTest("GaapAccount.apply() works for Asset accounts", () => {
  const cash = new GaapAccount("Cash", GaapAccountType.Asset);

  const inc = cash.apply(GaapTransactionSide.Debit, 100);
  const dec = cash.apply(GaapTransactionSide.Credit, 100);

  assertEqual(inc, 100, "Debit should increase Asset");
  assertEqual(dec, -100, "Credit should decrease Asset");
});

//------------------------------------------------------------
// TEST 7 — apply() logic for Liability accounts
//------------------------------------------------------------
runTest("GaapAccount.apply() works for Liability accounts", () => {
  const ap = new GaapAccount("Accounts Payable", GaapAccountType.Liability);

  assertEqual(
    ap.apply(GaapTransactionSide.Credit, 50),
    50,
    "Credit should increase Liability"
  );
  assertEqual(
    ap.apply(GaapTransactionSide.Debit, 50),
    -50,
    "Debit should decrease Liability"
  );
});

//------------------------------------------------------------
// TEST 8 — apply() logic for Income accounts
//------------------------------------------------------------
runTest("GaapAccount.apply() works for Income accounts", () => {
  const rev = new GaapAccount("Revenue", GaapAccountType.Income);

  assertEqual(
    rev.apply(GaapTransactionSide.Credit, 200),
    200,
    "Credit increases Income"
  );
  assertEqual(
    rev.apply(GaapTransactionSide.Debit, 200),
    -200,
    "Debit decreases Income"
  );
});

//------------------------------------------------------------
// TEST 9 — apply() logic for Expense accounts
//------------------------------------------------------------
runTest("GaapAccount.apply() works for Expense accounts", () => {
  const exp = new GaapAccount("Supplies Expense", GaapAccountType.Expense);

  assertEqual(
    exp.apply(GaapTransactionSide.Debit, 75),
    75,
    "Debit increases Expense"
  );
  assertEqual(
    exp.apply(GaapTransactionSide.Credit, 75),
    -75,
    "Credit decreases Expense"
  );
});

console.log("\n==========================================");
console.log("GAAP Account System Tests Completed");
console.log("==========================================\n");
