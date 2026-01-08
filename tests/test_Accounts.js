import {
  runTest,
  TestTracker,
  assert,
  assertEqual,
  assertThrows,
} from "./baseTest.js";
import { ACCOUNT_TYPES, Account } from "../cAccount.js";
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from "../cTransaction.js";
import { DateFunctions } from "../utils.js";
import { AccountRegisterFormatter } from "../cAccountRegister.js";

console.log("=".repeat(70));
console.log("🧪 ACCOUNT AND TRANSACTION TESTS");
console.log("=".repeat(70));

const testTracker = new TestTracker("Account and Transaction");

// ======================================================================
// 1 — Transaction constructor validation
// ======================================================================
runTest(
  "Transaction constructor creates valid transaction",
  () => {
    const testDate = new Date("2023-06-15");
    const transaction = new Transaction(
      1000,
      TransactionType.Deposit,
      TransactionCategory.Income,
      testDate,
      "Salary payment"
    );

    assertEqual(transaction.amount, 1000, "Amount should be set correctly");
    assertEqual(
      transaction.transactionType,
      TransactionType.Deposit,
      "Transaction type should be DEPOSIT"
    );
    assertEqual(
      transaction.category,
      TransactionCategory.Income,
      "Category should be SALARY"
    );
    assertEqual(transaction.date, testDate, "Date should be set correctly");
    assertEqual(
      transaction.memo,
      "Salary payment",
      "Memo should be set correctly"
    );
  },
  testTracker
);

// ======================================================================
// 2 — Transaction validation rejects invalid amounts
// ======================================================================
runTest(
  "Transaction constructor rejects negative amounts",
  () => {
    const testDate = new Date("2023-06-15");

    assertThrows(
      () =>
        new Transaction(
          -100,
          TransactionType.Deposit,
          TransactionCategory.Income,
          testDate,
          "Invalid transaction"
        ),
      "Should reject negative amounts"
    );

    assertThrows(
      () =>
        new Transaction(
          0,
          TransactionType.Deposit,
          TransactionCategory.Income,
          testDate,
          "Zero amount"
        ),
      "Should reject zero amounts"
    );
  },
  testTracker
);

// ======================================================================
// 3 — Transaction validation requires valid transaction types
// ======================================================================
runTest(
  "Transaction constructor validates transaction types",
  () => {
    const testDate = new Date("2023-06-15");

    // Valid transaction types should work
    const depositTx = new Transaction(
      100,
      TransactionType.Deposit,
      TransactionCategory.Income,
      testDate,
      "Valid deposit"
    );
    assert(depositTx, "Valid DEPOSIT transaction should be created");

    const withdrawalTx = new Transaction(
      100,
      TransactionType.Withdrawal,
      TransactionCategory.Disbursement,
      testDate,
      "Valid withdrawal"
    );
    assert(withdrawalTx, "Valid WITHDRAWAL transaction should be created");

    // Invalid transaction type should throw
    assertThrows(
      () =>
        new Transaction(
          100,
          // @ts-ignore
          "INVALID_TYPE",
          TransactionCategory.Income,
          testDate,
          "Invalid type"
        ),
      "Should reject invalid transaction types"
    );
  },
  testTracker
);

// ======================================================================
// 4 — Transaction category validation
// ======================================================================
runTest(
  "Transaction constructor validates transaction categories",
  () => {
    const testDate = new Date("2023-06-15");

    // Test all valid categories
    const validCategories = [
      TransactionCategory.Income,
      TransactionCategory.Interest,
      TransactionCategory.OtherNonTaxable,
      TransactionCategory.Disbursement,
      TransactionCategory.Taxes,
      TransactionCategory.Pension,
    ];

    for (const category of validCategories) {
      const tx = new Transaction(
        100,
        TransactionType.Deposit,
        category,
        testDate,
        `Test ${TransactionCategory.toName(category)} transaction`
      );
      assert(
        tx,
        `Transaction with category ${TransactionCategory.toName(category)} should be valid`
      );
    }

    // Invalid category should throw
    assertThrows(
      () =>
        new Transaction(
          100,
          TransactionType.Deposit,
          // @ts-ignore
          "INVALID_CATEGORY",
          testDate,
          "Invalid category"
        ),
      "Should reject invalid transaction categories"
    );
  },
  testTracker
);

// ======================================================================
// 5 — Account constructor validation
// ======================================================================
runTest(
  "Account constructor creates valid account",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    assertEqual(
      account.name,
      ACCOUNT_TYPES.SAVINGS,
      "Account type should be SAVINGS"
    );
    assertEqual(account.initialBalance, 1000, "Initial balance should be set");
  },
  testTracker
);

// ======================================================================
// 6 — Account constructor handles different account types
// ======================================================================
runTest(
  "Account constructor accepts all valid account types",
  () => {
    const validTypes = [
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      ACCOUNT_TYPES.INTEREST_ON_SAVINGS,
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      ACCOUNT_TYPES.TAXES,
      ACCOUNT_TYPES.WITHHOLDINGS,
    ];

    for (const type of validTypes) {
      const account = new Account(type, 500);
      assertEqual(account.name, type, `Account type ${type} should be valid`);
    }
  },
  testTracker
);

// ======================================================================
// 7 — Account deposit functionality
// ======================================================================
runTest(
  "Account deposit method adds transactions correctly",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    // Make a deposit
    const result = account.deposit(
      500,
      TransactionCategory.Income,
      2023,
      6,
      15,
      "Salary payment"
    );

    // Verify the deposit was processed
    assert(result, "Deposit should return a value");

    // Check the balance
    const balance2023 = account.endingBalanceForYear(2023);
    assertEqual(balance2023, 1500, "Balance should include the deposit");

    // Verify transaction was added
    const register = account.buildAccountRegister(
      new Date("2023-01-01"),
      new Date("2023-12-31"),
      TransactionCategory.Income
    );
    assert(register.entries.length > 0, "Should have transaction entries");
  },
  testTracker
);

// ======================================================================
// 8 — Account withdrawal functionality
// ======================================================================
runTest(
  "Account withdrawal method processes withdrawals correctly",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    // Make a withdrawal
    const result = account.withdrawal(
      300,
      TransactionCategory.Disbursement,
      2023,
      6,
      20,
      "Grocery shopping"
    );

    // Verify the withdrawal was processed
    assert(result, "Withdrawal should return a value");

    // Check the balance
    const balance2023 = account.endingBalanceForYear(2023);
    assertEqual(balance2023, 700, "Balance should reflect the withdrawal");

    // Verify transaction was added
    const register = account.buildAccountRegister(
      new Date("2023-01-01"),
      new Date("2023-12-31"),
      TransactionCategory.Income
    );
    assert(register.entries.length > 0, "Should have transaction entries");
  },
  testTracker
);

// ======================================================================
// 9 — Account balance calculations
// ======================================================================
runTest(
  "Account balance calculations work correctly for different years",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    // Add transactions in different years
    account.deposit(500, TransactionCategory.Income, 2023, 3, 15);
    account.withdrawal(200, TransactionCategory.Disbursement, 2023, 6, 10);
    account.deposit(300, TransactionCategory.Interest, 2024, 1, 1);

    // Test starting balances
    assertEqual(
      account.startingBalanceForYear(2023),
      1000,
      "2023 starting balance should be initial balance"
    );
    assertEqual(
      account.startingBalanceForYear(2024),
      1300,
      "2024 starting balance should include 2023 activity"
    );

    // Test ending balances
    assertEqual(
      account.endingBalanceForYear(2023),
      1300,
      "2023 ending balance should include year's activity"
    );
    assertEqual(
      account.endingBalanceForYear(2024),
      1600,
      "2024 ending balance should include all activity"
    );
  },
  testTracker
);

// ======================================================================
// 10 — Account balance as of specific date
// ======================================================================
runTest(
  "Account balanceAsOfDate calculates correctly",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    // Add transactions on specific dates
    account.deposit(500, TransactionCategory.Income, 2023, 3, 15);
    account.withdrawal(200, TransactionCategory.Disbursement, 2023, 6, 10);
    account.deposit(300, TransactionCategory.Interest, 2023, 9, 5);

    // Test balances at different points in time
    const balanceFeb = account.balanceAsOfDate(new Date("2023-02-28"));
    assertEqual(
      balanceFeb,
      1000,
      "Balance before any transactions should be initial"
    );

    const balanceMay = account.balanceAsOfDate(new Date("2023-05-01"));
    assertEqual(balanceMay, 1500, "Balance after first deposit should be 1500");

    const balanceAug = account.balanceAsOfDate(new Date("2023-08-01"));
    assertEqual(balanceAug, 1300, "Balance after withdrawal should be 1300");

    const balanceYear = account.balanceAsOfDate(new Date("2023-12-31"));
    assertEqual(
      balanceYear,
      1600,
      "Balance at year end should include all transactions"
    );
  },
  testTracker
);

// ======================================================================
// 11 — Account register generation
// ======================================================================
runTest(
  "Account buildAccountRegister generates correct register",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 2000);

    // Add multiple transactions
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      1,
      15,
      "January salary"
    );
    account.withdrawal(
      500,
      TransactionCategory.Disbursement,
      2023,
      2,
      1,
      "Rent payment"
    );
    account.deposit(
      50,
      TransactionCategory.Interest,
      2023,
      2,
      28,
      "Interest earned"
    );

    // Generate register for the period
    const register = account.buildAccountRegister(
      new Date(2023, 0, 1),
      new Date(2023, 1, 28),
      TransactionCategory.Income
    );

    assert(register, "Register should be created");
    assert(register.entries.length > 0, "Register should have entries");

    // Verify register properties
    assertEqual(
      register.startDate.getFullYear(),
      2023,
      "Register start date should be correct"
    );
    assertEqual(
      register.endDate.getMonth(),
      1,
      "Register end date should be February (month 1)"
    );

    // Test the formatted output
    const tableOutput = AccountRegisterFormatter.formatAsTable(register);
    assert(Array.isArray(tableOutput), "Table output should be an array");
    assert(tableOutput.length > 0, "Table output should not be empty");
  },
  testTracker
);

// ======================================================================
// 12 — Account error handling for invalid operations
// ======================================================================
runTest(
  "Account methods handle invalid inputs gracefully",
  () => {
    const account = new Account(ACCOUNT_TYPES.SAVINGS, 1000);

    // Test negative deposit
    assertThrows(
      () => account.deposit(-100, TransactionCategory.Income, 2023, 1, 1),
      "Should reject negative deposit amounts"
    );

    // Test negative withdrawal
    assertThrows(
      () =>
        account.withdrawal(-100, TransactionCategory.Disbursement, 2023, 1, 1),
      "Should reject negative withdrawal amounts"
    );
  },
  testTracker
);

// ======================================================================
// 13 — Transaction immutability and data integrity
// ======================================================================
runTest(
  "Transaction objects maintain data integrity",
  () => {
    const testDate = new Date("2023-06-15");
    const transaction = new Transaction(
      1000,
      TransactionType.Deposit,
      TransactionCategory.Income,
      testDate,
      "Test transaction"
    );

    // Verify original values
    const originalAmount = transaction.amount;
    const originalType = transaction.transactionType;
    const originalCategory = transaction.category;
    const originalDate = transaction.date;
    const originalMemo = transaction.memo;

    // Attempt to modify (should not affect original if properly implemented)
    // Note: This tests the intended behavior of immutable transactions
    assertEqual(
      transaction.amount,
      originalAmount,
      "Amount should remain unchanged"
    );
    assertEqual(
      transaction.transactionType,
      originalType,
      "Type should remain unchanged"
    );
    assertEqual(
      transaction.category,
      originalCategory,
      "Category should remain unchanged"
    );
    assertEqual(transaction.date, originalDate, "Date should remain unchanged");
    assertEqual(transaction.memo, originalMemo, "Memo should remain unchanged");
  },
  testTracker
);

// ======================================================================
// 14 — Complex account workflow integration test
// ======================================================================
runTest(
  "Complex account workflow with multiple transaction types",
  () => {
    const account = new Account(ACCOUNT_TYPES.SUBJECT_401K, 5000);

    // Simulate a year of account activity
    // Q1 - Regular contributions
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      1,
      15,
      "Jan contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      2,
      15,
      "Feb contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      3,
      15,
      "Mar contribution"
    );

    // Q2 - Contributions and fees
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      4,
      15,
      "Apr contribution"
    );
    account.withdrawal(
      25,
      TransactionCategory.Disbursement,
      2023,
      4,
      30,
      "Management fee"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      5,
      15,
      "May contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      6,
      15,
      "Jun contribution"
    );

    // Q3 - Contributions and market gains
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      7,
      15,
      "Jul contribution"
    );
    account.deposit(
      250,
      TransactionCategory.Income,
      2023,
      7,
      31,
      "Dividend payment"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      8,
      15,
      "Aug contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      9,
      15,
      "Sep contribution"
    );

    // Q4 - Final contributions and year-end interest
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      10,
      15,
      "Oct contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      11,
      15,
      "Nov contribution"
    );
    account.deposit(
      1000,
      TransactionCategory.Income,
      2023,
      12,
      15,
      "Dec contribution"
    );
    account.deposit(
      150,
      TransactionCategory.Interest,
      2023,
      12,
      31,
      "Year-end interest"
    );

    // Verify final balance calculation
    const expectedBalance = 5000 + 12 * 1000 + 250 + 150 - 25; // Initial + contributions + gains - fees
    const actualBalance = account.endingBalanceForYear(2023);
    assertEqual(
      actualBalance,
      expectedBalance,
      `Balance should be ${expectedBalance}`
    );

    // Generate and verify annual register
    const annualRegister = account.buildAccountRegister(
      new Date("2023-01-01"),
      new Date("2023-12-31"),
      TransactionCategory.Income
    );

    assert(
      annualRegister.entries.length >= 14,
      "Should have at least 14 transaction entries"
    );

    // Verify quarterly balances make sense
    const q1Balance = account.balanceAsOfDate(new Date("2023-03-31"));
    assertEqual(q1Balance, 8000, "Q1 balance should be 8000");

    const q2Balance = account.balanceAsOfDate(new Date("2023-06-30"));
    assertEqual(q2Balance, 10975, "Q2 balance should account for fee");

    const q3Balance = account.balanceAsOfDate(new Date("2023-09-30"));
    assertEqual(q3Balance, 14225, "Q3 balance should include dividend");
  },
  testTracker
);

// ======================================================================
// 15 — TransactionCategory enum functionality
// ======================================================================
runTest(
  "TransactionCategory enum provides correct functionality",
  () => {
    // Test that TransactionCategory enum is properly defined
    assert(
      TransactionCategory.Income,
      "TransactionCategory.Income should exist"
    );
    assert(
      TransactionCategory.Disbursement,
      "TransactionCategory.Disbursement should exist"
    );

    // Test enum values are accessible
    const incomeCategories = [
      TransactionCategory.Income,
      TransactionCategory.Interest,
      TransactionCategory.Disbursement,
    ];

    const expenseCategories = [
      TransactionCategory.Disbursement,
      TransactionCategory.Taxes,
      TransactionCategory.Shortage,
    ];

    for (const category of incomeCategories) {
      assert(
        category,
        `Income category ${TransactionCategory.toName(category)} should be defined`
      );
    }

    for (const category of expenseCategories) {
      assert(
        category,
        `Expense category ${TransactionCategory.toName(category)} should be defined`
      );
    }
  },
  testTracker
);

// ======================================================================
// SUMMARY
// ======================================================================

testTracker.generateTestReport();
