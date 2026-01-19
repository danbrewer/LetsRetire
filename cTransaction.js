import { TransactionCategory } from "./tTransactionCategory.js";
import { TransactionType } from "./tTransactionType.js";

/** 
 * @typedef {import("./types.js").TransactionRoute} TransactionRoute
 * @typedef {import("./types.js").TransferId} TransferId 
 * @typedef {import("./tTransactionCategory.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./tTransactionType.js").TransactionTypeSymbol} TransactionTypeSymbol
 */

class Transaction {
  /** @type {number} */
  #amount;
  /** @type {TransactionTypeSymbol} */
  #transactionType;
  /** @type {TransactionCategorySymbol} */
  #category;
  /** @type {TransactionRoute} */
  #route;
  /** @type {Date} */
  #date;
  /** @type {string | null} */
  #memo;
  /** @type {TransferId | null} */
  #transferId;

  get amount() {
    return this.#amount;
  }

  get transactionType() {
    return this.#transactionType;
  }

  get category() {
    return this.#category;
  }

  get memo() {
    return this.#memo;
  }

  get date() {
    return this.#date;
  }

  /**
   * Convert transaction to JSON-friendly format with readable enum values
   * Used for debugging and display purposes
   * @returns {object}
   */
  toJSON() {
    return {
      date: this.#date.toISOString().split("T")[0], // Just the date part
      transactionType: TransactionType.toName(this.#transactionType),
      category: TransactionCategory.toName(this.#category),
      memo: this.#memo,
      amount: this.#amount,
      route: this.#route,
      transferId: this.#transferId,
    };
  }

  /**
   * @typedef {Object} SerializableTransactionData
   * @property {number} amount
   * @property {string} transactionType
   * @property {string} category
   * @property {TransactionRoute} route
   * @property {string} date
   * @property {string | null} memo
   * @property {TransferId | null} transferId
   * @property {string} _type
   */

  /**
   * Convert transaction to serializable format that preserves enum symbols
   * Used for data persistence and round-trip serialization
   * @returns {SerializableTransactionData}
   */
  toSerializable() {
    return {
      amount: this.#amount,
      transactionType: this.#transactionType.toString(), // Preserve symbol identity
      category: this.#category.toString(),
      route: this.#route,
      memo: this.#memo,
      date: this.#date.toISOString(),
      transferId: this.#transferId,
      _type: "Transaction", // Type marker for deserialization
    };
  }

  /**
   * Create Transaction from serializable data
   * @param {SerializableTransactionData} data - Serialized transaction data
   * @returns {Transaction}
   */
  static fromSerializable(data) {
    if (data._type !== "Transaction") {
      throw new Error("Invalid serialized Transaction data");
    }

    // Convert symbol descriptions back to enum symbols
    const transactionType = TransactionType.fromString(data.transactionType);
    const category = TransactionCategory.fromString(data.category);

    return new Transaction(
      data.amount,
      transactionType,
      category,
      data.route,
      new Date(data.date),
      data.memo,
      data.transferId
    );
  }

  /**
   * Get a debug-friendly representation with more formatting options
   * @returns {object}
   */
  toDebugObject() {
    return {
      amount: this.#amount,
      transactionType: TransactionType.toName(this.#transactionType),
      category: TransactionCategory.toName(this.#category),
      memo: this.#memo || "(no memo)",
      date: this.#date.toISOString().split("T")[0],
      fullDate: this.#date.toISOString(),
      formattedAmount: this.#amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      }),
    };
  }

  /**
   * @param {number} amount - The amount of the transaction
   * @param {TransactionTypeSymbol} transactionType - The type of transaction
   * @param {TransactionCategorySymbol} category - The category of the transaction
   * @param {TransactionRoute} route - The route of the transaction
   * @param {Date} date - Transaction date, defaults to current date
   * @param {string | null} [memo] - The party associated with the transaction
   * @param {TransferId | null} [transferId] - Optional transfer ID for linked transactions
   */
  constructor(
    amount,
    transactionType,
    category,
    route,
    date,
    memo = null,
    transferId = null
  ) {
    if (!TransactionType.values().includes(transactionType)) {
      throw new Error("Invalid TransactionType");
    }
    if (!TransactionCategory.values().includes(category)) {
      throw new Error("Invalid TransactionCategory");
    }
    if (amount < 0) {
      throw new Error("Transaction amounts must always be positive.");
    }
    this.#amount = amount;
    this.#transactionType = transactionType;
    this.#category = category;
    this.#route = route;
    this.#memo = memo;
    this.#date = date;
    this.#transferId = transferId;
  }
}

export { Transaction, TransactionType, TransactionCategory };
