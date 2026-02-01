import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { FiscalData } from "./cFiscalData.js";
import { Demographics } from "./cDemographics.js";
import { EnumBase } from "./cEnum.js";
import { Trad401kAvailabilityManager } from "./cTrad401kAvailabilityManager.js";
import { AccountPortioner401k } from "./cAccountPortioner401k.js";
import { TransactionCategory } from "./cTransaction.js";

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

  // /** @param {number} cashOnHand */
  // calculatePortions(cashOnHand) {
  //   const annualSpend = this.#fiscalData.spend.asCurrency();
  //   let ask = annualSpend - cashOnHand.asCurrency();

  //   if (ask <= 0) return;

  //   // to prevent never reaching zero, if the fund is less than $100 remaining, just take it all

  //   let availableSavings = this.#availableSavings.asCurrency();
  //   if (availableSavings > 0 && availableSavings < 100) {
  //     ask -= availableSavings;
  //     this.#savingsWithdrawal = availableSavings;
  //     availableSavings = 0;
  //   }

  //   let available401k =
  //     this.#trad401kAccountPortioner.combined401kTakehomeAvailable.asCurrency();
  //   if (available401k > 0 && available401k < 100) {
  //     ask -= available401k;
  //     this.#final401kPortions = new AccountPortioner401k(
  //       this.#trad401kAccountPortioner,
  //       available401k.asCurrency(),
  //       available401k.asCurrency(),
  //       this.#fiscalData
  //     );
  //     available401k = 0;
  //   }

  //   let availableRoth = this.#availableRoth.asCurrency();
  //   if (availableRoth > 0 && availableRoth < 100) {
  //     ask -= availableRoth;
  //     this.#rothIraWithdrawal = availableRoth;
  //     availableRoth = 0;
  //   }

  //   ask = Math.max(ask, 0).asCurrency();

  //   let totalFundsAvailable = availableSavings + available401k + availableRoth;

  //   totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

  //   if (available401k.asCurrency() > 0 && ask > 0) {
  //     this.#final401kPortions = this.#determineFinal401kPortions(
  //       this.#trad401kAccountPortioner,
  //       ask,
  //       totalFundsAvailable
  //     );
  //     ask -= this.#final401kPortions.combinedFinalWithdrawalNet.asCurrency();
  //   }

  //   ask = Math.max(ask, 0).asCurrency();

  //   totalFundsAvailable = this.#availableSavings + this.#availableRoth;
  //   totalFundsAvailable = Math.max(totalFundsAvailable, 0).asCurrency();

  //   let withdrawFromSavings = 0;
  //   if (availableSavings > 0 && ask > 0) {
  //     const pctThatIsSavings =
  //       totalFundsAvailable > 0
  //         ? this.#availableSavings / totalFundsAvailable
  //         : 0;
  //     withdrawFromSavings = (ask * pctThatIsSavings).asCurrency();
  //     this.#savingsWithdrawal = withdrawFromSavings;
  //   }

  //   let withdrawFromRoth = 0;
  //   if (availableRoth > 0 && ask > 0) {
  //     const pctThatIsRoth =
  //       totalFundsAvailable > 0 ? this.#availableRoth / totalFundsAvailable : 0;
  //     withdrawFromRoth = (ask * pctThatIsRoth).asCurrency();
  //     this.#rothIraWithdrawal = withdrawFromRoth;
  //   }

  //   const withdrawFrom401k =
  //     this.#final401kPortions?.combinedFinalWithdrawalNet ?? 0;

  //   let totalWithdrawals =
  //     withdrawFrom401k + withdrawFromSavings + withdrawFromRoth;

  //   this.#totalActualWithdrawals = totalWithdrawals.asCurrency();

  // }

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

  // #rothIraPortion() {
  //   return this.#totalAvailable() > 0
  //     ? this.#tradRothAvailable() / this.#totalAvailable()
  //     : 0;
  // }

  // #totalAvailable() {
  //   return (
  //     this.#savingsAvailable() +
  //     this.#actual401kAvailable() +
  //     this.#tradRothAvailable()
  //   );
  // }

  // get savingsPortion() {
  //   return (this.#savingsPortion() * this.#ask).asCurrency();
  // }

  // get trad401kPortion() {
  //   return (this.#actual401kPortion() * this.#ask).asCurrency();
  // }

  // get rothPortion() {
  //   return (this.#rothIraPortion() * this.#ask).asCurrency();
  // }

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

  // calculatePortions() {
  //   let ask = this.#fiscalData.spend;

  //   // estimated income from SS, pension, RMDs, etc. will reduce the "ask"
  //   const netFixedIncome = this.#fixedIncomeStreams.totalActualFixedIncome;

  //   ask = (ask - netFixedIncome).asCurrency();

  //   if (ask <= 0) {
  //     this.#ask = 0;
  //     return;
  //   }

  //   const rmd = Common.calculateRMD(
  //     this.#fiscalData.useRmd,
  //     this.#demographics.currentAge,
  //     this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K)
  //   );

  //   const available401k = this.#actual401kAvailable();

  //   // We know what the "ask" is, so we can interpolate the portions based on a binary search
  //   let lo = 0;
  //   let hi = Math.min(ask * 2, this.#actual401kAvailable());

  //   this.#ask = hi;
  //   const maximumIterations = 80;
  //   let guestimatedVariableIncomeNeeded = 0;

  //   let incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

  //   if (incomeBreakdown?.netIncome.asCurrency() < ask) {
  //     for (let i = 0; i < maximumIterations; i++) {
  //       this.#ask = (lo + hi) / 2;

  //       incomeBreakdown = this.#calculateIncomeBreakdown(this.trad401kAsk);

  //       const netIncome = incomeBreakdown?.netIncome.asCurrency() ?? 0;

  //       if (netIncome == ask.asCurrency()) break;
  //       if (netIncome < ask) lo = guestimatedVariableIncomeNeeded;
  //       else hi = guestimatedVariableIncomeNeeded;
  //       if (hi.asCurrency() - lo.asCurrency() <= 0.01) break;
  //     }
  //   }
  // }

  // /** @param {number} variableIncomeAmount
  //  * @return {IncomeBreakdown}
  //  */
  // #calculateIncomeBreakdown(variableIncomeAmount) {
  //   const incomeStream =
  //     this.#retirementIncomeCalculator.calculateIncomeBreakdown(
  //       variableIncomeAmount,
  //       this.#incomeStreams
  //     );

  //   return incomeStream;
  // }
}

export { AccountPortioner };
