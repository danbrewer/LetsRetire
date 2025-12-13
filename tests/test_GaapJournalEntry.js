// @ts-check

console.log("==========================================");
console.log("Testing GAAP Journal Entry System");
console.log("==========================================");

const {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} = require("./baseTest.js");

// const {
//   GaapAccountType,
//   GaapPosting,
//   GaapPostingSide,
//   GaapJournalEntry,
//   GaapJournalEntryBuilder,
//   GaapLedger,
// } = require("../cGaap.js");

const testTracker = new TestTracker("GaapJournalEntry COMPLETE Test Suite");

// Utility: extract posting by (account, side)
/**
 * @param {{ postings: any[]; }} je
 * @param {{ id: any; }} account
 * @param {any} side
 */
function findPosting(je, account, side) {
  return je.postings.find(
    (/** @type {{ account: { id: any; }; side: any; }} */ p) => p.account.id === account.id && p.side === side
  );
}

// Utility: run a JE and check debits = credits
/**
 * @param {GaapJournalEntry} je
 */
function assertBalanced(je, msg = "Entry must be balanced") {
  const dr = je.postings
    .filter((/** @type {{ side: string; }} */ p) => p.side === GaapPostingSide.Debit)
    .reduce((/** @type {any} */ s, /** @type {{ amount: any; }} */ p) => s + p.amount, 0);

  const cr = je.postings
    .filter((/** @type {{ side: string; }} */ p) => p.side === GaapPostingSide.Credit)
    .reduce((/** @type {any} */ s, /** @type {{ amount: any; }} */ p) => s + p.amount, 0);

  assertEqual(dr, cr, msg);
}

// ======================================================================
// 1 — GaapJournalEntry rejects invalid construction parameters
// ======================================================================
runTest(
  "JournalEntry requires a valid Date and at least 2 postings",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");

    assertThrows(
      // @ts-ignore
      () => new GaapJournalEntry("notadate", "Bad", []),
      "Invalid date should throw"
    );

    assertThrows(
      () => new GaapJournalEntry(new Date(), "Too few", []),
      "0 postings must throw"
    );

    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "Only 1 posting", [
          new GaapPosting(cash, 10, GaapPostingSide.Debit),
        ]),
      "1 posting must throw"
    );
  },
  testTracker
);

// ======================================================================
// 2 — JournalEntry rejects negative or zero amounts or bad sides
// ======================================================================
runTest(
  "JournalEntry validates posting amounts and sides",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const rev = ledger.createNonCashAccount("Revenue", GaapAccountType.Income);

    // Zero amount
    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "Zero", [
          new GaapPosting(cash, 0, GaapPostingSide.Debit),
          new GaapPosting(rev, 0, GaapPostingSide.Credit),
        ]),
      "Zero amounts should be rejected"
    );

    // Negative amount
    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "Negative", [
          new GaapPosting(cash, -5, GaapPostingSide.Debit),
          new GaapPosting(rev, -5, GaapPostingSide.Credit),
        ]),
      "Negative amounts should be rejected"
    );

    // Invalid posting side string
    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "Invalid side", [
          // @ts-ignore
          new GaapPosting(cash, 10, "WAT"),
          new GaapPosting(rev, 10, GaapPostingSide.Credit),
        ]),
      "Invalid posting side must throw"
    );
  },
  testTracker
);

// ======================================================================
// 3 — JournalEntry must balance debits == credits
// ======================================================================
runTest(
  "JournalEntry must be balanced",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const rev = ledger.createNonCashAccount("Revenue", GaapAccountType.Income);

    // 100 debit vs 99 credit should fail
    assertThrows(
      () =>
        new GaapJournalEntry(new Date(), "Unbalanced", [
          new GaapPosting(cash, 100, GaapPostingSide.Debit),
          new GaapPosting(rev, 99, GaapPostingSide.Credit),
        ]),
      "Unbalanced entry must throw"
    );
  },
  testTracker
);

// ======================================================================
// 4 — Postings are sorted: all Debits first, then Credits, alphabetically
// ======================================================================
runTest(
  "JournalEntry sorts postings by side then alphabetically",
  () => {
    const ledger = new GaapLedger();
    const b = ledger.createCashAccount("B_Account");
    const a = ledger.createCashAccount("A_Account");
    const c = ledger.createNonCashAccount("C_Revenue", GaapAccountType.Income);

    const postings = [
      new GaapPosting(c, 20, GaapPostingSide.Credit),
      new GaapPosting(b, 10, GaapPostingSide.Debit),
      new GaapPosting(a, 10, GaapPostingSide.Debit),
    ];

    const je = new GaapJournalEntry(new Date(), "Sort Test", postings);

    assertEqual(je.postings[0].account.name, "A_Account", "First posting must be A_Account");
    assertEqual(je.postings[1].account.name, "B_Account", "Second posting must be B_Account");
    assertEqual(je.postings[2].account.name, "C_Revenue", "Third posting must be C_Revenue");
  },
  testTracker
);

// ======================================================================
// 5 — toString() formatting integrity
// ======================================================================
runTest(
  "JournalEntry.toString outputs required sections",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const rev = ledger.createNonCashAccount("Revenue", GaapAccountType.Income);

    const je = new GaapJournalEntry(new Date("2024-01-01"), "Sale", [
      new GaapPosting(cash, 300, GaapPostingSide.Debit),
      new GaapPosting(rev, 300, GaapPostingSide.Credit),
    ]);

    const out = je.toString();

    assert(out.includes("Journal Entry #"), "ID header must appear");
    assert(out.includes("Date: 2024-01-01"), "ISO date must appear");
    assert(out.includes("Description: Sale"), "Description must appear");
    assert(out.includes("Cash"), "Account name must appear");
    assert(out.includes("Revenue"), "Second account must appear");
    assert(out.includes("Total Debits:"), "Totals must appear");
    assert(out.includes("Status: BALANCED"), "Balanced check must appear");
  },
  testTracker
);

// ======================================================================
// 6 — JournalEntryBuilder rejects invalid amounts
// ======================================================================
runTest(
  "JournalEntryBuilder rejects zero/negative debit or credit amounts",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");

    const builder = new GaapJournalEntryBuilder(
      ledger,
      new Date(),
      "Bad Entries"
    );

    assertThrows(() => builder.debit(cash, 0), "Zero debit must throw");
    assertThrows(() => builder.credit(cash, -5), "Negative credit must throw");
  },
  testTracker
);

// ======================================================================
// 7 — JournalEntryBuilder requires 2+ postings before post()
// ======================================================================
runTest(
  "JournalEntryBuilder requires at least 2 postings",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");

    const builder = new GaapJournalEntryBuilder(
      ledger,
      new Date(),
      "Too few postings"
    );

    builder.debit(cash, 100);

    assertThrows(() => builder.post(), "Posting only 1 line must throw");
  },
  testTracker
);

// ======================================================================
// 8 — JournalEntryBuilder rejects unbalanced postings
// ======================================================================
runTest(
  "JournalEntryBuilder rejects unbalanced entries",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const eq = ledger.createNonCashAccount("Equity", GaapAccountType.Equity);

    const builder = new GaapJournalEntryBuilder(
      ledger,
      new Date(),
      "Unbalanced"
    );

    builder.debit(cash, 100).credit(eq, 99);

    assertThrows(() => builder.post(), "Unbalanced builder must throw");
  },
  testTracker
);

// ======================================================================
// 9 — JournalEntryBuilder creates a valid balanced JE via ledger.record
// ======================================================================
runTest(
  "JournalEntryBuilder creates a valid JournalEntry via ledger.record",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const rev = ledger.createNonCashAccount("Revenue", GaapAccountType.Income);

    const builder = new GaapJournalEntryBuilder(
      ledger,
      new Date("2024-01-10"),
      "Builder Sale"
    );

    const je = builder.debit(cash, 500).credit(rev, 500).post();

    assert(
      je instanceof GaapJournalEntry,
      "post() should return a JournalEntry"
    );
    assertEqual(ledger.journalEntries.length, 1, "Ledger must contain 1 entry");
    assertBalanced(je);
  },
  testTracker
);

// ======================================================================
// 10 — Integration: JournalEntryBuilder postings flow through ledger.getBalance()
// ======================================================================
runTest(
  "JournalEntryBuilder postings affect account balances correctly",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const exp = ledger.createNonCashAccount(
      "Office Expense",
      GaapAccountType.Expense
    );

    ledger
      .entry(new Date("2024-02-01"), "Office Supplies")
      .credit(cash, 200)
      .debit(exp, 200)
      .post();

    assertEqual(
      cash.getBalance(ledger),
      -200,
      "Cash must be -200 after credit"
    );
    assertEqual(
      exp.getBalance(ledger),
      200,
      "Expense must be +200 after debit"
    );
  },
  testTracker
);

// ======================================================================
// FINAL REPORT
// ======================================================================
testTracker.generateTestReport();
