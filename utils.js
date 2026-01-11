// =====================
// Number prototype helpers
// =====================

/**
 * @this {number}
 * @param {number} [decimals=0]
 * @returns {number}
 */
Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

/**
 * @this {number}
 * @returns {number}
 */
Number.prototype.asCurrency = function () {
  return this.round(0);
};

/**
 * @this {number}
 * @param {number} value
 * @returns {number}
 */
Number.prototype.minus = function (value) {
  return this - value;
};

/**
 * @this {number}
 * @param {number} value
 * @returns {number}
 */
Number.prototype.plus = function (value) {
  return this + value;
};

/**
 * @this {number}
 * @param {number} inflationRate
 * @param {number} years
 * @returns {number}
 */
Number.prototype.adjustedForInflation = function (inflationRate, years) {
  const adjustedValue = this * Math.pow(1 + inflationRate, years);
  return adjustedValue;
};

/**
 * @this {number}
 * @param {number} total
 * @returns {number}
 */
Number.prototype.asPercentageOf = function (total) {
  if (total === 0) return 0;
  return (this / total).round(3);
};

/**
 * @this {number}
 * @returns {number}
 */
Number.prototype.asPercentage = function () {
  return this.asPercentageOf(100);
};

const compoundedRate = (/** @type {number} */ r, /** @type {number} */ n) =>
  Math.pow(1 + r, n);

class DateFunctions {
  /**
   * @param {Date} date
   * @param {number} years
   */
  static addYears(date, years) {
    const month = date.getMonth();
    const day = date.getDay();
    const newYear = date.getFullYear() + years;

    let newDate = new Date(newYear, month, day);

    const isLeapYear = newDate.getMonth() === 1;

    if (!isLeapYear && day === 29) newDate = new Date(newYear, month, 28);

    return newDate;
  }

  /**
   * @param {Date} date
   * @param {number} days
   */
  static addDays(date, days) {
    const ticks = days * 86400000;
    return new Date(date.getMilliseconds() + ticks);
  }

  /**
   * @param {Date} date
   */
  static formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}

class StringFunctions {
  /**
   * @param {string} str
   */
  static capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Pads a string to a fixed width.
   *
   * @param {string | number} value
   * @param {number} width
   * @param {"left" | "right" | "center"} [align = "left"]
   * @param {string} [padChar=" "]
   */
  static padAndAlign(value, width, align = "left", padChar = " ") {
    const str = String(value);

    if (str.length >= width) return str;

    if (align === "center") {
      const totalPadding = width - str.length;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      return str
        .padStart(str.length + leftPadding, padChar)
        .padEnd(width, padChar);
    }
    return align === "right"
      ? str.padStart(width, padChar)
      : str.padEnd(width, padChar);
  }

  /**
   * @param {string} str
   * @param {number} count
   */
  static repeat(str, count) {
    return str.repeat(count);
  }
}

class Boxes {
  /**
   * Creates a single-wall ASCII box around text with connectable edges.
   *
   * @param {string} text
   * @param {"left" | "center" | "right"} [align="center"]
   * @param {number} [width=100]
   * @param {boolean} [topConnector=false] - Use T-junction on top edge
   * @param {boolean} [bottomConnector=false] - Use T-junction on bottom edge
   * @param {boolean} [returnString=false] - Return string instead of console.log
   */
  static singleBox(
    text,
    align = "center",
    width = 100,
    topConnector = false,
    bottomConnector = false,
    returnString = false
  ) {
    const lines = text.split("\n");
    const innerWidth = width - 4; // Account for "| " and " |"

    const topLine = topConnector
      ? Boxes.singleDivider(width, true)
      : Boxes.singleTopBorder(width, true);
    const bottomLine = bottomConnector
      ? Boxes.singleDivider(width, true)
      : Boxes.singleBorderBottom(width, true);
    const processedLines = lines.map((line) => {
      if (line.length > innerWidth) {
        // Truncate if too long
        line = line.substring(0, innerWidth - 3) + "...";
      }
      const paddedLine = StringFunctions.padAndAlign(line, innerWidth, align);
      return "│ " + paddedLine + " │";
    });

    const result = [topLine, ...processedLines, bottomLine].join("\n");

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  /**
   * Creates a double-wall ASCII box around text with connectable edges.
   * Note: T-junctions always use single-line characters for compatibility.
   *
   * @param {string} text
   * @param {"left" | "center" | "right"} [align="center"]
   * @param {number} [width=100]
   * @param {boolean} [topConnector=false] - Use T-junction on top edge
   * @param {boolean} [bottomConnector=false] - Use T-junction on bottom edge
   * @param {boolean} [returnString=false] - Return string instead of console.log
   */
  static doubleBox(
    text,
    align = "center",
    width = 100,
    topConnector = false,
    bottomConnector = false,
    returnString = false
  ) {
    const lines = text.split("\n");
    const innerWidth = width - 4; // Account for "║ " and " ║"
    // ╒ ╕ ╘ ╛ ╞ ╡
    const topLine = topConnector
      ? Boxes.doubleDivider(width, true) // Single-line T-junction
      : Boxes.topBorderDouble(width, true); // Double-line corners
    const bottomLine = bottomConnector
      ? Boxes.doubleDivider(width, true) // Single-line T-junction
      : Boxes.bottomBorderDouble(width, true); // Double-line corners
    const processedLines = lines.map((line) => {
      if (line.length > innerWidth) {
        // Truncate if too long
        line = line.substring(0, innerWidth - 3) + "...";
      }
      const paddedLine = StringFunctions.padAndAlign(line, innerWidth, align);
      return "│ " + paddedLine + " │";
    });

    const result = [topLine, ...processedLines, bottomLine].join("\n");

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  /**
   * Creates an ASCII box around text (alias for singleBox for convenience).
   *
   * @param {string} text
   * @param {"left" | "center" | "right"} [align="center"]
   * @param {number} [width=100]
   * @param {"single" | "double"} [style="single"]
   * @param {boolean} [topConnector=false] - Use T-junction on top edge
   * @param {boolean} [bottomConnector=false] - Use T-junction on bottom edge
   * @param {boolean} [returnString=false] - Return string instead of console.log
   */
  static box(
    text,
    align = "center",
    width = 100,
    style = "single",
    topConnector = false,
    bottomConnector = false,
    returnString = false
  ) {
    return style === "double"
      ? Boxes.doubleBox(
          text,
          align,
          width,
          topConnector,
          bottomConnector,
          returnString
        )
      : Boxes.singleBox(
          text,
          align,
          width,
          topConnector,
          bottomConnector,
          returnString
        );
  }

  /**
   * Creates an ASCII box around text (alias for singleBox for convenience).
   *
   * @param {string} text
   * @param {"left" | "center" | "right"} [align="center"]
   * @param {number} [width=100]
   * @param {boolean} [returnString=false] - Return string instead of console.log
   */
  static addDetailData(
    text,
    align = "center",
    width = 100,
    returnString = false
  ) {
    const lines = text.split("\n");
    const innerWidth = width - 4; // Account for "| " and " |"

    const processedLines = lines.map((line) => {
      if (line.length > innerWidth) {
        // Truncate if too long
        line = line.substring(0, innerWidth - 3) + "...";
      }
      const paddedLine = StringFunctions.padAndAlign(line, innerWidth, align);
      return "│ " + paddedLine + " │";
    });

    const result = [...processedLines].join("\n");

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static doubleDivider(width = 100, returnString = false) {
    const result = "╞" + "═".repeat(width - 2) + "╡";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static singleDivider(width = 100, returnString = false) {
    const result = "├" + "─".repeat(width - 2) + "┤";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static singleTopBorder(width = 100, returnString = false) {
    const result = "┌" + "─".repeat(width - 2) + "┐";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static singleBorderBottom(width = 100, returnString = false) {
    const result = "└" + "─".repeat(width - 2) + "┘";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static topBorderDouble(width = 100, returnString = false) {
    const result = "╒" + "═".repeat(width - 2) + "╕";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  static bottomBorderDouble(width = 100, returnString = false) {
    const result = "╘" + "═".repeat(width - 2) + "╛";

    if (returnString) {
      return result;
    } else {
      console.log(result);
      return undefined;
    }
  }

  /*
   * ═══════════════════════════════════════════════════════════════════════════════════
   *                            ASCII LINE ART CHARACTER REFERENCE
   * ═══════════════════════════════════════════════════════════════════════════════════
   *
   * SINGLE-LINE BOX DRAWING CHARACTERS:
   * ┌ ┐ └ ┘   - Corners (top-left, top-right, bottom-left, bottom-right)
   * ├ ┤ ┬ ┴   - T-junctions (left, right, top, bottom)
   * ┼         - Cross/intersection
   * │ ─       - Vertical and horizontal lines
   *
   * DOUBLE-LINE BOX DRAWING CHARACTERS:
   * ╔ ╗ ╚ ╝   - Corners (top-left, top-right, bottom-left, bottom-right)
   * ╠ ╣ ╦ ╩   - T-junctions (left, right, top, bottom)
   * ╬         - Cross/intersection
   * ║ ═       - Vertical and horizontal lines
   *
   * MIXED SINGLE/DOUBLE CHARACTERS:
   * ╒ ╕ ╘ ╛   - Single horizontal, double vertical corners
   * ╞ ╡ ╤ ╧   - Single horizontal, double vertical T-junctions
   * ╪         - Single horizontal, double vertical cross
   *
   * ╓ ╖ ╙ ╜   - Double horizontal, single vertical corners
   * ╟ ╢ ╥ ╨   - Double horizontal, single vertical T-junctions
   * ╫         - Double horizontal, single vertical cross
   *
   * HEAVY/BOLD LINE CHARACTERS:
   * ┏ ┓ ┗ ┛   - Heavy corners
   * ┣ ┫ ┳ ┻   - Heavy T-junctions
   * ╋         - Heavy cross
   * ┃ ━       - Heavy vertical and horizontal lines
   *
   * ROUNDED CORNERS:
   * ╭ ╮ ╰ ╯   - Rounded corners
   *
   * DASHED/DOTTED LINES:
   * ┄ ┅ ┆ ┇   - Dashed horizontal and vertical (light/heavy)
   * ┈ ┉ ┊ ┋   - Dotted horizontal and vertical (light/heavy)
   *
   * BLOCK CHARACTERS:
   * █ ▉ ▊ ▋   - Full and 3/4, 1/2, 1/4 blocks
   * ▌ ▍ ▎ ▏   - 1/8, 3/8, 1/4, 1/8 left blocks
   * ▐ ▕       - Right half and 1/8 blocks
   * ▀ ▄       - Upper and lower half blocks
   * ▁ ▂ ▃     - 1/8, 1/4, 3/8 lower blocks
   * ▄ ▅ ▆ ▇   - 1/2, 5/8, 3/4, 7/8 lower blocks
   * ▔ ▕ ▖ ▗   - Upper 1/8, right 1/8, quadrant blocks
   * ▘ ▝ ▚ ▞   - More quadrant combinations
   *
   * ARROWS:
   * ← → ↑ ↓   - Basic arrows
   * ↖ ↗ ↘ ↙   - Diagonal arrows
   * ⇐ ⇒ ⇑ ⇓   - Double arrows
   * ↔ ↕       - Bidirectional arrows
   *
   * MATHEMATICAL SYMBOLS:
   * ± × ÷ ∞   - Plus-minus, multiply, divide, infinity
   * ≤ ≥ ≠ ≈   - Less/greater than or equal, not equal, approximately
   * ∑ ∏ ∫ ∂   - Summation, product, integral, partial derivative
   * √ ∛ ∜     - Square root, cube root, fourth root
   *
   * GEOMETRIC SHAPES:
   * ○ ● ◯     - Circles (hollow, filled, large hollow)
   * □ ■ ▢ ▣   - Squares and rectangles
   * △ ▲ ▽ ▼   - Triangles
   * ◇ ◆ ◊     - Diamonds
   * ☆ ★ ✦ ✧   - Stars
   *
   * MISCELLANEOUS SYMBOLS:
   * ° • ‣ ‧   - Degree, bullet, triangular bullet, hyphenation point
   * … ‰ ‱     - Ellipsis, per mille, basis point
   * § ¶ † ‡   - Section, pilcrow, dagger, double dagger
   * ♠ ♣ ♥ ♦   - Card suits
   * ♪ ♫ ♬     - Musical notes
   *
   * UNICODE BOX DRAWING CODEPOINTS:
   * Single: U+250x, U+251x  |  Double: U+255x, U+256x  |  Heavy: U+254x
   *
   * USAGE EXAMPLES:
   * ┌─────────────────┐    ╔═════════════════╗    ┏━━━━━━━━━━━━━━━━━┓
   * │ Single Box      │    ║ Double Box      ║    ┃ Heavy Box     ┃
   * ├─────────────────┤    ╠═════════════════╣    ┣━━━━━━━━━━━━━━━━━┫
   * │ With separator  │    ║ With separator  ║    ┃ With separator┃
   * └─────────────────┘    ╚═════════════════╝    ┗━━━━━━━━━━━━━━━━━┛
   *
   * ═══════════════════════════════════════════════════════════════════════════════════
   */
}

export { compoundedRate, DateFunctions, StringFunctions, Boxes };
