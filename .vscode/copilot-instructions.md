# Copilot Instructions for Retirement Calculator Project

## Project Context
This is a sophisticated JavaScript retirement planning application with GAAP-compliant accounting, advanced tax calculations, and multiple withdrawal strategies. See `/overview.md` for complete technical documentation.

## **IMPORTANT: Code Change Policy**
**DO NOT make direct code changes without explicit permission.** When issues are identified:

1. **Assess and Analyze**: Examine the problem thoroughly
2. **Present Findings**: Explain what's wrong and why
3. **Show Code Solutions**: Provide the proposed code changes in markdown code blocks
4. **Wait for Approval**: Let the developer review and approve before implementing
5. **Only Change When Asked**: Use editing tools only when explicitly requested

**Example Response Format:**
```
## Issue Analysis
[Explain the problem and root cause]

## Proposed Solution  
[Describe the approach]

## Code Changes
[Show the changes in markdown code blocks]

Would you like me to implement these changes?
```

## Key Architecture Points
- **GAAP System**: All financial transactions use double-entry bookkeeping (cGaap.js, cGaapAccount.js, etc.)
- **Two-Phase Tax Calculation**: Solves circular dependency between taxes and withdrawals
- **Modular Design**: Core classes (c*), Reports (r*), Types (t*), Tests (tests/*)
- **ES6 Modules**: No external dependencies, pure JavaScript

## Development Guidelines
- Maintain GAAP accounting integrity for all financial transactions
- Follow existing naming conventions (c*, r*, t* prefixes)
- Preserve two-phase tax calculation approach
- Include comprehensive error handling and validation
- Always suggest appropriate tests for changes

## Common Tasks
- Debugging complex retirement calculations in RetirementYearCalculator
- Social Security benefit calculations and taxation (cSsBenefitsCalculator.js)
- GAAP journal entry balancing and transaction recording
- UI enhancements while maintaining responsive dark theme
- Adding new account types or withdrawal strategies

## Important Files
- `retirement-calculator.js` - Main calculation orchestrator
- `cRetirementIncomeCalculator.js` - Core retirement phase calculations
- `cGaap.js` - GAAP accounting framework (1918+ lines)
- `one_page_retirement_calculator.html` - Main UI entry point
- `overview.md` - Complete project documentation

When helping with this project, always consider the impact on the GAAP accounting system and maintain the sophisticated financial modeling capabilities.