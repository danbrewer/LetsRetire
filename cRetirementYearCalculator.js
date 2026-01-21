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
import { TransactionRoutes } from "./tTransactionRoute.js";

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
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.AutoTransfer,
      "Subject contrib."
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
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.AutoTransfer,
      "Partner contrib."
    );

    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity(
      "Savings contributions processed"
    );
  }

  get #cashRemaining() {
    return this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);
  }

  #drawSavingsPortion() {
    const amount = this.#accountPortioner?.savingsWithdrawal ?? 0;
    if (amount <= 0) return;

    const avaiableFunds = this.#accountYear.getAvailableFunds([
      ACCOUNT_TYPES.SAVINGS,
    ]);

    if (avaiableFunds <= 0) return;

    const withdrawalAmount = Math.min(amount, avaiableFunds);

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SAVINGS,
      ACCOUNT_TYPES.CASH,
      withdrawalAmount,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#adjustableIncomeStreams.savingsWithdrawal += withdrawalAmount;

    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity(
      "Savings withdrawals processed"
    );
  }

  // /**
  //  * Process Savings account transactions
  //  * @param {number} withdrawalAmount - Amount to withdraw
  //  */
  // #processPeriodicSavingsWithdrawals(withdrawalAmount) {

  //   this.#adjustableIncomeStreams.savingsWithdrawal += withdrawalAmount;
  // }

  #applyPeriodicSavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity(
      "Savings interest processed"
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
      TransactionRoutes.Taxes,
      this.#taxes.federalTaxesOwed.asCurrency(),
      12,
      31,
      "Federal Income Taxes Owed"
    );

    const totalWithholdings = this.#accountYear.getAnnualRevenues(
      ACCOUNT_TYPES.TAXES,
      TransactionCategory.Withholdings
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

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.TAXES,
        withdrawalAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxPayment
      );
    }
    if (taxesDue < 0) {
      const refundAmount = -taxesDue;
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.TAXES,
        ACCOUNT_TYPES.SAVINGS,
        refundAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxRefund
      );
    }
    this.#accountYear.analyzers[ACCOUNT_TYPES.TAXES].dumpAccountActivity(
      "Taxes processed"
    );
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
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.SurplusIncome
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
          PERIODIC_FREQUENCY.MONTHLY,
          TransactionCategory.IncomeShortfall
        );
        this.#adjustableIncomeStreams.savingsWithdrawal += catchupAmount;
      }
    }
    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity(
      "Surplus cash processed"
    );
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
    if (
      this.#fixedIncomeStreams?.subjectCareerWagesAndCompensationGross ??
      0 > 0
    ) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
        this.#fixedIncomeStreams?.subjectCareerWagesAndCompensationGross ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams
          ?.subjectCareerWagesAndCompensationEstimatedWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS,
        this.#fixedIncomeStreams.subjectCareerNonTaxableSalaryReductions,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams
          ?.subjectCareerWagesAndCompensationActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );
    }

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_WAGES
    ].dumpAccountActivity("Subject wages processed");
  }

  #processPartnerWagesIncome() {
    if (
      this.#fixedIncomeStreams?.partnerCareerWagesAndCompensationGross ??
      0 > 0
    ) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_WAGES,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
        this.#fixedIncomeStreams?.partnerCareerWagesAndCompensationGross ?? 0,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams
          ?.partnerCareerWagesAndCompensationEstimatedWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS,
        this.#fixedIncomeStreams.partnerCareerNonTaxableSalaryReductions,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams
          ?.partnerCareerWagesAndCompensationActualIncome ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#accountYear.analyzers[
        ACCOUNT_TYPES.PARTNER_WAGES
      ].dumpAccountActivity("Partner wages processed");
    }
  }

  #processSocialSecurityIncome() {
    // Subject SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.subjectSsGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
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
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.subjectSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#accountYear.analyzers[
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY
      ].dumpAccountActivity("Subject social security processed");
    }

    // Spouse SS income goes into living expenses fund
    if (this.#fixedIncomeStreams.partnerSsGross ?? 0 > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
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
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.partnerSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#accountYear.analyzers[
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY
      ].dumpAccountActivity("Partner social security processed");
    }
  }

  #processPensionIncome() {
    this.#combinedPensionActualIncome =
      this.#incomeBreakdown?.combinedPensionTakeHome ?? 0;
    if (this.#combinedPensionActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams?.subjectPensionGross ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams?.subjectPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams?.subjectPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_PENSION,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams?.partnerPensionGross ?? 0,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_PENSION,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams?.partnerPensionActualIncome ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_PENSION,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams?.partnerPensionWithholdings ?? 0,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_PENSION
    ].dumpAccountActivity("Subject pension processed");

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_PENSION
    ].dumpAccountActivity("Partner pension processed");
  }

  #processNonTaxableIncome() {
    this.#nonTaxableActualIncome =
      this.#incomeBreakdown?.miscNonTaxableActualIncome ?? 0;

    if (this.#nonTaxableActualIncome == 0) return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.OtherNonTaxable,
      TransactionRoutes.External,
      this.#nonTaxableActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      "Tax-free income"
    );

    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpAccountActivity(
      "Non-taxable income processed"
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
    this.#accountYear.analyzers[ACCOUNT_TYPES.SUBJECT_401K].dumpAccountActivity(
      "Subject 401k interest processed"
    );

    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.PARTNER_401K);
    this.#accountYear.analyzers[ACCOUNT_TYPES.PARTNER_401K].dumpAccountActivity(
      "Partner 401k interest processed"
    );
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
      ACCOUNT_TYPES.TAXES,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings,
      memo
    );

    this.#accountYear.analyzers[sourceAccountType].dumpAccountActivity(
      `${sourceAccountType} 401k withdrawal processed`
    );
  }

  #applyPeriodicRothInterest() {
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    ].dumpAccountActivity("Subject Roth IRA interest processed");

    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    );
    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    ].dumpAccountActivity("Partner Roth IRA interest processed");
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

      this.#accountYear.analyzers[
        ACCOUNT_TYPES.SUBJECT_ROTH_IRA
      ].dumpAccountActivity("Subject Roth IRA processed");
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
      this.#accountYear.analyzers[
        ACCOUNT_TYPES.PARTNER_ROTH_IRA
      ].dumpAccountActivity("Partner Roth IRA processed");
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
