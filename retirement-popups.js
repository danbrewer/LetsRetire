import { ReportTableBuilder } from "./cReportTableBuilder.js";
import { Transaction, TransactionType } from "./cTransaction.js";
import { ensurePopup } from "./popup-engine.js";
import { ReportData } from "./rReportData.js";
import { StringFunctions } from "./utils.js";

// Global declaration for ECharts (loaded via script tag in HTML)
/** @type {any} */
const echarts = /** @type {any} */ (window).echarts;

/**
 * @typedef {(data: import("./rReportData.js").ReportData) => void} PopupHandler
 * @typedef {(data: import("./rReportData.js").ReportData, transactions: Map<string, Transaction[]>) => void} PopupTransactionHandler
 */

const fmt = (/** @type {number} */ n) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

/** @type {Record<string, PopupTransactionHandler>} */
export const popupTransactionActions = {
  dumpCategorySummaries,
};

/** @type {Record<string, PopupHandler>} */
export const popupActions = {
  showSalaryBreakdown,
  showSsBreakdown,
  showPensionBreakdown,
  showPensionGrossBreakdown,
  show401kBreakdown,
  showSavingsRothBreakdown,
  showTotalCashBreakdown,
  showSsGrossBreakdown,
  showAccountBalances,
  showSavingsBalanceBreakdown,
  show401kBalanceBreakdown,
  showTaxesBreakdown,
  showWithholdingsBreakdown,
  showGrossWagesBreakdown,
  show401kGrossBreakdown,
  showEffectiveTaxRateBreakdown,
  showAnnualSpendBreakdown,
  showCashFlowDiagram,
};

// SS Breakdown Popup Functions
/**
 * @param {ReportData} data
 */
function showSsBreakdown(data) {
  if (!data) {
    return; // No SS data to show
  }

  const popup = ensurePopup("ss", "Social Security Breakdown");
  // const content = document.getElementById("ssBreakdownContent");

  const combinedSsGross =
    (data.income_subjectSsGross || 0) + (data.income_partnerSsGross || 0);
  const combinedSsTaxable =
    (data.ss_subjectTaxable || 0) + (data.ss_partnerTaxable || 0);
  const combinedSsNonTaxable =
    (data.ss_subjectSsNonTaxable || 0) + (data.ss_partnerSsNonTaxable || 0);
  const combinedSsWithholdings =
    (data.withholdings_subjectSs || 0) + (data.withholdings_partnerSs || 0);
  const combinedSsTakehome =
    (data.income_subjectSsTakehome || 0) + (data.income_partnerSsTakehome || 0);
  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Benefits (combined):</span>
        <span class="ss-breakdown-value">${fmt(combinedSsGross)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withholdings (${data.taxes_ssWithholdingRate * 100}%):</span>
        <span class="ss-breakdown-value">${fmt(combinedSsWithholdings)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Net Amount (Take Home):</span>
        <span class="ss-breakdown-value">${fmt(combinedSsTakehome)}</span>
    </div>
    `;

  breakdownHtml += `
        <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">IRS SS Taxation Calculation:</strong>
        <div style="margin-top: 8px;">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">Other Taxable Income:</span>
            <span class="ss-breakdown-value">${fmt(
              data.ss_NonSsTaxableIncome || 0
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">+ 50% of SS Benefits:</span>
            <span class="ss-breakdown-value">${fmt(
              combinedSsGross * 0.5
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; font-weight: 600; border-top: 1px solid var(--border); margin-top: 4px;">
            <span class="ss-breakdown-label">= Provisional Income:</span>
            <span class="ss-breakdown-value">${fmt(
              data.ss_provisionalIncome
            )}</span>
            </div>
        </div>
        
        <div style="margin-top: 12px;">
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
            <strong>Thresholds (Filing status: ${
              data.demographics_filingStatus
            }):</strong><br/>
            • Tier 1: $${data.ss_threshold1?.toLocaleString()} (0% → 50% taxable)<br/>
            • Tier 2: $${data.ss_threshold2?.toLocaleString()} (50% → 85% taxable)
            </div>
    `;

  if (data.ss_provisionalIncome <= data.ss_threshold1) {
    breakdownHtml += `
            <div style="color: var(--good);">
            ✓ Provisional income ≤ $${data.ss_threshold1.toLocaleString()}<br/>
            → 0% of SS benefits are taxable
            </div>
        `;
  } else if (data.ss_provisionalIncome <= data.ss_threshold2) {
    breakdownHtml += `
            <div style="color: var(--warn);">
            ⚠ Provisional income between $${data.ss_threshold1.toLocaleString()} and $${data.ss_threshold2.toLocaleString()}<br/>
            → Up to 50% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Excess over threshold: ${fmt(data.ss_provisionalIncome - data.ss_threshold1)}<br/>
                Taxable amount: min(50% of SS, 50% of excess) = ${fmt(
                  data.ss_tier1TaxableAmount
                )}
            </div>
            </div>
        `;
  } else {
    breakdownHtml += `
          <div style="color: var(--bad);">
            ⚠ Provisional income > $${data.ss_threshold2.toLocaleString()}<br/>
            → Up to 85% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Tier 1 (50%): ${fmt(data.ss_tier1TaxableAmount)}<br/>
                Tier 2 (85% of excess over $${data.ss_threshold2.toLocaleString()}): .85 x (${fmt(data.ss_provisionalIncome)} - ${fmt(data.ss_threshold2)}) = ${fmt(
                  data.ss_tier2TaxableAmount
                )}<br/>
                85% of SS benefits: ${fmt(combinedSsGross * 0.85)}<br/>
                Total taxable: min(85% of SS, Tier 1 + Tier 2) = ${fmt(
                  combinedSsTaxable
                )}
            </div>
          </div>
        `;
  }

  breakdownHtml += `</div>`;

  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(combinedSsTaxable)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Non-Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(combinedSsNonTaxable)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Percent Taxable:</span>
        <span class="ss-breakdown-value">${
          combinedSsGross
            ? ((combinedSsTaxable / combinedSsGross) * 100).toFixed(0) + "%"
            : "N/A"
        }</span>
    </div>
    `;

  // Add taxation method explanation
  // const inputs = parseInputParameters();
  breakdownHtml += `
        <div style="margin-top: 16px; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px; font-size: 12px; color: var(--muted);">
        <strong>About IRS SS Rules:</strong><br/>
        Social Security taxation is based on "provisional income" which includes your taxable income plus 50% of your SS benefits. The percentage of SS benefits that become taxable depends on income thresholds that vary by filing status.
        </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
  // if (content)
  //   content.innerHTML = breakdownHtml;
  // if (popup)
  //   popup.classList.add("show");
}

// SS Breakdown Popup Functions
/**
 * @param {ReportData} data
 */
function showSsGrossBreakdown(data) {
  if (!data) {
    return; // No SS data to show
  }

  const popup = ensurePopup("ss", "Social Security Gross");

  const combinedSsGross =
    (data.income_subjectSsGross || 0) + (data.income_partnerSsGross || 0);
  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject SS Gross:</span>
        <span class="ss-breakdown-value">${data.income_subjectSsGross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner SS Gross:</span>
        <span class="ss-breakdown-value">${data.income_partnerSsGross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${combinedSsGross.asWholeDollars()}</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showTaxesBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("taxes", "Taxes Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Filing Status:</span>
      <span class="ss-breakdown-value">${data.demographics_filingStatus}</span>
    </div>

    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Gross Income:</span>
        <span class="ss-breakdown-value">${data.income_total_gross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Tax-free reductions:</span>
        <span class="ss-breakdown-value">${data.taxes_nonTaxableIncome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
      <span class="ss-breakdown-label">Adjusted Gross Income:</span>
      <span class="ss-breakdown-value">${data.taxes_adjustedGrossIncome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Deductions (Standard/Itemized):</span>
        <span class="ss-breakdown-value">${data.taxes_standardDeduction.asWholeDollars()}</span>
    </div>
     <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Taxable income:</span>
        <span class="ss-breakdown-value">${data.taxes_taxableIncome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withholdings:</span>
        <span class="ss-breakdown-value">${data.withholdings_total.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Federal Income Tax:</span>
        <span class="ss-breakdown-value">${data.taxes_federalIncomeTaxOwed.asWholeDollars()}</span>
    </div>
    `;

  if (data.transfer_savingsToTaxes > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Taxes due:</span>
          <span class="ss-breakdown-value">${data.transfer_savingsToTaxes.asWholeDollars()}</span>
      </div>
    `;
  }

  if (data.transfer_taxesToSavings > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Refund:</span>
          <span class="ss-breakdown-value">${data.transfer_taxesToSavings.asWholeDollars()}</span>
      </div>
    `;
  }

  breakdownHtml += `
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Effective Tax Rate:</span>
        <span class="ss-breakdown-value">${data.taxes_effectiveTaxRate.toFixed(2)}%</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showWithholdingsBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("withholdings", "Withholdings Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Subject:</strong>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Wages (${data.income_wagesWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_subjectWages.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_subject401k.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (${data.taxes_pensionWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_subjectPension.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (${data.taxes_ssWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_subjectSs.asWholeDollars()}</span>
      </div>
    </div>
    `;
  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Partner:</strong>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Wages (${data.income_wagesWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_partnerWages.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_partner401k.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (${data.taxes_pensionWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_partnerPension.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (${data.taxes_ssWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_partnerSs.asWholeDollars()}</span>
      </div>
    </div>
    `;
  }
  breakdownHtml += `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Misc Taxable Income:</span>
      <span class="ss-breakdown-value">${data.withholdings_miscTaxableIncome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total Withholdings:</span>
        <span class="ss-breakdown-value">${data.withholdings_total.asWholeDollars()}</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showSalaryBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("salary", "Salary Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Payroll Gross (Annual):</span>
        <span class="ss-breakdown-value">${data.income_combinedWagesGross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Payroll Deductions:</span>
        <span class="ss-breakdown-value">${data.income_combinedPayrollDeductions.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withholdings (${data.income_wagesWithholdingRate * 100}%):</span>
        <span class="ss-breakdown-value">${data.withholdings_combinedWages.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Net (Take Home):</span>
        <span class="ss-breakdown-value">${data.income_combinedTakehomeWages.asWholeDollars()}</span>
    </div>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function show401kGrossBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("401kGross", "401k Gross Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject (Annual):</span>
        <span class="ss-breakdown-value">${data.income_subject401kGross.asWholeDollars()}</span>
    </div>`;

  // Add RMD hint for subject if applicable
  if (data.income_subjectRMD > 0) {
    breakdownHtml += `
    <div style="font-size: 12px; color: var(--muted); margin-left: 16px; margin-top: 4px;">
        RMD: ${data.income_subjectRMD.asWholeDollars()}
    </div>`;
  }

  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner:</span>
        <span class="ss-breakdown-value">${data.income_partner401kGross.asWholeDollars()}</span>
    </div>`;

    // Add RMD hint for partner if applicable
    if (data.income_partnerRMD > 0) {
      breakdownHtml += `
    <div style="font-size: 12px; color: var(--muted); margin-left: 16px; margin-top: 4px;">
        RMD: ${data.income_partnerRMD.asWholeDollars()}
    </div>`;
    }
  }

  breakdownHtml += `
   <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${data.income_combined401kGross.asWholeDollars()}</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showAnnualSpendBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("annualSpend", "Annual Spend Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Annual Spend (${data.demographics_spendingBasisYear} dollars):</span>
        <span class="ss-breakdown-value">${data.spending_basis.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Inflation rate:</span>
        <span class="ss-breakdown-value">${(data.inflationRate * 100).toFixed(2)}%</span>
    </div>
    `;

  if (data.demographics_isRetired) {
    breakdownHtml += `
     <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Spending reduction rate:</span>
        <span class="ss-breakdown-value">${(data.spending_taper_rate * 100).toFixed(2)}%</span>
    </div>
    `;
  }

  breakdownHtml += `
   <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Spend:</span>
        <span class="ss-breakdown-value">${data.projectedSpend.asWholeDollars()}</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showEffectiveTaxRateBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("effectiveTaxRate", "Effective Tax Rate Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Gross income:</span>
        <span class="ss-breakdown-value">${data.income_total_gross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxes due:</span>
        <span class="ss-breakdown-value">${data.taxes_federalIncomeTaxOwed.asWholeDollars()}</span>
    </div>
    `;

  breakdownHtml += `
   <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Effective Tax Rate:</span>
        <span class="ss-breakdown-value">${data.taxes_effectiveTaxRate.toFixed(2)}%</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showGrossWagesBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("grossWages", "Gross Wages Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject (Annual):</span>
        <span class="ss-breakdown-value">${data.income_subjectGrossWages.asWholeDollars()}</span>
    </div>
    `;

  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner (Annual):</span>
        <span class="ss-breakdown-value">${data.income_partnerGrossWages.asWholeDollars()}</span>
    </div>
    `;
  }

  breakdownHtml += `
   <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Net (Take Home):</span>
        <span class="ss-breakdown-value">${data.income_combinedWagesGross.asWholeDollars()}</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showPensionBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("pension", "Pension/Annuity Breakdown");

  let bd = data.income_pensionBreakdowns.reduce((acc, d) => {
    acc += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">${d.name}</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Gross:</span>
        <span class="ss-breakdown-value">${d.grossAmount.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withholdings (${d.withholdingRate * 100}%):</span>
        <span class="ss-breakdown-value">${d.withholdingsAmount.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Takehome:</span>
        <span class="ss-breakdown-value">${d.takehomeAmount.asWholeDollars()}</span>
      </div>
    </div>
    `;
    return acc;
  }, "");

  bd += `
      <div class="ss-breakdown-item breakdown-accent">
          <span class="ss-breakdown-label">Total takehome:</span>
          <span class="ss-breakdown-value">${data.income_combinedPensionTakehome.asWholeDollars()}</span>
      </div>
  `;

  popup.setContent(bd);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showPensionGrossBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("pension", "Pension Breakdown");

  let breakdownHtml = data.income_pensionBreakdowns.reduce((acc, d) => {
    acc += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">${d.name}</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Gross:</span>
        <span class="ss-breakdown-value">${d.grossAmount.asWholeDollars()}</span>
      </div>
    </div>
    `;
    return acc;
  }, "");

  breakdownHtml += `
      <div class="ss-breakdown-item breakdown-accent">
          <span class="ss-breakdown-label">Total (gross):</span>
          <span class="ss-breakdown-value">${data.income_combinedPensionGross.asWholeDollars()}</span>
      </div>
  `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showSavingsRothBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("savingsRoth", "Savings/Roth Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Savings withdrawal:</span>
      <span class="ss-breakdown-value">${data.account_savingsWithdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject Roth withdrawal:</span>
        <span class="ss-breakdown-value">${data.account_subjectRothWithdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner Roth withdrawal:</span>
        <span class="ss-breakdown-value">${data.account_partnerRothWithdrawals.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Subject Roth withdrawal:</span>
        <span class="ss-breakdown-value">${(data.account_savingsWithdrawals + data.income_combinedRothTakehome).asWholeDollars()}</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showSavingsBalanceBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("savingsBalance", "Savings Balance Breakdown");

  const deposits =
    // data.account_subjectSavingsContributions +
    // data.account_partnerSavingsContributions +
    data.transfer_cashToSavings;

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Opening balance</span>
      <span class="ss-breakdown-value">${data.account_savingsYearBeginBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withdrawals:</span>
        <span class="ss-breakdown-value">${data.account_savingsWithdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Deposits:</span>
        <span class="ss-breakdown-value">${deposits.asWholeDollars()}</span>
    </div>
     <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Interest earned:</span>
        <span class="ss-breakdown-value">${data.account_savingsInterest.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Tax refund:</span>
        <span class="ss-breakdown-value">${data.transfer_taxesToSavings.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxes owed:</span>
        <span class="ss-breakdown-value">${data.transfer_savingsToTaxes.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Closing balance:</span>
        <span class="ss-breakdown-value">${data.account_savingsYearEndBalance.asWholeDollars()}</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function show401kBalanceBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("401kBalance", "401k Balance Breakdown");

  const total401kBalance =
    data.account_subject401kBalance + data.account_partner401kBalance;

  // Build the breakdown content
  let breakdownHtml = `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
      <strong style="color: var(--accent);">Subject:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Opening balance</span>
        <span class="ss-breakdown-value">${data.account_subject401kOpenBalance.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withdrawals:</span>
          <span class="ss-breakdown-value">${data.account_subject401kWithdrawals.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Deposits:</span>
          <span class="ss-breakdown-value">${data.income_subject401kContribution.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Interest earned:</span>
          <span class="ss-breakdown-value">${data.account_subject401kInterest.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Closing balance:</span>
          <span class="ss-breakdown-value">${data.account_subject401kBalance.asWholeDollars()}</span>
      </div>
    </div>
    `;

  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
      <strong style="color: var(--accent);">Partner:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Opening balance</span>
        <span class="ss-breakdown-value">${data.account_partner401kOpenBalance.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withdrawals:</span>
          <span class="ss-breakdown-value">${data.account_partner401kWithdrawals.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Deposits:</span> 
          <span class="ss-breakdown-value">${data.income_partner401kContribution.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Interest earned:</span>
          <span class="ss-breakdown-value">${data.account_partner401kInterest.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Closing balance:</span>
          <span class="ss-breakdown-value">${data.account_partner401kBalance.asWholeDollars()}</span>
      </div>
    </div>
      `;
  }

  breakdownHtml += `
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${total401kBalance.asWholeDollars()}</span>
    </div>
  `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showAccountBalances(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("accountBalances", "Account Balances");

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Savings:</span>
      <span class="ss-breakdown-value">${data.account_savingsYearEndBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject Roth IRA:</span>
        <span class="ss-breakdown-value">${data.account_subjectRothBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner Roth IRA:</span>
        <span class="ss-breakdown-value">${data.account_partnerRothBalance.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject 401k:</span>
        <span class="ss-breakdown-value">${data.account_subject401kBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner 401k:</span>
        <span class="ss-breakdown-value">${data.account_partner401kBalance.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${data.balances_yearEndtotal.asWholeDollars()}</span>
    </div>
    `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function show401kBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("401k", "401(k) Breakdown");

  // Build the breakdown content
  let breakdownHtml = `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Subject:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">401k gross withdrawal:</span>
        <span class="ss-breakdown-value">${data.income_subject401kGross.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withholdings (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_subject401k.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item breakdown-accent">
          <span class="ss-breakdown-label">Net (takehome):</span>
          <span class="ss-breakdown-value">${data.income_subject401kTakehome.asWholeDollars()}</span>
      </div>
    </div>
    `;

  if (data.demographics_hasPartner) {
    breakdownHtml += `
<div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Partner:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">401k gross withdrawal:</span>
        <span class="ss-breakdown-value">${data.income_partner401kGross.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withholdings (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.withholdings_partner401k.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item breakdown-accent">
          <span class="ss-breakdown-label">Net (takehome):</span>
          <span class="ss-breakdown-value">${data.income_partner401kTakehome.asWholeDollars()}</span>
      </div>
    </div>
      `;
  }

  breakdownHtml += `
      <div class="ss-breakdown-item breakdown-accent">
          <span class="ss-breakdown-label">Total (takehome):</span>
          <span class="ss-breakdown-value">${data.income_combined401kTakehome.asWholeDollars()}</span>
      </div>
  `;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showTotalCashBreakdown(data) {
  if (!data) {
    return; // No data to show
  }

  const popup = ensurePopup("totalNet", "Total Cash Breakdown");

  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Combined Salaries:</span>
        <span class="ss-breakdown-value">${data.income_combinedTakehomeWages.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Combined Social Security:</span>
        <span class="ss-breakdown-value">${data.income_combinedSsTakehome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Combined Pension:</span>
        <span class="ss-breakdown-value">${data.income_combinedPensionTakehome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Combined 401(k):</span>
        <span class="ss-breakdown-value">${data.income_combined401kTakehome.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Savings:</span>
        <span class="ss-breakdown-value">${data.transfer_savingsToCash.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Roth Withdrawals:</span>
        <span class="ss-breakdown-value">${data.income_combinedRothTakehome.asWholeDollars()}</span>
    </div>
    `;

  if (data.income_miscTaxableIncomeTakehome > 0) {
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Miscellaneous Taxable Income:</span>
        <span class="ss-breakdown-value">${data.income_miscTaxableIncomeTakehome.asWholeDollars()}</span>
    </div>`;
  }

  if (data.income_miscTaxFreeIncome > 0) {
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Miscellaneous Tax-Free Income:</span>
        <span class="ss-breakdown-value">${data.income_miscTaxFreeIncome.asWholeDollars()}</span>
    </div>`;
  }
  // debugger;
  breakdownHtml += `    
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${data.cash_total_inflows.asWholeDollars()}</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

/**
 * @param {ReportData} data
 */
function showCashFlowDiagram(data) {
  if (!data) {
    return; // No SS data to show
  }

  // debugger;
  const popup = ensurePopup("cashFlow", `Cash Flow`);

  // Update title for each call since popup instance is reused
  popup.setTitle(`Cash Flow ${data.year}`);

  // Build the breakdown content
  let breakdownHtml = `
      <div id="sankey-chart"></div>
    `;

  // Set the popup content first so the DOM element exists
  popup.setContent(breakdownHtml);

  // Apply larger sizing for cash flow popup
  const popupContent = popup.root.querySelector(".ss-popup-content");
  if (popupContent instanceof HTMLElement) {
    popupContent.style.maxWidth = "95vw";
    popupContent.style.width = "95vw";
    popupContent.style.maxHeight = "70vh";
    popupContent.style.height = "70vh";
  }

  popup.show();

  // Initialize chart after DOM is ready
  setTimeout(() => {
    const chartElement = document.getElementById("sankey-chart");
    if (!chartElement) {
      console.error("Chart element not found");
      return;
    }

    const chart = echarts.init(chartElement);

    // --- helpers: include only positive-value links; nodes auto-derived from links ---
    /**
     * @type {{ source: string; target: string; value: number; }[]}
     */
    const links = [];
    const nodes = new Map(); // name -> { name, depth }

    // const num = (/** @type {any} */ v) => (v == null ? 0 : Number(v));
    // const pos = (/** @type {any} */ v) =>
    //   Math.max(0, Math.round(num(v) * 100) / 100);

    /**
     *
     * @param {string} name
     * @param {number} depth
     */
    const addNode = (name, depth) => {
      if (!nodes.has(name)) nodes.set(name, { name, depth });
    };

    // Depth is the "column" index. This is what keeps the diagram structured.
    /**
     *
     * @param {string} target
     * @param {string} source
     * @param {number} value
     * @param {number} sourceDepth
     * @param {number} targetDepth
     * @param {string} description - Human-readable description of this flow
     * @returns
     */
    const addLink = (
      target,
      source,
      value,
      sourceDepth,
      targetDepth,
      description = ""
    ) => {
      // const v = pos(value);
      if (value <= 0) return;

      addNode(source, sourceDepth);
      addNode(target, targetDepth);
      links.push({
        source,
        target,
        value,
        description: description || `${source} flows to ${target}`,
      });
    };

    // debugger;
    const netIncome = data.income_total_takehome;
    const cash = data.cash_total_inflows;

    const INCOME_NET = "Income (net)";
    const PENSION = "Pension";
    const WAGES = "Wages";
    const SOCIAL_SECURITY = "Social Security";
    const WITHDRAWALS_401K = "401k Withdrawals";
    const CASH = "Cash";
    const SAVINGS_WITHDRAWALS = "Savings (Withdrawals)";
    const WITHHOLDINGS = "Withholdings";
    const PROJECTED_SPENDING = "Projected Spending";
    const SAVINGS_DEPOSITS = "Savings (Deposits)";
    const SAVINGS_INTEREST = "Savings Interest";
    const TAXES_DUE = "Taxes";
    const FEDERAL_TAXES_PAID = "Federal Taxes Paid";
    const TAX_REFUND = "Tax Refund";

    // debugger;

    // Income → Gross
    addLink(
      INCOME_NET,
      WAGES,
      data.income_combinedTakehomeWages,
      0,
      1,
      "Take-home wages after taxes and deductions"
    );
    addLink(
      INCOME_NET,
      PENSION,
      data.income_combinedPensionTakehome,
      0,
      1,
      "Takehome pensions/annuities after withholdings"
    );
    addLink(
      INCOME_NET,
      SOCIAL_SECURITY,
      data.income_combinedSsTakehome,
      0,
      1,
      "Takehome Social Security after withholdings"
    );
    addLink(
      INCOME_NET,
      WITHDRAWALS_401K,
      data.income_combined401kTakehome,
      0,
      1,
      "Takehome 401k withdrawals after withholdings"
    );
    addLink(
      CASH,
      SAVINGS_WITHDRAWALS,
      data.transfer_savingsToCash,
      1,
      2,
      "Money withdrawn from savings account"
    );
    addLink(
      WITHHOLDINGS,
      WAGES,
      data.withholdings_combinedWages,
      0,
      1,
      "Federal taxes withheld from wages"
    );
    addLink(
      WITHHOLDINGS,
      SOCIAL_SECURITY,
      data.withholdings_combinedSs,
      0,
      1,
      "Taxes withheld from Social Security"
    );
    addLink(
      WITHHOLDINGS,
      PENSION,
      data.withholdings_combinedPension,
      0,
      1,
      "Taxes withheld from pension"
    );
    addLink(
      WITHHOLDINGS,
      WITHDRAWALS_401K,
      data.withholdings_combined401k,
      0,
      1,
      "Taxes withheld from 401k withdrawals"
    );

    addLink(
      SAVINGS_DEPOSITS,
      CASH,
      data.transfer_cashToSavings,
      2,
      3,
      "Surplus cash deposited into savings"
    );

    addLink(CASH, INCOME_NET, netIncome, 1, 2, "Net income available as cash");

    addLink(
      PROJECTED_SPENDING,
      CASH,
      data.actualSpend,
      1,
      3,
      "Cash used for living expenses and spending"
    );

    addLink(
      SAVINGS_DEPOSITS,
      SAVINGS_INTEREST,
      data.account_savingsInterest,
      2,
      3,
      "Interest earned on savings account balance"
    );

    addLink(
      TAXES_DUE,
      WITHHOLDINGS,
      data.withholdings_total,
      1,
      2,
      "Tax withholdings applied to tax liability"
    );
    addLink(
      FEDERAL_TAXES_PAID,
      TAXES_DUE,
      data.taxes_federalIncomeTaxOwed,
      2,
      3,
      "Federal income taxes paid to IRS"
    );

    if (data.transfer_savingsToTaxes > 0) {
      addLink(
        TAXES_DUE,
        SAVINGS_WITHDRAWALS,
        data.transfer_savingsToTaxes,
        1,
        2,
        "Additional taxes paid from savings (tax shortfall)"
      );
    }
    if (data.transfer_taxesToSavings > 0) {
      // addLink(TAX_REFUND, WITHHOLDINGS, c.transfer_taxesToSavings, 1, 2);
      addLink(
        SAVINGS_DEPOSITS,
        TAXES_DUE,
        data.transfer_taxesToSavings,
        2,
        3,
        "Tax refund deposited into savings (overpayment)"
      );
    }

    // --- optional dev sanity log ---

    // Calculate total values for each node
    const nodeValues = new Map();

    // Calculate based on outgoing flows (source nodes)
    for (const link of links) {
      nodeValues.set(
        link.source,
        (nodeValues.get(link.source) || 0) + link.value
      );
    }

    // For target nodes that don't have outgoing flows, use their incoming flow
    for (const link of links) {
      if (!nodeValues.has(link.target)) {
        nodeValues.set(link.target, link.value);
      }
    }

    // Add calculated values to node data
    const nodesWithValues = Array.from(nodes.values()).map((node) => ({
      ...node,
      value: nodeValues.get(node.name) || 0,
    }));

    const option = {
      backgroundColor: "#ece9e5",
      tooltip: {
        trigger: "item",
        triggerOn: "mousemove",
        formatter: (
          /** @type {{ dataType: string; data: any; name: any; value: any; }} */ p
        ) => {
          if (p.dataType === "edge") {
            const v = Number(p.data.value);
            const description =
              p.data.description || `${p.data.source} → ${p.data.target}`;
            return `${description}<br/><b>$${v.toLocaleString()}</b>`;
          } else if (p.dataType === "node") {
            // Try multiple ways to get the value
            const nodeTotal =
              nodeValues.get(p.name) || p.value || p.data?.value || 0;
            return `<b>${p.name}</b><br/>Total: <b>$${nodeTotal.toLocaleString()}</b>`;
          }
          return `<b>${p.name}</b>`;
        },
      },
      series: [
        {
          type: "sankey",
          nodeAlign: "left",
          emphasis: { focus: "adjacency" },

          // IMPORTANT: nodes are derived from links, and each node includes a `depth`
          // which keeps the chart in your desired columns.
          data: nodesWithValues,
          links,

          lineStyle: { color: "gradient", curveness: 0.5 },
          label: {
            fontSize: 14,
            fontWeight: "bold",
            color: "#4d4d4d",
          },
          itemStyle: {
            borderWidth: 2,
          },
          nodeGap: 20,
          nodeWidth: 20,
        },
      ],
    };

    chart.setOption(option);
    window.addEventListener("resize", () => chart.resize());
  }, 0); // End setTimeout
}

// /** @param {Transaction[]} transactions */
// function dumpCategorySummaries(transactions) {

//   const fieldLayout = {
//     category: 15,
//     inflows: 10,
//     outflows: 10,
//     balance: 10,
//     tranCount: 18,
//     grandTotalLabel: 15,
//     grandTotal: 10,
//     spacer: 3,
//   };

//   const sortedTransactions = [...transactions].sort((a, b) => {
//     const [catA, txnsA] = a;
//     const [catB, txnsB] = b;

//     const inflowsA = txnsA
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Deposit &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);

//     const outflowsA = txnsA
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Withdrawal &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);

//     const inflowsB = txnsB
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Deposit &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);

//     const outflowsB = txnsB
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Withdrawal &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);

//     const aHasInflows = inflowsA > 0;
//     const bHasInflows = inflowsB > 0;

//     // inflow categories always come first
//     if (aHasInflows && !bHasInflows) return -1;
//     if (!aHasInflows && bHasInflows) return 1;

//     // both have inflows -> sort by inflows desc
//     if (aHasInflows && bHasInflows) return inflowsB - inflowsA;

//     // both have 0 inflows -> sort by outflows desc
//     return outflowsB - outflowsA;
//   });

//   const table = document.createElement("table");
//   const headers = document.createElement("tr");
//   headers.innerHTML = `
//   <th style="width: ${fieldLayout.category}%">${StringFunctions.padAndAlign("Category", fieldLayout.category)}</th>
//   <th style="width: ${fieldLayout.inflows}%">${StringFunctions.padAndAlign("Inflows", fieldLayout.inflows, "right")}</th>
//   <th style="width: ${fieldLayout.outflows}%">${StringFunctions.padAndAlign("Outflows", fieldLayout.outflows, "right")}</th>
//   <th style="width: ${fieldLayout.balance}%">${StringFunctions.padAndAlign("Total", fieldLayout.balance, "right")}</th>
//   <th style="width: ${fieldLayout.tranCount}%">${StringFunctions.padAndAlign("Transaction Count", fieldLayout.tranCount, "right")}</th>
// `;
//   table.appendChild(headers);

//   let categoryBalance = 0;
//   let categoryInflows = 0;
//   let categoryOutflows = 0;
//   let transactionCountTotal = 0;
//   let grandTotal = 0;
//   for (const [category, txns] of sortedTransactions) {
//     const inflows = txns
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Deposit &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);
//     categoryInflows += inflows.asCurrency();
//     const outflows = txns
//       .filter(
//         (t) =>
//           t.transactionType === TransactionType.Withdrawal &&
//           t.date.getFullYear() === this.#accountYear.taxYear
//       )
//       .reduce((sum, t) => sum + t.amount, 0);
//     categoryOutflows += outflows.asCurrency();
//     categoryBalance = inflows - outflows;
//     grandTotal += categoryBalance.asCurrency();
//     const count = txns.length;
//     transactionCountTotal += count;

//     const detailData = document.createElement("tr");
//     detailData.innerHTML = `
//     <td>${StringFunctions.padAndAlign(category, fieldLayout.category)}</td>
//     <td>${StringFunctions.padAndAlign(inflows.asCurrency(), fieldLayout.inflows, "right")}</td>
//     <td>${StringFunctions.padAndAlign(outflows.asCurrency(), fieldLayout.outflows, "right")}</td>
//     <td>${StringFunctions.padAndAlign(categoryBalance.asCurrency(), fieldLayout.balance, "right")}</td>
//     <td>${StringFunctions.padAndAlign(count.toString(), fieldLayout.tranCount, "right")}</td>
//   `;
//     table.appendChild(detailData);
//   }

//   const grandTotalRow = document.createElement("tr");
//   grandTotalRow.innerHTML = `
//   <th>${StringFunctions.padAndAlign("Grand Total:", fieldLayout.grandTotalLabel)}</th>
//   <td>${StringFunctions.padAndAlign(categoryInflows.asCurrency(), fieldLayout.inflows, "right")}</td>
//   <td>${StringFunctions.padAndAlign(categoryOutflows.asCurrency(), fieldLayout.outflows, "right")}</td>
//   <td>${StringFunctions.padAndAlign(grandTotal.asCurrency(), fieldLayout.balance, "right")}</td>
//   <td>${StringFunctions.padAndAlign(transactionCountTotal.toString(), fieldLayout.tranCount, "right")}</td>
// `;
//   table.appendChild(grandTotalRow);

//   const tableBody = document.createElement("tbody");
//   tableBody.appendChild(headers);
//   for (const detailData of table.children) {
//     tableBody.appendChild(detailData);
//   }
//   table.appendChild(tableBody);

//   document.body.appendChild(table);
// }

/**
 * @param {ReportData} data
 * @param {{ category: string; inflows: number; outflows: number; balance: number; count: number; }[]} summaries
 */
export function dumpCategorySummaries(data, summaries) {
  if (!summaries || !Array.isArray(summaries)) {
    console.error("Invalid summaries data:", summaries);
    return;
  }

  const table = new ReportTableBuilder()
    .addColumn("Category", 25, "left", "text", false)
    .addColumn("Inflows", 18, "right", "currency", true)
    .addColumn("Outflows", 18, "right", "currency", true)
    .addColumn("Balance", 18, "right", "currency", true)
    .addColumn("Count", 12, "right", "number", true)
    .enableStickyHeader();

  for (const summary of summaries) {
    // Ensure all values are properly defined and typed
    const safeCategory = String(summary.category || "Unknown");
    const safeInflows = Number(summary.inflows) || 0;
    const safeOutflows = Number(summary.outflows) || 0;
    const safeBalance = Number(summary.balance) || 0;
    const safeCount = Number(summary.count) || 0;

    table.addRow([
      safeCategory,
      safeInflows,
      safeOutflows,
      safeBalance,
      safeCount,
    ]);
  }

  const tableElement = table.build();

  const popup = ensurePopup("categorySummaries", "Category Summary Report");
  popup.setContent(tableElement.outerHTML);

  // Apply larger sizing for cash flow popup
  const popupContent = popup.root.querySelector(".ss-popup-content");
  if (popupContent instanceof HTMLElement) {
    popupContent.style.maxWidth = "95vw";
    popupContent.style.width = "95vw";
    popupContent.style.maxHeight = "70vh";
    popupContent.style.height = "70vh";
  }
  popup.show();
}

export { showSsBreakdown };
