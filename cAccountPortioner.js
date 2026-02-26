import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { Demographics } from "./cDemographics.js";
import { EnumBase } from "./cEnum.js";
import { Trad401kAvailabilityManager } from "./cTrad401kAvailabilityManager.js";
import { AccountPortioner401k } from "./cAccountPortioner401k.js";
import { Common } from "./cCommon.js";

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

  /**
   * CORE ALGORITHM: Determines how much to withdraw from each account type to meet spending needs
   *
   * This is a multi-phase algorithm that intelligently allocates withdrawals across:
   * - Savings (taxable)
   * - Roth IRA (tax-free)
   * - Traditional 401k accounts (taxable, with complex RMD rules)
   *
   * The algorithm prioritizes:
   * 1. Draining small "immaterial" balances first (cleanup)
   * 2. Strategic 401k withdrawals (policy-driven, tax-aware)
   * 3. Proportional allocation across remaining accounts
   *
   * @param {number} cashOnHand - Money available without withdrawals (income, etc.)
   */
  calculatePortions(cashOnHand) {
    // Thresholds for determining when account balances are too small to bother with
    const MIN_WITHDRAWAL = 200; // Don't withdraw less than $200 from any account
    const MIN_PCT_OF_TOTAL = 0.01; // Don't leave balances < 1% of total available

    // ============================
    // Helper Functions & Types
    // ============================

    /**
     * Represents an account that can have money withdrawn from it
     * @typedef {Object} WithdrawalAccount
     * @property {string} key - Account identifier ("savings", "roth", etc.)
     * @property {number} available - How much money is available to withdraw
     * @property {number} min - Minimum withdrawal amount (avoid tiny withdrawals)
     * @property {(amt:number)=>void} setWithdrawal - Function to record withdrawal amount
     */

    /**
     * Determines whether an account balance is too small to be worth preserving.
     * Small balances get drained entirely to avoid complexity and tiny leftovers.
     *
     * @param {number} amount - The account balance to check
     * @param {number} total - Total available funds across all accounts
     * @param {number} minAmount - Absolute minimum threshold (e.g., $200)
     * @param {number} minPct - Percentage threshold (e.g., 1% of total)
     * @returns {boolean} True if balance should be drained entirely
     */
    function isImmaterialBalance(amount, total, minAmount, minPct) {
      if (amount <= 0) return false; // No balance = not immaterial
      if (amount < minAmount) return true; // Below absolute minimum

      const pct = amount / total;
      return total > 0 && pct < minPct; // Below percentage threshold
    }

    /**
     * Allocates a requested amount proportionally across accounts based on their available balances.
     * Simple proportional distribution: bigger accounts get bigger share.
     *
     * @param {number} ask - Total amount to allocate
     * @param {WithdrawalAccount[]} accounts - Accounts to allocate across
     * @returns {{key:string, account:WithdrawalAccount, withdrawal:number}[]} Allocation results with withdrawal amounts
     */
    function allocateProportionally(ask, accounts) {
      const totalAvailable = accounts.reduce((sum, a) => sum + a.available, 0);

      if (totalAvailable <= 0 || ask <= 0) return [];

      const finalAsk = Math.min(totalAvailable, ask); // Can't withdraw more than available

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
     * Smart allocation that respects minimum withdrawal amounts per account.
     * If proportional allocation would give an account less than its minimum,
     * that account is removed from consideration and allocation is re-run.
     * This prevents scenarios like withdrawing $50 from savings when minimum is $200.
     *
     * @param {number} ask - Total amount to allocate
     * @param {WithdrawalAccount[]} accounts - Accounts to allocate across
     * @returns {{key:string, account:WithdrawalAccount, withdrawal:number}[]} Final allocation results respecting minimums
     */
    function allocateWithMinimums(ask, accounts) {
      let remainingAsk = ask.asCurrency();
      let eligible = [...accounts]; // Start with all accounts eligible

      /** @type {{key:string, account:WithdrawalAccount, withdrawal:number}[]} */
      const final = [];

      // Iterative process: keep trying until all accounts meet minimum thresholds
      while (eligible.length > 0 && remainingAsk > 0) {
        const allocations = allocateProportionally(remainingAsk, eligible);

        // Find accounts that would get less than their minimum withdrawal
        const tooSmall = allocations.filter(
          (a) => a.withdrawal > 0 && a.withdrawal < a.account.min
        );

        if (tooSmall.length === 0) {
          // Success! All amounts meet minimums, we're done
          return final.concat(allocations);
        }

        // Remove accounts with too-small allocations and try again
        for (const a of tooSmall) {
          a.account.setWithdrawal(0); // Zero out the too-small withdrawal
          eligible = eligible.filter((e) => e.key !== a.key); // Remove from next iteration
        }

        // Recalculate remaining ask for next iteration
        remainingAsk = (
          ask - final.reduce((s, a) => s + a.withdrawal, 0)
        ).asCurrency();
      }

      return final;
    }

    // ============================
    // PHASE 1: Calculate Withdrawal Need ("Ask")
    // ============================

    // The "ask" is how much we need to withdraw from accounts to meet spending goals
    // Formula: Total Annual Spending - Available Cash = Amount Needed from Accounts
    const annualSpend = this.#fiscalData.spend.asCurrency();
    let ask = annualSpend - cashOnHand.asCurrency();

    this.#ask = ask; // Store for external access

    // Early exit: If we have enough cash on hand, no withdrawals needed
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
    // PHASE 2: Drain Immaterial Generic Account Balances
    // ============================

    // Strategy: Before doing complex proportional allocation, first drain any accounts
    // with balances so small they're not worth preserving (< $200 or < 1% of total).
    // This simplifies the remaining allocation and avoids tiny leftover balances.

    // Calculate total funds available across ALL account types for percentage calculations
    const totalSpendCapableFunds =
      genericAccountDefs.reduce((s, a) => s + a.getAvailable(), 0) +
      this.#trad401kAccountPortioner.combined401kTakehomeAvailable.asCurrency();

    /** @type {WithdrawalAccount[]} */
    const remainingGenericAccounts = [];

    // Check each generic account (savings, Roth) for immaterial balances
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
        // DRAIN: Withdraw entire balance and reduce our ask accordingly
        acct.setWithdrawal(available);
        ask -= available;
        console.log(`Draining immaterial account ${acct.key}: $` + available);
      } else if (available > 0) {
        // PRESERVE: Account has material balance, save for later proportional allocation
        remainingGenericAccounts.push({
          key: acct.key,
          available,
          min: acct.min,
          setWithdrawal: acct.setWithdrawal,
        });
      }
    }

    ask = Math.max(ask, 0).asCurrency(); // Ensure ask doesn't go negative

    // ============================
    // PHASE 2B: Handle Immaterial 401k Balances (Special Case)
    // ============================

    // 401k accounts get special treatment because they're complex (RMDs, penalties, etc.)
    // But if the total 401k balance is immaterial, just drain it entirely to simplify

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
      // DRAIN 401k: Create a portioner that withdraws the entire immaterial balance
      this.#final401kPortions = new AccountPortioner401k(
        this.#trad401kAccountPortioner,
        available401k, // ask = entire balance
        available401k, // totalFunds = entire balance (100% weight)
        this.#fiscalData
      );

      ask -= available401k; // Reduce our remaining ask
      available401k = 0; // Mark as consumed
    }

    ask = Math.max(ask, 0).asCurrency();

    // ============================
    // PHASE 3: Strategic 401k Allocation (Policy Engine)
    // ============================

    // This is the most complex phase: 401k withdrawals have many constraints:
    // - RMDs (Required Minimum Distributions) after age 73
    // - Early withdrawal penalties before 59.5
    // - Tax implications (traditional vs Roth 401k)
    // - Multiple 401k accounts (subject + partner) with different rules
    //
    // The AccountPortioner401k class handles all this complexity using policy rules

    // Calculate total remaining funds (for proportional weighting)
    let fundsForWeighting =
      remainingGenericAccounts.reduce((s, a) => s + a.available, 0) +
      available401k;

    fundsForWeighting = Math.max(fundsForWeighting, 0).asCurrency();

    if (available401k > 0 && ask > 0) {
      // Delegate complex 401k allocation to specialized policy engine
      // This considers RMDs, penalties, tax implications, and withdrawal order
      this.#final401kPortions = this.#determineFinal401kPortions(
        ask, // How much we're asking for
        fundsForWeighting // Total funds available (for % weighting)
      );

      // Reduce ask by what we actually got from 401k accounts
      ask -= this.#final401kPortions.combinedFinalWithdrawalNet.asCurrency();
    }

    ask = Math.max(ask, 0).asCurrency();

    // ============================
    // PHASE 4: Proportional Multi-Account Allocation
    // ============================

    // Final phase: Allocate remaining ask proportionally across generic accounts
    // (savings, Roth IRA, etc.) that survived the immaterial balance cleanup.
    //
    // The allocateWithMinimums function handles edge cases:
    // - Ensures no withdrawal is below MIN_WITHDRAWAL threshold
    // - Iteratively removes accounts that would get too-small allocations
    // - Redistributes their portions to remaining accounts

    const allocations = allocateWithMinimums(ask, remainingGenericAccounts);

    // Apply the calculated allocations to each account
    for (const a of allocations) {
      a.account.setWithdrawal(a.withdrawal);
    }

    // ============================
    // PHASE 5: Calculate and Store Total Withdrawals
    // ============================

    // Sum up all actual withdrawals across all account types for reporting.
    // This may be less than the original "ask" if we don't have enough funds,
    // or more than the ask if we had to drain immaterial balances.

    const allWithdrawalSources = [
      ...genericAccountDefs.map((a) => a.getWithdrawal), // Savings, Roth, etc.
      () => this.#final401kPortions?.combinedFinalWithdrawalNet ?? 0, // All 401k accounts
    ];

    // Store final result for external access (used by GAAP accounting, reports, etc.)
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

  get portionedGross401kAmountCombined() {
    const result =
      this.trad401kAccountPortions?.combinedFinalWithdrawalGross ?? 0;
    return Math.max(result, 0);
  }

  get subjectGross401kFundsAvailable() {
    const result = this.#demographics.isSubjectEligibleFor401k
      ? this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.SUBJECT_401K])
      : 0;
    return result;
  }

  get partnerGross401kFundsAvailable() {
    const result = this.#demographics.isPartnerEligibleFor401k
      ? this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.PARTNER_401K])
      : 0;
    return result;
  }

  get combinedGross401kFundsAvailable() {
    return (
      this.subjectGross401kFundsAvailable + this.partnerGross401kFundsAvailable
    );
  }

  // get subject401kPortion() {
  //   if (this.combinedGross401kFundsAvailable === 0) return 0;

  //   if (!this.#demographics.hasPartner) return 1;

  //   return (
  //     this.subjectGross401kFundsAvailable / this.combinedGross401kFundsAvailable
  //   );
  // }

  // get partner401kPortion() {
  //   if (this.combinedGross401kFundsAvailable === 0) return 0;

  //   if (!this.#demographics.hasPartner) return 0;

  //   return 1 - this.subject401kPortion;
  // }

  get combinedGross401kWithdrawalAmount() {
    return this.#final401kPortions?.combinedFinalWithdrawalGross ?? 0;
    // Take the lesser of the portioned gross amount and the available funds
    return Math.min(
      this.portionedGross401kAmountCombined,
      this.combinedGross401kFundsAvailable
    );
  }

  get subjectGross401kWithdrawalAmount() {
    return this.#final401kPortions?.subjectFinalWithdrawalGross ?? 0;
    // return this.subject401kPortion * this.combinedGross401kWithdrawalAmount;
  }

  get subjectNet401kWithdrawalAmount() {
    return this.#final401kPortions?.subjectFinalWithdrawalNet;
    const actualAmount = Common.convertGross401kToActual401k(
      this.subjectGross401kWithdrawalAmount,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );
    return actualAmount;
  }

  get partnerGross401kWithdrawalAmount() {
    return this.#final401kPortions?.partnerFinalWithdrawalGross ?? 0;
    // return this.partner401kPortion * this.combinedGross401kWithdrawalAmount;
  }

  get partnerNetWithdrawalAmount() {
    return this.#final401kPortions?.partnerFinalWithdrawalNet ?? 0;
    const actualAmount = Common.convertGross401kToActual401k(
      this.partnerGross401kWithdrawalAmount,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );
    return actualAmount;
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
