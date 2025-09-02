/**
 * Phase 3: Event-Driven Integration
 *
 * This module integrates the event-driven system with the existing
 * DOM adapter (Phase 2) and calculation engine (Phase 1), creating
 * a complete reactive retirement calculator.
 */

import {
  EventDrivenCalculatorController,
  EVENT_TYPES,
} from "./event-system.js";
import { ReactiveUIManager } from "./reactive-ui.js";
import {
  DOMAdapter,
  FormDataCollector,
  DOM_FIELD_CONFIG,
} from "./dom-adapter.js";

/**
 * Event-Driven Form Controller
 * Bridges form interactions with the event system
 */
class EventDrivenFormController {
  constructor(eventEmitter, domAdapter) {
    this.eventEmitter = eventEmitter;
    this.domAdapter = domAdapter;
    this.formCollector = new FormDataCollector(domAdapter);
    this.debounceTimeout = null;
    this.watchedFields = new Set();

    // Demo-specific field mapping
    this.demoFieldMap = {
      currentAge: "currentAge",
      retireAge: "retireAge",
      endAge: "endAge",
      currentSalary: "currentSalary",
      currentSavings: "currentSavings",
      monthlyExpenses: "monthlyExpenses",
      salaryGrowthRate: "salaryGrowthRate",
      inflationRate: "inflationRate",
      currentContribution: "currentContribution",
      employerMatch: "employerMatch",
      employerMatchLimit: "employerMatchLimit",
    };

    this.setupFormEventListeners();
  }

  /**
   * Set up form event listeners for reactive updates
   */
  setupFormEventListeners() {
    // Watch all demo form fields
    Object.keys(this.demoFieldMap).forEach((fieldName) => {
      this.watchField(fieldName);
    });

    // Listen for reset events
    this.eventEmitter.on(EVENT_TYPES.FORM_RESET, () => {
      this.resetForm();
    });

    console.log(
      `📝 Form controller watching ${this.watchedFields.size} fields`
    );
  }

  /**
   * Watch a specific field for changes
   */
  watchField(fieldName) {
    try {
      // Use direct DOM access for demo fields
      const element = document.getElementById(fieldName);
      if (!element) {
        console.warn(`Cannot watch field: ${fieldName} (element not found)`);
        return;
      }

      // Add to watched fields
      this.watchedFields.add(fieldName);

      // Set up event listeners based on element type
      const eventType = this.getEventTypeForElement(element);

      element.addEventListener(eventType, (event) => {
        this.handleFieldChange(fieldName, element, event);
      });

      // Also listen for 'input' event for real-time updates
      if (eventType !== "input") {
        element.addEventListener("input", (event) => {
          this.handleFieldChange(fieldName, element, event);
        });
      }
    } catch (error) {
      console.warn(`⚠️ Could not watch field: ${fieldName}`, error);
    }
  }

  /**
   * Get appropriate event type for an element
   */
  getEventTypeForElement(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();

    if (tagName === "select") return "change";
    if (type === "checkbox" || type === "radio") return "change";
    if (type === "number" || type === "range") return "input";
    return "input"; // Default to input for text fields
  }

  /**
   * Handle field change events
   */
  handleFieldChange(fieldName, element, event) {
    const value = this.getElementValue(element);

    console.log(`🔄 Field changed: ${fieldName} = ${value}`);

    this.eventEmitter.emit(EVENT_TYPES.FIELD_CHANGED, {
      fieldName: fieldName,
      value: value,
      timestamp: Date.now(),
    });

    // Trigger debounced form data change
    this.debounceFormDataChange();
  }
  /**
   * Get value from form element
   */
  getElementValue(element) {
    console.log(
      "🚀 ENTERING getElementValue method - EventDrivenFormController version"
    );

    if (!element) {
      console.warn("getElementValue called with null/undefined element");
      return null;
    }

    console.log(`🔍 Element passed to getElementValue:`, element);
    console.log(
      `🔍 Element.id: "${element.id}", Element.value: "${element.value}"`
    );

    const type = element.type?.toLowerCase();
    const rawValue = element.value;

    console.log(
      `🔍 getElementValue debug: id="${
        element.id
      }", type="${type}", rawValue="${rawValue}", rawValue===''=${
        rawValue === ""
      }, rawValue===null=${rawValue === null}, rawValue===undefined=${
        rawValue === undefined
      }`
    );

    let value;
    if (type === "checkbox") {
      value = element.checked;
    } else if (type === "number") {
      // Handle empty string for number inputs - but let's be more explicit
      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        console.log(
          `⚠️ Number field ${element.id} has empty rawValue, defaulting to 0`
        );
        value = 0;
      } else {
        value = Number(rawValue);
        console.log(
          `🔢 Number conversion: "${rawValue}" -> ${value}, isNaN=${isNaN(
            value
          )}`
        );
      }
    } else {
      value = rawValue;
    }

    console.log(
      `📖 Final result for ${element.id}: ${value} (type: ${typeof value})`
    );
    return value;
  }

  /**
   * Debounced form data change emission
   */
  debounceFormDataChange() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      try {
        console.log("⏱️ Debounced form data change triggered");

        // Get raw form data and convert to calculation parameters
        const rawFormData = this.getCustomFormData();
        const formData = this.convertToCalculationParams(rawFormData);

        console.log("📤 Emitting FORM_DATA_CHANGED event with data:", formData);

        this.eventEmitter.emit(EVENT_TYPES.FORM_DATA_CHANGED, {
          formData: formData,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Error collecting form data:", error);
      }
    }, 300); // 300ms debounce
  }

  /**
   * Custom form data collection for demo
   */
  getCustomFormData() {
    const data = {};
    console.log(
      "🔍 Collecting form data from fields:",
      Object.keys(this.demoFieldMap)
    );
    console.log("🔍 DOM ready state:", document.readyState);

    Object.keys(this.demoFieldMap).forEach((fieldName) => {
      try {
        const element = document.getElementById(fieldName);
        if (element) {
          const value = this.getElementValue(element);
          data[fieldName] = value;
          console.log(
            `📝 ${fieldName}: ${value} (type: ${typeof value}, element.value: "${
              element.value
            }")`
          );
        } else {
          console.warn(`⚠️ Element not found: ${fieldName}`);
        }
      } catch (error) {
        console.warn(`Could not get value for ${fieldName}:`, error);
      }
    });

    console.log("📋 Complete form data:", data);
    return data;
  }

  /**
   * Convert raw demo form data to calculation parameters
   */
  convertToCalculationParams(demoData) {
    const params = {
      // Required validation parameters
      currentAge: demoData.currentAge || 30,
      retireAge: demoData.retireAge || 65,
      endAge: demoData.endAge || 90,

      // Financial parameters with proper conversions
      inflation: (demoData.inflationRate || 2.5) / 100, // Percentage to decimal
      spendingToday: (demoData.monthlyExpenses || 4000) * 12, // Monthly to annual
      spendingDecline: 0, // Default

      // Income and salary
      startingSalary: demoData.currentSalary || 75000,
      salaryGrowth: (demoData.salaryGrowthRate || 3) / 100, // Percentage to decimal

      // 401k contributions (convert percentages to decimals)
      pretaxPct: (demoData.currentContribution || 10) / 100,
      rothPct: 0, // Default for demo
      taxablePct: 0, // Default for demo

      // Employer match
      matchRate: (demoData.employerMatch || 50) / 100, // Percentage to decimal
      matchCap: (demoData.employerMatchLimit || 6) / 100, // Percentage to decimal

      // Starting balances
      balPre: demoData.currentSavings || 15000,
      balRoth: 0, // Default for demo
      balSavings: 0, // Default for demo

      // Investment returns (defaults)
      retPre: 0.07, // 7% default return
      retRoth: 0.07, // 7% default return
      retTax: 0.05, // 5% default return for taxable accounts

      // Social Security (defaults for demo)
      ssMonthly: 0, // Will be calculated
      ssStart: Math.max(62, demoData.retireAge || 65),
      ssCola: 0.025, // 2.5% COLA

      // Pension (defaults)
      penMonthly: 0,
      penStart: demoData.retireAge || 65,
      penCola: 0,

      // Tax settings (defaults)
      taxPre: 0.22, // 22% tax rate on pre-tax withdrawals
      taxTaxable: 0.15, // 15% tax rate on taxable account gains
      taxRoth: 0, // 0% tax on Roth withdrawals
      taxSS: 0.15, // 15% tax on Social Security
      filingStatus: "single",
      useAgiTax: false,
      useSSRules: true,
      useRMD: true,
      order: "pretax_first",

      // Spouse defaults (not used in demo)
      spouseAge: 0,
      spouseRetireAge: 0,
      spouseSsMonthly: 0,
      spouseSsStart: 0,
      spouseSsCola: 0,
      spousePenMonthly: 0,
      spousePenStart: 0,
      spousePenCola: 0,
      spouseTaxSS: 0,
      spouseTaxPension: 0,
    };

    // Calculate working years for debugging
    const workingYears = params.retireAge - params.currentAge;

    console.log("🔢 Key calculation parameters:");
    console.log(`📅 Current Age: ${params.currentAge}`);
    console.log(`🎯 Retirement Age: ${params.retireAge}`);
    console.log(`⏰ Working Years: ${workingYears}`);
    console.log(`💰 Starting Salary: ${params.startingSalary}`);
    console.log(`🏦 Current Savings: ${params.balPre}`);
    console.log(`📈 Contribution Rate: ${params.pretaxPct * 100}%`);
    console.log(`🔄 Salary Growth: ${params.salaryGrowth * 100}%`);
    console.log(`📊 Investment Return: ${params.retPre * 100}%`);

    return params;
  }

  /**
   * Reset form to default values
   */
  resetForm() {
    // Reset all watched fields to their default values
    this.watchedFields.forEach((fieldName) => {
      try {
        const element = document.getElementById(fieldName);
        if (element) {
          const type = element.type?.toLowerCase();

          if (type === "checkbox") {
            element.checked = false;
          } else {
            element.value = "";
          }

          delete element.dataset.previousValue;
        }
      } catch (error) {
        console.warn(`⚠️ Could not reset field: ${fieldName}`, error);
      }
    });

    console.log("🔄 Form reset completed");
  }

  /**
   * Get current form data with demo-specific mapping
   */
  getCurrentFormData() {
    // For demo, create a simplified mapping from our demo form to calculation parameters
    try {
      const demoData = {
        currentAge: this.getFieldValue("currentAge") || 30,
        retireAge: this.getFieldValue("retireAge") || 65,
        endAge: this.getFieldValue("endAge") || 90,
        inflation: (this.getFieldValue("inflationRate") || 2.5) / 100, // Convert percentage to decimal
        spendingToday: this.getFieldValue("monthlyExpenses") * 12 || 48000, // Monthly to annual
        spendingDecline: 0, // Default to 0

        // Income and salary
        startingSalary: this.getFieldValue("currentSalary") || 75000,
        salaryGrowth: (this.getFieldValue("salaryGrowthRate") || 3) / 100, // Convert percentage to decimal

        // 401k contributions (convert percentages to decimals)
        pretaxPct: (this.getFieldValue("currentContribution") || 10) / 100,
        rothPct: 0, // Default to 0 for demo
        taxablePct: 0, // Default to 0 for demo

        // Employer match
        matchRate: (this.getFieldValue("employerMatch") || 50) / 100, // Convert percentage to decimal
        matchCap: (this.getFieldValue("employerMatchLimit") || 6) / 100, // Convert percentage to decimal

        // Starting balances
        balPre: this.getFieldValue("currentSavings") || 15000,
        balRoth: 0, // Default to 0 for demo
        balSavings: 0, // Default to 0 for demo

        // Investment returns (defaults)
        retPre: 0.07, // 7% default return
        retRoth: 0.07, // 7% default return
        retTax: 0.05, // 5% default return for taxable accounts

        // Social Security (defaults for demo)
        ssMonthly: 0, // Will be calculated
        ssStart: Math.max(62, this.getFieldValue("retireAge") || 65),
        ssCola: 0.025, // 2.5% COLA

        // Pension (defaults)
        penMonthly: 0,
        penStart: this.getFieldValue("retireAge") || 65,
        penCola: 0,

        // Tax settings (defaults)
        taxPre: 0.22, // 22% tax rate on pre-tax withdrawals
        taxTaxable: 0.15, // 15% tax rate on taxable account gains
        taxRoth: 0, // 0% tax on Roth withdrawals
        taxSS: 0.15, // 15% tax on Social Security
        filingStatus: "single",
        useAgiTax: false,
        useSSRules: true,
        useRMD: true,
        order: "pretax_first",

        // Spouse defaults (not used in demo)
        spouseAge: 0,
        spouseRetireAge: 0,
        spouseSsMonthly: 0,
        spouseSsStart: 0,
        spouseSsCola: 0,
        spousePenMonthly: 0,
        spousePenStart: 0,
        spousePenCola: 0,
        spouseTaxSS: 0,
        spouseTaxPension: 0,
      };

      return demoData;
    } catch (error) {
      console.error("Error collecting demo form data:", error);
      // Return default values if there's an error
      return this.getDefaultDemoData();
    }
  }

  /**
   * Get default demo data for fallback
   */
  getDefaultDemoData() {
    return {
      currentAge: 30,
      retireAge: 65,
      endAge: 90,
      inflation: 0.025,
      spendingToday: 48000,
      spendingDecline: 0,
      startingSalary: 75000,
      salaryGrowth: 0.03,
      pretaxPct: 0.1,
      rothPct: 0,
      taxablePct: 0,
      matchRate: 0.5,
      matchCap: 0.06,
      balPre: 15000,
      balRoth: 0,
      balSavings: 0,
      retPre: 0.07,
      retRoth: 0.07,
      retTax: 0.05,
      ssMonthly: 0,
      ssStart: 65,
      ssCola: 0.025,
      penMonthly: 0,
      penStart: 65,
      penCola: 0,
      taxPre: 0.22,
      taxTaxable: 0.15,
      taxRoth: 0,
      taxSS: 0.15,
      filingStatus: "single",
      useAgiTax: false,
      useSSRules: true,
      useRMD: true,
      order: "pretax_first",
      spouseAge: 0,
      spouseRetireAge: 0,
      spouseSsMonthly: 0,
      spouseSsStart: 0,
      spouseSsCola: 0,
      spousePenMonthly: 0,
      spousePenStart: 0,
      spousePenCola: 0,
      spouseTaxSS: 0,
      spouseTaxPension: 0,
    };
  }

  /**
   * Get field value helper method
   */
  getFieldValue(fieldName) {
    try {
      const element = this.domAdapter.getElement(fieldName);
      if (!element) return null;

      const type = element.type?.toLowerCase();
      if (type === "checkbox") return element.checked;
      if (type === "number") return Number(element.value || 0);
      return element.value;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current form data (legacy method - now redirects to demo-specific version)
   */
  getCurrentFormData_Original() {
    return this.formCollector.collectFormData();
  }

  /**
   * Programmatically set field value and trigger events
   */
  setFieldValue(fieldName, value) {
    try {
      // Use direct DOM access for demo fields
      const element = document.getElementById(fieldName);
      if (!element) {
        console.warn(`Field not found: ${fieldName}`);
        return false;
      }

      console.log(`🔧 setFieldValue: ${fieldName} = ${value}`);
      console.log(`🔍 Element before setting:`, element);
      console.log(`🔍 Element.value before: "${element.value}"`);

      const oldValue = this.getElementValue(element);
      console.log(`📝 Old value: ${oldValue}`);

      // Set the value
      if (element.type?.toLowerCase() === "checkbox") {
        element.checked = Boolean(value);
        console.log(`✅ Set checkbox ${fieldName} to ${element.checked}`);
      } else {
        element.value = value;
        console.log(`✅ Set ${fieldName} element.value to "${element.value}"`);
      }

      // Verify the value was set
      const newValue = this.getElementValue(element);
      console.log(`🔍 New value after setting: ${newValue}`);

      // Trigger change event
      this.handleFieldChange(fieldName, element, { type: "programmatic" });

      return true;
    } catch (error) {
      console.error(`Error setting field value for ${fieldName}:`, error);
      return false;
    }
  }
}

/**
 * Complete Event-Driven Retirement Calculator
 * Integrates all phases for a fully reactive experience
 */
class EventDrivenRetirementCalculator {
  constructor() {
    this.calculatorController = new EventDrivenCalculatorController();
    this.uiManager = new ReactiveUIManager(
      this.calculatorController.eventEmitter
    );
    this.domAdapter = new DOMAdapter();
    this.formController = new EventDrivenFormController(
      this.calculatorController.eventEmitter,
      this.domAdapter
    );

    this.isInitialized = false;
    this.setupIntegrationEventListeners();
  }

  /**
   * Set up integration event listeners
   */
  setupIntegrationEventListeners() {
    const emitter = this.calculatorController.eventEmitter;

    // Auto-calculate when form data changes (if enabled)
    emitter.on(EVENT_TYPES.FORM_DATA_CHANGED, (data) => {
      const autoCalcEnabled =
        this.calculatorController.getCalculationState().autoCalculate;
      console.log(
        `📊 FORM_DATA_CHANGED received. Auto-calc enabled: ${autoCalcEnabled}`
      );

      if (autoCalcEnabled) {
        console.log("🚀 Triggering auto-calculation");
        this.calculate(data.formData);
      } else {
        console.log("⏸️ Auto-calculation disabled, skipping");
      }
    });

    // Handle button clicks
    this.setupButtonEventListeners();

    // Handle file operations
    this.setupFileEventListeners();

    console.log("🔗 Event-driven integration set up");
  }

  /**
   * Set up button event listeners
   */
  setupButtonEventListeners() {
    const buttons = {
      calcBtn: () => this.triggerCalculation(),
      clearBtn: () => this.resetAll(),
      pdfBtn: () => this.exportPDF(),
      csvBtn: () => this.exportCSV(),
      exportJsonBtn: () => this.exportJSON(),
      importJsonBtn: () => this.importJSON(),
    };

    Object.entries(buttons).forEach(([buttonId, handler]) => {
      try {
        const button = this.domAdapter.getElement(buttonId);
        if (button) {
          button.addEventListener("click", handler);
          console.log(`🔘 Event-driven button set up: ${buttonId}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not set up button: ${buttonId}`, error);
      }
    });
  }

  /**
   * Set up file operation event listeners
   */
  setupFileEventListeners() {
    const emitter = this.calculatorController.eventEmitter;

    emitter.on(EVENT_TYPES.FILE_EXPORTED, (data) => {
      emitter.emit(EVENT_TYPES.SUCCESS_MESSAGE, {
        message: `File exported: ${data.filename}`,
        duration: 3000,
      });
    });

    emitter.on(EVENT_TYPES.FILE_IMPORTED, (data) => {
      emitter.emit(EVENT_TYPES.SUCCESS_MESSAGE, {
        message: `File imported: ${data.filename}`,
        duration: 3000,
      });
    });
  }

  /**
   * Initialize the complete system
   */
  initialize() {
    if (this.isInitialized) {
      console.log("⚠️ System already initialized");
      return this;
    }

    // Initialize reactive UI components
    this.uiManager.initializeStandardComponents();

    // Enable auto-calculation by default
    this.calculatorController.enableAutoCalculate();

    this.isInitialized = true;

    console.log("🎉 Event-Driven Retirement Calculator initialized!");
    console.log("📊 System status:", this.getSystemStatus());

    return this;
  }

  /**
   * Trigger calculation manually
   */
  async triggerCalculation() {
    console.log("🔥 Manual calculation triggered");
    try {
      // Get raw form data instead of converted parameters
      const rawFormData = this.formController.getCustomFormData();
      console.log("📝 Raw form data collected:", rawFormData);
      await this.calculate(rawFormData);
      console.log("✅ Manual calculation completed");
    } catch (error) {
      console.error("Manual calculation failed:", error);
    }
  }

  /**
   * Perform calculation
   */
  async calculate(formData) {
    try {
      // Convert raw form data to calculation parameters
      const calculationParams =
        this.formController.convertToCalculationParams(formData);
      console.log("🔄 Raw form data:", formData);
      console.log("🔄 Converted calculation parameters:", calculationParams);

      // Validate the parameters before calculation
      if (!calculationParams.currentAge || calculationParams.currentAge <= 0) {
        console.warn("⚠️ Invalid currentAge:", calculationParams.currentAge);
      }
      if (
        !calculationParams.startingSalary ||
        calculationParams.startingSalary <= 0
      ) {
        console.warn(
          "⚠️ Invalid startingSalary:",
          calculationParams.startingSalary
        );
      }

      const results = await this.calculatorController.startCalculation(
        calculationParams
      );
      console.log("📊 Calculation results received:", results);
      return results;
    } catch (error) {
      console.error("Calculation failed:", error);
      throw error;
    }
  }

  /**
   * Reset the entire system
   */
  resetAll() {
    this.calculatorController.reset();
    console.log("🔄 Complete system reset");
  }

  /**
   * Export PDF (placeholder)
   */
  exportPDF() {
    console.log("📄 PDF export requested");

    const results = this.calculatorController.lastResults;
    if (!results) {
      this.calculatorController.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
        message:
          "No calculation results to export. Please run a calculation first.",
      });
      return;
    }

    // Emit file export event
    this.calculatorController.eventEmitter.emit(EVENT_TYPES.FILE_EXPORTED, {
      type: "pdf",
      filename: "retirement-projection.pdf",
      timestamp: Date.now(),
    });

    // TODO: Integrate with actual PDF generation
  }

  /**
   * Export CSV (placeholder)
   */
  exportCSV() {
    console.log("📊 CSV export requested");

    const results = this.calculatorController.lastResults;
    if (!results) {
      this.calculatorController.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
        message:
          "No calculation results to export. Please run a calculation first.",
      });
      return;
    }

    // Emit file export event
    this.calculatorController.eventEmitter.emit(EVENT_TYPES.FILE_EXPORTED, {
      type: "csv",
      filename: "retirement-data.csv",
      timestamp: Date.now(),
    });

    // TODO: Integrate with actual CSV generation
  }

  /**
   * Export JSON
   */
  exportJSON() {
    try {
      const formData = this.formController.getCurrentFormData();
      const stateData = this.calculatorController.exportState();

      const exportData = {
        formData: formData,
        state: stateData,
        version: "3.0",
        timestamp: Date.now(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      // Create download
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "retirement-data.json";
      a.click();
      URL.revokeObjectURL(url);

      // Emit export event
      this.calculatorController.eventEmitter.emit(EVENT_TYPES.FILE_EXPORTED, {
        type: "json",
        filename: "retirement-data.json",
        size: jsonString.length,
      });
    } catch (error) {
      this.calculatorController.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
        message: "Failed to export JSON: " + error.message,
      });
    }
  }

  /**
   * Import JSON (placeholder for file input)
   */
  importJSON() {
    console.log("📥 JSON import requested");

    // TODO: Integrate with file input handling
    this.calculatorController.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
      message: "JSON import not yet implemented in Phase 3",
    });
  }

  /**
   * Enable/disable auto-calculation
   */
  setAutoCalculate(enabled) {
    if (enabled) {
      this.calculatorController.enableAutoCalculate();
    } else {
      this.calculatorController.disableAutoCalculate();
    }

    console.log(`🔄 Auto-calculation ${enabled ? "enabled" : "disabled"}`);
    return this;
  }

  /**
   * Set field value programmatically
   */
  setField(fieldName, value) {
    return this.formController.setFieldValue(fieldName, value);
  }

  /**
   * Get current form data
   */
  getFormData() {
    return this.formController.getCurrentFormData();
  }

  /**
   * Get calculation results
   */
  getResults() {
    return this.calculatorController.lastResults;
  }

  /**
   * Get system status for debugging
   */
  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      calculation: this.calculatorController.getCalculationState(),
      ui: this.uiManager.getStatus(),
      watchedFields: this.formController.watchedFields.size,
      version: "Phase 3 - Event-Driven",
    };
  }

  /**
   * Destroy the entire system
   */
  destroy() {
    this.uiManager.destroyAll();
    this.calculatorController.destroy();
    this.isInitialized = false;

    console.log("💀 Event-driven calculator destroyed");
  }
}

/**
 * Auto-initialization when DOM is ready
 */
function initializeEventDrivenCalculator() {
  if (typeof window === "undefined") {
    // Not in browser environment
    return null;
  }

  let calculator = null;

  const init = () => {
    calculator = new EventDrivenRetirementCalculator();
    calculator.initialize();

    // Make available globally for debugging
    window.eventDrivenCalculator = calculator;

    console.log("🚀 Event-driven calculator auto-initialized");
    return calculator;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    calculator = init();
  }

  return calculator;
}

// Auto-initialize if in browser
if (typeof window !== "undefined") {
  initializeEventDrivenCalculator();
}

export {
  EventDrivenFormController,
  EventDrivenRetirementCalculator,
  initializeEventDrivenCalculator,
};
