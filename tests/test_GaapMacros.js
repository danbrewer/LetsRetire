// @ts-check

const {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} = require("./baseTest.js");

const { GaapLedger, GaapAccountType, GaapPostingSide } = require("../cGaap.js");

const testTracker = new TestTracker("GaapMacros Tests");

// -------------------------------------------------------------
// TEST 1 — Sale Macro
// -------------------------------------------------------------
runTest(
  "GaapMacros.sale records Cash ↑ and Revenue ↑ as balanced entry",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    ledger.do.sale({
      amount: 300,
      cashOrReceivable: cash,
      revenue: revenue,
      date: new Date("2024-01-01"),
      desc: "Sale Test",
    });

    assertEqual(ledger.journalEntries.length, 1, "One journal entry expected");

    const je = ledger.journalEntries[0];

    assertEqual(je.postings.length, 2, "Sale should produce 2 postings");

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit, "A Debit should exist");
    assert(credit, "A Credit should exist");

    assertEqual(debit.account.id, cash.id, "Debit should be to Cash");
    assertEqual(credit.account.id, revenue.id, "Credit should be to Revenue");
    assertEqual(debit.amount, 300, "Debit amount mismatch");
    assertEqual(credit.amount, 300, "Credit amount mismatch");

    assertEqual(cash.getBalance(ledger), 300, "Cash balance incorrect");
    assertEqual(revenue.getBalance(ledger), 300, "Revenue balance incorrect");
  },
  testTracker
);

// -------------------------------------------------------------
// TEST 2 — Expense Payment Macro
// -------------------------------------------------------------
runTest(
  "GaapMacros.expensePayment reduces Cash and increases Expense",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const utilities = ledger.createNonCashAccount(
      "Utilities",
      GaapAccountType.Expense
    );

    ledger.do.expensePayment({
      cash,
      expense: utilities,
      amount: 120,
      date: new Date("2024-01-02"),
      desc: "Utilities Payment",
    });

    const je = ledger.journalEntries[0];

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit, "A Debit should exist");
    assert(credit, "A Credit should exist");

    assertEqual(debit.account.id, utilities.id, "Expense should be debited");
    assertEqual(credit.account.id, cash.id, "Cash should be credited");
    assertEqual(debit.amount, 120, "Debit amount incorrect");
    assertEqual(credit.amount, 120, "Credit amount incorrect");

    assertEqual(
      utilities.getBalance(ledger),
      120,
      "Utilities balance incorrect"
    );
    assertEqual(cash.getBalance(ledger), -120, "Cash balance incorrect");
  },
  testTracker
);

// -------------------------------------------------------------
// TEST 3 — Transfer Macro
// -------------------------------------------------------------
runTest(
  "GaapMacros.transfer moves money between asset accounts",
  () => {
    const ledger = new GaapLedger();
    const checking = ledger.createCashAccount("Checking");
    const savings = ledger.createCashAccount("Savings");

    ledger.do.transfer({
      from: checking,
      to: savings,
      amount: 500,
      date: new Date("2024-01-03"),
    });

    const je = ledger.journalEntries[0];

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit); // to account
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit); // from account

    assert(debit, "A Debit should exist");
    assert(credit, "A Credit should exist");

    assertEqual(
      debit.account.id,
      savings.id,
      "Savings should be debited (increase)"
    );
    assertEqual(
      credit.account.id,
      checking.id,
      "Checking should be credited (decrease)"
    );
    assertEqual(debit.amount, 500, "Debit amount incorrect");
    assertEqual(credit.amount, 500, "Credit amount incorrect");

    assertEqual(savings.getBalance(ledger), 500, "Savings balance incorrect");
    assertEqual(
      checking.getBalance(ledger),
      -500,
      "Checking balance incorrect"
    );
  },
  testTracker
);

// -------------------------------------------------------------
// TEST 4 — Loan Disbursement Macro
// -------------------------------------------------------------
runTest(
  "GaapMacros.loanDisbursement increases Cash and increases a Loan Liability",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const loan = ledger.createNonCashAccount("Loan", GaapAccountType.Liability);

    ledger.do.loanDisbursement({
      cash,
      loanLiability: loan,
      amount: 10000,
      date: new Date("2024-01-04"),
    });

    const je = ledger.journalEntries[0];

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit, "A Debit should exist");
    assert(credit, "A Credit should exist");

    assertEqual(debit.account.id, cash.id, "Cash should be debited");
    assertEqual(credit.account.id, loan.id, "Loan should be credited");
    assertEqual(debit.amount, 10000, "Debit amount incorrect");
    assertEqual(credit.amount, 10000, "Credit amount incorrect");

    assertEqual(cash.getBalance(ledger), 10000, "Cash balance incorrect");
    assertEqual(loan.getBalance(ledger), 10000, "Loan balance incorrect");
  },
  testTracker
);

// -------------------------------------------------------------
// TEST 5 — Loan Payment Macro (Principal + Interest)
// -------------------------------------------------------------
runTest(
  "GaapMacros.loanPayment reduces Loan, increases Interest Expense, and reduces Cash",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const loan = ledger.createNonCashAccount("Loan", GaapAccountType.Liability);
    const interest = ledger.createNonCashAccount(
      "Interest Expense",
      GaapAccountType.Expense
    );

    ledger.do.loanPayment({
      cash,
      loanLiability: loan,
      interestExpense: interest,
      principal: 900,
      interest: 100,
      date: new Date("2024-01-05"),
    });

    const je = ledger.journalEntries[0];

    assertEqual(je.postings.length, 3, "Loan payment should have 3 postings");

    const cashCredit = je.postings.find((p) => p.account.id === cash.id);
    const loanDebit = je.postings.find((p) => p.account.id === loan.id);
    const interestDebit = je.postings.find((p) => p.account.id === interest.id);

    assert(cashCredit, "A Cash Credit should exist");
    assert(loanDebit, "A Loan Debit should exist");
    assert(interestDebit, "An Interest Debit should exist");

    assertEqual(
      cashCredit.side,
      GaapPostingSide.Credit,
      "Cash should be credited"
    );
    assertEqual(cashCredit.amount, 1000, "Total cash outflow mismatch");

    assertEqual(
      loanDebit.side,
      GaapPostingSide.Debit,
      "Loan should be debited (reduction)"
    );
    assertEqual(loanDebit.amount, 900, "Principal amount mismatch");

    assertEqual(
      interestDebit.side,
      GaapPostingSide.Debit,
      "Interest expense should be debited"
    );

    assertEqual(interestDebit.amount, 100, "Interest amount mismatch");
    assertEqual(cash.getBalance(ledger), -1000, "Cash balance incorrect");
    assertEqual(loan.getBalance(ledger), -900, "Loan balance incorrect"); // liability reduced
    assertEqual(interest.getBalance(ledger), 100, "Interest balance incorrect");
  },
  testTracker
);

testTracker.generateTestReport();
