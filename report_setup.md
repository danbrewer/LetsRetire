# Report Setup Guide

This document describes exactly what to modify when adding a new report to the Reports popup flow.

## Current Flow (High Level)

1. User opens Reports popup from hamburger menu.
2. User selects parameters (year, report type, account type) and clicks **Run Report**.
3. `import-export.js` dispatches `reports:run` with `detail` payload.
4. `retirement-ui.js` listens for `reports:run` and renders the report output popup.
5. `renderReportContent(...)` switches on `reportType` and calls a report-specific renderer (for example `renderSummaryByCategoryTable(...)`).
6. Refresh re-runs the same report using current selected year (and any other controls in the output popup).

---

## Add a New Report: Checklist

### 1) Add report type option

**File:** `import-export.js`

- Add the display name to the `reportTypeOptions` array in `openReportsPopup()`.
- Keep the text stable; this string is currently used in `retirement-ui.js` conditional logic.

Example:

```js
const reportTypeOptions = [
  "Summary by Category",
  "My New Report",
  "Bogus Report A",
];
```

---

### 2) Decide what parameters the report needs

Possible report parameter patterns:

- **No params**: report only needs global state
- **Year only**
- **Account type only**
- **Year + account type**
- **All params / custom params**

**Where parameters are currently gathered:**
- Run popup inputs are in `openReportsPopup()` (`reportYearSelect`, `reportTypeSelect`, `reportAccountTypeSelect`).
- Payload sent via:

```js
document.dispatchEvent(new CustomEvent("reports:run", { detail: reportRequest }))
```

**What to change:**
- Include only what your new report needs in `reportRequest`, or keep all fields and ignore unused ones in renderer logic.

---

### 3) Add or reuse data generator logic

Depending on report complexity:

- If report logic belongs to summary rendering pipeline, add helper in `retirement-summaryrenderer.js`.
- If report logic is account-analysis-centric, use `AccountAnalyzer` helpers (as done by Summary by Category).

Current example helper:
- `generateSummaryByCategoryReport(year, accountType)` in `retirement-summaryrenderer.js`

Guideline:
- Keep data retrieval/generation separate from HTML rendering.
- Return plain objects/arrays from generator helpers.

---

### 4) Add a renderer function in report output popup path

**File:** `retirement-ui.js`

Inside `reports:run` handler:

- Add a function similar to `renderSummaryByCategoryTable(...)`.
- Use `ReportTableBuilder` for tabular reports when possible.
- Return HTML string (or table outerHTML wrapper) consumed by `popup.setContent(...)`.

Example pattern:

```js
const renderMyNewReport = (selectedYear) => {
  const data = generateMyNewReport(Number(selectedYear), accountType);
  if (!data) return `<div>No data...</div>`;

  const table = new ReportTableBuilder()
    .addColumn(...)
    .addColumn(...);

  for (const row of data.rows) {
    table.addRow([...]);
  }

  return `<div>${table.build().outerHTML}</div>`;
};
```

---

### 5) Hook new report into conditional dispatch

**File:** `retirement-ui.js`

Update `renderReportContent(selectedYear)`:

```js
if (reportType === "My New Report") {
  return renderMyNewReport(selectedYear);
}
```

This is the main switch point for report type behavior.

---

### 6) Refresh behavior

`Refresh Report` already re-calls `renderReportOutput(...)` using selected year.

If your report uses additional output-popup controls, read those values in refresh click handler and pass them into your renderer.

---

## Parameter Matrix (Recommended)

Use this as a quick decision guide:

- **No params report**
  - Ignore `year` / `accountType` in renderer
  - Keep payload unchanged for consistency

- **Year-only report**
  - Use `selectedYear` from output popup dropdown
  - Ignore `accountType`

- **Account-type-only report**
  - Use `accountType` from run payload (or add account selector in output popup if needed)
  - Ignore `selectedYear`

- **Year + account type report**
  - Use both `selectedYear` and `accountType`

- **Custom params report**
  - Add additional controls to either run popup and/or output popup
  - Add fields to `reportRequest.detail`
  - Read fields in `reports:run` and refresh path

---

## Naming Conventions (Recommended)

- Report data helper: `generate<ReportName>Report(...)`
- UI renderer: `render<ReportName>Table(...)` or `render<ReportName>Content(...)`
- Report type label: human-readable, stable string in dropdown and conditional

---

## Validation Checklist

When adding a report:

1. Report type appears in Reports dropdown.
2. Run Report opens output popup and shows report content.
3. Refresh Report re-runs correctly (year and any other relevant params).
4. No console/runtime errors.
5. `get_errors` is clean for touched files.

---

## Answer to your question

Yes — your understanding is correct.

In practice, adding a new report usually means:

1. Add report type option in `import-export.js`
2. Add generator/helper logic (often in `retirement-summaryrenderer.js`)
3. Add conditional branch in `renderReportContent(...)` in `retirement-ui.js`
4. Add a renderer function similar to `renderSummaryByCategoryTable(...)`

That is the right integration path for this codebase.