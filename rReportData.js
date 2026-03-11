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
    "spending_assetFunding",
    "income_surplus",
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
    "income_subjectRMD",
    "income_subjectUsingRMD",

    "income_partner401kGross",
    "withholdings_partner401k",
    "income_partner401kTakehome",
    "income_partnerRMD",
    "income_partnerUsingRMD",

    "income_combined401kGross",
    "income_combined401kTakehome",

    // MISC INCOME
    "income_miscTaxableIncomeGross",
    "withholdings_miscTaxableIncome",
    "income_miscTaxableIncomeTakehome",
    "income_taxableInterest",
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
    "cash_total_inflows",

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
    "account_savingsYearBeginBalance",
    "account_savingsWithdrawals",
    "account_savingsDeposits",
    "account_savingsYearEndBalance",

    "account_subject401kOpenBalance",
    "account_subject401kWithdrawals",
    "account_subject401kDeposits",
    "account_subject401kBalance",

    "account_partner401kOpenBalance",
    "account_partner401kDeposits",
    "account_partner401kWithdrawals",
    "account_partner401kBalance",

    "account_subjectRothOpenBalance",
    "account_subjectRothDeposits",
    "account_subjectRothWithdrawals",
    "account_subjectRothBalance",

    "account_partnerRothOpenBalance",
    "account_partnerRothDeposits",
    "account_partnerRothWithdrawals",
    "account_partnerRothBalance",

    "account_savingsInterest",
    "account_subject401kInterest",
    "account_partner401kInterest",
    "account_subjectRothInterest",
    "account_partnerRothInterest",

    "withholdings_combined401k",
    "withholdings_combinedPension",
    "withholdings_combinedSs",
    "withholdings_combinedWages",

    // "total_withholdings",
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

    this.account_savingsInterest = 0;

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

    // SPENDING AND ASK
    this.projectedSpend = 0;
    this.actualSpend = 0;
    this.spending_overriding = false;
    this.takeHome = 0;
    this.transfer_savingsToCash = 0;
    this.transfer_cashToSavings = 0;
    this.spending_basis = 0;
    this.spending_taper_rate = 0;

    // TAXES
    this.taxes_grossIncome = 0;
    this.taxes_adjustedGrossIncome = 0;
    this.taxes_standardDeduction = 0;
    this.taxes_taxableIncome = 0;
    this.taxes_nonTaxableIncome = 0;

    this.transfer_taxesToSavings = 0;
    this.transfer_savingsToTaxes = 0;
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

    // this.account_subjectSavingsContributions = 0;
    // this.account_partnerSavingsContributions = 0;

    // Interest earned during the year
    this.account_savingsYearBeginBalance = 0;
    // this.savings_Deposits = 0;
    this.account_savingsWithdrawals = 0;
    this.account_savingsDeposits = 0;
    this.account_savingsYearEndBalance = 0;

    this.account_subject401kInterest = 0;
    this.account_partner401kInterest = 0;
    this.account_subjectRothInterest = 0;
    this.account_partnerRothInterest = 0;

    this.account_subject401kOpenBalance = 0;
    this.account_subject401kWithdrawals = 0;
    this.account_subject401kDeposits = 0;
    this.account_subject401kBalance = 0;

    this.account_partner401kOpenBalance = 0;
    this.account_partner401kWithdrawals = 0;
    this.account_partner401kDeposits = 0;
    this.account_partner401kBalance = 0;

    this.account_subjectRothOpenBalance = 0;
    this.account_subjectRothWithdrawals = 0;
    this.account_subjectRothDeposits = 0;
    this.account_subjectRothBalance = 0;

    this.account_partnerRothOpenBalance = 0;
    this.account_partnerRothWithdrawals = 0;
    this.account_partnerRothDeposits = 0;
    this.account_partnerRothBalance = 0;

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
  // get savings_Interest() {
  //   return this.account_savingsInterest;
  // }

  get ss_NonSsTaxableIncome() {
    return (
      this.income_subjectGrossWages -
      this.income_subject401kContribution -
      this.income_subjectPayrollDeductions +
      this.income_partnerGrossWages -
      this.income_partner401kContribution -
      this.income_partnerPayrollDeductions +
      this.income_miscTaxableIncomeGross +
      this.account_savingsInterest +
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
    return this.account_subject401kBalance + this.account_partner401kBalance;
  }

  get income_combinedRothTakehome() {
    return (
      this.account_subjectRothWithdrawals + this.account_partnerRothWithdrawals
    );
  }

  get balances_yearEndRothCombined() {
    return this.account_subjectRothBalance + this.account_partnerRothBalance;
  }

  get balances_yearEndtotal() {
    return (
      this.balances_combined401k +
      this.balances_yearEndRothCombined +
      this.account_savingsYearEndBalance
    );
  }

  // get ss_subjectSsTakehome() {
  //   return this.ss_subjectSsTakehome1;
  // }

  // get ss_partnerSsTakehome() {
  //   return this.ss_partnerSsTakehome1;
  // }

  get cash_total_inflows() {
    return (
      this.transfer_savingsToCash + this.income_total_takehome
    ).asCurrency();
  }

  get income_surplus() {
    return this.transfer_cashToSavings;
  }

  get spending_assetFunding() {
    return this.transfer_savingsToCash;
  }

  get income_total_takehome() {
    return (
      this.income_combinedTakehomeWages +
      this.income_miscTaxableIncomeTakehome +
      this.income_combined401kTakehome +
      this.income_combinedPensionTakehome +
      this.income_combinedSsTakehome +
      this.income_combinedRothTakehome +
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
      this.account_savingsInterest;

    return result.asCurrency();
  }

  get income_taxableInterest() {
    return this.account_savingsInterest;
  }

  // get total_withholdings() {
  //   return (
  //     this.withholdings_combined401k +
  //     this.withholdings_combinedPension +
  //     this.withholdings_combinedSs +
  //     this.withholdings_combinedWages +
  //     this.w
  //   ).asCurrency();
  // }

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
