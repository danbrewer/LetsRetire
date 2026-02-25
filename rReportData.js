import { BaseReports } from "./cBaseReports.js";

class ReportData extends BaseReports {
  static dumpIgnore = ["*"];
  static dumpOrder = [
    // DEMOGRAPHICS
    "demographics_subjectAge",
    "demographics_partnerAge",
    "demographics_isMarriedFilingJointly",
    "demographics_numberOfDependents",
    "demographics_filingStatus",
    // WAGES AND COMPENSATION

    "ask",
    "takeHome",
    "spend",
    "spending_shortfall",
    "spending_surplus",

    "income_subjectGrossWages",
    "income_subject401kContribution",
    "income_subjectEstimatedWithholdings",
    "income_subjectPayrollDeductions",
    "income_subjectTakehomeWages",

    "income_partnerGrossWages",
    "income_partner401kContribution",
    "income_partnerEstimatedWithholdings",
    "income_partnerPayrollDeductions",
    "income_partnerTakehomeWages",

    "income_wagesTaxable",
    "income_wagesTaxExempt",

    "income_miscIncomeGross",
    "income_miscIncomeWithholdings",
    "income_miscIncomeTakehome",

    "income_additionalWithholdings",
    "income_savingsInterest",

    "income_taxableIncome",
    "income_taxFreeIncome",

    // RETIREMENT INCOME
    "income_subject401kGross",
    "income_subject401kWithholdings",
    "income_subject401kTakehome",
    "income_partner401kGross",
    "income_partner401kWithholdings",
    "income_partner401kTakehome",
    "income_subjectPensionGross",
    "income_subjectPensionWithholdings",
    "income_subjectPensionTakehome",
    "income_partnerPensionGross",
    "income_partnerPensionWithholdings",
    "income_partnerPensionTakehome",
    "income_subjectSsTakehome",
    "income_partnerSsTakehome",

    "income_total_net",
    "income_total_gross",
    "income_total_withholdings",

    "savings_OpeningBalance",
    "savings_Withdrawals",
    "savings_Deposits",
    "savings_Balance",
    "savings_Interest",
    "retirementAcct_subjectSavingsContributions",
    "retirementAcct_partnerSavingsContributions",

    // TAXES
    "taxes_grossIncome",
    "taxes_adjustedGrossIncome",
    "taxes_standardDeduction",
    "taxes_taxableIncome",

    "taxes_subjectWagesWithholdings",
    "taxes_partnerWagesWithholdings",
    "taxes_subject401kWithholdings",
    "taxes_partner401kWithholdings",
    "taxes_totalWithholdings",

    "taxes_federalIncomeTaxOwed",
    "taxes_overPayment",
    "taxes_underPayment",

    // SOCIAL SECURITY
    "ss_subjectSsGross",
    "ss_subjectSsWithholdings",
    "ss_subjectSsTakehome",

    "ss_subjectSsTaxable",
    "ss_subjectSsNonTaxable",

    "ss_partnerSsGross",
    "ss_partnerSsWithholdings",
    "ss_partnerSsTakehome",
    "ss_partnerSsTaxable",
    "ss_partnerSsNonTaxable",

    "ss_totalSsGross",
    "ss_totalSsTaxable",
    "ss_totalSsNonTaxable",

    "ss_provisionalIncome",
    "ss_threshold1",
    "ss_threshold2",
    "ss_nonSocialSecurityTaxableIncome",
    "ss_tier1TaxableAmount",
    "ss_tier2TaxableAmount",

    // RETIREMENT ACCOUNTS
    "retirementAcct_subject401kOpenBalance",
    "retirementAcct_subject401kWithdrawals",
    "retirementAcct_subject401kDeposits",
    "retirementAcct_subject401kBalance",
    "retirementAcct_subject401kInterest",

    "retirementAcct_partner401kOpenBalance",
    "retirementAcct_partner401kDeposits",
    "retirementAcct_partner401kWithdrawals",
    "retirementAcct_partner401kBalance",
    "retirementAcct_partner401kInterest",

    "retirementAcct_subjectRothOpenBalance",
    "retirementAcct_subjectRothDeposits",
    "retirementAcct_subjectRothWithdrawals",
    "retirementAcct_subjectRothBalance",
    "retirementAcct_subjectRothInterest",

    "retirementAcct_partnerRothOpenBalance",
    "retirementAcct_partnerRothDeposits",
    "retirementAcct_partnerRothWithdrawals",
    "retirementAcct_partnerRothBalance",
    "retirementAcct_partnerRothInterest",
    "year",
  ];
  constructor() {
    super();

    // FISCAL
    this.year = 0;
    this.inflationRate = 0;

    // DEMOGRAPHICS
    this.demographics_subjectAge = "";
    this.demographics_partnerAge = "";
    this.demographics_numberOfDependents = 0;
    this.demographics_hasPartner = false;
    this.demographics_isWidowed = false;
    this.demographics_isRetired = false;

    this.demographics_spendingBasisYear = 0;

    // WAGES AND COMPENSATION
    this.income_subjectGrossWages = 0;
    this.income_wagesWithholdingRate = 0;
    this.income_subject401kContribution = 0;
    this.income_subjectWagesWithholdings = 0;
    this.income_subjectPayrollDeductions = 0;
    this.income_subjectTakehomeWages = 0;

    this.income_partnerGrossWages = 0;
    this.income_partner401kContribution = 0;
    this.income_partnerPayrollDeductions = 0;
    this.income_partnerWagesWithholdings = 0;
    this.income_partnerTakehomeWages = 0;

    this.income_miscIncomeGross = 0;
    this.income_miscIncomeWithholdings = 0;
    this.income_miscTaxableIncomeTakehome = 0;

    this.income_miscTaxFreeIncome = 0;

    this.income_savingsInterest = 0;

    this.income_subject401kGross = 0;
    this.income_subject401kWithholdings = 0;
    this.income_subject401kTakehome = 0;

    this.income_partner401kGross = 0;
    this.income_partner401kWithholdings = 0;
    this.income_partner401kTakehome = 0;

    this.income_subjectPensionGross = 0;
    this.income_subjectPensionWithholdings = 0;
    this.income_subjectPensionTakehome = 0;

    this.income_partnerPensionGross = 0;
    this.income_partnerPensionWithholdings = 0;
    this.income_partnerPensionTakehome = 0;

    this.savings_OpeningBalance = 0;
    // this.savings_Deposits = 0;
    this.savings_Withdrawals = 0;
    this.savings_Balance = 0;

    // SPENDING AND ASK
    this.ask = 0;
    this.spend = 0;
    this.spending_overriding = false;
    this.takeHome = 0;
    this.spending_shortfall = 0;
    this.spending_surplus = 0;
    this.spending_basis = 0;
    this.spending_taper_rate = 0;

    // TAXES
    this.taxes_grossIncome = 0;
    this.taxes_adjustedGrossIncome = 0;
    this.taxes_standardDeduction = 0;
    this.taxes_taxableIncome = 0;
    this.taxes_nonTaxableIncome = 0;

    this.taxes_totalWithholdings = 0;
    this.taxes_overPayment = 0;
    this.taxes_underPayment = 0;
    this.taxes_federalIncomeTaxOwed = 0;

    this.taxes_401kWithholdingRate = 0;
    this.taxes_pensionWithholdingRate = 0;
    this.taxes_ssWithholdingRate = 0;

    // SOCIAL SECURITY
    this.ss_withholdingRate = 0;
    this.ss_subjectSsGross = 0;
    this.ss_subjectSsWithholdings = 0;
    this.ss_subjectSsTakehome = 0;
    this.ss_partnerSsGross = 0;
    this.ss_partnerSsWithholdings = 0;
    this.ss_partnerSsTakehome = 0;
    this.ss_subjectSsTaxable = 0;
    this.ss_partnerSsTaxable = 0;

    this.ss_provisionalIncome = 0;
    this.ss_threshold1 = 0;
    this.ss_threshold2 = 0;
    this.ss_nonSocialSecurityTaxableIncome = 0;
    this.ss_tier1TaxableAmount = 0;
    this.ss_tier2TaxableAmount = 0;

    // RETIREMENT ACCOUNTS

    this.retirementAcct_subjectSavingsContributions = 0;
    this.retirementAcct_partnerSavingsContributions = 0;

    // Interest earned during the year
    this.retirementAcct_subject401kInterest = 0;
    this.retirementAcct_partner401kInterest = 0;
    this.retirementAcct_subjectRothInterest = 0;
    this.retirementAcct_partnerRothInterest = 0;

    this.retirementAcct_subject401kOpenBalance = 0;
    this.retirementAcct_subject401kWithdrawals = 0;
    this.retirementAcct_subject401kDeposits = 0;
    this.retirementAcct_subject401kBalance = 0;

    this.retirementAcct_partner401kOpenBalance = 0;
    this.retirementAcct_partner401kWithdrawals = 0;
    this.retirementAcct_partner401kDeposits = 0;
    this.retirementAcct_partner401kBalance = 0;

    this.retirementAcct_subjectRothOpenBalance = 0;
    this.retirementAcct_subjectRothWithdrawals = 0;
    this.retirementAcct_subjectRothDeposits = 0;
    this.retirementAcct_subjectRothBalance = 0;

    this.retirementAcct_partnerRothOpenBalance = 0;
    this.retirementAcct_partnerRothWithdrawals = 0;
    this.retirementAcct_partnerRothDeposits = 0;
    this.retirementAcct_partnerRothBalance = 0;

    this.demographics_filingStatus = "";

    /** @type {import("./cPensionAnnuityStorage.js").PensionAnnuityBreakdown[]} */
    this.income_pensionBreakdowns = [];
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

  get taxes_subjectWagesWithholdings() {
    return this.income_subjectWagesWithholdings;
  }
  get taxes_partnerWagesWithholdings() {
    return this.income_partnerWagesWithholdings;
  }
  get taxes_subject401kWithholdings() {
    return this.income_subject401kWithholdings;
  }
  get taxes_partner401kWithholdings() {
    return this.income_partner401kWithholdings;
  }
  get savings_Interest() {
    return this.income_savingsInterest;
  }

  get income_taxableIncome() {
    return (
      this.income_subjectGrossWages -
      this.income_subject401kContribution -
      this.income_subjectPayrollDeductions +
      this.income_partnerGrossWages -
      this.income_partner401kContribution -
      this.income_partnerPayrollDeductions +
      this.income_miscIncomeGross +
      this.savings_Interest +
      this.income_subject401kGross +
      this.income_partner401kGross +
      this.income_subjectPensionGross +
      this.income_partnerPensionGross
    ).asCurrency();
  }

  get income_wagesTaxable() {
    return (
      this.income_subjectTakehomeWages +
      this.income_partnerTakehomeWages +
      this.income_subjectWagesWithholdings +
      this.income_partnerWagesWithholdings
    ).asCurrency();
  }

  get income_wagesTaxExempt() {
    return (
      this.income_subjectPayrollDeductions +
      this.income_partnerPayrollDeductions +
      this.income_subject401kContribution +
      this.income_partner401kContribution
    ).asCurrency();
  }

  get income_combinedTakehomeWages() {
    return this.income_subjectTakehomeWages + this.income_partnerTakehomeWages;
  }

  get income_combinedWagesWithholdings() {
    return (
      this.income_subjectWagesWithholdings +
      this.income_partnerWagesWithholdings
    );
  }

  get income_combinedWagesGross() {
    return this.income_subjectGrossWages + this.income_partnerGrossWages;
  }

  get income_combinedPayrollDeductions() {
    return (
      this.income_subjectPayrollDeductions +
      this.income_partnerPayrollDeductions
    );
  }

  get ss_combinedGross() {
    return this.ss_subjectSsGross + this.ss_partnerSsGross;
  }

  get ss_combinedWithholdings() {
    return this.ss_subjectSsWithholdings + this.ss_partnerSsWithholdings;
  }

  get ss_combinedTakehome() {
    return this.ss_subjectSsTakehome + this.ss_partnerSsTakehome;
  }

  get income_combinedPensionGross() {
    return this.income_subjectPensionGross + this.income_partnerPensionGross;
  }

  get income_combinedPensionWithholdings() {
    return (
      this.income_subjectPensionWithholdings +
      this.income_partnerPensionWithholdings
    );
  }

  get income_combinedPensionTakehome() {
    return (
      this.income_subjectPensionTakehome + this.income_partnerPensionTakehome
    );
  }

  get income_combined401kGross() {
    return this.income_subject401kGross + this.income_partner401kGross;
  }

  get income_combined401kWithholdings() {
    return (
      this.income_subject401kWithholdings + this.income_partner401kWithholdings
    );
  }

  get income_combined401kTakehome() {
    return this.income_subject401kTakehome + this.income_partner401kTakehome;
  }

  get balances_combined401k() {
    return (
      this.retirementAcct_subject401kBalance +
      this.retirementAcct_partner401kBalance
    );
  }

  get income_combinedRothTakehome() {
    return (
      this.retirementAcct_subjectRothWithdrawals +
      this.retirementAcct_partnerRothWithdrawals
    );
  }

  get balances_combinedRoth() {
    return (
      this.retirementAcct_subjectRothBalance +
      this.retirementAcct_partnerRothBalance
    );
  }

  get balances_total() {
    return (
      this.balances_combined401k +
      this.balances_combinedRoth +
      this.savings_Balance
    );
  }

  // get ss_subjectSsTakehome() {
  //   return this.ss_subjectSsTakehome1;
  // }

  // get ss_partnerSsTakehome() {
  //   return this.ss_partnerSsTakehome1;
  // }

  get income_total_net() {
    return (
      this.income_subjectTakehomeWages +
      this.income_partnerTakehomeWages +
      this.income_miscTaxableIncomeTakehome +
      this.income_subject401kTakehome +
      this.income_partner401kTakehome +
      this.income_subjectPensionTakehome +
      this.income_partnerPensionTakehome +
      this.ss_subjectSsTakehome +
      this.ss_partnerSsTakehome +
      this.savings_Withdrawals +
      this.retirementAcct_partnerRothWithdrawals +
      this.retirementAcct_subjectRothWithdrawals +
      this.income_miscTaxFreeIncome
    ).asCurrency();
  }

  get income_total_gross() {
    const result =
      this.income_subjectGrossWages +
      this.income_partnerGrossWages +
      this.income_miscIncomeGross +
      this.income_subject401kGross +
      this.income_partner401kGross +
      this.income_subjectPensionGross +
      this.income_partnerPensionGross +
      this.ss_totalSsGross +
      this.income_savingsInterest;

    return result.asCurrency();
  }

  get income_total_withholdings() {
    const result =
      this.income_subjectWagesWithholdings +
      this.income_partnerWagesWithholdings +
      this.income_subject401kWithholdings +
      this.income_partner401kWithholdings +
      this.income_subjectPensionWithholdings +
      this.income_partnerPensionWithholdings +
      this.ss_subjectSsWithholdings +
      this.ss_partnerSsWithholdings +
      this.income_miscIncomeWithholdings;

    return result.asCurrency();
  }

  get taxes_effectiveTaxRate() {
    if (this.income_total_gross === 0) return 0;
    return (this.taxes_federalIncomeTaxOwed / this.income_total_gross) * 100;
  }
}
export { ReportData };
