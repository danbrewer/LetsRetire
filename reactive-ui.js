/**
 * Phase 3: Reactive UI Components
 *
 * This module provides reactive UI components that respond to events
 * from the event-driven system. Components automatically update when
 * relevant events are emitted, creating a reactive user interface.
 */

import { EVENT_TYPES } from "./event-system.js";

/**
 * Base Reactive Component
 * All UI components extend this base class for consistent event handling
 */
class ReactiveComponent {
  constructor(eventEmitter, elementId) {
    this.eventEmitter = eventEmitter;
    this.elementId = elementId;
    this.element = null;
    this.eventListeners = [];
    this.isDestroyed = false;

    this.initialize();
  }

  /**
   * Initialize the component
   */
  initialize() {
    this.element = document.getElementById(this.elementId);
    if (!this.element) {
      console.warn(`⚠️ Element not found: ${this.elementId}`);
      return;
    }

    this.setupEventListeners();
    console.log(
      `✅ Reactive component initialized: ${this.constructor.name} (${this.elementId})`
    );
  }

  /**
   * Set up event listeners (override in subclasses)
   */
  setupEventListeners() {
    // To be implemented by subclasses
  }

  /**
   * Subscribe to events with automatic cleanup
   */
  subscribe(eventType, handler, options = {}) {
    if (this.isDestroyed) return null;

    const listenerId = this.eventEmitter.on(eventType, handler, options);
    this.eventListeners.push({ eventType, listenerId });
    return listenerId;
  }

  /**
   * Update the component's DOM (override in subclasses)
   */
  update(data) {
    // To be implemented by subclasses
    console.log(`🔄 Update called for ${this.constructor.name}:`, data);
  }

  /**
   * Show the component
   */
  show() {
    if (this.element) {
      this.element.style.display = "";
    }
  }

  /**
   * Hide the component
   */
  hide() {
    if (this.element) {
      this.element.style.display = "none";
    }
  }

  /**
   * Set element content safely
   */
  setContent(content) {
    if (this.element) {
      this.element.textContent = content;
    }
  }

  /**
   * Set element HTML safely
   */
  setHTML(html) {
    if (this.element) {
      this.element.innerHTML = html;
    }
  }

  /**
   * Add CSS class
   */
  addClass(className) {
    if (this.element) {
      this.element.classList.add(className);
    }
  }

  /**
   * Remove CSS class
   */
  removeClass(className) {
    if (this.element) {
      this.element.classList.remove(className);
    }
  }

  /**
   * Destroy the component and clean up event listeners
   */
  destroy() {
    this.isDestroyed = true;

    // Remove all event listeners
    this.eventListeners.forEach(({ eventType, listenerId }) => {
      this.eventEmitter.off(eventType, listenerId);
    });
    this.eventListeners = [];

    console.log(`💀 Reactive component destroyed: ${this.constructor.name}`);
  }
}

/**
 * KPI Display Component
 * Reactively updates key performance indicators
 */
class KPIComponent extends ReactiveComponent {
  constructor(eventEmitter, elementId, kpiType) {
    super(eventEmitter, elementId);
    this.kpiType = kpiType; // 'age', 'balance', 'draw', 'tax'
  }

  setupEventListeners() {
    this.subscribe(EVENT_TYPES.KPI_UPDATED, (data) => {
      this.updateKPI(data);
    });

    this.subscribe(EVENT_TYPES.LOADING_STATE_CHANGED, (data) => {
      this.updateLoadingState(data);
    });

    this.subscribe(EVENT_TYPES.FORM_RESET, () => {
      this.resetKPI();
    });
  }

  updateKPI(data) {
    if (!data.results || !data.params) return;

    const { results, params } = data;

    switch (this.kpiType) {
      case "age":
        this.updateFundedAge(results, params);
        break;
      case "balance":
        this.updateEndingBalance(results);
        break;
      case "draw":
        this.updateDrawAge(params);
        break;
      case "tax":
        this.updateTotalTax(results);
        break;
    }
  }

  updateFundedAge(results, params) {
    const fundedAge = this.calculateFundedAge(results, params);
    const status = fundedAge >= params.endAge ? "success" : "warning";
    const statusText = status === "success" ? "Funded" : "Short";

    this.setHTML(
      `${fundedAge} <span class="pill ${status}">${statusText}</span>`
    );
  }

  updateEndingBalance(results) {
    const lastYear = results.yearlyResults[results.yearlyResults.length - 1];
    const balance = Math.max(0, lastYear?.totalBalance || 0);
    this.setContent(this.formatCurrency(balance));
  }

  updateDrawAge(params) {
    this.setContent(`${params.retireAge || "—"}`);
  }

  updateTotalTax(results) {
    const totalTax = results.yearlyResults.reduce((sum, year) => {
      return sum + (year.taxes?.federal || 0);
    }, 0);
    this.setContent(this.formatCurrency(totalTax));
  }

  updateLoadingState(data) {
    if (data.isLoading) {
      this.addClass("loading");
      this.setContent("...");
    } else {
      this.removeClass("loading");
    }
  }

  resetKPI() {
    this.setContent("—");
    this.removeClass("loading");
  }

  calculateFundedAge(results, params) {
    // Find the last year with positive balance
    for (let i = results.yearlyResults.length - 1; i >= 0; i--) {
      if (results.yearlyResults[i].totalBalance > 0) {
        return params.currentAge + i;
      }
    }
    return params.currentAge;
  }

  formatCurrency(amount) {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
}

/**
 * Results Table Component
 * Reactively updates the results table
 */
class ResultsTableComponent extends ReactiveComponent {
  setupEventListeners() {
    this.subscribe(EVENT_TYPES.TABLE_UPDATED, (data) => {
      this.updateTable(data);
    });

    this.subscribe(EVENT_TYPES.LOADING_STATE_CHANGED, (data) => {
      this.updateLoadingState(data);
    });

    this.subscribe(EVENT_TYPES.FORM_RESET, () => {
      this.clearTable();
    });
  }

  updateTable(data) {
    if (!data.yearlyResults || !Array.isArray(data.yearlyResults)) {
      this.clearTable();
      return;
    }

    const tableHTML = this.generateTableHTML(data.yearlyResults, data.params);
    this.setHTML(tableHTML);

    console.log(`📊 Table updated with ${data.yearlyResults.length} rows`);
  }

  generateTableHTML(yearlyResults, params) {
    if (yearlyResults.length === 0) {
      return '<tr><td colspan="10" class="text-center">No results to display</td></tr>';
    }

    return yearlyResults
      .map(
        (year) => `
      <tr class="${year.phase || "working"}">
        <td>${year.year}</td>
        <td>${year.age}</td>
        <td>${this.formatCurrency(year.totalBalance || 0)}</td>
        <td>${this.formatCurrency(year.contributions?.total || 0)}</td>
        <td>${this.formatCurrency(year.income?.salary || 0)}</td>
        <td>${this.formatCurrency(year.taxes?.federal || 0)}</td>
        <td>${
          year.phase === "retirement"
            ? this.formatCurrency(year.withdrawal || 0)
            : "—"
        }</td>
        <td>${this.formatCurrency(year.balances?.balPre || 0)}</td>
        <td>${this.formatCurrency(year.balances?.balRoth || 0)}</td>
        <td>${this.formatCurrency(year.balances?.balSavings || 0)}</td>
      </tr>
    `
      )
      .join("");
  }

  updateLoadingState(data) {
    if (data.isLoading) {
      this.setHTML(
        '<tr><td colspan="10" class="text-center loading">Calculating...</td></tr>'
      );
    }
  }

  clearTable() {
    this.setHTML("");
  }

  formatCurrency(amount) {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
}

/**
 * Loading Indicator Component
 * Shows/hides loading states reactively
 */
class LoadingComponent extends ReactiveComponent {
  setupEventListeners() {
    this.subscribe(EVENT_TYPES.LOADING_STATE_CHANGED, (data) => {
      this.updateLoadingState(data);
    });

    this.subscribe(EVENT_TYPES.CALCULATION_STARTED, () => {
      this.showCalculating();
    });

    this.subscribe(EVENT_TYPES.CALCULATION_COMPLETED, () => {
      this.hideLoading();
    });

    this.subscribe(EVENT_TYPES.CALCULATION_ERROR, () => {
      this.hideLoading();
    });
  }

  updateLoadingState(data) {
    if (data.isLoading) {
      this.showLoading(data.message);
    } else {
      this.hideLoading();
    }
  }

  showCalculating() {
    this.showLoading("Calculating retirement projection...");
  }

  showLoading(message = "Loading...") {
    if (this.element) {
      this.setContent(message);
      this.show();
      this.addClass("loading-active");
    }
  }

  hideLoading() {
    if (this.element) {
      this.hide();
      this.removeClass("loading-active");
    }
  }
}

/**
 * Error Display Component
 * Reactively shows error messages
 */
class ErrorComponent extends ReactiveComponent {
  constructor(eventEmitter, elementId) {
    super(eventEmitter, elementId);
    this.autoHideTimeout = null;
  }

  setupEventListeners() {
    this.subscribe(EVENT_TYPES.ERROR_DISPLAYED, (data) => {
      this.showError(data);
    });

    this.subscribe(EVENT_TYPES.SUCCESS_MESSAGE, (data) => {
      this.showSuccess(data);
    });

    this.subscribe(EVENT_TYPES.FORM_RESET, () => {
      this.clearMessages();
    });

    this.subscribe(EVENT_TYPES.CALCULATION_STARTED, () => {
      this.clearMessages();
    });
  }

  showError(data) {
    const message = data.message || data.error?.message || "An error occurred";
    this.setContent(message);
    this.removeClass("success");
    this.addClass("error");
    this.show();

    console.error("❌ Error displayed:", message);

    // Auto-hide after 10 seconds
    this.autoHide(10000);
  }

  showSuccess(data) {
    this.setContent(data.message);
    this.removeClass("error");
    this.addClass("success");
    this.show();

    console.log("✅ Success message displayed:", data.message);

    // Auto-hide after duration or 5 seconds
    this.autoHide(data.duration || 5000);
  }

  autoHide(duration) {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
    }

    this.autoHideTimeout = setTimeout(() => {
      this.clearMessages();
    }, duration);
  }

  clearMessages() {
    this.hide();
    this.removeClass("error", "success");
    this.setContent("");

    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
  }

  destroy() {
    this.clearMessages();
    super.destroy();
  }
}

/**
 * Chart Component (Placeholder for chart updates)
 * Reactively updates charts/visualizations
 */
class ChartComponent extends ReactiveComponent {
  setupEventListeners() {
    this.subscribe(EVENT_TYPES.CHART_UPDATED, (data) => {
      this.updateChart(data);
    });

    this.subscribe(EVENT_TYPES.FORM_RESET, () => {
      this.clearChart();
    });
  }

  updateChart(data) {
    // Placeholder for chart library integration
    console.log(
      "📈 Chart update requested with",
      data.yearlyResults?.length || 0,
      "data points"
    );

    if (this.element) {
      this.setContent(`Chart: ${data.yearlyResults?.length || 0} data points`);
    }
  }

  clearChart() {
    if (this.element) {
      this.setContent("No data to chart");
    }
  }
}

/**
 * Reactive UI Manager
 * Manages all reactive components and their lifecycle
 */
class ReactiveUIManager {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.components = new Map();
  }

  /**
   * Register a reactive component
   */
  registerComponent(name, component) {
    if (this.components.has(name)) {
      console.warn(`⚠️ Component ${name} already registered, replacing...`);
      this.components.get(name).destroy();
    }

    this.components.set(name, component);
    console.log(`✅ Reactive component registered: ${name}`);
    return component;
  }

  /**
   * Create and register KPI components
   */
  setupKPIComponents() {
    this.registerComponent(
      "kpiAge",
      new KPIComponent(this.eventEmitter, "kpiAge", "age")
    );
    this.registerComponent(
      "kpiEndBal",
      new KPIComponent(this.eventEmitter, "kpiEndBal", "balance")
    );
    this.registerComponent(
      "kpiDraw",
      new KPIComponent(this.eventEmitter, "kpiDraw", "draw")
    );
    this.registerComponent(
      "kpiTax",
      new KPIComponent(this.eventEmitter, "kpiTax", "tax")
    );
  }

  /**
   * Create and register other UI components
   */
  setupOtherComponents() {
    this.registerComponent(
      "resultsTable",
      new ResultsTableComponent(this.eventEmitter, "rows")
    );
    this.registerComponent(
      "loading",
      new LoadingComponent(this.eventEmitter, "loadingIndicator")
    );
    this.registerComponent(
      "errors",
      new ErrorComponent(this.eventEmitter, "errorDisplay")
    );
    this.registerComponent(
      "chart",
      new ChartComponent(this.eventEmitter, "chart")
    );
  }

  /**
   * Initialize all standard components
   */
  initializeStandardComponents() {
    this.setupKPIComponents();
    this.setupOtherComponents();

    console.log(
      `🎯 Reactive UI Manager initialized with ${this.components.size} components`
    );
    return this;
  }

  /**
   * Get a component by name
   */
  getComponent(name) {
    return this.components.get(name);
  }

  /**
   * Get all component names
   */
  getComponentNames() {
    return Array.from(this.components.keys());
  }

  /**
   * Destroy all components
   */
  destroyAll() {
    this.components.forEach((component, name) => {
      component.destroy();
    });
    this.components.clear();
    console.log("💀 All reactive components destroyed");
  }

  /**
   * Get component status for debugging
   */
  getStatus() {
    return {
      componentCount: this.components.size,
      components: this.getComponentNames(),
      activeEvents: this.eventEmitter.getActiveEvents(),
    };
  }
}

export {
  ReactiveComponent,
  KPIComponent,
  ResultsTableComponent,
  LoadingComponent,
  ErrorComponent,
  ChartComponent,
  ReactiveUIManager,
};
