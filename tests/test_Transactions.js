console.log("==========================================");
console.log("Testing Transaction System");
console.log("==========================================");

import { Transaction } from "../cTransaction.js";
import { TransactionManager } from "../cTransactionManager.js";
import { TransactionType } from "../tTransactionType.js";
import { TransactionCategory } from "../tTransactionCategory.js";

import {
  assert,
  assertEqual,
  assertThrows,
  runTest,
  TestTracker,
} from "./baseTest.js";

const testTracker = new TestTracker("Transaction Tests");

//------------------------------------------------------------
// TEST 1 — Constructor assigns properties correctly
//------------------------------------------------------------
runTest(
  "Transaction constructor assigns accountName, amount, type, category, route, date, memo, transferId",
  () => {
    const tx = new Transaction(
      "Cash",
      100,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-01T00:00:00.000Z"),
      "Paycheck",
      /** @type {any} */ ("XFER-123")
    );

    assertEqual(tx.accountName, "Cash", "accountName mismatch");
    assertEqual(tx.amount, 100, "amount mismatch");
    assertEqual(
      tx.transactionType,
      TransactionType.Deposit,
      "transactionType mismatch"
    );
    assertEqual(
      tx.category,
      TransactionCategory.IncomeGross,
      "category mismatch"
    );
    assertEqual(tx.route, "Income -> Cash", "route mismatch");
    assertEqual(
      tx.date.toISOString(),
      "2026-01-01T00:00:00.000Z",
      "date mismatch"
    );
    assertEqual(tx.memo, "Paycheck", "memo mismatch");
    assertEqual(tx.transferId, "XFER-123", "transferId mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 2 — Constructor defaults memo and transferId to null
//------------------------------------------------------------
runTest(
  "Transaction constructor defaults memo and transferId to null",
  () => {
    const tx = new Transaction(
      "Cash",
      50,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-02T00:00:00.000Z")
    );

    assertEqual(tx.memo, null, "memo should default to null");
    assertEqual(tx.transferId, null, "transferId should default to null");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 3 — Constructor rejects empty account name
//------------------------------------------------------------
runTest(
  "Transaction constructor throws on empty accountName",
  () => {
    assertThrows(() => {
      new Transaction(
        "",
        100,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date()
      );
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 4 — Constructor rejects non-string account name
//------------------------------------------------------------
runTest(
  "Transaction constructor throws on non-string accountName",
  () => {
    assertThrows(() => {
      new Transaction(
        /** @type {any} */ (123),
        100,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date()
      );
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 5 — Constructor rejects negative amount
//------------------------------------------------------------
runTest(
  "Transaction constructor throws on negative amount",
  () => {
    assertThrows(() => {
      new Transaction(
        "Cash",
        -1,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date()
      );
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 6 — Constructor allows zero amount (edge case)
//------------------------------------------------------------
runTest(
  "Transaction constructor allows amount = 0",
  () => {
    const tx = new Transaction(
      "Cash",
      0,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-03T00:00:00.000Z")
    );

    assertEqual(tx.amount, 0, "amount mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 7 — Constructor rejects invalid TransactionType
//------------------------------------------------------------
runTest(
  "Transaction constructor throws on invalid TransactionType",
  () => {
    assertThrows(() => {
      new Transaction(
        "Cash",
        100,
        /** @type {any} */ (Symbol("BogusType")),
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date()
      );
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 8 — Constructor rejects invalid TransactionCategory
//------------------------------------------------------------
runTest(
  "Transaction constructor throws on invalid TransactionCategory",
  () => {
    assertThrows(() => {
      new Transaction(
        "Cash",
        100,
        TransactionType.Deposit,
        /** @type {any} */ (Symbol("BogusCategory")),
        /** @type {any} */ ("Income -> Cash"),
        new Date()
      );
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 9 — toJSON returns readable values + YYYY-MM-DD date
//------------------------------------------------------------
runTest(
  "Transaction.toJSON returns readable enum names and date-only format",
  () => {
    const tx = new Transaction(
      "Cash",
      123.45,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-04T15:30:00.000Z"),
      "Paycheck",
      /** @type {any} */ ("XFER-456")
    );

    const json = tx.toJSON();

    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.accountName, "Cash", "accountName mismatch");
    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.amount, 123.45, "amount mismatch");
    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.memo, "Paycheck", "memo mismatch");
    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.route, "Income -> Cash", "route mismatch");
    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.transferId, "XFER-456", "transferId mismatch");
    // date-only
    // @ts-ignore - suppress TS errors for dynamic properties
    assertEqual(json.date, "2026-01-04");

    // readable names (from enum)
    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      json.transactionType,
      TransactionType.toName(TransactionType.Deposit),
      "transactionType mismatch"
    );
    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      json.category,
      TransactionCategory.toName(TransactionCategory.IncomeGross),
      "category mismatch"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 10 — toSerializable preserves symbol identity via toString()
//------------------------------------------------------------
runTest(
  "Transaction.toSerializable preserves symbol identity and includes _type marker",
  () => {
    const tx = new Transaction(
      "Cash",
      200,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-05T00:00:00.000Z"),
      null,
      null
    );

    const data = tx.toSerializable();

    assertEqual(data._type, "Transaction", "_type marker mismatch");
    assertEqual(data.accountName, "Cash", "accountName mismatch");
    assertEqual(data.amount, 200, "amount mismatch");
    assertEqual(data.route, "Income -> Cash", "route mismatch");
    assertEqual(data.memo, null, "memo mismatch");
    assertEqual(data.transferId, null, "transferId mismatch");

    // Symbol identity is stored as string
    assert(
      typeof data.transactionType === "string",
      "transactionType should be string"
    );
    assert(typeof data.category === "string", "category should be string");

    // Date should be full ISO
    assertEqual(data.date, "2026-01-05T00:00:00.000Z", "date mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 11 — fromSerializable round-trip creates equal transaction
//------------------------------------------------------------
runTest(
  "Transaction.fromSerializable recreates a matching Transaction",
  () => {
    const original = new Transaction(
      "Cash",
      999,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-06T00:00:00.000Z"),
      "RoundTrip",
      /** @type {any} */ ("XFER-999")
    );

    const data = original.toSerializable();
    const recreated = Transaction.fromSerializable(data);

    assertEqual(recreated.accountName, original.accountName, "accountName mismatch");
    assertEqual(recreated.amount, original.amount, "amount mismatch");
    assertEqual(recreated.transactionType, original.transactionType, "transactionType mismatch");
    assertEqual(recreated.category, original.category, "category mismatch");
    assertEqual(recreated.route, original.route, "route mismatch");
    assertEqual(recreated.memo, original.memo, "memo mismatch");
    assertEqual(recreated.transferId, original.transferId, "transferId mismatch");
    assertEqual(recreated.date.toISOString(), original.date.toISOString(), "date mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 12 — fromSerializable throws on missing/invalid _type marker
//------------------------------------------------------------
runTest(
  "Transaction.fromSerializable throws on invalid _type marker",
  () => {
    assertThrows(() => {
      Transaction.fromSerializable({
        _type: "NotTransaction",
        accountName: "Cash",
        amount: 100,
        transactionType: TransactionType.Deposit.toString(),
        category: TransactionCategory.IncomeGross.toString(),
        route: "Income -> Cash",
        date: new Date().toISOString(),
        memo: null,
        transferId: null,
      });
    });
  },
  testTracker
);

//------------------------------------------------------------
// TEST 13 — toDebugObject returns formatted values and memo fallback
//------------------------------------------------------------
runTest(
  "Transaction.toDebugObject returns formattedAmount and memo fallback",
  () => {
    const tx = new Transaction(
      "Cash",
      1000,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-07T00:00:00.000Z"),
      null,
      null
    );

    const dbg = tx.toDebugObject();

    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      dbg.amount,
      1000,
      "amount mismatch"
    );
    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      dbg.memo,
      "(no memo)",
      "memo mismatch"
    );
    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      dbg.date,
      "2026-01-07",
      "date mismatch"
    );
    assertEqual(
      // @ts-ignore - suppress TS errors for dynamic properties
      dbg.fullDate,
      "2026-01-07T00:00:00.000Z",
      "fullDate mismatch"
    );

    assert(
      // @ts-ignore - suppress TS errors for dynamic properties
      typeof dbg.formattedAmount === "string" && dbg.formattedAmount.length > 0,
      "formattedAmount should be a non-empty string"
    );
  },
  testTracker
);

//------------------------------------------------------------
// TEST 14 — TransactionManager filters by accountName
//------------------------------------------------------------
runTest(
  "TransactionManager.getTransactionsForAccount filters by accountName",
  () => {
    const mgr = new TransactionManager();

    mgr.addTransaction(
      new Transaction(
        "Cash",
        10,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date("2026-01-01T00:00:00.000Z")
      )
    );

    mgr.addTransaction(
      new Transaction(
        "Checking",
        20,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Checking"),
        new Date("2026-01-01T00:00:00.000Z")
      )
    );

    const cashTx = mgr.getTransactionsForAccount("Cash");

    assertEqual(cashTx.length, 1, "Should return only 1 transaction for Cash");
    assertEqual(cashTx[0].accountName, "Cash", "Account name mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 15 — TransactionManager sorts by date ascending
//------------------------------------------------------------
runTest(
  "TransactionManager.getTransactionsForAccount sorts by date ascending",
  () => {
    const mgr = new TransactionManager();

    mgr.addTransaction(
      new Transaction(
        "Cash",
        1,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date("2026-01-10T00:00:00.000Z")
      )
    );

    mgr.addTransaction(
      new Transaction(
        "Cash",
        2,
        TransactionType.Deposit,
        TransactionCategory.IncomeGross,
        /** @type {any} */ ("Income -> Cash"),
        new Date("2026-01-05T00:00:00.000Z")
      )
    );

    const list = mgr.getTransactionsForAccount("Cash");

    assertEqual(list.length, 2, "Should return 2 transactions for Cash");
    assertEqual(list[0].date.toISOString(), "2026-01-05T00:00:00.000Z", "First transaction date mismatch");
    assertEqual(list[1].date.toISOString(), "2026-01-10T00:00:00.000Z", "Second transaction date mismatch");
  },
  testTracker
);

//------------------------------------------------------------
// TEST 16 — TransactionManager returns deep copies (not same references)
//------------------------------------------------------------
runTest(
  "TransactionManager.getTransactionsForAccount returns deep copies",
  () => {
    const mgr = new TransactionManager();

    const original = new Transaction(
      "Cash",
      123,
      TransactionType.Deposit,
      TransactionCategory.IncomeGross,
      /** @type {any} */ ("Income -> Cash"),
      new Date("2026-01-08T00:00:00.000Z"),
      "Original",
      /** @type {any} */ ("XFER-DEEP")
    );

    mgr.addTransaction(original);

    const fetched = mgr.getTransactionsForAccount("Cash");

    assertEqual(fetched.length, 1, "Should return only 1 transaction for Cash");

    // Not the same instance (deep copy)
    assert(
      fetched[0] !== original,
      "Returned Transaction should be a deep copy"
    );

    // But same values
    assertEqual(fetched[0].memo, "Original", "Memo mismatch");
    assertEqual(fetched[0].transferId, "XFER-DEEP", "Transfer ID mismatch");
    assertEqual(fetched[0].amount, 123, "Amount mismatch");
  },
  testTracker
);

console.log("\n==========================================");
console.log("              TEST SUMMARY");
console.log("==========================================");
console.log(`Total tests run:    ${testTracker.testsRun}`);
console.log(`Passed:             ${testTracker.testsPassed}`);
console.log(`Failed:             ${testTracker.testsFailed}`);

if (testTracker.testsFailed === 0) {
  console.log("\n🎉 ALL TESTS PASSED — GREAT JOB!\n");
} else {
  console.log(
    `\n🔥 ${testTracker.testsFailed} TEST(S) FAILED — REVIEW REQUIRED\n`
  );
}
