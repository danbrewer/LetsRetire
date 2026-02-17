///////////////////////////////////////////////////////////////
// DOM PRIMITIVES
///////////////////////////////////////////////////////////////

import { Calculation, Calculations } from "./cCalculation.js";
import { drawChart } from "./retirement-ui-chart.js";
import { Inputs } from "./cInputs.js";
import { popupActions } from "./retirement-popups.js";

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T | null}
 */
function $(id) {
  const el = document.getElementById(id);
  if (!el) {
    return null;
  }
  return /** @type {T} */ (el);
}

/**
 * @param {string} id
 * @returns {HTMLDivElement | null}
 * @throws {Error} if element is missing or not a <div>
 */
function divById(id) {
  const el = document.getElementById(id);

  if (!el) {
    return el;
  }

  if (!(el instanceof HTMLDivElement)) {
    throw new Error(`Element with id '${id}' is not a <div>`);
  }

  return el;
}

/**
 * Values allowed as children to `el()`.
 * @typedef {Node | string | number | null | undefined} Child
 */

/**
 * Props supported by `el()`.
 * @typedef {object} ElProps
 * @property {string} [className]
 * @property {Record<string, string>} [dataset]
 * @property {(ev: Event) => void} [onclick]
 * @property {(ev: Event) => void} [onchange]
 * @property {(ev: Event) => void} [oninput]
 * @property {(ev: Event) => void} [onkeydown]
 * @property {string} [type]
 * @property {boolean} [checked]
 * @property {string} [value]
 * @property {string} [id]
 * @property {string} [name]
 * @property {string | number} [colspan]
 * @property {string | number} [rowspan]
 */

/**
 * Create an element with props and children.
 * JSDOM-friendly and TS-friendly.
 *
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {ElProps} [props]
 * @param {Child[]} children
 * @returns {HTMLElementTagNameMap[K]}
 */
function el(tag, props = {}, ...children) {
  /** @type {HTMLElementTagNameMap[K]} */
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;

    if (key === "className") {
      node.className = /** @type {string} */ (value);
    } else if (key === "dataset") {
      Object.assign(node.dataset, /** @type {Record<string,string>} */ (value));
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(
        key.substring(2),
        /** @type {(ev: Event) => void} */ (value)
      );
    } else if (key === "checked") {
      if (node instanceof HTMLInputElement) {
        node.checked = Boolean(value);
      }
    } else if (key === "value") {
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLSelectElement ||
        node instanceof HTMLTextAreaElement
      ) {
        node.value = String(value);
      }
    } else if (key === "colspan") {
      if (node instanceof HTMLTableCellElement) {
        node.colSpan = Number(value);
      }
    } else if (key === "rowspan") {
      if (node instanceof HTMLTableCellElement) {
        node.rowSpan = Number(value);
      }
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child == null) continue;

    node.appendChild(
      child instanceof Node ? child : document.createTextNode(String(child))
    );
  }

  return node;
}



/**
 * td helper
 * @param {string} className
 * @param {Child[]} children
 * @returns {HTMLTableCellElement}
 */
function td(className, ...children) {
  return el("td", { className }, ...children);
}

/**
 * tr helper
 * @param {Child[]} children
 * @returns {HTMLTableRowElement}
 */
function tr(...children) {
  return el("tr", {}, ...children);
}

/**
 * @typedef {object} CalcLinkArgs
 * @property {string} className
 * @property {number} index
 * @property {string} action
 * @property {string} text
 */

/**
 * clickable calc link span
 * @param {CalcLinkArgs} args
 * @returns {HTMLSpanElement}
 */
function calcLink({ className, index, action, text }) {
  return el(
    "span",
    {
      className,
      dataset: {
        index: String(index),
        action,
      },
    },
    text
  );
}

///////////////////////////////////////////////////////////////
// CELL HELPERS
///////////////////////////////////////////////////////////////

/**
 * @param {string} className
 * @param {Child} value
 * @returns {HTMLTableCellElement}
 */
function textTd(className, value) {
  return td(className, value ?? "");
}

/**
 * @typedef {object} MoneyCellOptions
 * @property {number} [index]
 * @property {string} [action]
 * @property {string} [modifier]
 */

/**
 * Unified money cell helper
 * @param {string} className
 * @param {{ asWholeDollars: () => string } | null | undefined} moneyObj
 * @param {MoneyCellOptions} [options]
 * @returns {HTMLTableCellElement}
 */
function money(className, moneyObj, options = {}) {
  if (!moneyObj) return td(className, "");

  const text = moneyObj.asWholeDollars();

  // Plain cell
  if (!options.action) {
    return td(className, text);
  }

  // If action exists, index should exist too. Make that explicit for TS.
  const index = options.index ?? 0;

  // Modifier is an optional extra class for styling (e.g. "breakdown-link" for Social Security cells)
  const spanClass = options.modifier
    ? `calc-link ${options.modifier}`
    : "calc-link breakdown-link";

  return td(
    className,
    calcLink({
      className: spanClass,
      index,
      action: options.action,
      text,
    })
  );
}

function buildTableHead() {
  const thead = document.getElementById("tableHead");

  if (!thead) return;

  const sectionRow = el("tr", { className: "section-headers" });
  const columnRow = el("tr", { className: "column-headers" });

  sectionRow.appendChild(el("th", { rowspan: "2" }, "Year"));
  sectionRow.appendChild(el("th", { rowspan: "2" }, "Age"));

  for (const group of columnGroups) {
    if (!group.visible) continue;

    sectionRow.appendChild(
      el(
        "th",
        {
          colspan: group.columns.length,
          className: group.className,
        },
        group.label
      )
    );

    for (const column of group.columns) {
      columnRow.appendChild(el("th", {}, column.label));
    }
  }

  thead.replaceChildren(sectionRow, columnRow);
}

function buildColumnMenu() {
  const container = document.getElementById("columnVisibilityContainer");

  if (!container) return;

  container.replaceChildren(
    ...columnGroups.map((group) =>
      el(
        "label",
        { className: "menu-item" },

        el("input", {
          type: "checkbox",

          checked: group.visible, // ? "checked" : null,

          onchange: () => {
            group.visible = !group.visible;

            saveColumnLayout();

            regenerateTable();
          },
        }),

        group.label
      )
    )
  );
}

function saveColumnLayout() {
  localStorage.setItem(
    "columnLayout",
    JSON.stringify(
      columnGroups.map((g) => ({
        id: g.id,
        visible: g.visible,
      }))
    )
  );
}

function loadColumnLayout() {
  const data = localStorage.getItem("columnLayout");
  if (!data) return;
  const saved = JSON.parse(data);

  if (!saved) return;

  for (const s of saved) {
    const group = columnGroups.find((g) => g.id === s.id);

    if (group) group.visible = s.visible;
  }
}

/** @type {Inputs | undefined} */
let currentInputs;
/** @type {Calculations | undefined} */
let currentCalculations;

function regenerateTable() {
  generateOutputAndSummary(currentInputs, currentCalculations);
}

///////////////////////////////////////////////////////////////
// COLUMN GROUP DEFINITIONS
///////////////////////////////////////////////////////////////

/**
 * @typedef {object} ColumnDefinition
 * @property {string} label
 * @property {(calc: Calculation, index: number) => HTMLTableCellElement} render
 */

/**
 * @typedef {object} ColumnGroup
 * @property {string} id
 * @property {string} label
 * @property {string} className
 * @property {boolean} visible
 * @property {ColumnDefinition[]} columns
 */

/** @type {ColumnGroup[]} */
const columnGroups = [
  {
    id: "spend",
    label: "Annual Spend",
    className: "need-header",
    visible: true,
    columns: [
      {
        label: "Annual Spend",
        render: (calc, _) => money("outgoing", calc.reportData.ask),
      },
    ],
  },

  {
    id: "cashSources",
    label: "Cash Sources",
    className: "income-header",
    visible: true,
    columns: [
      {
        label: "Salary (Net)",
        render: (calc, index) =>
          money("income", calc.reportData.income_combinedTakehomeWages, {
            index,
            action: "showSalaryBreakdown",
          }),
      },

      {
        label: "SS (Net)",
        render: (calc, index) =>
          money("income", calc.reportData.ss_combinedTakehome, {
            index,
            action: "showSsBreakdown",
          }),
      },

      {
        label: "Pension (Net)",
        render: (calc, index) =>
          money("income", calc.reportData.income_combinedPensionTakehome, {
            index,
            action: "showPensionBreakdown",
          }),
      },

      {
        label: "401k (Net)",
        render: (calc, index) =>
          money("income", calc.reportData.income_combined401kTakehome, {
            index,
            action: "show401kBreakdown",
          }),
      },

      {
        label: "Savings/Roth",
        render: (calc, index) =>
          money(
            "income",
            calc.reportData.savings_Withdrawals +
              calc.reportData.income_combinedRothTakehome,
            { index, action: "showSavingsRothBreakdown" }
          ),
      },

      {
        label: "Total Net",
        render: (calc, index) =>
          money("income", calc.reportData.income_total_net, {
            index,
            action: "showTotalCashBreakdown",
          }),
      },
    ],
  },

  {
    id: "grossIncome",
    label: "Gross Income",
    className: "gross-income-header",
    visible: true,
    columns: [
      {
        label: "Salary",
        render: (calc) =>
          money("income", calc.reportData.income_combinedWagesGross),
      },

      {
        label: "Taxable Interest",
        render: (calc) =>
          money("income", calc.reportData.income_savingsInterest),
      },

      {
        label: "SS Gross",
        render: (calc, index) =>
          money("income", calc.reportData.ss_combinedGross, {
            index,
            action: "showSsGrossBreakdown",
          }),
      },

      {
        label: "Pension Gross",
        render: (calc, index) =>
          money("income", calc.reportData.income_combinedPensionGross, {
            index,
            action: "showPensionGrossBreakdown",
          }),
      },

      {
        label: "401k Gross",
        render: (calc) =>
          money("income", calc.reportData.income_combined401kGross),
      },

      {
        label: "Total Gross",
        render: (calc) => money("income", calc.reportData.income_total_gross),
      },
    ],
  },

  {
    id: "balances",
    label: "Account Balances",
    className: "balance-header",
    visible: true,
    columns: [
      {
        label: "Savings Bal",
        render: (calc, index) =>
          money("neutral", calc.reportData.savings_Balance, {
            index,
            action: "showSavingsBalanceBreakdown",
          }),
      },

      {
        label: "401k Bal",
        render: (calc, index) =>
          money("neutral", calc.reportData.balances_combined401k, {
            index,
            action: "show401kBalanceBreakdown",
          }),
      },

      {
        label: "Roth Bal",
        render: (calc) =>
          money("neutral", calc.reportData.balances_combinedRoth),
      },

      {
        label: "Total Bal",
        render: (calc, index) =>
          money("neutral", calc.reportData.balances_total, {
            index,
            action: "showAccountBalances",
          }),
      },
    ],
  },
];

///////////////////////////////////////////////////////////////
// ROW BUILDER (FIXED VERSION — USES columnGroups)
///////////////////////////////////////////////////////////////

/**
 * @param {Calculation} calculation
 * @param {number} index
 * @returns {HTMLTableRowElement}
 */
function buildSummaryRow(calculation, index) {
  const r = calculation.reportData;

  const age =
    r.demographics_partnerAge > 0
      ? `${r.demographics_subjectAge} / ${r.demographics_partnerAge}`
      : r.demographics_subjectAge;

  const cells = [textTd("neutral", r.year), textTd("neutral", age)];

  for (const group of columnGroups) {
    if (!group.visible) continue;

    for (const column of group.columns) {
      cells.push(column.render(calculation, index));
    }
  }

  return tr(...cells);
}

///////////////////////////////////////////////////////////////
// ROW BUILDER
///////////////////////////////////////////////////////////////

/**
 * @param {Calculation} calculation
 * @param {number} index
 * @returns {HTMLTableRowElement}
 */
function buildSummaryRowOld(calculation, index) {
  const r = calculation.reportData;

  const age =
    r.demographics_partnerAge > 0
      ? `${r.demographics_subjectAge} / ${r.demographics_partnerAge}`
      : r.demographics_subjectAge;

  return tr(
    textTd("neutral", r.year),
    textTd("neutral", age),

    money("outgoing", r.ask),

    money("income", r.income_combinedTakehomeWages, {
      index,
      action: "showSalaryBreakdown",
    }),

    money("income", r.ss_combinedTakehome, {
      index,
      action: "showSsBreakdown",
    }),

    money("income", r.income_combinedPensionTakehome, {
      index,
      action: "showPensionBreakdown",
    }),
    money("income", r.income_combined401kTakehome, {
      index,
      action: "show401kBreakdown",
    }),
    money("income", r.savings_Withdrawals + r.income_combinedRothTakehome, {
      index,
      action: "showSavingsRothBreakdown",
    }),

    money("income", r.income_total_net, {
      index,
      action: "showTotalCashBreakdown",
    }),

    money("income", r.income_combinedWagesGross),
    money("income", r.income_savingsInterest),
    money("income", r.ss_combinedGross, {
      index,
      action: "showSsGrossBreakdown",
    }),
    money("income", r.income_combinedPensionGross, {
      index,
      action: "showPensionGrossBreakdown",
    }),
    money("income", r.income_combined401kGross),
    money("income", r.income_total_gross),

    money("neutral", r.savings_Balance, {
      index,
      action: "showSavingsBalanceBreakdown",
    }),

    money("neutral", r.balances_combined401k, {
      index,
      action: "show401kBalanceBreakdown",
    }),
    money("neutral", r.balances_combinedRoth),
    money("neutral", r.balances_total, {
      index,
      action: "showAccountBalances",
    })
  );
}

///////////////////////////////////////////////////////////////
// MAIN RENDER FUNCTION
///////////////////////////////////////////////////////////////

/**
 * Optional expando flag on tbody. Keeps TS happy.
 * @typedef {HTMLTableSectionElement & { __calcHandlerAttached?: boolean }} TBodyWithFlags
 */

/**
 * Generate final summary, write table, and update KPIs
 * @param {Inputs | undefined} inputs
 * @param {Calculations | undefined} calculations
 */
function generateOutputAndSummary(inputs, calculations) {
  currentInputs = inputs;
  currentCalculations = calculations;

  buildTableHead();

  /** @type {TBodyWithFlags | null} */
  const tbody = /** @type {any} */ ($("rows"));
  if (!tbody) return;

  /////////////////////////////////////////////////////////////
  // EMPTY STATES
  /////////////////////////////////////////////////////////////

  if (!calculations) {
    tbody.replaceChildren(tr(td("neutral", "No calculations to display")));
    return;
  }

  if (!inputs) {
    tbody.replaceChildren(tr(td("neutral", "No input data available")));
    return;
  }

  /////////////////////////////////////////////////////////////
  // BUILD TABLE
  /////////////////////////////////////////////////////////////

  const allCalcs = calculations.getAllCalculations();

  tbody.replaceChildren(...allCalcs.map(buildSummaryRow));

  /////////////////////////////////////////////////////////////
  // CLICK HANDLING (EVENT DELEGATION)
  /////////////////////////////////////////////////////////////

  if (!tbody.__calcHandlerAttached) {
    tbody.addEventListener("click", (e) => {
      const target =
        e.target instanceof HTMLElement ? e.target.closest(".calc-link") : null;

      if (!(target instanceof HTMLElement)) return;

      const index = Number(target.dataset.index);
      const action = target.dataset.action;
      if (!action) return;

      const calcObj = allCalcs[index];
      if (!calcObj) return;

      const fn = popupActions[action];
      if (typeof fn === "function") {
        fn(calcObj.reportData);
      } else {
        console.warn(`Popup action '${action}' not registered`);
      }
    });

    tbody.__calcHandlerAttached = true;
  }

  /////////////////////////////////////////////////////////////
  // KPI UPDATE
  /////////////////////////////////////////////////////////////

  const lastCalculation = calculations.getLastCalculation();

  let fundedTo = inputs.subjectAge;
  let fullyFunded = true;

  for (const calc of allCalcs) {
    const totalNet = calc.reportData.income_total_net;
    const ask = calc.reportData.ask;

    if (totalNet < ask) {
      fullyFunded = false;
      break; // stop immediately
    }
    fundedTo = calc.age;
  }

  const kpiAge = divById("kpiAge");

  if (kpiAge) {
    // IMPORTANT: replaceChildren expects Nodes, not numbers
    kpiAge.replaceChildren(
      String(fundedTo),
      el(
        "span",
        {
          className: "pill " + (fullyFunded ? "ok" : "alert"),
        },
        fullyFunded ? "Fully funded" : "Shortfall"
      )
    );
  }

  const kpiEndBal = divById("kpiEndBal");

  if (kpiEndBal) {
    kpiEndBal.textContent = Math.max(
      0,
      lastCalculation.reportData.balances_total
    ).asWholeDollars();
  }

  const kpiDraw = divById("kpiDraw");

  if (kpiDraw) {
    kpiDraw.textContent = String(inputs.subjectRetireAge);
  }

  const firstCalculation = allCalcs[0];
  const kpiTax = divById("kpiTax");

  if (firstCalculation && kpiTax) {
    kpiTax.textContent =
      firstCalculation.reportData.balances_total.asWholeDollars();
  }

  //   /////////////////////////////////////////////////////////////
  //   // CHART UPDATE
  //   /////////////////////////////////////////////////////////////

  drawChart(
    allCalcs.map((calc) => ({
      x: calc.year,
      y: calc.reportData.balances_total,
      age: calc.age,
    }))
  );
}

export {
  generateOutputAndSummary,
  loadColumnLayout,
  saveColumnLayout,
  regenerateTable,
  buildColumnMenu,
};
