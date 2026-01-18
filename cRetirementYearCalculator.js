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

  processRetirementYearData() {
    // Dump misc non-taxable income into savings account just to get it accounted for
    this.#processNonTaxableIncome();

    // Process non-variable income streams into savings account
    this.#processPensionIncome();
    this.#processWagesIncome();
    this.#processSocialSecurityIncome();

    this.#processSavingsContributions();

    const annualSpend = this.#fiscalData.spend;
    const cashRemaining = this.#cashRemaining;

    // reduce the "ask" by the estimated net income from SS, Pension, etc
    let shortfall = annualSpend - cashRemaining;
    this.#determineWithdrawalPortions(shortfall);

    // Take withdrawals in order of Savings, Roth, 401k
    this.#drawRothPortions();
    this.#draw401kPortions();
    this.#drawSavingsPortion();

    this.#processMonthlySpending();

    this.#applyPeriodic401kInterestEarned();
    this.#applyPeriodicRothInterest();
    this.#applyPeriodicSavingsInterest();

    this.#processIncomeTaxes();

    // If still shortfall, we're busted
    shortfall = this.#fiscalData.spend - this.#cashRemaining;
    if (shortfall > 0) {
      console.error(`Unable to cover fiscal spend: ${shortfall.toFixed(2)}`);
    }

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
        withLabel("ssBreakdown", this.#ssBreakdown),
        // withLabel("incomeStreams", this.#fixedIncomeStreams),
      ],
    };

    // Non-taxable income includes SS/pension non-taxable portions + savings withdrawals (already after-tax) + Roth withdrawals

    // const ssIncome = SocialSecurityIncome.CreateUsing(
    //   incomeResults.ssBreakdown
    // );

    const totals = {
      _description: "Totals Breakdown",
      reportableIncome: this.#incomeBreakdown.grossIncome,
      taxableIncome: this.#incomeBreakdown.adjustedGrossIncome,
      netIncome: this.#incomeBreakdown.actualIncome, // getNetIncomeMinusReportedEarnedInterest,
      calculationDetails: [withLabel("incomeResults", this.#incomeBreakdown)],
    };

    const retirementYearResults = RetirementYearResults.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear,
      this.#incomeBreakdown,
      this.#ssBreakdown,
      this.#taxes
    );

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

  #processSavingsContributions() {
    const subjectDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams
        .subjectRetirementYearSavingsContributionVariable *
        this.#fixedIncomeStreams.totalActualFixedIncome,
      this.#fixedIncomeStreams.subjectRetirementYearSavingsContributionFixed
    ).asCurrency();

    const partnerDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams
        .partnerRetirementYearSavingsContributionVariable *
        this.#fixedIncomeStreams.totalActualFixedIncome,
      this.#fixedIncomeStreams.partnerRetirementYearSavingsContributionFixed
    ).asCurrency();

    if (this.#cashRemaining <= 0) return;

    const subjectActualSavingsContribution = Math.min(
      this.#cashRemaining,
      subjectDesiredSavingsContribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SAVINGS,
      subjectActualSavingsContribution,
      PERIODIC_FREQUENCY.MONTHLY
    );

    if (this.#cashRemaining <= 0) return;

    const partnerActualSavingsContribution = Math.min(
      this.#cashRemaining,
      partnerDesiredSavingsContribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SAVINGS,
      partnerActualSavingsContribution,
      PERIODIC_FREQUENCY.MONTHLY
    );
  }
  get #cashRemaining() {
    return this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);
  }

  /** @return {Number}  */
  #drawSavingsPortion() {
    const amount = this.#accountPortioner?.savingsWithdrawal ?? 0;
    if (amount <= 0) return amount;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (avaiableFunds <= 0) return 0;

    const withdrawalAmount = Math.min(amount, avaiableFunds);

    this.#processPeriodicSavingsWithdrawals(withdrawalAmount);

    return withdrawalAmount;
  }

  /**
   * Process Savings account transactions
   * @param {number} withdrawalAmount - Amount to withdraw
   */
  #processPeriodicSavingsWithdrawals(withdrawalAmount) {
    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.CASH,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#adjustableIncomeStreams.savingsWithdrawal += withdrawalAmount;
  }

  #applyPeriodicSavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
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

    const totalWithholdings = this.#accountYear.getAnnualRevenues(
      ACCOUNT_TYPES.WITHHOLDINGS
    );

    const taxesDue =
      this.#taxes.federalTaxesOwed.asCurrency() - totalWithholdings;

    if (taxesDue > 0) {
      const availableSavings = this.#accountYear.getEndingBalance(
        ACCOUNT_TYPES.SAVINGS
      );
      if (taxesDue > availableSavings) {
        console.warn(
          "Warning: Taxes due exceed available savings. Partial payment will be made."
        );
      }

      const withdrawalAmount = Math.min(taxesDue, availableSavings);

      this.#accountYear.withdrawal(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.TaxPayment,
        withdrawalAmount,
        12,
        31
      );
    }
    if (taxesDue < 0) {
      this.#accountYear.deposit(
        ACCOUNT_TYPES.SAVINGS,
        TransactionCategory.TaxRefund,
        -taxesDue,
        12,
        31
      );
    }
  }

  #processMonthlySpending() {
    const actualIncome = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);
    this.#actualSpend = Math.min(actualIncome, this.#fiscalData.spend);

    // No action needed if actual income matches spend budget
    if (actualIncome == this.#fiscalData.spend) return;

    // Any money not used from the spend budget goes back into savings
    if (actualIncome > this.#fiscalData.spend) {
      const surplusAmount = actualIncome - this.#fiscalData.spend;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.CASH,
        ACCOUNT_TYPES.SAVINGS,
        surplusAmount,
        PERIODIC_FREQUENCY.MONTHLY
      );
    } else {
      // Any money needed to cover the spend budget deficit is withdrawn from savings
      const deficitAmount = this.#fiscalData.spend - actualIncome;
      const availableFunds = this.#accountYear.getAvailableFunds([
        ACCOUNT_TYPES.SAVINGS,
      ]);
      if (availableFunds > 0) {
        const catchupAmount = Math.min(deficitAmount, availableFunds);

        this.#accountYear.processAsPeriodicTransfers(
          ACCOUNT_TYPES.SAVINGS,
          ACCOUNT_TYPES.CASH,
          catchupAmount,
          PERIODIC_FREQUENCY.MONTHLY
        );
      }
    }
  }

  /**
   * @param {number} amountToPortion
   */
  #determineWithdrawalPortions(amountToPortion) {
    this.#accountPortioner?.calculatePortions(amountToPortion);
  }

  #processWagesIncome() {
    this.#processSubjectWagesIncome();
    this.#processPartnerWagesIncome();
  }

  #processSubjectWagesIncome() {
    if (this.#fixedIncomeStreams?.subjectWagesAndCompensationGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.IncomeNet,
        this.#fixedIncomeStreams?.subjectWagesAndCompensationActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        "Subject Wages"
      );

      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.WITHHOLDINGS,
        TransactionCategory.Wages,
        this.#fixedIncomeStreams
          ?.subjectWagesAndCompensationEstimatedWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams?.subjectWagesAndCompensationActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
  }

  #processPartnerWagesIncome() {
    if (this.#fixedIncomeStreams?.partnerWagesAndCompensationGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_WAGES,
        TransactionCategory.IncomeGross,
        this.#fixedIncomeStreams?.partnerWagesAndCompensationGross ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.WITHHOLDINGS,
        this.#fixedIncomeStreams
          ?.partnerWagesAndCompensationEstimatedWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams?.partnerWagesAndCompensationActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
  }

  #processSocialSecurityIncome() {
    // Subject SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.subjectSsGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.IncomeGross,
        this.#fixedIncomeStreams.subjectSsGross ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams.subjectSsActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        ACCOUNT_TYPES.WITHHOLDINGS,
        this.#fixedIncomeStreams.subjectSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }

    // Spouse SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.partnerSsGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        TransactionCategory.IncomeGross,
        this.#fixedIncomeStreams.partnerSsGross,
        PERIODIC_FREQUENCY.MONTHLY
      );
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams.partnerSsActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        ACCOUNT_TYPES.WITHHOLDINGS,
        this.#fixedIncomeStreams.partnerSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
  }

  #processPensionIncome() {
    this.#combinedPensionActualIncome =
      this.#incomeBreakdown?.combinedPensionTakeHome ?? 0;
    if (this.#combinedPensionActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      TransactionCategory.IncomeGross,
      this.#fixedIncomeStreams?.subjectPensionGross ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams?.subjectPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      ACCOUNT_TYPES.WITHHOLDINGS,
      this.#fixedIncomeStreams?.subjectPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_PENSION,
      TransactionCategory.IncomeGross,
      this.#fixedIncomeStreams?.partnerPensionGross ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_PENSION,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams?.partnerPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_PENSION,
      ACCOUNT_TYPES.WITHHOLDINGS,
      this.#fixedIncomeStreams?.partnerPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );
  }

  #processNonTaxableIncome() {
    this.#nonTaxableActualIncome =
      this.#incomeBreakdown?.miscNonTaxableActualIncome ?? 0;

    if (this.#nonTaxableActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.OtherNonTaxable,
      this.#nonTaxableActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Tax-free income"
    );
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

  #draw401kPortions() {
    const desiredGrossAmount =
      this.#accountPortioner?.subject401kGrossWithdrawal ?? 0;
    if (desiredGrossAmount <= 0) return;

    const subjectGrossFundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SUBJECT_401K,
    ]);

    const partnerGrossFundsAvailable = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.PARTNER_401K,
    ]);

    const combinedGrossFundsAvailable =
      subjectGrossFundsAvailable + partnerGrossFundsAvailable;

    if (combinedGrossFundsAvailable <= 0) return;

    const combinedGrossWithdrawalAmount = Math.min(
      desiredGrossAmount,
      combinedGrossFundsAvailable
    );

    const subjectPortion =
      subjectGrossFundsAvailable / combinedGrossFundsAvailable;
    const partnerPortion = 1 - subjectPortion;

    const subjectGrossWithdrawalAmount =
      combinedGrossWithdrawalAmount * subjectPortion;
    const partnerGrossWithdrawalAmount =
      combinedGrossWithdrawalAmount * partnerPortion;

    this.#processGrossPeriodic401kIncome(
      subjectGrossWithdrawalAmount,
      ACCOUNT_TYPES.SUBJECT_401K
    );

    this.#processGrossPeriodic401kIncome(
      partnerGrossWithdrawalAmount,
      ACCOUNT_TYPES.PARTNER_401K
    );
  }

  /**
   * @param {number} grossAmount
   * @param {string} sourceAccountType
   * @param {string} [memo]
   */
  #processGrossPeriodic401kIncome(grossAmount, sourceAccountType, memo) {
    const actualAmount = Common.convertGross401kToActual401k(
      grossAmount,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );
    const withholdingAmount = grossAmount - actualAmount;

    this.#accountYear.processAsPeriodicTransfers(
      sourceAccountType,
      ACCOUNT_TYPES.CASH,
      actualAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Transfer, 
      memo
    );

    this.#accountYear.processAsPeriodicTransfers(
      sourceAccountType,
      ACCOUNT_TYPES.WITHHOLDINGS,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Transfer,
      memo
    );
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
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    );
  }

  #drawRothPortions() {
    const desiredRothWithdrawal =
      this.#accountPortioner?.rothIraWithdrawal ?? 0;
    if (desiredRothWithdrawal <= 0) return;

    const subjectAvailableRothFunds = this.#accountYear.getEndingBalance(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );

    const partnerAvailableRothFunds = this.#accountYear.getEndingBalance(
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    );

    const combinedAvaiableRothFunds =
      subjectAvailableRothFunds + partnerAvailableRothFunds;

    if (combinedAvaiableRothFunds == 0) return;

    const actualRothWithdrawal = Math.min(
      desiredRothWithdrawal,
      combinedAvaiableRothFunds
    );

    const subjectShare = subjectAvailableRothFunds / combinedAvaiableRothFunds;
    const subjectShareAmount = (
      subjectShare * actualRothWithdrawal
    ).asCurrency();

    if (subjectShareAmount > 0) {
      // Reduce the account balance by the net received amount
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
        ACCOUNT_TYPES.CASH,
        subjectShareAmount,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }

    const partnerShareAmount = Math.max(
      actualRothWithdrawal - subjectShareAmount,
      0
    );

    if (partnerShareAmount > 0) {
      // Reduce the account balance by the net received amount
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_ROTH_IRA,
        ACCOUNT_TYPES.CASH,
        partnerShareAmount,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
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
