/**
 * Phase 3: Event-Driven Demo
 *
 * This demo showcases the complete event-driven retirement calculator
 * with reactive UI components and real-time updates.
 */

import { EventDrivenRetirementCalculator } from "./phase3-integration.js";

/**
 * Phase 3 Demo Controller
 */
class Phase3Demo {
  constructor() {
    this.calculator = null;
    this.demoScenarios = this.createDemoScenarios();
    this.isRunning = false;
    this.setupDemo();
  }

  /**
   * Set up the demo environment
   */
  setupDemo() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () =>
        this.initializeDemo()
      );
    } else {
      this.initializeDemo();
    }
  }

  /**
   * Initialize the demo
   */
  initializeDemo() {
    console.log("🎬 Starting Phase 3 Demo");

    // Initialize the event-driven calculator
    this.calculator = new EventDrivenRetirementCalculator();
    this.calculator.initialize();

    // Enable auto-calculation by default
    this.calculator.setAutoCalculate(true);

    console.log("🔄 Auto-calculation enabled by default");

    // Set up demo controls
    this.setupDemoControls();

    // Add event listeners for demo features
    this.setupDemoEventListeners();

    // Create demo status display
    this.createDemoStatusDisplay();

    console.log("✅ Phase 3 Demo ready!");
    this.displayInstructions();
  }

  /**
   * Set up demo control buttons
   */
  setupDemoControls() {
    const controlsHtml = `
      <div id="phase3-demo-controls" style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: white;
        padding: 15px;
        border: 2px solid #007cba;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        max-width: 300px;
      ">
        <h3 style="margin: 0 0 10px 0; color: #007cba;">🎬 Phase 3 Demo</h3>
        
        <div style="margin-bottom: 10px;">
          <button id="demo-scenario-1" style="width: 100%; margin: 2px 0; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
            💼 Professional (Age 30)
          </button>
          <button id="demo-scenario-2" style="width: 100%; margin: 2px 0; padding: 8px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">
            👔 Mid-Career (Age 45)
          </button>
          <button id="demo-scenario-3" style="width: 100%; margin: 2px 0; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🏖️ Pre-Retirement (Age 60)
          </button>
        </div>

        <div style="margin-bottom: 10px;">
          <button id="demo-auto-mode" style="width: 100%; margin: 2px 0; padding: 8px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Auto Calculation: ON
          </button>
          <button id="demo-reset" style="width: 100%; margin: 2px 0; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
            🔄 Reset All
          </button>
        </div>

        <div style="margin-bottom: 10px;">
          <button id="demo-stress-test" style="width: 100%; margin: 2px 0; padding: 8px; background: #9932cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
            ⚡ Event Stress Test
          </button>
          <button id="demo-performance" style="width: 100%; margin: 2px 0; padding: 8px; background: #ff6347; color: white; border: none; border-radius: 4px; cursor: pointer;">
            📊 Performance Test
          </button>
        </div>

        <div style="font-size: 12px; color: #666; margin-top: 10px;">
          <div>Events: <span id="demo-event-count">0</span></div>
          <div>Calculations: <span id="demo-calc-count">0</span></div>
          <div>Performance: <span id="demo-performance-avg">-</span></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", controlsHtml);

    // Add event listeners
    this.setupDemoButtonListeners();
  }

  /**
   * Set up demo button listeners
   */
  setupDemoButtonListeners() {
    // Scenario buttons
    document.getElementById("demo-scenario-1").addEventListener("click", () => {
      this.loadScenario("young-professional");
    });

    document.getElementById("demo-scenario-2").addEventListener("click", () => {
      this.loadScenario("mid-career");
    });

    document.getElementById("demo-scenario-3").addEventListener("click", () => {
      this.loadScenario("pre-retirement");
    });

    // Auto calculation toggle
    document.getElementById("demo-auto-mode").addEventListener("click", () => {
      this.toggleAutoCalculation();
    });

    // Reset button
    document.getElementById("demo-reset").addEventListener("click", () => {
      this.resetDemo();
    });

    // Stress test
    document
      .getElementById("demo-stress-test")
      .addEventListener("click", () => {
        this.runStressTest();
      });

    // Performance test
    document
      .getElementById("demo-performance")
      .addEventListener("click", () => {
        this.runPerformanceTest();
      });
  }

  /**
   * Set up demo event listeners for monitoring
   */
  setupDemoEventListeners() {
    const emitter = this.calculator.calculatorController.eventEmitter;
    let eventCount = 0;
    let calcCount = 0;
    let performanceTimes = [];

    // Count all events
    emitter.onAny((eventType, data) => {
      eventCount++;
      document.getElementById("demo-event-count").textContent = eventCount;
    });

    // Count calculations and track performance
    emitter.on("calculation:completed", (data) => {
      console.log("🎯 Calculation completed event received:", data);
      console.log("📊 Calculation trigger source and results summary:");

      if (data.results && data.results.summary) {
        console.log(
          `💰 Final Balance: ${
            data.results.finalBalance || data.results.summary.finalBalance
          }`
        );
        console.log(`📈 Working Years: ${data.results.summary.workingYears}`);
      }

      calcCount++;
      document.getElementById("demo-calc-count").textContent = calcCount;

      if (data.performance) {
        performanceTimes.push(data.performance.calculationTime);

        if (performanceTimes.length > 10) {
          performanceTimes = performanceTimes.slice(-10); // Keep last 10
        }

        const avgTime =
          performanceTimes.reduce((a, b) => a + b, 0) / performanceTimes.length;
        document.getElementById(
          "demo-performance-avg"
        ).textContent = `${avgTime.toFixed(2)}ms`;
      }

      // Display the calculation results
      if (data.results) {
        console.log("📊 Displaying results from data.results");
        this.displayResults(data.results);
      } else if (data.result) {
        console.log("📊 Displaying results from data.result");
        this.displayResults(data.result);
      } else {
        console.warn("⚠️ No results found in calculation completed event");
      }
    });

    // Log important events
    emitter.on("error:displayed", (data) => {
      console.log("❌ Demo Event - Error:", data.message);
    });

    emitter.on("success:message", (data) => {
      console.log("✅ Demo Event - Success:", data.message);
    });
  }

  /**
   * Display calculation results in the results section
   */
  displayResults(result) {
    const resultsTable = document.getElementById("results-table");
    const kpiDisplay = document.getElementById("kpi-display");

    if (!resultsTable) {
      console.warn("Results table element not found");
      return;
    }

    try {
      console.log("📊 Displaying results:", result);

      // Handle different result structures
      let projections = result.projections || result.yearlyResults || [];
      let summary = result.summary || {};

      // Display key metrics first
      if (kpiDisplay && summary) {
        kpiDisplay.innerHTML = this.generateKPIDisplay(summary, result);
      }

      // Display projection table
      if (projections && projections.length > 0) {
        resultsTable.innerHTML = this.generateResultsTable(projections);
      } else {
        resultsTable.innerHTML =
          "<p>No projection data available. Check console for details.</p>";
        console.log("Available result keys:", Object.keys(result));
      }

      console.log("📊 Results displayed successfully");
    } catch (error) {
      console.error("Error displaying results:", error);
      resultsTable.innerHTML = `<p>Error displaying results: ${error.message}</p>`;
    }
  }

  /**
   * Generate KPI display HTML
   */
  generateKPIDisplay(summary, fullResult) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Handle different summary structures
    const totalAtRetirement =
      summary.totalAtRetirement ||
      summary.finalBalance ||
      fullResult.finalBalance ||
      0;
    const monthlyIncome =
      summary.monthlyIncomeAtRetirement || (totalAtRetirement * 0.04) / 12;
    const yearsOfFunding =
      summary.yearsOfFunding || summary.retirementYears || 25;
    const successProbability = summary.successProbability || 0.85; // Default assumption

    return `
      <div class="kpi-grid">
        <div class="kpi-item">
          <h4>Total Saved at Retirement</h4>
          <div class="kpi-value">${formatCurrency(totalAtRetirement)}</div>
        </div>
        <div class="kpi-item">
          <h4>Monthly Income in Retirement</h4>
          <div class="kpi-value">${formatCurrency(monthlyIncome)}</div>
        </div>
        <div class="kpi-item">
          <h4>Years of Retirement Funding</h4>
          <div class="kpi-value">${Math.round(yearsOfFunding)} years</div>
        </div>
        <div class="kpi-item">
          <h4>Working Years</h4>
          <div class="kpi-value">${summary.workingYears || 35} years</div>
        </div>
      </div>
    `;
  }

  /**
   * Generate results table HTML
   */
  generateResultsTable(projections) {
    if (!projections || projections.length === 0) {
      return "<p>No projection data available</p>";
    }

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    };

    // Show every 5th year for readability
    const filteredProjections = projections.filter(
      (p, index) => index % 5 === 0 || index === projections.length - 1
    );

    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Age</th>
            <th>Year</th>
            <th>Salary</th>
            <th>401k Balance</th>
            <th>Savings</th>
            <th>Total Assets</th>
            <th>Phase</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredProjections.forEach((projection) => {
      // Handle different data structures
      const age = projection.age;
      const year =
        projection.year || new Date().getFullYear() + (projection.age - 30); // Estimate year
      const salary = projection.salary || 0;

      // Handle different balance structures
      const balPre = projection.balPre || projection.balances?.balPre || 0;
      const balRoth = projection.balRoth || projection.balances?.balRoth || 0;
      const balSavings =
        projection.balSavings || projection.balances?.balSavings || 0;

      const totalAssets = balPre + balRoth + balSavings;
      const phase = projection.phase || (age >= 65 ? "Retired" : "Working");

      html += `
        <tr>
          <td>${age}</td>
          <td>${year}</td>
          <td>${formatCurrency(salary)}</td>
          <td>${formatCurrency(balPre + balRoth)}</td>
          <td>${formatCurrency(balSavings)}</td>
          <td>${formatCurrency(totalAssets)}</td>
          <td>${phase}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  /**
   * Create demo scenarios
   */
  createDemoScenarios() {
    return {
      "young-professional": {
        name: "Young Professional (Age 30)",
        description: "Starting career with good savings potential",
        data: {
          currentAge: 30,
          retireAge: 65,
          endAge: 90,
          currentSalary: 75000,
          currentSavings: 15000,
          monthlyExpenses: 4000,
          salaryGrowthRate: 3,
          inflationRate: 2.5,
          employerMatch: 50,
          employerMatchLimit: 6,
          currentContribution: 10,
        },
      },
      "mid-career": {
        name: "Mid-Career Professional (Age 45)",
        description: "Established career with higher income but less time",
        data: {
          currentAge: 45,
          retireAge: 65,
          endAge: 90,
          currentSalary: 95000, // More realistic progression from 75k
          currentSavings: 85000, // More realistic savings after 15 years
          monthlyExpenses: 4800,
          salaryGrowthRate: 2, // Slower growth for older worker
          inflationRate: 2.5,
          employerMatch: 50, // Same employer match
          employerMatchLimit: 6,
          currentContribution: 12, // Slightly higher but not dramatically
        },
      },
      "pre-retirement": {
        name: "Pre-Retirement (Age 60)",
        description: "Nearing retirement with catch-up contributions",
        data: {
          currentAge: 60,
          retireAge: 65,
          endAge: 85,
          currentSalary: 105000, // Peak earning years
          currentSavings: 320000, // More realistic savings for someone who started later
          monthlyExpenses: 5500,
          salaryGrowthRate: 1, // Minimal growth near retirement
          inflationRate: 2.5,
          employerMatch: 50,
          employerMatchLimit: 6,
          currentContribution: 20, // Catch-up contributions
        },
      },
    };
  }

  /**
   * Load a demo scenario
   */
  async loadScenario(scenarioName) {
    const scenario = this.demoScenarios[scenarioName];
    if (!scenario) {
      console.error("Unknown scenario:", scenarioName);
      return;
    }

    console.log(`🎭 Loading scenario: ${scenario.name}`);
    console.log("📋 Scenario data:", scenario.data);

    // Temporarily disable auto-calculation during loading to prevent multiple calculations
    const wasAutoCalcEnabled =
      this.calculator.calculatorController.getCalculationState().autoCalculate;
    if (wasAutoCalcEnabled) {
      console.log(
        "⏸️ Temporarily disabling auto-calculation during scenario load"
      );
      this.calculator.setAutoCalculate(false);
    }

    // Show loading state
    this.calculator.calculatorController.eventEmitter.emit("ui:loading", {
      message: `Loading ${scenario.name}...`,
    });

    // Set form fields one by one with delays to show reactivity
    const fieldNames = Object.keys(scenario.data);

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldName = fieldNames[i];
      const value = scenario.data[fieldName];

      console.log(`🔧 Setting ${fieldName} = ${value}`);

      // Set field value
      const success = this.calculator.setField(fieldName, value);
      console.log(`📝 Field ${fieldName} set result: ${success}`);

      // Verify the field was actually set
      const element = document.getElementById(fieldName);
      if (element) {
        console.log(
          `✅ Verified ${fieldName}: element.value = "${element.value}"`
        );
      } else {
        console.warn(`⚠️ Element ${fieldName} not found for verification`);
      }

      // Small delay to show the reactive updates
      await this.delay(100); // Reduced delay
    }

    console.log(
      "🎯 Scenario loading completed, triggering verification calculation..."
    );

    // Wait a moment for all DOM updates to complete
    await this.delay(200);

    // Verify what the form data collection sees now
    console.log("🔍 Verifying form data after scenario load...");
    const currentFormData = this.calculator.formController.getCustomFormData();
    console.log("📋 Form data after scenario load:", currentFormData);

    // Re-enable auto-calculation if it was enabled before
    if (wasAutoCalcEnabled) {
      console.log(
        "🔄 Re-enabling auto-calculation and triggering final calculation"
      );
      this.calculator.setAutoCalculate(true);
    }

    // Trigger one final calculation with the complete scenario data
    console.log("🚀 Triggering final calculation with complete scenario data");
    await this.calculator.calculate(currentFormData);

    // Hide loading state
    this.calculator.calculatorController.eventEmitter.emit("ui:loading", {
      message: null,
    });

    // Show success message
    this.calculator.calculatorController.eventEmitter.emit("success:message", {
      message: `✅ ${scenario.name} scenario loaded`,
      duration: 2000,
    });

    console.log(`✅ Scenario loaded: ${scenario.name}`);
  }

  /**
   * Toggle auto calculation
   */
  toggleAutoCalculation() {
    const isEnabled =
      this.calculator.calculatorController.getCalculationState().autoCalculate;
    this.calculator.setAutoCalculate(!isEnabled);

    const button = document.getElementById("demo-auto-mode");
    button.textContent = `🔄 Auto Calculation: ${!isEnabled ? "ON" : "OFF"}`;
    button.style.background = !isEnabled ? "#17a2b8" : "#6c757d";

    console.log(`🔄 Auto calculation ${!isEnabled ? "enabled" : "disabled"}`);
  }

  /**
   * Reset the demo
   */
  resetDemo() {
    console.log("🔄 Resetting demo");

    this.calculator.resetAll();

    // Reset counters
    document.getElementById("demo-event-count").textContent = "0";
    document.getElementById("demo-calc-count").textContent = "0";
    document.getElementById("demo-performance-avg").textContent = "-";

    console.log("✅ Demo reset complete");
  }

  /**
   * Run stress test
   */
  async runStressTest() {
    if (this.isRunning) {
      console.log("⚠️ Test already running");
      return;
    }

    console.log("⚡ Starting event stress test");
    this.isRunning = true;

    const button = document.getElementById("demo-stress-test");
    const originalText = button.textContent;
    button.textContent = "⚡ Running...";
    button.disabled = true;

    try {
      // Rapidly change multiple fields
      const testFields = [
        "currentAge",
        "currentSalary",
        "currentSavings",
        "monthlyExpenses",
      ];
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const field = testFields[i % testFields.length];
        const baseValue = Math.random() * 100000;

        this.calculator.setField(field, Math.floor(baseValue));

        if (i % 10 === 0) {
          await this.delay(50); // Occasional pause
        }
      }

      console.log(`✅ Stress test complete: ${iterations} field changes`);
    } catch (error) {
      console.error("❌ Stress test failed:", error);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
      this.isRunning = false;
    }
  }

  /**
   * Run performance test
   */
  async runPerformanceTest() {
    if (this.isRunning) {
      console.log("⚠️ Test already running");
      return;
    }

    console.log("📊 Starting performance test");
    this.isRunning = true;

    const button = document.getElementById("demo-performance");
    const originalText = button.textContent;
    button.textContent = "📊 Testing...";
    button.disabled = true;

    try {
      // Test calculation performance
      const testData = this.demoScenarios["mid-career"].data;
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await this.calculator.calculate(testData);

        const endTime = performance.now();
        times.push(endTime - startTime);

        await this.delay(100);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`📊 Performance Results (${iterations} calculations):`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);

      // Show results in success message
      this.calculator.calculatorController.eventEmitter.emit(
        "success:message",
        {
          message: `📊 Performance: Avg ${avgTime.toFixed(
            1
          )}ms (${iterations} tests)`,
          duration: 4000,
        }
      );
    } catch (error) {
      console.error("❌ Performance test failed:", error);
    } finally {
      button.textContent = originalText;
      button.disabled = false;
      this.isRunning = false;
    }
  }

  /**
   * Create status display
   */
  createDemoStatusDisplay() {
    const statusHtml = `
      <div id="phase3-status" style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
      ">
        <div>🔗 <strong>Phase 3: Event-Driven Architecture</strong></div>
        <div id="status-text">System ready for demonstration</div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", statusHtml);

    // Update status periodically
    setInterval(() => {
      this.updateStatusDisplay();
    }, 2000);
  }

  /**
   * Update status display
   */
  updateStatusDisplay() {
    const statusElement = document.getElementById("status-text");
    if (!statusElement) return;

    const status = this.calculator.getSystemStatus();

    statusElement.innerHTML = `
      ✅ Initialized: ${status.initialized}<br>
      🔄 Auto-calc: ${status.calculation.autoCalculate}<br>
      ⚡ UI Components: ${status.ui.componentCount}<br>
      👁️ Watched Fields: ${status.watchedFields}
    `;
  }

  /**
   * Display instructions
   */
  displayInstructions() {
    const instructions = `
🎬 Welcome to the Phase 3 Demo!

This demonstrates the complete event-driven retirement calculator:

🔹 REACTIVE UPDATES: Change any form field and see instant updates
🔹 SCENARIO TESTING: Use the demo buttons to load different scenarios  
🔹 AUTO CALCULATION: Toggle automatic calculation on/off
🔹 PERFORMANCE: Run stress tests to see event system performance
🔹 MONITORING: Watch event counts and calculation times in real-time

The system uses a pure event-driven architecture where:
- Form changes emit events
- Calculations are triggered by events  
- UI updates happen through reactive components
- No direct DOM manipulation in business logic

Try changing some values in the form to see the reactive updates!
    `;

    console.log(instructions);
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get demo status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      calculator: this.calculator?.getSystemStatus(),
      scenarios: Object.keys(this.demoScenarios),
    };
  }

  /**
   * Destroy demo
   */
  destroy() {
    // Remove demo controls
    const controls = document.getElementById("phase3-demo-controls");
    if (controls) controls.remove();

    const status = document.getElementById("phase3-status");
    if (status) status.remove();

    // Destroy calculator
    if (this.calculator) {
      this.calculator.destroy();
    }

    console.log("💀 Phase 3 Demo destroyed");
  }
}

/**
 * Auto-initialize demo when DOM is ready
 */
function initializePhase3Demo() {
  if (typeof window === "undefined") {
    return null;
  }

  let demo = null;

  const init = () => {
    demo = new Phase3Demo();

    // Make available globally for debugging
    window.phase3Demo = demo;

    console.log("🎬 Phase 3 Demo auto-initialized");
    return demo;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    demo = init();
  }

  return demo;
}

// Auto-initialize if in browser
if (typeof window !== "undefined") {
  initializePhase3Demo();
}

export { Phase3Demo, initializePhase3Demo };
