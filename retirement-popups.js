// SS Breakdown Popup Functions
function showSsBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation || !calculation.ss.mySs) {
    return; // No SS data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const ssBreakdown = calculation.ssBreakdown || {};
  const details = ssBreakdown.calculationDetails || {};

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Monthly Benefit:</span>
        <span class="ss-breakdown-value">${fmt(
          (ssBreakdown.mySsGross || 0) / 12
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">SS Gross Annual:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.mySsGross || 0
        )}</span>
    </div>
    `;

  // Add detailed calculation steps based on method
  if (details.method === "irs-rules") {
    breakdownHtml += `
        <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">IRS SS Taxation Calculation:</strong>
        <div style="margin-top: 8px;">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">Other Taxable Income:</span>
            <span class="ss-breakdown-value">${fmt(
              ssBreakdown.otherTaxableIncome || 0
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
            <span class="ss-breakdown-label">+ 50% of SS Benefits:</span>
            <span class="ss-breakdown-value">${fmt(
              (ssBreakdown.mySsGross || 0) * 0.5
            )}</span>
            </div>
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; font-weight: 600; border-top: 1px solid var(--border); margin-top: 4px;">
            <span class="ss-breakdown-label">= Provisional Income:</span>
            <span class="ss-breakdown-value">${fmt(
              details.provisionalIncome || 0
            )}</span>
            </div>
        </div>
        
        <div style="margin-top: 12px;">
            <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">
            <strong>Thresholds (${
              calculation.age >= 65
                ? "Filing Status: " +
                  (details.threshold1 === 32000 ? "Married" : "Single")
                : "Single/Married"
            }):</strong><br/>
            • Tier 1: $${details.threshold1?.toLocaleString()} (0% → 50% taxable)<br/>
            • Tier 2: $${details.threshold2?.toLocaleString()} (50% → 85% taxable)
            </div>
    `;

    if (details.provisionalIncome <= details.threshold1) {
      breakdownHtml += `
            <div style="color: var(--good);">
            ✓ Provisional income ≤ $${details.threshold1.toLocaleString()}<br/>
            → 0% of SS benefits are taxable
            </div>
        `;
    } else if (details.provisionalIncome <= details.threshold2) {
      breakdownHtml += `
            <div style="color: var(--warn);">
            ⚠ Provisional income between $${details.threshold1.toLocaleString()} and $${details.threshold2.toLocaleString()}<br/>
            → Up to 50% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Excess over threshold: ${fmt(details.excessIncome1)}<br/>
                Taxable amount: min(50% of SS, 50% of excess) = ${fmt(
                  details.tier1Amount
                )}
            </div>
            </div>
        `;
    } else {
      breakdownHtml += `
            <div style="color: var(--bad);">
            ⚠ Provisional income > $${details.threshold2.toLocaleString()}<br/>
            → Up to 85% of SS benefits may be taxable<br/>
            <div style="margin-top: 4px; font-size: 11px;">
                Tier 1 (50%): ${fmt(details.tier1Amount)}<br/>
                Tier 2 (85% of excess over $${details.threshold2.toLocaleString()}): ${fmt(
        details.tier2Amount
      )}<br/>
                85% of SS benefits: ${fmt(
                  (ssBreakdown.mySsGross || 0) * 0.85
                )}<br/>
                Total taxable: min(85% of SS, Tier 1 + Tier 2) = ${fmt(
                  details.tier1Amount + details.tier2Amount
                )}
            </div>
            </div>
        `;
    }

    breakdownHtml += `</div>`;
  } else if (details.method === "simplified") {
    breakdownHtml += `
        <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Simplified SS Taxation:</strong>
        <div style="margin-top: 8px; font-size: 12px; color: var(--muted);">
            Using simplified assumption that 85% of SS benefits are taxable.
        </div>
        </div>
    `;
  }

  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.mySsTaxableAmount || 0
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Non-Taxable Amount:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.mySsNonTaxable || 0
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Effective Tax Rate:</span>
        <span class="ss-breakdown-value">${
          details.effectiveRate ? details.effectiveRate.toFixed(1) + "%" : "N/A"
        }</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Federal Taxes:</span>
        <span class="ss-breakdown-value">${fmt(
          ssBreakdown.mySsTaxes || 0
        )}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Net Amount (Take Home):</span>
        <span class="ss-breakdown-value">${fmt(calculation.ss.mySs)}</span>
    </div>
    `;

  // Add taxation method explanation
  const inputs = parseInputParameters();
  breakdownHtml += `
        <div style="margin-top: 16px; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px; font-size: 12px; color: var(--muted);">
        <strong>About IRS SS Rules:</strong><br/>
        Social Security taxation is based on "provisional income" which includes your taxable income plus 50% of your SS benefits. The percentage of SS benefits that become taxable depends on income thresholds that vary by filing status.
        </div>
    `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

function closeSsPopup() {
  const popup = document.getElementById("ssPopup");
  popup.classList.remove("show");
}

// Function to show taxable income breakdown popup
function showTaxableIncomeBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Taxable Income Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  } // Build the breakdown content showing sources of taxable income
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let grossTaxableTotal = 0;

  // Add taxable income sources
  if (calculation.salary && calculation.salary > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Salary:</span>
          <span class="ss-breakdown-value">${fmt(calculation.salary)}</span>
      </div>
    `;
    grossTaxableTotal += calculation.salary;
  }

  if (
    calculation.taxes.taxableInterest &&
    calculation.taxes.taxableInterest > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Taxable Interest:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.taxes.taxableInterest
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.taxes.taxableInterest;
  }

  // Social Security gross (before calculating taxable portion)
  if (calculation.ss.mySsGross && calculation.ss.mySsGross > 0) {
    const ssTaxableAmount =
      calculation.ssBreakdown?.ssTaxableAmount ||
      calculation.ss.mySsGross * 0.85; // Estimate if not available
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security (Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(ssTaxableAmount)}</span>
      </div>
    `;
    grossTaxableTotal += ssTaxableAmount;
  }

  // Pension gross (typically fully taxable)
  if (calculation.pen.myPenGross && calculation.pen.myPenGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.pen.myPenGross
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.pen.myPenGross;
  }

  // Spouse Social Security gross
  if (calculation.ss.spouseSsGross && calculation.ss.spouseSsGross > 0) {
    const spouseSsTaxableAmount =
      calculation.spouseSsBreakdown?.ssTaxableAmount ||
      calculation.ss.spouseSsGross * 0.85; // Estimate if not available
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Social Security (Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(spouseSsTaxableAmount)}</span>
      </div>
    `;
    grossTaxableTotal += spouseSsTaxableAmount;
  }

  // Spouse Pension gross
  if (calculation.pen.spousePenGross && calculation.pen.spousePenGross > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Pension:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.pen.spousePenGross
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.pen.spousePenGross;
  }

  // Pre-tax withdrawals (401k)
  if (
    calculation.withdrawals.retirementAccountGross &&
    calculation.withdrawals.retirementAccountGross > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">401k Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.withdrawals.retirementAccountGross
          )}</span>
      </div>
    `;
    grossTaxableTotal += calculation.withdrawals.retirementAccountGross;
  }

  // Add separator and totals
  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Gross Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          grossTaxableTotal
        )}</strong></span>
    </div>
  `;

  // Add standard deduction info
  const filingStatusElement = document.getElementById("filingStatus");
  const filingStatus = filingStatusElement
    ? filingStatusElement.value
    : "single";

  // Use inflation-adjusted standard deduction for the calculation year
  const calculationYear = TAX_BASE_YEAR + yearIndex;
  const inflationElement = document.getElementById("inflation");
  const inflationRate = inflationElement
    ? parseFloat(inflationElement.value) / 100
    : 0.025;
  const standardDeduction = getStandardDeduction(
    filingStatus,
    calculationYear,
    inflationRate
  );

  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Less: Standard Deduction (${calculationYear}):</span>
        <span class="ss-breakdown-value">-${fmt(standardDeduction)}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Net Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          calculation.taxes.taxableIncome ||
            Math.max(0, grossTaxableTotal - standardDeduction)
        )}</strong></span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Function to show non-taxable income breakdown popup
function showNonTaxableIncomeBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Non-Taxable Income Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  }

  // Build the breakdown content showing sources of non-taxable income
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let nonTaxableTotal = 0;

  // Social Security non-taxable portion
  if (calculation.ss.mySsGross && calculation.ss.mySsGross > 0) {
    const ssNonTaxableAmount =
      calculation.ssBreakdown?.ssNonTaxable || calculation.ss.mySsGross * 0.15; // Estimate if not available
    if (ssNonTaxableAmount > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item">
            <span class="ss-breakdown-label">Social Security (Non-Taxable Portion):</span>
            <span class="ss-breakdown-value">${fmt(ssNonTaxableAmount)}</span>
        </div>
      `;
      nonTaxableTotal += ssNonTaxableAmount;
    }
  }

  // Spouse Social Security non-taxable portion
  if (calculation.ss.spouseSsGross && calculation.ss.spouseSsGross > 0) {
    const spouseSsNonTaxableAmount =
      calculation.spouseSsBreakdown?.ssNonTaxable ||
      calculation.ss.spouseSsGross * 0.15; // Estimate if not available
    if (spouseSsNonTaxableAmount > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item">
            <span class="ss-breakdown-label">Spouse Social Security (Non-Taxable Portion):</span>
            <span class="ss-breakdown-value">${fmt(
              spouseSsNonTaxableAmount
            )}</span>
        </div>
      `;
      nonTaxableTotal += spouseSsNonTaxableAmount;
    }
  }

  // Pension non-taxable portion (usually none, but could be from Roth 401k)
  if (
    calculation.penBreakdown?.penNonTaxable &&
    calculation.penBreakdown.penNonTaxable > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Pension (Non-Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.penBreakdown.penNonTaxable
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.penBreakdown.penNonTaxable;
  }

  // Spouse Pension non-taxable portion
  if (
    calculation.spousePenBreakdown?.penNonTaxable &&
    calculation.spousePenBreakdown.penNonTaxable > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Spouse Pension (Non-Taxable Portion):</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.spousePenBreakdown.penNonTaxable
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.spousePenBreakdown.penNonTaxable;
  }

  // Savings withdrawals (after-tax money)
  if (
    calculation.withdrawals.savingsGross &&
    calculation.withdrawals.savingsGross > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Savings Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.withdrawals.savingsGross
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.withdrawals.savingsGross;
  }

  // Roth withdrawals (tax-free)
  if (
    calculation.withdrawals.rothGross &&
    calculation.withdrawals.rothGross > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Roth Withdrawals:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.withdrawals.rothGross
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.withdrawals.rothGross;
  }

  // Tax-free income adjustments (gifts, inheritance, etc.)
  if (
    calculation.taxFreeIncomeAdjustment &&
    calculation.taxFreeIncomeAdjustment > 0
  ) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Tax-Free Income Adjustments:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.taxFreeIncomeAdjustment
          )}</span>
      </div>
    `;
    nonTaxableTotal += calculation.taxFreeIncomeAdjustment;
  }

  // Add total
  breakdownHtml += `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label"><strong>Total Non-Taxable Income:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          nonTaxableTotal
        )}</strong></span>
    </div>
  `;

  // Add explanatory note
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
        <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
        <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">This income is not subject to federal income tax</span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Function to close provisional income popup with special handling for forced styles
function closeProvisionalIncomePopup() {
  const popup = document.getElementById("ssPopup");
  // Remove the show class
  popup.classList.remove("show");
  // Clear the forced inline styles
  popup.style.removeProperty("display");
  popup.style.removeProperty("z-index");
  // Clear the provisional income marker
  delete popup.dataset.provisionalIncome;
}

// Function to show provisional income breakdown popup
function showProvisionalIncomeBreakdown(yearIndex) {
  console.log(
    "showProvisionalIncomeBreakdown called with yearIndex:",
    yearIndex
  );

  const calculation = calculations[yearIndex];
  if (!calculation) {
    console.log("No calculation found for yearIndex:", yearIndex);
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  if (!popup || !content) {
    console.log("Popup elements not found!");
    return;
  }

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Provisional Income Breakdown";
  }

  // Update close button to use a custom close function that handles our forced styles
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeProvisionalIncomePopup();
    };
  }

  // Build the breakdown content showing sources of provisional income
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  // Get the provisional income details from SS breakdown
  const ssBreakdown = calculation.ssBreakdown;
  const provisionalIncomeDetails = ssBreakdown?.calculationDetails;

  if (
    provisionalIncomeDetails &&
    provisionalIncomeDetails.provisionalIncome > 0
  ) {
    // Calculate components of provisional income
    const otherTaxableIncome =
      provisionalIncomeDetails.provisionalIncome -
      calculation.ss.mySsGross * 0.5;
    const halfSocialSecurity = calculation.ss.mySsGross * 0.5;

    breakdownHtml += `
      <div class="ss-breakdown-section">
          <h4 style="margin: 16px 0 8px 0; color: var(--accent); font-size: 14px;">Provisional Income Components</h4>
          
          <div class="ss-breakdown-item">
              <span class="ss-breakdown-label">Other Taxable Income:</span>
              <span class="ss-breakdown-value">${fmt(otherTaxableIncome)}</span>
          </div>
          
          <div class="ss-breakdown-item">
              <span class="ss-breakdown-label">50% of Social Security Benefits:</span>
              <span class="ss-breakdown-value">${fmt(halfSocialSecurity)}</span>
          </div>
          
          <div class="ss-breakdown-item total-row">
              <span class="ss-breakdown-label"><strong>Total Provisional Income:</strong></span>
              <span class="ss-breakdown-value"><strong>${fmt(
                provisionalIncomeDetails.provisionalIncome
              )}</strong></span>
          </div>
      </div>
    `;

    // Add thresholds and taxation explanation
    const threshold1 = provisionalIncomeDetails.threshold1;
    const threshold2 = provisionalIncomeDetails.threshold2;
    const isUsingSSRules = provisionalIncomeDetails.method === "irs-rules";
    const filingStatus =
      threshold1 === 32000
        ? FILING_STATUS.MARRIED_FILING_JOINTLY
        : FILING_STATUS.SINGLE; // Infer from threshold

    if (isUsingSSRules) {
      breakdownHtml += `
        <div class="ss-breakdown-section">
            <h4 style="margin: 16px 0 8px 0; color: var(--accent); font-size: 14px;">Social Security Taxation Thresholds</h4>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Filing Status:</span>
                <span class="ss-breakdown-value">${
                  filingStatus === FILING_STATUS.MARRIED_FILING_JOINTLY
                    ? "Married Filing Jointly"
                    : "Single"
                }</span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">First Threshold (0% → 50% taxable):</span>
                <span class="ss-breakdown-value">${fmt(threshold1)}</span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Second Threshold (50% → 85% taxable):</span>
                <span class="ss-breakdown-value">${fmt(threshold2)}</span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Your Provisional Income:</span>
                <span class="ss-breakdown-value">${fmt(
                  provisionalIncomeDetails.provisionalIncome
                )}</span>
            </div>
        </div>
      `;

      // Determine which tier applies and calculate detailed breakdown
      const provisionalIncome = provisionalIncomeDetails.provisionalIncome;
      const ssGross = calculation.ss.mySsGross;

      // Calculate the actual taxable SS amount using IRS rules
      let ssTaxableAmount = 0;
      let tier1TaxableAmount = 0; // Amount taxable at 50% rate
      let tier2TaxableAmount = 0; // Amount taxable at 85% rate
      let tierMessage = "";

      if (provisionalIncome <= threshold1) {
        // No SS is taxable
        ssTaxableAmount = 0;
        tierMessage =
          "Your provisional income is below the first threshold, so 0% of your Social Security benefits are taxable.";
      } else if (provisionalIncome <= threshold2) {
        // Up to 50% of SS is taxable
        const excessOverThreshold1 = provisionalIncome - threshold1;
        tier1TaxableAmount = Math.min(excessOverThreshold1, ssGross * 0.5);
        ssTaxableAmount = tier1TaxableAmount;
        tierMessage =
          "Your provisional income is between the thresholds, so up to 50% of your Social Security benefits may be taxable.";
      } else {
        // Up to 85% of SS is taxable
        const excessOverThreshold1 = threshold2 - threshold1;
        const excessOverThreshold2 = provisionalIncome - threshold2;

        // First calculate the 50% tier (from threshold1 to threshold2)
        tier1TaxableAmount = Math.min(excessOverThreshold1, ssGross * 0.5);

        // Then calculate additional 85% tier amount (excess over threshold2)
        // The additional taxable amount is 85% of the excess over threshold2, up to 35% of SS
        const additionalTaxableFromTier2 = Math.min(
          excessOverThreshold2 * 0.85,
          ssGross * 0.35
        );
        tier2TaxableAmount = additionalTaxableFromTier2;

        // Total taxable amount is tier1 + tier2, but cannot exceed 85% of SS
        ssTaxableAmount = Math.min(
          tier1TaxableAmount + tier2TaxableAmount,
          ssGross * 0.85
        );

        tierMessage =
          "Your provisional income exceeds the second threshold, so up to 85% of your Social Security benefits may be taxable.";
      }

      const ssNonTaxable = ssGross - ssTaxableAmount;

      // Add detailed Social Security taxation breakdown
      breakdownHtml += `
        <div class="ss-breakdown-section">
            <h4 style="margin: 16px 0 8px 0; color: var(--accent); font-size: 14px;">Social Security Taxation Calculation</h4>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Total SS Benefits:</span>
                <span class="ss-breakdown-value">${fmt(ssGross)}</span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Excess over first threshold (${fmt(
                  threshold1
                )}):</span>
                <span class="ss-breakdown-value">${fmt(
                  Math.max(0, provisionalIncome - threshold1)
                )}</span>
            </div>
            
            ${
              provisionalIncome > threshold2
                ? `
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Excess over second threshold (${fmt(
                  threshold2
                )}):</span>
                <span class="ss-breakdown-value">${fmt(
                  provisionalIncome - threshold2
                )}</span>
            </div>
            `
                : ""
            }
            
            <div style="margin: 12px 0; padding: 8px; background: rgba(var(--accent-rgb), 0.1); border-radius: 8px;">
                <div class="ss-breakdown-item">
                    <span class="ss-breakdown-label">Tier 1 Taxable Amount:</span>
                    <span class="ss-breakdown-value">${fmt(
                      tier1TaxableAmount
                    )}</span>
                </div>
                <div class="ss-breakdown-item" style="margin-left: 20px; font-size: 12px; color: var(--muted);">
                    <span class="ss-breakdown-label">Calculation: min(excess over threshold1, 50% of SS)</span>
                    <span class="ss-breakdown-value">min(${fmt(
                      Math.max(0, provisionalIncome - threshold1)
                    )}, ${fmt(ssGross * 0.5)}) = ${fmt(
        tier1TaxableAmount
      )}</span>
                </div>
                
                ${
                  tier2TaxableAmount > 0
                    ? `
                <div class="ss-breakdown-item" style="margin-top: 8px;">
                    <span class="ss-breakdown-label">Tier 2 Additional Taxable:</span>
                    <span class="ss-breakdown-value">${fmt(
                      tier2TaxableAmount
                    )}</span>
                </div>
                <div class="ss-breakdown-item" style="margin-left: 20px; font-size: 12px; color: var(--muted);">
                    <span class="ss-breakdown-label">Calculation: min(85% of excess over threshold2, 35% of SS)</span>
                    <span class="ss-breakdown-value">min(${fmt(
                      (provisionalIncome - threshold2) * 0.85
                    )}, ${fmt(ssGross * 0.35)}) = ${fmt(
                        tier2TaxableAmount
                      )}</span>
                </div>
                `
                    : ""
                }
            </div>
            
            <div class="ss-breakdown-item total-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
                <span class="ss-breakdown-label"><strong>Total SS Taxable Amount:</strong></span>
                <span class="ss-breakdown-value"><strong>${fmt(
                  ssTaxableAmount
                )}</strong></span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">SS Non-taxable Amount:</span>
                <span class="ss-breakdown-value">${fmt(ssNonTaxable)}</span>
            </div>
            
            <div class="ss-breakdown-item" style="margin-top: 8px; font-size: 12px; color: var(--muted);">
                <span class="ss-breakdown-label">Effective SS Tax Rate:</span>
                <span class="ss-breakdown-value">${(
                  (ssTaxableAmount / ssGross) *
                  100
                ).toFixed(1)}%</span>
            </div>
        </div>
      `;

      breakdownHtml += `
        <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Impact:</span>
            <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">${tierMessage}</span>
        </div>
      `;
    } else {
      // Simplified method explanation
      breakdownHtml += `
        <div class="ss-breakdown-section">
            <h4 style="margin: 16px 0 8px 0; color: var(--accent); font-size: 14px;">Tax Calculation Method</h4>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Method:</span>
                <span class="ss-breakdown-value">Simplified (Fixed Percentage)</span>
            </div>
            
            <div class="ss-breakdown-item">
                <span class="ss-breakdown-label">Your Provisional Income:</span>
                <span class="ss-breakdown-value">${fmt(
                  provisionalIncomeDetails.provisionalIncome
                )}</span>
            </div>
        </div>
        
        <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
            <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
            <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">Enable "Proper Social Security Taxation" in settings to see threshold-based taxation</span>
        </div>
      `;
    }
  } else {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Status:</span>
          <span class="ss-breakdown-value">No provisional income calculation available</span>
      </div>
      <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
          <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
          <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">Provisional income is only calculated when receiving Social Security benefits</span>
      </div>
    `;
  }

  content.innerHTML = breakdownHtml;

  // Clear any existing inline styles first
  popup.style.removeProperty("display");
  popup.style.removeProperty("z-index");

  // Mark this as a provisional income popup
  popup.dataset.provisionalIncome = "true";

  // Add the show class and then force display
  popup.classList.add("show");

  // Use a timeout to ensure the class is applied first, then force the display
  setTimeout(() => {
    popup.style.setProperty("display", "flex", "important");
    popup.style.setProperty("z-index", "999999", "important");
  }, 10);

  console.log("Popup should now be visible with forced display!");
}

// Function to show total taxes breakdown popup
function showTotalTaxesBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation) {
    return; // No data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Update popup title
  const title = popup.querySelector(".ss-popup-title");
  if (title) {
    title.textContent = "Total Taxes Breakdown";
  }

  // Update close button to use the general close function
  const closeBtn = popup.querySelector("button.ss-popup-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      closeSsPopup();
    };
  }

  // Build the breakdown content showing sources of taxes
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
  `;

  let totalTaxes = 0;

  // Social Security taxes
  if (calculation.ss.taxes && calculation.ss.taxes > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Social Security Taxes:</span>
          <span class="ss-breakdown-value">${fmt(calculation.ss.taxes)}</span>
      </div>
    `;
    totalTaxes += calculation.ss.taxes;
  }

  // Other taxes (income taxes on pre-tax withdrawals, pensions, etc.)
  if (calculation.taxes.otherTaxes && calculation.taxes.otherTaxes > 0) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Income Taxes:</span>
          <span class="ss-breakdown-value">${fmt(
            calculation.taxes.otherTaxes
          )}</span>
      </div>
    `;
    totalTaxes += calculation.taxes.otherTaxes;

    // Add breakdown of what income taxes include
    breakdownHtml += `<div style="margin-left: 20px;">`;

    if (calculation.taxes.penTaxes && calculation.taxes.penTaxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on pension income</span>
            <span class="ss-breakdown-value">${fmt(
              calculation.taxes.penTaxes
            )}</span>
        </div>
      `;
    }

    if (calculation.withdrawals.taxes && calculation.withdrawals.taxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on 401k withdrawals</span>
            <span class="ss-breakdown-value">${fmt(
              calculation.withdrawals.taxes
            )}</span>
        </div>
      `;
    }

    // Calculate other income taxes (like taxable interest)
    const otherIncomeTaxes =
      calculation.taxes.otherTaxes -
      (calculation.taxes.penTaxes || 0) -
      (calculation.withdrawals.taxes || 0);
    if (otherIncomeTaxes > 0) {
      breakdownHtml += `
        <div class="ss-breakdown-item" style="font-size: 12px; color: var(--muted);">
            <span class="ss-breakdown-label">• Taxes on taxable interest</span>
            <span class="ss-breakdown-value">${fmt(otherIncomeTaxes)}</span>
        </div>
      `;
    }

    breakdownHtml += `</div>`;
  }

  // Add total
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--border);">
        <span class="ss-breakdown-label"><strong>Total Taxes:</strong></span>
        <span class="ss-breakdown-value"><strong>${fmt(
          totalTaxes
        )}</strong></span>
    </div>
  `;

  // Add effective tax rate if available
  if (calculation.taxes.effectiveTaxRate) {
    breakdownHtml += `
      <div class="ss-breakdown-item">
          <span class="ss-breakdown-label">Effective Tax Rate:</span>
          <span class="ss-breakdown-value">${calculation.taxes.effectiveTaxRate.toFixed(
            1
          )}%</span>
      </div>
    `;
  }

  // Add explanatory note
  breakdownHtml += `
    <div class="ss-breakdown-item" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
        <span class="ss-breakdown-label" style="font-size: 12px; color: var(--muted);">Note:</span>
        <span class="ss-breakdown-value" style="font-size: 12px; color: var(--muted);">These are federal taxes only. State taxes not included.</span>
    </div>
  `;

  content.innerHTML = breakdownHtml;
  popup.classList.add("show");
}

// Close popup with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const ssPopup = document.getElementById("ssPopup");
    if (ssPopup && ssPopup.classList.contains("show")) {
      // Check if this is being used for Total Net (has the dataset markers)
      if (ssPopup.dataset.originalTitle) {
        closeTotalNetPopup();
      } else if (ssPopup.dataset.provisionalIncome) {
        closeProvisionalIncomePopup();
      } else {
        closeSsPopup();
      }
    }
  }
});

/**
 * Show Total Net Income breakdown popup
 */
function showTotalNetBreakdown(index) {
  if (!calculations || !calculations[index]) {
    console.error("No calculation data available for index:", index);
    return;
  }

  const calculation = calculations[index];

  // Use SS popup structure for Total Net breakdown
  const ssPopup = document.getElementById("ssPopup");
  if (ssPopup) {
    const ssContent = document.getElementById("ssBreakdownContent");
    if (ssContent) {
      // Update popup title - use the actual class names
      const popupHeader = ssPopup.querySelector("h3.ss-popup-title");
      if (popupHeader) {
        popupHeader.textContent = `Total Net Income Breakdown - Age ${calculation.age}`;
      }

      // Store original title to restore later
      if (!ssPopup.dataset.originalTitle) {
        ssPopup.dataset.originalTitle = "Social Security Breakdown";
      }

      // Add Export button to SS popup when used for Total Net breakdown
      let exportBtn = ssPopup.querySelector(".export-btn");
      if (!exportBtn) {
        exportBtn = document.createElement("button");
        exportBtn.className = "export-btn";
        exportBtn.textContent = "Export JSON";
        exportBtn.onclick = () => exportTotalNetToJson(index);

        const popupHeaderDiv = ssPopup.querySelector(".ss-popup-header");
        const closeBtn = ssPopup.querySelector(".ss-popup-close");
        if (popupHeaderDiv && closeBtn) {
          popupHeaderDiv.insertBefore(exportBtn, closeBtn);
        }
      } else {
        // Update the onclick for the existing button
        exportBtn.textContent = "Export JSON";
        exportBtn.onclick = () => exportTotalNetToJson(index);
      }

      // Store that we're in Total Net mode
      ssPopup.dataset.isTotalNetMode = "true";

      // Generate full breakdown content
      ssContent.innerHTML = generateTotalNetBreakdownContent(calculation);

      // Show popup using the same method as other popups
      ssPopup.classList.add("show");
      return;
    }
  }

  // Fallback: Create popup if SS popup doesn't exist
  let popup = document.getElementById("totalNetPopup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "totalNetPopup";
    popup.className = "popup-overlay";
    popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-header">
          <h3>Total Net Income Breakdown - Age ${calculation.age}</h3>
          <div class="popup-header-buttons">
            <button class="export-btn" onclick="exportTotalNetBreakdown(${index})">Export JSON</button>
            <button class="close-btn" onclick="closeTotalNetPopup()">&times;</button>
          </div>
        </div>
        <div class="popup-body" id="totalNetBreakdownContent">
        </div>
      </div>
    `;
    document.body.appendChild(popup);
  }

  // Update content
  const content = document.getElementById("totalNetBreakdownContent");
  content.innerHTML = generateTotalNetBreakdownContent(calculation);

  popup.style.display = "block";
}

/**
 * Generate the detailed breakdown content for Total Net Income
 */
function generateTotalNetBreakdownContent(data) {
  const fmt = (val) =>
    val == null || val === 0 ? "-" : `$${Math.round(val).toLocaleString()}`;

  let html = `
    <div class="breakdown-section">
      <h4>Gross Income Sources (Before Taxes)</h4>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Social Security (Gross)
  if (data.ssGross > 0) {
    html += `
      <tr>
        <td>Social Security</td>
        <td class="amount">${fmt(data.ssGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Spouse Social Security (Gross)
  if (data.spouseSsGross > 0) {
    html += `
      <tr>
        <td>Spouse Social Security</td>
        <td class="amount">${fmt(data.spouseSsGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Pension (Gross)
  if (data.penGross > 0) {
    html += `
      <tr>
        <td>Pension</td>
        <td class="amount">${fmt(data.penGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Spouse Pension (Gross)
  if (data.spousePenGross > 0) {
    html += `
      <tr>
        <td>Spouse Pension</td>
        <td class="amount">${fmt(data.spousePenGross)}</td>
        <td>Before federal taxation</td>
      </tr>
    `;
  }

  // Withdrawals (Gross)
  if (data.withdrawals.gross > 0) {
    html += `
      <tr>
        <td>Portfolio Withdrawals</td>
        <td class="amount">${fmt(data.withdrawals.gross)}</td>
        <td>Before taxes and penalties</td>
      </tr>
    `;
  }

  // Taxable Interest
  if (data.taxableInterest > 0) {
    html += `
      <tr>
        <td>Taxable Interest</td>
        <td class="amount">${fmt(data.taxableInterest)}</td>
        <td>Interest income</td>
      </tr>
    `;
  }

  // Calculate and add total for Gross Income Sources
  const grossIncomeTotal =
    (data.ssGross || 0) +
    (data.spouseSsGross || 0) +
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.withdrawals.gross || 0) +
    (data.taxableInterest || 0);

  html += `
          <tr class="total-row">
            <td><strong>Total Gross Income</strong></td>
            <td class="amount total"><strong>${fmt(
              grossIncomeTotal
            )}</strong></td>
            <td><strong>Before all taxes</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  html += `
    <div class="breakdown-section">
      <h4>Income Sources (Net After Taxes)</h4>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Amount</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Social Security (Net)
  if (data.ss > 0) {
    html += `
      <tr>
        <td>Social Security</td>
        <td class="amount">${fmt(data.ss)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Spouse Social Security (Net)
  if (data.spouseSs > 0) {
    html += `
      <tr>
        <td>Spouse Social Security</td>
        <td class="amount">${fmt(data.spouseSs)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Pension (Net)
  if (data.pen > 0) {
    html += `
      <tr>
        <td>Pension</td>
        <td class="amount">${fmt(data.pen)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Spouse Pension (Net)
  if (data.spousePen > 0) {
    html += `
      <tr>
        <td>Spouse Pension</td>
        <td class="amount">${fmt(data.spousePen)}</td>
        <td>After federal taxation</td>
      </tr>
    `;
  }

  // Withdrawals (Net)
  if (data.wNet > 0) {
    html += `
      <tr>
        <td>Portfolio Withdrawals</td>
        <td class="amount">${fmt(data.wNet)}</td>
        <td>After taxes and penalties</td>
      </tr>
    `;
  }

  // Tax-Free Income Adjustments (if any)
  const taxFreeAdjustment =
    data.totalNetIncome -
    (data.ss + data.spouseSs + data.pen + data.spousePen + data.wNet);
  if (taxFreeAdjustment > 0) {
    html += `
      <tr>
        <td>Tax-Free Income</td>
        <td class="amount">${fmt(taxFreeAdjustment)}</td>
        <td>Additional tax-free income</td>
      </tr>
    `;
  }

  // Calculate and add total for Net Income Sources
  const netIncomeTotal =
    (data.ss || 0) +
    (data.spouseSs || 0) +
    (data.pen || 0) +
    (data.spousePen || 0) +
    (data.wNet || 0) +
    (taxFreeAdjustment > 0 ? taxFreeAdjustment : 0);

  html += `
          <tr class="total-row">
            <td><strong>Total Net Income</strong></td>
            <td class="amount total"><strong>${fmt(
              netIncomeTotal
            )}</strong></td>
            <td><strong>After all taxes</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Show withdrawal breakdown if there were withdrawals
  if (data.wNet > 0) {
    html += `
      <div class="breakdown-section">
        <h4>Withdrawal Breakdown</h4>
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Account Type</th>
              <th>Gross Withdrawal</th>
              <th>Tax Treatment</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (data.withdrawals.savingsGross > 0) {
      html += `
        <tr>
          <td>Savings</td>
          <td class="amount">${fmt(data.withdrawals.savingsGross)}</td>
          <td>Tax-free (already taxed)</td>
        </tr>
      `;
    }

    if (data.withdrawals.rothGross > 0) {
      html += `
        <tr>
          <td>Roth IRA/401k</td>
          <td class="amount">${fmt(data.withdrawals.rothGross)}</td>
          <td>Tax-free qualified distribution</td>
        </tr>
      `;
    }

    if (data.withdrawals.retirementAccountGross > 0) {
      const taxes =
        data.withdrawals.retirementAccountGross -
        (data.wNet -
          (data.withdrawals.savingsGross || 0) -
          (data.withdrawals.rothGross || 0));
      html += `
        <tr>
          <td>Pre-Tax 401k/IRA</td>
          <td class="amount">${fmt(
            data.withdrawals.retirementAccountGross
          )}</td>
          <td>Taxable as ordinary income</td>
        </tr>
      `;
      if (taxes > 0) {
        html += `
          <tr>
            <td style="padding-left: 20px;">• Taxes on pre-tax withdrawal</td>
            <td class="amount negative">-${fmt(taxes)}</td>
            <td>Federal income tax</td>
          </tr>
        `;
      }
    }

    // Calculate and add total for Withdrawal Breakdown
    const taxes =
      data.withdrawals.retirementAccountGross > 0
        ? data.withdrawals.retirementAccountGross -
          (data.wNet -
            (data.withdrawals.savingsGross || 0) -
            (data.withdrawals.rothGross || 0))
        : 0;
    const withdrawalNetTotal =
      (data.withdrawals.savingsGross || 0) +
      (data.withdrawals.rothGross || 0) +
      (data.withdrawals.retirementAccountGross || 0) -
      (taxes > 0 ? taxes : 0);

    html += `
          <tr class="total-row">
            <td><strong>Total Net Withdrawals</strong></td>
            <td class="amount total"><strong>${fmt(
              withdrawalNetTotal
            )}</strong></td>
            <td><strong>After taxes</strong></td>
          </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // Summary section - only include taxable gross income sources
  const totalGrossIncome =
    (data.ssGross || 0) +
    (data.spouseSsGross || 0) +
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.withdrawals.retirementAccountGross || 0) + // Only pre-tax withdrawals, not savings/Roth
    (data.taxableInterest || 0);
  const totalTaxes = data.taxes12345 || 0;
  const totalNetIncome = data.totalNetIncome;

  // Calculate Total Taxable Income more accurately
  // Start with fully taxable income (pensions, pre-tax withdrawals, interest)
  const fullyTaxableIncome =
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.withdrawals.retirementAccountGross || 0) +
    (data.taxableInterest || 0);

  // For SS, the taxable portion is typically what was used to calculate ssTaxes
  // If we have ssTaxes, we can estimate the taxable SS amount
  const estimatedTaxableSS =
    (data.ssTaxes || 0) > 0
      ? // Estimate based on taxes paid vs estimated effective rate
        Math.min(
          (data.ssGross || 0) + (data.spouseSsGross || 0),
          ((data.ssGross || 0) + (data.spouseSsGross || 0)) * 0.85
        )
      : 0;

  const totalTaxableIncome = fullyTaxableIncome + estimatedTaxableSS;

  html += `
    <div class="breakdown-section summary-section">
      <h4>Summary</h4>
      <table class="breakdown-table">
        <tbody>
          <tr>
            <td><strong>Gross Revenue</strong></td>
            <td class="amount"><strong>${fmt(totalGrossIncome)}</strong></td>
            <td>Before taxes</td>
          </tr>
          <tr>
            <td><strong>Taxable Income</strong></td>
            <td class="amount"><strong>${fmt(totalTaxableIncome)}</strong></td>
            <td>Subject to federal tax</td>
          </tr>
          <tr>
            <td><strong>Taxes Paid</strong></td>
            <td class="amount negative"><strong>-${fmt(
              totalTaxes
            )}</strong></td>
            <td>Federal income tax</td>
          </tr>
          <tr class="total-row">
            <td><strong>Realized Revenue</strong></td>
            <td class="amount total"><strong>${fmt(
              totalNetIncome
            )}</strong></td>
            <td><strong>Available for spending</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Tax details section
  if (totalTaxes > 0) {
    html += `
      <div class="breakdown-section">
        <h4>Tax Details</h4>
        <table class="breakdown-table">
          <tbody>
    `;

    if (data.ssTaxes > 0) {
      html += `
        <tr>
          <td>Social Security Taxes</td>
          <td class="amount">${fmt(data.ssTaxes)}</td>
          <td>Federal tax on SS benefits</td>
        </tr>
      `;
    }

    if (data.otherTaxes12345 > 0) {
      html += `
        <tr>
          <td>Other Income Taxes</td>
          <td class="amount">${fmt(data.otherTaxes12345)}</td>
          <td>Tax on pensions, withdrawals, interest</td>
        </tr>
      `;
    }

    if (data.effectiveTaxRate) {
      html += `
        <tr>
          <td><strong>Effective Tax Rate</strong></td>
          <td class="amount"><strong>${data.effectiveTaxRate.toFixed(
            1
          )}%</strong></td>
          <td>Total taxes ÷ taxable income</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Add note about calculations
  html += `
    <div class="breakdown-section note">
      <p style="font-size: 0.65em;"><strong>Note:</strong> This breakdown shows how your Total Net Income is calculated from all sources after federal taxes. 
      Amounts may not add exactly due to rounding. Social Security taxation follows IRS provisional income rules.</p>
    </div>
  `;

  return html;
}

/**
 * Close Total Net breakdown popup
 */
function closeTotalNetPopup() {
  const ssPopup = document.getElementById("ssPopup");
  if (ssPopup) {
    // Restore original title
    const popupHeader = ssPopup.querySelector("h3.ss-popup-title");
    if (popupHeader && ssPopup.dataset.originalTitle) {
      popupHeader.textContent = ssPopup.dataset.originalTitle;
    }

    // Remove Export button if we added it for Total Net mode
    if (ssPopup.dataset.isTotalNetMode === "true") {
      const exportBtn = ssPopup.querySelector(".export-btn");
      if (exportBtn) {
        exportBtn.remove();
      }
    }

    // Clear the dataset markers
    delete ssPopup.dataset.originalTitle;
    delete ssPopup.dataset.isTotalNetMode;

    // Close the popup using the same method as other popups
    ssPopup.classList.remove("show");
  }
}

// Withdrawal Net Breakdown Popup Functions
function showWithdrawalNetBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (
    !calculation ||
    (!calculation.withdrawals.retirementAccountNet &&
      !calculation.withdrawals.savingsRothNet) ||
    !calculation.withdrawalBreakdown
  ) {
    return; // No withdrawal data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const withdrawalBreakdown = calculation.withdrawalBreakdown;

  if (calculation.age == 72) {
    debugger;
  }

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    `;

  // Show withdrawal breakdown
  breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Withdrawal Net Breakdown:</strong>
        <div style="margin-top: 8px;">`;

  // Show 401k withdrawals
  if (withdrawalBreakdown.pretax401kNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">401k Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.pretax401kNet
                )}</span>
            </div>`;
  }

  // Show savings withdrawals
  if (withdrawalBreakdown.savingsNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Savings Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.savingsNet
                )}</span>
            </div>`;
  }

  // Show Roth withdrawals
  if (withdrawalBreakdown.rothNet > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Roth Net:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.rothNet
                )}</span>
            </div>`;
  }

  breakdownHtml += `
        </div>
        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(110, 168, 254, 0.3);">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; font-weight: bold;">
                <span class="ss-breakdown-label">Total Net Withdrawals:</span>
                <span class="ss-breakdown-value">${fmt(
                  withdrawalBreakdown.totalNet
                )}</span>
            </div>
        </div>
    </div>`;

  // Set popup content
  content.innerHTML = breakdownHtml;

  // Set popup title
  const popupHeader = popup.querySelector("h3.ss-popup-title");
  if (popupHeader) {
    popupHeader.textContent = `Withdrawal Net Breakdown - Age ${calculation.age}`;
  }

  // Show popup
  popup.classList.add("show");
}

// Savings Breakdown Popup Functions
function showSavingsBreakdown(yearIndex) {
  const calculation = calculations[yearIndex];
  if (!calculation || calculation.balSavings === undefined) {
    return; // No savings data to show
  }

  const popup = document.getElementById("ssPopup");
  const content = document.getElementById("ssBreakdownContent");

  // Get the breakdown data from the calculation
  const savingsBreakdown = calculation.savingsBreakdown || {};

  // Build the breakdown content
  let breakdownHtml = `
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Year:</span>
        <span class="ss-breakdown-value">${calculation.year}</span>
    </div>
    <div class="ss-breakdown-item">
        <span class="ss-breakdown-label">Age:</span>
        <span class="ss-breakdown-value">${calculation.age}</span>
    </div>
    `;

  // Show starting balance
  if (savingsBreakdown.startingBalance !== undefined) {
    breakdownHtml += `
    <div style="margin: 16px 0; padding: 12px; background: rgba(110, 168, 254, 0.1); border-radius: 8px;">
        <strong style="color: var(--accent);">Savings Balance Changes:</strong>
        <div style="margin-top: 8px;">
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0;">
                <span class="ss-breakdown-label">Starting Balance:</span>
                <span class="ss-breakdown-value">${fmt(
                  savingsBreakdown.startingBalance
                )}</span>
            </div>`;
  }

  //debugger;
  // Show withdrawals (negative) - always show for debugging
  if (savingsBreakdown.withdrawals !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #ff6b6b;">
                <span class="ss-breakdown-label">Withdrawals:</span>
                <span class="ss-breakdown-value">-${fmt(
                  savingsBreakdown.withdrawals
                )}</span>
            </div>`;
  }

  // Show overage deposits (positive)
  if (savingsBreakdown.overageDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">RMD Overage Deposit:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.overageDeposit
                )}</span>
            </div>`;
  }

  // Show regular deposits (positive) - for working years
  if (savingsBreakdown.regularDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">Regular Savings:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.regularDeposit
                )}</span>
            </div>`;
  }

  // Show tax-free income deposits (positive)
  if (savingsBreakdown.taxFreeIncomeDeposit > 0) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #51cf66;">
                <span class="ss-breakdown-label">Tax-Free Income:</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.taxFreeIncomeDeposit
                )}</span>
            </div>`;
  }

  // Show interest earned - always show for debugging
  if (savingsBreakdown.interestEarned !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border: none; padding: 4px 0; color: #339af0;">
                <span class="ss-breakdown-label">Interest Earned (${savingsBreakdown.growthRate.toFixed(
                  1
                )}%):</span>
                <span class="ss-breakdown-value">+${fmt(
                  savingsBreakdown.interestEarned
                )}</span>
            </div>`;
  }

  // Show ending balance
  if (savingsBreakdown.endingBalance !== undefined) {
    breakdownHtml += `
            <div class="ss-breakdown-item" style="border-top: 2px solid var(--accent); margin-top: 8px; padding-top: 8px; font-weight: bold;">
                <span class="ss-breakdown-label">Ending Balance:</span>
                <span class="ss-breakdown-value">${fmt(
                  savingsBreakdown.endingBalance
                )}</span>
            </div>
        </div>
    </div>`;
  }

  content.innerHTML = breakdownHtml;

  // Update popup title
  const title = popup.querySelector(".ss-popup-header h3");
  if (title) {
    title.textContent = `Savings Balance Changes - Year ${calculation.year}`;
  }

  // Show the popup using the same method as other breakdowns
  popup.classList.add("show");
}

// Close popups when clicking outside
document.addEventListener("click", function (event) {
  const ssPopup = document.getElementById("ssPopup");

  // Only handle clicks if popup is currently visible
  if (ssPopup && ssPopup.classList.contains("show")) {
    // Check if the click was outside the popup content
    const popupContent = ssPopup.querySelector(".ss-popup-content");

    // Don't close if clicking on popup trigger links
    const isPopupTrigger = event.target.closest(
      ".ss-link, .withdrawal-net-link, .savings-balance-link, .taxable-income-link, .non-taxable-income-link, .total-taxes-link, .provisional-income-link"
    );

    if (
      popupContent &&
      !popupContent.contains(event.target) &&
      !isPopupTrigger
    ) {
      // Check if this is being used for Total Net (has the dataset markers)
      if (ssPopup.dataset.originalTitle) {
        closeTotalNetPopup();
      } else if (ssPopup.dataset.provisionalIncome) {
        closeProvisionalIncomePopup();
      } else {
        closeSsPopup();
      }
    }
  }
});
/**
 * Export Total Net Income Breakdown to CSV
 */
function exportTotalNetToJson(index) {
  if (!calculations || !calculations[index]) {
    console.error("No calculation data available for index:", index);
    return;
  }

  const calculation = calculations[index];

  // Helper function to format values for CSV (removes formatting, handles nulls)
  const csvFmt = (val) => {
    if (val == null || val === 0) return 0;
    return Math.round(val);
  };

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add header with age and year
  csvContent += `Total Net Income Breakdown - Age ${calculation.age} (Year ${calculation.year})\n\n`;

  // Gross Income Sources section
  csvContent += "Gross Income Sources (Before Taxes)\n";
  csvContent += "Source,Amount,Notes\n";

  if (calculation.ss.mySsGross > 0) {
    csvContent += `Social Security,${csvFmt(
      calculation.ss.mySsGross
    )},Before federal taxation\n`;
  }
  if (calculation.ss.spouseSsGross > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      calculation.ss.spouseSsGross
    )},Before federal taxation\n`;
  }
  if (calculation.pen.myPenGross > 0) {
    csvContent += `Pension,${csvFmt(
      calculation.pen.myPenGross
    )},Before federal taxation\n`;
  }
  if (calculation.pen.spousePenGross > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      calculation.pen.spousePenGross
    )},Before federal taxation\n`;
  }
  if (calculation.withdrawals.gross > 0) {
    csvContent += `Portfolio Withdrawals,${csvFmt(
      calculation.withdrawals.gross
    )},Before taxes and penalties\n`;
  }
  if (calculation.taxes.taxableInterest > 0) {
    csvContent += `Taxable Interest,${csvFmt(
      calculation.taxes.taxableInterest
    )},Interest income\n`;
  }

  // Calculate total gross income
  const grossIncomeTotal =
    (calculation.ss.mySsGross || 0) +
    (calculation.ss.spouseSsGross || 0) +
    (calculation.pen.myPenGross || 0) +
    (calculation.pen.spousePenGross || 0) +
    (calculation.withdrawals.gross || 0) +
    (calculation.taxes.taxableInterest || 0);

  csvContent += `Total Gross Income,${csvFmt(
    grossIncomeTotal
  )},Before all taxes\n\n`;

  // Income Sources (Net After Taxes) section
  csvContent += "Income Sources (Net After Taxes)\n";
  csvContent += "Source,Amount,Notes\n";

  if (calculation.ss.mySs > 0) {
    csvContent += `Social Security,${csvFmt(
      calculation.ss.mySs
    )},After federal taxation\n`;
  }
  if (calculation.ss.spouseSs > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      calculation.ss.spouseSs
    )},After federal taxation\n`;
  }
  if (calculation.pen.myPen > 0) {
    csvContent += `Pension,${csvFmt(
      calculation.pen.myPen
    )},After federal taxation\n`;
  }
  if (calculation.pen.spousePen > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      calculation.pen.spousePen
    )},After federal taxation\n`;
  }
  if (calculation.wNet > 0) {
    csvContent += `Portfolio Withdrawals,${csvFmt(
      calculation.wNet
    )},After taxes and penalties\n`;
  }
  if (calculation.taxes.nonTaxableIncome > 0) {
    csvContent += `Non-Taxable Income,${csvFmt(
      calculation.taxes.nonTaxableIncome
    )},Tax-free income sources\n`;
  }

  csvContent += `Total Net Income,${csvFmt(
    calculation.total.totalNetIncome
  )},After all taxes\n\n`;

  // Withdrawal Breakdown section (if applicable)
  if (calculation.withdrawalBreakdown && calculation.wNet > 0) {
    csvContent += "Withdrawal Breakdown\n";
    csvContent += "Account Type,Gross Amount,Net Amount,Notes\n";

    if (calculation.withdrawalBreakdown.pretax401kGross > 0) {
      csvContent += `401k/403b/TSP,${csvFmt(
        calculation.withdrawalBreakdown.pretax401kGross
      )},${csvFmt(
        calculation.withdrawalBreakdown.pretax401kNet
      )},Taxable withdrawal\n`;
    }
    if (calculation.withdrawals.savingsGross > 0) {
      csvContent += `Taxable Savings,${csvFmt(
        calculation.withdrawals.savingsGross
      )},${csvFmt(calculation.withdrawals.savingsGross)},Tax-free principal\n`;
    }
    if (calculation.withdrawals.rothGross > 0) {
      csvContent += `Roth IRA,${csvFmt(
        calculation.withdrawals.rothGross
      )},${csvFmt(calculation.withdrawals.rothGross)},Tax-free withdrawal\n`;
    }

    csvContent += `Total Withdrawals,${csvFmt(
      calculation.withdrawals.gross
    )},${csvFmt(calculation.wNet)},Combined portfolio withdrawals\n\n`;
  }

  // Tax Summary
  csvContent += "Tax Summary\n";
  csvContent += "Item,Amount,Notes\n";
  csvContent += `Total Federal Taxes,${csvFmt(
    calculation.taxes.total
  )},All federal taxes owed\n`;
  csvContent += `Taxable Income,${csvFmt(
    calculation.taxes.taxableIncome
  )},Income subject to federal tax\n`;

  // Create and trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `retirement_breakdown_age_${calculation.age}_year_${calculation.year}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/**
 * Export Total Net Income Breakdown to JSON
 */
function exportTotalNetToJson(index) {
  if (!calculations || !calculations[index]) {
    console.error("No calculation data available for index:", index);
    return;
  }

  const calculation = calculations[index];

  // Helper function to format values (removes null/undefined, keeps numbers)
  const jsonFmt = (val) => {
    if (val == null || val === 0) return 0;
    return Math.round(val);
  };

  // Create JSON structure
  const exportData = {
    metadata: {
      title: "Total Net Income Breakdown",
      age: calculation.age,
      year: calculation.year,
      exportDate: new Date().toISOString(),
      calculator: "Retirement Calculator v1.0",
    },

    grossIncomeSourcesBeforeTaxes: {
      socialSecurity:
        calculation.ss.mySsGross > 0
          ? {
              amount: jsonFmt(calculation.ss.mySsGross),
              notes: "Before federal taxation",
            }
          : null,

      spouseSocialSecurity:
        calculation.ss.spouseSsGross > 0
          ? {
              amount: jsonFmt(calculation.ss.spouseSsGross),
              notes: "Before federal taxation",
            }
          : null,

      pension:
        calculation.pen.myPenGross > 0
          ? {
              amount: jsonFmt(calculation.pen.myPenGross),
              notes: "Before federal taxation",
            }
          : null,

      spousePension:
        calculation.pen.spousePenGross > 0
          ? {
              amount: jsonFmt(calculation.pen.spousePenGross),
              notes: "Before federal taxation",
            }
          : null,

      taxablePortfolioWithdrawals:
        calculation.withdrawals.gross > 0
          ? {
              amount: jsonFmt(calculation.withdrawals.gross),
              notes: "Before taxes and penalties",
            }
          : null,

      taxableInterest:
        calculation.taxes.taxableInterest > 0
          ? {
              amount: jsonFmt(calculation.taxes.taxableInterest),
              notes: "Interest income",
            }
          : null,

      total: {
        amount: jsonFmt(
          (calculation.ss.mySsGross || 0) +
            (calculation.ss.spouseSsGross || 0) +
            (calculation.pen.myPenGross || 0) +
            (calculation.pen.spousePenGross || 0) +
            (calculation.withdrawals.gross || 0) +
            (calculation.taxes.taxableInterest || 0)
        ),
        notes: "Gross income before adjustments",
      },
    },

    incomeSourcesNetAfterTaxes: {
      socialSecurity:
        calculation.ss.mySs > 0
          ? {
              amount: jsonFmt(calculation.ss.mySs),
              notes: "After federal taxation",
            }
          : null,

      spouseSocialSecurity:
        calculation.ss.spouseSs > 0
          ? {
              amount: jsonFmt(calculation.ss.spouseSs),
              notes: "After federal taxation",
            }
          : null,

      pension:
        calculation.pen.myPen > 0
          ? {
              amount: jsonFmt(calculation.pen.myPen),
              notes: "After federal taxation",
            }
          : null,

      spousePension:
        calculation.pen.spousePen > 0
          ? {
              amount: jsonFmt(calculation.pen.spousePen),
              notes: "After federal taxation",
            }
          : null,

      taxablePortfolioWithdrawals:
        calculation.wNet > 0
          ? {
              amount: jsonFmt(calculation.wNet),
              notes: "After taxes and penalties",
            }
          : null,

      // nonTaxableIncome:
      //   data.nonTaxableIncome > 0
      //     ? {
      //         amount: jsonFmt(data.nonTaxableIncome),
      //         notes: "Tax-free income sources",
      //       }
      //     : null,

      total: {
        amount: jsonFmt(calculation.total.totalNetIncome),
        notes: "After all taxes",
      },
    },

    withdrawalBreakdown: null,

    taxSummary: {
      totalFederalTaxes: {
        amount: jsonFmt(calculation.taxes.total),
        notes: "All federal taxes owed",
      },
      taxableIncome: {
        amount: jsonFmt(calculation.taxes.taxableIncome),
        notes: "Income subject to federal tax",
      },
      effectiveTaxRate: calculation.taxes.effectiveTaxRate
        ? {
            percentage: parseFloat(
              calculation.taxes.effectiveTaxRate.toFixed(1)
            ),
            notes: "Total taxes divided by taxable income",
          }
        : null,
    },

    detailedBreakdowns: {
      socialSecurityBreakdown:
        calculation.ssBreakdown && calculation.ssBreakdown.mySsGross > 0
          ? {
              grossAmount: jsonFmt(calculation.ssBreakdown.mySsGross),
              taxableAmount: jsonFmt(calculation.ssBreakdown.mySsTaxableAmount),
              nonTaxableAmount: jsonFmt(calculation.ssBreakdown.mySsNonTaxable),
              taxesPaid: jsonFmt(calculation.ssBreakdown.mySsTaxes),
              netAmount: jsonFmt(calculation.ss.mySs),
              notes: "Primary Social Security benefits",
            }
          : null,

      spouseSocialSecurityBreakdown:
        calculation.spouseSsBreakdown &&
        calculation.spouseSsBreakdown.ssGross > 0
          ? {
              grossAmount: jsonFmt(calculation.spouseSsBreakdown.ssGross),
              taxableAmount: jsonFmt(
                calculation.spouseSsBreakdown.ssTaxableAmount
              ),
              nonTaxableAmount: jsonFmt(
                calculation.spouseSsBreakdown.ssNonTaxable
              ),
              taxesPaid: jsonFmt(calculation.spouseSsBreakdown.ssTaxes),
              netAmount: jsonFmt(calculation.ss.spouseSs),
              notes: "Spouse Social Security benefits",
            }
          : null,

      pensionBreakdown:
        calculation.pensionBreakdown &&
        calculation.pensionBreakdown.penGross > 0
          ? {
              grossAmount: jsonFmt(calculation.pensionBreakdown.penGross),
              taxableAmount: jsonFmt(
                calculation.pensionBreakdown.penTaxableAmount
              ),
              nonTaxableAmount: jsonFmt(
                calculation.pensionBreakdown.penNonTaxable
              ),
              taxesPaid: jsonFmt(calculation.pensionBreakdown.penTaxes),
              netAmount: jsonFmt(calculation.pen),
              taxRate: parseFloat(
                (calculation.pensionBreakdown.pensionTaxRate * 100).toFixed(1)
              ),
              notes: "Primary pension income",
            }
          : null,

      spousePensionBreakdown:
        calculation.spousePensionBreakdown &&
        calculation.spousePensionBreakdown.penGross > 0
          ? {
              grossAmount: jsonFmt(calculation.spousePensionBreakdown.penGross),
              taxableAmount: jsonFmt(
                calculation.spousePensionBreakdown.penTaxableAmount
              ),
              nonTaxableAmount: jsonFmt(
                calculation.spousePensionBreakdown.penNonTaxable
              ),
              taxesPaid: jsonFmt(calculation.spousePensionBreakdown.penTaxes),
              netAmount: jsonFmt(calculation.pen.spousePen),
              taxRate: parseFloat(
                (
                  calculation.spousePensionBreakdown.pensionTaxRate * 100
                ).toFixed(1)
              ),
              notes: "Spouse pension income",
            }
          : null,
    },
  };

  // Add withdrawal breakdown if applicable
  if (
    calculation.withdrawalBreakdown &&
    calculation.withdrawalBreakdown.totalNet > 0
  ) {
    exportData.withdrawalBreakdown = {
      taxablePortfolioWithdrawals:
        calculation.withdrawalBreakdown.pretax401kGross > 0
          ? {
              grossAmount: jsonFmt(
                calculation.withdrawalBreakdown.pretax401kGross
              ),
              netAmount: jsonFmt(calculation.withdrawalBreakdown.pretax401kNet),
              notes: "Taxable withdrawal",
            }
          : null,

      savings:
        calculation.withdrawalBreakdown.savingsNet > 0
          ? {
              amount: jsonFmt(calculation.withdrawalBreakdown.savingsNet),
              notes: "Tax-free savings",
            }
          : null,

      rothIRA:
        calculation.withdrawalBreakdown.rothGross > 0
          ? {
              gross: jsonFmt(calculation.withdrawalBreakdown.rothGross),
              net: jsonFmt(calculation.withdrawalBreakdown.rothNet),
              notes: "Tax-free withdrawal",
            }
          : null,

      total: {
        grossAmount: jsonFmt(calculation.withdrawalBreakdown.totalGross),
        netAmount: jsonFmt(calculation.withdrawalBreakdown.totalNet),
        notes: "Combined portfolio withdrawals",
      },
    };
  }

  // Remove null values for cleaner JSON
  const cleanData = JSON.parse(
    JSON.stringify(exportData, (key, value) => {
      if (value === null) return undefined;
      return value;
    })
  );

  // Create and trigger download
  const jsonString = JSON.stringify(cleanData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `retirement_breakdown_age_${calculation.age}_year_${calculation.year}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}
