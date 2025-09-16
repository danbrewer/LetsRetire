const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value || 0);
const pct = (v) => (isNaN(v) ? 0 : Number(v) / 100);
const fmt = (n) =>
  n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

// Global variable to store calculations for popup access
let calculations = [];

// Helper function to create reusable help icon
function createHelpIcon(fieldId) {
  return `<svg xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                width="1em" height="1em" 
                fill="#7c8db5" 
                class="help-icon"
                onclick="showHelpToast(event, '${fieldId}')"
                style="vertical-align: middle; margin-left: 0.3em;">
            <circle cx="12" cy="12" r="10" stroke="#7c8db5" stroke-width="2" fill="none"/>
            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5v1" stroke="#7c8db5" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="1" fill="#7c8db5"/>
            </svg>`;
}

// Help toast functionality
let currentToast = null;
let currentProgressBar = null;
let toastTimer = null;
let progressTimer = null;

function showHelpToast(event, fieldId) {
  // Prevent the click from bubbling up to document
  event.stopPropagation();

  const helpTexts = {
    currentAge: {
      title: "Current Age",
      body: "Enter your current age in years. This is used as the starting point for all retirement calculations and determines how many years you have until retirement.",
    },
    retireAge: {
      title: "Retirement Age",
      body: "The age at which you plan to retire and stop working. This determines when you'll begin withdrawing from your retirement accounts.",
    },
    endAge: {
      title: "Plan to Age",
      body: "The age until which you want your retirement funds to last. This is typically your expected lifespan or when you want financial security to end.",
    },
    inflation: {
      title: "Inflation Rate",
      body: "The expected annual inflation rate as a percentage. This affects how your spending needs will grow over time and reduces the purchasing power of money.",
    },
    spendingToday: {
      title: "Retirement Spending",
      body: "How much you expect to spend per year in retirement, expressed in today's dollars. This will be adjusted for inflation to your retirement date.",
    },
    spendingDecline: {
      title: "Annual Spending Decline",
      body: "The percentage by which your spending decreases each year in retirement. Many retirees spend less as they age due to reduced activity and travel.",
    },
    spouseAge: {
      title: "Spouse Current Age",
      body: "Your spouse's current age in years. Set to 0 if you don't have a spouse. This affects Social Security and pension benefit calculations.",
    },
    spouseRetireAge: {
      title: "Spouse Retirement Age",
      body: "The age at which your spouse plans to retire. This determines when spouse income sources will begin or end.",
    },
    salary: {
      title: "Current Salary",
      body: "Your current annual gross salary before taxes and deductions. This is used to calculate retirement contributions and employer matching.",
    },
    salaryGrowth: {
      title: "Salary Growth Rate",
      body: "The expected annual percentage increase in your salary. This affects future contribution amounts and employer matching over time.",
    },
    pretaxPct: {
      title: "Pre-tax Contribution Rate",
      body: "The percentage of your salary contributed to pre-tax retirement accounts like traditional 401(k) or IRA. These reduce current taxes but are taxed in retirement.",
    },
    rothPct: {
      title: "Roth Contribution Rate",
      body: "The percentage of your salary contributed to Roth accounts. These are made with after-tax dollars but grow tax-free and are not taxed in retirement.",
    },
    taxablePct: {
      title: "Taxable Savings Rate",
      body: "The percentage of your salary saved in regular taxable investment accounts. These provide flexibility but don't have tax advantages. Note: Interest and dividends earned on these accounts are included in your taxable income each year during working years.",
    },
    matchCap: {
      title: "Employer Match Cap",
      body: "The maximum percentage of salary that your employer will match. For example, if your employer matches up to 4% of salary.",
    },
    matchRate: {
      title: "Employer Match Rate",
      body: "The percentage rate at which your employer matches contributions. For example, 50% means they contribute $0.50 for every $1.00 you contribute.",
    },
    balPre: {
      title: "Pre-tax Balance",
      body: "Your current balance in pre-tax retirement accounts like traditional 401(k), 403(b), or traditional IRA.",
    },
    balRoth: {
      title: "Roth Balance",
      body: "Your current balance in Roth retirement accounts like Roth 401(k) or Roth IRA. These grow tax-free.",
    },
    balSavings: {
      title: "Taxable Balance",
      body: "Your current balance in regular taxable investment accounts like brokerage accounts, savings, or CDs.",
    },
    retPre: {
      title: "Pre-tax Return Rate",
      body: "The expected annual return on your pre-tax retirement investments, expressed as a percentage. Typically 6-8% for diversified portfolios.",
    },
    retRoth: {
      title: "Roth Return Rate",
      body: "The expected annual return on your Roth retirement investments. Usually similar to pre-tax returns since they're often in similar investments.",
    },
    retTax: {
      title: "Taxable Return Rate",
      body: "The expected annual return on your taxable investments. May be slightly lower due to tax drag from annual taxes on dividends and capital gains.",
    },
    ssMonthly: {
      title: "Social Security Benefit",
      body: "Your estimated monthly Social Security benefit in the first year you claim it, in today's dollars. Check your Social Security statement for estimates.",
    },
    ssStart: {
      title: "Social Security Start Age",
      body: "The age at which you plan to start claiming Social Security benefits. You can claim as early as 62 or delay until 70 for larger benefits.",
    },
    ssCola: {
      title: "Social Security COLA",
      body: "The annual cost-of-living adjustment for Social Security, typically around 2-3% per year to keep pace with inflation.",
    },
    penMonthly: {
      title: "Pension Benefit",
      body: "Your estimated monthly pension benefit in the first year you receive it. Set to 0 if you don't have a pension.",
    },
    penStart: {
      title: "Pension Start Age",
      body: "The age at which you'll begin receiving pension benefits. This varies by employer and plan type.",
    },
    penCola: {
      title: "Pension COLA",
      body: "The annual cost-of-living adjustment for your pension. Many pensions have no COLA (0%), while others may match inflation.",
    },
    taxPre: {
      title: "Pre-tax Withdrawal Tax Rate",
      body: "The baseline effective tax rate on withdrawals from pre-tax retirement accounts. The calculator uses Taxable Income-based rates for more accuracy when total income is significant, but falls back to this rate as a minimum.",
    },
    taxTaxable: {
      title: "Taxable Withdrawal Tax Rate",
      body: "The effective tax rate on withdrawals from taxable accounts. Usually lower than income tax due to capital gains treatment.",
    },
    taxRoth: {
      title: "Roth Withdrawal Tax Rate",
      body: "The effective tax rate on Roth withdrawals. Typically 0% since Roth withdrawals are tax-free in retirement.",
    },
    taxSS: {
      title: "Social Security Tax Rate",
      body: "The effective tax rate on Social Security benefits. Varies based on total income, typically 0-18.5% of benefits.",
    },
    taxPension: {
      title: "Pension Tax Rate",
      body: "The baseline effective tax rate on pension benefits. When Taxable Income-based calculation is enabled, the calculator uses progressive tax rates based on total income, but falls back to this rate as a minimum. Usually taxed as ordinary income at your marginal tax rate.",
    },
    order: {
      title: "Withdrawal Order Strategy",
      body: "The order in which you'll withdraw from different account types. The default strategy withdraws from Savings first, then 401k, then Roth to optimize taxes. The 50/50 strategy takes equal net amounts from savings and 401k accounts (after Social Security and pension income), automatically grossing up the 401k withdrawal to account for taxes.",
    },
    filingStatus: {
      title: "Tax Filing Status",
      body: "Your tax filing status affects Social Security taxation thresholds and Taxable Income-based tax calculations. Single filers have lower thresholds for SS taxation than married filing jointly.",
    },
    useRMD: {
      title: "Required Minimum Distribution Rules",
      body: "When enabled, enforces mandatory withdrawals from pre-tax retirement accounts (401k, traditional IRA) starting at age 73. RMD amounts are calculated based on IRS life expectancy tables and account balances. These withdrawals are required by law and failure to take them results in significant penalties.",
    },
  };

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
  currentProgressBar = progressBar;

  // Show toast with animation
  progressTimer = setTimeout(() => {
    toast.classList.add("show");

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

  // Calculate button shortcut: Ctrl+Enter (or Cmd+Enter on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    calc();
  }
});

function drawChart(series) {
  const c = $("chart");
  const ctx = c.getContext("2d");

  // Ensure canvas has proper dimensions before drawing
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  const width = rect.width * dpr;
  const height = rect.height * dpr;

  // Force canvas to correct size if needed
  if (c.width !== width || c.height !== height) {
    c.width = width;
    c.height = height;
    c.style.width = rect.width + "px";
    c.style.height = rect.height + "px";
  }

  // Check if we should animate (has existing content)
  const hasExistingContent = c.hasContent && series && series.length > 0;

  if (hasExistingContent) {
    // Create a temporary canvas with the old content for smooth transition
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    tempCanvas.width = c.width;
    tempCanvas.height = c.height;
    tempCanvas.style.position = "absolute";
    tempCanvas.style.top = c.offsetTop + "px";
    tempCanvas.style.left = c.offsetLeft + "px";
    tempCanvas.style.width = c.style.width;
    tempCanvas.style.height = c.style.height;
    tempCanvas.style.pointerEvents = "none";
    tempCanvas.style.zIndex = "1000";

    // Copy current canvas content to temp canvas
    tempCtx.drawImage(c, 0, 0);

    // Insert temp canvas right after the original
    c.parentNode.insertBefore(tempCanvas, c.nextSibling);

    // Start animated chart draw after a brief delay
    setTimeout(() => {
      drawAnimatedChart(ctx, series, width, height, dpr, c);
    }, 50);

    // Set up original canvas to be invisible initially
    c.style.transition = "opacity 0.3s ease";
    c.style.opacity = "0";

    // Set up temp canvas to fade out
    tempCanvas.style.transition = "opacity 0.2s ease";

    // Start the transition
    requestAnimationFrame(() => {
      c.style.opacity = "1";
      tempCanvas.style.opacity = "0";

      // Remove temp canvas after transition
      setTimeout(() => {
        if (tempCanvas.parentNode) {
          tempCanvas.parentNode.removeChild(tempCanvas);
        }
      }, 300);
    });
  } else {
    // No existing content, start animated draw immediately with delay
    c.style.opacity = "1";
    setTimeout(() => {
      drawAnimatedChart(ctx, series, width, height, dpr, c);
    }, 300);
  }
}

function drawChartContent(
  ctx,
  series,
  width,
  height,
  dpr,
  c,
  skipClear = false
) {
  if (!skipClear) {
    ctx.clearRect(0, 0, width, height);
  }
  if (!series || !series.length) {
    return;
  }

  // Padding (in device pixels) - increased left padding for Y-axis labels
  const pad = { l: 80 * dpr, r: 12 * dpr, t: 12 * dpr, b: 28 * dpr };
  const xs = series.map((p) => p.x);
  const ys = series.map((p) => p.y);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  const ymin = 0,
    ymax = Math.max(...ys) * 1.1;
  const xTo = (x) =>
    pad.l + ((x - xmin) / (xmax - xmin)) * (width - pad.l - pad.r);
  const yTo = (y) =>
    height - pad.b - ((y - ymin) / (ymax - ymin)) * (height - pad.t - pad.b);

  // Axes
  ctx.strokeStyle = "#22304d";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(pad.l, yTo(0));
  ctx.lineTo(width - pad.r, yTo(0));
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.stroke();

  // Y ticks
  ctx.fillStyle = "#7c8db5";
  ctx.font = `${12 * dpr}px system-ui`;
  ctx.textAlign = "right";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = (ymax / steps) * i;
    const y = yTo(v);
    ctx.strokeStyle = "rgba(34,48,77,.4)";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
    ctx.fillText(fmt(v), pad.l - 8 * dpr, y + 4 * dpr);
  }

  // Line
  ctx.strokeStyle = "#6ea8fe";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  series.forEach((p, i) => {
    const X = xTo(p.x),
      Y = yTo(p.y);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // Points
  ctx.fillStyle = "#6ea8fe";
  series.forEach((p) => {
    const X = xTo(p.x),
      Y = yTo(p.y);
    ctx.beginPath();
    ctx.arc(X, Y, 2.5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels
  ctx.fillStyle = "#7c8db5";
  ctx.textAlign = "center";
  ctx.font = `${11 * dpr}px system-ui`;
  const years = [
    series[0].x,
    series[Math.floor(series.length / 2)].x,
    series[series.length - 1].x,
  ];
  years.forEach((x) => ctx.fillText(String(x), xTo(x), height - 6 * dpr));

  // Store chart data and setup for tooltip functionality
  c.chartData = {
    series: series,
    xTo: xTo,
    yTo: yTo,
    width: width,
    height: height,
    dpr: dpr,
    pad: pad,
  };

  // Setup mouse event handlers for tooltips (only add once)
  if (!c.hasTooltipHandlers) {
    const tooltip = document.getElementById("chartTooltip");

    function showTooltip(x, y, point) {
      const yearDiv = tooltip.querySelector(".year");
      const balanceDiv = tooltip.querySelector(".balance");

      yearDiv.textContent = `Year ${point.x} (Age ${point.age})`;
      balanceDiv.textContent = `Balance: ${fmt(point.y)}`;

      tooltip.style.left = x + "px";
      tooltip.style.top = y + "px";
      tooltip.classList.add("visible");
    }

    function hideTooltip() {
      tooltip.classList.remove("visible");
    }

    function findNearestPoint(mouseX, mouseY) {
      if (!c.chartData) return null;

      const { series, xTo, yTo, dpr } = c.chartData;
      const threshold = 20 * dpr; // 20px hit area
      let nearest = null;
      let minDistance = threshold;

      series.forEach((point) => {
        const pointX = xTo(point.x);
        const pointY = yTo(point.y);
        const distance = Math.sqrt(
          Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = point;
        }
      });

      return nearest;
    }

    c.addEventListener("mousemove", (e) => {
      const rect = c.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * c.chartData.dpr;
      const mouseY = (e.clientY - rect.top) * c.chartData.dpr;

      const nearestPoint = findNearestPoint(mouseX, mouseY);

      if (nearestPoint) {
        // Calculate chart center for conditional positioning
        const { xTo, pad, width } = c.chartData;
        const pointX = xTo(nearestPoint.x);
        const chartCenter = (pad.l + (width - pad.r)) / 2;

        // Position tooltip to avoid clipping
        let tooltipX, tooltipY;
        if (pointX < chartCenter) {
          // Point is on left side - show tooltip to the right
          tooltipX = e.clientX - rect.left + 15;
        } else {
          // Point is on right side - show tooltip to the left
          tooltipX = e.clientX - rect.left - 150;
        }
        tooltipY = e.clientY - rect.top - 10;

        showTooltip(tooltipX, tooltipY, nearestPoint);
        c.style.cursor = "pointer";
      } else {
        hideTooltip();
        c.style.cursor = "default";
      }
    });

    c.addEventListener("mouseleave", () => {
      hideTooltip();
      c.style.cursor = "default";
    });

    c.hasTooltipHandlers = true;
  }
}

function drawAnimatedChart(ctx, series, width, height, dpr, c) {
  if (!series || !series.length) {
    return;
  }

  // Animation parameters
  const animationDuration = 300; // ms - reduced for snappier animation
  let startTime = null;

  // Padding and coordinate calculations (same as static version)
  const pad = { l: 80 * dpr, r: 12 * dpr, t: 12 * dpr, b: 28 * dpr };
  const xs = series.map((p) => p.x);
  const ys = series.map((p) => p.y);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  const ymin = 0,
    ymax = Math.max(...ys) * 1.1;
  const xTo = (x) =>
    pad.l + ((x - xmin) / (xmax - xmin)) * (width - pad.l - pad.r);
  const yTo = (y) =>
    height - pad.b - ((y - ymin) / (ymax - ymin)) * (height - pad.t - pad.b);

  // Store final chart data for tooltips
  c.chartData = {
    series: series,
    xTo: xTo,
    yTo: yTo,
    width: width,
    height: height,
    dpr: dpr,
    pad: pad,
  };

  // Animation function
  function animateStep(currentTime) {
    if (!startTime) startTime = currentTime;

    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / animationDuration, 1);

    // Ease-out animation curve for smooth deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw static elements (axes, grid, labels)
    drawStaticChartElements(
      ctx,
      width,
      height,
      dpr,
      pad,
      xTo,
      yTo,
      ymax,
      series
    );

    // Draw animated line and points
    drawAnimatedElements(ctx, series, xTo, yTo, dpr, easeProgress);

    if (progress < 1) {
      requestAnimationFrame(animateStep);
    } else {
      // Animation complete, mark content as available and setup tooltips
      c.hasContent = series && series.length > 0;
      setupChartTooltips(c);
    }
  }

  // Start the animation
  requestAnimationFrame(animateStep);
}

function drawStaticChartElements(
  ctx,
  width,
  height,
  dpr,
  pad,
  xTo,
  yTo,
  ymax,
  series
) {
  // Axes
  ctx.strokeStyle = "#22304d";
  ctx.lineWidth = 1 * dpr;
  ctx.beginPath();
  ctx.moveTo(pad.l, yTo(0));
  ctx.lineTo(width - pad.r, yTo(0));
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, height - pad.b);
  ctx.stroke();

  // Y ticks and grid lines
  ctx.fillStyle = "#7c8db5";
  ctx.font = `${12 * dpr}px system-ui`;
  ctx.textAlign = "right";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const v = (ymax / steps) * i;
    const y = yTo(v);
    ctx.strokeStyle = "rgba(34,48,77,.4)";
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(width - pad.r, y);
    ctx.stroke();
    ctx.fillText(fmt(v), pad.l - 8 * dpr, y + 4 * dpr);
  }

  // X labels
  ctx.fillStyle = "#7c8db5";
  ctx.textAlign = "center";
  ctx.font = `${11 * dpr}px system-ui`;
  const years = [
    series[0].x,
    series[Math.floor(series.length / 2)].x,
    series[series.length - 1].x,
  ];
  years.forEach((x) => ctx.fillText(String(x), xTo(x), height - 6 * dpr));
}

function drawAnimatedElements(ctx, series, xTo, yTo, dpr, progress) {
  // Create animated series where each point moves from $0 to its final position
  const animatedSeries = series.map((point, index) => {
    // Calculate stagger delay based on total number of points
    // Limit total stagger to 30% of animation, so all points finish together
    const maxStaggerDelay = 0.3;
    const pointDelay =
      (index / Math.max(1, series.length - 1)) * maxStaggerDelay;
    const adjustedProgress = Math.max(
      0,
      Math.min(1, (progress - pointDelay) / (1 - maxStaggerDelay))
    );

    return {
      x: point.x,
      y: point.y * adjustedProgress, // Animate from 0 to final value
      age: point.age,
    };
  });

  // Draw animated line
  ctx.strokeStyle = "#6ea8fe";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  animatedSeries.forEach((p, i) => {
    const X = xTo(p.x),
      Y = yTo(p.y);
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.stroke();

  // Draw animated points
  ctx.fillStyle = "#6ea8fe";
  animatedSeries.forEach((p, index) => {
    const maxStaggerDelay = 0.3;
    const pointDelay =
      (index / Math.max(1, series.length - 1)) * maxStaggerDelay;
    const pointProgress = Math.max(
      0,
      Math.min(1, (progress - pointDelay) / (1 - maxStaggerDelay))
    );

    if (pointProgress > 0) {
      const X = xTo(p.x),
        Y = yTo(p.y);
      const radius = 2.5 * dpr * pointProgress; // Points grow as they animate
      ctx.beginPath();
      ctx.arc(X, Y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function setupChartTooltips(c) {
  // Setup mouse event handlers for tooltips (only add once)
  if (!c.hasTooltipHandlers) {
    const tooltip = document.getElementById("chartTooltip");

    function showTooltip(x, y, point) {
      const yearDiv = tooltip.querySelector(".year");
      const balanceDiv = tooltip.querySelector(".balance");

      yearDiv.textContent = `Year ${point.x} (Age ${point.age})`;
      balanceDiv.textContent = `Balance: ${fmt(point.y)}`;

      tooltip.style.left = x + "px";
      tooltip.style.top = y + "px";
      tooltip.classList.add("visible");
    }

    function hideTooltip() {
      tooltip.classList.remove("visible");
    }

    function findNearestPoint(mouseX, mouseY) {
      if (!c.chartData) return null;

      const { series, xTo, yTo, dpr } = c.chartData;
      const threshold = 20 * dpr; // 20px hit area
      let nearest = null;
      let minDistance = threshold;

      series.forEach((point) => {
        const pointX = xTo(point.x);
        const pointY = yTo(point.y);
        const distance = Math.sqrt(
          Math.pow(mouseX - pointX, 2) + Math.pow(mouseY - pointY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = point;
        }
      });

      return nearest;
    }

    c.addEventListener("mousemove", (e) => {
      const rect = c.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * c.chartData.dpr;
      const mouseY = (e.clientY - rect.top) * c.chartData.dpr;

      const nearestPoint = findNearestPoint(mouseX, mouseY);

      if (nearestPoint) {
        // Calculate chart center for conditional positioning
        const { xTo, pad, width } = c.chartData;
        const pointX = xTo(nearestPoint.x);
        const chartCenter = (pad.l + (width - pad.r)) / 2;

        // Position tooltip to avoid clipping
        let tooltipX, tooltipY;
        if (pointX < chartCenter) {
          // Point is on left side - show tooltip to the right
          tooltipX = e.clientX - rect.left + 15;
        } else {
          // Point is on right side - show tooltip to the left
          tooltipX = e.clientX - rect.left - 150;
        }
        tooltipY = e.clientY - rect.top - 10;

        showTooltip(tooltipX, tooltipY, nearestPoint);
        c.style.cursor = "pointer";
      } else {
        hideTooltip();
        c.style.cursor = "default";
      }
    });

    c.addEventListener("mouseleave", () => {
      hideTooltip();
      c.style.cursor = "default";
    });

    c.hasTooltipHandlers = true;
  }
}

function exportCSV() {
  const rows = window.__rows || [];
  if (!calculations.length) {
    showToast(
      "No Data",
      "Run a calculation first to generate data for export.",
      "warning"
    );
    return;
  }
  const headers = [
    "Year",
    "Age",
    "Salary",
    "Annual_Spend",
    "SS_Net",
    "Pension_Net",
    "Spouse_SS_Net",
    "Spouse_Pension_Net",
    "401k_Net_Withdrawal",
    "Savings_Roth_Net_Withdrawal",
    "Total_Net_Withdrawal",
    "SS_Gross",
    "Pension_Gross",
    "Spouse_SS_Gross",
    "Spouse_Pension_Gross",
    "401k_Gross_Withdrawal",
    "Savings_Gross_Withdrawal",
    "Roth_Gross_Withdrawal",
    "Total_Gross_Income",
    "Taxable_Income_After_Deduction",
    "Non_Taxable_Income",
    "Provisional_Income",
    "Taxable_Interest",
    "SS_Taxes",
    "Other_Taxes",
    "Total_Taxes",
    "Standard_Deduction",
    "Effective_Tax_Rate",
    "Savings_Balance",
    "401k_Balance",
    "Roth_Balance",
    "Total_Balance",
  ];
  const csv = [headers.join(",")]
    .concat(
      calculations.map((r) =>
        [
          r.year,
          r.age,
          r.salary || 0,
          r.spend,
          r.ss,
          r.pen,
          r.spouseSs || 0,
          r.spousePen || 0,
          r.withdrawals.retirementAccountNet || 0,
          r.withdrawals.savingsRothNet || 0,
          r.wNet || 0,
          r.ssGross || 0,
          r.penGross || 0,
          r.spouseSsGross || 0,
          r.spousePenGross || 0,
          r.withdrawals.retirementAccountGross || 0,
          r.withdrawals.savingsGross || 0,
          r.withdrawals.rothGross || 0,
          r.totalGrossIncome || 0,
          r.taxableIncome || 0,
          r.nonTaxableIncome || 0,
          r.provisionalIncome || 0,
          r.taxableInterest || 0,
          r.ssTaxes || 0,
          r.otherTaxes || 0,
          r.taxes,
          r.standardDeduction || 0,
          r.effectiveTaxRate || 0,
          r.balSavings,
          r.balPre,
          r.balRoth,
          r.total,
        ]
          .map((v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v))
          .join(",")
      )
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "retirement_results.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  const inputs = {};
  // Collect all input values including spending overrides
  document.querySelectorAll("input, select").forEach((input) => {
    if (input.id && input.id !== "jsonFileInput") {
      inputs[input.id] = input.value;
    }
  });

  const exportData = {
    version: "1.1",
    exportDate: new Date().toISOString(),
    description: "Retirement Calculator Scenario with Spending Overrides",
    inputs: inputs,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `retirement_scenario_${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSON() {
  const fileInput = $("jsonFileInput");
  fileInput.click();
}

function handleJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".json")) {
    showToast("Invalid File", "Please select a JSON file.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const fileData = JSON.parse(e.target.result);

      // Validate the JSON structure
      if (!fileData.inputs || typeof fileData.inputs !== "object") {
        showToast(
          "Invalid Format",
          "Invalid JSON file format. Expected retirement calculator scenario data.",
          "error"
        );
        return;
      }

      let loadedCount = 0;
      let totalCount = 0;

      // Load all input values
      Object.entries(fileData.inputs).forEach(([id, value]) => {
        totalCount++;
        const element = document.getElementById(id);
        if (element) {
          element.value = value;
          loadedCount++;
        } else if (id.startsWith("spending_")) {
          // Handle spending override fields that may not exist yet
          totalCount--; // Don't count these in the totals since they're dynamic
        }
      });

      // If there are spending override fields in the import, regenerate the fields first
      const hasSpendingOverrides = Object.keys(fileData.inputs).some((id) =>
        id.startsWith("spending_")
      );
      if (hasSpendingOverrides) {
        regenerateSpendingFields();
        // Now load the spending override values
        Object.entries(fileData.inputs).forEach(([id, value]) => {
          if (id.startsWith("spending_")) {
            const element = document.getElementById(id);
            if (element) {
              element.value = value;
              loadedCount++;
            }
          }
        });
      }

      // If there are income adjustment fields in the import, regenerate the fields first
      const hasTaxableIncomeOverrides = Object.keys(fileData.inputs).some(
        (id) => id.startsWith("taxableIncome_")
      );
      const hasTaxFreeIncomeOverrides = Object.keys(fileData.inputs).some(
        (id) => id.startsWith("taxFreeIncome_")
      );
      if (hasTaxableIncomeOverrides || hasTaxFreeIncomeOverrides) {
        regenerateTaxableIncomeFields();
        regenerateTaxFreeIncomeFields();
        // Now load the income adjustment values
        Object.entries(fileData.inputs).forEach(([id, value]) => {
          if (
            id.startsWith("taxableIncome_") ||
            id.startsWith("taxFreeIncome_")
          ) {
            const element = document.getElementById(id);
            if (element) {
              element.value = value;
              loadedCount++;
            }
          }
        });
      }

      // Show import summary
      let summary = `Loaded ${loadedCount} of ${totalCount} settings.`;
      if (fileData.description) {
        summary += `\nDescription: ${fileData.description}`;
      }
      if (fileData.exportDate) {
        summary += `\nExported: ${new Date(
          fileData.exportDate
        ).toLocaleDateString()}`;
      }

      showToast("Import Successful", summary, "success", 7000);
      calc(); // Automatically recalculate
    } catch (error) {
      showToast(
        "Import Error",
        "Error reading JSON file: " + error.message,
        "error"
      );
    }
  };

  reader.readAsText(file);
  // Clear the file input so the same file can be selected again
  event.target.value = "";
}

/**
 * Generate a comprehensive PDF report of the retirement calculation
 */
function generatePDFReport() {
  if (!calculations || calculations.length === 0) {
    showToast(
      "No Data",
      "Please run the calculation first before generating a PDF report.",
      "error"
    );
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const inputs = parseInputParameters();

    // Color scheme
    const colors = {
      primary: [43, 99, 255], // Blue
      secondary: [110, 168, 254], // Light blue
      success: [69, 212, 131], // Green
      warning: [255, 191, 105], // Orange
      danger: [255, 107, 107], // Red
      dark: [11, 18, 32], // Dark blue
      muted: [124, 141, 181], // Muted blue
      light: [230, 238, 252], // Very light blue
    };

    // Helper functions for styling
    function addColoredRect(x, y, width, height, color, alpha = 0.1) {
      // Calculate lighter color instead of using alpha
      const lightenedColor = color.map((c) =>
        Math.min(255, c + (255 - c) * (1 - alpha))
      );
      doc.setFillColor(lightenedColor[0], lightenedColor[1], lightenedColor[2]);
      doc.rect(x, y, width, height, "F");
    }

    // Page break management
    function checkAndAddPageBreak(currentY, requiredSpace) {
      const pageHeight = 297; // A4 page height in mm
      const bottomMargin = 20; // Space to leave at bottom

      if (currentY + requiredSpace > pageHeight - bottomMargin) {
        doc.addPage();
        return 20; // Start new page at top margin
      }
      return currentY;
    }

    function addSectionHeader(
      title,
      yPos,
      color = colors.primary,
      estimatedSectionHeight = 50
    ) {
      // Check if we need a page break before starting this section
      yPos = checkAndAddPageBreak(yPos, estimatedSectionHeight);

      // Background rectangle
      addColoredRect(15, yPos - 8, 180, 12, color, 0.1);

      // Header text
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, 20, yPos);

      // Reset color
      doc.setTextColor(0, 0, 0);
      return yPos + 15;
    }

    function addKeyValuePair(key, value, yPos, indent = 0, valueColor = null) {
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(key, 20 + indent, yPos);

      if (valueColor) {
        doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
        doc.setFont(undefined, "bold");
      }

      doc.text(value, 120, yPos);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");

      return yPos + 7;
    }

    // PAGE 1: Executive Summary
    // Header with gradient-like effect
    addColoredRect(0, 0, 210, 40, colors.primary, 0.05);
    addColoredRect(0, 0, 210, 25, colors.primary, 0.1);

    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Retirement Planning Report", 20, 20);

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(
      `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      20,
      32
    );

    doc.setTextColor(0, 0, 0);

    let yPos = 55;

    // Executive Summary with status indicator
    yPos = addSectionHeader("Executive Summary", yPos);

    const calculation = calculations[calculations.length - 1];
    const fundedTo =
      calculation.total > 0
        ? inputs.endAge
        : calculations.reduce(
            (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
            inputs.currentAge
          );
    const isFullyFunded = fundedTo >= inputs.endAge;

    // Status box - smaller and with custom drawn symbols
    const statusColor = isFullyFunded ? colors.success : colors.danger;
    const statusText = isFullyFunded ? "Fully Funded" : "Funding Shortfall";

    // Smaller status box
    addColoredRect(15, yPos - 3, 180, 15, statusColor, 0.1);

    // Draw custom status symbol
    const symbolX = 22;
    const symbolY = yPos + 4.5; // Vertically center the symbol
    const radius = 3;

    if (isFullyFunded) {
      // Draw green circle with checkmark
      doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
      doc.circle(symbolX, symbolY, radius, "F");

      // Draw checkmark inside circle
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(symbolX - 1.5, symbolY, symbolX - 0.5, symbolY + 1);
      doc.line(symbolX - 0.5, symbolY + 1, symbolX + 1.5, symbolY - 1);
    } else {
      // Draw red circle with X
      doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.circle(symbolX, symbolY, radius, "F");

      // Draw X inside circle
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(symbolX - 1.5, symbolY - 1.5, symbolX + 1.5, symbolY + 1.5);
      doc.line(symbolX - 1.5, symbolY + 1.5, symbolX + 1.5, symbolY - 1.5);
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(`Status: ${statusText}`, 30, yPos + 5.5); // Perfect vertical centering

    if (!isFullyFunded) {
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(
        `Your retirement funds will last until age ${fundedTo}`,
        20,
        yPos + 12
      );
      yPos += 25; // Extra space for the warning text + more spacing
    } else {
      yPos += 20; // More space when fully funded
    }

    doc.setTextColor(0, 0, 0);

    // Key metrics in a nice layout
    yPos = addKeyValuePair("Current Age:", `${inputs.currentAge} years`, yPos);
    yPos = addKeyValuePair(
      "Planned Retirement Age:",
      `${inputs.retireAge} years`,
      yPos
    );
    yPos = addKeyValuePair(
      "Plan Duration:",
      `${inputs.endAge - inputs.currentAge} years total`,
      yPos
    );
    yPos = addKeyValuePair(
      "Years to Retirement:",
      `${inputs.retireAge - inputs.currentAge} years`,
      yPos
    );
    yPos += 5;

    yPos = addKeyValuePair(
      "Current Total Assets:",
      fmt(inputs.balPre + inputs.balRoth + inputs.balSavings),
      yPos,
      0,
      colors.primary
    );
    yPos = addKeyValuePair(
      "Projected Final Balance:",
      fmt(Math.max(0, calculation.total)),
      yPos,
      0,
      isFullyFunded ? colors.success : colors.danger
    );
    yPos += 10;

    // Asset allocation with visual representation
    yPos = addSectionHeader(
      "Current Asset Allocation",
      yPos,
      colors.secondary,
      80
    );

    const totalAssets = inputs.balPre + inputs.balRoth + inputs.balSavings;
    const pretaxPct = ((inputs.balPre / totalAssets) * 100).toFixed(1);
    const rothPct = ((inputs.balRoth / totalAssets) * 100).toFixed(1);
    const savingsPct = ((inputs.balSavings / totalAssets) * 100).toFixed(1);

    yPos = addKeyValuePair(
      "Pre-tax (401k/IRA):",
      `${fmt(inputs.balPre)} (${pretaxPct}%)`,
      yPos,
      0,
      colors.primary
    );
    yPos = addKeyValuePair(
      "Roth IRA/401k:",
      `${fmt(inputs.balRoth)} (${rothPct}%)`,
      yPos,
      0,
      colors.success
    );
    yPos = addKeyValuePair(
      "Taxable Savings:",
      `${fmt(inputs.balSavings)} (${savingsPct}%)`,
      yPos,
      0,
      colors.warning
    );

    // Visual asset allocation bars
    const barWidth = 150;
    const barHeight = 8;
    const barStartX = 25;
    yPos += 10;

    // Pre-tax bar
    const pretaxBarWidth = barWidth * (inputs.balPre / totalAssets);
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(barStartX, yPos, pretaxBarWidth, barHeight, "F");

    // Roth bar
    const rothBarWidth = barWidth * (inputs.balRoth / totalAssets);
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(barStartX + pretaxBarWidth, yPos, rothBarWidth, barHeight, "F");

    // Savings bar
    const savingsBarWidth = barWidth * (inputs.balSavings / totalAssets);
    doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    doc.rect(
      barStartX + pretaxBarWidth + rothBarWidth,
      yPos,
      savingsBarWidth,
      barHeight,
      "F"
    );

    // Add border around the complete bar
    doc.setDrawColor(150, 150, 150);
    doc.rect(barStartX, yPos, barWidth, barHeight);

    yPos += 25;

    // Chart and Key Assumptions (will add page break if needed)
    // Add the chart
    yPos = addSectionHeader(
      "Balance Projection Chart",
      yPos,
      colors.primary,
      120
    );

    // Get chart data and create a simple line chart
    const chartData = calculations.map((calculation) => ({
      x: calculation.year,
      y: calculation.total,
    }));
    const chartWidth = 170;
    const chartHeight = 80;
    const chartX = 20;
    const chartY = yPos + 15; // Add more space between header and chart

    // Chart background
    addColoredRect(
      chartX - 5,
      chartY - 5,
      chartWidth + 10,
      chartHeight + 10,
      colors.light,
      0.3
    );

    // Find min/max values for scaling
    const maxBalance = Math.max(...chartData.map((d) => d.y));
    const minBalance = Math.min(0, Math.min(...chartData.map((d) => d.y)));
    const balanceRange = maxBalance - minBalance;

    const minYear = Math.min(...chartData.map((d) => d.x));
    const maxYear = Math.max(...chartData.map((d) => d.x));
    const yearRange = maxYear - minYear;

    // Draw grid lines
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    // Vertical grid lines (years)
    for (let i = 0; i <= 4; i++) {
      const x = chartX + (chartWidth * i) / 4;
      doc.line(x, chartY, x, chartY + chartHeight);
    }

    // Horizontal grid lines (balance)
    for (let i = 0; i <= 4; i++) {
      const y = chartY + (chartHeight * i) / 4;
      doc.line(chartX, y, chartX + chartWidth, y);
    }

    // Draw the data line
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(2);

    for (let i = 0; i < chartData.length - 1; i++) {
      const point1 = chartData[i];
      const point2 = chartData[i + 1];

      const x1 = chartX + ((point1.x - minYear) / yearRange) * chartWidth;
      const y1 =
        chartY +
        chartHeight -
        ((point1.y - minBalance) / balanceRange) * chartHeight;
      const x2 = chartX + ((point2.x - minYear) / yearRange) * chartWidth;
      const y2 =
        chartY +
        chartHeight -
        ((point2.y - minBalance) / balanceRange) * chartHeight;

      doc.line(x1, y1, x2, y2);
    }

    // Add chart labels
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.setFontSize(8);

    // Y-axis labels (balance)
    for (let i = 0; i <= 4; i++) {
      const balance = minBalance + (balanceRange * i) / 4;
      const y = chartY + chartHeight - (chartHeight * i) / 4;
      doc.text((balance / 1000000).toFixed(1) + "M", chartX - 15, y + 2);
    }

    // X-axis labels (years)
    for (let i = 0; i <= 4; i++) {
      const year = Math.round(minYear + (yearRange * i) / 4);
      const x = chartX + (chartWidth * i) / 4;
      doc.text(year.toString(), x - 8, chartY + chartHeight + 10);
    }

    // Chart title and axis labels
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text(
      "Total Account Balance Over Time",
      chartX + chartWidth / 2 - 35,
      chartY - 10
    );

    doc.setFont(undefined, "normal");
    doc.text("Balance ($M)", chartX - 15, chartY - 15);
    doc.text("Year", chartX + chartWidth / 2 - 10, chartY + chartHeight + 20);

    doc.setTextColor(0, 0, 0);
    yPos = chartY + chartHeight + 30;

    // Key Assumptions
    yPos = addSectionHeader("Key Assumptions", yPos, colors.secondary, 70);

    yPos = addKeyValuePair(
      "Current Annual Spending:",
      fmt(inputs.spendingToday),
      yPos
    );
    yPos = addKeyValuePair(
      "Inflation Rate:",
      `${(inputs.inflation * 100).toFixed(1)}%`,
      yPos
    );
    yPos = addKeyValuePair(
      "Annual Spending Decline:",
      `${(inputs.spendingDecline * 100).toFixed(1)}%`,
      yPos
    );
    yPos = addKeyValuePair("Current Salary:", fmt(inputs.startingSalary), yPos);
    yPos = addKeyValuePair(
      "Salary Growth Rate:",
      `${(inputs.salaryGrowth * 100).toFixed(1)}%`,
      yPos
    );
    yPos += 10;

    // Investment returns in a box - dynamic sizing for any number of items
    const investmentReturnsStartY = yPos;

    // Define the investment return items dynamically
    const investmentItems = [
      {
        key: "Pre-tax Accounts:",
        value: `${(inputs.retPre * 100).toFixed(1)}%`,
      },
      { key: "Roth Accounts:", value: `${(inputs.retRoth * 100).toFixed(1)}%` },
      {
        key: "Taxable Accounts:",
        value: `${(inputs.rateOfSavings * 100).toFixed(1)}%`,
      },
      // Future investment types can be added here
    ];

    // Calculate required height: header (12) + items (7 each) + padding (5)
    const headerHeight = 12;
    const itemHeight = 7;
    const bottomPadding = 5;
    const boxHeight =
      headerHeight + investmentItems.length * itemHeight + bottomPadding;

    // Draw the box first (background layer)
    addColoredRect(
      15,
      investmentReturnsStartY - 5,
      180,
      boxHeight,
      colors.secondary,
      0.05
    );

    // Draw the content on top
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Expected Investment Returns:", 20, yPos + 5);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    yPos += 12;

    // Draw all investment items dynamically
    investmentItems.forEach((item) => {
      yPos = addKeyValuePair(item.key, item.value, yPos, 5);
    });

    yPos += 10;

    // Income Sources
    yPos = addSectionHeader("Income Sources", yPos, colors.success, 120);

    yPos = addKeyValuePair(
      "Social Security (Annual):",
      fmt(inputs.ssMonthly * 12),
      yPos
    );
    yPos = addKeyValuePair("SS Starting Age:", `${inputs.ssStartAge}`, yPos, 5);
    yPos = addKeyValuePair(
      "SS COLA:",
      `${(inputs.ssCola * 100).toFixed(1)}%`,
      yPos,
      5
    );
    yPos += 3;

    if (inputs.penMonthly > 0) {
      yPos = addKeyValuePair(
        "Pension (Annual):",
        fmt(inputs.penMonthly * 12),
        yPos
      );
      yPos = addKeyValuePair(
        "Pension Starting Age:",
        `${inputs.penStartAge}`,
        yPos,
        5
      );
      yPos = addKeyValuePair(
        "Pension COLA:",
        `${(inputs.penCola * 100).toFixed(1)}%`,
        yPos,
        5
      );
    } else {
      yPos = addKeyValuePair("Pension:", "None", yPos);
    }

    if (inputs.hasSpouse) {
      yPos += 5;
      addColoredRect(15, yPos - 3, 180, 20, colors.light, 0.3);

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Spouse Information:", 20, yPos + 5);

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      yPos += 12;
      yPos = addKeyValuePair("Spouse Age:", `${inputs.spouseAge}`, yPos, 5);
      yPos = addKeyValuePair(
        "Spouse SS (Annual):",
        fmt(inputs.spouseSsMonthly * 12),
        yPos,
        5
      );
      yPos = addKeyValuePair(
        "Spouse Pension (Annual):",
        fmt(inputs.spousePenMonthly * 12),
        yPos,
        5
      );
    }

    // Add some spacing before detailed analysis
    yPos += 10;

    // Detailed Analysis (will add page break if needed)
    // Working Years Summary
    const workingYears = calculations.filter((c) => c.age < inputs.retireAge);
    if (workingYears.length > 0) {
      yPos = addSectionHeader(
        "Working Years Analysis",
        yPos,
        colors.primary,
        60
      );

      const totalContributions = workingYears.reduce(
        (sum, year) => sum + year.contrib,
        0
      );
      const totalTaxesPaid = workingYears.reduce(
        (sum, year) => sum + year.taxes,
        0
      );
      const finalWorkingBalance = workingYears[workingYears.length - 1];

      yPos = addKeyValuePair(
        "Years Until Retirement:",
        `${workingYears.length}`,
        yPos
      );
      yPos = addKeyValuePair(
        "Total Contributions:",
        fmt(totalContributions),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Taxes Paid:",
        fmt(totalTaxesPaid),
        yPos,
        0,
        colors.danger
      );
      yPos = addKeyValuePair(
        "Balance at Retirement:",
        fmt(finalWorkingBalance.total),
        yPos,
        0,
        colors.primary
      );
      yPos += 15;
    }

    // Retirement Years Summary
    const retirementYears = calculations.filter(
      (c) => c.age >= inputs.retireAge
    );
    if (retirementYears.length > 0) {
      yPos = addSectionHeader(
        "Retirement Years Analysis",
        yPos,
        colors.secondary,
        70
      );

      const totalRetirementSpending = retirementYears.reduce(
        (sum, year) => sum + year.spend,
        0
      );
      const totalRetirementTaxes = retirementYears.reduce(
        (sum, year) => sum + year.taxes,
        0
      );
      const totalSSIncome = retirementYears.reduce(
        (sum, year) => sum + (year.ss || 0),
        0
      );
      const totalPensionIncome = retirementYears.reduce(
        (sum, year) => sum + (year.pen || 0),
        0
      );
      const totalWithdrawals = retirementYears.reduce(
        (sum, year) => sum + year.wNet,
        0
      );

      yPos = addKeyValuePair(
        "Years in Retirement:",
        `${retirementYears.length}`,
        yPos
      );
      yPos = addKeyValuePair(
        "Total Spending:",
        fmt(totalRetirementSpending),
        yPos,
        0,
        colors.danger
      );
      yPos = addKeyValuePair(
        "Total SS Income:",
        fmt(totalSSIncome),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Pension Income:",
        fmt(totalPensionIncome),
        yPos,
        0,
        colors.success
      );
      yPos = addKeyValuePair(
        "Total Account Withdrawals:",
        fmt(totalWithdrawals),
        yPos,
        0,
        colors.warning
      );
      yPos = addKeyValuePair(
        "Total Retirement Taxes:",
        fmt(totalRetirementTaxes),
        yPos,
        0,
        colors.danger
      );
      yPos += 15;
    }

    // Key Year Projections Table with better formatting
    yPos = addSectionHeader("Key Year Projections", yPos, colors.primary, 150);

    // Table header with colored background
    addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);

    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);

    const headers = [
      "Year",
      "Age",
      "Spending",
      "SS",
      "Pension",
      "Withdrawals",
      "Taxes",
      "Balance",
    ];
    const colWidths = [20, 15, 25, 20, 25, 25, 20, 25];
    let xPos = 20;

    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos + 5);
      xPos += colWidths[i];
    });

    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");

    // Show key years with alternating row colors
    const keyYears = calculations.filter((calc, index) => {
      const isEveryFifthYear = index % 5 === 0;
      const isLastWorkingYear = calc.age === inputs.retireAge - 1;
      const isFirstRetirementYear = calc.age === inputs.retireAge;
      const isLastYear = index === calculations.length - 1;
      const isFirstYear = index === 0;
      return (
        isEveryFifthYear ||
        isLastWorkingYear ||
        isFirstRetirementYear ||
        isLastYear ||
        isFirstYear
      );
    });

    keyYears.forEach((calculation, index) => {
      if (yPos > 270) {
        // Page break
        doc.addPage();
        yPos = 20;
        // Repeat headers
        addColoredRect(15, yPos - 5, 180, 12, colors.primary, 0.1);
        doc.setFont(undefined, "bold");
        doc.setTextColor(
          colors.primary[0],
          colors.primary[1],
          colors.primary[2]
        );
        xPos = 20;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos + 5);
          xPos += colWidths[i];
        });
        yPos += 15;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
      }

      // Alternating row background
      if (index % 2 === 0) {
        addColoredRect(15, yPos - 3, 180, 8, colors.light, 0.3);
      }

      // Highlight retirement transition
      if (calculation.age === inputs.retireAge) {
        addColoredRect(15, yPos - 3, 180, 8, colors.warning, 0.2);
      }

      const values = [
        calculation.year.toString(),
        calculation.age.toString(),
        calculation.spend
          ? "$" + (calculation.spend / 1000).toFixed(2) + "k"
          : "",
        calculation.ss.mySs
          ? "$" + (calculation.ss.mySs / 1000).toFixed(2) + "k"
          : "",
        calculation.pen.myPen
          ? "$" + (calculation.pen.myPen / 1000).toFixed(2) + "k"
          : "",
        calculation.withdrawals.net
          ? "$" + (calculation.withdrawals.net / 1000).toFixed(2) + "k"
          : "",
        calculation.taxes.total
          ? "$" + (calculation.taxes.total / 1000).toFixed(2) + "k"
          : "",
        "$" + (calculation.total / 1000).toFixed(2) + "k",
      ];

      xPos = 20;
      values.forEach((value, i) => {
        // Color code negative balances
        if (i === 7 && calculation.total < 0) {
          doc.setTextColor(
            colors.danger[0],
            colors.danger[1],
            colors.danger[2]
          );
          doc.setFont(undefined, "bold");
        }

        doc.text(value, xPos, yPos + 2);

        // Reset formatting
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");

        xPos += colWidths[i];
      });
      yPos += 8;
    });

    // Disclaimers (will add page break if needed)
    yPos = addSectionHeader("Important Disclaimers", yPos, colors.danger, 200);

    addColoredRect(15, yPos - 5, 180, 140, colors.warning, 0.05);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    const disclaimers = [
      "This retirement planning report is for educational and informational purposes only.",
      "It should not be considered as financial, investment, or tax advice. The projections",
      "are based on the assumptions you provided and are estimates only.",
      "",
      "Key Limitations:",
      "• Market returns are unpredictable and may vary significantly from assumptions",
      "• Tax laws and Social Security rules may change over time",
      "• Healthcare costs and long-term care needs are not explicitly modeled",
      "• Inflation may vary from the assumed rate",
      "• Individual circumstances may require different strategies",
      "• Sequence of returns risk is not modeled",
      "",
      "Important Considerations:",
      "• This model uses simplified tax calculations",
      "• RMD rules may change in the future",
      "• Social Security benefits may be reduced if the trust fund is depleted",
      "• Healthcare inflation typically exceeds general inflation",
      "• Long-term care costs can be substantial",
      "",
      "Recommendations:",
      "• Consult with a qualified financial advisor before making investment decisions",
      "• Review and update your retirement plan regularly (annually recommended)",
      "• Consider multiple scenarios with different assumptions",
      "• Factor in emergency funds and unexpected expenses",
      "• Consider professional tax planning advice",
      "• Review beneficiary designations regularly",
      "",
      "This calculator uses simplified models and may not capture all aspects of",
      "retirement planning. Professional advice is recommended for comprehensive",
      "retirement planning tailored to your specific situation.",
    ];

    disclaimers.forEach((line) => {
      if (yPos > 280) {
        // Page break
        doc.addPage();
        yPos = 20;
      }
      if (line === "") {
        yPos += 5;
      } else {
        doc.text(line, 20, yPos, { maxWidth: 170 });
        yPos += 7;
      }
    });

    // Footer on last page
    yPos = 280;
    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(
      `Generated by Retirement Calculator • ${new Date().toLocaleDateString()}`,
      20,
      yPos
    );
    doc.text(
      "This report contains confidential financial information",
      120,
      yPos
    );

    // Open PDF in new tab instead of downloading
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");

    // Clean up the URL after a delay to free memory
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

    showToast("PDF Generated", "PDF report opened in new tab", "success");
  } catch (error) {
    console.error("PDF generation error:", error);
    showToast(
      "PDF Error",
      "Error generating PDF report: " + error.message,
      "error"
    );
  }
}

// Events
$("calcBtn").addEventListener("click", calc);
$("pdfBtn").addEventListener("click", generatePDFReport);
$("csvBtn").addEventListener("click", exportCSV);
$("exportJsonBtn").addEventListener("click", exportJSON);
$("importJsonBtn").addEventListener("click", importJSON);
$("jsonFileInput").addEventListener("change", handleJSONFile);
$("clearBtn").addEventListener("click", resetAll);
$("useCurrentYearValues").addEventListener("change", function () {
  updateSpendingFieldsDisplayMode();
});
$("useTaxableCurrentYearValues").addEventListener("change", function () {
  updateTaxableIncomeFieldsDisplayMode();
});
$("useTaxFreeCurrentYearValues").addEventListener("change", function () {
  updateTaxFreeIncomeFieldsDisplayMode();
});

// Initialize help icons
function initializeHelpIcons() {
  // Find all help icon placeholders and replace them with actual help icons
  const placeholders = document.querySelectorAll(".help-icon-placeholder");
  placeholders.forEach((placeholder) => {
    const fieldId = placeholder.getAttribute("data-field");
    if (fieldId) {
      placeholder.innerHTML = createHelpIcon(fieldId);
    }
  });

  // Auto-convert remaining verbose SVG help icons to placeholders (one-time conversion)
  const existingSvgIcons = document.querySelectorAll(
    'svg.help-icon[onclick*="showHelpToast"]'
  );
  existingSvgIcons.forEach((svg) => {
    const onclickAttr = svg.getAttribute("onclick");
    const match = onclickAttr.match(
      /showHelpToast\(event,\s*['"]([^'"]+)['"]\)/
    );
    if (match) {
      const fieldId = match[1];
      const placeholder = document.createElement("span");
      placeholder.className = "help-icon-placeholder";
      placeholder.setAttribute("data-field", fieldId);
      placeholder.innerHTML = createHelpIcon(fieldId);
      svg.parentNode.replaceChild(placeholder, svg);
    }
  });
}

/**
 * Parse and validate input parameters for the retirement calculation
 */
function parseInputParameters() {
  // Basic parameters
  const inputs = {
    currentAge: num("currentAge"),
    retireAge: num("retireAge"),
    ssStartAge: num("ssStart"),
    penStartAge: num("penStart"),
    endAge: num("endAge"),
    inflation: pct(num("inflation")),
    spendingToday: num("spendingToday"),
    spendingDecline: pct(num("spendingDecline")),

    // Spouse information
    spouseAge: num("spouseAge"),
    spouseRetireAge: num("spouseRetireAge"),
    spouseSsMonthly: num("spouseSsMonthly"),
    spouseSsStartAge: num("spouseSsStart"),
    spouseSsCola: pct(num("spouseSsCola")),
    spousePenMonthly: num("spousePenMonthly"),
    spousePenStartAge: num("spousePenStart"),
    spousePenCola: pct(num("spousePenCola")),
    spouseTaxSS: pct(num("spouseTaxSS")),
    spouseTaxPension: pct(num("spouseTaxPension")),

    // Employment and contributions
    startingSalary: num("salary"),
    salaryGrowth: pct(num("salaryGrowth")),
    pretaxPct: pct(num("pretaxPct")),
    rothPct: pct(num("rothPct")),
    taxablePct: pct(num("taxablePct")),
    matchCap: pct(num("matchCap")),
    matchRate: pct(num("matchRate")),

    // Account balances and returns
    balPre: num("balPre"),
    balRoth: num("balRoth"),
    balSavings: num("balSavings"),
    retPre: pct(num("retPre")),
    retRoth: pct(num("retRoth")),
    rateOfSavings: pct(num("retTax")),

    // Income sources
    ssMonthly: num("ssMonthly"),
    ssCola: pct(num("ssCola")),
    penMonthly: num("penMonthly"),
    penCola: pct(num("penCola")),
    // Tax rates and settings
    filingStatus: $("filingStatus").value,
    useRMD: $("useRMD").checked,
  };

  // Parse withdrawal order
  inputs.order = $("order")
    .value.split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (inputs.order.length === 0) {
    inputs.order = ["savings", "pretax", "roth"];
  }

  // Derived values
  inputs.hasSpouse = inputs.spouseAge > 0;
  inputs.totalWorkingYears = inputs.retireAge - inputs.currentAge;
  inputs.totalLivingYears = inputs.endAge - inputs.currentAge;
  inputs.spendAtRetire =
    inputs.spendingToday *
    compoundedRate(inputs.inflation, inputs.totalWorkingYears);

  if (!validateInputs(inputs)) {
    return null;
  }

  return inputs;
}

/**
 * Validate that the input parameters are valid
 */
function validateInputs(inputs) {
  if (
    inputs.retireAge <= inputs.currentAge ||
    inputs.endAge <= inputs.retireAge
  ) {
    showToast(
      "Invalid Ages",
      "Please ensure: current age < retirement age < plan age.",
      "error"
    );
    return false;
  }
  return true;
}

function resetAll() {
  document
    .querySelectorAll("input")
    .forEach((i) => (i.value = i.defaultValue ?? ""));
  $("order").value = "taxable,pretax,roth";
  $("filingStatus").value = "single";

  // Clear spending override fields
  const grid = document.getElementById("spendingDetailsGrid");
  grid.innerHTML = "";

  // Clear income adjustment fields
  const taxableGrid = document.getElementById("taxableIncomeDetailsGrid");
  taxableGrid.innerHTML = "";
  const taxFreeGrid = document.getElementById("taxFreeIncomeDetailsGrid");
  taxFreeGrid.innerHTML = "";

  $("rows").innerHTML = "";
  $("kpiAge").textContent = "—";
  $("kpiEndBal").textContent = "—";
  $("kpiDraw").textContent = "—";
  $("kpiTax").textContent = "—";
  drawChart([]);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // First render
  initializeHelpIcons();
  loadExample();
  calc();
});

/**
 * Generate final summary, write table, and update KPIs
 */
function generateOutputAndSummary(inputs, rows) {
  // Write table
  const tbody = $("rows");
  tbody.innerHTML = calculations
    .map(
      (calculation, index) => `
        <tr>
        <td class="neutral">${calculation.year}</td>
        <td class="neutral">${calculation.age}</td>
        
        <!-- THE NEED -->
        <td class="outgoing">${
          calculation.spend ? fmt(calculation.spend) : ""
        }</td>
        
        <!-- NET INCOME (what you actually receive) -->
        <td class="income">${
          calculation.ss
            ? `<span class="ss-link" onclick="showSsBreakdown(${index})">${fmt(
                calculation.ss
              )}</span>`
            : ""
        }</td>
        <td class="income">${calculation.pen ? fmt(calculation.pen) : ""}</td>
        <td class="income">${
          calculation.spouseSs ? fmt(calculation.spouseSs) : ""
        }</td>
        <td class="income">${
          calculation.spousePen ? fmt(calculation.spousePen) : ""
        }</td>
        <td class="income">${
          calculation.withdrawals.retirementAccountNet
            ? `<span class="withdrawal-net-link" onclick="showWithdrawalNetBreakdown(${index})">${fmt(
                calculation.withdrawals.retirementAccountNet
              )}</span>`
            : ""
        }</td>
        <td class="income">${
          calculation.withdrawals.savingsRothNet
            ? fmt(calculation.withdrawals.savingsRothNet)
            : ""
        }</td>
        <td class="income">${
          calculation.totalNetIncome
            ? calculation.age >= inputs.retireAge
              ? `<span class="ss-link" onclick="showTotalNetBreakdown(${index})">${fmt(
                  calculation.totalNetIncome
                )}</span>`
              : fmt(calculation.totalNetIncome)
            : ""
        }</td>
        
        <!-- GROSS INCOME (before taxes/deductions) -->
        <td class="income">${
          calculation.salary ? fmt(calculation.salary) : ""
        }</td>
        <td class="income">${
          calculation.taxableInterest ? fmt(calculation.taxableInterest) : ""
        }</td>
        <td class="income">${
          calculation.ss ? fmt(calculation.ssGross || 0) : ""
        }</td>
        <td class="income">${
          calculation.pen ? fmt(calculation.penGross || 0) : ""
        }</td>
        <td class="income">${
          calculation.spouseSs ? fmt(calculation.spouseSsGross || 0) : ""
        }</td>
        <td class="income">${
          calculation.spousePen ? fmt(calculation.spousePenGross || 0) : ""
        }</td>
        <td class="income">${
          calculation.withdrawals.retirementAccountGross
            ? fmt(calculation.withdrawals.retirementAccountGross)
            : ""
        }</td>
        <td class="income">${
          calculation.totalGrossIncome ? fmt(calculation.totalGrossIncome) : ""
        }</td>
        
        <!-- THE BREAKDOWN -->
        <td class="income">${
          calculation.age >= inputs.retireAge
            ? `<span class="taxable-income-link" onclick="showTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
                calculation.taxableIncome || 0
              )}</span>`
            : calculation.taxableIncome
            ? fmt(calculation.taxableIncome)
            : ""
        }</td>
        <td class="income">${
          calculation.nonTaxableIncome
            ? calculation.age >= inputs.retireAge
              ? `<span class="non-taxable-income-link" onclick="showNonTaxableIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
                  calculation.nonTaxableIncome
                )}</span>`
              : fmt(calculation.nonTaxableIncome)
            : ""
        }</td>
        <td class="income">${
          calculation.provisionalIncome && calculation.provisionalIncome > 0
            ? `<span class="provisional-income-link" onclick="showProvisionalIncomeBreakdown(${index})" title="Click to see breakdown">${fmt(
                calculation.provisionalIncome
              )}</span>`
            : calculation.provisionalIncome
            ? fmt(calculation.provisionalIncome)
            : ""
        }</td>
        
        <!-- TAX INFORMATION -->
        <td class="neutral">${
          calculation.standardDeduction
            ? fmt(calculation.standardDeduction)
            : ""
        }</td>
        <td class="neutral">${
          calculation.taxableIncome ? fmt(calculation.taxableIncome) : ""
        }</td>
        <td class="outgoing">${
          calculation.ssTaxes !== undefined && calculation.ssTaxes !== null
            ? fmt(calculation.ssTaxes)
            : ""
        }</td>
        <td class="outgoing">${
          calculation.otherTaxes ? fmt(calculation.otherTaxes) : ""
        }</td>
        <td class="outgoing">${
          calculation.age >= inputs.retireAge
            ? `<span class="total-taxes-link" onclick="showTotalTaxesBreakdown(${index})" title="Click to see breakdown">${fmt(
                calculation.taxes || 0
              )}</span>`
            : calculation.taxes
            ? fmt(calculation.taxes)
            : ""
        }</td>
        <td class="neutral">${
          calculation.effectiveTaxRate
            ? calculation.effectiveTaxRate.toFixed(1) + "%"
            : ""
        }</td>
        
        <!-- THE RESULT -->
        <td class="neutral">${
          calculation.balSavings
            ? `<span class="savings-balance-link" onclick="showSavingsBreakdown(${index})" title="Click to see savings changes">${fmt(
                calculation.balSavings
              )}</span>`
            : ""
        }</td>
        <td class="neutral">${fmt(calculation.bal.balPre)}</td>
        <td class="neutral">${fmt(calculation.bal.balRoth)}</td>
        <td class="neutral">${fmt(calculation.bal.total)}</td>
        </tr>`
    )
    .join("");

  // KPIs
  const calculation = calculations[calculations.length - 1];
  // Find the last age where there's still money, or endAge if money lasts throughout
  const fundedTo =
    calculation.total > 0
      ? inputs.endAge
      : calculations.reduce(
          (lastGoodAge, r) => (r.total > 0 ? r.age : lastGoodAge),
          inputs.currentAge
        );
  $("kpiAge").innerHTML = `${fundedTo} <span class="pill ${
    fundedTo >= inputs.endAge ? "ok" : "alert"
  }">${fundedTo >= inputs.endAge ? "Fully funded" : "Shortfall"}</span>`;
  $("kpiEndBal").textContent = fmt(Math.max(0, calculation.total));
  $("kpiDraw").textContent = `${inputs.retireAge}`;
  $("kpiTax").textContent = fmt(
    inputs.balPre + inputs.balRoth + inputs.balSavings
  );

  // Chart (total balance)
  drawChart(
    calculations.map((calculation) => ({
      x: calculation.year,
      y: calculation.total,
      age: calculation.age,
    }))
  );

  // Save rows for export
  window.__rows = rows;
}

function updateTaxFreeIncomeFieldsDisplayMode() {
  const useCurrentYear = $("useTaxFreeCurrentYearValues").checked;
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = document.getElementById(`taxFreeIncome_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToIncomeValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "0";

      // Clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  calc();
}

function loadExample() {
  const ex = {
    currentAge: 60,
    retireAge: 62,
    endAge: 90,
    inflation: 0.0,
    spendingToday: 100000,
    spendingDecline: 0.0,
    spouseAge: 56,
    spouseRetireAge: 62,
    spouseSsMonthly: 1000,
    spouseSsStartAge: 62,
    spouseSsCola: 0.0,
    spousePenMonthly: 500,
    spousePenStartAge: 65,
    spousePenCola: 0,
    spouseTaxSS: 10,
    spouseTaxPension: 20,
    salary: 174500,
    salaryGrowth: 2.0,
    pretaxPct: 0,
    rothPct: 0,
    taxablePct: 35,
    matchCap: 0,
    matchRate: 0,
    balPre: 600000,
    balRoth: 0,
    balSavings: 500000,
    retPre: 3.0,
    retRoth: 0.0,
    retTax: 3.0,
    ssMonthly: 2500,
    ssStart: 62,
    ssCola: 2.5,
    penMonthly: 3500,
    penStart: 65,
    penCola: 0,
    order: "savings,pretax,roth",
    filingStatus: FILING_STATUS.MARRIED_FILING_JOINTLY,
    useRMD: true,
  };
  // const ex = {
  //   currentAge: 60,
  //   retireAge: 62,
  //   endAge: 90,
  //   inflation: 2.5,
  //   spendingToday: 95000,
  //   spendingDecline: 1.0,
  //   spouseAge: 56,
  //   spouseRetireAge: 62,
  //   spouseSsMonthly: 1000,
  //   spouseSsStart: 62,
  //   spouseSsCola: 0.0,
  //   spousePenMonthly: 500,
  //   spousePenStart: 65,
  //   spousePenCola: 0,
  //   spouseTaxSS: 10,
  //   spouseTaxPension: 20,
  //   salary: 174500,
  //   salaryGrowth: 2.0,
  //   pretaxPct: 0,
  //   rothPct: 0,
  //   taxablePct: 35,
  //   matchCap: 0,
  //   matchRate: 0,
  //   balPre: 600000,
  //   balRoth: 0,
  //   balSavings: 500000,
  //   retPre: 3.0,
  //   retRoth: 0.0,
  //   retTax: 3.0,
  //   ssMonthly: 2500,
  //   ssStart: 62,
  //   ssCola: 2.5,
  //   penMonthly: 3500,
  //   penStart: 65,
  //   penCola: 0,
  //   taxPre: 15,
  //   taxTaxable: 0,
  //   taxRoth: 0,
  //   taxSS: 10,
  //   taxPension: 15,
  //   order: "taxable,pretax,roth",
  //   filingStatus: "married",
  //   useRMD: true,
  // };
  for (const [k, v] of Object.entries(ex)) {
    if ($(k)) $(k).value = v;
  }
}

// Annual Spending Details Functions
function regenerateSpendingFields() {
  const retireAge = num("retireAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (retireAge <= 0 || endAge <= retireAge) {
    return;
  }

  const grid = $("spendingDetailsGrid");
  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each retirement year
  for (let age = retireAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="spending_${age}">Age ${age} spending ($)</label>
        <input id="spending_${age}" type="number" step="1000" placeholder="Auto" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`spending_${age}`);
    field.addEventListener("blur", (event) =>
      handleSpendingFieldChange(age, event)
    );
  }
}

function getSpendingOverride(age) {
  const field = $(`spending_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = $("useCurrentYearValues").checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(
          Number(storedCurrentYearValue),
          age
        );
        // console.log(`  Using stored current year value ${storedCurrentYearValue} → inflated ${inflatedValue}`);
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToSpendingValue(fieldValue, age);
        // console.log(`  Using field value as current year ${fieldValue} → inflated ${inflatedValue}`);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      // console.log(`  Using field value as future dollars: ${fieldValue}`);
      return fieldValue;
    }
  }
  // console.log(`getSpendingOverride(${age}): No override (field empty or invalid)`);
  return null; // No override specified
}

function setSpendingFieldValue(age) {
  const field = $(`spending_${age}`);
  if (field) {
    field.placeholder = `Auto`;
  }
}

function applyInflationToSpendingValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;
  const currentAge = parseInt($("currentAge").value) || 0;
  const yearsFromNow = targetAge - currentAge;
  const inflationRate = parseFloat($("inflation").value) / 100 || 0.025;
  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}

function handleSpendingFieldChange(age, event) {
  const useCurrentYear = $("useCurrentYearValues").checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    // The user sees what they typed, but we store it for inflation calculation
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToSpendingValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

function updateSpendingFieldsDisplayMode() {
  const useCurrentYear = $("useCurrentYearValues").checked;
  const retireAge = num("retireAge");
  const endAge = num("endAge");

  if (retireAge <= 0 || endAge <= retireAge) return;

  for (let age = retireAge; age <= endAge; age++) {
    const field = $(`spending_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        // When switching to current year mode, assume the current field value
        // is already in current year dollars (user entered it as such)
        // Store it as the current year value without conversion
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToSpendingValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "Future $";

      // Don't change the field value - let the user keep what they typed
      // Just clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  calc();
}

// Taxable Income Adjustments Functions
function regenerateTaxableIncomeFields() {
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = $("taxableIncomeDetailsGrid");
  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each year from current age to end age
  for (let age = currentAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="taxableIncome_${age}">Age ${age} taxable income ($)</label>
        <input id="taxableIncome_${age}" type="number" step="1000" placeholder="0" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`taxableIncome_${age}`);
    field.addEventListener("blur", (event) =>
      handleTaxableIncomeFieldChange(age, event)
    );
  }
}

function getTaxableIncomeOverride(age) {
  const field = $(`taxableIncome_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = $("useTaxableCurrentYearValues").checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      return fieldValue;
    }
  }
  return 0; // Default to 0 if no override specified
}

function handleTaxableIncomeFieldChange(age, event) {
  const useCurrentYear = $("useTaxableCurrentYearValues").checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

function updateTaxableIncomeFieldsDisplayMode() {
  const useCurrentYear = $("useTaxableCurrentYearValues").checked;
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  if (currentAge <= 0 || endAge <= currentAge) return;

  for (let age = currentAge; age <= endAge; age++) {
    const field = $(`taxableIncome_${age}`);
    if (!field) continue;

    const currentValue = parseFloat(field.value) || 0;
    const storedCurrentYearValue =
      parseFloat(field.getAttribute("data-current-year-value")) || 0;

    if (useCurrentYear) {
      // Switch to current year mode
      field.placeholder = "Current year $";

      if (currentValue > 0 && !storedCurrentYearValue) {
        field.setAttribute("data-current-year-value", currentValue);
      }

      // Update tooltip to show inflation calculation
      if (field.value && !isNaN(field.value)) {
        const displayValue = parseFloat(field.value);
        const inflatedValue = applyInflationToIncomeValue(displayValue, age);
        field.setAttribute(
          "title",
          `Current year value: $${displayValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
        );
      }
    } else {
      // Switch to inflated mode
      field.placeholder = "0";

      // Clear the stored current year value and tooltips
      field.removeAttribute("data-current-year-value");
      field.removeAttribute("title");
    }
  }

  calc();
}

// Tax-free Income Adjustments Functions
function regenerateTaxFreeIncomeFields() {
  const currentAge = num("currentAge");
  const endAge = num("endAge");

  // Only generate if ages are valid
  if (currentAge <= 0 || endAge <= currentAge) {
    return;
  }

  const grid = $("taxFreeIncomeDetailsGrid");
  grid.innerHTML = ""; // Clear existing fields

  // Generate input fields for each year from current age to end age
  for (let age = currentAge; age <= endAge; age++) {
    const div = document.createElement("div");
    div.innerHTML = `
        <label for="taxFreeIncome_${age}">Age ${age} tax-free income ($)</label>
        <input id="taxFreeIncome_${age}" type="number" step="1000" placeholder="0" />
    `;
    grid.appendChild(div);

    // Add event listener for inflation adjustment
    const field = $(`taxFreeIncome_${age}`);
    field.addEventListener("blur", (event) =>
      handleTaxFreeIncomeFieldChange(age, event)
    );
  }
}

function getTaxFreeIncomeOverride(age) {
  const field = $(`taxFreeIncome_${age}`);
  if (field && field.value && !isNaN(field.value)) {
    const useCurrentYear = $("useTaxFreeCurrentYearValues").checked;
    const fieldValue = Number(field.value);

    if (useCurrentYear) {
      // If in current year mode, check if we have a stored current year value
      const storedCurrentYearValue = field.getAttribute(
        "data-current-year-value"
      );
      if (storedCurrentYearValue && !isNaN(storedCurrentYearValue)) {
        // Use the stored current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(
          Number(storedCurrentYearValue),
          age
        );
        return inflatedValue;
      } else {
        // Treat the field value as current year value and apply inflation
        const inflatedValue = applyInflationToIncomeValue(fieldValue, age);
        return inflatedValue;
      }
    } else {
      // Return the field value as-is (already in future dollars)
      return fieldValue;
    }
  }
  return 0; // Default to 0 if no override specified
}

function handleTaxFreeIncomeFieldChange(age, event) {
  const useCurrentYear = $("useTaxFreeCurrentYearValues").checked;
  const inputValue = parseFloat(event.target.value) || 0;

  if (useCurrentYear && inputValue > 0) {
    // Store the current year value but don't change the field value
    event.target.setAttribute("data-current-year-value", inputValue);

    // Calculate and show what the inflated value would be in the tooltip
    const inflatedValue = applyInflationToIncomeValue(inputValue, age);
    event.target.setAttribute(
      "title",
      `Current year value: $${inputValue.toLocaleString()} → Inflated to age ${age}: $${inflatedValue.toLocaleString()}`
    );
  } else if (!useCurrentYear) {
    // In future dollar mode, clear any stored current year value
    event.target.removeAttribute("data-current-year-value");
    event.target.removeAttribute("title");
  }

  // Trigger recalculation
  calc();
}

// Helper function for income inflation (similar to spending inflation)
function applyInflationToIncomeValue(currentYearValue, targetAge) {
  if (!currentYearValue) return 0;
  const currentAge = parseInt($("currentAge").value) || 0;
  const yearsFromNow = targetAge - currentAge;
  const inflationRate = parseFloat($("inflation").value) / 100 || 0.025;
  return currentYearValue * Math.pow(1 + inflationRate, yearsFromNow);
}
