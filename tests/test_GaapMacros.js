// @ts-check

const {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} = require("./baseTest.js");

const {
  GaapJournalEntry,
  GaapAccount,
  GaapLedger,
  GaapAccountType,
  GaapPostingSide,
} = require("../cGaap.js");

const testTracker = new TestTracker("GaapMacros COMPLETE Test Suite");

// Utility: simple balance checker
/**
 * @param {GaapAccount} account
 * @param {GaapLedger} ledger
 * @param {number} expected
 * @param {string | undefined} [msg]
 */
function assertBalance(account, ledger, expected, msg) {
  assertEqual(account.getBalance(ledger), expected, msg);
}

// Utility: verify debit + credit totals match in a JE
/**
 * @param {GaapJournalEntry} je
 */
function assertBalanced(je, message = "Journal entry must balance") {
  const debits = je.postings
    .filter((p) => p.side === GaapPostingSide.Debit)
    .reduce((s, p) => s + p.amount, 0);
  const credits = je.postings
    .filter((p) => p.side === GaapPostingSide.Credit)
    .reduce((s, p) => s + p.amount, 0);
  assertEqual(debits, credits, message);
}

// =============================================================
// SALE
// =============================================================
runTest(
  "sale: asset increases & revenue increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    ledger.do.sale({
      drAsset: cash,
      crRevenue: revenue,
      amount: 250,
    });

    const je = ledger.journalEntries[0];
    assertEqual(je.postings.length, 2, "Sale should create two postings");

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit && credit, "Both debit and credit postings must exist");

    assertEqual(debit.account.id, cash.id, "Debit should be to Cash account");
    assertEqual(debit.amount, 250, "Debit amount should be 250");

    assertEqual(
      credit.account.id,
      revenue.id,
      "Credit should be to Revenue account"
    );
    assertEqual(credit.amount, 250, "Credit amount should be 250");

    assertBalance(cash, ledger, 250, "Cash should increase");
    assertBalance(revenue, ledger, 250, "Revenue should increase");
    assertBalanced(je);
  },
  testTracker
);

// =============================================================
// EXPENSE PAYMENT
// =============================================================
runTest(
  "expensePayment: expense increases & cash decreases",
  () => {
    const ledger = new GaapLedger();
    const expense = ledger.createNonCashAccount(
      "Utilities",
      GaapAccountType.Expense
    );
    const cash = ledger.createCashAccount("Cash");

    ledger.do.expensePayment({
      drExpense: expense,
      drCash: cash,
      amount: 120,
    });

    const je = ledger.journalEntries[0];
    assertEqual(
      je.postings.length,
      2,
      "Expense payment should create two postings"
    );

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit && credit, "Both debit and credit postings must exist");

    assertEqual(
      debit.account.id,
      expense.id,
      "Debit should be to Expense account"
    );
    assertEqual(credit.account.id, cash.id, "Credit should be to Cash account");

    assertBalance(expense, ledger, 120, "Expense should increase");
    assertBalance(cash, ledger, -120, "Cash should decrease");
    assertBalanced(je);
  },
  testTracker
);

// =============================================================
// TRANSFER
// =============================================================
runTest(
  "transfer: asset -> asset correctly moves value",
  () => {
    const ledger = new GaapLedger();
    const checking = ledger.createCashAccount("Checking");
    const savings = ledger.createCashAccount("Savings");

    ledger.do.transfer({
      drAssetDestination: savings,
      drAssetSource: checking,
      amount: 500,
    });

    const je = ledger.journalEntries[0];
    assertEqual(je.postings.length, 2, "Transfer should create two postings");

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit && credit, "Both debit and credit postings must exist");

    assertEqual(
      debit.account.id,
      savings.id,
      "Debit should be to Savings account"
    );
    assertEqual(
      credit.account.id,
      checking.id,
      "Credit should be to Checking account"
    );

    assertBalance(savings, ledger, 500);
    assertBalance(checking, ledger, -500);

    assertBalanced(je);
  },
  testTracker
);

// =============================================================
// LOAN DISBURSEMENT
// =============================================================
runTest(
  "loanDisbursement: cash increases, liability increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const loan = ledger.createNonCashAccount("Loan", GaapAccountType.Liability);

    ledger.do.loanDisbursement({
      drCash: cash,
      crLiability: loan,
      amount: 10000,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    const debit = je.postings.find((p) => p.side === GaapPostingSide.Debit);
    const credit = je.postings.find((p) => p.side === GaapPostingSide.Credit);

    assert(debit && credit, "Both debit and credit postings must exist");

    assertEqual(debit.account.id, cash.id, "Debit should be to Cash account");
    assertEqual(credit.account.id, loan.id, "Credit should be to Loan account");

    assertBalance(cash, ledger, 10000);
    assertBalance(loan, ledger, 10000);
  },
  testTracker
);

// =============================================================
// LOAN PAYMENT
// =============================================================
runTest(
  "loanPayment: cash decreases, principal decreases, interest expense increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const loan = ledger.createNonCashAccount("Loan", GaapAccountType.Liability);
    const interest = ledger.createNonCashAccount(
      "Interest Expense",
      GaapAccountType.Expense
    );

    ledger.do.loanPayment({
      drCash: cash,
      crLoanLiability: loan,
      drInterestExpense: interest,
      principal: 900,
      interest: 100,
    });

    const je = ledger.journalEntries[0];
    assertEqual(
      je.postings.length,
      3,
      "Loan payment should create three postings"
    );

    const cashCredit = je.postings.find(
      (p) => p.account.id === cash.id && p.side === GaapPostingSide.Credit
    );
    const loanDebit = je.postings.find(
      (p) => p.account.id === loan.id && p.side === GaapPostingSide.Debit
    );
    const intDebit = je.postings.find(
      (p) => p.account.id === interest.id && p.side === GaapPostingSide.Debit
    );

    assert(
      cashCredit && loanDebit && intDebit,
      "All three postings must exist"
    );

    assertEqual(cashCredit.amount, 1000, "Cash credit amount should be 1000");
    assertEqual(loanDebit.amount, 900, "Loan debit amount should be 900");
    assertEqual(intDebit.amount, 100, "Interest debit amount should be 100");
    assertBalance(cash, ledger, -1000);
    assertBalance(loan, ledger, -900);
    assertBalance(interest, ledger, 100);

    assertBalanced(je);
  },
  testTracker
);

// =============================================================
// PAYROLL
// =============================================================
runTest(
  "payroll: income increases, cash increases by net, withholdings increase",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const federalWithholdings = ledger.createNonCashAccount(
      "Federal withholdings",
      GaapAccountType.Expense
    );
    const trad401k = ledger.createNonCashAccount(
      "Retirement Contributions",
      GaapAccountType.Expense
    );
    const income = ledger.createNonCashAccount(
      "Income",
      GaapAccountType.Income
    );
    ledger.do.payroll({
      drCash: cash,
      drFederalWithholdings: federalWithholdings,
      drTrad401k: trad401k,
      crIncomeGross: income,
      grossPay: 2000,
      taxesAndBenefits: 300,
      retirementContribution: 100
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    const netPay = 2000 - (300 + 100);

    assertBalance(cash, ledger, netPay);
    assertBalance(income, ledger, 2000);
    assertBalance(trad401k, ledger, 100);
    assertBalance(federalWithholdings, ledger, 300);
  },
  testTracker
);

// =============================================================
// TRADITIONAL 401k CONTRIBUTION
// =============================================================
runTest(
  "retirementContributionTraditional: cash decreases, 401k increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const k = ledger.createNonCashAccount("401k", GaapAccountType.Asset);

    ledger.do.retirementContributionTraditional({
      dr401k: k,
      drCash: cash,
      amount: 400,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(k, ledger, 400);
    assertBalance(cash, ledger, -400);
  },
  testTracker
);

// =============================================================
// ROTH CONTRIBUTION
// =============================================================
runTest(
  "retirementContributionRoth: cash decreases, Roth increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const roth = ledger.createNonCashAccount("Roth", GaapAccountType.Asset);

    ledger.do.retirementContributionRoth({
      drRoth: roth,
      drCash: cash,
      amount: 500,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(roth, ledger, 500);
    assertBalance(cash, ledger, -500);
  },
  testTracker
);

// =============================================================
// TRAD 401k WITHDRAWAL
// =============================================================
runTest(
  "withdrawFromTraditional401k: 401k decreases, cash increases, income increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const trad401k = ledger.createNonCashAccount("401k", GaapAccountType.Asset);
    const income = ledger.createNonCashAccount(
      "Income",
      GaapAccountType.Income
    );
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    ledger.do.withdrawFromTraditional401k({
      drCash: cash,
      dr401k: trad401k,
      crIncome: income,
      crEquity: equity,
      amount: 1000,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(trad401k, ledger, -1000);
    assertBalance(cash, ledger, 1000);
    assertBalance(income, ledger, 1000);
  },
  testTracker
);

// =============================================================
// RMD WITHDRAWAL WRAPPER
// =============================================================
runTest(
  "rmdWithdrawal: wrapper calls trad401k withdrawal with different description",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const trad401k = ledger.createNonCashAccount("401k", GaapAccountType.Asset);
    const income = ledger.createNonCashAccount(
      "Income",
      GaapAccountType.Income
    );
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    ledger.do.rmdWithdrawal({
      drCash: cash,
      dr401k: trad401k,
      crIncome: income,
      crEquity: equity,
      amount: 700,
    });

    const je = ledger.journalEntries[0];

    assertEqual(
      je.description,
      "RMD Withdrawal",
      "Description should be 'RMD Withdrawal'"
    );
    assertBalanced(je);

    assertBalance(cash, ledger, 700);
    assertBalance(trad401k, ledger, -700);
    assertBalance(income, ledger, 700);
  },
  testTracker
);

// =============================================================
// ROTH WITHDRAWAL
// =============================================================
runTest(
  "withdrawFromTraditionalRoth: Roth decreases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const roth = ledger.createNonCashAccount("Roth", GaapAccountType.Asset);

    ledger.do.withdrawFromTraditionalRoth({
      drCash: cash,
      drRoth: roth,
      amount: 300,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 300);
    assertBalance(roth, ledger, -300);
  },
  testTracker
);

// =============================================================
// PENSION INCOME
// =============================================================
runTest(
  "pensionPayment: pension income increases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const pension = ledger.createNonCashAccount(
      "PensionIncome",
      GaapAccountType.Income
    );

    ledger.do.pensionPayment({
      drCash: cash,
      crPensionIncome: pension,
      amount: 900,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 900);
    assertBalance(pension, ledger, 900);
  },
  testTracker
);

// =============================================================
// SOCIAL SECURITY INCOME
// =============================================================
runTest(
  "socialSecurityIncome: ss income increases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const ss = ledger.createNonCashAccount("SS Income", GaapAccountType.Income);

    ledger.do.socialSecurityIncome({
      drCash: cash,
      crSSIncome: ss,
      amount: 1400,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 1400);
    assertBalance(ss, ledger, 1400);
  },
  testTracker
);

// =============================================================
// INVESTMENT PURCHASE
// =============================================================
runTest(
  "investmentBuy: cash decreases, investment increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const inv = ledger.createNonCashAccount(
      "Investments",
      GaapAccountType.Asset
    );

    ledger.do.investmentBuy({
      drInvestment: inv,
      drCash: cash,
      amount: 600,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(inv, ledger, 600);
    assertBalance(cash, ledger, -600);
  },
  testTracker
);

// =============================================================
// INVESTMENT SALE
// =============================================================
runTest(
  "investmentSell: investment decreases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const inv = ledger.createNonCashAccount(
      "Investments",
      GaapAccountType.Asset
    );

    ledger.do.investmentSell({
      drCash: cash,
      drInvestment: inv,
      amount: 800,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 800);
    assertBalance(inv, ledger, -800);
  },
  testTracker
);

// =============================================================
// CAPITAL GAIN — GAIN > 0
// =============================================================
runTest("realizeCapitalGain: positive gain", () => {
  const ledger = new GaapLedger();
  const cash = ledger.createCashAccount("Cash");
  const inv = ledger.createNonCashAccount("Inv", GaapAccountType.Asset);
  const gain = ledger.createNonCashAccount("Gain", GaapAccountType.Income);
  const loss = ledger.createNonCashAccount("Loss", GaapAccountType.Expense);

  ledger.do.realizeCapitalGain({
    drCash: cash,
    drInvestment: inv,
    crGain: gain,
    drLoss: loss,
    proceeds: 900,
    basis: 700,
  });

  const je = ledger.journalEntries[0];
  assertBalanced(je);
  assertBalance(cash, ledger, 900);
  assertBalance(inv, ledger, -700);
  assertBalance(gain, ledger, 200);
  assertBalance(loss, ledger, 0);
}, testTracker);


// =============================================================
// CAPITAL GAIN — ZERO GAIN
// =============================================================
runTest("realizeCapitalGain: break-even → no gain, no loss", () => {
  const ledger = new GaapLedger();
  const cash = ledger.createCashAccount("Cash");
  const inv = ledger.createNonCashAccount("Inv", GaapAccountType.Asset);
  const gain = ledger.createNonCashAccount("Gain", GaapAccountType.Income);
  const loss = ledger.createNonCashAccount("Loss", GaapAccountType.Expense);

  ledger.do.realizeCapitalGain({
    drCash: cash,
    drInvestment: inv,
    crGain: gain,
    drLoss: loss,
    proceeds: 800,
    basis: 800,
  });

  const je = ledger.journalEntries[0];
  assertBalanced(je);
  assertBalance(cash, ledger, 800);
  assertBalance(inv, ledger, -800);
  assertBalance(gain, ledger, 0);
  assertBalance(loss, ledger, 0);
}, testTracker);


// =============================================================
// CAPITAL GAIN — NEGATIVE GAIN (LOSS)
// =============================================================
runTest("realizeCapitalGain: loss → loss posting", () => {
  const ledger = new GaapLedger();
  const cash = ledger.createCashAccount("Cash");
  const inv = ledger.createNonCashAccount("Inv", GaapAccountType.Asset);
  const gain = ledger.createNonCashAccount("Gain", GaapAccountType.Income);
  const loss = ledger.createNonCashAccount("Loss", GaapAccountType.Expense);

  ledger.do.realizeCapitalGain({
    drCash: cash,
    drInvestment: inv,
    crGain: gain,
    drLoss: loss,
    proceeds: 700,
    basis: 900, // LOSS of 200
  });

  const je = ledger.journalEntries[0];
  assertBalanced(je);

  assertBalance(cash, ledger, 700);
  assertBalance(inv, ledger, -900);
  assertBalance(gain, ledger, 0);
  assertBalance(loss, ledger, 200);
}, testTracker);


// =============================================================
// INTEREST INCOME
// =============================================================
runTest(
  "interestIncome: interest income increases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const inv = ledger.createNonCashAccount(
      "InterestIncome",
      GaapAccountType.Income
    );

    ledger.do.interestIncome({
      drCash: cash,
      crInterestIncome: inv,
      amount: 85,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 85);
    assertBalance(inv, ledger, 85);
  },
  testTracker
);

// =============================================================
// DIVIDEND INCOME
// =============================================================
runTest(
  "dividendIncome: dividend income increases, cash increases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const div = ledger.createNonCashAccount(
      "Div Income",
      GaapAccountType.Income
    );

    ledger.do.dividendIncome({
      drCash: cash,
      crDividendIncome: div,
      amount: 42,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, 42);
    assertBalance(div, ledger, 42);
  },
  testTracker
);

// =============================================================
// TAX PAYMENT
// =============================================================
runTest(
  "taxPayment: tax liability decreases, cash decreases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const tax = ledger.createNonCashAccount(
      "Tax Liability",
      GaapAccountType.Liability
    );

    ledger.do.taxPayment({
      drCash: cash,
      crTaxLiability: tax,
      amount: 600,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, -600);
    assertBalance(tax, ledger, -600);
  },
  testTracker
);

// =============================================================
// ESTIMATED TAX PAYMENT (EXPENSE)
// =============================================================
runTest(
  "estimatedTaxPayment: tax expense increases, cash decreases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const taxExp = ledger.createNonCashAccount(
      "Tax Expense",
      GaapAccountType.Expense
    );

    ledger.do.estimatedTaxPayment({
      drTaxExpense: taxExp,
      drCash: cash,
      amount: 350,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, -350);
    assertBalance(taxExp, ledger, 350);
  },
  testTracker
);

// =============================================================
// ESCROW DEPOSIT
// =============================================================
runTest(
  "escrowDeposit: escrow increases, cash decreases",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const esc = ledger.createNonCashAccount("Escrow", GaapAccountType.Asset);

    ledger.do.escrowDeposit({
      drEscrow: esc,
      drCash: cash,
      amount: 1000,
    });

    const je = ledger.journalEntries[0];
    assertBalanced(je);

    assertBalance(cash, ledger, -1000);
    assertBalance(esc, ledger, 1000);
  },
  testTracker
);

// -------------------------------------------------------------
// FINAL TEST REPORT
// -------------------------------------------------------------
testTracker.generateTestReport();
