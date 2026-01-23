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
    const depositHdr = StringFunctions.padAndAlign("Inflows", 15, "center");
    const withdrawHdr = StringFunctions.padAndAlign("Outflows", 15, "center");
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

  dumpCategorySummaries(reportTitle = "") {
    const transactions = this.getTransactionsGroupedByCategory();

    console.log();
    if (!reportTitle) {
      reportTitle = `Annual Transaction Summary for Account: ${this.#accountType} (${this.#accountYear.taxYear})`;
    }
    if (reportTitle) {
      console.log("");
      Boxes.doubleBox(reportTitle);
    }

    const fieldLayout = {
      category: 15,
      inflows: 10,
      outflows: 10,
      balance: 10,
      tranCount: 18,
      grandTotalLabel: 15,
      grandTotal: 10,
      spacer: 3,
    };

    const spacer = " ".repeat(fieldLayout.spacer);

    const categoryHeader = StringFunctions.padAndAlign(
      "Category",
      fieldLayout.category
    );
    const inflowsHeader = StringFunctions.padAndAlign(
      "Inflows",
      fieldLayout.inflows,
      "right"
    );
    const outflowsHeader = StringFunctions.padAndAlign(
      "Outflows",
      fieldLayout.outflows,
      "right"
    );
    const balanceHeader = StringFunctions.padAndAlign(
      "Balance",
      fieldLayout.balance,
      "right"
    );
    const transactionCountHeader = StringFunctions.padAndAlign(
      "Transaction Count",
      fieldLayout.tranCount,
      "right"
    );

    const headers = `${categoryHeader}${spacer}${inflowsHeader}${spacer}${outflowsHeader}${spacer}${balanceHeader}${spacer}${transactionCountHeader}`;

    Boxes.singleTopBorder();
    Boxes.addDetailData(headers);
    Boxes.singleDivider();

    const sortedTransactions = [...transactions].sort((a, b) => {
      const [catA, txnsA] = a;
      const [catB, txnsB] = b;

      const inflowsA = txnsA
        .filter(
          (t) =>
            t.transactionType === TransactionType.Deposit &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const outflowsA = txnsA
        .filter(
          (t) =>
            t.transactionType === TransactionType.Withdrawal &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const inflowsB = txnsB
        .filter(
          (t) =>
            t.transactionType === TransactionType.Deposit &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const outflowsB = txnsB
        .filter(
          (t) =>
            t.transactionType === TransactionType.Withdrawal &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const aHasInflows = inflowsA > 0;
      const bHasInflows = inflowsB > 0;

      // inflow categories always come first
      if (aHasInflows && !bHasInflows) return -1;
      if (!aHasInflows && bHasInflows) return 1;

      // both have inflows -> sort by inflows desc
      if (aHasInflows && bHasInflows) return inflowsB - inflowsA;

      // both have 0 inflows -> sort by outflows desc
      return outflowsB - outflowsA;
    });

    let categoryBalance = 0;
    let categoryInflows = 0;
    let categoryOutflows = 0;
    let transactionCountTotal = 0;
    let grandTotal = 0;
    for (const [category, txns] of sortedTransactions) {
      const inflows = txns
        .filter(
          (t) =>
            t.transactionType === TransactionType.Deposit &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);
      categoryInflows += inflows.asCurrency();
      const outflows = txns
        .filter(
          (t) =>
            t.transactionType === TransactionType.Withdrawal &&
            t.date.getFullYear() === this.#accountYear.taxYear
        )
        .reduce((sum, t) => sum + t.amount, 0);
      categoryOutflows += outflows.asCurrency();
      categoryBalance = inflows - outflows;
      grandTotal += categoryBalance.asCurrency();
      const count = txns.length;
      transactionCountTotal += count;

      const categoryField = StringFunctions.padAndAlign(
        category,
        fieldLayout.category
      );
      const inflowsField = StringFunctions.padAndAlign(
        inflows.asCurrency(),
        fieldLayout.inflows,
        "right"
      );
      const outflowsField = StringFunctions.padAndAlign(
        outflows.asCurrency(),
        fieldLayout.outflows,
        "right"
      );
      const balanceField = StringFunctions.padAndAlign(
        categoryBalance.asCurrency(),
        fieldLayout.balance,
        "right"
      );
      const transactionCountField = StringFunctions.padAndAlign(
        count.toString(),
        fieldLayout.tranCount,
        "right"
      );

      const detailData = `${categoryField}${spacer}${inflowsField}${spacer}${outflowsField}${spacer}${balanceField}${spacer}${transactionCountField}`;

      Boxes.addDetailData(detailData);
    }

    Boxes.doubleDivider();
    const grandTotalLabel = StringFunctions.padAndAlign(
      "Grand Total:",
      fieldLayout.grandTotalLabel
    );
    const categoryInflowsField = StringFunctions.padAndAlign(
      categoryInflows.asCurrency(),
      fieldLayout.inflows,
      "right"
    );
    const categoryOutflowsField = StringFunctions.padAndAlign(
      categoryOutflows.asCurrency(),
      fieldLayout.outflows,
      "right"
    );
    const grandTotalField = StringFunctions.padAndAlign(
      grandTotal.asCurrency(),
      fieldLayout.grandTotal,
      "right"
    );
    const transactionCountTotalField = StringFunctions.padAndAlign(
      transactionCountTotal.toString(),
      fieldLayout.tranCount,
      "right"
    );
    Boxes.addDetailData(
      `${grandTotalLabel}${spacer}${categoryInflowsField}${spacer}${categoryOutflowsField}${spacer}${grandTotalField}${spacer}${transactionCountTotalField}`
    );
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
      balance: category ? 0 : 8,
      memo: 20,
      spacer: 3,
    };

    const spacer = " ".repeat(fieldLayout.spacer);

    const transactions = this.#accountYear
      .getAccountTransactions(this.#accountType, category)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log();
    if (!reportTitle) {
      reportTitle = `${this.#accountType} Account Activity (${this.#accountYear.taxYear})`;
    } else {
      reportTitle = `${reportTitle} (${this.#accountYear.taxYear})`;
    }

    const startingBalance = this.#accountYear
      .getStartingBalance(this.#accountType)
      .asCurrency();

    let headerTitle = `Starting Balance: ${StringFunctions.padAndAlign(startingBalance, 8, "right")}`;
    if (category) {
      headerTitle = `Category: ${TransactionCategory.toName(category)}`;
    }
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
      category ? "" : "Balance",
      fieldLayout.balance,
      "center"
    );

    const memoHeader = StringFunctions.padAndAlign("Notes", fieldLayout.memo);
    const headers = `${dateHeader}${spacer}${categoryHeader}${spacer}${routeHeader}${spacer}${depositHeader}${spacer}${withdrawalHeader}${spacer}${balanceHeader}${spacer}${memoHeader}`;

    Boxes.topBorderDouble();
    Boxes.addDetailData(reportTitle);
    Boxes.doubleDivider();
    Boxes.addDetailData(headerTitle);

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
          ? (-t.amount).asCurrency()
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
        category ? "" : balance.asCurrency(),
        fieldLayout.balance,
        "right"
      );
      const routeField = StringFunctions.padAndAlign(
        t.routeDescription,
        fieldLayout.route
      );

      const detailData = `${dateField}${spacer}${categoryField}${spacer}${routeField}${spacer}${depositField}${spacer}${withdrawalField}${spacer}${balanceField}${spacer}${memoField}`;

      Boxes.addDetailData(detailData, "left");
    }

    const endingBalance = this.#accountYear
      .getEndingBalance(this.#accountType, category)
      .asCurrency();

    if (!category && endingBalance !== balance) {
      console.warn(
        `Warning: Calculated ending balance ${balance.asCurrency()} does not match reported ending balance ${endingBalance.asCurrency()}`
      );
    }

    let incomingSum = transactions
      .reduce((sum, t) => {
        return t.transactionType === TransactionType.Deposit
          ? sum + t.amount
          : sum;
      }, 0)
      .asCurrency();

    let outgoingSum = transactions
      .reduce((sum, t) => {
        return t.transactionType === TransactionType.Withdrawal
          ? sum + t.amount
          : sum;
      }, 0)
      .asCurrency();

    const startingBalanceField = StringFunctions.padAndAlign(
      category
        ? "Totals:"
        : `Starting balance: ${startingBalance.asCurrency()}`,
      fieldLayout.date +
        fieldLayout.category +
        fieldLayout.route +
        spacer.length * 2,
      "center"
    );

    const incomingSumField = StringFunctions.padAndAlign(
      incomingSum == 0 ? "" : incomingSum,
      fieldLayout.deposit,
      "right"
    );
    const outgoingSumField = StringFunctions.padAndAlign(
      outgoingSum == 0 ? "" : -outgoingSum,
      fieldLayout.withdrawal,
      "right"
    );
    const endingBalanceField = StringFunctions.padAndAlign(
      category ? "" : endingBalance.asCurrency(),
      fieldLayout.balance,
      "right"
    );

    Boxes.doubleDivider();

    Boxes.addDetailData(
      `${startingBalanceField}${spacer}${incomingSumField}${spacer}${outgoingSumField}${spacer}${endingBalanceField}`,
      "left"
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
