console.log("==========================================");
console.log("Testing GAAP Account System");
console.log("==========================================");

const {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} = require("./baseTest.js");
const { EnumBase } = require("../cEnum.js");
// Load your GAAP module
const {
  GaapAccountTypeNames,
  GaapAccountType,
  GAAP_NORMAL_BALANCE_BY_TYPE,
  GaapAccount,
  GaapPostingSide,
} = require("../cGaap.js");

const testTracker = new TestTracker("GaapAccount Tests");

//------------------------------------------------------------
// TEST 1 — GaapAccountTypeNames integrity
//------------------------------------------------------------
runTest(
  "GaapAccountTypeNames contains correct literal values",
  () => {
    assertEqual(GaapAccountTypeNames.Asset, "Asset", "Asset name mismatch");
    assertEqual(
      GaapAccountTypeNames.Liability,
      "Liability",
      "Liability mismatch"
    );
    assertEqual(GaapAccountTypeNames.Equity, "Equity", "Equity mismatch");
    assertEqual(GaapAccountTypeNames.Income, "Income", "Income mismatch");
    assertEqual(GaapAccountTypeNames.Expense, "Expense", "Expense mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 2 — GaapAccountType symbols + toName()
//------------------------------------------------------------
runTest(
  "GaapAccountType exposes symbols and toName works",
  () => {
    const assetSym = GaapAccountType.Asset;
    assert(typeof assetSym === "symbol", "Asset should be a symbol");

    const name = GaapAccountType.toName(assetSym);
    assertEqual(name, "Asset", "toName should return 'Asset'");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 3 — toName throws on invalid symbol
//------------------------------------------------------------
runTest(
  "GaapAccountType.toName throws on invalid symbol",
  () => {
    const bogus = Symbol("NotARealEnumValue");
    let caught = false;
    try {
      GaapAccountType.toName(bogus);
    } catch {
      caught = true;
    }
    assert(caught, "Should throw on invalid symbol");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 4 — GAAP_NORMAL_BALANCE_BY_TYPE correctness
//------------------------------------------------------------
runTest(
  "Normal balance mapping is GAAP-correct",
  () => {
    assertEqual(
      GAAP_NORMAL_BALANCE_BY_TYPE.Asset,
      GaapPostingSide.Debit,
      "Assets should have debit normal balance"
    );

    assertEqual(
      GAAP_NORMAL_BALANCE_BY_TYPE.Expense,
      GaapPostingSide.Debit,
      "Expenses should have debit normal balance"
    );

    assertEqual(
      GAAP_NORMAL_BALANCE_BY_TYPE.Liability,
      GaapPostingSide.Credit,
      "Liabilities should have credit normal balance"
    );

    assertEqual(
      GAAP_NORMAL_BALANCE_BY_TYPE.Income,
      GaapPostingSide.Credit,
      "Income should have credit normal balance"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 5 — GaapAccount constructor
//------------------------------------------------------------
runTest(
  "GaapAccount constructor assigns id, name, type, and normalBalance",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");

    assert(acct.id > 0, "Account should get an id");
    assertEqual(acct.name, "Cash", "Account name mismatch");
    assertEqual(acct.type, GaapAccountType.Asset, "Account type mismatch");
    assertEqual(
      acct.normalBalance,
      GaapPostingSide.Debit,
      "Cash should have debit normal balance"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 6 — apply() logic for Asset accounts
//------------------------------------------------------------
runTest(
  "GaapAccount.apply() works for Asset accounts",
  () => {
    const cash = GaapAccount.CreateCashAccount("Cash");

    const inc = cash.apply(GaapPostingSide.Debit, 100);
    const dec = cash.apply(GaapPostingSide.Credit, 100);

    assertEqual(inc, 100, "Debit should increase Asset");
    assertEqual(dec, -100, "Credit should decrease Asset");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 7 — apply() logic for Liability accounts
//------------------------------------------------------------
runTest(
  "GaapAccount.apply() works for Liability accounts",
  () => {
    const ap = GaapAccount.CreateNonCashAccount("Accounts Payable", GaapAccountType.Liability);

    assertEqual(
      ap.apply(GaapPostingSide.Credit, 50),
      50,
      "Credit should increase Liability"
    );
    assertEqual(
      ap.apply(GaapPostingSide.Debit, 50),
      -50,
      "Debit should decrease Liability"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 8 — apply() logic for Income accounts
//------------------------------------------------------------
runTest(
  "GaapAccount.apply() works for Income accounts",
  () => {
    const rev = GaapAccount.CreateNonCashAccount("Revenue", GaapAccountType.Income);

    assertEqual(
      rev.apply(GaapPostingSide.Credit, 200),
      200,
      "Credit increases Income"
    );
    assertEqual(
      rev.apply(GaapPostingSide.Debit, 200),
      -200,
      "Debit decreases Income"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 9 — apply() logic for Expense accounts
//------------------------------------------------------------
runTest(
  "GaapAccount.apply() works for Expense accounts",
  () => {
    const exp = GaapAccount.CreateNonCashAccount("Supplies Expense", GaapAccountType.Expense);

    assertEqual(
      exp.apply(GaapPostingSide.Debit, 75),
      75,
      "Debit increases Expense"
    );
    assertEqual(
      exp.apply(GaapPostingSide.Credit, 75),
      -75,
      "Credit decreases Expense"
    );
  },
  testTracker
);

//
// EDGE CASE TESTS — GaapAccountType
//

// Test: GaapAccountType.parse throws for invalid string
runTest(
  "GaapAccountType.parse should throw on invalid name",
  () => {
    assertThrows(() => GaapAccountType.parse("NotARealType"));
  },
  testTracker
);

// Test: GaapAccountType.tryParse returns null for invalid string
runTest(
  "GaapAccountType.tryParse returns null for invalid name",
  () => {
    const result = GaapAccountType.tryParse("BOGUS");
    assert(result === null, "tryParse should return null for invalid type");
  },
  testTracker
);

// Test: toName() throws exception for raw Symbols not belonging to this enum
runTest(
  "GaapAccountType.toName throws on external symbols",
  () => {
    assertThrows(() => GaapAccountType.toName(Symbol("Random.Unrelated")));
  },
  testTracker
);

// Test: values() returns symbols only
runTest(
  "GaapAccountType.values returns only symbols",
  () => {
    const vals = GaapAccountType.values();
    assert(vals.length === 5, "Should return 5 enum values");
    vals.forEach((v) => {
      assert(typeof v === "symbol", "Each enum value must be a symbol");
    });
  },
  testTracker
);

// Test: names() returns correct string-literal list
runTest(
  "GaapAccountType.names returns correct strings",
  () => {
    const names = GaapAccountType.names().sort();
    const expected = Object.keys(GaapAccountTypeNames).sort();
    assert(
      JSON.stringify(names) === JSON.stringify(expected),
      "GaapAccountType.names() should return correct names"
    );
  },
  testTracker
);

console.log("\n==========================================");
console.log("              TEST SUMMARY");
console.log("==========================================");
console.log(`Total tests run:    ${testTracker.testsRun}`);
console.log(`Passed:             ${testTracker.testsPassed}`);
console.log(`Failed:             ${testTracker.testsFailed}`);

if (testTracker.testsFailed === 0) {
  console.log("\n🎉 ALL TESTS PASSED — GREAT JOB!\n");
} else {
  console.log(
    `\n🔥 ${testTracker.testsFailed} TEST(S) FAILED — REVIEW REQUIRED\n`
  );
}
