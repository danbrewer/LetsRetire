console.log("==========================================");
console.log("Testing GAAP Posting System");
console.log("==========================================");

import {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} from "./baseTest.js";

// // Load the GAAP module
import {
  GaapAccountType,
  GaapAccount,
  GaapPostingSide,
  GaapPostingBuilder,
  GaapPosting,
  GaapJournalEntry,
  GaapLedger,
} from "../cGaap.js";

const testTracker = new TestTracker("GaapPosting Tests");

//------------------------------------------------------------
// TEST 1 — PostingBuilder creates valid debit for Asset
//------------------------------------------------------------
runTest(
  "PostingBuilder creates valid debit posting for Asset accounts",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");

    const builder = new GaapPostingBuilder();
    builder.increase(acct, 100);
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
      postings[0].account.id,
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
    const acct = GaapAccount.CreateNonCashAccount(
      "Loan",
      GaapAccountType.Liability
    );

    const builder = new GaapPostingBuilder();
    builder.increase(acct, 250);
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
    const cash = GaapAccount.CreateCashAccount("Cash");
    const builder = new GaapPostingBuilder();
    builder.decrease(cash, 75);
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
    const equity = GaapAccount.CreateNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );
    const builder = new GaapPostingBuilder();
    builder.decrease(equity, 900);
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
  "GaapJournalEntry rejects insufficient postings",
  () => {
    assertThrows(
      () => new GaapJournalEntry(new Date(), "bad txn", []),
      "Should reject zero postings"
    );

    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "bad txn", [
          {
            account: GaapAccount.CreateCashAccount("Cash"),
            side: "Debit",
            amount: 10,
          },
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
  "GaapJournalEntry rejects negative posting amounts",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");
    const postings = [
      { account: acct, side: GaapPostingSide.Debit, amount: -100 },
      { account: acct, side: GaapPostingSide.Credit, amount: -100 },
    ];

    assertThrows(
      () => new GaapJournalEntry(new Date(), "neg", postings),
      "Should reject negative posting amounts"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 7 — Transaction must balance
//------------------------------------------------------------
runTest(
  "GaapJournalEntry rejects unbalanced postings",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");

    const postings = [
      { account: acct, side: GaapPostingSide.Debit, amount: 100 },
      { account: acct, side: GaapPostingSide.Credit, amount: 50 },
    ];

    assertThrows(
      () => new GaapJournalEntry(new Date(), "unbalanced", postings),
      "Should reject unbalanced postings"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 8 — Transaction accepts balanced entries
//------------------------------------------------------------
runTest(
  "GaapJournalEntry accepts valid balanced postings",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");

    const postings = [
      { account: acct, side: GaapPostingSide.Debit, amount: 100 },
      { account: acct, side: GaapPostingSide.Credit, amount: 100 },
    ];

    const journalEntry = new GaapJournalEntry(new Date(), "balanced", postings);

    assertEqual(
      journalEntry.postings.length,
      2,
      "Journal Entry should contain both postings"
    );
    assert(journalEntry.id > 0, "Journal Entry should have a valid ID");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 9 — Account.apply logic for debit-normal accounts
//------------------------------------------------------------
runTest(
  "Account.apply works correctly for debit-normal accounts",
  () => {
    const acct = GaapAccount.CreateCashAccount("Cash");

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
    const acct = GaapAccount.CreateNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

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

testTracker.generateTestReport();
