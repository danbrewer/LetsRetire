import { formatDateYYYYMMDD } from "./utils.js";

const DUMP_CALCULATION_DETAILS = true; // set to false to disable detailed calc dumps

// =====================
// Function helpers
// =====================

// Extracts the textual parameter list exactly as written.
// Supports: normal functions, methods, async, and arrow functions.
// If it's a single-identifier arrow param (no parentheses), returns that identifier.
/**
 * @param {{ toString: () => string; }} fn
 */
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

// Safe formatting of values for logging/dumping

/**
 * @param {any} value
 */
function safeFormat(value) {
  try {
    if (typeof value === "string") return JSON.stringify(value);
    if (value && typeof value === "object") {
      // @ts-ignore
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

// /**
//  * @param {any} strings
//  * @param {any[]} values
//  */
// function dedent(strings, ...values) {
//   const raw = String.raw({ raw: strings }, ...values);
//   const lines = raw.split("\n");
//   const nonEmpty = lines.filter((line) => line.trim().length > 0);
//   const indent = Math.min(
//     ...nonEmpty.map((line) => line.match(/^(\s*)/)[0].length)
//   );
//   return lines
//     .map((line) => line.slice(indent))
//     .join("\n")
//     .trim();
// }

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
  /**
   * @param {number} level
   */
  _shouldLog(level) {
    return level <= LOG_LEVEL;
  },

  /**
   * @param {string[]} args
   */
  error(...args) {
    if (this._shouldLog(LEVELS.ERROR)) {
      const ts = new Date().toTimeString();
      console.error(`[ERROR] [${ts}]`, ...args);
    }
  },

  /**
   * @param {string[]} args
   */
  warn(...args) {
    if (this._shouldLog(LEVELS.WARN)) {
      const ts = new Date().toTimeString();
      console.warn(`[WARN]  [${ts}]`, ...args);
    }
  },

  /**
   * @param {(string | undefined)[]} args
   */
  info(...args) {
    if (this._shouldLog(LEVELS.INFO)) {
      const ts = ""; // could add timestamp if you like
      console.info(`[INFO]  ${ts}`, ...args);
    }
  },

  /**
   * @param {any[]} args
   */
  debug(...args) {
    if (this._shouldLog(LEVELS.DEBUG)) {
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
 * @param {string} label
 * @param {any} value
 */
function withLabel(label, value) {
  if (value !== Object(value)) {
    return { [DUMP_LABEL]: label, value };
  }
  if (Object.prototype.hasOwnProperty.call(value, DUMP_LABEL)) {
    // @ts-ignore
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
/**
 * @param {any} value
 * @param {string} fallback
 */
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

/** 
@param {any} obj
@param {string} [title]
*/
function dumpObject(obj, title) {
  makeDumpable(obj).dump(title);
}

/**
 * @param {any} obj
 */
function makeDumpable(obj) {
  Object.defineProperty(obj, "dump", {
    enumerable: false,
    configurable: true,
    writable: false,
    value(/** @type {string} */ title) {
      dump(obj, title);
    },
  });
  return obj;
}

/**
 * @param {any} obj
 * @param {string} [title]
 */
function dump(obj, title, depth = 0) {
  const indent = "  ".repeat(depth);
  const colWidth = 30; // adjust for alignment width

  if (depth === 0) {
    const header = title || obj._description || "Object Dump";
    console.log(`${header}:`);
  }

  // Arrays
  if (Array.isArray(obj)) {
    obj.forEach((val, i) => {
      if (val && typeof val === "object") {
        console.log(`${indent}- [${i}]`);
        val.dump(null, depth + 1);
      } else {
        console.log(`${indent}- [${i}] ${safeFormat(val)}`);
      }
    });
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "_description") continue; // skip

    // ------- SPECIAL CASE: calculationDetails -------
    if (key === "calculationDetails") {
      if (!DUMP_CALCULATION_DETAILS) {
        continue; // skip entirely when disabled
      }

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
              const result = contrib.call(obj);
              if (result && typeof result === "object") {
                result.dump(null, depth + 2);
              } else {
                console.log(`${indent}    - result() ${safeFormat(result)}`);
              }
            } catch (e) {
              console.log(
                // @ts-ignore
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
          const result = value.call(obj);
          console.log(
            `${indent}- ${(key + "()").padEnd(colWidth)} ${alignValue(result, colWidth)}`
          );
        } catch (e) {
          console.log(
            // @ts-ignore
            `${indent}- ${(key + "()").padEnd(colWidth)} [function threw: ${e?.message ?? e}]`
          );
        }
      } else {
        const sig = paramText === null ? "[unknown signature]" : paramText;
        console.log(`${indent}- ${key}(${sig}) [function]`);
      }
    } else if (value instanceof Date) {
      console.log(
        `${indent}- ${key.padEnd(colWidth)} ${alignValue(formatDateYYYYMMDD(value), colWidth)}`
      );
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
          `${indent}- ${value[DUMP_LABEL]}: ${alignValue(value.value, colWidth)}`
        );
      } else {
        console.log(
          `${indent}- ${key.padEnd(colWidth)} ${alignValue(value, colWidth)}`
        );
      }
    }
  }

  // ===================================================
  // 🔍 NEW SECTION: Include getters from prototype
  // ===================================================
  const proto = Object.getPrototypeOf(obj);
  if (proto && proto !== Object.prototype) {
    const props = Object.getOwnPropertyDescriptors(proto);

    for (const [key, desc] of Object.entries(props)) {
      if (key === "constructor") continue;
      if (typeof desc.get === "function") {
        try {
          const value = obj[key];
          if (value && typeof value === "object") {
            console.log(`${indent}- ${key}:`);
            value.dump(null, depth + 1);
          } else {
            console.log(
              `${indent}- ${key.padEnd(colWidth)} ${alignValue(value, colWidth)}`
            );
          }
        } catch (e) {
          console.log(
            // @ts-ignore
            `${indent}- ${key.padEnd(colWidth)} [getter threw: ${e?.message ?? e}]`
          );
        }
      }
    }
  }
}

// // // Define the dump method as non-enumerable so it won't appear in Object.entries
// Object.defineProperty(Object.prototype, "dump", {
//   enumerable: false,
//   configurable: true,
//   writable: true,
//   value: function (/** @type {any} */ title, depth = 0) {
//     const indent = "  ".repeat(depth);
//     const colWidth = 30; // adjust for alignment width

//     if (depth === 0) {
//       const header = title || this._description || "Object Dump";
//       console.log(`${header}:`);
//     }

//     // Arrays
//     if (Array.isArray(this)) {
//       this.forEach((val, i) => {
//         if (val && typeof val === "object") {
//           console.log(`${indent}- [${i}]`);
//           val.dump(null, depth + 1);
//         } else {
//           console.log(`${indent}- [${i}] ${safeFormat(val)}`);
//         }
//       });
//       return;
//     }

//     for (const [key, value] of Object.entries(this)) {
//       if (key === "_description") continue; // skip

//       // ------- SPECIAL CASE: calculationDetails -------
//       if (key === "calculationDetails") {
//         if (!DUMP_CALCULATION_DETAILS) {
//           continue; // skip entirely when disabled
//         }

//         const contributors = Array.isArray(value) ? value : [value];
//         console.log(`${indent}- calculationDetails:`);

//         contributors.forEach((contrib, idx) => {
//           const heading = _labelFor(contrib, `Contributor #${idx + 1}`);
//           console.log(`${indent}  - ${heading}:`);

//           if (typeof contrib === "function") {
//             const params = getParamText(contrib);
//             const zeroParams = params !== null && params === "";

//             if (zeroParams) {
//               try {
//                 const result = contrib.call(this);
//                 if (result && typeof result === "object") {
//                   result.dump(null, depth + 2);
//                 } else {
//                   console.log(`${indent}    - result() ${safeFormat(result)}`);
//                 }
//               } catch (e) {
//                 console.log(
//                   // @ts-ignore
//                   `${indent}    - [function threw: ${e?.message ?? e}]`
//                 );
//               }
//             } else {
//               const sig = params === null ? "[unknown signature]" : params;
//               console.log(`${indent}    - (${sig}) [function]`);
//             }
//           } else if (contrib && typeof contrib === "object") {
//             contrib.dump(null, depth + 2);
//           } else {
//             console.log(`${indent}    - ${safeFormat(contrib)}`);
//           }
//         });
//         continue;
//       }
//       // ------- END SPECIAL CASE -------

//       if (typeof value === "function") {
//         const paramText = getParamText(value);
//         const hasZeroParams = paramText !== null && paramText === "";

//         if (hasZeroParams) {
//           try {
//             const result = value.call(this);
//             console.log(
//               `${indent}- ${(key + "()").padEnd(colWidth)} ${alignValue(result, colWidth)}`
//             );
//           } catch (e) {
//             console.log(
//               // @ts-ignore
//               `${indent}- ${(key + "()").padEnd(colWidth)} [function threw: ${e?.message ?? e}]`
//             );
//           }
//         } else {
//           const sig = paramText === null ? "[unknown signature]" : paramText;
//           console.log(`${indent}- ${key}(${sig}) [function]`);
//         }
//       } else if (value instanceof Date) {
//         console.log(
//           `${indent}- ${key.padEnd(colWidth)} ${alignValue(formatDateYYYYMMDD(value), colWidth)}`
//         );
//       } else if (value && typeof value === "object") {
//         console.log(`${indent}- ${key}:`);
//         value.dump(null, depth + 1);
//       } else {
//         if (
//           value &&
//           typeof value === "object" &&
//           "value" in value &&
//           value[DUMP_LABEL]
//         ) {
//           // labeled primitive wrapper
//           console.log(
//             `${indent}- ${value[DUMP_LABEL]}: ${alignValue(value.value, colWidth)}`
//           );
//         } else {
//           console.log(
//             `${indent}- ${key.padEnd(colWidth)} ${alignValue(value, colWidth)}`
//           );
//         }
//       }
//     }

//     // ===================================================
//     // 🔍 NEW SECTION: Include getters from prototype
//     // ===================================================
//     const proto = Object.getPrototypeOf(this);
//     if (proto && proto !== Object.prototype) {
//       const props = Object.getOwnPropertyDescriptors(proto);

//       for (const [key, desc] of Object.entries(props)) {
//         if (key === "constructor") continue;
//         if (typeof desc.get === "function") {
//           try {
//             const value = this[key];
//             if (value && typeof value === "object") {
//               console.log(`${indent}- ${key}:`);
//               value.dump(null, depth + 1);
//             } else {
//               console.log(
//                 `${indent}- ${key.padEnd(colWidth)} ${alignValue(value, colWidth)}`
//               );
//             }
//           } catch (e) {
//             console.log(
//               // @ts-ignore
//               `${indent}- ${key.padEnd(colWidth)} [getter threw: ${e?.message ?? e}]`
//             );
//           }
//         }
//       }
//     }
//   },
// });

// helper: align numbers right, strings left
/**
 * @param {any} val
 * @param {number} width
 */
function alignValue(val, width) {
  if (typeof val === "number") {
    return String(val).padStart(width);
  }
  return String(val).padEnd(width);
}

export { log, withLabel, dumpObject, makeDumpable };
