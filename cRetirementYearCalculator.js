import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { AccountPortioner } from "./cAccountPortioner.js";
import { AdjustableIncomeStreams } from "./cAdjustableIncomeStreams.js";
import { Common } from "./cCommon.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { Inputs } from "./cInputs.js";
import { constsJS_FILING_STATUS, PERIODIC_FREQUENCY, TAX_BASE_YEAR } from "./consts.js";
import { ReportingYear } from "./cReporting.js";
import { ReportsManager } from "./cReportsManager.js";
import { RetirementYearData } from "./cRetirementYearData.js";
import { SsBenefitsCalculator } from "./cSsBenefitsCalculator.js";
import { SocialSecurityBreakdown } from "./cSsBreakdown.js";
import { Taxes } from "./cTaxes.js";
import { TransactionCategory } from "./cTransaction.js";
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
  /** @type {AccountPortioner} */
  #accountPortioner;
  /** @type {SocialSecurityBreakdown} */
  #ssBreakdown = new SocialSecurityBreakdown(0, 0, 0, false);
  /** @type {Taxes} */
  #taxes = new Taxes(0, 0, 0, 0, 0, 0, 0);
  /** @type {ReportingYear} */
  #reportingYear;
  // /** @type {IncomeBreakdown} */
  // #incomeBreakdown;

  /**
   * Create retirement year calculator with input configuration
   * @param {Inputs} inputs - Retirement calculation inputs containing demographics,
   * @param {AccountingYear} accountYear - Collection of retirement accounts for fiscal year
   * @param {ReportingYear} reportingYear - Manager for report objects
   */
  constructor(inputs, accountYear, reportingYear) {
    this.#inputs = inputs;
    this.#accountYear = accountYear;
    this.#reportingYear = reportingYear;
    this.#demographics = Demographics.CreateUsing(this.#inputs, true, false);
    this.#fiscalData = FiscalData.CreateUsing(this.#inputs, TAX_BASE_YEAR);

    this.#fixedIncomeStreams = FixedIncomeStreams.CreateUsing(
      this.#demographics,
      this.#accountYear,
      this.#inputs
    );

    this.#accountPortioner = AccountPortioner.CreateFrom(
      this.#accountYear,
      this.#fiscalData,
      this.#demographics
    );

    this.#adjustableIncomeStreams = new AdjustableIncomeStreams(
      this.#accountYear
    );

    this.#reportingYear.ReportData.year = this.#fiscalData.taxYear;

    this.#reportingYear.ReportData.demographics_hasPartner =
      this.#demographics.hasPartner;
    this.#reportingYear.ReportData.demographics_subjectAge = `${this.#demographics.subjectIsLiving ? this.#demographics.currentAge : "-"}`;
    this.#reportingYear.ReportData.demographics_partnerAge = `${this.#demographics.partnerIsLiving ? this.#demographics.currentAgeOfPartner : "-"}`;
    this.#reportingYear.ReportData.demographics_filingStatus = 
      this.#demographics.filingStatus === constsJS_FILING_STATUS.MARRIED_FILING_JOINTLY ? "Married Filing Jointly" : "Single";
  }

  // COPIED FROM WORKING YEAR CALCULATOR

  #processMiscIncome() {
    const miscIncome = this.#fixedIncomeStreams.miscTaxableIncome;

    if (miscIncome > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.OTHER_INCOME,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
        miscIncome,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#reportingYear.ReportData.income_miscIncomeGross = miscIncome;

      const withholdings =
        this.#fixedIncomeStreams.miscTaxableIncomeWithholdings;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.OTHER_INCOME,
        ACCOUNT_TYPES.TAXES,
        withholdings,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#reportingYear.ReportData.income_miscIncomeWithholdings =
        withholdings;

      const takeHomeAmount = miscIncome - withholdings;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.OTHER_INCOME,
        ACCOUNT_TYPES.CASH,
        takeHomeAmount,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#reportingYear.ReportData.income_miscTaxableIncomeTakehome =
        takeHomeAmount;
    }
  }

  #processTaxFreeIncome() {
    const taxFreeIncome = this.#fixedIncomeStreams.taxFreeIncomeAdjustment;
    if (taxFreeIncome > 0) {
      // debugger;
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.OtherNonTaxable,
        TransactionRoutes.External,
        taxFreeIncome,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#reportingYear.ReportData.income_miscTaxFreeIncome = taxFreeIncome;
    }

    // const subjectNonTaxableIncome =
    //   this.#fixedIncomeStreams.subjectPayrollDeductions;

    // if (subjectNonTaxableIncome > 0) {
    //   this.#accountYear.processAsPeriodicDeposits(
    //     ACCOUNT_TYPES.SUBJECT_WAGES,
    //     TransactionCategory.OtherNonTaxable,
    //     TransactionRoutes.External,
    //     subjectNonTaxableIncome,
    //     PERIODIC_FREQUENCY.MONTHLY
    //   );
    //   this.#accountYear.processAsPeriodicTransfers(
    //     ACCOUNT_TYPES.SUBJECT_WAGES,
    //     ACCOUNT_TYPES.CASH,
    //     subjectNonTaxableIncome,
    //     PERIODIC_FREQUENCY.MONTHLY,
    //     TransactionCategory.OtherNonTaxable
    //   );
    // }
    // const partnerNonTaxableIncome =
    //   this.#fixedIncomeStreams.partnerCareerNonTaxableSalaryDeductions;
    // if (partnerNonTaxableIncome > 0) {
    //   this.#accountYear.processAsPeriodicDeposits(
    //     ACCOUNT_TYPES.PARTNER_WAGES,
    //     TransactionCategory.OtherNonTaxable,
    //     TransactionRoutes.External,
    //     partnerNonTaxableIncome,
    //     PERIODIC_FREQUENCY.MONTHLY
    //   );

    //   this.#accountYear.processAsPeriodicTransfers(
    //     ACCOUNT_TYPES.PARTNER_WAGES,
    //     ACCOUNT_TYPES.CASH,
    //     partnerNonTaxableIncome,
    //     PERIODIC_FREQUENCY.MONTHLY,
    //     TransactionCategory.OtherNonTaxable
    //   );
    // }
  }

  // #processSavingsContributions() {
  //   const subjectDesiredSavingsContribution = Math.max(
  //     this.#fixedIncomeStreams.subjectSavingsContributionVariable,
  //     this.#fixedIncomeStreams.subjectSavingsContributionFixed
  //   ).asCurrency();

  //   const partnerDesiredSavingsContribution = Math.max(
  //     this.#fixedIncomeStreams.partnerSavingsContributionVariable,
  //     this.#fixedIncomeStreams.partnerSavingsContributionFixed
  //   ).asCurrency();

  //   const desiredTransferAmount =
  //     subjectDesiredSavingsContribution + partnerDesiredSavingsContribution;

  //   if (desiredTransferAmount <= 0) return;

  //   let availableCash = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);

  //   if (availableCash <= 0) return;

  //   const actualTransferAmount = Math.min(
  //     availableCash,
  //     subjectDesiredSavingsContribution
  //   );

  //   this.#accountYear.processAsPeriodicTransfers(
  //     ACCOUNT_TYPES.CASH,
  //     ACCOUNT_TYPES.SAVINGS,
  //     actualTransferAmount,
  //     PERIODIC_FREQUENCY.MONTHLY,
  //     TransactionCategory.AutoTransfer,
  //     "Combined contrib."
  //   );

  //   this.#reportingYear.ReportData.retirementAcct_subjectSavingsContributions +=
  //     actualTransferAmount;

  //   availableCash -= actualTransferAmount;

  //   const actualPartnerTransferAmount = Math.min(
  //     availableCash,
  //     partnerDesiredSavingsContribution
  //   );

  //   this.#accountYear.processAsPeriodicTransfers(
  //     ACCOUNT_TYPES.CASH,
  //     ACCOUNT_TYPES.SAVINGS,
  //     actualPartnerTransferAmount,
  //     PERIODIC_FREQUENCY.MONTHLY,
  //     TransactionCategory.AutoTransfer,
  //     "Combined contrib."
  //   );

  //   this.#reportingYear.ReportData.retirementAcct_partnerSavingsContributions +=
  //     actualPartnerTransferAmount;
  // }

  #processWagesAndCompensation() {
    if (this.#demographics.subjectIsLiving) {
      // Subject wages and compensation
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
        this.#fixedIncomeStreams.retirement.subjectWagesAndCompensationGross,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#reportingYear.ReportData.income_subjectGrossWages =
        this.#fixedIncomeStreams.retirement.subjectWagesAndCompensationGross;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.SUBJECT_401K,
        this.#fixedIncomeStreams.retirement.subjectAllowed401kContribution,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.RetirementContribution
      );

      this.#reportingYear.ReportData.income_subject401kContribution =
        this.#fixedIncomeStreams.retirement.subjectAllowed401kContribution;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.retirement
          .subjectWagesAndCompensationEstimatedWithholdings,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#reportingYear.ReportData.income_subjectWagesWithholdings =
        this.#fixedIncomeStreams.retirement.subjectWagesAndCompensationEstimatedWithholdings;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS,
        this.#fixedIncomeStreams.retirement.subjectPayrollDeductions,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.PayrollDeductions
      );

      this.#reportingYear.ReportData.income_subjectPayrollDeductions =
        this.#fixedIncomeStreams.retirement.subjectPayrollDeductions;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams.retirement
          .subjectWagesAndCompensationActualIncome,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#reportingYear.ReportData.income_subjectTakehomeWages =
        this.#fixedIncomeStreams.retirement.subjectWagesAndCompensationActualIncome;
    }

    // Partner wages and compensation

    if (this.#demographics.hasPartner && this.#demographics.partnerIsLiving) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.PARTNER_WAGES,
        TransactionCategory.IncomeGross,
        TransactionRoutes.External,
        this.#fixedIncomeStreams.retirement.partnerWagesAndCompensationGross,
        PERIODIC_FREQUENCY.MONTHLY
      );

      this.#reportingYear.ReportData.income_partnerGrossWages =
        this.#fixedIncomeStreams.retirement.partnerWagesAndCompensationGross;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.PARTNER_401K,
        this.#fixedIncomeStreams.retirement.partnerAllowed401kContribution,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.RetirementContribution
      );
      this.#reportingYear.ReportData.income_partner401kContribution =
        this.#fixedIncomeStreams.retirement.partnerAllowed401kContribution;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS,
        this.#fixedIncomeStreams.retirement.partnerNonTaxableSalaryDeductions,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.PayrollDeductions
      );
      this.#reportingYear.ReportData.income_partnerPayrollDeductions =
        this.#fixedIncomeStreams.retirement.partnerNonTaxableSalaryDeductions;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.retirement
          .partnerWagesAndCompensationEstimatedWithholdings,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );

      this.#reportingYear.ReportData.income_partnerWagesWithholdings =
        this.#fixedIncomeStreams.retirement.partnerWagesAndCompensationEstimatedWithholdings;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_WAGES,
        ACCOUNT_TYPES.CASH,
        this.#fixedIncomeStreams.retirement
          .partnerWagesAndCompensationActualIncome,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#reportingYear.ReportData.income_partnerTakehomeWages =
        this.#fixedIncomeStreams.retirement.partnerWagesAndCompensationActualIncome;
    }
    // this.#reportingYear.ReportData.dump("Wages and Compensation Report");
    // debugger;
  }

  #applySavingsInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);

    this.#reportingYear.ReportData.income_savingsInterest = this.#accountYear
      .getDeposits(ACCOUNT_TYPES.SAVINGS, TransactionCategory.Interest)
      .asCurrency();

    // debugger;
  }

  #apply401kInterest() {
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SUBJECT_401K);
    this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.PARTNER_401K);

    this.#reportingYear.ReportData.retirementAcct_subject401kInterest =
      this.#accountYear
        .getDeposits(ACCOUNT_TYPES.SUBJECT_401K, TransactionCategory.Interest)
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partner401kInterest =
      this.#accountYear
        .getDeposits(ACCOUNT_TYPES.PARTNER_401K, TransactionCategory.Interest)
        .asCurrency();

    // debugger;
  }

  #applyRothInterest() {
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    );
    this.#accountYear.recordInterestEarnedForYear(
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    );

    this.#reportingYear.ReportData.retirementAcct_subjectRothInterest =
      this.#accountYear
        .getDeposits(
          ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
          TransactionCategory.Interest
        )
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partnerRothInterest =
      this.#accountYear
        .getDeposits(
          ACCOUNT_TYPES.PARTNER_ROTH_IRA,
          TransactionCategory.Interest
        )
        .asCurrency();

    // debugger;
  }

  #processIncomeTaxes() {
    this.#ssBreakdown = this.#determineSocialSecurityBreakdown();

    const grossIncome =
      this.#fixedIncomeStreams.grossTaxableIncome +
      this.#adjustableIncomeStreams.grossTaxableIncome;
    const taxableIncome = grossIncome - this.#ssBreakdown.nonTaxableAmount;

    this.#taxes = Taxes.CreateFromTaxableIncome(
      grossIncome,
      taxableIncome,
      this.#fixedIncomeStreams.nonTaxableIncome,
      this.#fiscalData,
      this.#demographics
    );

    const federalIncomeTaxOwed = this.#taxes.federalTaxesOwed.asCurrency();

    this.#reportingYear.ReportData.taxes_federalIncomeTaxOwed =
      federalIncomeTaxOwed;

    this.#reportingYear.ReportData.taxes_grossIncome =
      this.#taxes.totalTaxableIncome.asCurrency();
    this.#reportingYear.ReportData.taxes_adjustedGrossIncome =
      this.#taxes.adjustedGrossIncome.asCurrency();
    this.#reportingYear.ReportData.taxes_standardDeduction =
      this.#taxes.standardDeduction.asCurrency();
    this.#reportingYear.ReportData.taxes_taxableIncome =
      this.#taxes.taxableIncome.asCurrency();
    this.#reportingYear.ReportData.taxes_nonTaxableIncome =
      this.#ssBreakdown.nonTaxableAmount.asCurrency();

    const withholdings = Math.max(
      this.#accountYear.getAnnualRevenues(
        ACCOUNT_TYPES.TAXES,
        TransactionCategory.Withholdings
      ),
      0
    );

    this.#reportingYear.ReportData.taxes_totalWithholdings = withholdings;

    const taxesOwed = federalIncomeTaxOwed - withholdings;

    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.TAXES,
      TransactionCategory.TaxPayment,
      TransactionRoutes.External,
      federalIncomeTaxOwed,
      PERIODIC_FREQUENCY.ANNUAL_TRAILING
    );

    if (taxesOwed < 0) {
      const refundAmount = -taxesOwed;

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.TAXES,
        ACCOUNT_TYPES.SAVINGS,
        refundAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxRefund
      );
      this.#reportingYear.ReportData.taxes_overPayment = refundAmount;
    }

    if (taxesOwed > 0) {
      const savingsBalance = this.#accountYear.getEndingBalance(
        ACCOUNT_TYPES.SAVINGS
      );
      // if (taxesOwed > savingsBalance) {
      //   console.warn(
      //     "Warning: Taxes due exceed available savings. Partial payment will be made."
      //   );
      // }
      const withdrawalAmount = taxesOwed; // Math.min(taxesOwed, savingsBalance);
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.TAXES,
        withdrawalAmount,
        PERIODIC_FREQUENCY.ANNUAL_TRAILING,
        TransactionCategory.TaxPayment
      );
      this.#reportingYear.ReportData.taxes_underPayment = withdrawalAmount;
    }
    // debugger;
  }

  #processMonthlySpending() {
    // Any income left after spending goes into savings

    const cash = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);

    const spend = this.#fiscalData.spend.asCurrency();

    const actualSpend = Math.min(cash, spend);

    this.#reportingYear.ReportData.ask = spend;
    this.#reportingYear.ReportData.spend = actualSpend.asCurrency();
    this.#reportingYear.ReportData.spending_overriding = this.#fiscalData.overridingSpend;
    this.#reportingYear.ReportData.takeHome = cash.asCurrency();

    if (cash <= 0) {
      console.warn("Warning: No cash available to cover spending.");
      return;
    }

    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Spend,
      TransactionRoutes.External,
      actualSpend,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.surplusSpend = (cash - spend).asCurrency();

    if (this.surplusSpend == 0) return;

    if (this.surplusSpend > 0) {
      // Deposit surplus income into savings account
      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.CASH,
        ACCOUNT_TYPES.SAVINGS,
        this.surplusSpend,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.SurplusIncome
      );

      this.#reportingYear.ReportData.spending_surplus = this.surplusSpend;
    }

    if (this.surplusSpend < 0) {
      // Withdraw from savings to cover spending shortfall
      const availableSavings = this.#accountYear.getEndingBalance(
        ACCOUNT_TYPES.SAVINGS
      );

      if (availableSavings <= 0) {
        console.warn(
          "Warning: No savings available to cover spending shortfall."
        );
        return;
      }

      const withdrawalAmount = -this.surplusSpend; // Math.min(-this.surplusSpend, availableSavings);

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SAVINGS,
        ACCOUNT_TYPES.CASH,
        withdrawalAmount,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeShortfall
      );

      this.#reportingYear.ReportData.spending_shortfall = -this.surplusSpend;

      this.#accountYear.processAsPeriodicWithdrawals(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.Spend,
        TransactionRoutes.External,
        withdrawalAmount,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
  }

  // END COPIED FROM WORKING YEAR CALCULATOR

  processRetirementYearData() {
    // debugger;
    this.#processWagesAndCompensation();
    this.#processMiscIncome();
    this.#processTaxFreeIncome();

    // Process non-variable income streams into savings account
    this.#processPensionIncome();
    this.#processSocialSecurityIncome();

    // this.#processSavingsContributions();

    this.determineRetirementAccountWithdrawalPortions();

    this.#drawRothPortions();
    this.#draw401kPortions();
    this.#drawSavingsPortion();

    this.#processMonthlySpending();

    this.#apply401kInterest();
    this.#applyRothInterest();
    this.#applySavingsInterest();

    this.#processIncomeTaxes();

    this.#generateReportData();

    const retirementYearData = RetirementYearData.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear,
      this.#taxes,
      this.#reportingYear.ReportData
    );

    return retirementYearData;
  }
  determineRetirementAccountWithdrawalPortions() {
    this.#accountPortioner?.calculatePortions(this.#cashAccountBalance);
  }

  get #cashAccountBalance() {
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
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.CashTransfer
    );
  }

  // #applySavingsInterest() {
  //   this.#accountYear.recordInterestEarnedForYear(ACCOUNT_TYPES.SAVINGS);
  // }

  #determineSocialSecurityBreakdown() {
    const ssBreakdown = SsBenefitsCalculator.CalculateSsBreakdown(
      this.#demographics,
      this.#fixedIncomeStreams,
      this.#adjustableIncomeStreams
    );

    this.#reportingYear.ReportData.taxes_ssWithholdingRate =
      this.#inputs.flatSsWithholdingRate;

    this.#reportingYear.ReportData.ss_subjectSsGross +=
      this.#fixedIncomeStreams.subjectSsGross ?? 0;
    this.#reportingYear.ReportData.ss_subjectSsWithholdings +=
      this.#fixedIncomeStreams.subjectSsWithholdings ?? 0;
    this.#reportingYear.ReportData.ss_subjectSsTakehome +=
      this.#fixedIncomeStreams.subjectSsActualIncome ?? 0;

    this.#reportingYear.ReportData.ss_partnerSsGross +=
      this.#fixedIncomeStreams.partnerSsGross ?? 0;
    this.#reportingYear.ReportData.ss_partnerSsWithholdings +=
      this.#fixedIncomeStreams.partnerSsWithholdings ?? 0;
    this.#reportingYear.ReportData.ss_partnerSsTakehome +=
      this.#fixedIncomeStreams.partnerSsActualIncome ?? 0;

    this.#reportingYear.ReportData.ss_subjectSsTaxable =
      ssBreakdown.subjectTaxablePortion;
    this.#reportingYear.ReportData.ss_partnerSsTaxable =
      ssBreakdown.partnerTaxablePortion;
    this.#reportingYear.ReportData.ss_provisionalIncome =
      ssBreakdown.provisionalIncome;
    this.#reportingYear.ReportData.ss_threshold1 = ssBreakdown.tier1Threshold;
    this.#reportingYear.ReportData.ss_threshold2 = ssBreakdown.tier2Threshold;
    this.#reportingYear.ReportData.ss_nonSocialSecurityTaxableIncome =
      ssBreakdown.otherTaxableIncome;
    this.#reportingYear.ReportData.ss_tier1TaxableAmount =
      ssBreakdown.tier1TaxableAmount;
    this.#reportingYear.ReportData.ss_tier2TaxableAmount =
      ssBreakdown.tier2TaxableAmount;

    return ssBreakdown;
  }

  // #processIncomeTaxes() {
  //   this.#ssBreakdown = this.#determineSocialSecurityBreakdown();

  //   const grossIncome =
  //     this.#fixedIncomeStreams.grossTaxableIncome +
  //     this.#adjustableIncomeStreams.grossTaxableIncome;
  //   const taxableIncome = grossIncome - this.#ssBreakdown.nonTaxableAmount;

  //   this.#taxes = Taxes.CreateFromTaxableIncome(
  //     grossIncome,
  //     taxableIncome,
  //     this.#fiscalData,
  //     this.#demographics
  //   );

  //   const totalWithholdings = this.#accountYear.getAnnualRevenues(
  //     ACCOUNT_TYPES.TAXES,
  //     TransactionCategory.Withholdings
  //   );

  //   const taxesDue = this.#taxes.federalTaxesOwed.asCurrency();

  //   const taxUnderpayment = taxesDue - totalWithholdings;
  //   const taxOverpayment = -taxUnderpayment;

  //   if (taxesDue < totalWithholdings) {
  //     this.#accountYear.withdrawal(
  //       ACCOUNT_TYPES.TAXES,
  //       TransactionCategory.TaxPayment,
  //       TransactionRoutes.External,
  //       taxesDue.asCurrency(),
  //       12,
  //       31,
  //       "Pay the Feds"
  //     );
  //   }

  //   if (taxUnderpayment > 0) {
  //     // Need to withdraw from savings to cover tax underpayment
  //     const availableSavings = this.#accountYear.getEndingBalance(
  //       ACCOUNT_TYPES.SAVINGS
  //     );

  //     if (taxUnderpayment > availableSavings) {
  //       console.warn(
  //         "Warning: Taxes due exceed available savings. Partial payment will be made."
  //       );
  //     }

  //     const withdrawalAmount = Math.min(taxUnderpayment, availableSavings);

  //     // Transfer withdrawal amount from savings to tax account
  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.SAVINGS,
  //       ACCOUNT_TYPES.TAXES,
  //       withdrawalAmount,
  //       PERIODIC_FREQUENCY.ANNUAL_TRAILING,
  //       TransactionCategory.TaxPayment,
  //       "Cover taxes shortfall"
  //     );

  //     // Requery the tax account balance after transfer from savings
  //     const taxAccountDeposits = this.#accountYear.getDeposits(
  //       ACCOUNT_TYPES.TAXES
  //     );

  //     this.#accountYear.withdrawal(
  //       ACCOUNT_TYPES.TAXES,
  //       TransactionCategory.TaxPayment,
  //       TransactionRoutes.External,
  //       taxAccountDeposits.asCurrency(),
  //       12,
  //       31,
  //       "Pay the Feds"
  //     );
  //   }

  //   if (taxOverpayment > 0) {
  //     // Refund the overpayment to savings
  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.TAXES,
  //       ACCOUNT_TYPES.SAVINGS,
  //       taxOverpayment,
  //       PERIODIC_FREQUENCY.ANNUAL_TRAILING,
  //       TransactionCategory.TaxRefund,
  //       "Overpayment refund"
  //     );
  //   }
  // }

  #dumpAccountReports() {
    // WAGES AND COMPENSATION
    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_WAGES
    ].dumpCategorySummaries();

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_WAGES
    ].dumpAccountActivity();

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_WAGES
    ].dumpCategorySummaries();

    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpCategorySummaries();
    this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpAccountActivity();

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_401K
    ].dumpCategorySummaries();
    // debugger;

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_401K
    ].dumpCategorySummaries();

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA
    ].dumpCategorySummaries();
    // debugger;

    this.#accountYear.analyzers[
      ACCOUNT_TYPES.PARTNER_ROTH_IRA
    ].dumpCategorySummaries();

    this.#accountYear.analyzers[ACCOUNT_TYPES.TAXES].dumpAccountActivity();
    this.#accountYear.analyzers[ACCOUNT_TYPES.TAXES].dumpCategorySummaries();

    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpCategorySummaries();
    this.#accountYear.analyzers[ACCOUNT_TYPES.SAVINGS].dumpAccountActivity();
  }

  #generateReportData() {
    this.#reportingYear.ReportData.retirementAcct_subject401kOpenBalance =
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_401K);
    this.#reportingYear.ReportData.retirementAcct_subject401kWithdrawals =
      this.#accountYear.getWithdrawals(ACCOUNT_TYPES.SUBJECT_401K).asCurrency();
    this.#reportingYear.ReportData.retirementAcct_subject401kDeposits =
      this.#accountYear.getDeposits(ACCOUNT_TYPES.SUBJECT_401K).asCurrency();
    this.#reportingYear.ReportData.retirementAcct_subject401kBalance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_401K);

    this.#reportingYear.ReportData.retirementAcct_partner401kOpenBalance =
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.PARTNER_401K);
    this.#reportingYear.ReportData.retirementAcct_partner401kWithdrawals =
      this.#accountYear.getWithdrawals(ACCOUNT_TYPES.PARTNER_401K).asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partner401kDeposits =
      this.#accountYear.getDeposits(ACCOUNT_TYPES.PARTNER_401K).asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partner401kBalance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.PARTNER_401K);

    this.#reportingYear.ReportData.taxes_pensionWithholdingRate =
      this.#inputs.flatPensionWithholdingRate;

    this.#reportingYear.ReportData.income_subjectPensionGross =
      this.#fixedIncomeStreams?.subjectPensionGross ?? 0;
    this.#reportingYear.ReportData.income_subjectPensionWithholdings =
      this.#fixedIncomeStreams?.subjectPensionWithholdings ?? 0;
    this.#reportingYear.ReportData.income_subjectPensionTakehome =
      this.#fixedIncomeStreams?.subjectPensionActualIncome ?? 0;

    this.#reportingYear.ReportData.income_partnerPensionGross =
      this.#fixedIncomeStreams?.partnerPensionGross ?? 0;
    this.#reportingYear.ReportData.income_partnerPensionWithholdings =
      this.#fixedIncomeStreams?.partnerPensionWithholdings ?? 0;
    this.#reportingYear.ReportData.income_partnerPensionTakehome =
      this.#fixedIncomeStreams?.partnerPensionActualIncome ?? 0;

    this.#reportingYear.ReportData.income_pensionBreakdowns = this.#fixedIncomeStreams.pensionAnnunityBreakdowns;

    this.#reportingYear.ReportData.retirementAcct_subjectRothOpenBalance =
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SUBJECT_ROTH_IRA);
    this.#reportingYear.ReportData.retirementAcct_subjectRothWithdrawals =
      this.#accountYear
        .getWithdrawals(ACCOUNT_TYPES.SUBJECT_ROTH_IRA)
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_subjectRothDeposits =
      this.#accountYear
        .getDeposits(ACCOUNT_TYPES.SUBJECT_ROTH_IRA)
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_subjectRothBalance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_ROTH_IRA);

    this.#reportingYear.ReportData.retirementAcct_partnerRothOpenBalance =
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.PARTNER_ROTH_IRA);
    this.#reportingYear.ReportData.retirementAcct_partnerRothWithdrawals =
      this.#accountYear
        .getWithdrawals(ACCOUNT_TYPES.PARTNER_ROTH_IRA)
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partnerRothDeposits =
      this.#accountYear
        .getDeposits(ACCOUNT_TYPES.PARTNER_ROTH_IRA)
        .asCurrency();
    this.#reportingYear.ReportData.retirementAcct_partnerRothBalance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.PARTNER_ROTH_IRA);

    this.#reportingYear.ReportData.savings_OpeningBalance =
      this.#accountYear.getStartingBalance(ACCOUNT_TYPES.SAVINGS);
    // this.#reportingYear.ReportData.savings_Deposits = this.#accountYear
    //   .getDeposits(ACCOUNT_TYPES.SAVINGS)
    //   .asCurrency();
    this.#reportingYear.ReportData.savings_Withdrawals = this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SAVINGS)
      .asCurrency();
    this.#reportingYear.ReportData.savings_Balance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS);
  }

  // #processMonthlySpending() {
  //   const actualIncome = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);
  //   const spend = this.#fiscalData.spend;

  //   // Any money not used from the spend budget goes back into savings
  //   if (actualIncome > spend) {
  //     const surplusAmount = actualIncome - spend;
  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.CASH,
  //       ACCOUNT_TYPES.SAVINGS,
  //       surplusAmount,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.SurplusIncome
  //     );
  //   }
  //   if (actualIncome < spend) {
  //     // Any money needed to cover the spend budget deficit is withdrawn from savings
  //     const deficitAmount = spend - actualIncome;
  //     const availableFunds = this.#accountYear.getAvailableFunds([
  //       ACCOUNT_TYPES.SAVINGS,
  //     ]);
  //     if (availableFunds > 0) {
  //       const catchupAmount = Math.min(deficitAmount, availableFunds);

  //       this.#accountYear.processAsPeriodicTransfers(
  //         ACCOUNT_TYPES.SAVINGS,
  //         ACCOUNT_TYPES.CASH,
  //         catchupAmount,
  //         PERIODIC_FREQUENCY.MONTHLY,
  //         TransactionCategory.IncomeShortfall
  //       );
  //     }
  //   }
  // }

  // #processWagesIncome() {
  //   this.#processSubjectWagesIncome();
  //   this.#processPartnerWagesIncome();
  // }

  // #processSubjectWagesIncome() {
  //   if (
  //     this.#fixedIncomeStreams?.subjectRetirementWagesAndCompensationGross ??
  //     0 > 0
  //   ) {
  //     this.#accountYear.processAsPeriodicDeposits(
  //       ACCOUNT_TYPES.SUBJECT_WAGES,
  //       TransactionCategory.IncomeGross,
  //       TransactionRoutes.External,
  //       this.#fixedIncomeStreams?.subjectRetirementWagesAndCompensationGross ??
  //         0,
  //       PERIODIC_FREQUENCY.MONTHLY
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.SUBJECT_WAGES,
  //       ACCOUNT_TYPES.TAXES,
  //       this.#fixedIncomeStreams
  //         ?.subjectRetirementWagesAndCompensationEstimatedWithholdings ?? 0,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.Withholdings
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.SUBJECT_WAGES,
  //       ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS,
  //       this.#fixedIncomeStreams.subjectRetirementNonTaxableSalaryReductions,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.PayrollDeductions
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.SUBJECT_WAGES,
  //       ACCOUNT_TYPES.CASH,
  //       this.#fixedIncomeStreams
  //         ?.subjectRetirementWagesAndCompensationActualIncome ?? 0,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.IncomeNet
  //     );
  //   }
  // }

  // #processPartnerWagesIncome() {
  //   if (
  //     this.#fixedIncomeStreams?.partnerRetirementWagesAndCompensationGross ??
  //     0 > 0
  //   ) {
  //     this.#accountYear.processAsPeriodicDeposits(
  //       ACCOUNT_TYPES.PARTNER_WAGES,
  //       TransactionCategory.IncomeGross,
  //       TransactionRoutes.External,
  //       this.#fixedIncomeStreams?.partnerRetirementWagesAndCompensationGross ??
  //         0,
  //       PERIODIC_FREQUENCY.MONTHLY
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.PARTNER_WAGES,
  //       ACCOUNT_TYPES.TAXES,
  //       this.#fixedIncomeStreams
  //         ?.partnerRetirementWagesAndCompensationEstimatedWithholdings ?? 0,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.Withholdings
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.PARTNER_WAGES,
  //       ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS,
  //       this.#fixedIncomeStreams.partnerRetirementNonTaxableSalaryReductions,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.PayrollDeductions
  //     );

  //     this.#accountYear.processAsPeriodicTransfers(
  //       ACCOUNT_TYPES.PARTNER_WAGES,
  //       ACCOUNT_TYPES.CASH,
  //       this.#fixedIncomeStreams
  //         ?.partnerRetirementWagesAndCompensationActualIncome ?? 0,
  //       PERIODIC_FREQUENCY.MONTHLY,
  //       TransactionCategory.IncomeNet
  //     );
  //   }
  // }

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
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.SUBJECT_SOCIAL_SECURITY,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.subjectSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );
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
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#accountYear.processAsPeriodicTransfers(
        ACCOUNT_TYPES.PARTNER_SOCIAL_SECURITY,
        ACCOUNT_TYPES.TAXES,
        this.#fixedIncomeStreams.partnerSsWithholdings ?? 0,
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.Withholdings
      );
    }
  }

  #processPensionIncome() {
    // debugger;
    if (this.#fixedIncomeStreams.combinedPensionActualIncome.asCurrency() == 0)
      return;

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_PENSION,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams?.subjectPensionGross.asCurrency() ?? 0,
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
  }

  #draw401kPortions() {
    this.#reportingYear.ReportData.taxes_401kWithholdingRate =
      this.#fiscalData.flatTrad401kWithholdingRate;

    const portionedGrossAmountCombined =
      this.#accountPortioner?.trad401kAccountPortions
        ?.combinedFinalWithdrawalGross ?? 0;
    if (portionedGrossAmountCombined <= 0) return;

    const subjectGrossFundsAvailable = this.#demographics
      .isSubjectEligibleFor401k
      ? this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.SUBJECT_401K])
      : 0;

    const partnerGrossFundsAvailable = this.#demographics
      .isPartnerEligibleFor401k
      ? this.#accountYear.getAvailableFunds([ACCOUNT_TYPES.PARTNER_401K])
      : 0;

    const combinedGrossFundsAvailable =
      subjectGrossFundsAvailable + partnerGrossFundsAvailable;

    if (combinedGrossFundsAvailable <= 0) return;

    const combinedGrossWithdrawalAmount = Math.min(
      portionedGrossAmountCombined,
      combinedGrossFundsAvailable
    );

    const subjectPortion =
      subjectGrossFundsAvailable / combinedGrossFundsAvailable;
    const partnerPortion = 1 - subjectPortion;

    const subjectGrossWithdrawalAmount =
      combinedGrossWithdrawalAmount * subjectPortion;

    const partnerGrossWithdrawalAmount =
      combinedGrossWithdrawalAmount * partnerPortion;

    this.#processSubjectGrossPeriodic401kIncome(subjectGrossWithdrawalAmount);

    this.#processPartnerGrossPeriodic401kIncome(partnerGrossWithdrawalAmount);
  }

  /**
   * @param {number} grossAmount
   * @param {string} [memo]
   */
  #processSubjectGrossPeriodic401kIncome(grossAmount, memo) {
    const actualAmount = Common.convertGross401kToActual401k(
      grossAmount,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.CASH,
      actualAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet,
      memo
    );

    const withholdingAmount = grossAmount - actualAmount;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_401K,
      ACCOUNT_TYPES.TAXES,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings,
      memo
    );

    this.#reportingYear.ReportData.income_subject401kGross =
      grossAmount.asCurrency();
    this.#reportingYear.ReportData.income_subject401kWithholdings =
      withholdingAmount.asCurrency();
    this.#reportingYear.ReportData.income_subject401kTakehome =
      actualAmount.asCurrency();
  }

  /**
   * @param {number} grossAmount
   * @param {string} [memo]
   */
  #processPartnerGrossPeriodic401kIncome(grossAmount, memo) {
    const actualAmount = Common.convertGross401kToActual401k(
      grossAmount,
      this.#fiscalData.flatTrad401kWithholdingRate ?? 0
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_401K,
      ACCOUNT_TYPES.CASH,
      actualAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet,
      memo
    );

    const withholdingAmount = grossAmount - actualAmount;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_401K,
      ACCOUNT_TYPES.TAXES,
      withholdingAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings,
      memo
    );

    this.#reportingYear.ReportData.income_partner401kGross =
      grossAmount.asCurrency();
    this.#reportingYear.ReportData.income_partner401kWithholdings +=
      withholdingAmount.asCurrency();
    this.#reportingYear.ReportData.income_partner401kTakehome +=
      actualAmount.asCurrency();
  }

  // #applyRothInterest() {
  //   this.#accountYear.recordInterestEarnedForYear(
  //     ACCOUNT_TYPES.SUBJECT_ROTH_IRA
  //   );

  //   this.#accountYear.recordInterestEarnedForYear(
  //     ACCOUNT_TYPES.PARTNER_ROTH_IRA
  //   );
  // }

  #drawRothPortions() {
    const desiredRothWithdrawal =
      this.#accountPortioner?.rothIraWithdrawal ?? 0;
    if (desiredRothWithdrawal <= 0) return;

    const subjectAvailableRothFunds = this.#demographics
      .isSubjectEligibleFor401k
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SUBJECT_ROTH_IRA)
      : 0;

    const partnerAvailableRothFunds = this.#demographics
      .isPartnerEligibleFor401k
      ? this.#accountYear.getEndingBalance(ACCOUNT_TYPES.PARTNER_ROTH_IRA)
      : 0;

    const combinedAvaiableRothFunds = (
      subjectAvailableRothFunds + partnerAvailableRothFunds
    ).asCurrency();

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
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#reportingYear.ReportData.retirementAcct_subjectRothWithdrawals +=
        subjectShareAmount.asCurrency();
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
        PERIODIC_FREQUENCY.MONTHLY,
        TransactionCategory.IncomeNet
      );

      this.#reportingYear.ReportData.retirementAcct_partnerRothWithdrawals +=
        partnerShareAmount;
    }
  }
}

export { RetirementYearCalculator };
