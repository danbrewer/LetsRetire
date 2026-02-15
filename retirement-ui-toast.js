

// Help toast functionality

import { helpTexts } from "./retirement-ui-help.js";

/**
 * @type {HTMLDivElement | null}
 */
let currentToast = null;
let currentProgressBar = null;
/**
 * @type {number | null | undefined}
 */
let toastTimer = null;
let progressTimer = null;


/**
 * @param {{ stopPropagation: () => void; }} event
 * @param {string | number} fieldId
 */
function showHelpToast(event, fieldId) {
  // Prevent the click from bubbling up to document
  event.stopPropagation();


  if (!Object.prototype.hasOwnProperty.call(helpTexts, fieldId)) {
    return;
  }

  /** @type {import("./retirement-ui-help").HelpText} */
  const helpData = helpTexts[fieldId];
  if (!helpData) {
    return;
  }

  // Remove existing toast if any
  if (currentToast) {
    hideToast(true); // Immediate cleanup when replacing
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-title">${helpData.title}</div>
    <div class="toast-body">${helpData.body}</div>
    <div class="progress-bar"></div>
    `;

  document.body.appendChild(toast);
  currentToast = toast;

  const progressBar = toast.querySelector(".progress-bar");

  if (!progressBar) return;

  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

    if (!(progressBar instanceof HTMLElement)) return;

    // Initialize progress bar to full width without transition
    progressBar.style.transition = "none";
    progressBar.style.width = "100%";

    // After a brief moment, enable transition and start countdown
    setTimeout(() => {
      progressBar.style.transition = "width 10000ms linear";
      progressBar.style.width = "0%";
    }, 50);
  }, 10);

  // Auto-hide after 10 seconds
  toastTimer = setTimeout(() => hideToast(), 10000);
}

function hideToast(immediate = false) {
  if (!currentToast) return;

  // Clear any existing timers
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  currentToast.classList.remove("show");

  if (immediate) {
    // Remove immediately for toast replacement
    if (currentToast && currentToast.parentNode) {
      currentToast.parentNode.removeChild(currentToast);
    }
    currentToast = null;
  } else {
    // Wait for animation to complete for natural dismissal
    setTimeout(() => {
      if (currentToast && currentToast.parentNode) {
        currentToast.parentNode.removeChild(currentToast);
      }
      currentToast = null;
    }, 10000);
  }
}

// Generic toast notification function
/**
 * @param {string} title
 * @param {string} message
 */
function showToast(title, message, type = "info", duration = 5000) {
  // Remove existing toast if any
  if (currentToast) {
    hideToast(true); // Immediate cleanup when replacing
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-body">${message}</div>
    <div class="progress-bar"></div>
    `;

  document.body.appendChild(toast);
  currentToast = toast;

  const progressBar = toast.querySelector(".progress-bar");
  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

    if (!(progressBar instanceof HTMLElement)) return;

    // Initialize progress bar to full width without transition
    progressBar.style.transition = "none";
    progressBar.style.width = "100%";

    // After a brief moment, enable transition and start countdown
    setTimeout(() => {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = "0%";
    }, 50);
  }, 10);

  // Auto-hide after specified duration
  toastTimer = setTimeout(() => hideToast(), duration);
}

// Event listeners for dismissing toast
document.addEventListener("click", (e) => {
  if (!(e.target instanceof Element)) return;

  if (
    currentToast &&
    !currentToast.contains(e.target) &&
    !e.target.closest(".help-icon")
  ) {
    hideToast();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentToast) {
    hideToast();
  }
});

export{ showHelpToast, showToast };