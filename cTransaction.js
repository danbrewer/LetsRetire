class Transaction {
  #amount = 0;
  #transactionType = null;
  #category = null;
  #date = null;

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

  constructor({
    amount = 0,
    transactionType,
    category,
    date = new Date(),
  } = {}) {
    if (!Object.values(TRANSACTION_TYPE).includes(transactionType)) {
      throw new Error(
        `Invalid transaction type: ${transactionType}. Must be one of ${Object.values(TRANSACTION_TYPE).join(", ")}.`
      );
    }
    if (!Object.values(TRANSACTION_CATEGORY).includes(category)) {
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
