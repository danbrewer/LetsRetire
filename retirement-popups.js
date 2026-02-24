import { ensurePopup } from "./popup-engine.js";
import { ReportData } from "./rReportData.js";

/**
 * @typedef {(data: import("./rReportData.js").ReportData) => void} PopupHandler
 */

const fmt = (/** @type {number} */ n) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

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
    (data.ss_subjectSsGross || 0) + (data.ss_partnerSsGross || 0);
  const combinedSsTaxable =
    (data.ss_subjectSsTaxable || 0) + (data.ss_partnerSsTaxable || 0);
  const combinedSsNonTaxable =
    (data.ss_subjectSsNonTaxable || 0) + (data.ss_partnerSsNonTaxable || 0);
  const combinedSsWithholdings =
    (data.ss_subjectSsWithholdings || 0) + (data.ss_partnerSsWithholdings || 0);
  const combinedSsTakehome =
    (data.ss_subjectSsTakehome || 0) + (data.ss_partnerSsTakehome || 0);
  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Gross (Annual):</span>
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
              data.income_taxableIncome || 0
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
    (data.ss_subjectSsGross || 0) + (data.ss_partnerSsGross || 0);
  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${data.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject SS Gross:</span>
        <span class="ss-breakdown-value">${data.ss_subjectSsGross.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner SS Gross:</span>
        <span class="ss-breakdown-value">${data.ss_partnerSsGross.asWholeDollars()}</span>
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
        <span class="ss-breakdown-value">${data.income_total_withholdings.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Federal Income Tax:</span>
        <span class="ss-breakdown-value">${data.taxes_federalIncomeTaxOwed.asWholeDollars()}</span>
    </div>
    `;

  if (data.taxes_underPayment > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Taxes due:</span>
          <span class="ss-breakdown-value">${data.taxes_underPayment.asWholeDollars()}</span>
      </div>
    `;
  }

  if (data.taxes_overPayment > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Refund:</span>
          <span class="ss-breakdown-value">${data.taxes_overPayment.asWholeDollars()}</span>
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
          <span class="ss-breakdown-value">${data.income_subjectWagesWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.income_subject401kWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (${data.taxes_pensionWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.income_subjectPensionWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (${data.taxes_ssWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.ss_subjectSsWithholdings.asWholeDollars()}</span>
      </div>
    </div>
    `;
  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Partner:</strong>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Wages (${data.income_wagesWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.income_partnerWagesWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k (${data.taxes_401kWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.income_partner401kWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (${data.taxes_pensionWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.income_partnerPensionWithholdings.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (${data.taxes_ssWithholdingRate * 100}%):</span>
          <span class="ss-breakdown-value">${data.ss_partnerSsWithholdings.asWholeDollars()}</span>
      </div>
    </div>
    `;
  }
  breakdownHtml += `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Misc Taxable Income:</span>
      <span class="ss-breakdown-value">${data.income_miscIncomeWithholdings.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total Withholdings:</span>
        <span class="ss-breakdown-value">${data.income_total_withholdings.asWholeDollars()}</span>
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
        <span class="ss-breakdown-value">${data.income_combinedWagesWithholdings.asWholeDollars()}</span>
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
    </div>
    `;

  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner:</span>
        <span class="ss-breakdown-value">${data.income_partner401kGross.asWholeDollars()}</span>
    </div>
    `;
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

  breakdownHtml += `
   <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Spend:</span>
        <span class="ss-breakdown-value">${data.ask.asWholeDollars()}</span>
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
  }, '');

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
      <span class="ss-breakdown-value">${data.savings_Withdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject Roth withdrawal:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_subjectRothWithdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner Roth withdrawal:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_partnerRothWithdrawals.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Subject Roth withdrawal:</span>
        <span class="ss-breakdown-value">${(data.savings_Withdrawals + data.income_combinedRothTakehome).asWholeDollars()}</span>
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
    data.retirementAcct_subjectSavingsContributions +
    data.retirementAcct_partnerSavingsContributions +
    data.spending_surplus;

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
      <span class="ss-breakdown-label">Opening balance</span>
      <span class="ss-breakdown-value">${data.savings_OpeningBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Withdrawals:</span>
        <span class="ss-breakdown-value">${data.savings_Withdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Deposits:</span>
        <span class="ss-breakdown-value">${deposits.asWholeDollars()}</span>
    </div>
     <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Interest earned:</span>
        <span class="ss-breakdown-value">${data.savings_Interest.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Tax refund:</span>
        <span class="ss-breakdown-value">${data.taxes_overPayment.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxes owed:</span>
        <span class="ss-breakdown-value">${data.taxes_underPayment.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Closing balance:</span>
        <span class="ss-breakdown-value">${data.savings_Balance.asWholeDollars()}</span>
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
    data.retirementAcct_subject401kBalance +
    data.retirementAcct_partner401kBalance;

  // Build the breakdown content
  let breakdownHtml = `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
      <strong style="color: var(--accent);">Subject:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Opening balance</span>
        <span class="ss-breakdown-value">${data.retirementAcct_subject401kOpenBalance.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withdrawals:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_subject401kWithdrawals.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Deposits:</span>
          <span class="ss-breakdown-value">${data.income_subject401kContribution.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Interest earned:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_subject401kInterest.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Closing balance:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_subject401kBalance.asWholeDollars()}</span>
      </div>
    </div>
    `;

  if (data.demographics_hasPartner) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
      <strong style="color: var(--accent);">Partner:</strong>
      <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Opening balance</span>
        <span class="ss-breakdown-value">${data.retirementAcct_partner401kOpenBalance.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Withdrawals:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_partner401kWithdrawals.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Deposits:</span> 
          <span class="ss-breakdown-value">${data.income_partner401kContribution.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Interest earned:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_partner401kInterest.asWholeDollars()}</span>
      </div>
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Closing balance:</span>
          <span class="ss-breakdown-value">${data.retirementAcct_partner401kBalance.asWholeDollars()}</span>
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
      <span class="ss-breakdown-value">${data.savings_Balance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject Roth IRA:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_subjectRothBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner Roth IRA:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_partnerRothBalance.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Subject 401k:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_subject401kBalance.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Partner 401k:</span>
        <span class="ss-breakdown-value">${data.retirementAcct_partner401kBalance.asWholeDollars()}</span>
    </div>
        <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${data.balances_total.asWholeDollars()}</span>
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
          <span class="ss-breakdown-value">${data.income_subject401kWithholdings.asWholeDollars()}</span>
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
          <span class="ss-breakdown-value">${data.income_partner401kWithholdings.asWholeDollars()}</span>
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
        <span class="ss-breakdown-value">${data.ss_combinedTakehome.asWholeDollars()}</span>
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
        <span class="ss-breakdown-value">${data.savings_Withdrawals.asWholeDollars()}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Roth Withdrawals:</span>
        <span class="ss-breakdown-value">${data.income_combinedRothTakehome.asWholeDollars()}</span>
    </div>
    `;

  if (data.income_miscTaxableIncomeTakehome > 0){
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Miscellaneous Taxable Income:</span>
        <span class="ss-breakdown-value">${data.income_miscTaxableIncomeTakehome.asWholeDollars()}</span>
    </div>`;
  }

  if (data.income_miscTaxFreeIncome > 0){
    breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Miscellaneous Tax-Free Income:</span>
        <span class="ss-breakdown-value">${data.income_miscTaxFreeIncome.asWholeDollars()}</span>
    </div>`;
  }
  debugger;
  breakdownHtml += `    
    <div class="ss-breakdown-item breakdown-accent">
        <span class="ss-breakdown-label">Total:</span>
        <span class="ss-breakdown-value">${data.income_total_net.asWholeDollars()}</span>
    </div>`;

  popup.setContent(breakdownHtml);
  popup.show();
}

export { showSsBreakdown };
