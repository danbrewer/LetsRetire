/**
 * Export Total Net Income Breakdown to CSV
 */
function exportTotalNetToJson(index) {
  if (!calculations || !calculations[index]) {
    console.error("No calculation data available for index:", index);
    return;
  }

  const data = calculations[index];

  // Helper function to format values for CSV (removes formatting, handles nulls)
  const csvFmt = (val) => {
    if (val == null || val === 0) return 0;
    return Math.round(val);
  };

  // Create CSV content
  let csvContent = "data:text/csv;charset=utf-8,";

  // Add header with age and year
  csvContent += `Total Net Income Breakdown - Age ${data.age} (Year ${data.year})\n\n`;

  // Gross Income Sources section
  csvContent += "Gross Income Sources (Before Taxes)\n";
  csvContent += "Source,Amount,Notes\n";

  if (data.ssGross > 0) {
    csvContent += `Social Security,${csvFmt(
      data.ssGross
    )},Before federal taxation\n`;
  }
  if (data.spouseSsGross > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      data.spouseSsGross
    )},Before federal taxation\n`;
  }
  if (data.penGross > 0) {
    csvContent += `Pension,${csvFmt(data.penGross)},Before federal taxation\n`;
  }
  if (data.spousePenGross > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      data.spousePenGross
    )},Before federal taxation\n`;
  }
  if (data.wGross > 0) {
    csvContent += `Non-Taxable Withdrawals,${csvFmt(
      data.wGross
    )},Before taxes and penalties\n`;
  }
  if (data.taxableInterest > 0) {
    csvContent += `Taxable Interest,${csvFmt(
      data.taxableInterest
    )},Interest income\n`;
  }

  // Calculate total gross income
  const grossIncomeTotal =
    (data.ssGross || 0) +
    (data.spouseSsGross || 0) +
    (data.penGross || 0) +
    (data.spousePenGross || 0) +
    (data.wGross || 0) +
    (data.taxableInterest || 0);

  csvContent += `Total Gross Income,${csvFmt(
    grossIncomeTotal
  )},Before all taxes\n\n`;

  // Income Sources (Net After Taxes) section
  csvContent += "Income Sources (Net After Taxes)\n";
  csvContent += "Source,Amount,Notes\n";

  if (data.ss > 0) {
    csvContent += `Social Security,${csvFmt(data.ss)},After federal taxation\n`;
  }
  if (data.spouseSs > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      data.spouseSs
    )},After federal taxation\n`;
  }
  if (data.pen > 0) {
    csvContent += `Pension,${csvFmt(data.pen)},After federal taxation\n`;
  }
  if (data.spousePen > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      data.spousePen
    )},After federal taxation\n`;
  }
  if (data.wNet > 0) {
    csvContent += `Non-Taxable Withdrawals,${csvFmt(
      data.wNet
    )},After taxes and penalties\n`;
  }
  if (data.nonTaxableIncome > 0) {
    csvContent += `Non-Taxable Income,${csvFmt(
      data.nonTaxableIncome
    )},Tax-free income sources\n`;
  }

  csvContent += `Total Net Income,${csvFmt(
    data.totalNetIncome
  )},After all taxes\n\n`;

  // Withdrawal Breakdown section (if applicable)
  if (data.withdrawalBreakdown && data.wNet > 0) {
    csvContent += "Withdrawal Breakdown\n";
    csvContent += "Account Type,Gross Amount,Net Amount,Notes\n";

    if (data.withdrawalBreakdown.pretax401kGross > 0) {
      csvContent += `401k/403b/TSP,${csvFmt(
        data.withdrawalBreakdown.pretax401kGross
      )},${csvFmt(
        data.withdrawalBreakdown.pretax401kNet
      )},Taxable withdrawal\n`;
    }
    if (data.wSavingsGross > 0) {
      csvContent += `Taxable Savings,${csvFmt(data.wSavingsGross)},${csvFmt(
        data.wSavingsGross
      )},Tax-free principal\n`;
    }
    if (data.wRothGross > 0) {
      csvContent += `Roth IRA,${csvFmt(data.wRothGross)},${csvFmt(
        data.wRothGross
      )},Tax-free withdrawal\n`;
    }

    csvContent += `Total Withdrawals,${csvFmt(data.wGross)},${csvFmt(
      data.wNet
    )},Combined Non-Taxable withdrawals\n\n`;
  }

  // Tax Summary
  csvContent += "Tax Summary\n";
  csvContent += "Item,Amount,Notes\n";
  csvContent += `Total Federal Taxes,${csvFmt(
    data.taxes
  )},All federal taxes owed\n`;
  csvContent += `Taxable Income,${csvFmt(
    data.taxableIncome
  )},Income subject to federal tax\n`;

  // Create and trigger download
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `retirement_breakdown_age_${data.age}_year_${data.year}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
