console.log("==========================================");
console.log("Testing AccountRegister System");
console.log("==========================================");

import {
  AccountRegister,
  AccountRegisterEntry,
  AccountRegisterFormatter,
} from "../cAccountRegister.js";
import { Account, ACCOUNT_TYPES } from "../cAccount.js";
import { DateFunctions } from "../utils.js";
import {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} from "./baseTest.js";
import { TransactionCategory } from "../cTransaction.js";

const testTracker = new TestTracker("AccountRegister");

// Test 1: AccountRegisterEntry Creation
runTest(
  "AccountRegisterEntry Creation",
  () => {
    const date = new Date(2023, 0, 15);
    const entry = new AccountRegisterEntry(
      date,
      "Initial Deposit",
      null,
      1000,
      1000
    );

    assertEqual(
      entry.transactionDate,
      date,
      "Transaction date should be set correctly"
    );
    assertEqual(entry.memo, "Initial Deposit", "Memo should be set correctly");
    assertEqual(
      entry.withdrawal,
      null,
      "Withdrawal should be null for deposit"
    );
    assertEqual(entry.deposit, 1000, "Deposit should be 1000");
    assertEqual(entry.balance, 1000, "Balance should be 1000");
  },
  testTracker
);

// Test 2: AccountRegister Creation
runTest(
  "AccountRegister Creation",
  () => {
    const startDate = new Date(2023, 0, 1);
    const endDate = new Date(2023, 11, 31);

    const register = new AccountRegister(
      startDate,
      endDate,
      TransactionCategory.Income
    );

    assertEqual(
      register.startDate,
      startDate,
      "Start date should be set correctly"
    );
    assertEqual(register.endDate, endDate, "End date should be set correctly");
    assertEqual(
      register.category,
      TransactionCategory.Income,
      "Category should be set correctly"
    );
    assertEqual(
      register.entries.length,
      0,
      "Entries should be empty initially"
    );
  },
  testTracker
);

// Test 3: Adding Deposits
runTest(
  "Adding Deposits",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.addDeposit(new Date(2023, 0, 15), "Salary", 2000, 2000);
    register.addDeposit(new Date(2023, 1, 1), "Bonus", 500, 2500);

    assertEqual(
      register.entries.length,
      2,
      "Should have 2 entries after deposits"
    );

    const entries = register.entries;
    assertEqual(entries[0].memo, "Salary", "First entry memo should be Salary");
    assertEqual(entries[0].deposit, 2000, "First entry deposit should be 2000");
    assertEqual(
      entries[0].withdrawal,
      null,
      "First entry withdrawal should be null"
    );
    assertEqual(entries[0].balance, 2000, "First entry balance should be 2000");

    assertEqual(entries[1].memo, "Bonus", "Second entry memo should be Bonus");
    assertEqual(entries[1].deposit, 500, "Second entry deposit should be 500");
    assertEqual(
      entries[1].balance,
      2500,
      "Second entry balance should be 2500"
    );
  },
  testTracker
);

// Test 4: Adding Withdrawals
runTest(
  "Adding Withdrawals",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.addWithdrawal(new Date(2023, 0, 15), "Rent", 1200, 800);
    register.addWithdrawal(new Date(2023, 1, 1), "Groceries", 150, 650);

    assertEqual(
      register.entries.length,
      2,
      "Should have 2 entries after withdrawals"
    );

    const entries = register.entries;
    assertEqual(entries[0].memo, "Rent", "First entry memo should be Rent");
    assertEqual(
      entries[0].withdrawal,
      1200,
      "First entry withdrawal should be 1200"
    );
    assertEqual(entries[0].deposit, null, "First entry deposit should be null");
    assertEqual(entries[0].balance, 800, "First entry balance should be 800");
  },
  testTracker
);

// Test 5: Balance Updates
runTest(
  "Balance Updates",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.addBalanceUpdate(new Date(2023, 0, 31), 1500, "End of Month");

    assertEqual(
      register.entries.length,
      1,
      "Should have 1 entry after balance update"
    );

    const entry = register.entries[0];
    assertEqual(entry.memo, "End of Month", "Memo should be set correctly");
    assertEqual(entry.withdrawal, null, "Withdrawal should be null");
    assertEqual(entry.deposit, null, "Deposit should be null");
    assertEqual(entry.balance, 1500, "Balance should be 1500");
  },
  testTracker
);

// Test 6: Starting Balance
runTest(
  "Starting Balance",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.startingBalance = 1000;

    assertEqual(
      register.startingBalance,
      1000,
      "Starting balance should be 1000"
    );
    assertEqual(
      register.entries.length,
      1,
      "Should have 1 entry for starting balance"
    );

    const entry = register.entries[0];
    assertEqual(
      entry.memo,
      "Starting Balance",
      "Entry memo should be 'Starting Balance'"
    );
    assertEqual(entry.balance, 1000, "Entry balance should be 1000");
  },
  testTracker
);

// Test 7: Ending Balance
runTest(
  "Ending Balance",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.endingBalance = 2500;

    assertEqual(register.endingBalance, 2500, "Ending balance should be 2500");
    assertEqual(
      register.entries.length,
      1,
      "Should have 1 entry for ending balance"
    );

    const entry = register.entries[0];
    assertEqual(
      entry.memo,
      "Ending Balance",
      "Entry memo should be 'Ending Balance'"
    );
    assertEqual(entry.balance, 2500, "Entry balance should be 2500");
  },
  testTracker
);

// Test 8: Complete Register Workflow
runTest(
  "Complete Register Workflow",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 0, 31),
      TransactionCategory.Income
    );

    // Set starting balance
    register.startingBalance = 1000;

    // Add transactions
    register.addDeposit(new Date(2023, 0, 5), "Salary", 2000, 3000);
    register.addWithdrawal(new Date(2023, 0, 10), "Rent", 1200, 1800);
    register.addWithdrawal(new Date(2023, 0, 15), "Groceries", 150, 1650);
    register.addDeposit(new Date(2023, 0, 20), "Freelance", 500, 2150);

    // Set ending balance
    register.endingBalance = 2150;

    assertEqual(
      register.entries.length,
      6,
      "Should have 6 entries total (start + 4 transactions + end)"
    );
    assertEqual(
      register.startingBalance,
      1000,
      "Starting balance should be preserved"
    );
    assertEqual(
      register.endingBalance,
      2150,
      "Ending balance should be preserved"
    );
  },
  testTracker
);

// Test 9: Entry Immutability
runTest(
  "Entry Immutability",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Income
    );

    register.addDeposit(new Date(2023, 0, 15), "Test", 100, 100);

    const entries1 = register.entries;
    const entries2 = register.entries;

    // Should get different array instances (copies)
    assert(entries1 !== entries2, "Should return different array instances");
    assertEqual(
      entries1.length,
      entries2.length,
      "But arrays should have same length"
    );
    assertEqual(entries1[0].memo, entries2[0].memo, "And same content");
  },
  testTracker
);

// Test 11: AccountRegisterFormatter.formatAsTable
runTest(
  "AccountRegisterFormatter.formatAsTable",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 0, 31),
      TransactionCategory.Income
    );

    register.startingBalance = 1000;
    register.addDeposit(new Date(2023, 0, 15), "Salary", 2500, 3500);
    register.addWithdrawal(new Date(2023, 0, 20), "Rent", 1200, 2300);
    register.endingBalance = 2300;

    const table = AccountRegisterFormatter.formatAsTable(register);

    // Check table structure
    assert(Array.isArray(table), "Should return an array");
    assertEqual(table.length, 5, "Should have 5 rows (header + 4 entries)");

    // Check header row
    const headerRow = table[0];
    assertEqual(headerRow[0], "Date", "First column should be Date");
    assertEqual(headerRow[1], "Memo", "Second column should be Memo");
    assertEqual(
      headerRow[2],
      "Withdrawal",
      "Third column should be Withdrawal"
    );
    assertEqual(headerRow[3], "Deposit", "Fourth column should be Deposit");
    assertEqual(headerRow[4], "Balance", "Fifth column should be Balance");

    // Check first data row (starting balance)
    const firstDataRow = table[1];
    assertEqual(
      firstDataRow[1],
      "Starting Balance",
      "Should have starting balance memo"
    );
    // Check that balance is formatted (might be "1000" or "$1,000.00" depending on implementation)
    assert(
      firstDataRow[4].toString().includes("1000"),
      "Should format balance correctly"
    );

    // Check deposit row
    const depositRow = table[2];
    assertEqual(depositRow[1], "Salary", "Should have salary memo");
    assert(
      depositRow[3].toString().includes("2500"),
      "Should format deposit correctly"
    );
    assert(
      depositRow[4].toString().includes("3500"),
      "Should format balance correctly"
    );

    // Check withdrawal row
    const withdrawalRow = table[3];
    assertEqual(withdrawalRow[1], "Rent", "Should have rent memo");
    assert(
      withdrawalRow[2].toString().includes("1200"),
      "Should format withdrawal correctly"
    );
    assert(
      withdrawalRow[4].toString().includes("2300"),
      "Should format balance correctly"
    );
  },
  testTracker
);

// Test 12: AccountRegisterFormatter.dumpRegisterToConsole
runTest(
  "AccountRegisterFormatter.dumpRegisterToConsole",
  () => {
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 0, 31),
      TransactionCategory.Savings
    );

    register.startingBalance = 5000;
    register.addDeposit(new Date(2023, 0, 10), "Interest", 50, 5050);
    register.addWithdrawal(
      new Date(2023, 0, 20),
      "Emergency Expense",
      500,
      4550
    );
    register.endingBalance = 4550;

    // Capture console output
    const originalLog = console.log;
    /** @type {string[]} */
    const logMessages = [];
    console.log = (...args) => {
      logMessages.push(args.join(" "));
    };

    try {
      AccountRegisterFormatter.dumpRegisterToConsole(register);

      // Verify console output contains expected elements
      const output = logMessages.join("\n");

      originalLog(output);

      assert(output.includes("Savings"), "Should display account type");
      assert(output.includes("2023"), "Should display year in dates");
      assert(output.includes("Date"), "Should have date column header");
      assert(
        output.includes("Description"),
        "Should have description column header"
      );
      assert(output.includes("Deposit"), "Should have deposit column header");
      assert(
        output.includes("Withdrawal"),
        "Should have withdrawal column header"
      );
      assert(output.includes("Balance"), "Should have balance column header");
      assert(
        output.includes("Starting Balance"),
        "Should show starting balance entry"
      );
      assert(output.includes("Interest"), "Should show interest deposit");
      assert(output.includes("Emergency Expense"), "Should show withdrawal");
      assert(
        output.includes("Ending Balance"),
        "Should show ending balance entry"
      );
      assert(
        output.includes("Final Balance:"),
        "Should show final balance summary"
      );

      // Test passes if we reach this point without exceptions
      assert(true, "Console output formatting completed successfully");
    } finally {
      // Restore original console.log
      console.log = originalLog;
    }
  },
  testTracker
);

// Test 13: AccountRegisterFormatter edge cases
runTest(
  "AccountRegisterFormatter edge cases",
  () => {
    // Test empty register
    const emptyRegister = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 0, 31),
      null
    );

    const emptyTable = AccountRegisterFormatter.formatAsTable(emptyRegister);
    assertEqual(
      emptyTable.length,
      1,
      "Empty register should have only header row"
    );

    // Test register with null/undefined values
    const register = new AccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 0, 31),
      null
    );

    register.addBalanceUpdate(new Date(2023, 0, 15), 1000);

    const table = AccountRegisterFormatter.formatAsTable(register);
    assertEqual(table.length, 2, "Should handle null memo values");
    assertEqual(table[1][1], "", "Null memo should become empty string");

    // Test console output with null values
    const originalLog = console.log;
    let outputSuccessful = false;
    console.log = () => {
      outputSuccessful = true;
    };

    try {
      AccountRegisterFormatter.dumpRegisterToConsole(emptyRegister);
      assert(outputSuccessful, "Should handle empty register without errors");
    } finally {
      console.log = originalLog;
    }
  },
  testTracker
);

// Test 14: Account integration with sample transactions
runTest(
  "Account integration with sample transactions",
  () => {
    // Create a savings account with some transactions
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 5000, 0.03); // 3% interest

    // Add some deposits
    account.deposit(2000, TransactionCategory.Income, 2023, 1, 15, "Salary");
    account.deposit(
      500,
      TransactionCategory.Transfer,
      2023,
      2,
      1,
      "Transfer from checking"
    );
    account.deposit(
      50,
      TransactionCategory.Interest,
      2023,
      3,
      31,
      "Quarterly interest"
    );

    // Add some withdrawals
    account.withdrawal(
      1200,
      TransactionCategory.Spend,
      2023,
      2,
      15,
      "Emergency expense"
    );
    account.withdrawal(
      300,
      TransactionCategory.Transfer,
      2023,
      3,
      10,
      "Transfer to checking"
    );

    // Build account register for the year
    const register = account.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      null
    );

    // Verify register properties
    assertEqual(
      register.startDate.getFullYear(),
      2023,
      "Should have correct start year"
    );
    assertEqual(
      register.endDate.getFullYear(),
      2023,
      "Should have correct end year"
    );

    // Should have starting balance + 5 transactions + ending balance = 7 entries
    assertEqual(
      register.entries.length,
      7,
      "Should have all transaction entries plus start/end balance"
    );

    const entries = register.entries;

    // Check starting balance
    assertEqual(
      entries[0].memo,
      "Starting Balance",
      "First entry should be starting balance"
    );
    assertEqual(entries[0].balance, 5000, "Should start with correct balance");

    // Verify some transaction entries exist
    const salaryEntry = entries.find((e) => e.memo === "Salary");
    assert(salaryEntry, "Should find salary transaction");
    assertEqual(salaryEntry.deposit, 2000, "Salary should be 2000 deposit");

    const expenseEntry = entries.find((e) => e.memo === "Emergency expense");
    assert(expenseEntry, "Should find emergency expense transaction");
    assertEqual(
      expenseEntry.withdrawal,
      1200,
      "Emergency expense should be 1200 withdrawal"
    );

    // Check ending balance
    assertEqual(
      entries[entries.length - 1].memo,
      "Ending Balance",
      "Last entry should be ending balance"
    );
  },
  testTracker
);

// Test 15: Account register with filtered transactions
runTest(
  "Account register with filtered transactions",
  () => {
    const account = new Account(ACCOUNT_TYPES.TRAD_401K, 25000, 0.07); // 7% 401k

    // Add various categories of transactions
    account.deposit(
      1000,
      TransactionCategory.Contribution,
      2023,
      1,
      1,
      "Employee contribution"
    );
    account.deposit(
      500,
      TransactionCategory.Contribution,
      2023,
      2,
      1,
      "Employer match"
    );
    account.deposit(
      175,
      TransactionCategory.Interest,
      2023,
      12,
      31,
      "Annual growth"
    );
    account.withdrawal(
      2000,
      TransactionCategory.Disbursement,
      2023,
      6,
      15,
      "Hardship withdrawal"
    );
    account.deposit(
      1000,
      TransactionCategory.Contribution,
      2023,
      7,
      1,
      "Mid-year contribution"
    );

    // Test filtering by contribution category only
    const contributionRegister = account.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      TransactionCategory.Contribution
    );

    // Should have starting balance + 3 contributions + ending balance = 5 entries
    assertEqual(
      contributionRegister.entries.length,
      5,
      "Should filter to contribution transactions only"
    );

    const contributionEntries = contributionRegister.entries;
    const transactionEntries = contributionEntries.slice(1, -1); // Remove start/end balance

    // All middle entries should be contributions
    assert(
      transactionEntries.every((e) => e.deposit !== null),
      "All filtered entries should be deposits"
    );
    assert(
      transactionEntries.every((e) => e.withdrawal === null),
      "No withdrawals should be in contribution filter"
    );

    // Test no filter (all transactions)
    const allRegister = account.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      null, // all categories
    );

    assertEqual(
      allRegister.entries.length,
      7,
      "Should include all transactions when not filtered"
    );
  },
  testTracker
);

// Test 16: Multiple account types with registers
runTest(
  "Multiple account types with registers",
  () => {
    // Create different types of accounts
    const savingsAccount = new Account(ACCOUNT_TYPES.SAVINGS, 10000, 0.02);
    const rothAccount = new Account(ACCOUNT_TYPES.TRAD_ROTH, 15000, 0.08);

    // Add transactions to savings
    savingsAccount.deposit(
      500,
      TransactionCategory.Interest,
      2023,
      6,
      30,
      "Semi-annual interest"
    );
    savingsAccount.withdrawal(
      2000,
      TransactionCategory.Transfer,
      2023,
      8,
      15,
      "Transfer to Roth"
    );

    // Add transactions to Roth
    rothAccount.deposit(
      2000,
      TransactionCategory.Transfer,
      2023,
      8,
      15,
      "Transfer from savings"
    );
    rothAccount.deposit(
      6000,
      TransactionCategory.Contribution,
      2023,
      12,
      31,
      "Annual contribution"
    );

    // Build registers for both
    const savingsRegister = savingsAccount.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      null
    );

    const rothRegister = rothAccount.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 11, 31),
      null
    );

    // Verify starting balances
    assertEqual(
      savingsRegister.entries[0].balance,
      10000,
      "Savings should start with 10,000"
    );
    assertEqual(
      rothRegister.entries[0].balance,
      15000,
      "Roth should start with 15,000"
    );

    // Test that transfer amounts match
    const savingsTransfer = savingsRegister.entries.find(
      (e) => e.memo && e.memo.includes("Transfer to Roth")
    );
    const rothTransfer = rothRegister.entries.find(
      (e) => e.memo && e.memo.includes("Transfer from savings")
    );

    assert(savingsTransfer, "Should find transfer out in savings register");
    assert(rothTransfer, "Should find transfer in in Roth register");
    assertEqual(
      savingsTransfer.withdrawal,
      2000,
      "Transfer out should be 2000 withdrawal"
    );
    assertEqual(
      rothTransfer.deposit,
      2000,
      "Transfer in should be 2000 deposit"
    );
  },
  testTracker
);

// Test 17: Account register with date range filtering
runTest(
  "Account register with date range filtering",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000, 0.01);

    // Add transactions across different months
    account.deposit(
      500,
      TransactionCategory.Income,
      2023,
      1,
      15,
      "January income"
    );
    account.withdrawal(
      200,
      TransactionCategory.Spend,
      2023,
      2,
      10,
      "February expense"
    );
    account.deposit(
      300,
      TransactionCategory.Income,
      2023,
      3,
      20,
      "March income"
    );
    account.withdrawal(
      100,
      TransactionCategory.Spend,
      2023,
      4,
      5,
      "April expense"
    );
    account.deposit(
      400,
      TransactionCategory.Income,
      2023,
      5,
      25,
      "May income"
    );

    // Test Q1 register (Jan-Mar)
    const q1Register = account.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 2, 31),
      null
    );

    // Should have starting balance + 3 Q1 transactions + ending balance = 5 entries
    assertEqual(
      q1Register.entries.length,
      5,
      "Q1 register should have 3 transactions plus start/end"
    );

    const q1Entries = q1Register.entries;
    const q1Transactions = q1Entries.slice(1, -1); // Remove start/end balance

    // Verify only Q1 transactions are included
    assert(
      q1Transactions.some((e) => e.memo === "January income"),
      "Should include January transaction"
    );
    assert(
      q1Transactions.some((e) => e.memo === "February expense"),
      "Should include February transaction"
    );
    assert(
      q1Transactions.some((e) => e.memo === "March income"),
      "Should include March transaction"
    );
    assert(
      !q1Transactions.some((e) => e.memo === "April expense"),
      "Should not include April transaction"
    );
    assert(
      !q1Transactions.some((e) => e.memo === "May income"),
      "Should not include May transaction"
    );

    // Test Q2 register (Apr-Jun)
    const q2Register = account.buildAccountRegister(
      new Date(2023, 3, 1),
      new Date(2023, 5, 30),
      null
    );

    // Should have starting balance + 2 Q2 transactions + ending balance = 4 entries
    assertEqual(
      q2Register.entries.length,
      4,
      "Q2 register should have 2 transactions plus start/end"
    );
  },
  testTracker
);

// Generate final test report
testTracker.generateTestReport();

if (testTracker.testsFailed > 0) {
  console.log(`❌ ${testTracker.testsFailed} test(s) failed`);
} else {
  console.log(`✅ All ${testTracker.testsPassed} tests passed!`);
}
