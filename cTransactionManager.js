import { Transaction } from "./cTransaction.js";

class TransactionManager {
  /** @type {Transaction[]} */
  #transactions = [];
  /** @type {Map<string, Transaction[]>} */
  #byAccount = new Map();
  /** @type {Map<string, Map<number, Transaction[]>>} */
  #byAccountYear = new Map();

  /**
   * @param {string} accountName
   * @returns {Transaction[]}
   */
  getTransactionsForAccount(accountName) {
    return this.#byAccount.get(accountName) ?? [];
  }
  // getTransactionsForAccount(accountName) {
  //   const result = this.#transactions
  //     .filter((tx) => tx.accountName === accountName)
  //     .slice() // copy the array so sort doesn't mutate the filtered array
  //     .sort((a, b) => a.date.getTime() - b.date.getTime())
  //     .map((tx) => Transaction.fromSerializable(tx.toSerializable())); // deep copy each tx
  //   return result;
  // }

  /**
   * @param {string} accountName
   * @param {number} yyyy
   */
  getTransactionsForAccountYear(accountName, yyyy) {
    return this.#byAccountYear.get(accountName)?.get(yyyy) ?? [];
  }

  /**
   * @param {Transaction} tx
   */
  addTransaction(tx) {
    this.#transactions.push(tx);
    // ---- Account index ----
    if (!this.#byAccount.has(tx.accountName)) {
      this.#byAccount.set(tx.accountName, []);
      this.#byAccountYear.set(tx.accountName, new Map());
    }

    /** @type {Transaction[] | undefined} */
    const accArr = this.#byAccount.get(tx.accountName);
    if (!accArr)
      throw new Error(`Account array not found for ${tx.accountName}`);

    accArr.push(tx);

    // maintain sorted invariant
    accArr.sort((a, b) => a.date.getTime() - b.date.getTime());

    // ---- Year index ----
    const year = tx.date.getFullYear();
    /** @type {Map<number, Transaction[]> | undefined} */
    const yearMap = this.#byAccountYear.get(tx.accountName);
    if (!yearMap) throw new Error(`Year map not found for ${tx.accountName}`);

    if (!yearMap.has(year)) yearMap.set(year, []);
    /** @type {Transaction[] | undefined} */
    const yearArr = yearMap.get(year);
    if (!yearArr)
      throw new Error(`Year array not found for ${tx.accountName}:${year}`);

    yearArr.push(tx);
  }

  // /**
  //  * @param {Transaction} transaction
  //  */
  // addTransaction(transaction) {
  //   this.#transactions.push(transaction);
  // }
}

export { TransactionManager };
