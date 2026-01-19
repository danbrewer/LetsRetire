/**
 * Revenue class - Extracts and analyzes revenue account data from AccountYear
 * Handles income tracking, revenue streams, and financial reporting for revenue accounts
 */

import { AccountingYear } from "./cAccountingYear.js";
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from "./cTransaction.js";
import { DateFunctions, StringFunctions, Boxes } from "./utils.js";

/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 */

/**
 * @typedef {Object} TransactionReport
 * @property {string} transactionType
 * @property {string} category
 * @property {string} memo
 * @property {number} amount
 * @property {string} date
 */

/**
 * @typedef {Object} TransactionsByCategoryReport
 * @property {string} category
 * @property {TransactionReport[]} transactions
 * @property {number} total
 * @property {number} count
 */

/**
 * @typedef {Object} TransactionsSummaryByCategoryReport
 * @property {string} category
 * @property {number} deposits
 * @property {number} withdrawals
 * @property {number} count
 */

class AccountAnalyzer {
  /** @type {AccountingYear} */
  #accountYear;

  /** @type {string} */
  #accountType;

  /**
   * @param {AccountingYear} accountYear - AccountYear instance for accessing account data
   * @param {string} accountType - Type of account (e.g., REVENUE)
   */
  constructor(accountYear, accountType) {
    this.#accountYear = accountYear;
    this.#accountType = accountType;
  }

  /** @param {string} category
   * @param {Transaction[]} txns
   */
  #dumpTransactionCategoryDetails(category, txns) {
    // console.log(`${StringFunctions.padAndAlign(StringFunctions.repeat("~", 90), , "center")}`);
    Boxes.singleTopBorder();
    Boxes.addDetailData(`Category: ${category}`, "left");
    Boxes.doubleDivider();
    if (txns.length === 0) {
      console.log("No transactions in this category.");
      Boxes.singleBorderBottom();
      return;
    }

    const dateHdr = StringFunctions.padAndAlign("Date", 12);
    const memoHdr = StringFunctions.padAndAlign("Memo", 20);
    const depositHdr = StringFunctions.padAndAlign("Deposit", 15, "center");
    const withdrawHdr = StringFunctions.padAndAlign("Withdrawal", 15, "center");
    const headers = `${dateHdr}    ${memoHdr}    ${depositHdr}    ${withdrawHdr}`;
    Boxes.addDetailData(headers, "left");
    Boxes.singleDivider();

    let balance = 0;
    for (const t of txns) {
      const date = DateFunctions.formatDateYYYYMMDD(t.date);
      const dateField = StringFunctions.padAndAlign(date, 12);
      const deposit =
        t.transactionType === TransactionType.Deposit
          ? t.amount.asCurrency()
          : "";
      const withdrawal =
        t.transactionType === TransactionType.Withdrawal
          ? t.amount.asCurrency()
          : "";
      const depositField = StringFunctions.padAndAlign(deposit, 15, "right");
      const withdrawalField = StringFunctions.padAndAlign(
        withdrawal,
        15,
        "right"
      );
      const memoField = StringFunctions.padAndAlign(t.memo ?? "", 20);
      Boxes.addDetailData(
        `${dateField}    ${memoField}    ${depositField}    ${withdrawalField}`,
        "left"
      );
      balance += t.amount;
    }
    const dateFooter = StringFunctions.padAndAlign(" ", 12);
    const memoFooter = StringFunctions.padAndAlign("Totals:", 20);
    const depositTotal = txns
      .filter((t) => t.transactionType === TransactionType.Deposit)
      .reduce((sum, t) => sum + t.amount, 0)
      .asCurrency();
    const withdrawalTotal = txns
      .filter((t) => t.transactionType === TransactionType.Withdrawal)
      .reduce((sum, t) => sum + t.amount, 0)
      .asCurrency();
    const depositTotalField = StringFunctions.padAndAlign(
      depositTotal,
      15,
      "right"
    );
    const withdrawalTotalField = StringFunctions.padAndAlign(
      withdrawalTotal,
      15,
      "right"
    );
    Boxes.doubleDivider();
    const footer = `${dateFooter}    ${memoFooter}    ${depositTotalField}    ${withdrawalTotalField}`;
    Boxes.addDetailData(footer, "left");
    Boxes.singleBorderBottom();
  }

  /** @param {string} [reportTitle] */
  dumpCategoryDetails(reportTitle) {
    console.log();
    if (!reportTitle) {
      reportTitle = `${this.#accountType} Account Activity by Category (${this.#accountYear.taxYear})`;
    }
    if (reportTitle) {
      console.log("");
      Boxes.doubleBox(reportTitle);
    }
    const transactions = this.getTransactionsGroupedByCategory();

    for (const [category, txns] of transactions) {
      this.#dumpTransactionCategoryDetails(category, txns);
    }
  }

  dumpCategorySummaries(accountName = "") {
    console.log();
    if (!accountName) {
      accountName = `Transaction Summary for Account: ${this.#accountType} (${this.#accountYear.taxYear})`;
    }
    if (accountName) {
      console.log("");
      Boxes.doubleBox(accountName);
    }

    const transactions = this.getTransactionsGroupedByCategory();

    const headers = `${StringFunctions.padAndAlign("Category", 30)}${StringFunctions.padAndAlign(
      "Total Amount",
      20,
      "right"
    )}${StringFunctions.padAndAlign("Transaction Count", 20, "right")}`;

    Boxes.singleTopBorder();
    Boxes.addDetailData(headers, "left");
    Boxes.singleDivider();

    let grandTotal = 0;
    for (const [category, txns] of transactions) {
      const total = txns.reduce((sum, tx) => sum + tx.amount, 0);
      const count = txns.length;
      grandTotal += total;

      const data = `${StringFunctions.padAndAlign(category, 30)}${StringFunctions.padAndAlign(
        total.asCurrency(),
        20,
        "right"
      )}${StringFunctions.padAndAlign(count.toString(), 20, "right")}`;

      Boxes.addDetailData(data, "left");
    }
    const grandTotalField = StringFunctions.padAndAlign(
      grandTotal.asCurrency(),
      20,
      "right"
    );
    Boxes.doubleDivider();
    const totalLabel = StringFunctions.padAndAlign("Grand Total:", 30);
    Boxes.addDetailData(`${totalLabel}${grandTotalField}`, "left");
    Boxes.singleBorderBottom();
  }

  /** @param {string} [reportTitle] */
  dumpAnnualTransactions(reportTitle) {
    console.log();
    if (!reportTitle) {
      reportTitle = `${this.#accountType} Annual Account Activity (${this.#accountYear.taxYear})`;
    }

    const transactions = this.#accountYear
      .getAccountTransactions(this.#accountType)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dateHeader = StringFunctions.padAndAlign("Date", 12);
    const categoryHeader = StringFunctions.padAndAlign("Category", 15);
    const memoHeader = StringFunctions.padAndAlign("Memo", 20);
    const depositHeader = StringFunctions.padAndAlign("Deposit", 8, "center");
    const withdrawalHeader = StringFunctions.padAndAlign(
      "Withdrawal",
      8,
      "center"
    );
    const balanceHeader = StringFunctions.padAndAlign("Balance", 8, "center");
    const headers = `${dateHeader}    ${categoryHeader}    ${memoHeader}    ${depositHeader}    ${withdrawalHeader}    ${balanceHeader}`;

    Boxes.topBorderDouble();
    Boxes.addDetailData(reportTitle);
    Boxes.doubleDivider();
    Boxes.addDetailData(headers, "left");
    Boxes.doubleDivider();
    let balance = 0;
    for (const t of transactions) {
      const date = DateFunctions.formatDateYYYYMMDD(t.date);
      const dateField = StringFunctions.padAndAlign(date, 12);
      const categoryName = TransactionCategory.toName(t.category) || "Unknown";
      const categoryField = StringFunctions.padAndAlign(categoryName, 15);
      const deposit =
        t.transactionType === TransactionType.Deposit
          ? t.amount.asCurrency()
          : "";
      const withdrawal =
        t.transactionType === TransactionType.Withdrawal
          ? t.amount.asCurrency()
          : "";
      const depositField = StringFunctions.padAndAlign(deposit, 8, "right");
      const withdrawalField = StringFunctions.padAndAlign(
        withdrawal,
        8,
        "right"
      );
      const memoField = StringFunctions.padAndAlign(t.memo ?? "", 20);
      balance +=
        t.transactionType === TransactionType.Deposit ? t.amount : -t.amount;
      const balanceField = StringFunctions.padAndAlign(
        balance.asCurrency(),
        8,
        "right"
      );

      const detailData = `${dateField}    ${categoryField}    ${memoField}    ${depositField}    ${withdrawalField}    ${balanceField}`;

      Boxes.addDetailData(detailData, "left");
    }

    Boxes.doubleDivider();
    Boxes.addDetailData(
      `Ending Balance: ${StringFunctions.padAndAlign(balance.asCurrency(), 8, "right")}`
    );
    Boxes.singleBorderBottom();
  }

  /** @param {string} [reportTitle]
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  dumpAccountActivity(reportTitle, category) {
    const fieldLayout = {
      date: 12,
      category: 15,
      route: 31,
      deposit: 8,
      withdrawal: 8,
      balance: 8,
      memo: 15,
    };

    const transactions = this.#accountYear
      .getAccountTransactions(this.#accountType, category)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log();
    if (!reportTitle) {
      reportTitle = `${this.#accountType} Account Activity (${this.#accountYear.taxYear})`;
    }

    const startingBalance = this.#accountYear
      .getStartingBalance(this.#accountType)
      .asCurrency();
    const startingBalanceOutput = `Starting Balance: ${StringFunctions.padAndAlign(startingBalance, 8, "right")}`;

    const endingBalance = this.#accountYear
      .getEndingBalance(this.#accountType, category)
      .asCurrency();

    const dateHeader = StringFunctions.padAndAlign("Date", fieldLayout.date);
    const categoryHeader = StringFunctions.padAndAlign(
      "Category",
      fieldLayout.category
    );
    const routeHeader = StringFunctions.padAndAlign("Route", fieldLayout.route);
    const depositHeader = StringFunctions.padAndAlign(
      "Incoming",
      fieldLayout.deposit,
      "center"
    );
    const withdrawalHeader = StringFunctions.padAndAlign(
      "Outgoing",
      fieldLayout.withdrawal,
      "center"
    );
    const balanceHeader = StringFunctions.padAndAlign(
      "Balance",
      fieldLayout.balance,
      "center"
    );
    const memoHeader = StringFunctions.padAndAlign("Notes", fieldLayout.memo);
    const headers = `${dateHeader}    ${categoryHeader}    ${routeHeader}    ${depositHeader}    ${withdrawalHeader}    ${balanceHeader}    ${memoHeader}`;

    Boxes.topBorderDouble();
    Boxes.addDetailData(reportTitle);
    Boxes.doubleDivider();
    Boxes.addDetailData(startingBalanceOutput);

    Boxes.singleDivider();
    Boxes.addDetailData(headers, "left");
    Boxes.doubleDivider();
    let balance = startingBalance;
    for (const t of transactions) {
      const date = DateFunctions.formatDateYYYYMMDD(t.date);
      const dateField = StringFunctions.padAndAlign(date, fieldLayout.date);
      const categoryName = TransactionCategory.toName(t.category);
      const categoryField = StringFunctions.padAndAlign(
        categoryName,
        fieldLayout.category
      );
      const deposit =
        t.transactionType === TransactionType.Deposit
          ? t.amount.asCurrency()
          : "";
      const withdrawal =
        t.transactionType === TransactionType.Withdrawal
          ? t.amount.asCurrency()
          : "";
      const depositField = StringFunctions.padAndAlign(
        deposit,
        fieldLayout.deposit,
        "right"
      );
      const withdrawalField = StringFunctions.padAndAlign(
        withdrawal,
        fieldLayout.withdrawal,
        "right"
      );
      const memoField = StringFunctions.padAndAlign(
        t.memo ?? "",
        fieldLayout.memo
      );
      balance +=
        t.transactionType === TransactionType.Deposit ? t.amount : -t.amount;
      const balanceField = StringFunctions.padAndAlign(
        balance.asCurrency(),
        fieldLayout.balance,
        "right"
      );
      const routeField = StringFunctions.padAndAlign(
        t.routeDescription,
        fieldLayout.route
      );

      const detailData = `${dateField}    ${categoryField}    ${routeField}    ${depositField}    ${withdrawalField}    ${balanceField}    ${memoField}`;

      Boxes.addDetailData(detailData, "left");
    }
    if (endingBalance !== balance) {
      console.warn(
        `Warning: Calculated ending balance ${balance.asCurrency()} does not match reported ending balance ${endingBalance.asCurrency()}`
      );
    }
    Boxes.doubleDivider();
    Boxes.addDetailData(
      `Ending Balance: ${StringFunctions.padAndAlign(endingBalance, 8, "right")}`
    );
    Boxes.singleBorderBottom();
  }

  /**
   * Get transactions grouped by category, with transactions sorted by date within each group
   * @returns {Map<string, Transaction[]>}
   */
  getTransactionsGroupedByCategory() {
    const transactions = this.#accountYear.getAccountTransactions(
      this.#accountType
    );

    // Add explicit type annotation for the Map
    /** @type {Map<string, Transaction[]>} */
    const transactionMap = new Map();

    for (const transaction of transactions) {
      const categoryName =
        TransactionCategory.toName(transaction.category) || "Unknown";

      if (!transactionMap.has(categoryName)) {
        transactionMap.set(categoryName, []);
      }

      const transactionGroup = transactionMap.get(categoryName);
      if (transactionGroup) {
        transactionGroup.push(transaction);
      }
    }

    // Sort categories alphabetically
    const sortedGroupNames = Array.from(transactionMap.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    // Rebuild the Map in sorted order
    /** @type {Map<string, Transaction[]>} */
    const sortedTransactionMap = new Map();
    for (const categoryName of sortedGroupNames) {
      sortedTransactionMap.set(
        categoryName,
        transactionMap.get(categoryName) || []
      );
    }

    // Sort transactions within each category by date (oldest first) and transaction type
    for (const [_, txns] of sortedTransactionMap) {
      txns
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .sort((a, b) => {
          // Deposits before Withdrawals
          const typeA = TransactionType.toName(a.transactionType) || "";
          const typeB = TransactionType.toName(b.transactionType) || "";
          return typeA.localeCompare(typeB);
        });
    }

    return sortedTransactionMap;
  }

  get startingBalance() {
    return this.#accountYear.getStartingBalance(this.#accountType).asCurrency();
  }

  /**
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  getTotalWithdrawals(category) {
    return this.#accountYear
      .getWithdrawals(this.#accountType, category)
      .asCurrency();
  }

  /**
   * @param {TransactionCategorySymbol | undefined} [category]
   */
  getTotalDeposits(category) {
    return this.#accountYear
      .getDeposits(this.#accountType, category)
      .asCurrency();
  }

  get endingBalance() {
    return this.#accountYear.getEndingBalance(this.#accountType).asCurrency();
  }

  get total() {
    return this.#accountYear.getDeposits(this.#accountType).asCurrency();
  }

  /**
   * Create an empty Income instance
   * @param {AccountingYear} accountYear - AccountYear instance
   * @param {string} accountType - Type of account (e.g., REVENUE)
   * @returns {AccountAnalyzer}
   */
  static CreateUsing(accountYear, accountType) {
    return new AccountAnalyzer(accountYear, accountType);
  }
}

export { AccountAnalyzer };
