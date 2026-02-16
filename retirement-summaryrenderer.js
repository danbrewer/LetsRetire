///////////////////////////////////////////////////////////////
// DOM PRIMITIVES
///////////////////////////////////////////////////////////////

import { Calculation, Calculations } from "./cCalculation.js";
import { drawChart } from "./chart.js";
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
      // dataset values must be strings
      Object.assign(
        node.dataset,
        /** @type {Record<string, string>} */ (value)
      );
    } else if (key.startsWith("on") && typeof value === "function") {
      // onclick -> "click"
      node.addEventListener(
        key.substring(2),
        /** @type {(ev: Event) => void} */ (value)
      );
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

///////////////////////////////////////////////////////////////
// ROW BUILDER
///////////////////////////////////////////////////////////////

/**
 * @param {Calculation} calculation
 * @param {number} index
 * @returns {HTMLTableRowElement}
 */
function buildSummaryRow(calculation, index) {
  const r = calculation.reportData;

  return tr(
    textTd("neutral", r.year),
    textTd("neutral", r.demographics_subjectAge),

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
    money("income", r.ss_combinedGross),
    money("income", r.income_combinedPensionGross),
    money("income", r.income_combined401kGross),
    money("income", r.income_total_gross),

    money("neutral", r.savings_Balance, {
      index,
      action: "showSavingsBreakdown",
      modifier: "savings-balance-link",
    }),

    money("neutral", r.balances_combined401k),
    money("neutral", r.balances_combinedRoth),
    money("neutral", r.balances_total)
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

  const fundedTo =
    lastCalculation.reportData.balances_total > 0
      ? inputs.subjectLifeSpan
      : allCalcs.reduce(
          (lastGoodAge, calc) =>
            calc.reportData.balances_total > 0 ? calc.age : lastGoodAge,
          inputs.subjectAge
        );

  const kpiAge = divById("kpiAge");

  if (kpiAge) {
    // IMPORTANT: replaceChildren expects Nodes, not numbers
    kpiAge.replaceChildren(
      String(fundedTo),
      el(
        "span",
        {
          className:
            "pill " + (fundedTo >= inputs.subjectLifeSpan ? "ok" : "alert"),
        },
        fundedTo >= inputs.subjectLifeSpan ? "Fully funded" : "Shortfall"
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

export { generateOutputAndSummary };
