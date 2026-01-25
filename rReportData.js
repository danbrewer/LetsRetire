import { BaseReports } from "./cBaseReports.js";

class ReportData extends BaseReports {
  static dumpOrder = [
    // DEMOGRAPHICS
    "demographics_subjectAge",
    "demographics_partnerAge",
    "demographics_isMarriedFilingJointly",
    "demographics_numberOfDependents",
    "demographics_filingStatus",
    // WAGES AND COMPENSATION
    "income_subjectGrossWages",
    "income_subject401kContribution",
    "income_subjectEstimatedWithholdings",
    "income_subjectNonTaxableSalaryDeductions",
    "income_subjectTakehomeWages",
    "income_partnerGrossWages",
    "income_partner401kContribution",
    "income_partnerNonTaxableSalaryDeductions",
    "income_partnerEstimatedWithholdings",
    "income_partnerTakehomeWages",
    "income_miscTaxableIncome",
    "income_savingsInterest",
    "income_subject401k",
    "income_partner401k",
    "income_subjectPension",
    "income_partnerPension",
    "income_shortfallAfterSpending",
    "income_surplusAfterSpending",
    "income_nonTaxableIncome",
    // TAXES
    "taxes_standardDeduction",
    "taxes_ssTaxableIncome",
    "taxes_nonSsTaxableIncome",
    "taxes_miscIncomeWithholdings",
    "taxes_subjectWagesWithholdings",
    "taxes_partnerWagesWithholdings",
    "taxes_subject401kWithholdings",
    "taxes_partner401kWithholdings",
    "taxes_subjectPensionWithholdings",
    "taxes_partnerPensionWithholdings",
    "taxes_additionalWithholdings",
    // SOCIAL SECURITY
    "ss_subjectSsGross",
    "ss_partnerSsGross",
    "ss_subjectSsTaxable",
    "ss_partnerSsTaxable",
    "ss_totalSsGross",
    "ss_totalSsTaxable",
    "ss_subjectSsNonTaxable",
    "ss_partnerSsNonTaxable",
    "ss_totalSsNonTaxable",
    "ss_provisionalIncome",
    "ss_threshold1",
    "ss_threshold2",
    "ss_nonSocialSecurityTaxableIncome",
    "ss_tier1TaxableAmount",
    "ss_tier2TaxableAmount",
    // RETIREMENT ACCOUNTS
    "retirementAcct_subject401kBalance",
    "retirementAcct_partner401kBalance",
    "retirementAcct_subjectRothIraBalance",
    "retirementAcct_partnerRothIraBalance",
    "retirementAcct_subject401kWithdrawalGross",
    "retirementAcct_subject401kWithdrawalNet",
    "retirementAcct_partner401kWithdrawalGross",
    "retirementAcct_partner401kWithdrawalNet",
    "retirementAcct_subjectRothIraWithdrawal",
    "retirementAcct_partnerRothIraWithdrawal",
    "retirementAcct_partner401kInterest",
    "retirementAcct_subject401kInterest",
    "retirementAcct_savingsBalance",

    // ... etc ...
  ];
  constructor() {
    super();

    // DEMOGRAPHICS
    this.demographics_subjectAge = 0;
    this.demographics_partnerAge = 0;
    this.demographics_isMarriedFilingJointly = false;
    this.demographics_numberOfDependents = 0;

    // WAGES AND COMPENSATION
    this.income_subjectGrossWages = 0;
    this.income_subject401kContribution = 0;
    this.income_subjectEstimatedWithholdings = 0;
    this.income_subjectNonTaxableSalaryDeductions = 0;
    this.income_subjectTakehomeWages = 0;

    this.income_partnerGrossWages = 0;
    this.income_partner401kContribution = 0;
    this.income_partnerNonTaxableSalaryDeductions = 0;
    this.income_partnerEstimatedWithholdings = 0;
    this.income_partnerTakehomeWages = 0;

    this.income_miscTaxableIncome = 0;
    this.income_savingsInterest = 0;
    this.income_subject401k = 0;
    this.income_partner401k = 0;
    this.income_subjectPension = 0;
    this.income_partnerPension = 0;

    this.income_shortfallAfterSpending = 0;
    this.income_surplusAfterSpending = 0;
    this.income_nonTaxableIncome = 0;

    // TAXES
    this.taxes_standardDeduction = 0;
    this.taxes_ssTaxableIncome = 0;
    this.taxes_nonSsTaxableIncome = 0;
    this.taxes_miscIncomeWithholdings = 0;
    this.taxes_subjectWagesWithholdings = 0;
    this.taxes_partnerWagesWithholdings = 0;
    this.taxes_subject401kWithholdings = 0;
    this.taxes_partner401kWithholdings = 0;
    this.taxes_subjectPensionWithholdings = 0;
    this.taxes_partnerPensionWithholdings = 0;
    this.taxes_additionalWithholdings = 0;

    // SOCIAL SECURITY
    this.ss_subjectSsGross = 0;
    this.ss_partnerSsGross = 0;
    this.ss_subjectSsTaxable = 0;
    this.ss_partnerSsTaxable = 0;

    this.ss_provisionalIncome = 0;
    this.ss_threshold1 = 0;
    this.ss_threshold2 = 0;
    this.ss_nonSocialSecurityTaxableIncome = 0;
    this.ss_tier1TaxableAmount = 0;
    this.ss_tier2TaxableAmount = 0;

    // RETIREMENT ACCOUNTS
    this.retirementAcct_subject401kBalance = 0;
    this.retirementAcct_partner401kBalance = 0;
    this.retirementAcct_subjectRothIraBalance = 0;
    this.retirementAcct_partnerRothIraBalance = 0;

    this.retirementAcct_subject401kWithdrawalGross = 0;
    this.retirementAcct_partner401kWithdrawalGross = 0;
    this.retirementAcct_subjectRothIraWithdrawal = 0;
    this.retirementAcct_partnerRothIraWithdrawal = 0;
    this.retirementAcct_partner401kInterest = 0;
    this.retirementAcct_subject401kInterest = 0;
    this.retirementAcct_savingsBalance = 0;
  }

  get demographics_filingStatus() {
    return this.demographics_isMarriedFilingJointly
      ? "Married Filing Jointly"
      : "Single";
  }

  // RETIREMENT ACCOUNTS
  get retirementAcct_subject401kWithdrawalNet() {
    return (
      this.retirementAcct_subject401kWithdrawalGross -
      this.taxes_subject401kWithholdings
    );
  }

  get retirementAcct_partner401kWithdrawalNet() {
    return (
      this.retirementAcct_partner401kWithdrawalGross -
      this.taxes_partner401kWithholdings
    );
  }

  // SOCIAL SECURITY

  get ss_totalSsGross() {
    return this.ss_subjectSsGross + this.ss_partnerSsGross;
  }

  get ss_totalSsTaxable() {
    return this.ss_subjectSsTaxable + this.ss_partnerSsTaxable;
  }

  get ss_subjectSsNonTaxable() {
    return this.ss_subjectSsGross - this.ss_subjectSsTaxable;
  }

  get ss_partnerSsNonTaxable() {
    return this.ss_partnerSsGross - this.ss_partnerSsTaxable;
  }

  get ss_totalSsNonTaxable() {
    return this.ss_subjectSsNonTaxable + this.ss_partnerSsNonTaxable;
  }
}

export { ReportData };
