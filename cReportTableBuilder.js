/**
 * @typedef {"left" | "right" | "center"} ColumnAlignment
 *
 *
 * @typedef {"currency" | "number" | "text"} ColumnFormat
 *
 *
 * @typedef {Object} ReportColumn
 * @property {string} label
 * @property {number} widthPercent
 * @property {ColumnAlignment} align
 * @property {ColumnFormat} format
 * @property {boolean} total
 *
 *
 * @typedef {string | number} ReportCell
 *
 *
 * @typedef {ReportCell[]} ReportRow
 */

export class ReportTableBuilder {
  constructor() {
    /** @type {ReportColumn[]} */
    this.columns = [];

    /** @type {ReportRow[]} */
    this.rows = [];

    this.zebra = false;
    this.stickyHeader = false;
  }

  /**
   * @param {string} label
   * @param {number} widthPercent
   * @param {ColumnAlignment} [align]
   * @param {ColumnFormat} [format]
   * @param {boolean} [total]
   * @returns {ReportTableBuilder}
   */
  addColumn(
    label,
    widthPercent,
    align = "left",
    format = "text",
    total = false
  ) {
    this.columns.push({
      label,
      widthPercent,
      align,
      format,
      total,
    });

    return this;
  }

  /**
   * @param {ReportRow} cells
   * @returns {ReportTableBuilder}
   */
  addRow(cells) {
    if (cells.length !== this.columns.length) {
      console.warn(
        `Row length (${cells.length}) does not match column count (${this.columns.length})`
      );
      // Pad with empty strings or truncate to match
      while (cells.length < this.columns.length) {
        cells.push("");
      }
      if (cells.length > this.columns.length) {
        cells = cells.slice(0, this.columns.length);
      }
    }

    this.rows.push(cells);

    return this;
  }

  enableZebra() {
    this.zebra = true;
    return this;
  }

  enableStickyHeader() {
    this.stickyHeader = true;
    return this;
  }

  /**
   * @returns {HTMLTableElement}
   */
  build() {
    const table = document.createElement("table");

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (const col of this.columns) {
        const th = document.createElement("th");

        th.textContent = col.label;
        th.style.width = `${col.widthPercent}%`;
        th.style.textAlign = col.align;
        th.style.padding = "8px";
        th.style.borderBottom = "2px solid #333";
        th.style.fontWeight = "bold";
        th.style.color = "#333"; // Ensure dark text for headers
        th.style.background = "white";
    
        if (this.stickyHeader) {
            th.style.position = "sticky";
            th.style.top = "0";
            
        }

        headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    this.rows.forEach((rowCells, rowIndex) => {
      const row = document.createElement("tr");
      row.style.color = "#333"; // Consistent dark text for all rows

      rowCells.forEach((value, i) => {
        const td = document.createElement("td");

        const column = this.columns[i];

        if (!column) {
          console.warn(`No column definition for index ${i}`);
          return;
        }

        td.style.textAlign = column.align;
        td.style.padding = "8px";
        td.style.borderBottom = "1px solid #ddd";
        td.style.color = "#ffffffcd"; // Explicit dark text for data cells

        const formattedValue = this.formatValue(value, column.format);
        td.textContent = formattedValue;

        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    const totals = this.calculateTotals();

    if (totals) {
      const tfoot = document.createElement("tfoot");
      const row = document.createElement("tr");

      totals.forEach((value, i) => {
        const th = document.createElement("th");

        if (this.columns[i]) {
          th.style.textAlign = this.columns[i].align;
        }
        th.style.padding = "8px";
        th.style.borderTop = "2px solid #333";
        th.style.fontWeight = "bold";
        th.style.color = "#333"; // Ensure dark text for footer cells
        th.style.background = "white";

        th.textContent = value || "";

        row.appendChild(th);
      });

      tfoot.appendChild(row);
      table.appendChild(tfoot);
    }

    return table;
  }

  /**
   * @private
   */
  calculateTotals() {
    const totals = new Array(this.columns.length).fill("");

    let hasTotals = false;

    this.columns.forEach((col, i) => {
      if (!col.total) return;

      hasTotals = true;

      let sum = 0;

      for (const row of this.rows) {
        const value = row[i];
        if (typeof value === "number") {
          sum += value;
        }
      }

      totals[i] = this.formatValue(sum, col.format);
    });

    if (hasTotals) {
      totals[0] = "Grand Total";
      return totals;
    }

    return null;
  }

  /**
   *
   * @param {ReportCell} value
   * @param {string} format
   */
  formatValue(value, format) {
    // Handle null, undefined, or empty values
    if (value == null || value === "") {
      return "";
    }

    if (typeof value === "number") {
      if (format === "currency") {
        return value.toLocaleString(undefined, {
          style: "currency",
          currency: "USD",
        });
      }

      if (format === "number") {
        return value.toLocaleString();
      }
    }

    return String(value);
  }

  /**
   * Export table data as CSV
   */
  toCSV() {
    const lines = [];

    lines.push(this.columns.map((c) => c.label).join(","));

    for (const row of this.rows) {
      lines.push(row.join(","));
    }

    return lines.join("\n");
  }
}
