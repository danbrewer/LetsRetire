class Transaction {
  #amount = 0;
  #type = null;
  #description = null;
  #date = null;

  get amount() {
    return this.#amount;
  }

  get type() {
    return this.#type;
  }

  get description() {
    return this.#description;
  }

  get date() {
    return this.#date;
  }

  constructor({ amount = 0, description, type, date = new Date() } = {}) {
    if (!Object.values(TransactionType).includes(type)) {
      throw new Error(
        `Invalid type: ${type}. Must be "deposit" or "withdrawal".`
      );
    }
    if (!Object.values(TransactionDescriptions).includes(description)) {
      throw new Error(
        `Invalid description: ${description}. Must be one of ${Object.values(TransactionDescriptions).join(", ")}.`
      );
    }
    this.amount = amount;
    this.type = type;
    this.description = description;
    this.date = date;
  }
}

const TransactionType = Object.freeze({
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
});

const TransactionDescriptions = Object.freeze({
  INTEREST: "interest",
  DISBURSEMENT: "disbursement",
  OVERAGE: "overage",
  SHORTAGE: "shortage",
  TRANSFER: "transfer",
  CONTRIBUTION: "contribution",
  WITHDRAWAL: "withdrawal",
  DEPOSIT: "deposit",
});
