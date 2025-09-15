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

  if (calculation.ssGross > 0) {
    csvContent += `Social Security,${csvFmt(
      calculation.ssGross
    )},Before federal taxation\n`;
  }
  if (calculation.spouseSsGross > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      calculation.spouseSsGross
    )},Before federal taxation\n`;
  }
  if (calculation.penGross > 0) {
    csvContent += `Pension,${csvFmt(
      calculation.penGross
    )},Before federal taxation\n`;
  }
  if (calculation.spousePenGross > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      calculation.spousePenGross
    )},Before federal taxation\n`;
  }
  if (calculation.withdrawals.gross > 0) {
    csvContent += `Non-Taxable Withdrawals,${csvFmt(
      calculation.withdrawals.gross
    )},Before taxes and penalties\n`;
  }
  if (calculation.taxableInterest > 0) {
    csvContent += `Taxable Interest,${csvFmt(
      calculation.taxableInterest
    )},Interest income\n`;
  }

  // Calculate total gross income
  const grossIncomeTotal =
    (calculation.ssGross || 0) +
    (calculation.spouseSsGross || 0) +
    (calculation.penGross || 0) +
    (calculation.spousePenGross || 0) +
    (calculation.withdrawals.gross || 0) +
    (calculation.taxableInterest || 0);

  csvContent += `Total Gross Income,${csvFmt(
    grossIncomeTotal
  )},Before all taxes\n\n`;

  // Income Sources (Net After Taxes) section
  csvContent += "Income Sources (Net After Taxes)\n";
  csvContent += "Source,Amount,Notes\n";

  if (calculation.ss > 0) {
    csvContent += `Social Security,${csvFmt(
      calculation.ss
    )},After federal taxation\n`;
  }
  if (calculation.spouseSs > 0) {
    csvContent += `Spouse Social Security,${csvFmt(
      calculation.spouseSs
    )},After federal taxation\n`;
  }
  if (calculation.pen > 0) {
    csvContent += `Pension,${csvFmt(calculation.pen)},After federal taxation\n`;
  }
  if (calculation.spousePen > 0) {
    csvContent += `Spouse Pension,${csvFmt(
      calculation.spousePen
    )},After federal taxation\n`;
  }
  if (calculation.wNet > 0) {
    csvContent += `Non-Taxable Withdrawals,${csvFmt(
      calculation.wNet
    )},After taxes and penalties\n`;
  }
  if (calculation.nonTaxableIncome > 0) {
    csvContent += `Non-Taxable Income,${csvFmt(
      calculation.nonTaxableIncome
    )},Tax-free income sources\n`;
  }

  csvContent += `Total Net Income,${csvFmt(
    calculation.totalNetIncome
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
    )},${csvFmt(calculation.wNet)},Combined Non-Taxable withdrawals\n\n`;
  }

  // Tax Summary
  csvContent += "Tax Summary\n";
  csvContent += "Item,Amount,Notes\n";
  csvContent += `Total Federal Taxes,${csvFmt(
    calculation.taxes12345
  )},All federal taxes owed\n`;
  csvContent += `Taxable Income,${csvFmt(
    calculation.taxableIncome
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
