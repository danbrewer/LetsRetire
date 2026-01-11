import { Account, ACCOUNT_TYPES } from "./cAccount.js";
import { Inputs } from "./cInputs.js";

class AccountsManager {
  /** @type {Map<ACCOUNT_TYPES, Account>} */
  #accountsByType;

  /**
   * @param {Map<ACCOUNT_TYPES, Account>} accountsMap - Map of account types to Account instances
   */
  constructor(accountsMap) {
    this.#accountsByType = new Map(accountsMap);
  }
  // /**
  //  * @param {Account} subjectSocialSecurity - Subject Social Security account instance
  //  * @param {Account} spouseSocialSecurity - Spouse Social Security account instance
  //  * @param {Account} subject401k - Traditional 401k account instance
  //  * @param {Account} spouse401k - Spouse Traditional 401k account instance
  //  * @param {Account} subjectPension - Subject Pension account instance
  //  * @param {Account} spousePension - Spouse Pension account instance
  //  * @param {Account} subjectRothIra - Roth IRA account instance
  //  * @param {Account} spouseRothIra - Spouse Roth IRA account instance
  //  * @param {Account} savings - Savings account instance
  //  * @param {Account} income - Income account instance
  //  * @param {Account} disbursement - Disbursement account instance
  //  * @param {Account} taxes - Taxes account instance
  //  * @param {Account} withholdings - Withholdings account instance
  //  */
  // constructor(
  //   subjectSocialSecurity,
  //   spouseSocialSecurity,
  //   subject401k,
  //   spouse401k,
  //   subjectPension,
  //   spousePension,
  //   subjectRothIra,
  //   spouseRothIra,
  //   savings,
  //   income,
  //   disbursement,
  //   taxes,
  //   withholdings
  // ) {
  //   this.#accountsByType = new Map([
  //     [ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY, subjectSocialSecurity],
  //     [ACCOUNT_TYPES.SPOUSE_SOCIAL_SECURITY, spouseSocialSecurity],
  //     [ACCOUNT_TYPES.SUBJECT_401K, subject401k],
  //     [ACCOUNT_TYPES.PARTNER_401K, spouse401k],
  //     [ACCOUNT_TYPES.SUBJECT_PENSION, subjectPension],
  //     [ACCOUNT_TYPES.SPOUSE_PENSION, spousePension],
  //     [ACCOUNT_TYPES.SUBJECT_ROTH_IRA, subjectRothIra],
  //     [ACCOUNT_TYPES.PARTNER_ROTH_IRA, spouseRothIra],
  //     [ACCOUNT_TYPES.SAVINGS, savings],
  //     [ACCOUNT_TYPES.LIVINGEXPENSESFUND, income],
  //     [ACCOUNT_TYPES.DISBURSEMENT_TRACKING, disbursement],
  //     [ACCOUNT_TYPES.TAXES, taxes],
  //     [ACCOUNT_TYPES.WITHHOLDINGS, withholdings],
  //   ]);
  // }

  /**
   * Factory method to create AccountGroup from input data
   * @param {Inputs} inputs - Input data containing account balances and rates
   * @returns {AccountsManager} New AccountGroup instance
   */
  static CreateFromInputs(inputs) {
    /** @type {Map<ACCOUNT_TYPES, Account>} */
    const accountsMap = new Map();

    // Iterate over all ACCOUNT_TYPES and create appropriate accounts
    for (const [typeName, accountType] of Object.entries(ACCOUNT_TYPES)) {
      let startingBalance = 0;
      let interestRate = 0;

      // Set starting balance and interest rate based on account type
      switch (accountType) {
        case ACCOUNT_TYPES.SUBJECT_401K:
          startingBalance = inputs.subject401kStartingBalance || 0;
          interestRate = inputs.trad401kInterestRate || 0;
          break;

        case ACCOUNT_TYPES.PARTNER_401K:
          startingBalance = inputs.spouse401kStartingBalance || 0;
          interestRate = inputs.spouseTrad401kInterestRate || 0;
          break;

        case ACCOUNT_TYPES.SUBJECT_ROTH_IRA:
          startingBalance = inputs.subjectRothStartingBalance || 0;
          interestRate = inputs.tradRothInterestRate || 0;
          break;

        case ACCOUNT_TYPES.PARTNER_ROTH_IRA:
          startingBalance = inputs.spouseRothStartingBalance || 0;
          interestRate = inputs.spouseRothInterestRate || 0;
          break;

        case ACCOUNT_TYPES.SAVINGS:
          startingBalance = inputs.savingsStartingBalance || 0;
          interestRate = inputs.savingsInterestRate || 0;
          break;

        // All other account types default to 0 balance and 0% interest
        default:
          startingBalance = 0;
          interestRate = 0;
          break;
      }

      const account = Account.createWithOpeningBalance(
        accountType,
        startingBalance,
        new Date(inputs.currentYear, 0, 1),
        interestRate
      );

      accountsMap.set(accountType, account);
    }

    return new AccountsManager(accountsMap);

    // const subjectSocialSecurity = new Account(
    //   ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
    //   0,
    //   0
    // );

    // const spouseSocialSecurity = new Account(
    //   ACCOUNT_TYPES.SPOUSE_SOCIAL_SECURITY,
    //   0,
    //   0
    // );

    // const subject401k = new Account(
    //   ACCOUNT_TYPES.SUBJECT_401K,
    //   inputs.subject401kStartingBalance,
    //   inputs.trad401kInterestRate
    // );
    // const spouse401k = new Account(
    //   ACCOUNT_TYPES.PARTNER_401K,
    //   inputs.spouse401kStartingBalance,
    //   inputs.spouseTrad401kInterestRate
    // );

    // const subjectPension = new Account(ACCOUNT_TYPES.SUBJECT_PENSION, 0, 0);
    // const spousePension = new Account(ACCOUNT_TYPES.SPOUSE_PENSION, 0, 0);

    // const subjectRothIra = new Account(
    //   ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    //   inputs.subjectRothStartingBalance,
    //   inputs.tradRothInterestRate
    // );
    // const spouseRothIra = new Account(
    //   ACCOUNT_TYPES.PARTNER_ROTH_IRA,
    //   inputs.spouseRothStartingBalance,
    //   inputs.spouseRothInterestRate
    // );
    // const savings = new Account(
    //   ACCOUNT_TYPES.SAVINGS,
    //   inputs.savingsStartingBalance,
    //   inputs.savingsInterestRate
    // );

    // const revenue = new Account(ACCOUNT_TYPES.LIVINGEXPENSESFUND, 0, 0);
    // const disbursement = new Account(ACCOUNT_TYPES.DISBURSEMENT_TRACKING, 0, 0);
    // const taxes = new Account(ACCOUNT_TYPES.TAXES, 0, 0);
    // const withholdings = new Account(ACCOUNT_TYPES.WITHHOLDINGS, 0, 0);
    // return new AccountsManager(
    //   subjectSocialSecurity,
    //   spouseSocialSecurity,
    //   subject401k,
    //   spouse401k,
    //   subjectPension,
    //   spousePension,
    //   subjectRothIra,
    //   spouseRothIra,
    //   savings,
    //   revenue,
    //   disbursement,
    //   taxes,
    //   withholdings
    // );
  }

  /**
   * @param {ACCOUNT_TYPES} accountType
   * @returns {Account}
   */
  #getAccountByType(accountType) {
    const account = this.#accountsByType.get(accountType);
    if (account) {
      return account;
    }
    throw new Error(`Account type not found: ${accountType}`);
  }

  get subject401k() {
    return this.#getAccountByType(ACCOUNT_TYPES.SUBJECT_401K);
  }

  get spouseTrad401k() {
    return this.#getAccountByType(ACCOUNT_TYPES.PARTNER_401K);
  }

  get subjectRothIra() {
    return this.#getAccountByType(ACCOUNT_TYPES.SUBJECT_ROTH_IRA);
  }

  get savings() {
    return this.#getAccountByType(ACCOUNT_TYPES.SAVINGS);
  }

  get income() {
    return this.#getAccountByType(ACCOUNT_TYPES.LIVINGEXPENSESFUND);
  }

  get disbursement() {
    return this.#getAccountByType(ACCOUNT_TYPES.DISBURSEMENT_TRACKING);
  }

  /**
   * @param {number | null} yyyy
   */
  toJSON(yyyy = null) {
    return {
      trad401k: this.subject401k?.toJSON(yyyy),
      rothIra: this.subjectRothIra?.toJSON(yyyy),
      savings: this.savings?.toJSON(yyyy),
      income: this.income?.toJSON(yyyy),
      disbursement: this.disbursement?.toJSON(yyyy),
    };
  }

  /**
   * @param {string} json
   */
  static fromJSON(json) {
    const obj = typeof json === "string" ? JSON.parse(json) : json;
    const accountsMap = new Map();

    for (const [_, accountType] of Object.entries(ACCOUNT_TYPES)) {
      const key =
        typeof accountType === "symbol" ? accountType.description : accountType;
      if (obj[key]) {
        accountsMap.set(accountType, Account.fromJSON(obj[key]));
      }
    }

    return new AccountsManager(accountsMap);
    // const obj = typeof json === "string" ? JSON.parse(json) : json;
    // return new AccountsManager(
    //   Account.fromJSON(obj.subjectSocialSecurity),
    //   Account.fromJSON(obj.spouseSocialSecurity),
    //   Account.fromJSON(obj.trad401k),
    //   Account.fromJSON(obj.spouseTrad401k),
    //   Account.fromJSON(obj.subjectPension),
    //   Account.fromJSON(obj.spousePension),
    //   Account.fromJSON(obj.rothIra),
    //   Account.fromJSON(obj.spouseRothIra),
    //   Account.fromJSON(obj.savings),
    //   Account.fromJSON(obj.income),
    //   Account.fromJSON(obj.disbursement),
    //   Account.fromJSON(obj.taxes),
    //   Account.fromJSON(obj.withholdings)
    // );
  }

  // Utility methods for account group analysis
  getAllAccounts() {
    return [this.subject401k, this.subjectRothIra, this.savings, this.income];
  }

  /**
   * @param {number} year
   */
  getTotalBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.endingBalanceForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalStartingBalance(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.endingBalanceForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalWithdrawals(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.withdrawalsForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   */
  getTotalDeposits(year) {
    return this.getAllAccounts().reduce((total, account) => {
      return total + (account?.depositsForYear(year) ?? 0);
    }, 0);
  }

  /**
   * @param {number} year
   * @param {string} calculationMethod
   */
  getTotalInterestEarned(year, calculationMethod) {
    return this.getAllAccounts().reduce((total, account) => {
      return (
        total +
        (account?.calculateInterestForYear(calculationMethod, year) ?? 0)
      );
    }, 0);
  }

  /**
   * @param {ACCOUNT_TYPES} name
   */
  getAccountByType(name) {
    return this.#accountsByType.get(name);
  }

  /**
   * @param {number} year
   */
  hasPositiveBalance(year) {
    return this.getTotalBalance(year) > 0;
  }

  /**
   * @param {number} year
   */
  getBalanceBreakdown(year) {
    return {
      trad401k: this.subject401k?.endingBalanceForYear(year) ?? 0,
      rothIra: this.subjectRothIra?.endingBalanceForYear(year) ?? 0,
      savings: this.savings?.endingBalanceForYear(year) ?? 0,
      total: this.getTotalBalance(year),
    };
  }

  // Method to get accounts in withdrawal order
  /**
   * @param {string[]} withdrawalOrder
   */
  getAccountsInOrder(withdrawalOrder) {
    if (!Array.isArray(withdrawalOrder)) {
      return this.getAllAccounts();
    }

    return withdrawalOrder
      .map((accountType) => {
        switch (accountType) {
          case "SAVINGS":
            return this.savings;
          case "TRADITIONAL_401K":
            return this.subject401k;
          case "ROTH_IRA":
            return this.subjectRothIra;
          default:
            return null;
        }
      })
      .filter((account) => account !== null);
  }
}

export { AccountsManager };
