const TRANSACTION_TYPE = Object.freeze({
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
});

const TRANSACTION_CATEGORY = Object.freeze({
  INTEREST: "interest",
  DISBURSEMENT: "disbursement",
  OVERAGE: "overage",
  SHORTAGE: "shortage",
  TRANSFER: "transfer",
  CONTRIBUTION: "contribution",
  INCOME: "income",
  TAXES: "taxes",
});

/**
 * Helper function to check if a value is a valid transaction type
 * @param {string} value
 * @returns {boolean}
 */
function isValidTransactionType(value) {
  return /** @type {string[]} */ (Object.values(TRANSACTION_TYPE)).includes(
    value
  );
}

/**
 * Helper function to check if a value is a valid transaction category
 * @param {string} value
 * @returns {boolean}
 */
function isValidTransactionCategory(value) {
  return /** @type {string[]} */ (Object.values(TRANSACTION_CATEGORY)).includes(
    value
  );
}

class Transaction {
  #amount;
  #transactionType;
  #category;
  /** @type {Date} */
  #date;

  get amount() {
    return this.#amount;
  }

  get transactionType() {
    return this.#transactionType;
  }

  get category() {
    return this.#category;
  }

  get date() {
    return this.#date;
  }

  /**
   * @param {number} amount
   * @param {string} [transactionType]
   * @param {string} [category]
   * @param {Date} [date] - Transaction date, defaults to current date
   */
  constructor(amount, transactionType, category, date = new Date()) {
    if (transactionType && !isValidTransactionType(transactionType)) {
      throw new Error(
        `Invalid transaction type: ${transactionType}. Must be one of ${Object.values(TRANSACTION_TYPE).join(", ")}.`
      );
    }
    if (category && !isValidTransactionCategory(category)) {
      throw new Error(
        `Invalid category: ${category}. Must be one of ${Object.values(TRANSACTION_CATEGORY).join(", ")}.`
      );
    }
    this.#amount = amount;
    this.#transactionType = transactionType;
    this.#category = category;
    this.#date = date;
  }
}
