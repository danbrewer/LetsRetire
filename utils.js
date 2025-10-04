// =====================
// Number prototype helpers
// =====================

Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.asCurrency = function () {
  return this.round(2);
};

Number.prototype.adjustedForInflation = function (inflationRate, years) {
  const adjustedValue = this * Math.pow(1 + inflationRate, years);
  return adjustedValue;
};

// =====================
// Function helpers
// =====================

// Extracts the textual parameter list exactly as written.
// Supports: normal functions, methods, async, and arrow functions.
// If it's a single-identifier arrow param (no parentheses), returns that identifier.
function getParamText(fn) {
  const src = fn.toString().trim();

  // 1) Anything with (...) up front (functions, methods, arrows like () => or (x, y=1) =>)
  const paren = src.match(/^[^(]*\(([^)]*)\)/); // no /s flag for compatibility
  if (paren) return paren[1].trim(); // may be "" for zero-arg

  // 2) Single-identifier arrow function param:  x => ...
  const ident = src.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/);
  if (ident) return ident[1];

  // Fallback: unknown/edge case—don’t assume zero args
  return null;
}

function safeFormat(value) {
  try {
    if (typeof value === "string") return JSON.stringify(value);
    if (value && typeof value === "object") {
      return JSON.stringify(value, (k, v) => (v === undefined ? null : v));
    }
    return String(value);
  } catch {
    return "[unserializable result]";
  }
}

// =====================
// String helpers
// =====================

function dedent(strings, ...values) {
  const raw = String.raw({ raw: strings }, ...values);
  const lines = raw.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const indent = Math.min(
    ...nonEmpty.map((line) => line.match(/^(\s*)/)[0].length)
  );
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}

// =====================
// Logging
// =====================

let LOG_LEVEL = 4; // 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG

const LEVELS = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
};

const log = {
  _shouldLog(level) {
    return LEVELS[level] <= LOG_LEVEL;
  },

  error(...args) {
    if (this._shouldLog("ERROR")) {
      const ts = new Date().toTimeString();
      console.error(`[ERROR] [${ts}]`, ...args);
    }
  },

  warn(...args) {
    if (this._shouldLog("WARN")) {
      const ts = new Date().toTimeString();
      console.warn(`[WARN]  [${ts}]`, ...args);
    }
  },

  info(...args) {
    if (this._shouldLog("INFO")) {
      const ts = ""; // could add timestamp if you like
      console.info(`[INFO]  ${ts}`, ...args);
    }
  },

  debug(...args) {
    if (this._shouldLog("DEBUG")) {
      const ts = new Date().toTimeString();
      console.debug(`[DEBUG] [${ts}]`, ...args);
    }
  },
};

// =====================
// Dump utilities
// =====================

// Optional symbol label for pretty headings
const DUMP_LABEL = Symbol("dumpLabel");

/**
 * Attach a pretty label (e.g., "incomeResults.incomeBreakdown") to any value
 * so it prints as a heading when dumped.
 */
function withLabel(label, value) {
  if (value !== Object(value)) {
    return { [DUMP_LABEL]: label, value };
  }
  if (Object.prototype.hasOwnProperty.call(value, DUMP_LABEL)) {
    value[DUMP_LABEL] = label; // update
  } else {
    Object.defineProperty(value, DUMP_LABEL, {
      value: label,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return value;
}

// Choose a heading for objects/functions when no explicit label was provided.
function _labelFor(value, fallback) {
  if (value && value[DUMP_LABEL]) return value[DUMP_LABEL];

  if (value && typeof value === "object") {
    if ("value" in value && value[DUMP_LABEL]) return value[DUMP_LABEL];
    if (value._dumpLabel) return value._dumpLabel;
    if (value._description) return value._description;
    if (
      value.constructor &&
      value.constructor.name &&
      value.constructor.name !== "Object"
    ) {
      return value.constructor.name;
    }
    return "Object";
  }

  if (typeof value === "function") {
    return value.name ? value.name + "()" : "Function";
  }

  return fallback || "Unknown";
}

// Define the dump method as non-enumerable so it won't appear in Object.entries
Object.defineProperty(Object.prototype, "dump", {
  enumerable: false,
  configurable: true,
  writable: true,
  value: function (title, depth = 0) {
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      const header = title || this._description || "Object Dump";
      console.log(`${header}:`);
    }

    // Arrays
    if (Array.isArray(this)) {
      this.forEach((val, i) => {
        if (val && typeof val === "object") {
          console.log(`${indent}- [${i}]`);
          val.dump(null, depth + 1);
        } else {
          console.log(`${indent}- [${i}] ${safeFormat(val)}`);
        }
      });
      return;
    }

    for (const [key, value] of Object.entries(this)) {
      if (key === "_description") continue; // skip

      // ------- SPECIAL CASE: calculationDetails -------
      if (key === "calculationDetails") {
        const contributors = Array.isArray(value) ? value : [value];
        console.log(`${indent}- calculationDetails:`);

        contributors.forEach((contrib, idx) => {
          const heading = _labelFor(contrib, `Contributor #${idx + 1}`);
          console.log(`${indent}  - ${heading}:`);

          if (typeof contrib === "function") {
            const params = getParamText(contrib);
            const zeroParams = params !== null && params === "";

            if (zeroParams) {
              try {
                const result = contrib.call(this);
                if (result && typeof result === "object") {
                  result.dump(null, depth + 2);
                } else {
                  console.log(`${indent}    - result() ${safeFormat(result)}`);
                }
              } catch (e) {
                console.log(
                  `${indent}    - [function threw: ${e?.message ?? e}]`
                );
              }
            } else {
              const sig = params === null ? "[unknown signature]" : params;
              console.log(`${indent}    - (${sig}) [function]`);
            }
          } else if (contrib && typeof contrib === "object") {
            contrib.dump(null, depth + 2);
          } else {
            console.log(`${indent}    - ${safeFormat(contrib)}`);
          }
        });
        continue;
      }
      // ------- END SPECIAL CASE -------

      if (typeof value === "function") {
        const paramText = getParamText(value);
        const hasZeroParams = paramText !== null && paramText === "";

        if (hasZeroParams) {
          try {
            const result = value.call(this);
            console.log(
              `${indent}- ${(key + "()").padEnd(30)} ${safeFormat(result)}`
            );
          } catch (e) {
            console.log(
              `${indent}- ${(key + "()").padEnd(30)} [function threw: ${e?.message ?? e}]`
            );
          }
        } else {
          const sig = paramText === null ? "[unknown signature]" : paramText;
          console.log(`${indent}- ${key}(${sig}) [function]`);
        }
      } else if (value && typeof value === "object") {
        console.log(`${indent}- ${key}:`);
        value.dump(null, depth + 1);
      } else {
        if (
          value &&
          typeof value === "object" &&
          "value" in value &&
          value[DUMP_LABEL]
        ) {
          // labeled primitive wrapper
          console.log(
            `${indent}- ${value[DUMP_LABEL]}: ${safeFormat(value.value)}`
          );
        } else {
          console.log(`${indent}- ${key.padEnd(30)} ${safeFormat(value)}`);
        }
      }
    }
  },
});
