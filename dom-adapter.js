/**
 * Phase 2: DOM Adapter with Configuration Object
 *
 * This module creates a configurable layer between the HTML form elements
 * and the pure calculation engine. It eliminates hardcoded element IDs
 * and provides a clean interface for data collection.
 */

import {
  calculateRetirementProjection,
  validateRetirementParams,
  createDerivedParams,
  formatCurrency,
} from "./calculation-engine.js";

/**
 * Configuration object mapping logical field names to DOM element IDs
 * This allows us to easily change element IDs without touching calculation logic
 */
const DOM_FIELD_CONFIG = {
  // Personal Information
  currentAge: "currentAge",
  retireAge: "retireAge",
  endAge: "endAge",
  inflation: "inflation",
  spendingToday: "spendingToday",
  spendingDecline: "spendingDecline",

  // Spouse Information
  spouseAge: "spouseAge",
  spouseRetireAge: "spouseRetireAge",
  spouseSsMonthly: "spouseSsMonthly",
  spouseSsStart: "spouseSsStart",
  spouseSsCola: "spouseSsCola",
  spousePenMonthly: "spousePenMonthly",
  spousePenStart: "spousePenStart",
  spousePenCola: "spousePenCola",
  spouseTaxSS: "spouseTaxSS",
  spouseTaxPension: "spouseTaxPension",

  // Income and Contributions
  salary: "salary",
  salaryGrowth: "salaryGrowth",
  pretaxPct: "pretaxPct",
  rothPct: "rothPct",
  taxablePct: "taxablePct",
  matchCap: "matchCap",
  matchRate: "matchRate",

  // Account Balances
  balPre: "balPre",
  balRoth: "balRoth",
  balSavings: "balSavings",

  // Investment Returns
  retPre: "retPre",
  retRoth: "retRoth",
  retTax: "retTax",

  // Benefits
  ssMonthly: "ssMonthly",
  ssStart: "ssStart",
  ssCola: "ssCola",
  penMonthly: "penMonthly",
  penStart: "penStart",
  penCola: "penCola",

  // Tax Settings
  taxPre: "taxPre",
  taxTaxable: "taxTaxable",
  taxRoth: "taxRoth",
  taxSS: "taxSS",
  filingStatus: "filingStatus",
  useAgiTax: "useAgiTax",
  useSSRules: "useSSRules",
  useRMD: "useRMD",
  order: "order",
};

/**
 * Configuration for output elements (where results are displayed)
 */
const DOM_OUTPUT_CONFIG = {
  // KPI Elements
  kpiAge: "kpiAge",
  kpiEndBal: "kpiEndBal",
  kpiDraw: "kpiDraw",
  kpiTax: "kpiTax",

  // Result Tables
  rows: "rows",
  chart: "chart",

  // Detail Grids
  spendingDetailsGrid: "spendingDetailsGrid",
  taxableIncomeDetailsGrid: "taxableIncomeDetailsGrid",
  taxFreeIncomeDetailsGrid: "taxFreeIncomeDetailsGrid",

  // Buttons
  calcBtn: "calcBtn",
  pdfBtn: "pdfBtn",
  csvBtn: "csvBtn",
  exportJsonBtn: "exportJsonBtn",
  importJsonBtn: "importJsonBtn",
  clearBtn: "clearBtn",
  jsonFileInput: "jsonFileInput",

  // Checkboxes/Toggles
  useCurrentYearValues: "useCurrentYearValues",
  useTaxableCurrentYearValues: "useTaxableCurrentYearValues",
  useTaxFreeCurrentYearValues: "useTaxFreeCurrentYearValues",

  // Popups
  ssPopup: "ssPopup",
  ssBreakdownContent: "ssBreakdownContent",
};

/**
 * DOM Adapter class - provides clean interface to DOM operations
 */
class DOMAdapter {
  constructor(
    fieldConfig = DOM_FIELD_CONFIG,
    outputConfig = DOM_OUTPUT_CONFIG
  ) {
    this.fieldConfig = fieldConfig;
    this.outputConfig = outputConfig;
  }

  /**
   * Get element by logical field name
   */
  getElement(logicalName) {
    const elementId =
      this.fieldConfig[logicalName] || this.outputConfig[logicalName];
    if (!elementId) {
      throw new Error(`Unknown field: ${logicalName}`);
    }
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element not found: ${elementId} for field ${logicalName}`);
    }
    return element;
  }

  /**
   * Get numeric value from input field
   */
  getNumber(logicalName) {
    const element = this.getElement(logicalName);
    return element ? Number(element.value || 0) : 0;
  }

  /**
   * Get percentage value as decimal from input field
   */
  getPercentage(logicalName) {
    const value = this.getNumber(logicalName);
    return isNaN(value) ? 0 : value / 100;
  }

  /**
   * Get string value from input field
   */
  getString(logicalName) {
    const element = this.getElement(logicalName);
    return element ? element.value : "";
  }

  /**
   * Get boolean value from checkbox
   */
  getBoolean(logicalName) {
    const element = this.getElement(logicalName);
    return element ? element.checked : false;
  }

  /**
   * Set text content of an element
   */
  setText(logicalName, text) {
    const element = this.getElement(logicalName);
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Set HTML content of an element
   */
  setHTML(logicalName, html) {
    const element = this.getElement(logicalName);
    if (element) {
      element.innerHTML = html;
    }
  }

  /**
   * Set value of an input element
   */
  setValue(logicalName, value) {
    const element = this.getElement(logicalName);
    if (element) {
      element.value = value;
    }
  }

  /**
   * Set checked state of checkbox
   */
  setChecked(logicalName, checked) {
    const element = this.getElement(logicalName);
    if (element) {
      element.checked = checked;
    }
  }

  /**
   * Add event listener to an element
   */
  addEventListener(logicalName, eventType, handler) {
    const element = this.getElement(logicalName);
    if (element) {
      element.addEventListener(eventType, handler);
    }
  }

  /**
   * Clear content of an element
   */
  clear(logicalName) {
    const element = this.getElement(logicalName);
    if (element) {
      element.innerHTML = "";
    }
  }
}

/**
 * Form Data Collector - collects all form data using configuration
 */
class FormDataCollector {
  constructor(domAdapter) {
    this.dom = domAdapter;
  }

  /**
   * Collect all form data and return a parameters object for the calculation engine
   */
  collectFormData() {
    const params = {
      // Personal Information
      currentAge: this.dom.getNumber("currentAge"),
      retireAge: this.dom.getNumber("retireAge"),
      endAge: this.dom.getNumber("endAge"),
      inflation: this.dom.getPercentage("inflation"),
      spendingToday: this.dom.getNumber("spendingToday"),
      spendingDecline: this.dom.getPercentage("spendingDecline"),

      // Spouse Information
      spouseAge: this.dom.getNumber("spouseAge"),
      spouseRetireAge: this.dom.getNumber("spouseRetireAge"),
      spouseSsMonthly: this.dom.getNumber("spouseSsMonthly"),
      spouseSsStart: this.dom.getNumber("spouseSsStart"),
      spouseSsCola: this.dom.getPercentage("spouseSsCola"),
      spousePenMonthly: this.dom.getNumber("spousePenMonthly"),
      spousePenStart: this.dom.getNumber("spousePenStart"),
      spousePenCola: this.dom.getPercentage("spousePenCola"),
      spouseTaxSS: this.dom.getPercentage("spouseTaxSS"),
      spouseTaxPension: this.dom.getPercentage("spouseTaxPension"),

      // Income and Contributions
      startingSalary: this.dom.getNumber("salary"),
      salaryGrowth: this.dom.getPercentage("salaryGrowth"),
      pretaxPct: this.dom.getPercentage("pretaxPct"),
      rothPct: this.dom.getPercentage("rothPct"),
      taxablePct: this.dom.getPercentage("taxablePct"),
      matchCap: this.dom.getPercentage("matchCap"),
      matchRate: this.dom.getPercentage("matchRate"),

      // Account Balances
      balPre: this.dom.getNumber("balPre"),
      balRoth: this.dom.getNumber("balRoth"),
      balSavings: this.dom.getNumber("balSavings"),

      // Investment Returns
      retPre: this.dom.getPercentage("retPre"),
      retRoth: this.dom.getPercentage("retRoth"),
      retTax: this.dom.getPercentage("retTax"),

      // Benefits
      ssMonthly: this.dom.getNumber("ssMonthly"),
      ssStart: this.dom.getNumber("ssStart"),
      ssCola: this.dom.getPercentage("ssCola"),
      penMonthly: this.dom.getNumber("penMonthly"),
      penStart: this.dom.getNumber("penStart"),
      penCola: this.dom.getPercentage("penCola"),

      // Tax Settings
      taxPre: this.dom.getPercentage("taxPre"),
      taxTaxable: this.dom.getPercentage("taxTaxable"),
      taxRoth: this.dom.getPercentage("taxRoth"),
      taxSS: this.dom.getPercentage("taxSS"),
      filingStatus: this.dom.getString("filingStatus"),
      useAgiTax: this.dom.getBoolean("useAgiTax"),
      useSSRules: this.dom.getBoolean("useSSRules"),
      useRMD: this.dom.getBoolean("useRMD"),
    };

    // Handle order field (special case)
    const orderElement = this.dom.getElement("order");
    if (orderElement) {
      params.order = orderElement.value.split(",").map((s) => s.trim());
    }

    return params;
  }

  /**
   * Populate form fields from a parameters object
   */
  populateForm(params) {
    // Personal Information
    this.dom.setValue("currentAge", params.currentAge || "");
    this.dom.setValue("retireAge", params.retireAge || "");
    this.dom.setValue("endAge", params.endAge || "");
    this.dom.setValue("inflation", params.inflation * 100 || "");
    this.dom.setValue("spendingToday", params.spendingToday || "");
    this.dom.setValue("spendingDecline", params.spendingDecline * 100 || "");

    // Spouse Information
    this.dom.setValue("spouseAge", params.spouseAge || "");
    this.dom.setValue("spouseRetireAge", params.spouseRetireAge || "");
    this.dom.setValue("spouseSsMonthly", params.spouseSsMonthly || "");
    this.dom.setValue("spouseSsStart", params.spouseSsStart || "");
    this.dom.setValue("spouseSsCola", params.spouseSsCola * 100 || "");
    this.dom.setValue("spousePenMonthly", params.spousePenMonthly || "");
    this.dom.setValue("spousePenStart", params.spousePenStart || "");
    this.dom.setValue("spousePenCola", params.spousePenCola * 100 || "");
    this.dom.setValue("spouseTaxSS", params.spouseTaxSS * 100 || "");
    this.dom.setValue("spouseTaxPension", params.spouseTaxPension * 100 || "");

    // Income and Contributions
    this.dom.setValue("salary", params.startingSalary || "");
    this.dom.setValue("salaryGrowth", params.salaryGrowth * 100 || "");
    this.dom.setValue("pretaxPct", params.pretaxPct * 100 || "");
    this.dom.setValue("rothPct", params.rothPct * 100 || "");
    this.dom.setValue("taxablePct", params.taxablePct * 100 || "");
    this.dom.setValue("matchCap", params.matchCap * 100 || "");
    this.dom.setValue("matchRate", params.matchRate * 100 || "");

    // Account Balances
    this.dom.setValue("balPre", params.balPre || "");
    this.dom.setValue("balRoth", params.balRoth || "");
    this.dom.setValue("balSavings", params.balSavings || "");

    // Investment Returns
    this.dom.setValue("retPre", params.retPre * 100 || "");
    this.dom.setValue("retRoth", params.retRoth * 100 || "");
    this.dom.setValue("retTax", params.retTax * 100 || "");

    // Benefits
    this.dom.setValue("ssMonthly", params.ssMonthly || "");
    this.dom.setValue("ssStart", params.ssStart || "");
    this.dom.setValue("ssCola", params.ssCola * 100 || "");
    this.dom.setValue("penMonthly", params.penMonthly || "");
    this.dom.setValue("penStart", params.penStart || "");
    this.dom.setValue("penCola", params.penCola * 100 || "");

    // Tax Settings
    this.dom.setValue("taxPre", params.taxPre * 100 || "");
    this.dom.setValue("taxTaxable", params.taxTaxable * 100 || "");
    this.dom.setValue("taxRoth", params.taxRoth * 100 || "");
    this.dom.setValue("taxSS", params.taxSS * 100 || "");
    this.dom.setValue("filingStatus", params.filingStatus || "single");
    this.dom.setChecked("useAgiTax", params.useAgiTax || false);
    this.dom.setChecked("useSSRules", params.useSSRules || false);
    this.dom.setChecked("useRMD", params.useRMD || false);

    // Handle order field
    if (params.order) {
      this.dom.setValue("order", params.order.join(","));
    }
  }
}

/**
 * Results Displayer - handles displaying calculation results
 */
class ResultsDisplayer {
  constructor(domAdapter) {
    this.dom = domAdapter;
  }

  /**
   * Display KPI results
   */
  displayKPIs(results, params) {
    if (!results.success) {
      this.clearKPIs();
      return;
    }

    const lastYear = results.yearlyResults[results.yearlyResults.length - 1];
    const fundedTo = this.calculateFundedToAge(results.yearlyResults, params);

    // Display funded-to age with status pill
    const status = fundedTo >= params.endAge ? "success" : "warning";
    this.dom.setHTML(
      "kpiAge",
      `${fundedTo} <span class="pill ${status}">${
        status === "success" ? "Funded" : "Short"
      }</span>`
    );

    // Display ending balance
    this.dom.setText(
      "kpiEndBal",
      formatCurrency(Math.max(0, lastYear.totalBalance))
    );

    // Display retirement age
    this.dom.setText("kpiDraw", `${params.retireAge}`);

    // Display total taxes (simplified for now)
    const totalTaxes = results.yearlyResults.reduce(
      (sum, year) => sum + (year.taxes?.federal || 0),
      0
    );
    this.dom.setText("kpiTax", formatCurrency(totalTaxes));
  }

  /**
   * Clear KPI displays
   */
  clearKPIs() {
    this.dom.setText("kpiAge", "—");
    this.dom.setText("kpiEndBal", "—");
    this.dom.setText("kpiDraw", "—");
    this.dom.setText("kpiTax", "—");
  }

  /**
   * Calculate the age when funds run out (simplified)
   */
  calculateFundedToAge(yearlyResults, params) {
    // Find the last year with positive balance
    for (let i = yearlyResults.length - 1; i >= 0; i--) {
      if (yearlyResults[i].totalBalance > 0) {
        return params.currentAge + i;
      }
    }
    return params.currentAge;
  }

  /**
   * Display detailed results table (placeholder for now)
   */
  displayResultsTable(results) {
    // This would integrate with the existing table display logic
    // For now, just clear the table
    this.dom.clear("rows");
  }

  /**
   * Display error messages
   */
  displayErrors(errors) {
    // This could be enhanced to show errors in a specific element
    console.error("Calculation errors:", errors);
    alert("Calculation errors: " + errors.join(", "));
  }
}

/**
 * Retirement Calculator Controller - coordinates the entire calculation process
 */
class RetirementCalculatorController {
  constructor() {
    this.domAdapter = new DOMAdapter();
    this.formCollector = new FormDataCollector(this.domAdapter);
    this.resultsDisplayer = new ResultsDisplayer(this.domAdapter);
  }

  /**
   * Initialize the controller and set up event listeners
   */
  initialize() {
    // Set up calculation button
    this.domAdapter.addEventListener("calcBtn", "click", () =>
      this.calculate()
    );

    // Set up other buttons (placeholders for now)
    this.domAdapter.addEventListener("clearBtn", "click", () =>
      this.resetForm()
    );
    this.domAdapter.addEventListener("exportJsonBtn", "click", () =>
      this.exportJSON()
    );
    this.domAdapter.addEventListener("importJsonBtn", "click", () =>
      this.importJSON()
    );

    console.log("Phase 2: Retirement Calculator Controller initialized");
  }

  /**
   * Main calculation method - uses pure calculation engine
   */
  calculate() {
    try {
      // Collect form data using configuration
      const params = this.formCollector.collectFormData();

      // Validate parameters
      const validation = validateRetirementParams(params);
      if (!validation.isValid) {
        this.resultsDisplayer.displayErrors(validation.errors);
        return;
      }

      // Run calculation using pure engine
      const results = calculateRetirementProjection(params);

      if (results.success) {
        // Display results using configuration
        this.resultsDisplayer.displayKPIs(results, params);
        this.resultsDisplayer.displayResultsTable(results);
        console.log("Calculation completed successfully");
      } else {
        this.resultsDisplayer.displayErrors(results.errors);
      }
    } catch (error) {
      console.error("Calculation error:", error);
      this.resultsDisplayer.displayErrors(["Unexpected calculation error"]);
    }
  }

  /**
   * Reset form to default values
   */
  resetForm() {
    const defaultParams = {
      filingStatus: "single",
      order: ["taxable", "pretax", "roth"],
      useAgiTax: false,
      useSSRules: false,
      useRMD: false,
    };

    this.formCollector.populateForm(defaultParams);
    this.resultsDisplayer.clearKPIs();
    this.resultsDisplayer.displayResultsTable({ yearlyResults: [] });
  }

  /**
   * Export current form data as JSON
   */
  exportJSON() {
    const params = this.formCollector.collectFormData();
    const jsonString = JSON.stringify(params, null, 2);

    // Create download link
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retirement-parameters.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Import form data from JSON
   */
  importJSON() {
    const fileInput = this.domAdapter.getElement("jsonFileInput");
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * Handle JSON file import
   */
  handleJSONFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const params = JSON.parse(e.target.result);
        this.formCollector.populateForm(params);
        console.log("JSON data imported successfully");
      } catch (error) {
        console.error("Error importing JSON:", error);
        alert("Error importing JSON file");
      }
    };
    reader.readAsText(file);
  }
}

// Export for use in the main application
export {
  DOMAdapter,
  FormDataCollector,
  ResultsDisplayer,
  RetirementCalculatorController,
  DOM_FIELD_CONFIG,
  DOM_OUTPUT_CONFIG,
};
