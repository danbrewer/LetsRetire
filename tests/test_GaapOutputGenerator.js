import { GaapLedger, GaapOutputGenerator, GaapAccountType } from "../cGaap.js";
import { runTest, TestTracker, assert, assertThrows } from "./baseTest.js";

console.log("=".repeat(70));
console.log("🧪 GAAP OUTPUT GENERATOR TESTS");
console.log("=".repeat(70));

const testTracker = new TestTracker("GaapOutputGenerator");

// ======================================================================
// 1 — GaapOutputGenerator constructor validation
// ======================================================================
runTest(
  "GaapOutputGenerator constructor requires valid ledger",
  () => {
    assertThrows(
      // @ts-ignore
      () => new GaapOutputGenerator(null),
      "Constructor should throw for null ledger"
    );
    assertThrows(
      // @ts-ignore
      () => new GaapOutputGenerator(undefined),
      "Constructor should throw for undefined ledger"
    );

    // Valid constructor should not throw
    const ledger = new GaapLedger();
    const generator = new GaapOutputGenerator(ledger);
    assert(generator, "Valid constructor should create instance");
  },
  testTracker
);

// ======================================================================
// 2 — printTAccount basic functionality
// ======================================================================
runTest(
  "printTAccount displays account name and T-Account structure",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const generator = new GaapOutputGenerator(ledger);

    const output = generator.printTAccount(cash);

    console.log(output);

    assert(typeof output === "string", "printTAccount should return string");
    assert(
      output.includes("Cash (T-Account)"),
      "Output should contain account name with T-Account label"
    );
    assert(
      output.includes("(no activity)"),
      "Empty account should show 'no activity' message"
    );
  },
  testTracker
);

// ======================================================================
// 3 — printTAccount with transactions shows formatted postings
// ======================================================================
runTest(
  "printTAccount displays formatted debit and credit postings with date|description|amount",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Owner Equity",
      GaapAccountType.Equity
    );

    const testDate = new Date("2023-06-15");

    // Create some transactions
    ledger
      .entry(testDate, "Initial investment")
      .debit(cash, 1000)
      .credit(equity, 1000)
      .post();

    ledger
      .entry(testDate, "Expense payment")
      .credit(cash, 200)
      .debit(
        ledger.createNonCashAccount("Expenses", GaapAccountType.Expense),
        200
      )
      .post();

    const generator = new GaapOutputGenerator(ledger);
    const output = generator.printTAccount(cash);

    console.log(output);

    // Check for formatted entries with date|description|amount format
    assert(
      output.includes("2023-06-15"),
      "Should show transaction date in ISO format"
    );
    assert(
      output.includes("Initial investment"),
      "Should show transaction description"
    );
    assert(
      output.includes("Expense payment"),
      "Should show second transaction description"
    );
    assert(output.includes("1000"), "Should show debit amount");
    assert(output.includes("200"), "Should show credit amount");

    // Check that amounts appear with the pipe-separated format
    assert(
      output.includes("| Initial investment | 1000"),
      "Should show debit entry in correct format"
    );
    assert(
      output.includes("| Expense payment | 200"),
      "Should show credit entry in correct format"
    );
  },
  testTracker
);

// ======================================================================
// 4 — printTAccount balance calculation and display
// ======================================================================
runTest(
  "printTAccount shows ending balance and organizes debits/credits correctly",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    const generator = new GaapOutputGenerator(ledger);

    const testDate = new Date("2023-06-15");

    // Asset account (debit normal) - should show positive balance
    ledger
      .entry(testDate, "Cash receipt")
      .debit(cash, 500)
      .credit(revenue, 500)
      .post();

    const cashOutput = generator.printTAccount(cash);

    console.log(cashOutput);

    // Check that ending balance is displayed
    assert(
      cashOutput.includes("Ending Balance: 500"),
      "Cash should show ending balance of 500"
    );

    // Check that debit appears in left column
    const lines = cashOutput.split("\n");
    const debitCreditLine = lines.find(
      (line) => line.includes("Debit") && line.includes("Credit")
    );
    assert(debitCreditLine, "Should have Debit | Credit header line");

    // Verify the cash receipt appears in the debit side (left column)
    const receiptLine = lines.find(
      (line) => line.includes("Cash receipt") && line.includes("500")
    );
    assert(receiptLine, "Should find the cash receipt line");

    // Income account (credit normal) - should show negative balance (credit balance)
    const revenueOutput = generator.printTAccount(revenue);
    assert(
      revenueOutput.includes("Ending Balance: 500"),
      "Revenue should show ending balance of 500 (credit normal)"
    );
  },
  testTracker
);

// ======================================================================
// 5 — printTAccount column formatting and organization
// ======================================================================
runTest(
  "printTAccount properly formats columns and separates debits from credits",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );
    const expense = ledger.createNonCashAccount(
      "Expense",
      GaapAccountType.Expense
    );

    const testDate = new Date("2023-06-15");
    const generator = new GaapOutputGenerator(ledger);

    // Create mixed debits and credits
    ledger
      .entry(testDate, "Initial deposit")
      .debit(cash, 1000)
      .credit(equity, 1000)
      .post();
    ledger
      .entry(testDate, "Cash withdrawal")
      .credit(cash, 200)
      .debit(expense, 200)
      .post();
    ledger
      .entry(testDate, "Another deposit")
      .debit(cash, 300)
      .credit(equity, 300)
      .post();

    const output = generator.printTAccount(cash);

    console.log(output);

    const lines = output.split("\n");

    // Find the column separator line (dashes)
    const separatorLine = lines.find(
      (line) => line.includes("---") || line.match(/^-+$/)
    );
    assert(separatorLine, "Should have separator line with dashes");

    // Check that we have the pipe separator in data lines
    const dataLines = lines.filter(
      (line) =>
        line.includes("|") &&
        (line.includes("Initial deposit") ||
          line.includes("Cash withdrawal") ||
          line.includes("Another deposit"))
    );

    assert(
      dataLines.length >= 2,
      "Should have at least 2 data lines with pipe separators"
    );

    // Verify ending balance is shown
    assert(output.includes("Ending Balance:"), "Should display ending balance");
  },
  testTracker
);

// ======================================================================
// 5 — printLedgerStatement basic functionality
// ======================================================================
runTest(
  "printLedgerStatement displays all accounts",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    // Add some activity
    ledger
      .entry(new Date(), "Test transaction")
      .debit(cash, 1000)
      .credit(equity, 600)
      .credit(revenue, 400)
      .post();

    const generator = new GaapOutputGenerator(ledger);
    const output = generator.printLedgerStatement();

    console.log(output);

    assert(
      typeof output === "string",
      "printLedgerStatement should return string"
    );
    assert(output.includes("Cash"), "Should include Cash account");
    assert(output.includes("Equity"), "Should include Equity account");
    assert(output.includes("Revenue"), "Should include Revenue account");
  },
  testTracker
);

// ======================================================================
// 6 — printLedgerStatement with date range filtering
// ======================================================================
runTest(
  "printLedgerStatement respects date range parameters",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    const generator = new GaapOutputGenerator(ledger);

    const date1 = new Date("2023-01-15");
    const date2 = new Date("2023-06-15");
    const date3 = new Date("2023-12-15");

    // Transaction before range
    ledger
      .entry(date1, "Before range")
      .debit(cash, 100)
      .credit(revenue, 100)
      .post();

    // Transaction in range
    ledger
      .entry(date2, "In range")
      .debit(cash, 200)
      .credit(revenue, 200)
      .post();

    // Transaction after range
    ledger
      .entry(date3, "After range")
      .debit(cash, 300)
      .credit(revenue, 300)
      .post();

    const rangeStart = new Date("2023-04-01");
    const rangeEnd = new Date("2023-08-01");
    const output = generator.printLedgerStatement(rangeStart, rangeEnd);
    console.log(output);

    assert(
      output.includes("In range"),
      "Should include transaction in date range"
    );
    assert(
      !output.includes("Before range"),
      "Should not include transaction before range"
    );
    assert(
      !output.includes("After range"),
      "Should not include transaction after range"
    );
  },
  testTracker
);

// ======================================================================
// 7 — printChartOfAccounts basic functionality
// ======================================================================
runTest(
  "printChartOfAccounts lists all accounts by type",
  () => {
    const ledger = new GaapLedger();

    // Create accounts of different types
    // @ts-ignore
    const cash = ledger.createCashAccount("Cash");
    // @ts-ignore
    const ar = ledger.createNonCashAccount(
      "Accounts Receivable",
      GaapAccountType.Asset
    );
    // @ts-ignore
    const ap = ledger.createNonCashAccount(
      "Accounts Payable",
      GaapAccountType.Liability
    );
    // @ts-ignore
    const equity = ledger.createNonCashAccount(
      "Owner Equity",
      GaapAccountType.Equity
    );
    // @ts-ignore
    const revenue = ledger.createNonCashAccount(
      "Sales Revenue",
      GaapAccountType.Income
    );
    // @ts-ignore
    const expense = ledger.createNonCashAccount(
      "Rent Expense",
      GaapAccountType.Expense
    );

    const generator = new GaapOutputGenerator(ledger);
    const output = generator.printChartOfAccounts();

    console.log(output);

    assert(
      typeof output === "string",
      "printChartOfAccounts should return string"
    );

    // Check for account type headers
    assert(
      output.includes("ASSET") || output.includes("Asset"),
      "Should include Assets section"
    );
    assert(
      output.includes("LIABILITY") || output.includes("Liability"),
      "Should include Liabilities section"
    );
    assert(
      output.includes("EQUITY") || output.includes("Equity"),
      "Should include Equity section"
    );
    assert(
      output.includes("INCOME") || output.includes("Income"),
      "Should include Income section"
    );
    assert(
      output.includes("EXPENSE") || output.includes("Expense"),
      "Should include Expenses section"
    );

    // Check for specific accounts
    assert(output.includes("Cash"), "Should list Cash account");
    assert(output.includes("Accounts Receivable"), "Should list AR account");
    assert(output.includes("Accounts Payable"), "Should list AP account");
    assert(output.includes("Owner Equity"), "Should list Equity account");
    assert(output.includes("Sales Revenue"), "Should list Revenue account");
    assert(output.includes("Rent Expense"), "Should list Expense account");
  },
  testTracker
);

// ======================================================================
// 8 — printChartOfAccounts organization and formatting
// ======================================================================
runTest(
  "printChartOfAccounts organizes accounts by type in logical order",
  () => {
    const ledger = new GaapLedger();

    // Create accounts in random order
    // @ts-ignore
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    // @ts-ignore
    const cash = ledger.createCashAccount("Cash");
    // @ts-ignore
    const liability = ledger.createNonCashAccount(
      "Debt",
      GaapAccountType.Liability
    );
    // @ts-ignore
    const expense = ledger.createNonCashAccount(
      "Expense",
      GaapAccountType.Expense
    );
    // @ts-ignore
    const equity = ledger.createNonCashAccount(
      "Equity",
      GaapAccountType.Equity
    );

    const generator = new GaapOutputGenerator(ledger);
    const output = generator.printChartOfAccounts();

    console.log(output);

    // Assets should come before Liabilities in standard chart of accounts
    const assetPos = output.search(/(ASSETS|Asset)/i);
    const liabilityPos = output.search(/(LIABILITIES|Liability)/i);
    const equityPos = output.search(/(EQUITY|Equity)/i);
    // @ts-ignore
    const incomePos = output.search(/(INCOME|Income)/i);
    // @ts-ignore
    const expensePos = output.search(/(EXPENSES|Expense)/i);

    // Standard order: Assets, Liabilities, Equity, Income, Expenses
    if (assetPos >= 0 && liabilityPos >= 0) {
      assert(
        assetPos < liabilityPos,
        "Assets should appear before Liabilities"
      );
    }
    if (liabilityPos >= 0 && equityPos >= 0) {
      assert(
        liabilityPos < equityPos,
        "Liabilities should appear before Equity"
      );
    }
  },
  testTracker
);

// ======================================================================
// 9 — Output formatting consistency
// ======================================================================
runTest(
  "All output methods return properly formatted strings",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Test Cash");
    const equity = ledger.createNonCashAccount(
      "Test Equity",
      GaapAccountType.Equity
    );

    ledger
      .entry(new Date(), "Test entry")
      .debit(cash, 100)
      .credit(equity, 100)
      .post();

    const generator = new GaapOutputGenerator(ledger);

    const tAccount = generator.printTAccount(cash);

    console.log("T-Account Output:");
    console.log(tAccount);

    const ledgerStatement = generator.printLedgerStatement();
    console.log("Ledger Statement Output:");
    console.log(ledgerStatement);

    const chartOfAccounts = generator.printChartOfAccounts();
    console.log("Chart of Accounts Output:");
    console.log(chartOfAccounts);

    // All outputs should be non-empty strings
    assert(
      tAccount && tAccount.trim().length > 0,
      "T-Account output should not be empty"
    );
    assert(
      ledgerStatement && ledgerStatement.trim().length > 0,
      "Ledger statement should not be empty"
    );
    assert(
      chartOfAccounts && chartOfAccounts.trim().length > 0,
      "Chart of accounts should not be empty"
    );

    // Outputs should contain reasonable formatting (line breaks, etc.)
    assert(tAccount.includes("\n"), "T-Account should have line breaks");
    assert(
      ledgerStatement.includes("\n"),
      "Ledger statement should have line breaks"
    );
    assert(
      chartOfAccounts.includes("\n"),
      "Chart of accounts should have line breaks"
    );
  },
  testTracker
);

// ======================================================================
// 10 — Error handling for invalid inputs
// ======================================================================
runTest(
  "Output methods handle invalid inputs gracefully",
  () => {
    const ledger = new GaapLedger();
    const generator = new GaapOutputGenerator(ledger);

    // printTAccount with null account should throw or handle gracefully
    assertThrows(
      // @ts-ignore
      () => generator.printTAccount(null),
      "printTAccount should reject null account"
    );

    assertThrows(
      // @ts-ignore
      () => generator.printTAccount(undefined),
      "printTAccount should reject undefined account"
    );

    // printLedgerStatement with invalid date range
    const invalidDate = new Date("invalid");
    assertThrows(
      () => generator.printLedgerStatement(invalidDate, new Date()),
      "printLedgerStatement should handle invalid start date"
    );

    assertThrows(
      () => generator.printLedgerStatement(new Date(), invalidDate),
      "printLedgerStatement should handle invalid end date"
    );
  },
  testTracker
);

// ======================================================================
// INVARIANT — debit is positive, credit is negative
// ======================================================================
runTest(
  "Invariant: debit postings increase balance, credit postings decrease balance",
  () => {
    const ledger = new GaapLedger();

    const asset = ledger.createCashAccount("Cash");
    const income = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );

    const date = new Date("2023-01-01");

    // Debit-only posting
    ledger
      .entry(date, "Debit test")
      .debit(asset, 100)
      .credit(income, 100)
      .post();

    assert(
      asset.getBalance(ledger) === 100,
      "Debit posting should produce positive balance"
    );

    assert(
      income.getBalance(ledger) === 100,
      "Credit posting should produce positive balance"
    );
  },
  testTracker
);

testTracker.generateTestReport();
