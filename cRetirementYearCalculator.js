import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { IncomeBreakdown } from "./cIncomeBreakdown.js";
import { Inputs } from "./cInputs.js";
import { PERIODIC_FREQUENCY, TAX_BASE_YEAR } from "./consts.js";
import { RetirementYearResults } from "./cRetirementYearData.js";
import { SsBenefitsCalculator } from "./cSsBenefitsCalculator.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
import { Taxes } from "./cTaxes.js";
import { TransactionCategory } from "./cTransaction.js";
import { WithdrawalFactory } from "./cWithdrawalFactory.js";
import { withLabel } from "./debugUtils.js";

/**
 * @typedef {import("./cTransaction.js").TransactionCategorySymbol} TransactionCategorySymbol
 * @typedef {import("./cTransaction.js").TransactionTypeSymbol} TransactionTypeSymbol
 */

/**
 * RetirementYearCalculator class - Handles comprehensive retirement year calculations
 * Provides detailed analysis for the distribution phase of retirement planning
 */
class RetirementYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Demographics} */
  #demographics;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  // /** @type {WithdrawalFactory} */
  // #withdrawalFactory;
  /** @type {AdjustableIncomeStreams} */
  #adjustableIncomeStreams;

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

  /** @type {SocialSecurityBreakdown} */
  #ssBreakdown = new SocialSecurityBreakdown(0, 0, 0, false);

  /** @type {Taxes} */
  #taxes = new Taxes(0, 0, 0, 0, 0, 0);

  /** @type {IncomeBreakdown} */
  #incomeBreakdown;

  /**
   * Create retirement year calculator with input configuration
   * @param {Inputs} inputs - Retirement calculation inputs containing demographics,
   * @param {AccountingYear} accountYear - Collection of retirement accounts for fiscal year
   *   - savings: Savings account instance
   *   - trad401k: Traditional 401k account instance
   *   - rothIra: Roth IRA account instance
   *   Each account must support withdrawal, deposit, and balance calculation methods
   *   financial parameters, and configuration settings
   */
  constructor(inputs, accountYear) {
    this.#inputs = inputs;
    this.#accountYear = accountYear;
    this.#demographics = Demographics.CreateUsing(this.#inputs, true, false);
    this.#fiscalData = FiscalData.CreateUsing(this.#inputs, TAX_BASE_YEAR);

    this.#fixedIncomeStreams = FixedIncomeStreams.CreateUsing(
      this.#demographics,
      this.#accountYear,
      this.#inputs
    );

    this.#adjustableIncomeStreams = new AdjustableIncomeStreams(
      this.#demographics,
      this.#accountYear,
      this.#fiscalData,
      this.#inputs
    );

    this.#incomeBreakdown = IncomeBreakdown.CreateFrom(
      this.#fixedIncomeStreams,
      this.#adjustableIncomeStreams,
      this.#demographics,
      this.#fiscalData
    );

    // this.#withdrawalFactory = WithdrawalFactory.CreateUsing(
    //   this.#fixedIncomeStreams,
    //   this.#adjustableIncomeStreams,
    //   this.#fiscalData,
    //   this.#demographics,
    //   this.#accountYear
    // );
  }

  #processIncome() {
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

  /**
   * Process Savings account transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processPeriodicSavingsWithdrawals(withdrawalAmount) {
    // Log the monthly spending for savings
    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.SAVINGS,
      TransactionCategory.Transfer,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Xfer to Cash"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Transfer,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      "Xfer from Savings"
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

    this.#trackAsPeriodicDisbursements(
      TransactionCategory.TradRoth,
      withdrawalAmount,
      "Combined Roths"
    );

    this.#accountYear.deposit(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.TradRoth,
      withdrawalAmount
    );
  }

  #applyPeriodicSavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);

    const transactions = this.#accountYear
      .getAccountTransactions(ACCOUNT_TYPES.SAVINGS)
      .filter((t) => t.category === TransactionCategory.Interest);

    for (const transaction of transactions) {
      this.#accountYear.deposit(
        ACCOUNT_TYPES.INTEREST_ON_SAVINGS,
        TransactionCategory.Interest,
        transaction.amount,
        transaction.date.getMonth() + 1,
        transaction.date.getDate(),
        transaction.memo
      );
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

    this.#processPeriodicDisbursement(
      gross401kWithdrawal,
      ACCOUNT_TYPES.PARTNER_401K,
      "Withdrawal from Partner 401k"
    );

    this.#processGrossPeriodic401kIncome(gross401kWithdrawal, "Partner");

    return gross401kWithdrawal;
  }

  /**
   * Process Traditional 401k transactions
   * @param {number} amount - Gross withdrawal amount
   * @param {string} accountType - Account type
   * @param {string} memo - Memo for the transaction
   */
  #processPeriodicDisbursement(amount, accountType, memo) {
    this.#accountYear.processAsPeriodicWithdrawals(
      accountType,
      TransactionCategory.Disbursement,
      amount,
      PERIODIC_FREQUENCY.MONTHLY,
      memo
    );
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

    this.#accountYear.deposit(
      ACCOUNT_TYPES.TAXES,
      TransactionCategory.Taxes,
      this.#taxes.federalTaxesOwed.asCurrency(),
      12,
      31,
      "Federal Income Taxes Owed"
    );

    const totalWithholdings =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.WITHHOLDINGS) -
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.WITHHOLDINGS);

    const taxesDue =
      this.#taxes.federalTaxesOwed.asCurrency() - totalWithholdings;
    if (taxesDue > 0) {
      this.#accountYear.withdrawal(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.Taxes,
        taxesDue,
        12,
        31,
        "Fed Tax Payment"
      );
    }
    if (taxesDue < 0) {
      this.#accountYear.deposit(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.Taxes,
        -taxesDue,
        12,
        31,
        "Fed Tax Refund"
      );
    }
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
        "Spend budget surplus"
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
          "Spend budget catch-up"
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
      ACCOUNT_TYPES.CASH,
      TransactionCategory.IncomeNet,
      this.#combinedActualWorkingIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Combined Working Income"
    );

    this.#trackAsMonthlyWithholdings(
      TransactionCategory.IncomeNet,
      this.#incomeBreakdown?.combinedEarnedIncomeWithholdings ?? 0,
      "Working Income"
    );

    // this.#trackAsPeriodicDisbursements(
    //   TransactionCategory.Income,
    //   this.#combinedActualWorkingIncome,
    //   "Combined Working Income"
    // );

    this.#actualIncome += this.#combinedActualWorkingIncome;
  }

  #processCombinedSocialSecurityIncomes() {
    this.#ssCombinedTakeHome =
      this.#fixedIncomeStreams?.combinedSsActualIncome ?? 0;
    if (this.#ssCombinedTakeHome == 0) return;

    // Subject SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.subjectSsActualIncome ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.SocialSecurity,
        this.#fixedIncomeStreams.subjectSsActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Subject"
      );

      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.Withholdings,
        this.#fixedIncomeStreams.subjectSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Subject"
      );

      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.Disbursement,
        this.#fixedIncomeStreams.subjectSsActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Subject"
      );

      this.#trackAsMonthlyWithholdings(
        TransactionCategory.SocialSecurity,
        this.#fixedIncomeStreams.subjectSsWithholdings ?? 0,
        "Subject"
      );
      // this.#trackAsPeriodicDisbursements(
      //   TransactionCategory.SocialSecurity,
      //   this.#fixedIncomeStreams.subjectSsGross ?? 0,
      //   "Subject SS"
      // );
    }

    // Spouse SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.partnerSsActualIncome ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.SocialSecurity,
        this.#fixedIncomeStreams.partnerSsActualIncome,
        PERIODIC_FREQUENCY.MONTHLY,
        "Partner Actual Income"
      );

      this.#trackAsMonthlyWithholdings(
        TransactionCategory.SocialSecurity,
        this.#fixedIncomeStreams.partnerSsWithholdings ?? 0,
        "Partner"
      );

      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        TransactionCategory.Withholdings,
        this.#fixedIncomeStreams.partnerSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Spouse Withholdings"
      );

      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        TransactionCategory.Disbursement,
        this.#fixedIncomeStreams.partnerSsActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Spouse Actual Income"
      );
      // this.#trackAsPeriodicDisbursements(
      //   TransactionCategory.SocialSecurity,
      //   this.#fixedIncomeStreams.spouseSsGross ?? 0,
      //   "Spouse SS"
      // );
    }

    this.#actualIncome += this.#ssCombinedTakeHome;
  }

  #processCombinedPensionIncomes() {
    this.#combinedPensionActualIncome =
      this.#incomeBreakdown?.combinedPensionTakeHome ?? 0;
    if (this.#combinedPensionActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Pension,
      this.#combinedPensionActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Combined"
    );

    this.#trackAsMonthlyWithholdings(
      TransactionCategory.Pension,
      this.#incomeBreakdown?.combinedPensionWithholdings ?? 0,
      "Combined pensions"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      TransactionCategory.IncomeNet,
      this.#fixedIncomeStreams?.subjectPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      "Actual"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      TransactionCategory.Withholdings,
      this.#fixedIncomeStreams?.subjectPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      "Withholdings"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_PENSION,
      TransactionCategory.IncomeNet,
      this.#fixedIncomeStreams?.partnerPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      "Actual"
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_PENSION,
      TransactionCategory.Withholdings,
      this.#fixedIncomeStreams?.partnerPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      "Withholdings"
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
      ACCOUNT_TYPES.CASH,
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
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.PARTNER_401K);
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

    this.#processPeriodicDisbursement(
      gross401kWithdrawal,
      ACCOUNT_TYPES.SUBJECT_401K,
      "Gross withdrawal"
    );

    this.#processGrossPeriodic401kIncome(gross401kWithdrawal, "Subject");

    return gross401kWithdrawal;
  }

  /**
   * @param {number} gross401kWithdrawal
   * @param {string} party
   */
  #processGrossPeriodic401kIncome(gross401kWithdrawal, party) {
    const actual401kAmount = Common.convertGross401kToActual401k(
      gross401kWithdrawal,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Trad401k,
      actual401kAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      party
    );

    const withholdingAmount = gross401kWithdrawal - actual401kAmount;

    this.#trackAsMonthlyWithholdings(
      TransactionCategory.Trad401k,
      withholdingAmount,
      `${party} Withholdings`
    );

    this.#trackAsPeriodicDisbursements(
      TransactionCategory.Trad401k,
      gross401kWithdrawal,
      `${party} 401k Gross`
    );

    this.#actualIncome += actual401kAmount;
  }

  /**
   * @param {TransactionCategorySymbol} transactionCategory
   * @param {number} amount
   * @param {string} memo
   */
  #trackAsPeriodicDisbursements(transactionCategory, amount, memo) {
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.DISBURSEMENT,
      transactionCategory,
      amount,
      PERIODIC_FREQUENCY.MONTHLY,
      memo
    );
  }
  /**
   * @param {TransactionCategorySymbol} transactionCategory
   * @param {number} withholdingAmount
   * @param {string} memo
   */
  #trackAsMonthlyWithholdings(transactionCategory, withholdingAmount, memo) {
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.WITHHOLDINGS,
      transactionCategory,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      memo
    );
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

  /**
   * Calculate comprehensive retirement year data including income, withdrawals, taxes, and account balances
   * with proper Social Security taxation based on total income calculations.
   *
   * This function performs a complete retirement year simulation by:
   * 1. Creating demographic and fiscal data contexts
   * 2. Calculating income streams from various sources (SS, pension, interest)
   * 3. Determining optimal withdrawal strategy across account types
   * 4. Computing tax implications with proper SS taxation rules
   * 5. Updating account balances with interest and transactions
   * 6. Generating comprehensive breakdown reports
   *
   * @returns {RetirementYearResults} Comprehensive retirement year calculation results containing:
   *   - demographics: Age and retirement year information
   *   - fiscalData: Tax year and spending parameters
   *   - incomeStreams: All income sources (SS, pension, interest, RMD)
   *   - incomeBreakdown: Detailed taxable/non-taxable income analysis
   *   - withdrawals: Breakdown of withdrawals from each account type
   *   - balances: Ending balances for all accounts
   *   - taxes: Federal tax calculations and effective rates
   *   - breakdowns: Detailed analysis for SS, pension, savings, and retirement accounts
   *
   * @throws {Error} When required account methods are missing or inputs are invalid
   * @throws {Error} When withdrawal calculations fail due to insufficient funds
   *
   * @example
   * // Calculate retirement year data for a 65-year-old
   * const inputs = RetirementInputs.CreateUsing(userInputData);
   * const calculator = new RetirementYearCalculator(inputs);
   * const yearData = calculator.calculateRetirementYearData(accountYear, benefits);
   *
   * console.log(`Net income: ${yearData.totals.netIncome}`);
   * console.log(`Federal taxes: ${yearData.taxes.federalTaxes}`);
   * console.log(`Account balances: ${yearData.balances.total()}`);
   *
   * @see {@link FixedIncomeStreams} For income stream calculation details
   * @see {@link SsBenefits} For Social Security taxation methodology
   * @see {@link AccountPortioner} For withdrawal strategy logic
   * @see {@link RetirementYearResults} For complete result structure
   *
   * @since 1.0.0
   * @author Retirement Calculator System
   */
  calculateRetirementYearData() {
    // kill the logger for now

    // Declare and initialize the result object at the top

    // Build complete taxable income picture for withdrawal functions

    this.#processIncome();

    const incomeBreakdown = this.#incomeBreakdown;
    const ssBreakdown =
      this.#ssBreakdown ?? new SocialSecurityBreakdown(0, 0, 0, false);
    const taxes = this.#taxes;

    // For Social Security breakdown, we still need some manual calculation since we need separate spouse results
    // But we can use the taxable amounts from retirement.js

    // @ts-ignore
    const mySsBenefits = {
      _description: "Social Security Benefits Breakdown",
      income: this.#fixedIncomeStreams.subjectSsGross,
      // taxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.subjectTaxablePortion,
      // nonTaxablePortion:
      //   incomeBreakdown.ssCalculationDetails?.subjectNonTaxablePortion,
      // portionOfTotalBenefits:
      //   incomeBreakdown.ssCalculationDetails?.subjectPortion,
      calculationDetails: [
        withLabel("ssBreakdown", ssBreakdown),
        // withLabel("incomeStreams", this.#fixedIncomeStreams),
      ],
    };

    // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

    // const ssIncome = SocialSecurityIncome.CreateUsing(
    //   incomeResults.ssBreakdown
    // );

    const totals = {
      _description: "Totals Breakdown",
      reportableIncome: incomeBreakdown.grossIncome,
      taxableIncome: incomeBreakdown.adjustedGrossIncome,
      netIncome: incomeBreakdown.actualIncome, // getNetIncomeMinusReportedEarnedInterest,
      calculationDetails: [withLabel("incomeResults", incomeBreakdown)],
    };

    const retirementYearResults = RetirementYearResults.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear,
      incomeBreakdown,
      ssBreakdown,
      taxes
    );
    // demographics,
    // fiscalData,
    // // incomeResults.incomeBreakdown,
    // Income.CreateFrom(accountYear, ACCOUNT_TYPES.REVENUE),
    // Income.CreateFrom(accountYear, ACCOUNT_TYPES.DISBURSEMENT),
    // // expenditureTracker.getExpenditures(),
    // // fiscalData.spend,
    // // withdrawalFactory. getContributions(),
    // // withdrawalFactory.getWithdrawals(),
    // Balances.CreateUsing(accountYear),
    // SocialSecurityIncome.CreateUsing(incomeResults.ssBreakdown),
    // // myPensionBenefits,
    // // spousePensionBenefits,
    // // mySsBenefits,
    // // spouseSsBenefits,
    // // fixedIncomeStreams,
    // // incomeResults.incomeBreakdown,
    // taxes,
    // // totals,
    // // myPensionBenefits,
    // // spousePensionBenefits,
    // // mySsBenefits,
    // // spouseSsBenefits,
    // // savingsBreakdown,
    // // // withdrawalFactory. getWithdrawalBreakdown(),
    // // incomeResults.ssBreakdown,
    // // pensionBreakdown,
    // accountYear

    // incomeResults.incomeBreakdown.dump("incomeBreakdown");
    // debugger;

    // result.demographics = demographics;
    // result.fiscalData = fiscalData;
    // result.revenue = Income.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.REVENUE
    // );
    // result.disbursements = Income.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.DISBURSEMENT
    // );
    // result.balances = Balances.CreateUsing(this.#accountYear);

    // result.socialSecurityIncome = SocialSecurityIncome.CreateUsing(
    //   incomeBreakdown.ssCalculationDetails
    // );
    // result.taxes = Taxes.CreateUsing(incomeBreakdown);
    // result.savings = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.SAVINGS
    // );
    // result.trad401k = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.TRAD_401K
    // );
    // result.tradRoth = Balance.CreateUsing(
    //   this.#accountYear,
    //   ACCOUNT_TYPES.TRAD_ROTH
    // );
    // result.calculationDetails = [
    //   // withLabel("demographics", demographics),
    //   // withLabel("fiscalData", fiscalData),
    //   // withLabel("incomeResults", incomeResults),
    //   // withLabel("withdrawalFactory", withdrawalFactory),
    //   // withLabel("accountYear", this.#accountYear),
    // ];

    // debugData.dump("Debug Data");

    // fiscalData.dump("fiscalData");

    // result.analyzers[ACCOUNT_TYPES.INTEREST_ON_SAVINGS].dumpAnnualTransactions();
    // result.analyzers[ACCOUNT_TYPES.SAVINGS].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.SUBJECT_401K].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.SUBJECT_401K].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.SUBJECT_ROTH_IRA].dumpCategorySummaries();

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.DISBURSEMENT
    ].dumpCategorySummaries();
    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpCategorySummaries();

    // result.analyzers[ACCOUNT_TYPES.SUBJECT_PENSION].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.PARTNER_PENSION].dumpCategorySummaries();

    // result.analyzers[
    //   ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY
    // ].dumpCategorySummaries();
    // result.analyzers[
    //   ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY
    // ].dumpCategorySummaries();

    // result.analyzers[ACCOUNT_TYPES.WITHHOLDINGS].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.TAXES].dumpCategorySummaries();
    // result.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity();

    // result.analyzers[ACCOUNT_TYPES.LIVINGEXPENSESFUND].dumpAnnualTransactions();

    debugger;
    // result.income.dump();
    // result.balances.dump();
    return retirementYearResults;
  }

  /**
   * Get input configuration
   * @returns {Inputs} - Input configuration object
   */
  getInputs() {
    return this.#inputs;
  }
}

export { RetirementYearCalculator };
