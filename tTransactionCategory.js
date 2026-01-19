import { EnumBase } from "./cEnum.js";

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
  OpeningBalance: "Opening Bal",
  Contribution: "Contribution",

  IncomeNet: "TakeHome",
  IncomeGross: "Gross",
  IncomeDeductions: "Deductions",
  Withholdings: "Withholdings",

  Taxes: "Taxes",
  Wages: "Wages",
  Spend: "Spend",
  SurplusIncome: "Surplus Income",
  DeficitIncome: "Deficit Income",
  Savings: "Savings",
  Trad401k: "Trad 401k",
  TradRoth: "Trad Roth IRA",
  OtherTaxableIncome: "Misc Taxable Income",
  OtherNonTaxable: "Misc Tax-free Income",
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

  get OpeningBalance() {
    return this.map[TransactionCategoryNames.OpeningBalance];
  }

  get Contribution() {
    return this.map[TransactionCategoryNames.Contribution];
  }

  get IncomeNet() {
    return this.map[TransactionCategoryNames.IncomeNet];
  }

  get IncomeGross() {
    return this.map[TransactionCategoryNames.IncomeGross];
  }
  get IncomeDeductions() {
    return this.map[TransactionCategoryNames.IncomeDeductions];
  }

  get Taxes() {
    return this.map[TransactionCategoryNames.Taxes];
  }

  get Wages() {
    return this.map[TransactionCategoryNames.Wages];
  }

  get Spend() {
    return this.map[TransactionCategoryNames.Spend];
  }

  get SurplusIncome() {
    return this.map[TransactionCategoryNames.SurplusIncome];
  }

  get IncomeShortfall() {
    return this.map[TransactionCategoryNames.DeficitIncome];
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

  get Withholdings() {
    return this.map[TransactionCategoryNames.Withholdings];
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
 *         | typeof TransactionCategory.OpeningBalance
 *         | typeof TransactionCategory.Contribution
 *         | typeof TransactionCategory.IncomeNet
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

export { TransactionCategory, TransactionCategoryNames };
