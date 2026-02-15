/**
 * @typedef {{ title: string; body: string }} HelpText
 */

/**
 * @type {Record<string, HelpText>}
 */
const helpTexts = {
  subjectCurrentAge: {
    title: "Current Age",
    body: "Enter your current age in years. This is used as the starting point for all retirement calculations and determines how many years you have until retirement.",
  },
  retireAge: {
    title: "Retirement Age",
    body: "The age at which you plan to retire and stop working. This determines when you'll begin withdrawing from your retirement accounts.",
  },
  endAge: {
    title: "Plan to Age",
    body: "The age until which you want your retirement funds to last. This is typically your expected lifespan or when you want financial security to end.",
  },
  inflation: {
    title: "Inflation Rate",
    body: "The expected annual inflation rate as a percentage. This affects how your spending needs will grow over time and reduces the purchasing power of money.",
  },
  spendingToday: {
    title: "Retirement Spending",
    body: "How much you expect to spend per year in retirement, expressed in today's dollars. This will be adjusted for inflation to your retirement date.",
  },
  spendingDecline: {
    title: "Annual Spending Decline",
    body: "The percentage by which your spending decreases each year in retirement. Many retirees spend less as they age due to reduced activity and travel.",
  },
  partnerAge: {
    title: "Spouse Current Age",
    body: "Your partner's current age in years. Set to 0 if you don't have a partner. This affects Social Security and pension benefit calculations.",
  },
  partnerRetireAge: {
    title: "Spouse Retirement Age",
    body: "The age at which your partner plans to retire. This determines when partner income sources will begin or end.",
  },
  salary: {
    title: "Current Salary",
    body: "Your current annual gross salary before taxes and deductions. This is used to calculate retirement contributions and employer matching.",
  },
  salaryGrowth: {
    title: "Salary Growth Rate",
    body: "The expected annual percentage increase in your salary. This affects future contribution amounts and employer matching over time.",
  },
  subject401kContribution: {
    title: "401k Contribution",
    body: "The percentage (%) of your salary contributed to pre-tax retirement accounts like traditional 401(k) or IRA. These reduce working year taxes but are taxed in retirement.",
  },
  rothPct: {
    title: "Roth Contribution Rate",
    body: "The percentage of your salary contributed to Roth accounts. These are made with after-tax dollars but grow tax-free and are not taxed in retirement.",
  },
  taxablePct: {
    title: "Taxable Savings Rate",
    body: "The percentage of your salary saved in regular taxable investment accounts. These provide flexibility but don't have tax advantages. Note: Interest and dividends earned on these accounts are included in your taxable income each year during working years.",
  },
  subjectEmpMatchCap: {
    title: "Employer Match Cap",
    body: "The maximum percentage (%) of gross wages that your employer will match.",
  },
  subjectEmpMatchRate: {
    title: "Employer Match",
    body: "The percentage (%) rate at which your employer matches contributions. For example, 50% means your employer will contribute $0.50 for every $1.00 you contribute.",
  },
  balPre: {
    title: "Pre-tax Balance",
    body: "Your current balance in pre-tax retirement accounts like traditional 401(k), 403(b), or traditional IRA.",
  },
  balRoth: {
    title: "Roth Balance",
    body: "Your current balance in Roth retirement accounts like Roth 401(k) or Roth IRA. These grow tax-free.",
  },
  startingSavingsBalance: {
    title: "Savings Balance",
    body: "Total savings starting balance for regular taxable investment accounts like brokerage accounts, savings, or CDs.",
  },
  workingYearsSpending: {
    title: "Working Years Spending",
    body: "The amount you expect to spend per year while you are still working, expressed in today's dollars. This will be adjusted for inflation over time.",
  },
  retirementYearsSpending: {
    title: "Retirement Years Spending",
    body: "The amount you expect to spend per year during retirement, expressed in today's dollars. This will be adjusted for inflation to your retirement date.",
  },
  retPre: {
    title: "Pre-tax Return Rate",
    body: "The expected annual return on your pre-tax retirement investments, expressed as a percentage. Typically 6-8% for diversified portfolios.",
  },
  retRoth: {
    title: "Roth Return Rate",
    body: "The expected annual return on your Roth retirement investments. Usually similar to pre-tax returns since they're often in similar investments.",
  },
  retTax: {
    title: "Taxable Return Rate",
    body: "The expected annual return on your taxable investments. May be slightly lower due to tax drag from annual taxes on dividends and capital gains.",
  },
  ssMonthly: {
    title: "Social Security Benefit",
    body: "Your estimated monthly Social Security benefit in the first year you claim it, in today's dollars. Check your Social Security statement for estimates.",
  },
  ssStart: {
    title: "Social Security Start Age",
    body: "The age at which you plan to start claiming Social Security benefits. You can claim as early as 62 or delay until 70 for larger benefits.",
  },
  ssCola: {
    title: "Social Security COLA",
    body: "The annual cost-of-living adjustment for Social Security, typically around 2-3% per year to keep pace with inflation.",
  },
  penMonthly: {
    title: "Pension Benefit",
    body: "Your estimated monthly pension benefit in the first year you receive it. Set to 0 if you don't have a pension.",
  },
  penStart: {
    title: "Pension Start Age",
    body: "The age at which you'll begin receiving pension benefits. This varies by employer and plan type.",
  },
  penCola: {
    title: "Pension COLA",
    body: "The annual cost-of-living adjustment for your pension. Many pensions have no COLA (0%), while others may match inflation.",
  },
  taxPre: {
    title: "Pre-tax Withdrawal Tax Rate",
    body: "The baseline effective tax rate on withdrawals from pre-tax retirement accounts. The calculator uses Taxable Income-based rates for more accuracy when total income is significant, but falls back to this rate as a minimum.",
  },
  taxTaxable: {
    title: "Taxable Withdrawal Tax Rate",
    body: "The effective tax rate on withdrawals from taxable accounts. Usually lower than income tax due to capital gains treatment.",
  },
  taxRoth: {
    title: "Roth Withdrawal Tax Rate",
    body: "The effective tax rate on Roth withdrawals. Typically 0% since Roth withdrawals are tax-free in retirement.",
  },
  taxSS: {
    title: "Social Security Tax Rate",
    body: "The effective tax rate on Social Security benefits. Varies based on total income, typically 0-18.5% of benefits.",
  },
  taxPension: {
    title: "Pension Tax Rate",
    body: "The baseline effective tax rate on pension benefits. When Taxable Income-based calculation is enabled, the calculator uses progressive tax rates based on total income, but falls back to this rate as a minimum. Usually taxed as ordinary income at your marginal tax rate.",
  },
  order: {
    title: "Withdrawal Order Strategy",
    body: "The order in which you'll withdraw from different account types. The default strategy withdraws from Savings first, then 401k, then Roth to optimize taxes. The 50/50 strategy takes equal net amounts from savings and 401k accounts (after Social Security and pension income), automatically grossing up the 401k withdrawal to account for taxes.",
  },
  filingStatus: {
    title: "Tax Filing Status",
    body: "Your tax filing status affects Social Security taxation thresholds and Taxable Income-based tax calculations. Single filers have lower thresholds for SS taxation than married filing jointly.",
  },
  useRMD: {
    title: "Required Minimum Distribution Rules",
    body: "When enabled, enforces mandatory withdrawals from pre-tax retirement accounts (401k, traditional IRA) starting at age 73. RMD amounts are calculated based on IRS life expectancy tables and account balances. These withdrawals are required by law and failure to take them results in significant penalties.",
  },
};


// Helper function to create reusable help icon
/**
 * @param {string} fieldId
 */
function createHelpIcon(fieldId) {
  return `<svg xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                width="1em" height="1em" 
                fill="#7c8db5" 
                class="help-icon"
                onclick="showHelpToast(event, '${fieldId}')"
                style="vertical-align: middle; margin-left: 0.3em;">
            <circle cx="12" cy="12" r="10" stroke="#7c8db5" stroke-width="2" fill="none"/>
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5v1" stroke="#7c8db5" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="1" fill="#7c8db5"/>
            </svg>`;
}

export { helpTexts, createHelpIcon };
