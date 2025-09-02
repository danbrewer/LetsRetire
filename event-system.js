/**
 * Phase 3: Event-Driven Updates System
 *
 * This module implements an event-driven architecture that replaces direct DOM
 * manipulation with events. It provides reactive UI updates using the Observer
 * pattern and maintains framework-agnostic rendering capabilities.
 */

/**
 * Event types for the retirement calculator system
 */
const EVENT_TYPES = {
  // Calculation Events
  CALCULATION_STARTED: "calculation:started",
  CALCULATION_COMPLETED: "calculation:completed",
  CALCULATION_ERROR: "calculation:error",

  // Data Events
  FORM_DATA_CHANGED: "form:data:changed",
  FORM_FIELD_CHANGED: "form:field:changed",
  FORM_VALIDATED: "form:validated",
  FORM_RESET: "form:reset",

  // Results Events
  RESULTS_UPDATED: "results:updated",
  KPI_UPDATED: "kpi:updated",
  TABLE_UPDATED: "table:updated",
  CHART_UPDATED: "chart:updated",

  // UI Events
  UI_STATE_CHANGED: "ui:state:changed",
  LOADING_STATE_CHANGED: "loading:state:changed",
  ERROR_DISPLAYED: "error:displayed",
  SUCCESS_MESSAGE: "success:message",

  // File Events
  FILE_EXPORTED: "file:exported",
  FILE_IMPORTED: "file:imported",

  // Dynamic Content Events
  SPENDING_FIELDS_GENERATED: "spending:fields:generated",
  INCOME_FIELDS_GENERATED: "income:fields:generated",
};

/**
 * Event-driven Event Emitter
 * Framework-agnostic event system for reactive updates
 */
class EventEmitter {
  constructor() {
    this.listeners = new Map();
    this.debugMode = false;
  }

  /**
   * Enable debug logging for events
   */
  enableDebug() {
    this.debugMode = true;
    return this;
  }

  /**
   * Subscribe to an event
   */
  on(eventType, listener, options = {}) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listenerConfig = {
      handler: listener,
      once: options.once || false,
      priority: options.priority || 0,
      id: options.id || Math.random().toString(36).substr(2, 9),
    };

    this.listeners.get(eventType).push(listenerConfig);

    // Sort by priority (higher priority first)
    this.listeners.get(eventType).sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(
        `📡 Event listener added: ${eventType} (id: ${listenerConfig.id})`
      );
    }

    return listenerConfig.id;
  }

  /**
   * Subscribe to an event once
   */
  once(eventType, listener, options = {}) {
    return this.on(eventType, listener, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType, listenerId) {
    if (!this.listeners.has(eventType)) return false;

    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(
      (l) => l.id === listenerId || l.handler === listenerId
    );

    if (index !== -1) {
      listeners.splice(index, 1);
      if (this.debugMode) {
        console.log(
          `📡 Event listener removed: ${eventType} (id: ${listenerId})`
        );
      }
      return true;
    }

    return false;
  }

  /**
   * Emit an event to all listeners
   */
  emit(eventType, data = {}) {
    if (this.debugMode) {
      console.log(`📡 Event emitted: ${eventType}`, data);
    }

    const results = [];

    // Emit to specific event listeners
    if (this.listeners.has(eventType)) {
      const listeners = this.listeners.get(eventType).slice(); // Clone array

      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];

        try {
          const result = listener.handler(data, eventType);
          results.push(result);

          // Remove 'once' listeners after execution
          if (listener.once) {
            this.off(eventType, listener.id);
          }
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);

          // Emit error event
          if (eventType !== EVENT_TYPES.CALCULATION_ERROR) {
            this.emit(EVENT_TYPES.CALCULATION_ERROR, {
              originalEvent: eventType,
              error: error,
              listener: listener.id,
            });
          }
        }
      }
    }

    // Emit to global listeners (onAny)
    if (this.listeners.has("*")) {
      const globalListeners = this.listeners.get("*").slice(); // Clone array

      for (let i = 0; i < globalListeners.length; i++) {
        const listener = globalListeners[i];

        try {
          const result = listener.handler(eventType, data);
          results.push(result);

          // Remove 'once' listeners after execution
          if (listener.once) {
            this.off("*", listener.id);
          }
        } catch (error) {
          console.error(`Error in global event listener:`, error);
        }
      }
    }

    if (this.debugMode && results.length === 0) {
      console.log(`📡 No listeners responded to event: ${eventType}`);
    }

    return results;
  }

  /**
   * Subscribe to all events (catch-all listener)
   */
  onAny(listener, options = {}) {
    if (!this.listeners.has("*")) {
      this.listeners.set("*", []);
    }

    const listenerConfig = {
      handler: listener,
      once: options.once || false,
      priority: options.priority || 0,
      id: options.id || Math.random().toString(36).substr(2, 9),
    };

    this.listeners.get("*").push(listenerConfig);

    // Sort by priority (higher priority first)
    this.listeners.get("*").sort((a, b) => b.priority - a.priority);

    if (this.debugMode) {
      console.log(`📡 Global event listener added (id: ${listenerConfig.id})`);
    }

    return listenerConfig.id;
  }

  /**
   * Get current listener count for debugging
   */
  getListenerCount(eventType) {
    return this.listeners.has(eventType)
      ? this.listeners.get(eventType).length
      : 0;
  }

  /**
   * Get listener count including global listeners
   */
  listenerCount(eventType) {
    return this.getListenerCount(eventType);
  }

  /**
   * Get all event types that have listeners
   */
  getActiveEvents() {
    return Array.from(this.listeners.keys()).filter(
      (eventType) => this.listeners.get(eventType).length > 0
    );
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear() {
    this.listeners.clear();
    if (this.debugMode) {
      console.log("📡 All event listeners cleared");
    }
  }
}

/**
 * Reactive State Manager
 * Manages application state with automatic change detection and events
 */
class ReactiveState {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.state = {};
    this.previousState = {};
    this.watchers = new Map();
  }

  /**
   * Set state value and emit change events
   */
  set(key, value) {
    const oldValue = this.state[key];
    this.previousState[key] = oldValue;
    this.state[key] = value;

    // Emit specific field change
    this.eventEmitter.emit(EVENT_TYPES.FORM_FIELD_CHANGED, {
      field: key,
      value: value,
      oldValue: oldValue,
      hasChanged: oldValue !== value,
    });

    // Emit general state change
    this.eventEmitter.emit(EVENT_TYPES.UI_STATE_CHANGED, {
      key: key,
      value: value,
      state: { ...this.state },
    });

    // Check watchers
    if (this.watchers.has(key)) {
      this.watchers.get(key).forEach((watcher) => {
        watcher(value, oldValue, key);
      });
    }

    return this;
  }

  /**
   * Get state value
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Watch for changes to a specific state key
   */
  watch(key, callback) {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }
    this.watchers.get(key).push(callback);

    // Return unwatch function
    return () => {
      const watchers = this.watchers.get(key);
      const index = watchers.indexOf(callback);
      if (index !== -1) {
        watchers.splice(index, 1);
      }
    };
  }

  /**
   * Update multiple state values at once
   */
  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });

    this.eventEmitter.emit(EVENT_TYPES.FORM_DATA_CHANGED, {
      updates: updates,
      state: { ...this.state },
    });

    return this;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.previousState = { ...this.state };
    this.state = {};

    this.eventEmitter.emit(EVENT_TYPES.FORM_RESET, {
      previousState: this.previousState,
    });

    return this;
  }

  /**
   * Get current state snapshot
   */
  getSnapshot() {
    return { ...this.state };
  }
}

/**
 * Event-Driven Calculator Controller
 * Replaces direct DOM manipulation with event-driven updates
 */
class EventDrivenCalculatorController {
  constructor() {
    this.eventEmitter = new EventEmitter().enableDebug();
    this.state = new ReactiveState(this.eventEmitter);
    this.isCalculating = false;
    this.lastResults = null;

    this.setupEventListeners();
  }

  /**
   * Set up core event listeners
   */
  setupEventListeners() {
    // Calculation flow events
    this.eventEmitter.on(EVENT_TYPES.CALCULATION_STARTED, (data) => {
      this.handleCalculationStarted(data);
    });

    this.eventEmitter.on(EVENT_TYPES.CALCULATION_COMPLETED, (data) => {
      this.handleCalculationCompleted(data);
    });

    this.eventEmitter.on(EVENT_TYPES.CALCULATION_ERROR, (data) => {
      this.handleCalculationError(data);
    });

    // Form events
    this.eventEmitter.on(EVENT_TYPES.FORM_DATA_CHANGED, (data) => {
      this.handleFormDataChanged(data);
    });

    this.eventEmitter.on(EVENT_TYPES.FORM_VALIDATED, (data) => {
      this.handleFormValidated(data);
    });

    // Results events
    this.eventEmitter.on(EVENT_TYPES.RESULTS_UPDATED, (data) => {
      this.handleResultsUpdated(data);
    });

    console.log("🎯 Event-driven controller initialized");
    console.log(
      "📡 Active event listeners:",
      this.eventEmitter.getActiveEvents().length
    );
  }

  /**
   * Start calculation process (event-driven)
   */
  async startCalculation(params) {
    if (this.isCalculating) {
      console.log("⏳ Calculation already in progress...");
      return;
    }

    // Emit calculation started event
    this.eventEmitter.emit(EVENT_TYPES.CALCULATION_STARTED, {
      params: params,
      timestamp: Date.now(),
    });

    try {
      this.isCalculating = true;

      // Import calculation engine dynamically
      const { calculateRetirementProjection, validateRetirementParams } =
        await import("./calculation-engine.js");

      // Validate parameters
      const validation = validateRetirementParams(params);
      this.eventEmitter.emit(EVENT_TYPES.FORM_VALIDATED, {
        isValid: validation.isValid,
        errors: validation.errors,
        params: params,
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Perform calculation
      const results = calculateRetirementProjection(params);

      // Emit completion event
      this.eventEmitter.emit(EVENT_TYPES.CALCULATION_COMPLETED, {
        results: results,
        params: params,
        timestamp: Date.now(),
      });

      return results;
    } catch (error) {
      // Emit error event
      this.eventEmitter.emit(EVENT_TYPES.CALCULATION_ERROR, {
        error: error,
        params: params,
        timestamp: Date.now(),
      });

      throw error;
    } finally {
      this.isCalculating = false;
    }
  }

  /**
   * Handle calculation started event
   */
  handleCalculationStarted(data) {
    console.log("🚀 Calculation started");

    this.state.set("isCalculating", true);
    this.state.set("calculationStartTime", data.timestamp);

    // Emit loading state change
    this.eventEmitter.emit(EVENT_TYPES.LOADING_STATE_CHANGED, {
      isLoading: true,
      message: "Calculating retirement projection...",
    });
  }

  /**
   * Handle calculation completed event
   */
  handleCalculationCompleted(data) {
    const duration = Date.now() - this.state.get("calculationStartTime");
    console.log(`✅ Calculation completed in ${duration}ms`);

    this.state.set("isCalculating", false);
    this.state.set("lastCalculationDuration", duration);
    this.lastResults = data.results;

    // Emit loading state change
    this.eventEmitter.emit(EVENT_TYPES.LOADING_STATE_CHANGED, {
      isLoading: false,
      message: null,
    });

    // Emit results updated event
    this.eventEmitter.emit(EVENT_TYPES.RESULTS_UPDATED, {
      results: data.results,
      params: data.params,
      duration: duration,
    });

    // Emit success message
    this.eventEmitter.emit(EVENT_TYPES.SUCCESS_MESSAGE, {
      message: `Calculation completed successfully in ${duration}ms`,
      duration: 3000,
    });
  }

  /**
   * Handle calculation error event
   */
  handleCalculationError(data) {
    console.error("❌ Calculation error:", data.error);

    this.state.set("isCalculating", false);
    this.state.set("lastError", data.error.message);

    // Emit loading state change
    this.eventEmitter.emit(EVENT_TYPES.LOADING_STATE_CHANGED, {
      isLoading: false,
      message: null,
    });

    // Emit error display event
    this.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
      error: data.error,
      message: data.error.message,
      timestamp: data.timestamp,
    });
  }

  /**
   * Handle form data changes
   */
  handleFormDataChanged(data) {
    console.log(
      "📝 Form data changed, auto-calc enabled:",
      this.state.get("autoCalculate")
    );

    // Store the latest form data
    this.state.set("lastFormData", data.formData);

    // Auto-calculate if enabled
    if (this.state.get("autoCalculate")) {
      setTimeout(() => {
        this.startCalculation(data.formData);
      }, 500); // Debounce
    }
  }

  /**
   * Handle form validation results
   */
  handleFormValidated(data) {
    console.log("✅ Form validation:", data.isValid ? "PASSED" : "FAILED");

    if (!data.isValid) {
      this.eventEmitter.emit(EVENT_TYPES.ERROR_DISPLAYED, {
        error: new Error("Validation failed"),
        message: "Please correct the form errors: " + data.errors.join(", "),
        errors: data.errors,
      });
    }
  }

  /**
   * Handle results updates
   */
  handleResultsUpdated(data) {
    console.log(
      "📊 Results updated with",
      data.results.yearlyResults?.length || 0,
      "yearly results"
    );

    // Emit specific update events
    this.eventEmitter.emit(EVENT_TYPES.KPI_UPDATED, {
      results: data.results,
      params: data.params,
    });

    this.eventEmitter.emit(EVENT_TYPES.TABLE_UPDATED, {
      yearlyResults: data.results.yearlyResults,
      params: data.params,
    });

    this.eventEmitter.emit(EVENT_TYPES.CHART_UPDATED, {
      yearlyResults: data.results.yearlyResults,
      params: data.params,
    });
  }

  /**
   * Enable auto-calculation on form changes
   */
  enableAutoCalculate() {
    this.state.set("autoCalculate", true);
    console.log("🔄 Auto-calculation enabled");
    return this;
  }

  /**
   * Disable auto-calculation
   */
  disableAutoCalculate() {
    this.state.set("autoCalculate", false);
    console.log("🔄 Auto-calculation disabled");
    return this;
  }

  /**
   * Get current calculation state
   */
  getCalculationState() {
    return {
      isCalculating: this.state.get("isCalculating"),
      autoCalculate: this.state.get("autoCalculate"),
      lastResults: this.lastResults,
      lastError: this.state.get("lastError"),
      lastDuration: this.state.get("lastCalculationDuration"),
    };
  }

  /**
   * Export current state and results
   */
  exportState() {
    return {
      state: this.state.getSnapshot(),
      results: this.lastResults,
      listeners: this.eventEmitter.getActiveEvents(),
      timestamp: Date.now(),
    };
  }

  /**
   * Reset the entire system
   */
  reset() {
    this.state.reset();
    this.lastResults = null;
    this.isCalculating = false;

    this.eventEmitter.emit(EVENT_TYPES.FORM_RESET, {
      timestamp: Date.now(),
    });

    console.log("🔄 System reset completed");
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    this.eventEmitter.clear();
    this.state.reset();
    this.lastResults = null;
    console.log("💀 Event-driven controller destroyed");
  }
}

// Export for use in other modules
export {
  EVENT_TYPES,
  EventEmitter,
  ReactiveState,
  EventDrivenCalculatorController,
};
