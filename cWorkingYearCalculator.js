import { ACCOUNT_TYPES } from "./cAccount.js";
import { AccountingYear } from "./cAccountingYear.js";
import { Demographics } from "./cDemographics.js";
import { FiscalData } from "./cFiscalData.js";
import { FixedIncomeStreams } from "./cFixedIncomeStreams.js";
import { Inputs } from "./cInputs.js";
import { TAX_BASE_YEAR, PERIODIC_FREQUENCY } from "./consts.js";
import { ReportingYear } from "./cReporting.js";
import { Taxes } from "./cTaxes.js";
import { TransactionCategory } from "./cTransaction.js";
import { WorkingYearData } from "./cWorkingYearData.js";
import { TransactionRoutes } from "./tTransactionRoute.js";

/**
 * WorkingYearIncomeCalculator class - Handles working year income and accumulation calculations
 * Provides comprehensive analysis for the accumulation phase of retirement planning
 */
class WorkingYearCalculator {
  /** @type {Inputs} */
  #inputs;
  /** @type {FiscalData} */
  #fiscalData;
  /** @type {AccountingYear} */
  #accountYear;
  /** @type {Demographics} */
  #demographics;
  /** @type {FixedIncomeStreams} */
  #fixedIncomeStreams;
  /** @type {ReportingYear} */
  #reportingYear;
  // /** @type {WorkingYearIncome} */
  // #workingYearIncome;

  /**
   * Create working year income calculator with input configuration
   * @param {Inputs} inputs - Input configuration object containing salary, contribution rates, etc.
   * @param {AccountingYear} accountYear - AccountYear instance containing all accounts
   * @param {ReportingYear} reportingYear - ReportingYear instance for the year
   */
  constructor(inputs, accountYear, reportingYear) {
    this.#inputs = inputs;
    this.#accountYear = accountYear;
    this.#demographics = Demographics.CreateUsing(inputs, false, true);
    this.#fiscalData = FiscalData.CreateUsing(inputs, TAX_BASE_YEAR);
    this.#reportingYear = reportingYear;

    this.#fixedIncomeStreams = FixedIncomeStreams.CreateUsing(
      this.#demographics,
      accountYear,
      this.#inputs
    );

    this.#reportingYear.ReportData.year = this.#fiscalData.taxYear;

    this.#reportingYear.ReportData.demographics_isMarriedFilingJointly =
      this.#demographics.hasPartner;
    this.#reportingYear.ReportData.demographics_subjectAge =
      this.#demographics.currentAge;
    this.#reportingYear.ReportData.demographics_partnerAge =
      this.#demographics.currentAgeOfPartner;

    // this.#workingYearIncome = WorkingYearIncome.CreateUsing(
    //   this.#fixedIncomeStreams,
    //   this.#demographics,
    //   this.#fiscalData,
    //   this.#accountYear
    // );
  }

  processWorkingYearData() {
    // **************
    // Calculations
    // **************
    this.#processWagesAndCompensation();
    this.#processMiscIncome();
    this.#processTaxFreeIncome();
    this.#processRothIraContributions();
    this.#processSavingsContributions();

    this.#processMonthlySpending();

    // Now calculate interest earned on accounts
    this.#applySavingsInterest();
    this.#apply401kInterest();
    this.#applyRothInterest();

    this.#processIncomeTaxes();

    this.#dumpAccountReports();

    this.#generateReportData();

    // workingYearData.dump("working year data");
    // this.#reportingYear.ReportData.dump("ReportData");
    // debugger;

    const workingYearData = WorkingYearData.CreateUsing(
      this.#demographics,
      this.#fiscalData,
      this.#accountYear,
      this.#reportingYear.ReportData
    );

    return workingYearData;
  }
  #dumpAccountReports() {
    return;

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
    this.#reportingYear.ReportData.savings_Deposits = this.#accountYear
      .getDeposits(ACCOUNT_TYPES.SAVINGS)
      .asCurrency();
    this.#reportingYear.ReportData.savings_Withdrawals = this.#accountYear
      .getWithdrawals(ACCOUNT_TYPES.SAVINGS)
      .asCurrency();
    this.#reportingYear.ReportData.savings_Balance =
      this.#accountYear.getEndingBalance(ACCOUNT_TYPES.SAVINGS);
  }

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

      this.#reportingYear.ReportData.income_miscIncomeTakehome = miscIncome;

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

      this.#reportingYear.ReportData.income_miscIncomeTakehome = takeHomeAmount;
    }
  }

  #processTaxFreeIncome() {
    const taxFreeIncome = this.#fixedIncomeStreams.taxFreeIncomeAdjustment;
    if (taxFreeIncome > 0) {
      this.#accountYear.processAsPeriodicDeposits(
        ACCOUNT_TYPES.CASH,
        TransactionCategory.OtherNonTaxable,
        TransactionRoutes.External,
        taxFreeIncome,
        PERIODIC_FREQUENCY.MONTHLY
      );
    }
    this.#reportingYear.ReportData.income_taxFreeIncome = taxFreeIncome;

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

  #processSavingsContributions() {
    const subjectDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams.subjectSavingsContributionVariable,
      this.#fixedIncomeStreams.subjectSavingsContributionFixed
    ).asCurrency();

    const partnerDesiredSavingsContribution = Math.max(
      this.#fixedIncomeStreams.partnerSavingsContributionVariable,
      this.#fixedIncomeStreams.partnerSavingsContributionFixed
    ).asCurrency();

    const desiredTransferAmount =
      subjectDesiredSavingsContribution + partnerDesiredSavingsContribution;

    if (desiredTransferAmount <= 0) return;

    let availableCash = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);

    if (availableCash <= 0) return;

    const actualTransferAmount = Math.min(
      availableCash,
      subjectDesiredSavingsContribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SAVINGS,
      actualTransferAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.AutoTransfer,
      "Combined contrib."
    );

    this.#reportingYear.ReportData.retirementAcct_subjectSavingsContributions +=
      actualTransferAmount;

    availableCash -= actualTransferAmount;

    const actualPartnerTransferAmount = Math.min(
      availableCash,
      partnerDesiredSavingsContribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SAVINGS,
      actualPartnerTransferAmount,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.AutoTransfer,
      "Combined contrib."
    );

    this.#reportingYear.ReportData.retirementAcct_partnerSavingsContributions +=
      actualPartnerTransferAmount;

    // this.#accountYear.analyzers[ACCOUNT_TYPES.CASH].dumpAccountActivity("");

    // debugger;
  }

  #processWagesAndCompensation() {
    // Subject wages and compensation
    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationGross,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#reportingYear.ReportData.income_subjectGrossWages =
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationGross;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.SUBJECT_401K,
      this.#fixedIncomeStreams.career.subjectAllowed401kContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.RetirementContribution
    );

    this.#reportingYear.ReportData.income_subject401kContribution =
      this.#fixedIncomeStreams.career.subjectAllowed401kContribution;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationEstimatedWithholdings,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#reportingYear.ReportData.income_subjectEstimatedWithholdings =
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationEstimatedWithholdings;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.SUBJECT_PAYROLL_DEDUCTIONS,
      this.#fixedIncomeStreams.career.subjectPayrollDeductions,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.PayrollDeductions
    );

    this.#reportingYear.ReportData.income_subjectPayrollDeductions =
      this.#fixedIncomeStreams.career.subjectPayrollDeductions;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.SUBJECT_WAGES,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    this.#reportingYear.ReportData.income_subjectTakehomeWages =
      this.#fixedIncomeStreams.career.subjectWagesAndCompensationActualIncome;

    // Partner wages and compensation

    this.#accountYear.processAsPeriodicDeposits(
      ACCOUNT_TYPES.PARTNER_WAGES,
      TransactionCategory.IncomeGross,
      TransactionRoutes.External,
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationGross,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.#reportingYear.ReportData.income_partnerGrossWages =
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationGross;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.PARTNER_401K,
      this.#fixedIncomeStreams.career.partnerAllowed401kContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.RetirementContribution
    );
    this.#reportingYear.ReportData.income_partner401kContribution =
      this.#fixedIncomeStreams.career.partnerAllowed401kContribution;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.PARTNER_PAYROLL_DEDUCTIONS,
      this.#fixedIncomeStreams.career.partnerNonTaxableSalaryDeductions,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.PayrollDeductions
    );
    this.#reportingYear.ReportData.income_partnerPayrollDeductions =
      this.#fixedIncomeStreams.career.partnerNonTaxableSalaryDeductions;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.TAXES,
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationEstimatedWithholdings,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.Withholdings
    );

    this.#reportingYear.ReportData.income_partnerEstimatedWithholdings =
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationEstimatedWithholdings;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.PARTNER_WAGES,
      ACCOUNT_TYPES.CASH,
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationActualIncome,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.IncomeNet
    );

    this.#reportingYear.ReportData.income_partnerTakehomeWages =
      this.#fixedIncomeStreams.career.partnerWagesAndCompensationActualIncome;

    // this.#reportingYear.ReportData.dump("Wages and Compensation Report");
    // debugger;
  }

  #processRothIraContributions() {
    if (this.#fixedIncomeStreams.career.subjectAllowedRothContribution <= 0) return;

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.SUBJECT_ROTH_IRA,
      this.#fixedIncomeStreams.career.subjectAllowedRothContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.RetirementContribution
    );

    this.#accountYear.processAsPeriodicTransfers(
      ACCOUNT_TYPES.CASH,
      ACCOUNT_TYPES.PARTNER_ROTH_IRA,
      this.#fixedIncomeStreams.career.partnerAllowedRothContribution,
      PERIODIC_FREQUENCY.MONTHLY,
      TransactionCategory.RetirementContribution
    );
  }

  #processMonthlySpending() {
    // Any income left after spending goes into savings

    const cash = this.#accountYear.getEndingBalance(ACCOUNT_TYPES.CASH);

    if (cash <= 0) {
      console.warn("Warning: No cash available to cover spending.");
      return;
    }

    const actualSpend = Math.min(cash, this.#fiscalData.spend);

    this.#reportingYear.ReportData.ask = this.#fiscalData.spend;
    this.#reportingYear.ReportData.spend = actualSpend;

    this.#accountYear.processAsPeriodicWithdrawals(
      ACCOUNT_TYPES.CASH,
      TransactionCategory.Spend,
      TransactionRoutes.External,
      actualSpend,
      PERIODIC_FREQUENCY.MONTHLY
    );

    this.surplusSpend = cash - this.#fiscalData.spend;

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

      const withdrawalAmount = Math.min(-this.surplusSpend, availableSavings);

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
    const actualTaxes = Taxes.CreateFromTaxableIncome(
      this.#fixedIncomeStreams.grossTaxableIncome,
      this.#fixedIncomeStreams.taxableIncome,
      this.#fiscalData,
      this.#demographics
    );

    const federalIncomeTaxOwed = actualTaxes.federalTaxesOwed.asCurrency();

    this.#reportingYear.ReportData.taxes_federalIncomeTaxOwed =
      federalIncomeTaxOwed;

    this.#reportingYear.ReportData.taxes_grossIncome =
      actualTaxes.totalTaxableIncome.asCurrency();
    this.#reportingYear.ReportData.taxes_adjustedGrossIncome =
      actualTaxes.adjustedGrossIncome.asCurrency();
    this.#reportingYear.ReportData.taxes_standardDeduction =
      actualTaxes.standardDeduction.asCurrency();
    this.#reportingYear.ReportData.taxes_taxableIncome =
      actualTaxes.taxableIncome.asCurrency();
    actualTaxes.totalTaxableIncome;

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
      Math.min(federalIncomeTaxOwed, withholdings),
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
      if (taxesOwed > savingsBalance) {
        console.warn(
          "Warning: Taxes due exceed available savings. Partial payment will be made."
        );
      }
      const withdrawalAmount = Math.min(taxesOwed, savingsBalance);
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
}

export { WorkingYearCalculator };
