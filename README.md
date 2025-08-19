# One-Page Retirement Calculator

A comprehensive, interactive retirement planning tool built as a single HTML file. This calculator helps you model various retirement scenarios including pre-tax and Roth contributions, Social Security, pensions, and different withdrawal strategies.

## Features

### 📊 **Comprehensive Modeling**
- **Multiple Account Types**: Pre-tax (401k/Traditional IRA), Roth, and Taxable accounts
- **Income Sources**: Salary, Social Security, and Pension modeling
- **Employer Benefits**: Employer 401k matching with customizable rates
- **Inflation & Growth**: Adjustable inflation rates and investment returns

### 💰 **Tax Planning**
- **Withdrawal Strategies**: Three different account withdrawal orders
- **Tax Modeling**: Simplified effective tax rates for different account types
- **Social Security & Pension Taxes**: Separate tax treatment for different income sources

### 📈 **Visualization & Analysis**
- **Interactive Chart**: Visual representation of portfolio balance over time
- **Key Performance Indicators**: 
  - Funded to age (with funding status)
  - Ending balance
  - Maximum drawdown year
  - Total retirement taxes
- **Detailed Year-by-Year Table**: Complete breakdown of contributions, withdrawals, taxes, and balances

### 🛠 **User Experience**
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern, easy-on-the-eyes interface
- **Collapsible Sections**: Organized input sections for better navigation
- **Data Export**: Export results to CSV for further analysis
- **Example Data**: Load sample data to get started quickly

## Getting Started

### Quick Start
1. Download or save `one_page_retirement_calculator_html.html`
2. Open the file in any modern web browser
3. Click "Load Example" to see sample data
4. Click "Calculate ▶" to run the analysis
5. Adjust inputs as needed for your situation

### Input Sections

#### **Personal & Timeline**
- Current age, retirement age, and planning horizon
- Inflation rate and retirement spending needs

#### **Work & Contributions**
- Current salary and expected growth
- Contribution percentages for pre-tax, Roth, and taxable accounts
- Employer matching details

#### **Balances & Returns**
- Current account balances
- Expected investment returns for each account type

#### **Social Security & Pension**
- Monthly benefit amounts and start ages
- Cost-of-living adjustments (COLA)

#### **Taxes & Withdrawal Strategy**
- Effective tax rates for different income sources
- Account withdrawal order preference

## Key Calculations

### **Accumulation Phase**
- Applies salary growth and contribution percentages
- Calculates employer matching based on your contributions
- Compounds investment returns annually

### **Retirement Phase**
- Inflates spending needs from today's dollars
- Applies Social Security and pension benefits with COLA
- Withdraws from accounts in your preferred order
- Tracks taxes paid on withdrawals

### **Withdrawal Strategies**
1. **Taxable → Pre-tax → Roth** (Default): Tax-efficient for most scenarios
2. **Pre-tax → Taxable → Roth**: Good for high earners wanting to reduce RMD impact
3. **Roth → Pre-tax → Taxable**: Conservative approach preserving tax-advantaged growth

## Limitations & Disclaimers

⚠️ **This is an educational, simplified model**

**What's NOT included:**
- Required Minimum Distributions (RMDs)
- Detailed tax bracket calculations
- Tax credits and deductions
- Healthcare costs and Medicare
- Sequence of returns risk
- Variable spending in retirement
- Estate planning considerations

**Important Notes:**
- Uses simplified effective tax rates instead of marginal brackets
- Assumes constant investment returns (no volatility)
- Does not account for changing tax laws
- Social Security taxation is simplified

## Technical Details

### **Built With**
- Pure HTML, CSS, and JavaScript (no dependencies)
- HTML5 Canvas for charting
- CSS Grid and Flexbox for responsive layout
- Modern JavaScript (ES6+)

### **Browser Compatibility**
- Chrome, Firefox, Safari, Edge (modern versions)
- Mobile browsers supported
- No internet connection required after download

### **File Size**
- Single file: ~25KB
- Fully self-contained
- No external dependencies

## Usage Tips

### **Getting Accurate Results**
1. **Use realistic assumptions**: Conservative estimates are often better
2. **Update regularly**: Review and adjust inputs annually
3. **Consider multiple scenarios**: Test different withdrawal strategies
4. **Factor in inflation**: All dollar amounts should reflect today's purchasing power

### **Common Scenarios to Model**
- Early retirement at different ages
- Impact of increasing/decreasing contributions
- Different investment return assumptions
- Various Social Security claiming strategies
- Effect of employer match changes

## Export & Analysis

### **CSV Export**
Click "Export CSV" to download a detailed year-by-year breakdown including:
- Annual contributions and matches
- Account balances and withdrawals
- Tax payments and net income
- Social Security and pension benefits

### **Further Analysis**
The exported data can be used in:
- Excel or Google Sheets for custom charts
- Monte Carlo simulations for sequence risk analysis
- Tax planning software
- Financial planning consultations

## Professional Advice

🎯 **This tool is for educational purposes only**

**Always consult with qualified professionals:**
- **Fiduciary Financial Advisor**: For comprehensive retirement planning
- **Tax Professional**: For tax-efficient strategies
- **Estate Attorney**: For legacy planning
- **Insurance Agent**: For healthcare and long-term care planning

## Contributing

This is a single-file project designed for simplicity. If you'd like to suggest improvements:
1. Test thoroughly with various scenarios
2. Ensure changes maintain the single-file architecture
3. Preserve the educational focus and disclaimers
4. Consider backward compatibility

## License

This project is provided as-is for educational purposes. Feel free to modify and distribute while maintaining appropriate disclaimers about the limitations of the model.

---

**Remember**: Retirement planning is complex and personal. This calculator provides a starting point for understanding the key factors, but professional guidance is essential for making important financial decisions.
