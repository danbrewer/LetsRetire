import { DateFunctions, StringFunctions } from "./utils.js";

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

  // Fallback: unknown/edge case—don't assume zero args
  return null;
}

/**
 * Check if a value is a Proxy object
 * @param {any} value
 * @returns {boolean}
 */
function isProxy(value) {
  if (!value || typeof value !== "object") return false;

  // Check for undefined constructor or missing dump method (classic proxy symptoms)
  if (value.constructor === undefined || typeof value.dump === "undefined") {
    return true;
  }

  // Check for empty object with Object constructor
  if (value.constructor === Object) {
    try {
      const ownKeys = Object.getOwnPropertyNames(value);
      if (ownKeys.length === 0) {
        return true;
      }
    } catch {
      return true;
    }
  }

  return false;
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

// // Define the dump method as non-enumerable so it won't appear in Object.entries
// Object.defineProperty(Object.prototype, "dump", {
//   enumerable: false,
//   configurable: true,
//   writable: true,
//   value: function (/** @type {any} */ title, mode = "deep", depth = 0) {
//     const indent = "  ".repeat(depth + 1);
//     const keyWidth = 70; // Reserve 70 characters for keys
//     const valueWidth = 30; // Reserve 30 characters for values
//     const isShallow = mode === "shallow";

//     if (depth === 0) {
//       const header = title || this._description || "Object Dump";
//       const modeIndicator = isShallow ? " (shallow)" : "";
//       console.log(`${header}${modeIndicator}:`);
//     }

//     // Arrays
//     if (Array.isArray(this)) {
//       this.forEach((val, i) => {
//         if (val && typeof val === "object") {
//           if (isShallow && depth === 0) {
//             const typeInfo = val.constructor ? val.constructor.name : "Object";
//             const size = Array.isArray(val) ? `[${val.length}]` : "";
//             console.log(`${indent}[${i}] [${typeInfo}${size}]`);
//           } else {
//             console.log(`${indent}[${i}]`);
//             val.dump(null, mode, depth + 1);
//           }
//         } else {
//           const keyValue = StringFunctions.padAndAlign(
//             `${indent}[${i}]`,
//             keyWidth
//           );
//           const formattedValue = StringFunctions.padAndAlign(
//             safeFormat(val),
//             valueWidth,
//             "right"
//           );
//           console.log(`${keyValue}${formattedValue}`);
//         }
//         // if (val && typeof val === "object") {
//         //   console.log(`${indent}[${i}]`);
//         //   val.dump(null, mode, depth + 1);
//         // } else {
//         //   // const indexKey = `[${i}]`;
//         //   // const formattedValue = safeFormat(val);
//         //   // console.log(
//         //   //   `${indent}${StringFunctions.padAndAlign(indexKey, formattedValue, keyWidth, valueWidth, "left", "right")}`
//         //   // );
//         //   console.log(`${indent}[${i}] ${safeFormat(val)}`);
//         // }
//       });
//       return;
//     }

//     for (const [key, value] of Object.entries(this)) {
//       if (key === "_description") continue; // skip

//       // // Skip AccountAnalyzer objects to avoid proxy issues
//       // if (
//       //   value &&
//       //   value.constructor &&
//       //   value.constructor.name === "AccountAnalyzer"
//       // ) {
//       //   const outputKey = StringFunctions.padAndAlign(
//       //     `${indent}- ${key}`,
//       //     keyWidth
//       //   );
//       //   const outputValue = StringFunctions.padAndAlign(
//       //     "[AccountAnalyzer]",
//       //     valueWidth,
//       //     "right"
//       //   );
//       //   console.log(`${outputKey}${outputValue}`);
//       //   continue;
//       // }

//       // ------- SPECIAL CASE: calculationDetails -------
//       if (key === "calculationDetails") {
//         if (!DUMP_CALCULATION_DETAILS) {
//           continue; // skip entirely when disabled
//         }

//         if (isShallow && depth === 0) {
//           // In shallow mode, just show that calculationDetails exists
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}calculationDetails`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             "[details]",
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//           continue;
//         }

//         const contributors = Array.isArray(value) ? value : [value];
//         console.log(`${indent}calculationDetails:`);

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
//                   result.dump(null, mode, depth + 2);
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
//             contrib.dump(null, mode, depth + 2);
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
//           const displayKey = StringFunctions.padAndAlign(
//             `${indent}${key}()`,
//             keyWidth
//           );
//           try {
//             const result = value.call(this);
//             const formattedValue = StringFunctions.padAndAlign(
//               result,
//               valueWidth,
//               "right"
//             );
//             console.log(`${displayKey}${formattedValue}`);
//           } catch (e) {
//             const outputKey = StringFunctions.padAndAlign(
//               `${indent}${key}()`,
//               keyWidth
//             );
//             // @ts-ignore
//             const errorMessage = e?.message ?? e;
//             const outputValue = StringFunctions.padAndAlign(
//               "???",
//               valueWidth,
//               "right"
//             );
//             console.log(`${outputKey}${outputValue}`);
//             console.log(`${indent}    [function threw: ${errorMessage}]`);
//           }
//         } else {
//           const sig = paramText === null ? "[unknown signature]" : paramText;
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}${key}(${sig})`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             "[function]",
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//         }
//       } else if (value instanceof Date) {
//         const formattedDate = DateFunctions.formatDateYYYYMMDD(value);
//         const outputKey = StringFunctions.padAndAlign(
//           `${indent}${key}`,
//           keyWidth
//         );
//         const outputValue = StringFunctions.padAndAlign(
//           formattedDate,
//           valueWidth,
//           "right"
//         );
//         console.log(`${outputKey}${outputValue}`);
//       } else if (value && typeof value === "object") {
//         // Generic proxy detection
//         if (isProxy(value)) {
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}${key}`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             "[Proxy]",
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//         } else if (isShallow && depth === 0) {
//           const typeInfo = value.constructor
//             ? value.constructor.name
//             : "Object";
//           const size = Array.isArray(value)
//             ? `[${value.length}]`
//             : value instanceof Map
//               ? `Map(${value.size})`
//               : value instanceof Set
//                 ? `Set(${value.size})`
//                 : "";
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}${key}`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             `[${typeInfo}${size}]`,
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//         } else {
//           console.log(`${indent}${key}:`);
//           value.dump(null, mode, depth + 1);
//         }

//         // console.log(`${indent}${key}:`);
//         // value.dump(null, mode, depth + 1);
//       } else {
//         if (
//           value &&
//           typeof value === "object" &&
//           "value" in value &&
//           value[DUMP_LABEL]
//         ) {
//           // labeled primitive wrapper
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}${key}`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             String(value.value),
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//         } else {
//           const outputKey = StringFunctions.padAndAlign(
//             `${indent}${key}`,
//             keyWidth
//           );
//           const outputValue = StringFunctions.padAndAlign(
//             String(value),
//             valueWidth,
//             "right"
//           );
//           console.log(`${outputKey}${outputValue}`);
//           //
//           // const formattedValue = String(value);
//           // console.log(
//           //   `${indent}${StringFunctions.padAndAlign(key, formattedValue, keyWidth, valueWidth, "left", "right")}`
//           // );
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
//             // // Skip AccountAnalyzer objects in getters too
//             // if (
//             //   value &&
//             //   value.constructor &&
//             //   value.constructor.name === "AccountAnalyzer"
//             // ) {
//             //   const outputKey = StringFunctions.padAndAlign(
//             //     `${indent}${key}`,
//             //     keyWidth
//             //   );
//             //   const outputValue = StringFunctions.padAndAlign(
//             //     "[AccountAnalyzer]",
//             //     valueWidth,
//             //     "right"
//             //   );
//             //   console.log(`${outputKey}${outputValue}`);
//             //   continue;
//             // }

//             if (value && typeof value === "object") {
//               // Generic proxy detection for getters
//               if (isProxy(value)) {
//                 const outputKey = StringFunctions.padAndAlign(
//                   `${indent}${key}`,
//                   keyWidth
//                 );
//                 const outputValue = StringFunctions.padAndAlign(
//                   "[Proxy]",
//                   valueWidth,
//                   "right"
//                 );
//                 console.log(`${outputKey}${outputValue}`);
//               } else if (isShallow && depth === 0) {
//                 const typeInfo = value.constructor
//                   ? value.constructor.name
//                   : "Object";
//                 const size = Array.isArray(value)
//                   ? `[${value.length}]`
//                   : value instanceof Map
//                     ? `Map(${value.size})`
//                     : value instanceof Set
//                       ? `Set(${value.size})`
//                       : "";
//                 const outputKey = StringFunctions.padAndAlign(
//                   `${indent}${key}`,
//                   keyWidth
//                 );
//                 const outputValue = StringFunctions.padAndAlign(
//                   `[${typeInfo}${size}]`,
//                   valueWidth,
//                   "right"
//                 );
//                 console.log(`${outputKey}${outputValue}`);
//               } else {
//                 console.log(`${indent}${key}:`);
//                 value.dump(null, mode, depth + 1);
//               }
//             } else {
//               const outputKey = StringFunctions.padAndAlign(
//                 `${indent}${key}`,
//                 keyWidth
//               );
//               const outputValue = StringFunctions.padAndAlign(
//                 String(value),
//                 valueWidth,
//                 "right"
//               );
//               console.log(`${outputKey}${outputValue}`);
//             }
//           } catch (e) {
//             const outputKey = StringFunctions.padAndAlign(
//               `${indent}${key}`,
//               keyWidth
//             );
//             const outputValue = StringFunctions.padAndAlign(
//               "???",
//               valueWidth,
//               "right"
//             );
//             console.log(`${outputKey}${outputValue}`);

//             // @ts-ignore
//             const errorMsg = `${indent}    [getter threw: ${e?.message ?? e}]`;
//             console.log(errorMsg);
//           }
//         }
//       }
//     }
//   },
// });

Object.defineProperty(Object.prototype, "dump", {
  enumerable: false,
  configurable: true,
  writable: true,
  value: function (/** @type {any} */ title, mode = "deep", depth = 0) {
    const indent = "  ".repeat(depth + 1);
    const keyWidth = 70;
    const valueWidth = 30;
    const isShallow = mode === "shallow";

    if (depth === 0) {
      const header = title || this._description || "Object Dump";
      const modeIndicator = isShallow ? " (shallow)" : "";
      console.log(`${header}${modeIndicator}:`);
    }

    // Arrays (unchanged)
    if (Array.isArray(this)) {
      this.forEach((val, i) => {
        if (val && typeof val === "object") {
          if (isShallow && depth === 0) {
            const typeInfo = val.constructor ? val.constructor.name : "Object";
            const size = Array.isArray(val) ? `[${val.length}]` : "";
            console.log(`${indent}[${i}] [${typeInfo}${size}]`);
          } else {
            console.log(`${indent}[${i}]`);
            val.dump(null, mode, depth + 1);
          }
        } else {
          const keyValue = StringFunctions.padAndAlign(
            `${indent}[${i}]`,
            keyWidth
          );
          const formattedValue = StringFunctions.padAndAlign(
            safeFormat(val),
            valueWidth,
            "right"
          );
          console.log(`${keyValue}${formattedValue}`);
        }
      });
      return;
    }

    // ===================================================
    // NEW: dumpOrder support (declared order first)
    // ===================================================

    /**
     * @param {any} obj
     * @returns {string[] | null}
     */
    function getDumpKeysInDeclaredOrder(obj) {
      const ctor = obj?.constructor;
      const order = Array.isArray(ctor?.dumpOrder) ? ctor.dumpOrder : null;
      if (!order) return null;
      return order;
    }

    /**
     * Dump one key in a unified way:
     * - instance fields
     * - prototype getters
     * - prototype methods
     *
     * Returns true if it printed something, false if key doesn't exist anywhere.
     *
     * @param {string} key
     * @param {string} prefixIndent
     */
    const dumpKeyUnified = (key, prefixIndent) => {
      if (key === "_description") return true;

      const ownDesc = Object.getOwnPropertyDescriptor(this, key);

      const proto = Object.getPrototypeOf(this);
      const protoDesc =
        proto && proto !== Object.prototype
          ? Object.getOwnPropertyDescriptor(proto, key)
          : undefined;

      const desc = ownDesc ?? protoDesc;

      if (!desc) return false;

      // ------- SPECIAL CASE: calculationDetails -------
      if (key === "calculationDetails") {
        if (!DUMP_CALCULATION_DETAILS) return true;

        const value = this[key];

        if (isShallow && depth === 0) {
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[details]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
          return true;
        }

        const contributors = Array.isArray(value) ? value : [value];
        console.log(`${prefixIndent}${key}:`);

        contributors.forEach((contrib, idx) => {
          const heading = _labelFor(contrib, `Contributor #${idx + 1}`);
          console.log(`${prefixIndent}  - ${heading}:`);

          if (typeof contrib === "function") {
            const params = getParamText(contrib);
            const zeroParams = params !== null && params === "";

            if (zeroParams) {
              try {
                const result = contrib.call(this);
                if (result && typeof result === "object") {
                  result.dump(null, mode, depth + 2);
                } else {
                  console.log(
                    `${prefixIndent}    - result() ${safeFormat(result)}`
                  );
                }
              } catch (e) {
                console.log(
                  // @ts-ignore
                  `${prefixIndent}    - [function threw: ${e?.message ?? e}]`
                );
              }
            } else {
              const sig = params === null ? "[unknown signature]" : params;
              console.log(`${prefixIndent}    - (${sig}) [function]`);
            }
          } else if (contrib && typeof contrib === "object") {
            contrib.dump(null, mode, depth + 2);
          } else {
            console.log(`${prefixIndent}    - ${safeFormat(contrib)}`);
          }
        });

        return true;
      }
      // ------- END SPECIAL CASE -------

      // Getter
      if (typeof desc.get === "function") {
        try {
          const value = this[key];

          if (value instanceof Date) {
            const formattedDate = DateFunctions.formatDateYYYYMMDD(value);
            const outputKey = StringFunctions.padAndAlign(
              `${prefixIndent}${key}`,
              keyWidth
            );
            const outputValue = StringFunctions.padAndAlign(
              formattedDate,
              valueWidth,
              "right"
            );
            console.log(`${outputKey}${outputValue}`);
            return true;
          }

          if (value && typeof value === "object") {
            if (isProxy(value)) {
              const outputKey = StringFunctions.padAndAlign(
                `${prefixIndent}${key}`,
                keyWidth
              );
              const outputValue = StringFunctions.padAndAlign(
                "[Proxy]",
                valueWidth,
                "right"
              );
              console.log(`${outputKey}${outputValue}`);
            } else if (isShallow && depth === 0) {
              const typeInfo = value.constructor
                ? value.constructor.name
                : "Object";
              const size = Array.isArray(value)
                ? `[${value.length}]`
                : value instanceof Map
                  ? `Map(${value.size})`
                  : value instanceof Set
                    ? `Set(${value.size})`
                    : "";
              const outputKey = StringFunctions.padAndAlign(
                `${prefixIndent}${key}`,
                keyWidth
              );
              const outputValue = StringFunctions.padAndAlign(
                `[${typeInfo}${size}]`,
                valueWidth,
                "right"
              );
              console.log(`${outputKey}${outputValue}`);
            } else {
              console.log(`${prefixIndent}${key}:`);
              value.dump(null, mode, depth + 1);
            }
            return true;
          }

          // Primitive getter
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            safeFormat(value),
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
          return true;
        } catch (e) {
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "???",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
          // @ts-ignore
          console.log(`${prefixIndent}    [getter threw: ${e?.message ?? e}]`);
          return true;
        }
      }

      // Method
      if (typeof desc.value === "function") {
        const fn = desc.value;

        const paramText = getParamText(fn);
        const hasZeroParams = paramText !== null && paramText === "";

        if (hasZeroParams) {
          const displayKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}()`,
            keyWidth
          );
          try {
            const result = fn.call(this);
            const formattedValue = StringFunctions.padAndAlign(
              safeFormat(result),
              valueWidth,
              "right"
            );
            console.log(`${displayKey}${formattedValue}`);
          } catch (e) {
            const outputKey = StringFunctions.padAndAlign(
              `${prefixIndent}${key}()`,
              keyWidth
            );
            const outputValue = StringFunctions.padAndAlign(
              "???",
              valueWidth,
              "right"
            );
            console.log(`${outputKey}${outputValue}`);
            // @ts-ignore
            console.log(
              `${prefixIndent}    [function threw: ${e?.message ?? e}]`
            );
          }
        } else {
          const sig = paramText === null ? "[unknown signature]" : paramText;
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}(${sig})`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[function]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        }

        return true;
      }

      // Field (instance property)
      const value = this[key];

      if (value instanceof Date) {
        const formattedDate = DateFunctions.formatDateYYYYMMDD(value);
        const outputKey = StringFunctions.padAndAlign(
          `${prefixIndent}${key}`,
          keyWidth
        );
        const outputValue = StringFunctions.padAndAlign(
          formattedDate,
          valueWidth,
          "right"
        );
        console.log(`${outputKey}${outputValue}`);
        return true;
      }

      if (value && typeof value === "object") {
        if (isProxy(value)) {
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[Proxy]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        } else if (isShallow && depth === 0) {
          const typeInfo = value.constructor
            ? value.constructor.name
            : "Object";
          const size = Array.isArray(value)
            ? `[${value.length}]`
            : value instanceof Map
              ? `Map(${value.size})`
              : value instanceof Set
                ? `Set(${value.size})`
                : "";
          const outputKey = StringFunctions.padAndAlign(
            `${prefixIndent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            `[${typeInfo}${size}]`,
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        } else {
          console.log(`${prefixIndent}${key}:`);
          value.dump(null, mode, depth + 1);
        }
        return true;
      }

      const outputKey = StringFunctions.padAndAlign(
        `${prefixIndent}${key}`,
        keyWidth
      );
      const outputValue = StringFunctions.padAndAlign(
        safeFormat(value),
        valueWidth,
        "right"
      );
      console.log(`${outputKey}${outputValue}`);
      return true;
    };

    const printed = new Set();

    const orderedKeys = getDumpKeysInDeclaredOrder(this);
    if (orderedKeys && orderedKeys.length > 0) {
      // Dump in declared order first
      for (const key of orderedKeys) {
        const didPrint = dumpKeyUnified(key, indent);
        if (didPrint) printed.add(key);
      }

      // Then dump everything else not listed (ONLY if there is anything)
      const leftovers = [];

      // Remaining instance fields (own enumerable props)
      for (const key of Object.keys(this)) {
        if (printed.has(key)) continue;
        leftovers.push(key);
      }

      // Remaining prototype getters + methods
      const proto = Object.getPrototypeOf(this);
      if (proto && proto !== Object.prototype) {
        const props = Object.getOwnPropertyDescriptors(proto);

        for (const key of Object.keys(props)) {
          if (key === "constructor") continue;
          if (printed.has(key)) continue;

          const desc = props[key];

          // Only include things that are part of the "API surface"
          if (
            typeof desc.get === "function" ||
            typeof desc.value === "function"
          ) {
            leftovers.push(key);
          }
        }
      }

      // Only print the divider if we actually have leftovers
      if (leftovers.length > 0) {
        console.log(`${indent}--- (not in dumpOrder) ---`);

        for (const key of leftovers) {
          dumpKeyUnified(key, indent);
          printed.add(key);
        }
      }

      return;
    }

    // ===================================================
    // Fallback: your original behavior (no dumpOrder)
    // ===================================================

    for (const [key, value] of Object.entries(this)) {
      if (key === "_description") continue;

      // calculationDetails handled here too (original behavior)
      if (key === "calculationDetails") {
        if (!DUMP_CALCULATION_DETAILS) continue;

        if (isShallow && depth === 0) {
          const outputKey = StringFunctions.padAndAlign(
            `${indent}calculationDetails`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[details]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
          continue;
        }

        const contributors = Array.isArray(value) ? value : [value];
        console.log(`${indent}calculationDetails:`);

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
                  result.dump(null, mode, depth + 2);
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
            contrib.dump(null, mode, depth + 2);
          } else {
            console.log(`${indent}    - ${safeFormat(contrib)}`);
          }
        });
        continue;
      }

      if (typeof value === "function") {
        const paramText = getParamText(value);
        const hasZeroParams = paramText !== null && paramText === "";

        if (hasZeroParams) {
          const displayKey = StringFunctions.padAndAlign(
            `${indent}${key}()`,
            keyWidth
          );
          try {
            const result = value.call(this);
            const formattedValue = StringFunctions.padAndAlign(
              safeFormat(result),
              valueWidth,
              "right"
            );
            console.log(`${displayKey}${formattedValue}`);
          } catch (e) {
            const outputKey = StringFunctions.padAndAlign(
              `${indent}${key}()`,
              keyWidth
            );
            const outputValue = StringFunctions.padAndAlign(
              "???",
              valueWidth,
              "right"
            );
            console.log(`${outputKey}${outputValue}`);
            // @ts-ignore
            console.log(`${indent}    [function threw: ${e?.message ?? e}]`);
          }
        } else {
          const sig = paramText === null ? "[unknown signature]" : paramText;
          const outputKey = StringFunctions.padAndAlign(
            `${indent}${key}(${sig})`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[function]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        }
      } else if (value instanceof Date) {
        const formattedDate = DateFunctions.formatDateYYYYMMDD(value);
        const outputKey = StringFunctions.padAndAlign(
          `${indent}${key}`,
          keyWidth
        );
        const outputValue = StringFunctions.padAndAlign(
          formattedDate,
          valueWidth,
          "right"
        );
        console.log(`${outputKey}${outputValue}`);
      } else if (value && typeof value === "object") {
        if (isProxy(value)) {
          const outputKey = StringFunctions.padAndAlign(
            `${indent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            "[Proxy]",
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        } else if (isShallow && depth === 0) {
          const typeInfo = value.constructor
            ? value.constructor.name
            : "Object";
          const size = Array.isArray(value)
            ? `[${value.length}]`
            : value instanceof Map
              ? `Map(${value.size})`
              : value instanceof Set
                ? `Set(${value.size})`
                : "";
          const outputKey = StringFunctions.padAndAlign(
            `${indent}${key}`,
            keyWidth
          );
          const outputValue = StringFunctions.padAndAlign(
            `[${typeInfo}${size}]`,
            valueWidth,
            "right"
          );
          console.log(`${outputKey}${outputValue}`);
        } else {
          console.log(`${indent}${key}:`);
          value.dump(null, mode, depth + 1);
        }
      } else {
        const outputKey = StringFunctions.padAndAlign(
          `${indent}${key}`,
          keyWidth
        );
        const outputValue = StringFunctions.padAndAlign(
          safeFormat(value),
          valueWidth,
          "right"
        );
        console.log(`${outputKey}${outputValue}`);
      }
    }

    // Include getters from prototype (original behavior)
    const proto = Object.getPrototypeOf(this);
    if (proto && proto !== Object.prototype) {
      const props = Object.getOwnPropertyDescriptors(proto);

      for (const [key, desc] of Object.entries(props)) {
        if (key === "constructor") continue;
        if (typeof desc.get === "function") {
          try {
            const value = this[key];

            if (value && typeof value === "object") {
              if (isProxy(value)) {
                const outputKey = StringFunctions.padAndAlign(
                  `${indent}${key}`,
                  keyWidth
                );
                const outputValue = StringFunctions.padAndAlign(
                  "[Proxy]",
                  valueWidth,
                  "right"
                );
                console.log(`${outputKey}${outputValue}`);
              } else if (isShallow && depth === 0) {
                const typeInfo = value.constructor
                  ? value.constructor.name
                  : "Object";
                const size = Array.isArray(value)
                  ? `[${value.length}]`
                  : value instanceof Map
                    ? `Map(${value.size})`
                    : value instanceof Set
                      ? `Set(${value.size})`
                      : "";
                const outputKey = StringFunctions.padAndAlign(
                  `${indent}${key}`,
                  keyWidth
                );
                const outputValue = StringFunctions.padAndAlign(
                  `[${typeInfo}${size}]`,
                  valueWidth,
                  "right"
                );
                console.log(`${outputKey}${outputValue}`);
              } else {
                console.log(`${indent}${key}:`);
                value.dump(null, mode, depth + 1);
              }
            } else {
              const outputKey = StringFunctions.padAndAlign(
                `${indent}${key}`,
                keyWidth
              );
              const outputValue = StringFunctions.padAndAlign(
                safeFormat(value),
                valueWidth,
                "right"
              );
              console.log(`${outputKey}${outputValue}`);
            }
          } catch (e) {
            const outputKey = StringFunctions.padAndAlign(
              `${indent}${key}`,
              keyWidth
            );
            const outputValue = StringFunctions.padAndAlign(
              "???",
              valueWidth,
              "right"
            );
            console.log(`${outputKey}${outputValue}`);
            // @ts-ignore
            console.log(`${indent}    [getter threw: ${e?.message ?? e}]`);
          }
        }
      }
    }
  },
});

export { log, withLabel };
