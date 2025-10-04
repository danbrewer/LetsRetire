Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.asCurrency = function () {
  return this.round(2);
};

// Extracts the textual parameter list exactly as written.
// Supports: normal functions, methods, async, and arrow functions.
// If it's a single-identifier arrow param (no parentheses), returns that identifier.
function getParamText(fn) {
  const src = fn.toString().trim();

  // 1) Anything with (...) up front (functions, methods, arrows like () => or (x, y=1) =>)
  const paren = src.match(/^[^(]*\(([^)]*)\)/s);
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

Object.defineProperty(Object.prototype, "dump", {
  value: function (title, depth = 0) {
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      const header = title || this._description || "Object Dump";
      console.log(`${header}:`);
    }

    if (Array.isArray(this)) {
      this.forEach((val, i) => {
        if (val && typeof val === "object") {
          console.log(`${indent}- [${i}]`);
          val.dump(null, depth + 1);
        } else {
          console.log(`${indent}- [${i}] ${val}`);
        }
      });
      return;
    }

    for (const [key, value] of Object.entries(this)) {
      if (typeof value === "function") {
        const paramText = getParamText(value);

        // Run only if we can confidently tell there are zero declared params: "()"
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
          // Just display signature; do not execute
          const sig = paramText === null ? "[unknown signature]" : paramText;
          console.log(`${indent}- ${key}(${sig}) [function]`);
        }
      } else if (value && typeof value === "object") {
        console.log(`${indent}- ${key}:`);
        value.dump(null, depth + 1);
      } else if (key === "_description") {
        // skip _description
      } else {
        console.log(`${indent}- ${key.padEnd(30)} ${value}`);
      }
    }
  },
  enumerable: false,
});

function dedent(strings, ...values) {
  const raw = String.raw({ raw: strings }, ...values);

  // Find minimum indentation
  const lines = raw.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const indent = Math.min(
    ...nonEmpty.map((line) => line.match(/^(\s*)/)[0].length)
  );

  // Remove that indentation from every line
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}

// Add method to Number prototype
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.adjustedForInflation = function (inflationRate, years) {
  const adjustedValue = this * Math.pow(1 + inflationRate, years);
  return adjustedValue;
};

// Global logging level (adjust at runtime)
LOG_LEVEL = 4; // 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG

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
      const ts = ""; // ` [${new Date().toTimeString()}]`;
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
