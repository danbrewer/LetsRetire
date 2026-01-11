import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { IncomeRs } from "./cIncomeRs.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { PERIODIC_FREQUENCY } from "./consts.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingIncomeCalculator } from "./cWorkingIncomeCalculator.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Common } from "./cCommon.js";
import { TaxCalculations } from "./cTaxCalculations.js";
import { Taxes } from "./cTaxes.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
import { SsBenefitsCalculator } from "./cSsBenefitsCalculator.js";

/**
 * WithdrawalFactory class - Handles withdrawal operations for retirement accounts
 * Manages withdrawals from different account types with tax calculations
 */
class WithdrawalFactory {
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;

  /** @type {AdjustableIncomeStreams} */
  #adjustableIncomeStreams;

  /** @type {FiscalData} */
  #fiscalData;

  /** @type {Demographics} */
  #demographics;

  /** @type {AccountingYear} */
  #accountYear;

  /** @type {IncomeBreakdown} */
  #incomeBreakdown;

  // /** @type {WorkingIncomeCalculator} */
  // #workingIncomeCalculator;

  /** @type {AccountPortioner | null} */
  #accountPortioner = null;
  /** @type {number} */
  #ssCombinedTakeHome = 0;

  /** @type {number} */
  #combinedPensionActualIncome = 0;
  /** @type {number} */
  #combinedActualWorkingIncome = 0;
  /** @type {number} */
  #nonTaxableActualIncome = 0;
  /** @type {number} */
  #actualIncome = 0;
  /** @type {number} */
  #actualSpend = 0;

  /** @type {SocialSecurityBreakdown | null} */
  #ssBreakdown = null;

  /** @type {Taxes | null} */
  #taxes = null;

  /**
   * Create withdrawal factory for a specific retirement year
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   */
  constructor(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    fiscalData,
    demographics,
    accountYear
  ) {
    // **************
    // Sanity checks
    // **************
    if (!accountYear) {
      console.error(`accounts is null or undefined.  This is a fatal error`);
      throw new Error("accounts is required");
    }
    // **************

    this.#fixedIncomeStreams = fixedIncomeStreams;
    this.#adjustableIncomeStreams = adjustableIncomeStreams;
    this.#fiscalData = fiscalData;
    this.#demographics = demographics;
    this.#accountYear = accountYear;

    this.#incomeBreakdown = IncomeBreakdown.CreateFrom(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      demographics,
      fiscalData
    );

    this.#accountPortioner = AccountPortioner.CreateFrom(
      this.#accountYear,
      this.#fiscalData,
      this.#demographics,
      this.#fixedIncomeStreams
    );
  }

  processIncome() {
    this.#actualIncome = 0;

    // Dump misc non-taxable income into savings account just to get it accounted for
    this.#processNonTaxableIncome();

    // Process non-variable income streams into savings account
    this.#processCombinedPensionIncomes();
    this.#processCombinedWorkingIncomes();
    this.#processCombinedSocialSecurityIncomes();

    const ask = this.#fiscalData.spend;
    const totalFixedIncome = this.totalFixedIncome;

    // reduce the "ask" by the estimated net income from SS, Pension, etc
    let shortfall = ask - totalFixedIncome;
    this.#determineWithdrawalPortions(shortfall);

    // Take withdrawals in order of Savings, Roth, 401k
    this.#withdrawRothPortion();
    this.#withdrawFromSubject401k();
    this.#withdrawFromPartner401k();

    this.#withdrawFromSavings();

    this.#processActualIncome();

    this.#applyPeriodic401kInterestEarned();
    this.#applyPeriodicRothInterest();
    this.#applyPeriodicSavingsInterest();

    this.#processIncomeTaxes();

    // If still shortfall, we're busted
    shortfall = this.#fiscalData.spend - this.#actualIncome;
    if (shortfall > 0) {
      console.error(`Unable to cover fiscal spend: ${shortfall.toFixed(2)}`);
    }
  }
  #withdrawFromPartner401k() {
    const amount = this.#accountPortioner?.partner401kGrossWithdrawal ?? 0;
    if (amount <= 0) return 0;

    const grossFundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.PARTNER_401K,
    ]);

    if (grossFundsAvailable <= 0) return 0;

    const gross401kWithdrawal = Math.min(amount, grossFundsAvailable);

    this.#adjustableIncomeStreams.spouseActual401kGrossWithdrawal =
      gross401kWithdrawal;

    this.#processGrossPeriodic401kWithdrawals(
      gross401kWithdrawal,
      ACCOUNT_TYPES.PARTNER_401K,
      "Withdrawal from Partner 401k"
    );

    this.#processGrossPeriodic401kIncome(
      gross401kWithdrawal,
      "Partner 401k Income"
    );

    return gross401kWithdrawal;
  }

  #determineSocialSecurityBreakdown() {
    const ssBreakdown = SsBenefitsCalculator.CalculateSsBreakdown(
      this.#demographics,
      this.#fixedIncomeStreams,
      this.#adjustableIncomeStreams
    );

    return ssBreakdown;
  }

  #processIncomeTaxes() {
    this.#ssBreakdown = this.#determineSocialSecurityBreakdown();

    const grossIncome = this.#incomeBreakdown?.grossIncome ?? 0;
    const taxableIncome = grossIncome - this.#ssBreakdown.nonTaxableAmount;

    this.#taxes = Taxes.CreateFromTaxableIncome(
      grossIncome,
      taxableIncome,
      this.#fiscalData,
      this.#demographics
    );
  }

  #processActualIncome() {
    this.#actualSpend = Math.min(this.#actualIncome, this.#fiscalData.spend);

    if (this.#actualIncome == this.#fiscalData.spend) return;

    if (this.#actualIncome > this.#fiscalData.spend) {
      const surplusAmount = this.#actualIncome - this.#fiscalData.spend;
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.Spend,
        surplusAmount,
        PERIODIC_FREQUENCY.MONTHLY,
        "Actual income exceeds spend"
      );
    } else {
      const deficitAmount = this.#fiscalData.spend - this.#actualIncome;
      const availableFunds = this.#accountYear.getAvailableFunds([
        ACCOUNT_TYPES.SAVINGS,
      ]);
      if (availableFunds > 0) {
        const catchupAmount = Math.min(deficitAmount, availableFunds);

        this.#accountYear.processAsPeriodicWithdrawals(
          ACCOUNT_TYPES.SAVINGS,
          TransactionCategory.Spend,
          catchupAmount,
          PERIODIC_FREQUENCY.MONTHLY,
          "Spend exceeds actual income"
        );
        this.#actualIncome += catchupAmount;
      }
    }
  }

  /**
   * @param {number} amountToPortion
   */
  #determineWithdrawalPortions(amountToPortion) {
    this.#accountPortioner?.calculatePortions(amountToPortion);
  }

  #processCombinedWorkingIncomes() {
    this.#combinedActualWorkingIncome =
      this.#incomeBreakdown?.combinedEarnedIncomeTakehome ?? 0;
    if (this.#combinedActualWorkingIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.Income,
      this.#combinedActualWorkingIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Combined Working Income"
    );

    this.#actualIncome += this.#combinedActualWorkingIncome;
  }

  #processCombinedSocialSecurityIncomes() {
    this.#ssCombinedTakeHome =
      this.#fixedIncomeStreams?.combinedSsActualIncome ?? 0;
    if (this.#ssCombinedTakeHome == 0) return;

    // Subject SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.subjectSsActualIncome ?? 0 > 0) {
       this.#accountYear.processAsPeriodicDeposits(
         ACCOUNT_TYPES.LIVINGEXPENSESFUND,
         TransactionCategory.SocialSecurity,
         this.#fixedIncomeStreams.subjectSsActualIncome,
         PERIODIC_FREQUENCY.MONTHLY,
         "Subject SS Income"
       );
    }

    // Spouse SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.spouseSsActualIncome ?? 0 > 0) {
        this.#accountYear.processAsPeriodicDeposits(
          ACCOUNT_TYPES.LIVINGEXPENSESFUND,
          TransactionCategory.SocialSecurity,
          this.#fixedIncomeStreams.spouseSsActualIncome,
          PERIODIC_FREQUENCY.MONTHLY,
          "Spouse SS Income"
        );
    }

    this.#actualIncome += this.#ssCombinedTakeHome;
  }

  #processCombinedPensionIncomes() {
    this.#combinedPensionActualIncome =
      this.#incomeBreakdown?.combinedPensionTakeHome ?? 0;
    if (this.#combinedPensionActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.Pension,
      this.#combinedPensionActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Combined Pension Income"
    );

    this.#actualIncome += this.#combinedPensionActualIncome;
  }

  #processNonTaxableIncome() {
    this.#nonTaxableActualIncome =
      this.#incomeBreakdown?.miscNonTaxableActualIncome ?? 0;

    if (this.#nonTaxableActualIncome == 0) return;

    // this.#accountYear.processAsPeriodicDeposits(
    //   ACCOUNT_TYPES.SAVINGS,
    //   TransactionCategory.OtherNonTaxable,
    //   this.#nonTaxableActualIncome,
    //   PERIODIC_FREQUENCY.MONTHLY,
    //   "Tax-free income"
    // );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.OtherNonTaxable,
      this.#nonTaxableActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Tax-free income"
    );

    this.#actualIncome += this.#nonTaxableActualIncome;
  }

  get totalFixedIncome() {
    return (
      this.#combinedActualWorkingIncome +
      this.#ssCombinedTakeHome +
      this.#combinedPensionActualIncome +
      this.#nonTaxableActualIncome
    );
  }

  #applyPeriodic401kInterestEarned() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SUBJECT_401K);
  }

  #withdrawFromSubject401k() {
    const amount = this.#accountPortioner?.subject401kGrossWithdrawal ?? 0;
    if (amount <= 0) return 0;

    const grossFundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SUBJECT_401K,
    ]);

    if (grossFundsAvailable <= 0) return 0;

    const gross401kWithdrawal = Math.min(amount, grossFundsAvailable);

    this.#adjustableIncomeStreams.subjectActual401kGrossWithdrawal =
      gross401kWithdrawal;

    this.#processGrossPeriodic401kWithdrawals(
      gross401kWithdrawal,
      ACCOUNT_TYPES.SUBJECT_401K,
      "Withdrawal from Subject 401k"
    );

    this.#processGrossPeriodic401kIncome(
      gross401kWithdrawal,
      "Subject 401k Income"
    );

    return gross401kWithdrawal;
  }

  /**
   * @param {number} gross401kWithdrawal
   * @param {string} memo
   */
  #processGrossPeriodic401kIncome(gross401kWithdrawal, memo) {
    const actual401kAmount = Common.convertGross401kToActual401k(
      gross401kWithdrawal,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.Trad401k,
      actual401kAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      memo
    );

    const withholdingAmount = gross401kWithdrawal - actual401kAmount;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.WITHHOLDINGS,
      TransactionCategory.Trad401k,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      `${memo} Withholdings`
    );

    this.#actualIncome += actual401kAmount;
  }

  #applyPeriodicRothInterest() {
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
  }

  /** @return {Number} */
  #withdrawRothPortion() {
    const amount = this.#accountPortioner?.rothIraWithdrawal ?? 0;
    if (amount <= 0) return 0;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
    ]);

    if (avaiableFunds <= 0) return 0;

    const withdrawalAmount = Math.min(amount, avaiableFunds);

    this.#processPeriodicRothTransactions(withdrawalAmount);

    this.#actualIncome += withdrawalAmount;

    return withdrawalAmount;
  }

  // /**
  //  * @param {number} amount
  //  */
  // #calculateIncomeBreakdown(amount) {
  //   return this.#retirementIncomeCalculator.calculateIncomeBreakdown(
  //     this.#fixedIncomeStreams,
  //     this.#adjustableIncomeStreams,
  //     [amount]
  //   );
  // }

  /** @return {Number}  */
  #withdrawFromSavings() {
    const amount = this.#accountPortioner?.savingsWithdrawal ?? 0;
    if (amount <= 0) return amount;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (avaiableFunds <= 0) return 0;

    const withdrawalAmount = Math.min(amount, avaiableFunds);

    this.#processPeriodicSavingsWithdrawals(withdrawalAmount);

    this.#actualIncome += withdrawalAmount;

    return withdrawalAmount;
  }

  #applyPeriodicSavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
  }

  /**
   * Withdraw from a targeted account
   * @param {number} amount - Amount to withdraw
   * @param {string} accountType - Type of account to withdraw from
   * @param {boolean} [trialRun=true] - Whether this is a trial run or actual withdrawal
   * @returns {number} - Net amount received after taxes and fees
   */
  // #withdrawFromTargetedAccount(amount, accountType, trialRun = true) {
  //   // Withdrawal amount to be determined
  //   switch (accountType) {
  //     case ACCOUNT_TYPES.SUBJECT_401K: {
  //       return this.#processTrad401kWithdrawal(amount, trialRun);
  //     }
  //     case ACCOUNT_TYPES.SAVINGS: {
  //       return this.#handleSavingsWithdrawal(amount, trialRun);
  //     }
  //     case ACCOUNT_TYPES.SUBJECT_ROTH_IRA: {
  //       return this.#handleRothWithdrawal(amount, trialRun);
  //     }
  //     default:
  //       console.error("Unsupported account type:", accountType);
  //       return 0;
  //   }
  // }

  // /**
  //  * Handle Traditional 401k withdrawal with tax calculations
  //  * @param {number} desiredNetAmount - Target net amount
  //  * @returns {number} - Net amount received
  //  */
  // #processTrad401kWithdrawal(desiredNetAmount) {
  //   const fundsAvailable = this.#accountYear.getAvailableFunds([
  //     ACCOUNT_TYPES.SUBJECT_401K,
  //   ]);
  //   let gross401kWithdrawal = 0;

  //   if (this.#fiscalData.useTrad401k) {
  //     // const withdrawals =
  //     //   this.#retirementIncomeCalculator.determineGrossAdjustableIncomeNeededToHitNetTargetOf(
  //     //     netTargetAmount,
  //     //     this.#fixedIncomeStreams
  //     //   );

  //     gross401kWithdrawal = Math.min(
  //       Math.max(
  //         this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.SUBJECT_401K]) -
  //           this.#fixedIncomeStreams.subjectRMD,
  //         0
  //       ),
  //       withdrawals.variableIncomeNeededToHitTarget
  //     );
  //   }

  //   // Calculate actual income breakdown using the sophisticated tax calculation
  //   this.#incomeBreakdown =
  //     this.#retirementIncomeCalculator.calculateIncomeBreakdown(
  //       gross401kWithdrawal,
  //       this.#fixedIncomeStreams
  //     );

  //   if (this.#incomeBreakdown == null) {
  //     console.error(
  //       "Income results are null after calculating income with 401k withdrawal."
  //     );
  //     throw new Error("Income results calculation failed.");
  //   }

  //   if (!trialRun) {
  //     this.#processTrad401kTransactions(gross401kWithdrawal);
  //   }

  //   return Math.max(this.#incomeBreakdown.netIncome, 0);
  // }

  /**
   * Process Traditional 401k transactions
   * @param {number} gross401kWithdrawal - Gross withdrawal amount
   * @param {string} accountType - Account type
   * @param {string} memo - Memo for the transaction
   */
  #processGrossPeriodic401kWithdrawals(gross401kWithdrawal, accountType, memo) {
    this.#accountYear.processAsPeriodicWithdrawals(
      accountType,
      TransactionCategory.Disbursement,
      gross401kWithdrawal,
      PERIODIC_FREQUENCY.MONTHLY,
      memo
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
      TransactionCategory.Trad401k,
      gross401kWithdrawal
    );

    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.RMD,
    //   this.#fixedIncomeStreams.subjectRMD
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.Pension,
    //   (this.#incomeBreakdown?.combinedPensionGross ?? 0) +
    //     (this.#incomeBreakdown?.combinedPensionGross ?? 0)
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.SocialSecurity,
    //   this.#incomeBreakdown?.combinedSocialSecurityGross ?? 0
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.SocialSecurity,
    //   this.#incomeBreakdown?.miscTaxableIncome ?? 0
    // );

    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.DISBURSEMENT_TRACKING,
    //   TransactionCategory.Interest,
    //   this.#incomeBreakdown?.interestEarnedOnSavings ?? 0
    // );

    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.CASH,
    //   TransactionCategory.Trad401k,
    //   this.#incomeBreakdown?.trad401kTakeHome ?? 0
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.CASH,
    //   TransactionCategory.Pension,
    //   this.#incomeBreakdown?.pensionTakeHome ?? 0
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.CASH,
    //   TransactionCategory.SocialSecurity,
    //   this.#incomeBreakdown?.socialSecurityTakeHome ?? 0
    // );
    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.CASH,
    //   TransactionCategory.OtherTaxableIncome,
    //   this.#incomeBreakdown?.miscTaxableActualIncome ?? 0
    // );

    // this.#accountYear.deposit(
    //   ACCOUNT_TYPES.CASH,
    //   TransactionCategory.Interest,
    //   this.#incomeBreakdown?.earnedInterestNetIncome ?? 0
    // );
  }

  /**
   * Handle Savings account withdrawal
   * @param {number} amount - Amount needed
   * @param {boolean} trialRun - Whether this is a trial run
   * @returns {number} - Withdrawal amount
   */
  #handleSavingsWithdrawal(amount, trialRun) {
    if (!this.#fiscalData.useSavings) return 0; // already processed a savings withdrawal this year

    const fundsNeeded = amount;
    const fundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (fundsAvailable == 0) return 0;

    // Determine how much to withdraw to meet the desired spend
    let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

    if (!trialRun) {
      this.#processPeriodicSavingsWithdrawals(withdrawalAmount);
    }

    return withdrawalAmount;
  }

  /**
   * Process Savings account transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processPeriodicSavingsWithdrawals(withdrawalAmount) {
    // Log the monthly spending for savings
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Disbursement,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "For monthly spending"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.Savings,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Pull from Savings"
    );

    this.#adjustableIncomeStreams.savingsWithdrawal += withdrawalAmount;
  }

  // /**
  //  * Handle Roth IRA withdrawal
  //  * @param {number} amount - Amount needed
  //  * @returns {number} - Withdrawal amount
  //  */
  // #handleRothWithdrawal(amount) {
  //   // Roth withdrawal (no tax impact)
  //   const fundsNeeded = amount;
  //   const fundsAvailable = this.#accountYear.getAvailableFunds([
  //     ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
  //   ]);

  //   if (fundsAvailable == 0) return 0;

  //   // Determine how much to withdraw to meet the desired spend
  //   let withdrawalAmount = Math.min(fundsAvailable, fundsNeeded);

  //   if (!trialRun) {
  //     this.#processRothTransactions(withdrawalAmount);
  //   }

  //   return withdrawalAmount;
  // }

  /**
   * Process Roth IRA transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processPeriodicRothTransactions(withdrawalAmount) {
    // Reduce the account balance by the net received amount
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      TransactionCategory.Disbursement,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Roth Withdrawal"
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.LIVINGEXPENSESFUND,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
  }

  /**
   * Get the final income results from the last withdrawal calculation
   * @returns {IncomeBreakdown} - Final income results
   */
  get incomeBreakdown() {
    if (!this.#incomeBreakdown) {
      console.error(
        "Income results requested before any withdrawals were processed."
      );
      throw new Error("Income results are not available.");
    }
    return this.#incomeBreakdown;
  }

  get ssBreakdown() {
    if (!this.#ssBreakdown) {
      console.error(
        "Social Security breakdown requested before it was calculated."
      );
      throw new Error("Social Security breakdown is not available.");
    }
    return this.#ssBreakdown;
  }

  get taxes() {
    if (!this.#taxes) {
      console.error("Taxes requested before they were calculated.");
      throw new Error("Taxes are not available.");
    }
    return this.#taxes;
  }

  /**
   * Get available funds for specific account types
   * @param {string[]} accountTypes - Array of account types to check
   * @returns {number} - Total available funds
   */
  getAvailableFunds(accountTypes) {
    return this.#accountYear.getAvailableFunds(accountTypes);
  }

  /**
   * Check if a specific account type is enabled for use
   * @param {string} accountType - Account type to check
   * @returns {boolean} - Whether the account type is enabled
   */
  isAccountTypeEnabled(accountType) {
    switch (accountType) {
      case ACCOUNT_TYPES.SUBJECT_401K:
        return this.#fiscalData.useTrad401k;
      case ACCOUNT_TYPES.SAVINGS:
        return this.#fiscalData.useSavings;
      case ACCOUNT_TYPES.SUBJECT_ROTH_IRA:
        return true; // Roth is typically always available if funds exist
      default:
        return false;
    }
  }

  //   /**
  //    * Get current income streams
  //    * @returns {IncomeStreams} - Current income streams
  //    */
  //   getIncomeStreams() {
  //     return this.fixedIncomeStreams;
  //   }

  //   /**
  //    * Get fiscal data configuration
  //    * @returns {FiscalData} - Fiscal data
  //    */
  //   getFiscalData() {
  //     return this.#fiscalData;
  //   }

  //   /**
  //    * Get demographics information
  //    * @returns {Demographics} - Demographics
  //    */
  //   getDemographics() {
  //     return this.#demographics;
  //   }

  //   /**
  //    * Get account year instance
  //    * @returns {AccountYear} - Account year
  //    */
  //   getAccountYear() {
  //     return this.#accountYear;
  //   }

  //   /**
  //    * Create an empty WithdrawalFactory instance
  //    * @param {AccountYear} accountYear - Account year instance
  //    * @returns {WithdrawalFactory} - Empty withdrawal factory
  //    */
  //   static Empty(accountYear) {
  //     return new WithdrawalFactory(
  //       IncomeStreams.Empty(),
  //       FiscalData.Empty(),
  //       Demographics.Empty(),
  //       accountYear
  //     );
  //   }

  /**
   * @param {FixedIncomeStreams} fixedIncomeStreams
   * @param {AdjustableIncomeStreams} adjustableIncomeStreams
   * @param {FiscalData} fiscalData
   * @param {Demographics} demographics
   * @param {AccountingYear} accountYear
   */
  static CreateUsing(
    fixedIncomeStreams,
    adjustableIncomeStreams,
    fiscalData,
    demographics,
    accountYear
  ) {
    return new WithdrawalFactory(
      fixedIncomeStreams,
      adjustableIncomeStreams,
      fiscalData,
      demographics,
      accountYear
    );
  }
}

// // Legacy function for backward compatibility
// /**
//  * Create withdrawal function for a specific retirement year
//  * @deprecated Use WithdrawalFactory class instead
//  * @param {IncomeStreams} incomeStreams
//  * @param {FiscalData} fiscalData
//  * @param {Demographics} demographics
//  * @param {AccountYear} accountYear
//  */
// function withdrawalFactoryJS_createWithdrawalFactory(
//   incomeStreams,
//   fiscalData,
//   demographics,
//   accountYear
// ) {
//   const factory = new WithdrawalFactory(
//     incomeStreams,
//     fiscalData,
//     demographics,
//     accountYear
//   );

//   return {
//     withdrawFromTargetedAccount:
//       factory.withdrawFromTargetedAccount.bind(factory),
//     getFinalIncomeResults: factory.getFinalIncomeResults.bind(factory),
//   };
// }

export { WithdrawalFactory };
