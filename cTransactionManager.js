import { Transaction } from "./cTransaction.js";

class TransactionManager {
  /** @type {Transaction[]} */
  #transactions = [];

  /**
   * @param {string} accountName
   * @returns {Transaction[]}
   */
  getTransactionsForAccount(accountName) {
    const result = this.#transactions
      .filter((tx) => tx.accountName === accountName)
      .slice() // copy the array so sort doesn't mutate the filtered array
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((tx) => Transaction.fromSerializable(tx.toSerializable())); // deep copy each tx
    return result;
  }

  /**
   * @param {Transaction} transaction
   */
  addTransaction(transaction) {
    this.#transactions.push(transaction);
  }
}

export { TransactionManager };
