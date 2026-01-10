import { EnumBase } from "./cEnum.js";

// -------------------------------------------------------------
// TRANSACTION TYPE ENUM
// -------------------------------------------------------------

const TransactionTypeNames = /** @type {const} */ ({
  Deposit: "deposit",
  Withdrawal: "withdrawal",
});

/**
 * @typedef {typeof TransactionTypeNames[keyof typeof TransactionTypeNames]} TransactionTypeName
 */

class TransactionTypeEnum extends EnumBase {
  constructor() {
    super("TransactionType", Object.values(TransactionTypeNames));
  }

  get Deposit() {
    return this.map.deposit;
  }

  get Withdrawal() {
    return this.map.withdrawal;
  }

  /**
   * @param {symbol} sym
   * @returns {TransactionTypeName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid TransactionType symbol: ${String(sym)}`);
    return /** @type {TransactionTypeName} */ (name);
  }

  /**
   * Convert string name back to symbol
   * @param {string} name
   * @returns {TransactionTypeSymbol}
   */
  fromString(name) {
    const symbol = this.map[name];
    if (!symbol) throw new Error(`Invalid TransactionType name: ${name}`);
    return symbol;
  }
}

const TransactionType = new TransactionTypeEnum();

/**
 * @typedef {typeof TransactionType.Deposit
 *         | typeof TransactionType.Withdrawal} TransactionTypeSymbol
 */

// -------------------------------------------------------------
// TRANSACTION CATEGORY ENUM
// -------------------------------------------------------------

const TransactionCategoryNames = /** @type {const} */ ({
  Interest: "Interest",
  Disbursement: "Disbursement",
  RMD: "Req Min Dist",
  Overage: "Overage",
  Shortage: "Shortage",
  Transfer: "Transfer",
  Contribution: "Contribution",
  Income: "Income",
  Taxes: "Taxes",
  Spend: "Spend",
  Savings: "Savings",
  Trad401k: "Traditional 401k",
  TradRoth: "Traditional Roth IRA",
  OtherTaxableIncome: "Other Taxable Income",
  OtherNonTaxable: "Other Non-Taxable Income",
  SocialSecurity: "Social Security",
  Pension: "Pension",
  TaxRefund: "Tax Refund",
  TaxPayment: "Tax Payment",
});

/**
 * @typedef {typeof TransactionCategoryNames[keyof typeof TransactionCategoryNames]} TransactionCategoryName
 */

class TransactionCategoryEnum extends EnumBase {
  constructor() {
    super("TransactionCategory", Object.values(TransactionCategoryNames));
  }

  get Interest() {
    return this.map[TransactionCategoryNames.Interest];
  }

  get Disbursement() {
    return this.map[TransactionCategoryNames.Disbursement];
  }

  get RMD() {
    return this.map[TransactionCategoryNames.RMD];
  }

  get Overage() {
    return this.map[TransactionCategoryNames.Overage];
  }

  get Shortage() {
    return this.map[TransactionCategoryNames.Shortage];
  }

  get Transfer() {
    return this.map[TransactionCategoryNames.Transfer];
  }

  get Contribution() {
    return this.map[TransactionCategoryNames.Contribution];
  }

  get Income() {
    return this.map[TransactionCategoryNames.Income];
  }

  get Taxes() {
    return this.map[TransactionCategoryNames.Taxes];
  }

  get Spend() {
    return this.map[TransactionCategoryNames.Spend];
  }

  get Savings() {
    return this.map[TransactionCategoryNames.Savings];
  }

  get Trad401k() {
    return this.map[TransactionCategoryNames.Trad401k];
  }

  get TradRoth() {
    return this.map[TransactionCategoryNames.TradRoth];
  }

  get OtherTaxableIncome() {
    return this.map[TransactionCategoryNames.OtherTaxableIncome];
  }

  get OtherNonTaxable() {
    return this.map[TransactionCategoryNames.OtherNonTaxable];
  }

  get SocialSecurity() {
    return this.map[TransactionCategoryNames.SocialSecurity];
  }

  get Pension() {
    return this.map[TransactionCategoryNames.Pension];
  }

  get TaxRefund() {
    return this.map[TransactionCategoryNames.TaxRefund];
  }

  get TaxPayment() {
    return this.map[TransactionCategoryNames.TaxPayment];
  }

  // (others optional — same as GaapAccountType)

  /**
   * @param {symbol | undefined | null} sym
   * @returns {string | undefined}
   */
  toName(sym) {
    if (sym === undefined || sym === null) {
      return undefined;
    }

    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid TransactionCategory symbol: ${String(sym)}`);
    return /** @type {TransactionCategoryName} */ (name);
  }

  /**
   * Convert string name back to symbol
   * @param {string} name
   * @returns {TransactionCategorySymbol}
   */
  fromString(name) {
    const symbol = this.map[name];
    if (!symbol) throw new Error(`Invalid TransactionCategory name: ${name}`);
    return symbol;
  }
}

const TransactionCategory = new TransactionCategoryEnum();

/**
 * @typedef {typeof TransactionCategory.Interest
 *         | typeof TransactionCategory.Disbursement
 *         | typeof TransactionCategory.RMD
 *         | typeof TransactionCategory.Overage
 *         | typeof TransactionCategory.Shortage
 *         | typeof TransactionCategory.Transfer
 *         | typeof TransactionCategory.Contribution
 *         | typeof TransactionCategory.Income
 *         | typeof TransactionCategory.Taxes
 *         | typeof TransactionCategory.Spend
 *         | typeof TransactionCategory.Savings
 *         | typeof TransactionCategory.Trad401k
 *         | typeof TransactionCategory.TradRoth
 *         | typeof TransactionCategory.OtherTaxableIncome
 *         | typeof TransactionCategory.OtherNonTaxable
 *         | typeof TransactionCategory.SocialSecurity
 *         | typeof TransactionCategory.Pension
 *         | typeof TransactionCategory.TaxRefund
 *         | typeof TransactionCategory.TaxPayment
 *         } TransactionCategorySymbol
 */

class Transaction {
  /** @type {number} */
  #amount;
  /** @type {TransactionTypeSymbol} */
  #transactionType;
  /** @type {TransactionCategorySymbol} */
  #category;
  /** @type {string | null} */
  #memo;
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
      memo: this.#memo || "(no memo)",
      amount: this.#amount,
    };
  }

  /**
   * @typedef {Object} SerializableTransactionData
   * @property {number} amount
   * @property {string | undefined} transactionType
   * @property {string | undefined} category
   * @property {string | null} memo
   * @property {string} date
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
      transactionType: this.#transactionType.description, // Preserve symbol identity
      category: this.#category.description,
      memo: this.#memo,
      date: this.#date.toISOString(),
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
    const transactionType = TransactionType.fromString(
      data.transactionType ?? ""
    );
    const category = TransactionCategory.fromString(data.category ?? "");

    return new Transaction(
      data.amount,
      transactionType,
      category,
      new Date(data.date),
      data.memo
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
   * @param {Date} [date] - Transaction date, defaults to current date
   * @param {string | null} [memo] - The party associated with the transaction
   */
  constructor(
    amount,
    transactionType,
    category,
    date = new Date(),
    memo = null
  ) {
    if (!TransactionType.values().includes(transactionType)) {
      throw new Error("Invalid TransactionType");
    }
    if (!TransactionCategory.values().includes(category)) {
      throw new Error("Invalid TransactionCategory");
    }
    if (amount <= 0) {
      throw new Error(
        "Transaction amounts must always be positive and non-zero."
      );
    }
    this.#amount = amount;
    this.#transactionType = transactionType;
    this.#category = category;
    this.#memo = memo;
    this.#date = date;
  }
}

export { Transaction, TransactionType, TransactionCategory };
// export { isValidTransactionType, isValidTransactionCategory };
