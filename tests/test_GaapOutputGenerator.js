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

// ======================================================================
// 11 — printTAccount data structure analysis
// ======================================================================
runTest(
  "printTAccount produces structured output with identifiable components",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    const generator = new GaapOutputGenerator(ledger);

    // Create test data
    ledger
      .entry(new Date("2023-01-15"), "Sale #1")
      .debit(cash, 500)
      .credit(revenue, 500)
      .post();

    ledger
      .entry(new Date("2023-02-20"), "Sale #2")
      .debit(cash, 300)
      .credit(revenue, 300)
      .post();

    const output = generator.printTAccount(cash);
    const lines = output.split("\n");

    // Test data structure components
    assert(
      lines.length >= 7,
      "Output should have multiple lines for header, data, and footer"
    );

    // Header analysis
    assert(
      lines[0].includes("Cash (T-Account)"),
      "First line should be account name header"
    );
    assert(lines[1].match(/^-+$/), "Second line should be dashes");

    // Column headers
    const headerLine = lines.find(
      (line) => line.includes("Debit") && line.includes("Credit")
    );
    assert(headerLine, "Should have Debit/Credit column headers");
    assert(
      headerLine.includes("|"),
      "Column headers should use pipe separator"
    );

    // Data rows analysis
    const dataRows = lines.filter(
      (line) =>
        line.includes("2023-") && line.includes("Sale") && line.includes("|")
    );
    assert(
      dataRows.length === 2,
      "Should have 2 data rows for the transactions"
    );

    // Test data row structure (YYYY-MM-DD | Description | Amount)
    for (const row of dataRows) {
      const parts = row.split("|");
      assert(
        parts.length >= 3,
        "Each data row should have at least 3 pipe-separated parts"
      );
      assert(
        parts[0].trim().match(/^\d{4}-\d{2}-\d{2}$/),
        "First part should be date in YYYY-MM-DD format"
      );
      assert(
        parts[1].trim().includes("Sale"),
        "Second part should contain description"
      );
      assert(
        parts[2].trim().match(/^\d+$/),
        "Third part should be numeric amount"
      );
    }

    // Balance line analysis
    const balanceLine = lines.find((line) => line.includes("Ending Balance:"));
    assert(balanceLine, "Should have ending balance line");
    assert(
      balanceLine.includes("800"),
      "Balance should show total of 500 + 300 = 800"
    );
  },
  testTracker
);

// ======================================================================
// 12 — printLedgerStatement data structure analysis
// ======================================================================
runTest(
  "printLedgerStatement produces structured journal entry data",
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
    const generator = new GaapOutputGenerator(ledger);

    // Create test transactions
    ledger
      .entry(new Date("2023-03-10"), "Monthly sales")
      .debit(cash, 1000)
      .credit(revenue, 1000)
      .post();

    ledger
      .entry(new Date("2023-03-15"), "Office supplies")
      .debit(expense, 150)
      .credit(cash, 150)
      .post();

    const output = generator.printLedgerStatement();
    const lines = output.split("\n");

    // Test overall structure
    assert(
      lines[0] === "GENERAL LEDGER",
      "Should start with GENERAL LEDGER header"
    );
    assert(lines[1] === "==============", "Should have header underline");

    // Find journal entry blocks
    const entryHeaders = lines.filter((line) => line.startsWith("Date: 2023-"));
    assert(
      entryHeaders.length === 2,
      "Should have 2 journal entry date headers"
    );

    // Test first entry structure
    const firstEntryIndex = lines.findIndex((line) =>
      line.includes("Date: 2023-03-10")
    );
    assert(firstEntryIndex > 0, "Should find first entry");

    const firstEntrySection = lines.slice(
      firstEntryIndex,
      firstEntryIndex + 10
    );
    assert(
      firstEntrySection.some((line) => line.includes("Desc: Monthly sales")),
      "Should have description"
    );
    assert(
      firstEntrySection.some((line) => line.includes("Entry #")),
      "Should have entry ID"
    );
    assert(
      firstEntrySection.some(
        (line) =>
          line.includes("Account") && line.includes("Dr") && line.includes("Cr")
      ),
      "Should have posting headers"
    );

    // Test posting data structure
    const cashPosting = lines.find(
      (line) => line.includes("Cash") && line.includes("1000")
    );
    const revenuePosting = lines.find(
      (line) => line.includes("Revenue") && line.includes("1000")
    );

    assert(cashPosting, "Should find Cash debit posting");
    assert(revenuePosting, "Should find Revenue credit posting");

    // Verify posting format (Account name, Dr amount, Cr amount)
    assert(
      cashPosting.match(/Cash\s+1000\s+/),
      "Cash should show in debit column"
    );
    assert(
      revenuePosting.match(/Revenue\s+1000/),
      "Revenue should show in credit column"
    );
  },
  testTracker
);

// ======================================================================
// 13 — printChartOfAccounts data structure analysis
// ======================================================================
runTest(
  "printChartOfAccounts organizes accounts by type with structured format",
  () => {
    const ledger = new GaapLedger();
    const generator = new GaapOutputGenerator(ledger);

    // Create diverse account types
    const cash = ledger.createCashAccount("Petty Cash");
    const checking = ledger.createCashAccount("Checking Account");
    const ar = ledger.createNonCashAccount(
      "Accounts Receivable",
      GaapAccountType.Asset
    );
    const ap = ledger.createNonCashAccount(
      "Accounts Payable",
      GaapAccountType.Liability
    );
    const equity = ledger.createNonCashAccount(
      "Owner Equity",
      GaapAccountType.Equity
    );
    const revenue = ledger.createNonCashAccount(
      "Sales Revenue",
      GaapAccountType.Income
    );
    const expense = ledger.createNonCashAccount(
      "Rent Expense",
      GaapAccountType.Expense
    );

    const output = generator.printChartOfAccounts();
    const lines = output.split("\n");

    // Test overall structure
    assert(lines[0] === "CHART OF ACCOUNTS", "Should start with chart header");
    assert(lines[1] === "=================", "Should have header underline");

    // Test account type sections
    const sectionHeaders = [
      "ASSET",
      "LIABILITY",
      "EQUITY",
      "INCOME",
      "EXPENSE",
    ];
    for (const header of sectionHeaders) {
      const headerLine = lines.find((line) => line === header);
      assert(headerLine, `Should have ${header} section header`);

      const headerIndex = lines.indexOf(header);
      const underline = lines[headerIndex + 1];
      assert(
        underline && underline.match(/^-+$/),
        `${header} should have underline`
      );
    }

    // Test account listing structure
    const assetSection = lines.indexOf("ASSET");
    const liabilitySection = lines.indexOf("LIABILITY");
    const assetLines = lines.slice(assetSection + 2, liabilitySection - 1);

    // Should find both cash accounts and AR in asset section
    const cashEntries = assetLines.filter(
      (line) => line.includes("Petty Cash") || line.includes("Checking Account")
    );
    assert(
      cashEntries.length === 2,
      "Should list both cash accounts in assets"
    );

    // Test cash account identification
    const cashLine = assetLines.find((line) => line.includes("Petty Cash"));
    assert(
      cashLine && cashLine.includes("(cash)"),
      "Cash accounts should be marked with (cash)"
    );

    // Test account ID structure
    const accountLines = lines.filter((line) => line.trim().match(/^\d+\s+\w/));
    assert(
      accountLines.length >= 7,
      "Should have account entries with ID numbers"
    );

    // Test account line format: "  123  Account Name (optional cash)"
    for (const line of accountLines) {
      const match = line.match(/^\s+(\d+)\s+(.+)$/);
      assert(match, "Account line should have format: '  ID  Name'");
      assert(parseInt(match[1]) > 0, "Account ID should be positive number");
      assert(match[2].length > 0, "Account name should not be empty");
    }
  },
  testTracker
);

// ======================================================================
// 14 — Output data extraction and parsing
// ======================================================================
runTest(
  "Generated output contains parseable data structures for analysis",
  () => {
    const ledger = new GaapLedger();
    const cash = ledger.createCashAccount("Cash");
    const revenue = ledger.createNonCashAccount(
      "Revenue",
      GaapAccountType.Income
    );
    const generator = new GaapOutputGenerator(ledger);

    // Create complex transaction data
    const dates = [
      new Date("2023-01-01"),
      new Date("2023-02-15"),
      new Date("2023-03-30"),
    ];

    const amounts = [1000, 750, 500];
    const descriptions = ["Q1 Sales", "Q2 Sales", "Q3 Sales"];

    for (let i = 0; i < 3; i++) {
      ledger
        .entry(dates[i], descriptions[i])
        .debit(cash, amounts[i])
        .credit(revenue, amounts[i])
        .post();
    }

    const tAccountOutput = generator.printTAccount(cash);
    const ledgerOutput = generator.printLedgerStatement();

    // Test extractable transaction data from T-Account
    const tAccountLines = tAccountOutput.split("\n");
    const transactionData = [];

    for (const line of tAccountLines) {
      if (line.includes("2023-") && line.includes("|")) {
        const parts = line.split("|");
        if (parts.length >= 3) {
          transactionData.push({
            date: parts[0].trim(),
            description: parts[1].trim(),
            amount: parseInt(parts[2].trim()),
          });
        }
      }
    }

    assert(
      transactionData.length === 3,
      "Should extract 3 transactions from T-Account"
    );
    assert(
      transactionData[0].date === "2023-01-01",
      "Should extract correct date"
    );
    assert(
      transactionData[0].description === "Q1 Sales",
      "Should extract correct description"
    );
    assert(transactionData[0].amount === 1000, "Should extract correct amount");

    // Test total amount calculation from extracted data
    const totalAmount = transactionData.reduce((sum, tx) => sum + tx.amount, 0);
    assert(totalAmount === 2250, "Extracted amounts should sum to 2250");

    // Test balance extraction
    const balanceMatch = tAccountOutput.match(/Ending Balance:\s*(\d+)/);
    assert(balanceMatch, "Should find ending balance in output");
    assert(
      parseInt(balanceMatch[1]) === 2250,
      "Ending balance should match calculated total"
    );

    // Test journal entry data extraction from ledger statement
    const entryPattern = /Entry #(\d+)/g;
    const entryMatches = [...ledgerOutput.matchAll(entryPattern)];
    assert(
      entryMatches.length === 3,
      "Should find 3 journal entries in ledger statement"
    );

    // Test that entry IDs are sequential and positive
    const entryIds = entryMatches.map((match) => parseInt(match[1]));
    assert(
      entryIds.every((id) => id > 0),
      "All entry IDs should be positive"
    );
    assert(
      entryIds.length === new Set(entryIds).size,
      "All entry IDs should be unique"
    );
  },
  testTracker
);

testTracker.generateTestReport();
