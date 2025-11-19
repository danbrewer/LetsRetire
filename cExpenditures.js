/**
 * Expenditures class - Tracks where money is pulled from and where it goes
 * Handles total spending for the year and breakdown of funding sources
 */

const EXPENDITURE_CATEGORY = Object.freeze({
  LIVING_EXPENSES: "living_expenses",
  HEALTHCARE: "healthcare",
  TRAVEL: "travel",
  HOUSING: "housing",
  ENTERTAINMENT: "entertainment",
  TAXES: "taxes",
  OTHER: "other",
});

/**
 * Represents a single expenditure with funding source information
 */
class ExpenditureItem {
  /** @type {number} */
  #amount;

  /** @type {string} */
  #category;

  /** @type {string} */
  #description;

  /** @type {string} */
  #accountSource;

  /** @type {Date} */
  #date;

  /**
   * @param {number} amount - The amount spent
   * @param {string} category - Category of expenditure
   * @param {string} description - Description of the expenditure
   * @param {string} accountSource - Which account the money came from
   * @param {Date} [date] - Date of expenditure, defaults to current date
   */
  constructor(amount, category, description, accountSource, date = new Date()) {
    if (amount < 0) {
      throw new Error("Expenditure amount must be positive.");
    }
    if (
      category &&
      !(
        /** @type {string[]} */ (Object.values(EXPENDITURE_CATEGORY)).includes(
          category
        )
      )
    ) {
      throw new Error(
        `Invalid expenditure category: ${category}. Must be one of ${Object.values(EXPENDITURE_CATEGORY).join(", ")}.`
      );
    }

    this.#amount = amount;
    this.#category = category;
    this.#description = description;
    this.#accountSource = accountSource;
    this.#date = date;
  }

  get amount() {
    return this.#amount;
  }

  get category() {
    return this.#category;
  }

  get description() {
    return this.#description;
  }

  get accountSource() {
    return this.#accountSource;
  }

  get date() {
    return this.#date;
  }
}

/**
 * Tracks funding contribution from a specific account
 */
class FundingContribution {
  /** @type {string} */
  #accountName;

  /** @type {number} */
  #amount;

  /** @type {number} */
  #proportion;

  /**
   * @param {string} accountName - Name of the account
   * @param {number} amount - Amount contributed from this account
   * @param {number} proportion - Proportion of total expenditures (0-1)
   */
  constructor(accountName, amount, proportion) {
    this.#accountName = accountName;
    this.#amount = amount;
    this.#proportion = proportion;
  }

  get accountName() {
    return this.#accountName;
  }

  get amount() {
    return this.#amount.asCurrency();
  }

  get proportion() {
    return this.#proportion;
  }

  get proportionAsPercentage() {
    return this.#proportion.asPercentage();
  }
}

/**
 * Main Expenditures class - Tracks spending and funding sources
 */
class Expenditures {
  /** @type {ExpenditureItem[]} */
  #expenditures = [];

  /** @type {Map<string, FundingContribution>} */
  #fundingContributions = new Map();

  /**
   * Add an expenditure item
   * @param {number} amount - The amount spent
   * @param {string} category - Category of expenditure
   * @param {string} description - Description of the expenditure
   * @param {string} accountSource - Which account the money came from
   * @param {number} year - Year of the expenditure
   */
  addExpenditure(amount, category, description, accountSource, year) {
    if (amount <= 0) {
      throw new Error("Expenditure amount must be positive.");
    }

    const expenditure = new ExpenditureItem(
      amount,
      category,
      description,
      accountSource,
      new Date(year, 0, 1)
    );

    this.#expenditures.push(expenditure);
    this.#updateFundingContributions();

    return amount.asCurrency();
  }

  /**
   * Add funding from a specific account
   * @param {string} accountName - Name of the account providing funding
   * @param {number} amount - Amount provided by this account
   */
  addFunding(accountName, amount) {
    if (amount <= 0) {
      throw new Error("Funding amount must be positive.");
    }

    const existingContribution = this.#fundingContributions.get(accountName);
    if (existingContribution) {
      // Update existing contribution
      const newAmount = existingContribution.amount + amount;
      const newProportion = newAmount / this.getTotalSpend();
      this.#fundingContributions.set(
        accountName,
        new FundingContribution(accountName, newAmount, newProportion)
      );
    } else {
      // Add new contribution
      const proportion = amount / this.getTotalSpend();
      this.#fundingContributions.set(
        accountName,
        new FundingContribution(accountName, amount, proportion)
      );
    }

    this.#updateFundingContributions();
  }

  /**
   * Get total spending for the year
   * @param {number | undefined} [year] - Optional year filter
   * @returns {number}
   */
  getTotalSpend(year = undefined) {
    let filteredExpenditures = this.#expenditures;

    if (year !== undefined) {
      filteredExpenditures = this.#expenditures.filter(
        (exp) => exp.date.getFullYear() === year
      );
    }

    const total = filteredExpenditures.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    return total.asCurrency();
  }

  /**
   * Get spending by category
   * @param {string} category - Expenditure category
   * @param {number | undefined} [year] - Optional year filter
   * @returns {number}
   */
  getSpendingByCategory(category, year = undefined) {
    let filteredExpenditures = this.#expenditures.filter(
      (exp) => exp.category === category
    );

    if (year !== undefined) {
      filteredExpenditures = filteredExpenditures.filter(
        (exp) => exp.date.getFullYear() === year
      );
    }

    const total = filteredExpenditures.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    return total.asCurrency();
  }

  /**
   * Get spending from a specific account source
   * @param {string} accountName - Name of the account
   * @param {number | undefined} [year] - Optional year filter
   * @returns {number}
   */
  getSpendingByAccount(accountName, year = undefined) {
    let filteredExpenditures = this.#expenditures.filter(
      (exp) => exp.accountSource === accountName
    );

    if (year !== undefined) {
      filteredExpenditures = filteredExpenditures.filter(
        (exp) => exp.date.getFullYear() === year
      );
    }

    const total = filteredExpenditures.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    return total.asCurrency();
  }

  /**
   * Get all funding contributions
   * @returns {FundingContribution[]}
   */
  getFundingContributions() {
    return Array.from(this.#fundingContributions.values());
  }

  /**
   * Get funding contribution from a specific account
   * @param {string} accountName - Name of the account
   * @returns {FundingContribution | null}
   */
  getFundingContribution(accountName) {
    return this.#fundingContributions.get(accountName) || null;
  }

  /**
   * Get breakdown of expenditures by category
   * @param {number | undefined} [year] - Optional year filter
   * @returns {Record<string, number>}
   */
  getCategoryBreakdown(year = undefined) {
    /** @type {Record<string, number>} */
    const breakdown = {};

    for (const category of Object.values(EXPENDITURE_CATEGORY)) {
      breakdown[category] = this.getSpendingByCategory(category, year);
    }

    return breakdown;
  }

  /**
   * Get breakdown of expenditures by account source
   * @param {number | undefined} [year] - Optional year filter
   * @returns {Record<string, number>}
   */
  getAccountBreakdown(year = undefined) {
    /** @type {Record<string, number>} */
    const breakdown = {};
    const accountNames = new Set(
      this.#expenditures.map((exp) => exp.accountSource)
    );

    for (const accountName of accountNames) {
      breakdown[accountName] = this.getSpendingByAccount(accountName, year);
    }

    return breakdown;
  }

  /**
   * Get all expenditures for a specific year
   * @param {number} year - Year to filter by
   * @returns {ExpenditureItem[]}
   */
  getExpendituresForYear(year) {
    return this.#expenditures.filter((exp) => exp.date.getFullYear() === year);
  }

  /**
   * Get summary statistics
   * @param {number | undefined} [year] - Optional year filter
   * @returns {Object}
   */
  getSummary(year = undefined) {
    const totalSpend = this.getTotalSpend(year);
    const categoryBreakdown = this.getCategoryBreakdown(year);
    const accountBreakdown = this.getAccountBreakdown(year);
    const fundingContributions = this.getFundingContributions();

    return {
      totalSpend: totalSpend,
      categoryBreakdown: categoryBreakdown,
      accountBreakdown: accountBreakdown,
      fundingContributions: fundingContributions.map((fc) => ({
        accountName: fc.accountName,
        amount: fc.amount,
        proportion: fc.proportion,
        proportionAsPercentage: fc.proportionAsPercentage,
      })),
      numberOfExpenditures: year
        ? this.getExpendituresForYear(year).length
        : this.#expenditures.length,
    };
  }

  /**
   * Clear all expenditures and funding contributions
   */
  clear() {
    this.#expenditures = [];
    this.#fundingContributions.clear();
  }

  /**
   * Private method to update funding contribution proportions
   */
  #updateFundingContributions() {
    const totalSpend = this.getTotalSpend();

    if (totalSpend === 0) {
      this.#fundingContributions.clear();
      return;
    }

    // Recalculate proportions based on actual expenditures by account
    const accountTotals = this.getAccountBreakdown();

    this.#fundingContributions.clear();

    for (const [accountName, amount] of Object.entries(accountTotals)) {
      if (amount > 0) {
        const proportion = amount / totalSpend;
        this.#fundingContributions.set(
          accountName,
          new FundingContribution(accountName, amount, proportion)
        );
      }
    }
  }

  /**
   * Create an empty Expenditures instance
   * @returns {Expenditures}
   */
  static Empty() {
    return new Expenditures();
  }
}
