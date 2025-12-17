# One-Page Retirement Calculator

A comprehensive retirement planning tool built with JavaScript that provides detailed financial projections for retirement planning scenarios.

## 🚀 Quick Start Guide

### Prerequisites
- **VS Code** with the Live Server (Go Live) extension installed
- **Google Chrome** browser
- **Node.js** (for running tests)

### Development Setup

#### 1. Launch Chrome with Debugging Enabled

Open a terminal and run the following command to start Chrome with remote debugging:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug
```

**What this does:**
- `--remote-debugging-port=9222`: Enables Chrome DevTools debugging on port 9222
- `--user-data-dir=/tmp/chrome-debug`: Uses a temporary profile to avoid conflicts with your regular Chrome session

#### 2. Start VS Code Live Server

1. Open this project folder in **VS Code**
2. Open the file `one_page_retirement_calculator.html`
3. Right-click in the editor and select **"Open with Live Server"**
   - Or click the **"Go Live"** button in the bottom status bar
   - Or use the command palette (`Cmd+Shift+P`) and search for "Live Server: Open with Live Server"

This will start a local development server (typically at `http://localhost:5500` or `http://127.0.0.1:5500`)

#### 3. Open the Application

The Live Server should automatically open your default browser to the application. If not:

1. Navigate to the Live Server URL (displayed in VS Code's output panel)
2. Open `one_page_retirement_calculator.html`

**Example URL:** `http://localhost:5500/one_page_retirement_calculator.html`

### 🔧 Development Workflow

#### Hot Reloading
- The Live Server automatically refreshes the page when you save changes to HTML, CSS, or JavaScript files
- No need to manually refresh the browser during development

#### Debugging
With Chrome launched with debugging enabled, you can:
- Use Chrome DevTools for debugging JavaScript
- Set breakpoints in your source code
- Inspect network requests and performance
- Access advanced debugging features

#### TypeScript Checking
Run TypeScript type checking:
```bash
npx tsc
```

## 🧪 Testing

### Run Individual Test Files
```bash
# GAAP system tests
node tests/test_GaapAccount.js
node tests/test_GaapLedger.js
node tests/test_GaapMacros.js

# Retirement calculation tests  
node tests/test_retirement_income_calculator.js
node tests/test_working_year_calculator.js
```

### Run All GAAP Tests
```bash
node tests/runAllGaapTests.js
```

This will execute all GAAP-related tests and provide a comprehensive summary report.

## 📁 Project Structure

```
Project/
├── one_page_retirement_calculator.html    # Main application
├── retirement-ui.js                       # UI logic and event handling
├── retirement-calculator.js               # Core calculation engine
├── cGaap.js                               # GAAP accounting system
├── cRetirementIncomeCalculator.js         # Retirement income calculations
├── cWithdrawalFactory.js                  # Withdrawal strategy logic
├── tests/                                 # Test suite
│   ├── runAllGaapTests.js                # Test runner for GAAP tests
│   ├── test_Gaap*.js                     # GAAP system tests
│   └── test_*.js                         # Other component tests
└── README.md                             # This file
```

## 🎯 Key Features

- **Real-time Calculations**: Instant updates as you modify inputs
- **Comprehensive Projections**: Working years through retirement
- **GAAP Accounting**: Built-in double-entry bookkeeping system
- **Multiple Scenarios**: Compare different retirement strategies
- **Visual Feedback**: Clear indication of surplus/deficit years
- **Export Options**: Generate PDF reports of your projections

## 🔄 Development Tips

### Live Server Benefits
- **Auto-refresh**: Changes are reflected immediately
- **Local HTTPS**: Can enable HTTPS for testing secure features
- **Mobile testing**: Access from mobile devices on the same network
- **Custom port**: Configure different ports if needed

### Chrome Debug Benefits
- **Source maps**: Debug original source code even with transpiled JavaScript
- **Network analysis**: Monitor API calls and resource loading
- **Performance profiling**: Identify bottlenecks and optimization opportunities
- **Mobile emulation**: Test responsive design without physical devices

### File Watching
The Live Server watches for changes in:
- `.html` files
- `.css` files  
- `.js` files
- Image files and other assets

## 🚨 Troubleshooting

### Live Server Not Starting
- Check that the Live Server extension is installed and enabled
- Try restarting VS Code
- Check for port conflicts (default is 5500)

### Chrome Debug Issues
- Make sure no other Chrome instances are using the debug port
- Clear the temporary user data directory: `rm -rf /tmp/chrome-debug`
- Check that the Chrome path is correct for your system

### TypeScript Errors
- Run `npx tsc` to see detailed error messages
- Check that all required dependencies are available
- Ensure proper file extensions (.js) for module loading

## 📚 Additional Resources

- [VS Code Live Server Documentation](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
- [Chrome DevTools Guide](https://developers.google.com/web/tools/chrome-devtools)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🏗️ Architecture Overview

This application uses a modular JavaScript architecture with:
- **Class-based design** for maintainable code organization
- **GAAP accounting principles** for accurate financial modeling
- **Event-driven UI** for responsive user interactions
- **Comprehensive testing** for reliability and correctness
