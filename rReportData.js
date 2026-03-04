import { BaseReports } from "./cBaseReports.js";

class ReportData extends BaseReports {
  static dumpIgnore = ["*"];
  static dumpOrder = [
    // FISCAL DATA
    "year",

    // DEMOGRAPHICS
    "demographics_subjectAge",
    "demographics_partnerAge",
    "demographics_filingStatus",

    // SPENDING
    "projectedSpend",
    "takeHome",
    "actualSpend",
    "spending_shortfall",
    "spending_surplus",
    "spending_basis",
    "spending_taper_rate",

    // WAGES and COMPENSATION
    "income_subjectGrossWages",
    "income_subject401kContribution",
    "income_subjectPayrollDeductions",
    "withholdings_subjectWages",
    "income_subjectTakehomeWages",

    "income_partnerGrossWages",
    "income_partner401kContribution",
    "income_partnerPayrollDeductions",
    "withholdings_partnerWages",
    "income_partnerTakehomeWages",

    // SOCIAL SECURITY
    "income_subjectSsGross",
    "withholdings_subjectSs",
    "income_subjectSsTakehome",

    "income_partnerSsGross",
    "withholdings_partnerSs",
    "income_partnerSsTakehome",

    "income_combinedSsGross",
    "income_combinedSsTakehome",

    // 401K
    "income_subject401kGross",
    "withholdings_subject401k",
    "income_subject401kTakehome",

    "income_partner401kGross",
    "withholdings_partner401k",
    "income_partner401kTakehome",

    "income_combined401kGross",
    "income_combined401kTakehome",

    // MISC INCOME
    "income_miscTaxableIncomeGross",
    "withholdings_miscTaxableIncome",
    "income_miscTaxableIncomeTakehome",

    // INTEREST INCOME
    "income_savingsInterest",

    // PENSIONS
    "income_subjectPensionGross",
    "withholdings_subjectPension",
    "income_subjectPensionTakehome",

    "income_partnerPensionGross",
    "withholdings_partnerPension",
    "income_partnerPensionTakehome",

    "income_combinedPensionGross",
    "income_combinedPensionTakehome",

    "income_total_gross",
    "income_total_takehome",

    "savings_YearBeginBalance",
    "savings_Withdrawals",
    // "savings_Deposits",
    "savings_Interest",
    "savings_YearEndBalance",

    // TAXES
    "taxes_grossIncome",
    "taxes_adjustedGrossIncome",
    "taxes_standardDeduction",
    "taxes_taxableIncome",
    "withholdings_total",
    "taxes_federalIncomeTaxOwed",
    "taxes_overPayment",
    "taxes_underPayment",

    // SOCIAL SECURITY
    "ss_subjectTaxable",
    "ss_subjectSsNonTaxable",

    "ss_partnerTaxable",
    "ss_partnerSsNonTaxable",

    "ss_NonSsTaxableIncome",

    "ss_totalSsTaxable",
    "ss_totalSsNonTaxable",

    "ss_provisionalIncome",
    "ss_threshold1",
    "ss_threshold2",
    "ss_nonSocialSecurityTaxableIncome",
    "ss_tier1TaxableAmount",
    "ss_tier2TaxableAmount",

    // RETIREMENT ACCOUNT ACTIVITY
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
  ];
  constructor() {
    super();

    // FISCAL
    this.year = 0;
    this.inflationRate = 0;

    // DEMOGRAPHICS
    this.demographics_subjectAge = "";
    this.demographics_partnerAge = "";
    // this.demographics_numberOfDependents = 0;
    this.demographics_hasPartner = false;
    this.demographics_isWidowed = false;
    this.demographics_isRetired = false;

    this.demographics_spendingBasisYear = 0;

    // WAGES AND COMPENSATION
    this.income_subjectGrossWages = 0;
    this.income_wagesWithholdingRate = 0;
    this.income_subject401kContribution = 0;
    this.income_subjectPayrollDeductions = 0;
    this.income_subjectTakehomeWages = 0;

    this.income_partnerGrossWages = 0;
    this.income_partner401kContribution = 0;
    this.income_partnerPayrollDeductions = 0;
    this.income_partnerTakehomeWages = 0;

    this.income_miscTaxableIncomeGross = 0;
    this.withholdings_miscTaxableIncome = 0;
    this.income_miscTaxableIncomeTakehome = 0;

    this.income_miscTaxFreeIncome = 0;

    this.income_savingsInterest = 0;

    this.income_subject401kGross = 0;
    this.income_subject401kTakehome = 0;
    this.income_subjectRMD = 0;

    this.income_subjectUsingRMD = false;
    this.income_partnerUsingRMD = false;

    this.income_partner401kGross = 0;
    this.income_partner401kTakehome = 0;
    this.income_partnerRMD = 0;

    this.income_subjectPensionGross = 0;
    this.income_subjectPensionTakehome = 0;
    this.income_partnerPensionGross = 0;
    this.income_partnerPensionTakehome = 0;

    this.income_subjectSsGross = 0;
    this.income_partnerSsGross = 0;
    this.income_subjectSsTakehome = 0;
    this.income_partnerSsTakehome = 0;

    this.savings_YearBeginBalance = 0;
    // this.savings_Deposits = 0;
    this.savings_Withdrawals = 0;
    this.savings_YearEndBalance = 0;

    // SPENDING AND ASK
    this.projectedSpend = 0;
    this.actualSpend = 0;
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

    this.taxes_overPayment = 0;
    this.taxes_underPayment = 0;
    this.taxes_federalIncomeTaxOwed = 0;

    this.withholdings_subjectWages = 0;
    this.withholdings_partnerWages = 0;
    this.withholdings_partner401k = 0;
    this.withholdings_subjectPension = 0;
    this.withholdings_subjectSs = 0;
    this.withholdings_partnerSs = 0;
    this.withholdings_partnerPension = 0;
    this.withholdings_subject401k = 0;

    this.withholdings_total = 0;

    this.taxes_401kWithholdingRate = 0;
    this.taxes_pensionWithholdingRate = 0;
    this.taxes_ssWithholdingRate = 0;

    // SOCIAL SECURITY
    this.ss_withholdingRate = 0;
    this.ss_subjectTaxable = 0;
    this.ss_partnerTaxable = 0;

    this.ss_provisionalIncome = 0;
    this.ss_threshold1 = 0;
    this.ss_threshold2 = 0;
    this.ss_nonSocialSecurityTaxableIncome = 0;
    this.ss_tier1TaxableAmount = 0;
    this.ss_tier2TaxableAmount = 0;

    // RETIREMENT ACCOUNTS

    // this.retirementAcct_subjectSavingsContributions = 0;
    // this.retirementAcct_partnerSavingsContributions = 0;

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

  get income_combinedSsGross() {
    return this.income_subjectSsGross + this.income_partnerSsGross;
  }

  get ss_totalSsTaxable() {
    return this.ss_subjectTaxable + this.ss_partnerTaxable;
  }

  get ss_subjectSsNonTaxable() {
    return this.income_subjectSsGross - this.ss_subjectTaxable;
  }

  get ss_partnerSsNonTaxable() {
    return this.income_partnerSsGross - this.ss_partnerTaxable;
  }

  get ss_totalSsNonTaxable() {
    return this.ss_subjectSsNonTaxable + this.ss_partnerSsNonTaxable;
  }

  // get withholdings_subjectWages() {
  //   return this.income_subjectWagesWithholdings;
  // }
  // get withholdings_partnerWages() {
  //   return this.income_partnerWagesWithholdings;
  // }
  // get withholdings_subject401k() {
  //   return this.income_subject401kWithholdings;
  // }
  // get withholdings_partner401k() {
  //   return this.income_partner401kWithholdings;
  // }
  get savings_Interest() {
    return this.income_savingsInterest;
  }

  get ss_NonSsTaxableIncome() {
    return (
      this.income_subjectGrossWages -
      this.income_subject401kContribution -
      this.income_subjectPayrollDeductions +
      this.income_partnerGrossWages -
      this.income_partner401kContribution -
      this.income_partnerPayrollDeductions +
      this.income_miscTaxableIncomeGross +
      this.savings_Interest +
      this.income_subject401kGross +
      this.income_partner401kGross +
      this.income_subjectPensionGross +
      this.income_partnerPensionGross
    ).asCurrency();
  }

  // get income_wagesTaxable() {
  //   return (
  //     this.income_subjectTakehomeWages +
  //     this.income_partnerTakehomeWages +
  //     this.withholdings_subjectWages +
  //     this.withholdings_partnerWages
  //   ).asCurrency();
  // }

  // get income_wagesTaxExempt() {
  //   return (
  //     this.income_subjectPayrollDeductions +
  //     this.income_partnerPayrollDeductions +
  //     this.income_subject401kContribution +
  //     this.income_partner401kContribution
  //   ).asCurrency();
  // }

  get income_combinedTakehomeWages() {
    return this.income_subjectTakehomeWages + this.income_partnerTakehomeWages;
  }

  get withholdings_combinedWages() {
    return this.withholdings_subjectWages + this.withholdings_partnerWages;
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
    return this.income_subjectSsGross + this.income_partnerSsGross;
  }

  get withholdings_combinedSs() {
    return this.withholdings_subjectSs + this.withholdings_partnerSs;
  }

  get income_combinedSsTakehome() {
    return this.income_subjectSsTakehome + this.income_partnerSsTakehome;
  }

  get income_combinedPensionGross() {
    return this.income_subjectPensionGross + this.income_partnerPensionGross;
  }

  get withholdings_combinedPension() {
    return this.withholdings_subjectPension + this.withholdings_partnerPension;
  }

  get income_combinedPensionTakehome() {
    return (
      this.income_subjectPensionTakehome + this.income_partnerPensionTakehome
    );
  }

  get income_combined401kGross() {
    return this.income_subject401kGross + this.income_partner401kGross;
  }

  // Add an indicator to the grid (and popup) that RMD was used
  get income_usingRMD() {
    return this.income_subjectUsingRMD || this.income_partnerUsingRMD;
  }

  get withholdings_combined401k() {
    return this.withholdings_subject401k + this.withholdings_partner401k;
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

  get balances_yearEndRothCombined() {
    return (
      this.retirementAcct_subjectRothBalance +
      this.retirementAcct_partnerRothBalance
    );
  }

  get balances_yearEndtotal() {
    return (
      this.balances_combined401k +
      this.balances_yearEndRothCombined +
      this.savings_YearEndBalance
    );
  }

  // get ss_subjectSsTakehome() {
  //   return this.ss_subjectSsTakehome1;
  // }

  // get ss_partnerSsTakehome() {
  //   return this.ss_partnerSsTakehome1;
  // }

  get income_total_takehome() {
    return (
      this.income_subjectTakehomeWages +
      this.income_partnerTakehomeWages +
      this.income_miscTaxableIncomeTakehome +
      this.income_subject401kTakehome +
      this.income_partner401kTakehome +
      this.income_subjectPensionTakehome +
      this.income_partnerPensionTakehome +
      this.income_combinedSsTakehome +
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
      this.income_miscTaxableIncomeGross +
      this.income_subject401kGross +
      this.income_partner401kGross +
      this.income_subjectPensionGross +
      this.income_partnerPensionGross +
      this.income_combinedSsGross +
      this.income_savingsInterest;

    return result.asCurrency();
  }

  // get income_total_withholdings() {
  //   const result =
  //     this.withholdings_subjectWages +
  //     this.withholdings_partnerWages +
  //     this.withholdings_subject401k +
  //     this.withholdings_partner401k +
  //     this.withholdings_subjectPension +
  //     this.withholdings_partnerPension +
  //     this.withholdings_subjectSs +
  //     this.withholdings_partnerSs +
  //     this.withholdings_miscIncome;

  //   return result.asCurrency();
  // }

  get taxes_effectiveTaxRate() {
    if (this.income_total_gross === 0) return 0;
    return (this.taxes_federalIncomeTaxOwed / this.income_total_gross) * 100;
  }
}
export { ReportData };
