import { BaseReports } from "./cBaseReports.js";

class ReportData extends BaseReports {
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
  }

  // RETIREMENT ACCOUNTS
  get retirementAcct_subject401kWithdrawalNet() {
    return this.retirementAcct_subject401kWithdrawalGross - this.taxes_subject401kWithholdings;
  }

  get retirementAcct_partner401kWithdrawalNet() {
    return this.retirementAcct_partner401kWithdrawalGross - this.taxes_partner401kWithholdings;
  }

  // SOCIAL SECURITY
  get filingStatus() {
    return this.demographics_isMarriedFilingJointly ? "Married Filing Jointly" : "Single";
  }

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
