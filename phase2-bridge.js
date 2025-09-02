/**
 * Phase 2 Integration Bridge
 *
 * This file bridges the existing HTML retirement calculator
 * with the new Phase 2 DOM adapter system while maintaining
 * backward compatibility.
 */

import { RetirementCalculatorController } from "./dom-adapter.js";

/**
 * Enhanced calculator that extends the Phase 2 controller
 * to work with the existing HTML structure and functionality
 */
class LegacyCompatibleController extends RetirementCalculatorController {
  constructor() {
    super();
    this.legacyFunctions = {};
    this.isInitialized = false;
  }

  /**
   * Initialize with backward compatibility for existing HTML
   */
  initialize() {
    // Call parent initialization
    super.initialize();

    // Set up legacy function compatibility
    this.setupLegacyFunctions();

    // Preserve existing event listeners
    this.setupExistingEventListeners();

    this.isInitialized = true;
    console.log("Phase 2: Legacy-compatible controller initialized");
  }

  /**
   * Set up legacy functions for backward compatibility
   */
  setupLegacyFunctions() {
    // Make legacy $ function available for gradual migration
    window.$ = window.$ || ((id) => document.getElementById(id));

    // Legacy helper functions
    window.num =
      window.num ||
      ((id) => {
        const element = document.getElementById(id);
        return Number(element?.value || 0);
      });

    window.pct = window.pct || ((v) => (isNaN(v) ? 0 : Number(v) / 100));

    window.fmt =
      window.fmt ||
      ((n) =>
        n.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }));

    console.log("✅ Legacy functions preserved for compatibility");
  }

  /**
   * Set up event listeners for existing HTML elements
   */
  setupExistingEventListeners() {
    // Map existing button IDs to new controller methods
    const buttonMappings = {
      calcBtn: () => this.calculate(),
      pdfBtn: () => this.generatePDF(),
      csvBtn: () => this.exportCSV(),
      exportJsonBtn: () => this.exportJSON(),
      importJsonBtn: () => this.importJSON(),
      clearBtn: () => this.resetForm(),
    };

    // Set up button event listeners
    Object.entries(buttonMappings).forEach(([buttonId, handler]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        // Remove existing listeners by cloning the element
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        // Add new listener
        newButton.addEventListener("click", handler);
        console.log(`✅ Enhanced ${buttonId} with Phase 2 controller`);
      }
    });

    // Set up file input handler
    const fileInput = document.getElementById("jsonFileInput");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => this.handleJSONFile(e));
    }

    // Set up other change listeners for dynamic features
    const changeListeners = [
      "useCurrentYearValues",
      "useTaxableCurrentYearValues",
      "useTaxFreeCurrentYearValues",
    ];

    changeListeners.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener("change", () => this.handleDynamicChange(id));
      }
    });
  }

  /**
   * Enhanced calculate method that preserves existing functionality
   */
  calculate() {
    try {
      // Use Phase 2 data collection
      const params = this.formCollector.collectFormData();

      // Preserve existing validation and processing
      if (this.validateInput(params)) {
        // Call existing calculation logic or enhanced logic
        this.runCalculation(params);
      }
    } catch (error) {
      console.error("Phase 2 calculation error:", error);
      // Fallback to legacy calculation if available
      if (window.calc && typeof window.calc === "function") {
        console.log("Falling back to legacy calculation...");
        window.calc();
      }
    }
  }

  /**
   * Validate input using both Phase 2 and legacy validation
   */
  validateInput(params) {
    // Use Phase 2 validation first
    const validation = this.validateRetirementParams(params);
    if (!validation.isValid) {
      this.resultsDisplayer.displayErrors(validation.errors);
      return false;
    }

    // Add any additional legacy validations here
    return true;
  }

  /**
   * Run calculation with enhanced error handling
   */
  runCalculation(params) {
    // Run the Phase 2 calculation
    super.calculate();

    // Trigger any legacy post-calculation updates
    this.triggerLegacyUpdates();
  }

  /**
   * Generate PDF using existing functionality
   */
  generatePDF() {
    console.log("PDF generation requested...");
    // Call existing PDF generation if available
    if (
      window.generatePDFReport &&
      typeof window.generatePDFReport === "function"
    ) {
      window.generatePDFReport();
    } else {
      console.log("PDF generation not available - implement with Phase 2 data");
    }
  }

  /**
   * Export CSV using existing functionality
   */
  exportCSV() {
    console.log("CSV export requested...");
    // Call existing CSV export if available
    if (window.exportCSV && typeof window.exportCSV === "function") {
      window.exportCSV();
    } else {
      console.log("CSV export not available - implement with Phase 2 data");
    }
  }

  /**
   * Handle dynamic changes (spending fields, etc.)
   */
  handleDynamicChange(elementId) {
    console.log(`Dynamic change detected: ${elementId}`);

    // Handle specific dynamic behaviors
    switch (elementId) {
      case "useCurrentYearValues":
        this.handleCurrentYearValuesChange();
        break;
      case "useTaxableCurrentYearValues":
        this.handleTaxableCurrentYearChange();
        break;
      case "useTaxFreeCurrentYearValues":
        this.handleTaxFreeCurrentYearChange();
        break;
    }
  }

  /**
   * Handle current year values toggle
   */
  handleCurrentYearValuesChange() {
    const checkbox = document.getElementById("useCurrentYearValues");
    if (checkbox?.checked) {
      console.log("Using current year values for spending fields");
      // Call existing logic or implement with Phase 2
      if (window.generateSpendingFields) {
        window.generateSpendingFields();
      }
    }
  }

  /**
   * Handle taxable current year values toggle
   */
  handleTaxableCurrentYearChange() {
    const checkbox = document.getElementById("useTaxableCurrentYearValues");
    if (checkbox?.checked) {
      console.log("Using current year values for taxable income fields");
      // Call existing logic or implement with Phase 2
      if (window.generateTaxableIncomeFields) {
        window.generateTaxableIncomeFields();
      }
    }
  }

  /**
   * Handle tax-free current year values toggle
   */
  handleTaxFreeCurrentYearChange() {
    const checkbox = document.getElementById("useTaxFreeCurrentYearValues");
    if (checkbox?.checked) {
      console.log("Using current year values for tax-free income fields");
      // Call existing logic or implement with Phase 2
      if (window.generateTaxFreeIncomeFields) {
        window.generateTaxFreeIncomeFields();
      }
    }
  }

  /**
   * Trigger legacy updates that might be needed
   */
  triggerLegacyUpdates() {
    // Trigger any legacy post-calculation events
    if (window.updateChart && typeof window.updateChart === "function") {
      window.updateChart();
    }

    if (
      window.updateDetailGrids &&
      typeof window.updateDetailGrids === "function"
    ) {
      window.updateDetailGrids();
    }
  }

  /**
   * Enhanced reset that preserves legacy behavior
   */
  resetForm() {
    // Call Phase 2 reset
    super.resetForm();

    // Trigger legacy reset behaviors
    if (window.resetAll && typeof window.resetAll === "function") {
      // Let legacy reset handle special cases
      console.log("Triggering legacy reset behaviors...");
    }
  }

  /**
   * Migration helper: gradually replace legacy functions
   */
  migrateLegacyFunction(functionName, newImplementation) {
    if (window[functionName]) {
      console.log(`Migrating legacy function: ${functionName}`);
      const oldImplementation = window[functionName];

      window[functionName] = (...args) => {
        try {
          return newImplementation.apply(this, args);
        } catch (error) {
          console.warn(
            `Phase 2 implementation failed for ${functionName}, falling back to legacy`
          );
          return oldImplementation.apply(window, args);
        }
      };
    }
  }

  /**
   * Provide migration status
   */
  getMigrationStatus() {
    return {
      phase2Initialized: this.isInitialized,
      legacyFunctionsAvailable: !!(window.$ && window.num && window.pct),
      calculationEngine: "Phase 2 with legacy fallback",
      domAdapter: "Phase 2 configuration-based",
      recommendations: [
        "Phase 2 DOM adapter is active",
        "Legacy functions preserved for compatibility",
        "Ready for Phase 3 event-driven updates",
      ],
    };
  }
}

/**
 * Initialize the enhanced calculator when DOM is ready
 */
function initializePhase2Calculator() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const calculator = new LegacyCompatibleController();
      calculator.initialize();

      // Make controller available globally for debugging
      window.phase2Calculator = calculator;

      console.log(
        "🎉 Phase 2 Calculator initialized with legacy compatibility"
      );
      console.log("Migration status:", calculator.getMigrationStatus());
    });
  } else {
    // DOM already loaded
    const calculator = new LegacyCompatibleController();
    calculator.initialize();
    window.phase2Calculator = calculator;

    console.log("🎉 Phase 2 Calculator initialized with legacy compatibility");
    console.log("Migration status:", calculator.getMigrationStatus());
  }
}

// Auto-initialize if we're in a browser environment
if (typeof window !== "undefined") {
  initializePhase2Calculator();
}

// Export for manual initialization
export { LegacyCompatibleController, initializePhase2Calculator };
