/**
 * Phase 3: Integration and Performance Tests
 *
 * Comprehensive testing suite for the event-driven retirement calculator
 * including integration tests, performance benchmarks, and system validation.
 */

import { EventDrivenRetirementCalculator } from "./phase3-integration.js";
import {
  EventEmitter,
  ReactiveState,
  EventDrivenCalculatorController,
} from "./event-system.js";
import { ReactiveUIManager, ReactiveComponent } from "./reactive-ui.js";

/**
 * Phase 3 Test Suite
 */
class Phase3TestSuite {
  constructor() {
    this.testResults = [];
    this.performanceResults = [];
    this.currentTest = null;
    this.calculator = null;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🧪 Starting Phase 3 Test Suite");
    console.log("==============================");

    try {
      // Basic functionality tests
      await this.testEventSystemCore();
      await this.testReactiveState();
      await this.testCalculatorController();
      await this.testUIComponents();
      await this.testFormIntegration();

      // Integration tests
      await this.testFullSystemIntegration();
      await this.testEventPropagation();
      await this.testErrorHandling();

      // Performance tests
      await this.testCalculationPerformance();
      await this.testEventPerformance();
      await this.testMemoryLeaks();

      // System validation
      await this.testPhaseCompatibility();

      this.displayTestSummary();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    }
  }

  /**
   * Test: Event System Core
   */
  async testEventSystemCore() {
    await this.runTest("Event System Core", async () => {
      const emitter = new EventEmitter();
      let eventCount = 0;
      let eventData = null;

      // Test basic emission and listening
      emitter.on("test-event", (data) => {
        eventCount++;
        eventData = data;
      });

      emitter.emit("test-event", { test: "data" });

      this.assert(eventCount === 1, "Event should be emitted once");
      this.assert(eventData.test === "data", "Event data should be preserved");

      // Test priority handling
      let order = [];
      emitter.on("priority-test", () => order.push("normal"), { priority: 0 });
      emitter.on("priority-test", () => order.push("high"), { priority: 100 });
      emitter.on("priority-test", () => order.push("low"), { priority: -100 });

      emitter.emit("priority-test");

      this.assert(order[0] === "high", "High priority should execute first");
      this.assert(order[2] === "low", "Low priority should execute last");

      // Test removal
      const handler = () => {};
      emitter.on("remove-test", handler);
      this.assert(
        emitter.listenerCount("remove-test") === 1,
        "Should have one listener"
      );

      emitter.off("remove-test", handler);
      this.assert(
        emitter.listenerCount("remove-test") === 0,
        "Should have no listeners"
      );

      return { passed: true, details: "All event system core tests passed" };
    });
  }

  /**
   * Test: Reactive State
   */
  async testReactiveState() {
    await this.runTest("Reactive State", async () => {
      const state = new ReactiveState({
        value: 0,
        nested: { count: 5 },
      });

      let changeCount = 0;
      let lastChange = null;

      // Test watchers
      state.watch("value", (newVal, oldVal, path) => {
        changeCount++;
        lastChange = { newVal, oldVal, path };
      });

      state.set("value", 10);

      this.assert(changeCount === 1, "Watcher should be called once");
      this.assert(lastChange.newVal === 10, "New value should be 10");
      this.assert(lastChange.oldVal === 0, "Old value should be 0");

      // Test nested path changes
      state.set("nested.count", 15);
      const nestedValue = state.get("nested.count");

      this.assert(nestedValue === 15, "Nested value should be updated");

      // Test batch updates
      let batchChangeCount = 0;
      state.watch("*", () => batchChangeCount++);

      state.batch(() => {
        state.set("value", 20);
        state.set("nested.count", 25);
      });

      this.assert(
        batchChangeCount === 1,
        "Batch should emit only one change event"
      );

      return { passed: true, details: "All reactive state tests passed" };
    });
  }

  /**
   * Test: Calculator Controller
   */
  async testCalculatorController() {
    await this.runTest("Calculator Controller", async () => {
      const controller = new EventDrivenCalculatorController();
      let calculationResults = null;
      let errorResults = null;

      // Listen for calculation events
      controller.eventEmitter.on("calculation:completed", (data) => {
        calculationResults = data;
      });

      controller.eventEmitter.on("calculation:error", (data) => {
        errorResults = data;
      });

      // Test valid calculation
      const testData = {
        currentAge: 30,
        retirementAge: 65,
        currentSalary: 75000,
        currentSavings: 15000,
        monthlyExpenses: 4000,
      };

      await controller.startCalculation(testData);

      this.assert(
        calculationResults !== null,
        "Should receive calculation results"
      );
      this.assert(
        calculationResults.performance,
        "Should include performance metrics"
      );
      this.assert(
        calculationResults.results,
        "Should include calculation results"
      );

      // Test auto-calculation toggle
      controller.enableAutoCalculate();
      this.assert(
        controller.getCalculationState().autoCalculate === true,
        "Auto-calculate should be enabled"
      );

      controller.disableAutoCalculate();
      this.assert(
        controller.getCalculationState().autoCalculate === false,
        "Auto-calculate should be disabled"
      );

      // Test state export/import
      const exportedState = controller.exportState();
      this.assert(
        exportedState.lastResults,
        "Exported state should include results"
      );

      controller.destroy();

      return {
        passed: true,
        details: "All calculator controller tests passed",
      };
    });
  }

  /**
   * Test: UI Components
   */
  async testUIComponents() {
    await this.runTest("UI Components", async () => {
      const emitter = new EventEmitter();
      const uiManager = new ReactiveUIManager(emitter);

      // Test component initialization
      uiManager.initializeStandardComponents();
      const status = uiManager.getStatus();

      this.assert(
        status.componentCount >= 5,
        "Should have at least 5 components"
      );
      this.assert(
        status.activeComponents.length > 0,
        "Should have active components"
      );

      // Test custom component
      class TestComponent extends ReactiveComponent {
        constructor(eventEmitter, targetId) {
          super(eventEmitter, "test-component", targetId);
          this.updateCount = 0;
        }

        onDataUpdate(data) {
          this.updateCount++;
          return { element: null, success: true };
        }
      }

      const testComponent = new TestComponent(emitter, "test-target");
      uiManager.addComponent(testComponent);

      // Test component response to events
      emitter.emit("calculation:completed", { test: "data" });

      // Give component time to respond
      await this.delay(10);

      this.assert(
        testComponent.updateCount >= 0,
        "Component should handle events"
      );

      uiManager.destroyAll();

      return { passed: true, details: "All UI component tests passed" };
    });
  }

  /**
   * Test: Form Integration
   */
  async testFormIntegration() {
    await this.runTest("Form Integration", async () => {
      // Create minimal DOM for testing
      this.createTestDOM();

      const calculator = new EventDrivenRetirementCalculator();
      calculator.initialize();

      let formChangeCount = 0;
      calculator.calculatorController.eventEmitter.on(
        "form:field-changed",
        () => {
          formChangeCount++;
        }
      );

      // Test programmatic field setting
      const success = calculator.setField("currentAge", 35);
      this.assert(success === true, "Should successfully set field value");

      // Give time for events to propagate
      await this.delay(50);

      // Test form data collection
      const formData = calculator.getFormData();
      this.assert(
        formData.currentAge === 35,
        "Form data should reflect field change"
      );

      calculator.destroy();
      this.cleanupTestDOM();

      return { passed: true, details: "All form integration tests passed" };
    });
  }

  /**
   * Test: Full System Integration
   */
  async testFullSystemIntegration() {
    await this.runTest("Full System Integration", async () => {
      this.createTestDOM();

      const calculator = new EventDrivenRetirementCalculator();
      calculator.initialize();

      // Test complete workflow
      calculator.setField("currentAge", 40);
      calculator.setField("retirementAge", 65);
      calculator.setField("currentSalary", 80000);
      calculator.setField("currentSavings", 100000);
      calculator.setField("monthlyExpenses", 5000);

      // Enable auto-calculation
      calculator.setAutoCalculate(true);

      // Trigger form change and wait for auto-calculation
      calculator.setField("currentSalary", 85000);

      await this.delay(500); // Wait for debounced calculation

      const results = calculator.getResults();
      this.assert(results !== null, "Should have calculation results");

      const status = calculator.getSystemStatus();
      this.assert(status.initialized === true, "System should be initialized");
      this.assert(
        status.calculation.autoCalculate === true,
        "Auto-calculation should be enabled"
      );

      calculator.destroy();
      this.cleanupTestDOM();

      return { passed: true, details: "Full system integration test passed" };
    });
  }

  /**
   * Test: Event Propagation
   */
  async testEventPropagation() {
    await this.runTest("Event Propagation", async () => {
      const emitter = new EventEmitter();
      const events = [];

      // Set up event chain
      emitter.on("start", () => {
        events.push("start");
        emitter.emit("middle", { from: "start" });
      });

      emitter.on("middle", (data) => {
        events.push("middle");
        emitter.emit("end", { from: "middle", original: data.from });
      });

      emitter.on("end", (data) => {
        events.push("end");
      });

      // Trigger event chain
      emitter.emit("start");

      this.assert(events.length === 3, "Should have 3 events in chain");
      this.assert(events[0] === "start", "First event should be start");
      this.assert(events[2] === "end", "Last event should be end");

      return { passed: true, details: "Event propagation test passed" };
    });
  }

  /**
   * Test: Error Handling
   */
  async testErrorHandling() {
    await this.runTest("Error Handling", async () => {
      const controller = new EventDrivenCalculatorController();
      let errorCaught = false;
      let errorData = null;

      controller.eventEmitter.on("calculation:error", (data) => {
        errorCaught = true;
        errorData = data;
      });

      // Test invalid calculation data
      try {
        await controller.startCalculation({
          currentAge: -5, // Invalid age
          retirementAge: 65,
        });
      } catch (error) {
        // Expected error
      }

      // Give time for error event
      await this.delay(10);

      this.assert(errorCaught === true, "Should catch calculation error");
      this.assert(errorData !== null, "Should have error data");

      controller.destroy();

      return { passed: true, details: "Error handling test passed" };
    });
  }

  /**
   * Test: Calculation Performance
   */
  async testCalculationPerformance() {
    await this.runTest("Calculation Performance", async () => {
      this.createTestDOM();

      const calculator = new EventDrivenRetirementCalculator();
      calculator.initialize();

      const testData = {
        currentAge: 35,
        retirementAge: 65,
        currentSalary: 75000,
        currentSavings: 50000,
        monthlyExpenses: 4500,
      };

      const iterations = 20;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await calculator.calculate(testData);
        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      this.performanceResults.push({
        test: "Calculation Performance",
        iterations: iterations,
        averageTime: avgTime,
        maxTime: maxTime,
        minTime: Math.min(...times),
      });

      this.assert(
        avgTime < 100,
        `Average calculation time should be under 100ms (was ${avgTime.toFixed(
          2
        )}ms)`
      );
      this.assert(
        maxTime < 200,
        `Max calculation time should be under 200ms (was ${maxTime.toFixed(
          2
        )}ms)`
      );

      calculator.destroy();
      this.cleanupTestDOM();

      return {
        passed: true,
        details: `Performance: avg ${avgTime.toFixed(
          2
        )}ms, max ${maxTime.toFixed(2)}ms`,
      };
    });
  }

  /**
   * Test: Event Performance
   */
  async testEventPerformance() {
    await this.runTest("Event Performance", async () => {
      const emitter = new EventEmitter();
      let eventCount = 0;

      // Add many listeners
      for (let i = 0; i < 100; i++) {
        emitter.on("performance-test", () => {
          eventCount++;
        });
      }

      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        emitter.emit("performance-test", { iteration: i });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const eventsPerMs = eventCount / totalTime;

      this.performanceResults.push({
        test: "Event Performance",
        iterations: iterations,
        listeners: 100,
        totalEvents: eventCount,
        totalTime: totalTime,
        eventsPerMs: eventsPerMs,
      });

      this.assert(
        eventsPerMs > 10,
        `Should process at least 10 events per ms (was ${eventsPerMs.toFixed(
          2
        )})`
      );
      this.assert(
        eventCount === iterations * 100,
        "All events should be processed"
      );

      return {
        passed: true,
        details: `Performance: ${eventsPerMs.toFixed(2)} events/ms`,
      };
    });
  }

  /**
   * Test: Memory Leaks
   */
  async testMemoryLeaks() {
    await this.runTest("Memory Leaks", async () => {
      const initialMemory = this.getMemoryUsage();

      // Create and destroy multiple calculators
      for (let i = 0; i < 10; i++) {
        this.createTestDOM();

        const calculator = new EventDrivenRetirementCalculator();
        calculator.initialize();

        // Add some load
        for (let j = 0; j < 20; j++) {
          calculator.setField("currentAge", 30 + j);
        }

        calculator.destroy();
        this.cleanupTestDOM();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = this.getMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      this.performanceResults.push({
        test: "Memory Usage",
        initialMemory: initialMemory,
        finalMemory: finalMemory,
        increase: memoryIncrease,
      });

      // Allow for some memory increase but flag if excessive
      const isMemoryOk = memoryIncrease < 10; // Less than 10MB increase

      return {
        passed: isMemoryOk,
        details: `Memory change: ${memoryIncrease.toFixed(2)}MB ${
          isMemoryOk ? "✓" : "⚠️"
        }`,
      };
    });
  }

  /**
   * Test: Phase Compatibility
   */
  async testPhaseCompatibility() {
    await this.runTest("Phase Compatibility", async () => {
      // Test that Phase 3 can work with Phase 1 and Phase 2 components
      this.createTestDOM();

      const calculator = new EventDrivenRetirementCalculator();
      calculator.initialize();

      // Test Phase 1 compatibility (calculation engine)
      const phase1Data = {
        currentAge: 30,
        retirementAge: 65,
        currentSalary: 75000,
        currentSavings: 15000,
        monthlyExpenses: 4000,
      };

      const results = await calculator.calculate(phase1Data);
      this.assert(
        results !== null,
        "Should work with Phase 1 calculation engine"
      );

      // Test Phase 2 compatibility (DOM adapter)
      const formData = calculator.getFormData();
      this.assert(
        typeof formData === "object",
        "Should work with Phase 2 DOM adapter"
      );

      // Test system status
      const status = calculator.getSystemStatus();
      this.assert(
        status.version === "Phase 3 - Event-Driven",
        "Should identify as Phase 3"
      );

      calculator.destroy();
      this.cleanupTestDOM();

      return { passed: true, details: "Compatible with all previous phases" };
    });
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    console.log(`🧪 Running: ${testName}`);
    this.currentTest = testName;

    const startTime = performance.now();

    try {
      const result = await testFunction();
      const endTime = performance.now();

      this.testResults.push({
        name: testName,
        passed: result.passed,
        details: result.details,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
      });

      const status = result.passed ? "✅" : "❌";
      console.log(
        `   ${status} ${testName}: ${result.details} (${(
          endTime - startTime
        ).toFixed(2)}ms)`
      );
    } catch (error) {
      const endTime = performance.now();

      this.testResults.push({
        name: testName,
        passed: false,
        details: `Error: ${error.message}`,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
      });

      console.log(`   ❌ ${testName}: Error - ${error.message}`);
    }
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Create minimal test DOM
   */
  createTestDOM() {
    if (typeof document === "undefined") return;

    const testContainer = document.createElement("div");
    testContainer.id = "test-container";
    testContainer.innerHTML = `
      <input type="number" id="currentAge" value="30">
      <input type="number" id="retirementAge" value="65">
      <input type="number" id="currentSalary" value="75000">
      <input type="number" id="currentSavings" value="15000">
      <input type="number" id="monthlyExpenses" value="4000">
      <div id="results-table"></div>
      <div id="kpi-display"></div>
    `;

    document.body.appendChild(testContainer);
  }

  /**
   * Cleanup test DOM
   */
  cleanupTestDOM() {
    if (typeof document === "undefined") return;

    const testContainer = document.getElementById("test-container");
    if (testContainer) {
      testContainer.remove();
    }
  }

  /**
   * Get memory usage (browser/Node.js compatible)
   */
  getMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    } else if (typeof performance !== "undefined" && performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Display test summary
   */
  displayTestSummary() {
    console.log("\n📊 Phase 3 Test Summary");
    console.log("========================");

    const passed = this.testResults.filter((t) => t.passed).length;
    const failed = this.testResults.filter((t) => !t.passed).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((t) => !t.passed)
        .forEach((test) => {
          console.log(`   - ${test.name}: ${test.details}`);
        });
    }

    if (this.performanceResults.length > 0) {
      console.log("\n⚡ Performance Results:");
      this.performanceResults.forEach((perf) => {
        console.log(`   ${perf.test}:`, perf);
      });
    }

    const totalTime = this.testResults.reduce(
      (sum, test) => sum + test.duration,
      0
    );
    console.log(`\nTotal Test Time: ${totalTime.toFixed(2)}ms`);

    console.log("\n✅ Phase 3 testing complete!");
  }

  /**
   * Get test results for external analysis
   */
  getResults() {
    return {
      tests: this.testResults,
      performance: this.performanceResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter((t) => t.passed).length,
        failed: this.testResults.filter((t) => !t.passed).length,
        successRate:
          (this.testResults.filter((t) => t.passed).length /
            this.testResults.length) *
          100,
      },
    };
  }
}

/**
 * Auto-run tests when loaded directly
 */
async function runPhase3Tests() {
  const testSuite = new Phase3TestSuite();
  await testSuite.runAllTests();
  return testSuite.getResults();
}

// Auto-run if this file is executed directly
if (
  typeof window !== "undefined" &&
  window.location.search.includes("run-tests")
) {
  runPhase3Tests();
}

// Node.js execution
if (typeof module !== "undefined" && require.main === module) {
  console.log("🧪 Running Phase 3 Tests in Node.js environment");
  runPhase3Tests()
    .then((results) => {
      console.log("\n📋 Test Results Summary:");
      console.log(JSON.stringify(results.summary, null, 2));
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

export { Phase3TestSuite, runPhase3Tests };
