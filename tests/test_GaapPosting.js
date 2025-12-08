console.log("==========================================");
console.log("Testing GAAP Posting System");
console.log("==========================================");

const {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} = require("./baseTest.js");

// Load the GAAP module
const {
  GaapAccountType,
  GaapAccount,
  GaapPostingSide,
  GaapPostingBuilder,
  GaapTransaction,
} = require("../cGaap.js");

const testTracker = new TestTracker();

//------------------------------------------------------------
// TEST 1 — PostingBuilder creates valid debit for Asset
//------------------------------------------------------------
runTest(
  "PostingBuilder creates valid debit posting for Asset accounts",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);

    const builder = new GaapPostingBuilder();
    builder.deposit(acct, 100);
    const postings = builder.build();

    assert(postings.length === 1, "Should create exactly one posting");
    assertEqual(
      postings[0].side,
      GaapPostingSide.Debit,
      "Asset deposit should create debit posting"
    );
    assertEqual(
      postings[0].amount,
      100,
      "Posting amount should match deposit amount"
    );
    assertEqual(
      postings[0].accountId,
      acct.id,
      "Posting should reference correct account"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 2 — PostingBuilder creates valid credit for Liability
//------------------------------------------------------------
runTest(
  "PostingBuilder creates valid credit posting for Liability accounts",
  () => {
    const acct = new GaapAccount("Loan", GaapAccountType.Liability);

    const builder = new GaapPostingBuilder();
    builder.deposit(acct, 250);
    const postings = builder.build();

    assert(postings.length === 1, "Should create exactly one posting");
    assertEqual(
      postings[0].side,
      GaapPostingSide.Credit,
      "Liability deposit should create credit posting"
    );
    assertEqual(
      postings[0].amount,
      250,
      "Posting amount should match deposit amount"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 3 — Withdraw reverses normal balance for Asset
//------------------------------------------------------------
runTest(
  "PostingBuilder withdraw creates credit posting for Asset accounts",
  () => {
    const cash = new GaapAccount("Cash", GaapAccountType.Asset);
    const builder = new GaapPostingBuilder();
    builder.withdraw(cash, 75);
    const postings = builder.build();

    assertEqual(
      postings[0].side,
      GaapPostingSide.Credit,
      "Asset withdraw should create credit posting"
    );
    assertEqual(
      postings[0].amount,
      75,
      "Posting amount should match withdraw amount"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 4 — Withdraw reverses normal balance for Equity
//------------------------------------------------------------
runTest(
  "PostingBuilder withdraw creates debit posting for Equity accounts",
  () => {
    const equity = new GaapAccount("Equity", GaapAccountType.Equity);
    const builder = new GaapPostingBuilder();
    builder.withdraw(equity, 900);
    const postings = builder.build();

    assertEqual(
      postings[0].side,
      GaapPostingSide.Debit,
      "Equity withdraw should create debit posting"
    );
    assertEqual(
      postings[0].amount,
      900,
      "Posting amount should match withdraw amount"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 5 — Transaction requires at least two postings
//------------------------------------------------------------
runTest(
  "GaapTransaction rejects insufficient postings",
  () => {
    assertThrows(
      () => new GaapTransaction(new Date(), "bad txn", []),
      "Should reject zero postings"
    );

    assertThrows(
      () =>
        new GaapTransaction(new Date(), "bad txn", [
          { accountId: 1, side: "Debit", amount: 10 },
        ]),
      "Should reject single posting"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 6 — Transaction rejects negative amounts
//------------------------------------------------------------
runTest(
  "GaapTransaction rejects negative posting amounts",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);
    const postings = [
      { accountId: acct.id, side: GaapPostingSide.Debit, amount: -100 },
      { accountId: acct.id, side: GaapPostingSide.Credit, amount: -100 },
    ];

    assertThrows(
      () => new GaapTransaction(new Date(), "neg", postings),
      "Should reject negative posting amounts"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 7 — Transaction must balance
//------------------------------------------------------------
runTest(
  "GaapTransaction rejects unbalanced postings",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);

    const postings = [
      { accountId: acct.id, side: GaapPostingSide.Debit, amount: 100 },
      { accountId: acct.id, side: GaapPostingSide.Credit, amount: 50 },
    ];

    assertThrows(
      () => new GaapTransaction(new Date(), "unbalanced", postings),
      "Should reject unbalanced postings"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 8 — Transaction accepts balanced entries
//------------------------------------------------------------
runTest(
  "GaapTransaction accepts valid balanced postings",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);

    const postings = [
      { accountId: acct.id, side: GaapPostingSide.Debit, amount: 100 },
      { accountId: acct.id, side: GaapPostingSide.Credit, amount: 100 },
    ];

    const txn = new GaapTransaction(new Date(), "balanced", postings);

    assertEqual(
      txn.postings.length,
      2,
      "Transaction should contain both postings"
    );
    assert(txn.id > 0, "Transaction should have a valid ID");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 9 — Account.apply logic for debit-normal accounts
//------------------------------------------------------------
runTest(
  "Account.apply works correctly for debit-normal accounts",
  () => {
    const acct = new GaapAccount("Cash", GaapAccountType.Asset);

    assertEqual(
      acct.apply(GaapPostingSide.Debit, 100),
      100,
      "Debit should increase debit-normal account balance"
    );

    assertEqual(
      acct.apply(GaapPostingSide.Credit, 100),
      -100,
      "Credit should decrease debit-normal account balance"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 10 — Account.apply logic for credit-normal accounts
//------------------------------------------------------------
runTest(
  "Account.apply works correctly for credit-normal accounts",
  () => {
    const acct = new GaapAccount("Equity", GaapAccountType.Equity);

    assertEqual(
      acct.apply(GaapPostingSide.Credit, 200),
      200,
      "Credit should increase credit-normal account balance"
    );

    assertEqual(
      acct.apply(GaapPostingSide.Debit, 200),
      -200,
      "Debit should decrease credit-normal account balance"
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
