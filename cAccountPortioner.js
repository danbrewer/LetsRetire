import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { Demographics } from "./cDemographics.js";
import { EnumBase } from "./cEnum.js";
import { Trad401kAvailabilityManager } from "./cTrad401kAvailabilityManager.js";
import { AccountPortioner401k } from "./cAccountPortioner401k.js";

const ProportionStrategyNames = /** @type {const} */ ({
  EqualShares: "equalShares",
  NontaxableFirst: "nontaxableFirst",
  TaxableFirst: "taxableFirst",
  Custom: "custom",
});

/**
 * @typedef {typeof ProportionStrategyNames[keyof typeof ProportionStrategyNames]} ProportionStrategyName
 */

class ProportionStrategyEnum extends EnumBase {
  static dumpOrder = [
    "ask",
    "totalActualWithdrawals",
    "savingsWithdrawal",
    "rothIraWithdrawal",
    "trad401kWithdrawal",
  ];

  constructor() {
    super("ProportionStrategy", Object.values(ProportionStrategyNames));
  }

  get EqualShares() {
    return this.map.equalShares;
  }

  get NontaxableFirst() {
    return this.map.nontaxableFirst;
  }

  get TaxableFirst() {
    return this.map.taxableFirst;
  }

  get Custom() {
    return this.map.custom;
  }

  /**
   * @param {symbol} sym
   * @returns {ProportionStrategyName}
   */
  toName(sym) {
    const name = super.toName(sym);
    if (!name)
      throw new Error(`Invalid ProportionStrategy symbol: ${String(sym)}`);
    return /** @type {ProportionStrategyName} */ (name);
  }
}

const ProportionStrategy = new ProportionStrategyEnum();

/**
 * @typedef {typeof ProportionStrategy.EqualShares
 *         | typeof ProportionStrategy.NontaxableFirst
 *         | typeof ProportionStrategy.TaxableFirst
 *         | typeof ProportionStrategy.Custom} ProportionStrategySymbol
 */

class AccountPortioner {
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {Demographics} */
  #demographics;

  /** @type {number} */
  #totalActualWithdrawals = 0;

  /** @type {Trad401kAvailabilityManager} */
  #trad401kAccountPortioner;

  /** @type {AccountPortioner401k | null} */
  #final401kPortions = null;
  /** @type {number} */
  #ask = 0;

  get totalActualWithdrawals() {
    return this.#totalActualWithdrawals;
  }

  /** @type {number} */
  #savingsWithdrawal = 0;

  get savingsWithdrawal() {
    return this.#savingsWithdrawal.asCurrency();
  }

  /** @type {number} */
  #rothIraWithdrawal = 0;

  get rothIraWithdrawal() {
    return this.#rothIraWithdrawal.asCurrency();
  }

  get trad401kWithdrawal() {
    return (
      this.#final401kPortions?.combinedFinalWithdrawalNet.asCurrency() ?? 0
    );
  }

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   */
  constructor(accountYear, fiscalData, demographics) {
    this.#accountYear = accountYear;
    this.#demographics = demographics;
    this.#fiscalData = fiscalData;
    this.#trad401kAccountPortioner = new Trad401kAvailabilityManager(
      this.#fiscalData,
      this.#demographics,
      this.#accountYear
    );
  }

  get ask() {
    return this.#ask;
  }

  get trad401kAccountPortions() {
    return this.#final401kPortions;
  }

  /** @param {number} cashOnHand */
  calculatePortions(cashOnHand) {
    const MIN_WITHDRAWAL = 200;
    const MIN_PCT_OF_TOTAL = 0.01;

    // ============================
    // Helper functions & types
    // ============================

    /**
     * @typedef {Object} WithdrawalAccount
     * @property {string} key
     * @property {number} available
     * @property {number} min
     * @property {(amt:number)=>void} setWithdrawal
     */

    /**
     * Determines whether an account balance is immaterial and should be drained.
     *
     * @param {number} amount
     * @param {number} total
     * @param {number} minAmount
     * @param {number} minPct
     * @returns {boolean}
     */
    function isImmaterialBalance(amount, total, minAmount, minPct) {
      if (amount <= 0) return false;
      if (amount < minAmount) return true;

      const pct = amount / total;

      return total > 0 && pct < minPct;
    }

    /**
     * @param {number} ask
     * @param {WithdrawalAccount[]} accounts
     */
    function allocateProportionally(ask, accounts) {
      const totalAvailable = accounts.reduce((sum, a) => sum + a.available, 0);

      if (totalAvailable <= 0 || ask <= 0) return [];

      const finalAsk = Math.min(totalAvailable, ask);

      return accounts.map((account) => ({
        key: account.key,
        account,
        withdrawal: (
          (finalAsk * account.available) /
          totalAvailable
        ).asCurrency(),
      }));
    }

    /**
     * @param {number} ask
     * @param {WithdrawalAccount[]} accounts
     */
    function allocateWithMinimums(ask, accounts) {
      let remainingAsk = ask.asCurrency();
      let eligible = [...accounts];

      /** @type {{key:string, account:WithdrawalAccount, withdrawal:number}[]} */
      const final = [];

      while (eligible.length > 0 && remainingAsk > 0) {
        const allocations = allocateProportionally(remainingAsk, eligible);

        const tooSmall = allocations.filter(
          (a) => a.withdrawal > 0 && a.withdrawal < a.account.min
        );

        if (tooSmall.length === 0) {
          return final.concat(allocations);
        }

        for (const a of tooSmall) {
          a.account.setWithdrawal(0);
          eligible = eligible.filter((e) => e.key !== a.key);
        }

        remainingAsk = (
          ask - final.reduce((s, a) => s + a.withdrawal, 0)
        ).asCurrency();
      }

      return final;
    }

    // ============================
    // Phase 1: Determine ask
    // ============================

    const annualSpend = this.#fiscalData.spend.asCurrency();

    let ask = annualSpend - cashOnHand.asCurrency();

    this.#ask = ask;

    if (ask <= 0) {
      this.#totalActualWithdrawals = 0;
      return;
    }

    // ============================
    // Generic account definitions
    // ============================

    const genericAccountDefs = [
      {
        key: "savings",
        getAvailable: () => this.#availableSavings.asCurrency(),
        setWithdrawal: (/** @type {number} */ amt) =>
          (this.#savingsWithdrawal = amt),
        getWithdrawal: () => this.#savingsWithdrawal ?? 0,
        min: MIN_WITHDRAWAL,
      },
      {
        key: "roth",
        getAvailable: () => this.#availableRoth.asCurrency(),
        setWithdrawal: (/** @type {number} */ amt) =>
          (this.#rothIraWithdrawal = amt),
        getWithdrawal: () => this.#rothIraWithdrawal ?? 0,
        min: MIN_WITHDRAWAL,
      },
      // brokerage / HSA later
    ];

    // ============================
    // Phase 2: Drain immaterial GENERIC balances
    // ============================

    const totalSpendCapableFunds =
      genericAccountDefs.reduce((s, a) => s + a.getAvailable(), 0) +
      this.#trad401kAccountPortioner.combined401kTakehomeAvailable.asCurrency();

    /** @type {WithdrawalAccount[]} */
    const remainingGenericAccounts = [];

    for (const acct of genericAccountDefs) {
      const available = acct.getAvailable();

      if (
        isImmaterialBalance(
          available,
          totalSpendCapableFunds,
          acct.min,
          MIN_PCT_OF_TOTAL
        )
      ) {
        acct.setWithdrawal(available);
        ask -= available;
        console.log(`Draining immaterial account ${acct.key}: $` + available);
      } else if (available > 0) {
        remainingGenericAccounts.push({
          key: acct.key,
          available,
          min: acct.min,
          setWithdrawal: acct.setWithdrawal,
        });
      }
    }

    ask = Math.max(ask, 0).asCurrency();

    // ============================
    // Phase 2b: Drain immaterial 401k (special)
    // ============================

    let available401k =
      this.#trad401kAccountPortioner.combined401kTakehomeAvailable.asCurrency();

    if (
      isImmaterialBalance(
        available401k,
        totalSpendCapableFunds,
        MIN_WITHDRAWAL,
        MIN_PCT_OF_TOTAL
      )
    ) {
      this.#final401kPortions = new AccountPortioner401k(
        this.#trad401kAccountPortioner,
        available401k,
        available401k,
        this.#fiscalData
      );

      ask -= available401k;
      available401k = 0;
    }

    ask = Math.max(ask, 0).asCurrency();

    // ============================
    // Phase 3: 401k allocation (policy engine)
    // ============================

    let fundsForWeighting =
      remainingGenericAccounts.reduce((s, a) => s + a.available, 0) +
      available401k;

    fundsForWeighting = Math.max(fundsForWeighting, 0).asCurrency();

    if (available401k > 0 && ask > 0) {
      this.#final401kPortions = this.#determineFinal401kPortions(
        ask,
        fundsForWeighting
      );

      ask -= this.#final401kPortions.combinedFinalWithdrawalNet.asCurrency();
    }

    ask = Math.max(ask, 0).asCurrency();

    // ============================
    // Phase 4: Proportional N-account allocation
    // ============================

    const allocations = allocateWithMinimums(ask, remainingGenericAccounts);

    for (const a of allocations) {
      a.account.setWithdrawal(a.withdrawal);
    }

    // ============================
    // Phase 5: Observe total withdrawals
    // ============================

    const allWithdrawalSources = [
      ...genericAccountDefs.map((a) => a.getWithdrawal),
      () => this.#final401kPortions?.combinedFinalWithdrawalNet ?? 0,
    ];

    this.#totalActualWithdrawals = allWithdrawalSources
      .reduce((sum, getAmt) => sum + getAmt(), 0)
      .asCurrency();
  }

  /**
   * @param {number} ask
   * @param {number} totalFundsAvailable
   */
  #determineFinal401kPortions(ask, totalFundsAvailable) {
    const result = new AccountPortioner401k(
      this.#trad401kAccountPortioner,
      ask,
      totalFundsAvailable,
      this.#fiscalData
    );

    return result;
  }

  #savingsAvailable() {
    return this.#fiscalData.useSavings
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS)
      : 0;
  }

  get #availableSavings() {
    return this.#savingsAvailable();
  }

  get #availableRoth() {
    return this.#availableSubjectRoth + this.#availablePartnerRoth;
  }

  get #availableSubjectRoth() {
    if (this.#fiscalData.useRoth) {
      if (this.#demographics.isSubjectEligibleFor401k) {
        return this.#accountYear.getEndingBalance(
          ACCOUNT_TYPES.SUBJECT_ROTH_IRA
        );
      }
    }
    return 0;
  }

  get #availablePartnerRoth() {
    if (this.#fiscalData.useRoth) {
      if (this.#demographics.isPartnerEligibleFor401k) {
        return this.#accountYear.getEndingBalance(
          ACCOUNT_TYPES.PARTNER_ROTH_IRA
        );
      }
    }
    return 0;
  }

  /**
   * @param {AccountingYear} accountYear
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @returns {AccountPortioner}
   */
  static CreateFrom(accountYear, fiscalData, demographics) {
    const portioner = new AccountPortioner(
      accountYear,
      fiscalData,
      demographics
    );
    return portioner;
  }
}

export { AccountPortioner };
