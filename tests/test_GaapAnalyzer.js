import {
  runTest,
  TestTracker,
  assert,
  assertEqual,
  assertThrows,
} from "./baseTest.js";

import {
  GaapLedger,
  GaapAccountType,
} from "../cGaap.js";

import { GaapAnalyzer } from "../cGaapAnalyzer.js";

console.log("=".repeat(70));
console.log("🧪 GAAP ANALYZER TESTS");
console.log("=".repeat(70));

// const { GaapLedger, GaapAnalyzer, GaapAccountType } = require("../gaap.js"); // adjust path as needed

const testTracker = new TestTracker("GaapAnalyzer");

// ======================================================================
// 1 — Constructor validation
// ======================================================================
runTest(
  "GaapAnalyzer constructor requires valid ledger",
  () => {
    // @ts-ignore
    assertThrows(() => new GaapAnalyzer(null), "Should reject null ledger");
    // @ts-ignore
    assertThrows(() => new GaapAnalyzer(undefined), "Should reject undefined");
    // @ts-ignore
    assertThrows(() => new GaapAnalyzer({}), "Should reject non-ledger object");

    const ledger = new GaapLedger();
    const analyzer = new GaapAnalyzer(ledger);
    assert(analyzer instanceof GaapAnalyzer, "Valid ledger should construct");
  },
  testTracker
);

// ======================================================================
// 2 — getAccountActivity should return structured posting history
// ======================================================================
runTest(
  "getAccountActivity returns chronological posting list",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const income = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    const d = new Date("2023-01-01");

    ledger.entry(d, "Sale A").debit(cash, 100).credit(income, 100).post();
    ledger.entry(d, "Sale B").debit(cash, 200).credit(income, 200).post();

    const analyzer = new GaapAnalyzer(ledger);
    const activity = analyzer.getAccountActivity(cash);

    assertEqual(activity.length, 2, "Should return two postings");
    assert(activity[0].description === "Sale A", "First posting correct");
    assert(activity[1].description === "Sale B", "Second posting correct");
    assert(activity[0].amount === 100, "Posting amount correct");
  },
  testTracker
);

// ======================================================================
// 3 — getAccountBalanceAsOf computes correct running balance
// ======================================================================
runTest(
  "getAccountBalanceAsOf computes correct balance through a date",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const income = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    const d1 = new Date("2023-01-01");
    const d2 = new Date("2023-06-01");

    ledger.entry(d1, "Sale 1").debit(cash, 100).credit(income, 100).post();
    ledger.entry(d2, "Sale 2").debit(cash, 300).credit(income, 300).post();

    const analyzer = new GaapAnalyzer(ledger);

    assertEqual(
      analyzer.getAccountBalanceAsOf(cash, d1),
      100,
      "Balance after first sale"
    );
    assertEqual(
      analyzer.getAccountBalanceAsOf(cash, d2),
      400,
      "Balance after both sales"
    );
  },
  testTracker
);

// ======================================================================
// 4 — getAccountChange calculates period deltas
// ======================================================================
runTest(
  "getAccountChange computes net activity in a date range",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const income = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    ledger
      .entry(new Date("2023-01-01"), "A")
      .debit(cash, 100)
      .credit(income, 100)
      .post();
    ledger
      .entry(new Date("2023-06-01"), "B")
      .debit(cash, 200)
      .credit(income, 200)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const delta = analyzer.getAccountChange(
      cash,
      new Date("2023-02-01"),
      new Date("2023-12-31")
    );

    assertEqual(delta, 200, "Only second posting should count");
  },
  testTracker
);

// ======================================================================
// 5 — Balance Sheet structure and totals
// ======================================================================
runTest(
  "getBalanceSheet returns structured balance sheet with correct totals",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const ap = ledger.createNonCashAccount("AP", GaapAccountType.Liability);
    const eq = ledger.createNonCashAccount("Equity", GaapAccountType.Equity);

    ledger
      .entry(new Date("2023-01-01"), "Owner investment")
      .debit(cash, 500)
      .credit(eq, 500)
      .post();

    ledger
      .entry(new Date("2023-01-02"), "Borrowing")
      .debit(cash, 300)
      .credit(ap, 300)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const bs = analyzer.getBalanceSheet(new Date("2023-12-31"));

    assert(bs.assets.length === 1, "One asset");
    assert(bs.liabilities.length === 1, "One liability");
    assert(bs.equity.length === 1, "One equity account");

    assertEqual(bs.totals.assets, 800, "Total assets = 800");
    assertEqual(bs.totals.liabilities, 300, "AP = 300");
    assertEqual(bs.totals.equity, 500, "Equity = 500");
    assertEqual(bs.totals.balanceCheck, 0, "Balance sheet must balance");
  },
  testTracker
);

// ======================================================================
// 6 — Income Statement
// ======================================================================
runTest(
  "getIncomeStatement computes income, expenses, and net income",
  () => {
    const ledger = new GaapLedger();

    const revenue = ledger.createNonCashAccount(
      "Sales",
      GaapAccountType.Income
    );
    const expense = ledger.createNonCashAccount(
      "Rent",
      GaapAccountType.Expense
    );
    const cash = ledger.createCashAccount("Cash");

    ledger
      .entry(new Date("2023-04-01"), "Sale")
      .debit(cash, 1000)
      .credit(revenue, 1000)
      .post();

    ledger
      .entry(new Date("2023-04-10"), "Rent payment")
      .credit(cash, 200)
      .debit(expense, 200)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const is = analyzer.getIncomeStatement(
      new Date("2023-01-01"),
      new Date("2023-12-31")
    );

    assertEqual(is.totals.income, 1000, "Total income correct");
    assertEqual(is.totals.expenses, 200, "Total expenses correct");
    assertEqual(is.totals.netIncome, 800, "Net income = 800");
  },
  testTracker
);

// ======================================================================
// 7 — Cash Flow Statement
// ======================================================================
runTest(
  "getCashFlowStatement delegates to ledger and returns structured object",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    ledger
      .entry(new Date("2023-01-01"), "Owner contribution")
      .debit(cash, 1000)
      .credit(equity, 1000)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const cfs = analyzer.getCashFlowStatement(
      new Date("2023-01-01"),
      new Date("2023-12-31")
    );

    assert(typeof cfs === "object", "Should return an object");
    assert("operating" in cfs, "Should contain operating");
    assert("financing" in cfs, "Should contain financing");
    assertEqual(cfs.netCashChange, 1000, "Cash increased by 1000");
  },
  testTracker
);

// ======================================================================
// 8 — Trial Balance correctness
// ======================================================================
runTest(
  "getTrialBalance returns all accounts with correct balances",
  () => {
    const ledger = new GaapLedger();

    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount("Rev", GaapAccountType.Income);

    ledger
      .entry(new Date(), "Sale")
      .debit(cash, 300)
      .credit(revenue, 300)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const tb = analyzer.getTrialBalance(new Date());

    assertEqual(tb.length, 2, "Should return two accounts");

    const cashLine = tb.find((l) => l.account === cash);
    const revLine = tb.find((l) => l.account === revenue);

    if (!cashLine || !revLine) {
      throw new Error("Missing account lines in trial balance");
    }

    assertEqual(cashLine.balance, 300, "Cash balance correct");
    assertEqual(revLine.balance, 300, "Revenue credit-normal balance correct");
  },
  testTracker
);

// ======================================================================
// 9 — Journal Summary generation
// ======================================================================
runTest(
  "getJournalSummary returns structured summaries of JEs",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    ledger
      .entry(new Date("2023-02-01"), "Investment")
      .debit(cash, 500)
      .credit(equity, 500)
      .post();

    const analyzer = new GaapAnalyzer(ledger);
    const list = analyzer.getJournalSummary();

    assertEqual(list.length, 1, "One journal entry");
    assertEqual(list[0].description, "Investment", "Description correct");
    assertEqual(list[0].postings.length, 2, "Two postings");
  },
  testTracker
);

// ======================================================================
// 10 — Journal summary date filtering
// ======================================================================
runTest(
  "getJournalSummaryBetween filters by date correctly",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    ledger
      .entry(new Date("2023-01-01"), "Old")
      .debit(cash, 100)
      .credit(equity, 100)
      .post();

    ledger
      .entry(new Date("2023-07-01"), "New")
      .debit(cash, 200)
      .credit(equity, 200)
      .post();

    const analyzer = new GaapAnalyzer(ledger);

    const filtered = analyzer.getJournalSummaryBetween(
      new Date("2023-05-01"),
      new Date("2023-12-31")
    );

    assertEqual(filtered.length, 1, "Only one entry in range");
    assertEqual(filtered[0].description, "New", "Should return new entry");
  },
  testTracker
);

// ======================================================================
// 11 — Cross-validation vs ledger values
// ======================================================================
runTest(
  "Analyzer account balances match ledger.getBalance",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const income = ledger.createNonCashAccount(
      "Income",
      GaapAccountType.Income
    );

    ledger
      .entry(new Date(), "Sale")
      .debit(cash, 250)
      .credit(income, 250)
      .post();

    const analyzer = new GaapAnalyzer(ledger);

    assertEqual(
      analyzer.getAccountBalanceAsOf(cash, new Date()),
      cash.getBalance(ledger),
      "Analyzer and ledger should agree on balance"
    );
  },
  testTracker
);

testTracker.generateTestReport();
