export function exportCSV() {
  throw new Error("CSV export is currently disabled.");
  // const rows = win.__rows || [];
  // if (!calculations.length) {
  //   showToast(
  //     "No Data",
  //     "Run a calculation first to generate data for export.",
  //     "warning"
  //   );
  //   return;
  // }
  // const headers = [
  //   "Year",
  //   "Age",
  //   "Salary",
  //   "Annual_Spend",
  //   "SS_Net",
  //   "Pension_Net",
  //   "Spouse_SS_Net",
  //   "Spouse_Pension_Net",
  //   "401k_Net_Withdrawal",
  //   "Savings_Roth_Net_Withdrawal",
  //   "Total_Net_Withdrawal",
  //   "SS_Gross",
  //   "Pension_Gross",
  //   "Spouse_SS_Gross",
  //   "Spouse_Pension_Gross",
  //   "401k_Gross_Withdrawal",
  //   "Savings_Gross_Withdrawal",
  //   "Roth_Gross_Withdrawal",
  //   "Total_Gross_Income",
  //   "Taxable_Income_After_Deduction",
  //   "Non_Taxable_Income",
  //   "Provisional_Income",
  //   "Taxable_Interest",
  //   "SS_Taxes",
  //   "Other_Taxes",
  //   "Total_Taxes",
  //   "Standard_Deduction",
  //   "Effective_Tax_Rate",
  //   "Savings_Balance",
  //   "401k_Balance",
  //   "Roth_Balance",
  //   "Total_Balance",
  // ];
  // const csv = [headers.join(",")]
  //   .concat(
  //     calculations.map((r) =>
  //       [
  //         r.year,
  //         r.age,
  //         r.salary || 0,
  //         r.spend,
  //         r.ss,
  //         r.pen,
  //         r.partnerSs || 0,
  //         r.partnerPen || 0,
  //         r.withdrawals.retirementAccountNet || 0,
  //         r.withdrawals.savingsRothNet || 0,
  //         r.wNet || 0,
  //         r.ssGross || 0,
  //         r.penGross || 0,
  //         r.partnerSsGross || 0,
  //         r.partnerPenGross || 0,
  //         r.withdrawals.retirementAccountGross || 0,
  //         r.withdrawals.savingsGross || 0,
  //         r.withdrawals.rothGross || 0,
  //         r.totalGrossIncome || 0,
  //         r.taxableIncome || 0,
  //         r.nonTaxableIncome || 0,
  //         r.provisionalIncome || 0,
  //         r.taxableInterest || 0,
  //         r.ssTaxes || 0,
  //         r.otherTaxes || 0,
  //         r.taxes,
  //         r.standardDeduction || 0,
  //         r.effectiveTaxRate || 0,
  //         r.balSavings,
  //         r.balPre,
  //         r.balRoth,
  //         r.total,
  //       ]
  //         .map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))
  //         .join(",")
  //     )
  //   )
  //   .join("\n");
  // const blob = new Blob([csv], { type: "text/csv" });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement("a");
  // a.href = url;
  // a.download = "retirement_results.csv";
  // document.body.appendChild(a);
  // a.click();
  // a.remove();
  // URL.revokeObjectURL(url);
}

export function exportJSON() {
  throw new Error("JSON export is currently disabled.");
  // const inputs = {};
  // // Collect all input values including spending overrides
  // document.querySelectorAll("input, select").forEach((input) => {
  //   if (input.id && input.id !== "jsonFileInput") {
  //     inputs[input.id] = input.value;
  //   }
  // });

  // const exportData = {
  //   version: "1.1",
  //   exportDate: new Date().toISOString(),
  //   description: "Retirement Calculator Scenario with Spending Overrides",
  //   inputs: inputs,
  // };

  // const json = JSON.stringify(exportData, null, 2);
  // const blob = new Blob([json], { type: "application/json" });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement("a");
  // a.href = url;
  // a.download = `retirement_scenario_${
  //   new Date().toISOString().split("T")[0]
  // }.json`;
  // document.body.appendChild(a);
  // a.click();
  // a.remove();
  // URL.revokeObjectURL(url);
}

export function importJSON() {
  throw new Error("JSON import is currently disabled.");
  // const fileInput = $("jsonFileInput");
  // fileInput.click();
}

export function handleJSONFile() {
  throw new Error("JSON import is currently disabled.");
  // const file = event.target.files[0];
  // if (!file) return;

  // if (!file.name.toLowerCase().endsWith(".json")) {
  //   showToast("Invalid File", "Please select a JSON file.", "error");
  //   return;
  // }

  // const reader = new FileReader();
  // reader.onload = function (e) {
  //   try {
  //     const fileData = JSON.parse(e.target.result);

  //     // Validate the JSON structure
  //     if (!fileData.inputs || typeof fileData.inputs !== "object") {
  //       showToast(
  //         "Invalid Format",
  //         "Invalid JSON file format. Expected retirement calculator scenario data.",
  //         "error"
  //       );
  //       return;
  //     }

  //     let loadedCount = 0;
  //     let totalCount = 0;

  //     // Load all input values
  //     Object.entries(fileData.inputs).forEach(([id, value]) => {
  //       totalCount++;
  //       const element = document.getElementById(id);
  //       if (element) {
  //         element.value = value;
  //         loadedCount++;
  //       } else if (id.startsWith("spending_")) {
  //         // Handle spending override fields that may not exist yet
  //         totalCount--; // Don't count these in the totals since they're dynamic
  //       }
  //     });

  //     // If there are spending override fields in the import, regenerate the fields first
  //     const hasSpendingOverrides = Object.keys(fileData.inputs).some((id) =>
  //       id.startsWith("spending_")
  //     );
  //     if (hasSpendingOverrides) {
  //       regenerateSpendingFields();
  //       // Now load the spending override values
  //       Object.entries(fileData.inputs).forEach(([id, value]) => {
  //         if (id.startsWith("spending_")) {
  //           const element = document.getElementById(id);
  //           if (element) {
  //             element.value = value;
  //             loadedCount++;
  //           }
  //         }
  //       });
  //     }

  //     // If there are income adjustment fields in the import, regenerate the fields first
  //     const hasTaxableIncomeOverrides = Object.keys(fileData.inputs).some(
  //       (id) => id.startsWith("taxableIncome_")
  //     );
  //     const hasTaxFreeIncomeOverrides = Object.keys(fileData.inputs).some(
  //       (id) => id.startsWith("taxFreeIncome_")
  //     );
  //     if (hasTaxableIncomeOverrides || hasTaxFreeIncomeOverrides) {
  //       regenerateTaxableIncomeFields();
  //       regenerateTaxFreeIncomeFields();
  //       // Now load the income adjustment values
  //       Object.entries(fileData.inputs).forEach(([id, value]) => {
  //         if (
  //           id.startsWith("taxableIncome_") ||
  //           id.startsWith("taxFreeIncome_")
  //         ) {
  //           const element = document.getElementById(id);
  //           if (element) {
  //             element.value = value;
  //             loadedCount++;
  //           }
  //         }
  //       });
  // }

  //   // Show import summary
  //   let summary = `Loaded ${loadedCount} of ${totalCount} settings.`;
  //   if (fileData.description) {
  //     summary += `\nDescription: ${fileData.description}`;
  //   }
  //   if (fileData.exportDate) {
  //     summary += `\nExported: ${new Date(
  //       fileData.exportDate
  //     ).toLocaleDateString()}`;
  //   }

  //   showToast("Import Successful", summary, "success", 7000);
  //   calc(); // Automatically recalculate
  // } catch (error) {
  //   showToast(
  //     "Import Error",
  //     "Error reading JSON file: " + error.message,
  //     "error"
  //   );
  // }
  // };

  // reader.readAsText(file);
  // // Clear the file input so the same file can be selected again
  // event.target.value = "";
}

export function generatePDFReport() {
  throw new Error("PDF report generation is currently disabled.");
  // if (!calculations || calculations.length === 0) {
  //   showToast(
  //     "No Data",
  //     "Please run the calculation first before generating a PDF report.",
  //     "error"
  //   );
  //   return;
  // }

  // try {
  //   const { jsPDF } = window.jspdf;
  //   const doc = new jsPDF();
  //   const inputs = parseInputParameters();

  //   // Color scheme
  //   const colors = {
  //     primary: [43, 99, 255], // Blue
  //     secondary: [110, 168, 254], // Light blue
  //     success: [69, 212, 131], // Green
  //     warning: [255, 191, 105], // Orange
  //     danger: [255, 107, 107], // Red
  //     dark: [11, 18, 32], // Dark blue
  //     muted: [124, 141, 181], // Muted blue
  //     light: [230, 238, 252], // Very light blue
  //   };

  //   // Helper functions for styling
  //   /**
  //    * @param {number} x
  //    * @param {number} y
  //    * @param {number} width
  //    * @param {number} height
  //    * @param {any[]} color
  //    */
  //   function addColoredRect(x, y, width, height, color, alpha = 0.1) {
  //     // Calculate lighter color instead of using alpha
  //     const lightenedColor = color.map((/** @type {number} */ c) =>
  //       Math.min(255, c + (255 - c) * (1 - alpha))
  //     );
  //     doc.setFillColor(lightenedColor[0], lightenedColor[1], lightenedColor[2]);
  //     doc.rect(x, y, width, height, "F");
  //   }

  //   // Page break management
  //   /**
  //    * @param {any} currentY
  //    * @param {number} requiredSpace
  //    */
  //   function checkAndAddPageBreak(currentY, requiredSpace) {
  //     const pageHeight = 297; // A4 page height in mm
  //     const bottomMargin = 20; // Space to leave at bottom

  //     if (currentY + requiredSpace > pageHeight - bottomMargin) {
  //       doc.addPage();
  //       return 20; // Start new page at top margin
  //     }
  //     return currentY;
  //   }

  //   /**
  //    * @param {string} title
  //    * @param {number} yPos
  //    */
  //   function addSectionHeader(
  //     title,
  //     yPos,
  //     color = colors.primary,
  //     estimatedSectionHeight = 50
  //   ) {
  //     // Check if we need a page break before starting this section
  //     yPos = checkAndAddPageBreak(yPos, estimatedSectionHeight);

  //     // Background rectangle
  //     addColoredRect(15, yPos - 8, 180, 12, color, 0.1);

  //     // Header text
  //     doc.setFontSize(14);
  //     doc.setFont(undefined, "bold");
  //     doc.setTextColor(color[0], color[1], color[2]);
  //     doc.text(title, 20, yPos);

  //     // Reset color
  //     doc.setTextColor(0, 0, 0);
  //     return yPos + 15;
  //   }

  //   /**
  //    * @param {string} key
  //    * @param {string} value
  //    * @param {number} yPos
  //    */
  //   function addKeyValuePair(key, value, yPos, indent = 0, valueColor = null) {
  //     doc.setFontSize(10);
  //     doc.setFont(undefined, "normal");
  //     doc.setTextColor(60, 60, 60);
  //     doc.text(key, 20 + indent, yPos);

  //     if (valueColor) {
  //       doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
  //       doc.setFont(undefined, "bold");
  //     }

  //     doc.text(value, 120, yPos);
  //     doc.setTextColor(0, 0, 0);
  //     doc.setFont(undefined, "normal");

  //     return yPos + 7;
  //   }

  //   // PAGE 1: Executive Summary
  //   // Header with gradient-like effect
  //   addColoredRect(0, 0, 210, 40, colors.primary, 0.05);
  //   addColoredRect(0, 0, 210, 25, colors.primary, 0.1);

  //   doc.setFontSize(24);
  //   doc.setFont(undefined, "bold");
  //   doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  //   doc.text("Retirement Planning Report", 20, 20);

  //   doc.setFontSize(11);
  //   doc.setFont(undefined, "normal");
  //   doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  //   doc.text(
  //     `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
  //     20,
  //     32
  //   );

  //   doc.setTextColor(0, 0, 0);

  //   let yPos = 55;

  //   // Executive Summary with status indicator
  //   yPos = addSectionHeader("Executive Summary", yPos);

  //   const calculation = calculations[calculations.length - 1];
  //   const fundedTo =
  //     calculation.total > 0
  //       ? inputs.endAge
  //       : calculations.reduce(
  //           (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
  //           inputs.initialAge
  //         );
  //   const isFullyFunded = fundedTo >= inputs.endAge;

  //   // Status box - smaller and with custom drawn symbols
  //   const statusColor = isFullyFunded ? colors.success : colors.danger;
  //   const statusText = isFullyFunded ? "Fully Funded" : "Funding Shortfall";

  //   // Smaller status box
  //   addColoredRect(15, yPos - 3, 180, 15, statusColor, 0.1);

  //   // Draw custom status symbol
  //   const symbolX = 22;
  //   const symbolY = yPos + 4.5; // Vertically center the symbol
  //   const radius = 3;

  //   if (isFullyFunded) {
  //     // Draw green circle with checkmark
  //     doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
  //     doc.circle(symbolX, symbolY, radius, "F");

  //     // Draw checkmark inside circle
  //     doc.setDrawColor(255, 255, 255);
  //     doc.setLineWidth(0.8);
  //     doc.line(symbolX - 1.5, symbolY, symbolX - 0.5, symbolY + 1);
  //     doc.line(symbolX - 0.5, symbolY + 1, symbolX + 1.5, symbolY - 1);
  //   } else {
  //     // Draw red circle with X
  //     doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2]);
  //     doc.circle(symbolX, symbolY, radius, "F");

  //     // Draw X inside circle
  //     doc.setDrawColor(255, 255, 255);
  //     doc.setLineWidth(0.8);
  //     doc.line(symbolX - 1.5, symbolY - 1.5, symbolX + 1.5, symbolY + 1.5);
  //     doc.line(symbolX - 1.5, symbolY + 1.5, symbolX + 1.5, symbolY - 1.5);
  //   }

  //   doc.setFontSize(12);
  //   doc.setFont(undefined, "bold");
  //   doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  //   doc.text(`Status: ${statusText}`, 30, yPos + 5.5); // Perfect vertical centering

  //   if (!isFullyFunded) {
  //     doc.setFontSize(10);
  //     doc.setFont(undefined, "normal");
  //     doc.text(
  //       `Your retirement funds will last until age ${fundedTo}`,
  //       20,
  //       yPos + 12
  //     );
  //     yPos += 25; // Extra space for the warning text + more spacing
  //   } else {
  //     yPos += 20; // More space when fully funded
  //   }

  //   doc.setTextColor(0, 0, 0);

  //   // Key metrics in a nice layout
  //   yPos = addKeyValuePair("Current Age:", `${inputs.initialAge} years`, yPos);
  //   yPos = addKeyValuePair(
  //     "Planned Retirement Age:",
  //     `${inputs.retireAge} years`,
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Plan Duration:",
  //     `${inputs.endAge - inputs.initialAge} years total`,
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Years to Retirement:",
  //     `${inputs.retireAge - inputs.initialAge} years`,
  //     yPos
  //   );
  //   yPos += 5;

  //   yPos = addKeyValuePair(
  //     "Current Total Assets:",
  //     fmt(
  //       inputs.trad401kStartingBalance +
  //         inputs.tradRothStartingBalance +
  //         inputs.savingsStartingBalance
  //     ),
  //     yPos,
  //     0,
  //     colors.primary
  //   );
  //   yPos = addKeyValuePair(
  //     "Projected Final Balance:",
  //     fmt(Math.max(0, calculation.total)),
  //     yPos,
  //     0,
  //     isFullyFunded ? colors.success : colors.danger
  //   );
  //   yPos += 10;

  //   // Asset allocation with visual representation
  //   yPos = addSectionHeader(
  //     "Current Asset Allocation",
  //     yPos,
  //     colors.secondary,
  //     80
  //   );

  //   const totalAssets =
  //     inputs.trad401kStartingBalance +
  //     inputs.tradRothStartingBalance +
  //     inputs.savingsStartingBalance;
  //   const pretaxPct = (
  //     (inputs.trad401kStartingBalance / totalAssets) *
  //     100
  //   ).toFixed(1);
  //   const rothPct = (
  //     (inputs.tradRothStartingBalance / totalAssets) *
  //     100
  //   ).toFixed(1);
  //   const savingsPct = (
  //     (inputs.savingsStartingBalance / totalAssets) *
  //     100
  //   ).toFixed(1);

  //   yPos = addKeyValuePair(
  //     "Pre-tax (401k/IRA):",
  //     `${fmt(inputs.trad401kStartingBalance)} (${pretaxPct}%)`,
  //     yPos,
  //     0,
  //     colors.primary
  //   );
  //   yPos = addKeyValuePair(
  //     "Roth IRA/401k:",
  //     `${fmt(inputs.tradRothStartingBalance)} (${rothPct}%)`,
  //     yPos,
  //     0,
  //     colors.success
  //   );
  //   yPos = addKeyValuePair(
  //     "Taxable Savings:",
  //     `${fmt(inputs.savingsStartingBalance)} (${savingsPct}%)`,
  //     yPos,
  //     0,
  //     colors.warning
  //   );

  //   // Visual asset allocation bars
  //   const barWidth = 150;
  //   const barHeight = 8;
  //   const barStartX = 25;
  //   yPos += 10;

  //   // Pre-tax bar
  //   const pretaxBarWidth =
  //     barWidth * (inputs.trad401kStartingBalance / totalAssets);
  //   doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  //   doc.rect(barStartX, yPos, pretaxBarWidth, barHeight, "F");

  //   // Roth bar
  //   const rothBarWidth =
  //     barWidth * (inputs.tradRothStartingBalance / totalAssets);
  //   doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
  //   doc.rect(barStartX + pretaxBarWidth, yPos, rothBarWidth, barHeight, "F");

  //   // Savings bar
  //   const savingsBarWidth =
  //     barWidth * (inputs.savingsStartingBalance / totalAssets);
  //   doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
  //   doc.rect(
  //     barStartX + pretaxBarWidth + rothBarWidth,
  //     yPos,
  //     savingsBarWidth,
  //     barHeight,
  //     "F"
  //   );

  //   // Add border around the complete bar
  //   doc.setDrawColor(150, 150, 150);
  //   doc.rect(barStartX, yPos, barWidth, barHeight);

  //   yPos += 25;

  //   // Chart and Key Assumptions (will add page break if needed)
  //   // Add the chart
  //   yPos = addSectionHeader(
  //     "Balance Projection Chart",
  //     yPos,
  //     colors.primary,
  //     120
  //   );

  //   // Get chart data and create a simple line chart
  //   const chartData = calculations.map((calculation) => ({
  //     x: calculation.year,
  //     y: calculation.total,
  //   }));
  //   const chartWidth = 170;
  //   const chartHeight = 80;
  //   const chartX = 20;
  //   const chartY = yPos + 15; // Add more space between header and chart

  //   // Chart background
  //   addColoredRect(
  //     chartX - 5,
  //     chartY - 5,
  //     chartWidth + 10,
  //     chartHeight + 10,
  //     colors.light,
  //     0.3
  //   );

  //   // Find min/max values for scaling
  //   const maxBalance = Math.max(...chartData.map((d) => d.y));
  //   const minBalance = Math.min(0, Math.min(...chartData.map((d) => d.y)));
  //   const balanceRange = maxBalance - minBalance;

  //   const minYear = Math.min(...chartData.map((d) => d.x));
  //   const maxYear = Math.max(...chartData.map((d) => d.x));
  //   const yearRange = maxYear - minYear;

  //   // Draw grid lines
  //   doc.setDrawColor(200, 200, 200);
  //   doc.setLineWidth(0.2);

  //   // Vertical grid lines (years)
  //   for (let i = 0; i <= 4; i++) {
  //     const x = chartX + (chartWidth * i) / 4;
  //     doc.line(x, chartY, x, chartY + chartHeight);
  //   }

  //   // Horizontal grid lines (balance)
  //   for (let i = 0; i <= 4; i++) {
  //     const y = chartY + (chartHeight * i) / 4;
  //     doc.line(chartX, y, chartX + chartWidth, y);
  //   }

  //   // Draw the data line
  //   doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  //   doc.setLineWidth(2);

  //   for (let i = 0; i < chartData.length - 1; i++) {
  //     const point1 = chartData[i];
  //     const point2 = chartData[i + 1];

  //     const x1 = chartX + ((point1.x - minYear) / yearRange) * chartWidth;
  //     const y1 =
  //       chartY +
  //       chartHeight -
  //       ((point1.y - minBalance) / balanceRange) * chartHeight;
  //     const x2 = chartX + ((point2.x - minYear) / yearRange) * chartWidth;
  //     const y2 =
  //       chartY +
  //       chartHeight -
  //       ((point2.y - minBalance) / balanceRange) * chartHeight;

  //     doc.line(x1, y1, x2, y2);
  //   }

  //   // Add chart labels
  //   doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  //   doc.setFontSize(8);

  //   // Y-axis labels (balance)
  //   for (let i = 0; i <= 4; i++) {
  //     const balance = minBalance + (balanceRange * i) / 4;
  //     const y = chartY + chartHeight - (chartHeight * i) / 4;
  //     doc.text((balance / 1000000).toFixed(1) + "M", chartX - 15, y + 2);
  //   }

  //   // X-axis labels (years)
  //   for (let i = 0; i <= 4; i++) {
  //     const year = Math.round(minYear + (yearRange * i) / 4);
  //     const x = chartX + (chartWidth * i) / 4;
  //     doc.text(year.toString(), x - 8, chartY + chartHeight + 10);
  //   }

  //   // Chart title and axis labels
  //   doc.setTextColor(0, 0, 0);
  //   doc.setFontSize(9);
  //   doc.setFont(undefined, "bold");
  //   doc.text(
  //     "Total Account Balance Over Time",
  //     chartX + chartWidth / 2 - 35,
  //     chartY - 10
  //   );

  //   doc.setFont(undefined, "normal");
  //   doc.text("Balance ($M)", chartX - 15, chartY - 15);
  //   doc.text("Year", chartX + chartWidth / 2 - 10, chartY + chartHeight + 20);

  //   doc.setTextColor(0, 0, 0);
  //   yPos = chartY + chartHeight + 30;

  //   // Key Assumptions
  //   yPos = addSectionHeader("Key Assumptions", yPos, colors.secondary, 70);

  //   yPos = addKeyValuePair(
  //     "Current Annual Spending:",
  //     fmt(inputs.spendingToday),
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Inflation Rate:",
  //     `${(inputs.inflation * 100).toFixed(1)}%`,
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Annual Spending Decline:",
  //     `${(inputs.spendingDecline * 100).toFixed(1)}%`,
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Current Salary:",
  //     fmt(inputs.wagesandOtherTaxableCompensation),
  //     yPos
  //   );
  //   yPos = addKeyValuePair(
  //     "Salary Growth Rate:",
  //     `${(inputs.salaryGrowth * 100).toFixed(1)}%`,
  //     yPos
  //   );
  //   yPos += 10;

  //   // Investment returns in a box - dynamic sizing for any number of items
  //   const investmentReturnsStartY = yPos;

  //   // Define the investment return items dynamically
  //   const investmentItems = [
  //     {
  //       key: "Pre-tax Accounts:",
  //       value: `${(inputs.trad401kInterestRate * 100).toFixed(1)}%`,
  //     },
  //     {
  //       key: "Roth Accounts:",
  //       value: `${(inputs.tradRothInterestRate * 100).toFixed(1)}%`,
  //     },
  //     {
  //       key: "Taxable Accounts:",
  //       value: `${(inputs.savingsInterestRate * 100).toFixed(1)}%`,
  //     },
  //     // Future investment types can be added here
  //   ];

  //   // Calculate required height: header (12) + items (7 each) + padding (5)
  //   const headerHeight = 12;
  //   const itemHeight = 7;
  //   const bottomPadding = 5;
  //   const boxHeight =
  //     headerHeight + investmentItems.length * itemHeight + bottomPadding;

  //   // Draw the box first (background layer)
  //   addColoredRect(
  //     15,
  //     investmentReturnsStartY - 5,
  //     180,
  //     boxHeight,
  //     colors.secondary,
  //     0.05
  //   );

  //   // Draw the content on top
  //   doc.setFontSize(11);
  //   doc.setFont(undefined, "bold");
  //   doc.text("Expected Investment Returns:", 20, yPos + 5);

  //   doc.setFontSize(10);
  //   doc.setFont(undefined, "normal");
  //   yPos += 12;

  //   // Draw all investment items dynamically
  //   investmentItems.forEach((item) => {
  //     yPos = addKeyValuePair(item.key, item.value, yPos, 5);
  //   });

  //   yPos += 10;

  //   // Income Sources
  //   yPos = addSectionHeader("Income Sources", yPos, colors.success, 120);

  //   yPos = addKeyValuePair(
  //     "Social Security (Annual):",
  //     fmt(inputs.ssMonthly * 12),
  //     yPos
  //   );
  //   yPos = addKeyValuePair("SS Starting Age:", `${inputs.ssStartAge}`, yPos, 5);
  //   yPos = addKeyValuePair(
  //     "SS COLA:",
  //     `${(inputs.ssCola * 100).toFixed(1)}%`,
  //     yPos,
  //     5
  //   );
  //   yPos += 3;

  //   if (inputs.penMonthly > 0) {
  //     yPos = addKeyValuePair(
  //       "Pension (Annual):",
  //       fmt(inputs.penMonthly * 12),
  //       yPos
  //     );
  //     yPos = addKeyValuePair(
  //       "Pension Starting Age:",
  //       `${inputs.penStartAge}`,
  //       yPos,
  //       5
  //     );
  //     yPos = addKeyValuePair(
  //       "Pension COLA:",
  //       `${(inputs.penCola * 100).toFixed(1)}%`,
  //       yPos,
  //       5
  //     );
  //   } else {
  //     yPos = addKeyValuePair("Pension:", "None", yPos);
  //   }

  //   if (inputs.hasSpouse) {
  //     yPos += 5;
  //     addColoredRect(15, yPos - 3, 180, 20, colors.light, 0.3);

  //     doc.setFontSize(11);
  //     doc.setFont(undefined, "bold");
  //     doc.text("Spouse Information:", 20, yPos + 5);

  //     doc.setFontSize(10);
  //     doc.setFont(undefined, "normal");
  //     yPos += 12;
  //     yPos = addKeyValuePair("Spouse Age:", `${inputs.partnerAge}`, yPos, 5);
  //     yPos = addKeyValuePair(
  //       "Spouse SS (Annual):",
  //       fmt(inputs.partnerSsMonthly * 12),
  //       yPos,
  //       5
  //     );
  //     yPos = addKeyValuePair(
  //       "Spouse Pension (Annual):",
  //       fmt(inputs.partnerPenMonthly * 12),
  //       yPos,
  //       5
  //     );
  //   }

  //   // Add some spacing before detailed analysis
  //   yPos += 10;

  //   // Detailed Analysis (will add page break if needed)
  //   // Working Years Summary
  //   const workingYears = calculations.filter((c) => c.age < inputs.retireAge);
  //   if (workingYears.length > 0) {
  //     yPos = addSectionHeader(
  //       "Working Years Analysis",
  //       yPos,
  //       colors.primary,
  //       60
  //     );

  //     const totalContributions = workingYears.reduce(
  //       (sum, year) => sum + year.contrib,
  //       0
  //     );
  //     const totalTaxesPaid = workingYears.reduce(
  //       (sum, year) => sum + year.taxes,
  //       0
  //     );
  //     const finalWorkingBalance = workingYears[workingYears.length - 1];

  //     yPos = addKeyValuePair(
  //       "Years Until Retirement:",
  //       `${workingYears.length}`,
  //       yPos
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Contributions:",
  //       fmt(totalContributions),
  //       yPos,
  //       0,
  //       colors.success
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Taxes Paid:",
  //       fmt(totalTaxesPaid),
  //       yPos,
  //       0,
  //       colors.danger
  //     );
  //     yPos = addKeyValuePair(
  //       "Balance at Retirement:",
  //       fmt(finalWorkingBalance.total),
  //       yPos,
  //       0,
  //       colors.primary
  //     );
  //     yPos += 15;
  //   }

  //   // Retirement Years Summary
  //   const retirementYears = calculations.filter(
  //     (c) => c.age >= inputs.retireAge
  //   );
  //   if (retirementYears.length > 0) {
  //     yPos = addSectionHeader(
  //       "Retirement Years Analysis",
  //       yPos,
  //       colors.secondary,
  //       70
  //     );

  //     const totalRetirementSpending = retirementYears.reduce(
  //       (sum, year) => sum + year.spend,
  //       0
  //     );
  //     const totalRetirementTaxes = retirementYears.reduce(
  //       (sum, year) => sum + year.taxes,
  //       0
  //     );
  //     const totalSSIncome = retirementYears.reduce(
  //       (sum, year) => sum + (year.ss || 0),
  //       0
  //     );
  //     const totalPensionIncome = retirementYears.reduce(
  //       (sum, year) => sum + (year.pen || 0),
  //       0
  //     );
  //     const totalWithdrawals = retirementYears.reduce(
  //       (sum, year) => sum + year.wNet,
  //       0
  //     );

  //     yPos = addKeyValuePair(
  //       "Years in Retirement:",
  //       `${retirementYears.length}`,
  //       yPos
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Spending:",
  //       fmt(totalRetirementSpending),
  //       yPos,
  //       0,
  //       colors.danger
  //     );
  //     yPos = addKeyValuePair(
  //       "Total SS Income:",
  //       fmt(totalSSIncome),
  //       yPos,
  //       0,
  //       colors.success
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Pension Income:",
  //       fmt(totalPensionIncome),
  //       yPos,
  //       0,
  //       colors.success
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Account Withdrawals:",
  //       fmt(totalWithdrawals),
  //       yPos,
  //       0,
  //       colors.warning
  //     );
  //     yPos = addKeyValuePair(
  //       "Total Retirement Taxes:",
  //       fmt(totalRetirementTaxes),
  //       yPos,
  //       0,
  //       colors.danger
  //     );
  //     yPos += 15;
  //   }

  //   // Key Year Projections Table with better formatting
  //   yPos = addSectionHeader("Key Year Projections", yPos, colors.primary, 150);

  //   // Table header with colored background
  //   addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);

  //   doc.setFontSize(8);
  //   doc.setFont(undefined, "bold");
  //   doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

  //   const headers = [
  //     "Year",
  //     "Age",
  //     "Spending",
  //     "SS",
  //     "Pension",
  //     "Withdrawals",
  //     "Taxes",
  //     "Balance",
  //   ];
  //   const colWidths = [20, 15, 25, 20, 25, 25, 20, 25];
  //   let xPos = 20;

  //   headers.forEach((header, i) => {
  //     doc.text(header, xPos, yPos + 5);
  //     xPos += colWidths[i];
  //   });

  //   yPos += 15;
  //   doc.setTextColor(0, 0, 0);
  //   doc.setFont(undefined, "normal");

  //   // Show key years with alternating row colors
  //   const keyYears = calculations.filter((calc, index) => {
  //     const isEveryFifthYear = index % 5 === 0;
  //     const isLastWorkingYear = calc.age === inputs.retireAge - 1;
  //     const isFirstRetirementYear = calc.age === inputs.retireAge;
  //     const isLastYear = index === calculations.length - 1;
  //     const isFirstYear = index === 0;
  //     return (
  //       isEveryFifthYear ||
  //       isLastWorkingYear ||
  //       isFirstRetirementYear ||
  //       isLastYear ||
  //       isFirstYear
  //     );
  //   });

  //   keyYears.forEach((calculation, index) => {
  //     if (yPos > 270) {
  //       // Page break
  //       doc.addPage();
  //       yPos = 20;
  //       // Repeat headers
  //       addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);
  //       doc.setFont(undefined, "bold");
  //       doc.setTextColor(
  //         colors.primary[0],
  //         colors.primary[1],
  //         colors.primary[2]
  //       );
  //       xPos = 20;
  //       headers.forEach((header, i) => {
  //         doc.text(header, xPos, yPos + 5);
  //         xPos += colWidths[i];
  //       });
  //       yPos += 15;
  //       doc.setTextColor(0, 0, 0);
  //       doc.setFont(undefined, "normal");
  //     }

  //     // Alternating row background
  //     if (index % 2 === 0) {
  //       addColoredRect(15, yPos - 3, 180, 8, colors.light, 0.3);
  //     }

  //     // Highlight retirement transition
  //     if (calculation.age === inputs.retireAge) {
  //       addColoredRect(15, yPos - 3, 180, 8, colors.warning, 0.2);
  //     }

  //     const values = [
  //       calculation.year.toString(),
  //       calculation.age.toString(),
  //       calculation.spend
  //         ? "$" + (calculation.spend / 1000).toFixed(2) + "k"
  //         : "",
  //       calculation.ss.mySs
  //         ? "$" + (calculation.ss.mySs / 1000).toFixed(2) + "k"
  //         : "",
  //       calculation.pen.myPen
  //         ? "$" + (calculation.pen.myPen / 1000).toFixed(2) + "k"
  //         : "",
  //       calculation.withdrawals.net
  //         ? "$" + (calculation.withdrawals.net / 1000).toFixed(2) + "k"
  //         : "",
  //       calculation.taxes.total
  //         ? "$" + (calculation.taxes.total / 1000).toFixed(2) + "k"
  //         : "",
  //       "$" + (calculation.total / 1000).toFixed(2) + "k",
  //     ];

  //     xPos = 20;
  //     values.forEach((value, i) => {
  //       // Color code negative balances
  //       if (i === 7 && calculation.total < 0) {
  //         doc.setTextColor(
  //           colors.danger[0],
  //           colors.danger[1],
  //           colors.danger[2]
  //         );
  //         doc.setFont(undefined, "bold");
  //       }

  //       doc.text(value, xPos, yPos + 2);

  //       // Reset formatting
  //       doc.setTextColor(0, 0, 0);
  //       doc.setFont(undefined, "normal");

  //       xPos += colWidths[i];
  //     });
  //     yPos += 8;
  //   });

  //   // Disclaimers (will add page break if needed)
  //   yPos = addSectionHeader("Important Disclaimers", yPos, colors.danger, 200);

  //   addColoredRect(15, yPos - 5, 180, 140, colors.warning, 0.05);

  //   doc.setFontSize(10);
  //   doc.setFont(undefined, "normal");

  //   const disclaimers = [
  //     "This retirement planning report is for educational and informational purposes only.",
  //     "It should not be considered as financial, investment, or tax advice. The projections",
  //     "are based on the assumptions you provided and are estimates only.",
  //     "",
  //     "Key Limitations:",
  //     "• Market returns are unpredictable and may vary significantly from assumptions",
  //     "• Tax laws and Social Security rules may change over time",
  //     "• Healthcare costs and long-term care needs are not explicitly modeled",
  //     "• Inflation may vary from the assumed rate",
  //     "• Individual circumstances may require different strategies",
  //     "• Sequence of returns risk is not modeled",
  //     "",
  //     "Important Considerations:",
  //     "• This model uses simplified tax calculations",
  //     "• RMD rules may change in the future",
  //     "• Social Security benefits may be reduced if the trust fund is depleted",
  //     "• Healthcare inflation typically exceeds general inflation",
  //     "• Long-term care costs can be substantial",
  //     "",
  //     "Recommendations:",
  //     "• Consult with a qualified financial advisor before making investment decisions",
  //     "• Review and update your retirement plan regularly (annually recommended)",
  //     "• Consider multiple scenarios with different assumptions",
  //     "• Factor in emergency funds and unexpected expenses",
  //     "• Consider professional tax planning advice",
  //     "• Review beneficiary designations regularly",
  //     "",
  //     "This calculator uses simplified models and may not capture all aspects of",
  //     "retirement planning. Professional advice is recommended for comprehensive",
  //     "retirement planning tailored to your specific situation.",
  //   ];

  //   disclaimers.forEach((line) => {
  //     if (yPos > 280) {
  //       // Page break
  //       doc.addPage();
  //       yPos = 20;
  //     }
  //     if (line === "") {
  //       yPos += 5;
  //     } else {
  //       doc.text(line, 20, yPos, { maxWidth: 170 });
  //       yPos += 7;
  //     }
  //   });

  //   // Footer on last page
  //   yPos = 280;
  //   doc.setFontSize(8);
  //   doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  //   doc.text(
  //     `Generated by Retirement Calculator • ${new Date().toLocaleDateString()}`,
  //     20,
  //     yPos
  //   );
  //   doc.text(
  //     "This report contains confidential financial information",
  //     120,
  //     yPos
  //   );

  //   // Open PDF in new tab instead of downloading
  //   const pdfBlob = doc.output("blob");
  //   const pdfUrl = URL.createObjectURL(pdfBlob);
  //   window.open(pdfUrl, "_blank");

  //   // Clean up the URL after a delay to free memory
  //   setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

  //   showToast("PDF Generated", "PDF report opened in new tab", "success");
  // } catch (error) {
  //   console.error("PDF generation error:", error);
  //   showToast(
  //     "PDF Error",
  //     "Error generating PDF report: " + error.message,
  //     "error"
  //   );
  // }
}
