console.log("==========================================");
console.log("Testing GAAP Ledger System");
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
//   GaapPostingBuilder,
//   GaapJournalEntry,
//   GaapLedger,
// } = require("../cGaap.js");

const testTracker = new TestTracker("GaapLedger Tests");

//------------------------------------------------------------
// TEST 1 — Ledger initializes empty
//------------------------------------------------------------
runTest(
  "Ledger initializes with no accounts and no journal entries",
  () => {
    const ledger = new GaapLedger();
    assertEqual(
      ledger.accounts.length,
      0,
      "Ledger should start with zero accounts"
    );
    assertEqual(
      ledger.journalEntries.length,
      0,
      "Ledger should start with zero journal entries"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 2 — Ledger creates cash and non-cash accounts
//------------------------------------------------------------
runTest(
  "Ledger can create cash and non-cash accounts",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    assert(cash.isCashAccount, "Cash account must be marked as cash");
    assert(!revenue.isCashAccount, "Revenue should not be cash");
    assertEqual(
      ledger.accounts.length,
      2,
      "Ledger should contain two accounts"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 3 — Ledger.record creates and stores JournalEntry
//------------------------------------------------------------
runTest(
  "Ledger.record creates a JournalEntry and adds it to the ledger",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    const builder = new GaapPostingBuilder();
    builder.increase(cash, 300).increase(revenue, 300);
    const postings = builder.build();

    const je = ledger.record(new Date("2024-01-01"), "Sale", postings);

    assert(
      je instanceof GaapJournalEntry,
      "record() must return a JournalEntry"
    );
    assertEqual(
      ledger.journalEntries.length,
      1,
      "Ledger should now contain 1 journal entry"
    );
    assertEqual(
      je.postings.length,
      2,
      "JournalEntry should contain 2 postings"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 4 — Account.getBalance computes correctly
//------------------------------------------------------------
runTest(
  "GaapAccount.getBalance computes correct running totals",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const expense = ledger.createNonCashAccount(
      "Supplies Expense",
      GaapAccountType.Expense
    );

    // JE1: Pay expense 100
    ledger
      .entry(new Date("2024-01-01"), "Supplies")
      .credit(cash, 100)
      .debit(expense, 100)
      .post();

    // Cash decreases by 100 (credit-normal = decrease)
    assertEqual(cash.getBalance(ledger), -100, "Cash should be -100");
    assertEqual(expense.getBalance(ledger), 100, "Expense should be +100");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 5 — Account.getBalanceAsOf filters by date
//------------------------------------------------------------
runTest(
  "GaapAccount.getBalanceAsOf respects the date cutoff",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const eq = ledger.createNonCashAccount("Equity", GaapAccountType.Equity);

    // JE1: 2024-01-01 increase cash
    ledger
      .entry(new Date("2024-01-01"), "Owner contribution")
      .debit(cash, 500)
      .credit(eq, 500)
      .post();

    // JE2: 2024-02-01 withdraw 200
    ledger
      .entry(new Date("2024-02-01"), "Partial withdrawal")
      .credit(cash, 200)
      .debit(eq, 200)
      .post();

    const asOfJan = cash.getBalanceAsOf(ledger, new Date("2024-01-15"));
    const asOfFeb = cash.getBalanceAsOf(ledger, new Date("2024-02-15"));

    assertEqual(asOfJan, 500, "Cash as of Jan 15 should be +500");
    assertEqual(asOfFeb, 300, "Cash as of Feb 15 should be 500 - 200 = 300");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 6 — Balance Sheet correctness
//------------------------------------------------------------
runTest(
  "getBalanceSheet computes Assets, Liabilities, and Equity correctly",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const loan = ledger.createNonCashAccount(
      "Loan Payable",
      GaapAccountType.Liability
    );
    const eq = ledger.createNonCashAccount(
      "Owner Equity",
      GaapAccountType.Equity
    );

    // JE: Borrow 1000 → Cash +1000, Loan +1000
    ledger
      .entry(new Date("2024-01-01"), "Borrowing")
      .debit(cash, 1000)
      .credit(loan, 1000)
      .post();

    const bs = ledger.getBalanceSheet(new Date("2024-12-31"));

    assertEqual(bs.assets, 1000, "Assets should be 1000");
    assertEqual(bs.liabilities, 1000, "Liabilities should be 1000");
    assertEqual(bs.equity, 0, "Equity should be 0");
    assertEqual(bs.balanceCheck, 0, "Balance sheet must balance to zero");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 7 — Income Statement correctness
//------------------------------------------------------------
runTest(
  "getIncomeStatement computes income, expenses, and net income",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    const expense = ledger.createNonCashAccount(
      "Office Expense",
      GaapAccountType.Expense
    );

    // Revenue 500
    ledger
      .entry(new Date("2024-01-10"), "Service Sale")
      .debit(cash, 500)
      .credit(revenue, 500)
      .post();

    // Expense 200
    ledger
      .entry(new Date("2024-01-11"), "Office Supplies")
      .credit(cash, 200)
      .debit(expense, 200)
      .post();

    const is = ledger.getIncomeStatement(
      new Date("2024-01-01"),
      new Date("2024-01-31")
    );

    assertEqual(is.income, 500, "Income should be 500");
    assertEqual(is.expenses, 200, "Expenses should be 200");
    assertEqual(is.netIncome, 300, "Net Income should be 300");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 8 — Cash Flow Statement basic correctness
//------------------------------------------------------------
runTest(
  "getCashFlowStatement computes net cash change correctly",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    // +400 cash
    ledger
      .entry(new Date("2024-03-01"), "Consulting")
      .debit(cash, 400)
      .credit(revenue, 400)
      .post();

    const cf = ledger.getCashFlowStatement(
      new Date("2024-03-01"),
      new Date("2024-03-31")
    );

    assertEqual(cf.netCashChange, 400, "Net cash change should be +400");
    assert(cf.operating !== undefined, "Operating must be defined");
    assert(cf.investing !== undefined, "Investing must be defined");
    assert(cf.financing !== undefined, "Financing must be defined");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 9 — Trial Balance sums are correct
//------------------------------------------------------------
runTest(
  "getTrialBalance returns correct balances per account",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    // JE: Cash +100, Revenue +100
    ledger
      .entry(new Date("2024-01-01"), "Income")
      .debit(cash, 100)
      .credit(revenue, 100)
      .post();

    const trial = ledger.getTrialBalance(new Date("2024-12-31"));

    const cashTB = trial.find((t) => t.id === cash.id);
    const revTB = trial.find((t) => t.id === revenue.id);

    assertEqual(cashTB?.balance ?? 0, 100, "Cash TB should be +100");
    assertEqual(revTB?.balance ?? 0, 100, "Revenue TB should be +100");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 10 — Date filtering ignores future entries
//------------------------------------------------------------
runTest(
  "Balance methods ignore future-dated entries",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");

    // +100 cash today
    ledger
      .entry(new Date("2024-01-01"), "Deposit")
      .debit(cash, 100)
      .credit(
        ledger.createNonCashAccount("Equity", GaapAccountType.Equity),
        100
      )
      .post();

    // +999 future entry ignored
    ledger
      .entry(new Date("2099-01-01"), "Future")
      .debit(cash, 999)
      .credit(
        ledger.createNonCashAccount("Equity2", GaapAccountType.Equity),
        999
      )
      .post();

    assertEqual(
      cash.getBalanceAsOf(ledger, new Date("2024-12-31")),
      100,
      "Future entries must not affect AsOf balance"
    );
  },
  testTracker
);

testTracker.generateTestReport();
