/**
 * Revenue class - Extracts and analyzes revenue account data from AccountYear
 * Handles income tracking, revenue streams, and financial reporting for revenue accounts
 */

import { AccountingYear } from "./cAccountingYear.js";
import { Transaction, TransactionCategory } from "./cTransaction.js";

/**
 * @typedef {Object} TransactionReport
 * @property {number} amount
 * @property {string} transactionType
 * @property {string} category
 * @property {string} memo
 * @property {string} date
 */

/**
 * @typedef {Object} TransactionsByCategoryReport
 * @property {string} category
 * @property {TransactionReport[]} transactions
 * @property {number} total
 * @property {number} count
 */

class Income {
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

  /**
   * Get all transactions sorted by category
   * @returns {TransactionReport[]}
   */
  get transactionsByCategory() {
    const transactions = this.#accountYear
      .getAccountTransactions(this.#accountType)
      .sort((a, b) => {
        const categoryA = TransactionCategory.toName(a.category);
        const categoryB = TransactionCategory.toName(b.category);

        // Handle null/undefined cases
        if (!categoryA && !categoryB) return 0;
        if (!categoryA) return 1; // Put null/undefined at end
        if (!categoryB) return -1; // Put null/undefined at end

        return categoryA.localeCompare(categoryB);
      });

    return transactions.map(
      (tx) => /** @type {TransactionReport} */ (tx.toJSON())
    ); // Return readable format
  }

  /**
   * Get transactions grouped by category, with transactions sorted by date within each group
   * @returns {Map<string, TransactionReport[]>}
   */
  get transactionsGroupedByCategory() {
    const transactions = this.#accountYear.getAccountTransactions(
      this.#accountType
    );

    // Add explicit type annotation for the Map
    /** @type {Map<string, TransactionReport[]>} */
    const grouped = new Map();

    for (const transaction of transactions) {
      const categoryName =
        TransactionCategory.toName(transaction.category) || "Unknown";

      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, []);
      }
      const categorizedTransactions = grouped.get(categoryName);
      if (categorizedTransactions) {
        categorizedTransactions.push(
          /** @type {TransactionReport} */ (transaction.toJSON())
        );
      }
    }

    // Sort transactions within each category by date (oldest first)
    for (const [categoryName, txList] of grouped) {
      txList.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    // Convert to array, sort by category name, then back to Map to maintain order
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    return new Map(sortedEntries);
  }

  /**
   * Get transactions as an array of category objects with totals, sorted by category name
   * @returns {TransactionsByCategoryReport[]}
   */
  get transactionSummaryByCategory() {
    const grouped = this.transactionsGroupedByCategory;
    const summary = [];

    for (const [categoryName, transactions] of grouped) {
      const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      summary.push({
        category: categoryName,
        transactions, // Already converted to TransactionReport[] in grouped method
        total,
        count: transactions.length,
      });
    }

    return summary; // Already sorted by category name from grouped method
  }

  /**
   * Get all transactions sorted first by category, then by date within category
   * @returns {TransactionReport[]}
   */
  get transactionsByCategoryThenDate() {
    const grouped = this.transactionsGroupedByCategory;
    const sorted = [];

    for (const [categoryName, transactions] of grouped) {
      sorted.push(...transactions); // transactions are already TransactionReport[] from grouped method
    }

    return sorted;
  }

  get total() {
    return this.#accountYear.getDeposits(this.#accountType).asCurrency();
  }

  /**
   * Create an empty Income instance
   * @param {AccountingYear} accountYear - AccountYear instance
   * @param {string} accountType - Type of account (e.g., REVENUE)
   * @returns {Income}
   */
  static CreateUsing(accountYear, accountType) {
    return new Income(accountYear, accountType);
  }
}

export { Income };
