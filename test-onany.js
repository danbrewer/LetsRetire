/**
 * Test the onAny method fix
 */

import { EventEmitter } from "./event-system.js";

console.log("🧪 Testing onAny method fix...");

const emitter = new EventEmitter();
let eventsCaught = [];

// Set up onAny listener
emitter.onAny((eventType, data) => {
  eventsCaught.push({ eventType, data });
  console.log(`📡 Caught event: ${eventType}`, data);
});

// Test regular event
emitter.on("test-event", (data) => {
  console.log("📡 Regular listener triggered:", data);
});

// Emit some test events
emitter.emit("test-event", { message: "Hello World" });
emitter.emit("another-event", { value: 42 });
emitter.emit("third-event", { status: "working" });

console.log(`✅ onAny caught ${eventsCaught.length} events:`);
eventsCaught.forEach((event, index) => {
  console.log(`  ${index + 1}. ${event.eventType}:`, event.data);
});

if (eventsCaught.length === 3) {
  console.log("🎉 onAny method is working correctly!");
} else {
  console.log("❌ onAny method test failed");
}
