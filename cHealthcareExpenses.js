import { generateOverrideFields, num } from "./retirement-ui.js";
import { UIField } from "./UIFields.js";

// Healthcare Expenses Adjustments Functions
export function renderHealthcareExpensesFields() {
  generateOverrideFields({
    prefix: "healthcareExpenses",
    gridId: "healthcareExpenseDetailsGrid",
    label: " out-of-pocket ($)",
    placeholder: "0",
    onBlur: handleHealthcareExpensesFieldChange,
    startAge: num(UIField.SUBJECT_CURRENT_AGE),
    startYear: num(UIField.CURRENT_YEAR),
  });
}

/**
 * @param {number} age
 * @param {FocusEvent} event
 */
function handleHealthcareExpensesFieldChange(age, event) {
  const target = /** @type {HTMLInputElement} */ (event.target);
  const inputValue = parseFloat(target.value) || 0;

  if (inputValue > 0) {
    // Store the current year value but don't change the field value
    target.setAttribute("data-current-year-value", String(inputValue));
  }

  target.dispatchEvent(
    new CustomEvent("value-changed", {
      bubbles: true,
      detail: {
        id: target.id,
        value: target.value,
      },
    })
  );
}

