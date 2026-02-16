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
 * @param {ParentNode} parent
 * @param {string} selector
 * @returns {HTMLDivElement | null}
 * @throws {Error} if element is missing or not a <div>
 */
function div(parent, selector) {
  const el = parent.querySelector(selector);

  if (el && !(el instanceof HTMLDivElement)) {
    throw new Error(`Element '${selector}' is not a <div>`);
  }

  return el;
}

// const $ = (/** @type {string} */ id) => document.getElementById(id);
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
 * @typedef {Object} ChartPoint
 * @property {number} x
 * @property {number} y
 * @property {number} [age]
 */

/** @typedef {ChartPoint[]} ChartSeries */

/**
 * @typedef {HTMLCanvasElement & {
 *   chartData?: {
 *     series: ChartSeries
 *     xTo: (x:number)=>number
 *     yTo: (y:number)=>number
 *     width: number
 *     height: number
 *     dpr: number
 *     pad: { l:number, r:number, t:number, b:number }
 *   }
 *   hasContent?: boolean
 *   hasTooltipHandlers?: boolean
 * }} ChartCanvas
 */

/**
 * @typedef {Window & {
 *   __rows?: any[];
 *   jspdf?: { jsPDF: any };
 * }} WindowWithExtras
 */

/**
 * @param {ChartSeries} series
 */
export function drawChart(series) {
  /** @type {ChartCanvas | null} */
  const c = $("chart");
  if (!c) return;

  const ctx = c.getContext("2d");
  if (!ctx) return;

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
    if (!tempCtx) return;

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

    if (!c.parentNode) return;

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

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any[]} series
 * @param {number} width
 * @param {number} height
 * @param {number} dpr
 * @param {ChartCanvas} c
 */
function drawAnimatedChart(ctx, series, width, height, dpr, c) {
  if (!series || !series.length) {
    return;
  }

  // Animation parameters
  const animationDuration = 300; // ms - reduced for snappier animation
  /**
   * @type {number | null}
   */
  let startTime = null;

  // Padding and coordinate calculations (same as static version)
  const pad = { l: 80 * dpr, r: 12 * dpr, t: 12 * dpr, b: 28 * dpr };
  const xs = series.map((/** @type {{ x: any; }} */ p) => p.x);
  const ys = series.map((/** @type {{ y: any; }} */ p) => p.y);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  // const ymin = 0,
  //   ymax = Math.max(...ys) * 1.1;

  const ymin = 0;
  const rawMax = Math.max(...ys) * 1.1;

  const { niceMin, niceMax, increment } = computeNiceYAxis(ymin, rawMax, 5);

  const yTo = (/** @type {number} */ y) =>
    height -
    pad.b -
    ((y - niceMin) / (niceMax - niceMin)) * (height - pad.t - pad.b);


  const xTo = (/** @type {number} */ x) =>
    pad.l + ((x - xmin) / (xmax - xmin)) * (width - pad.l - pad.r);
  // const yTo = (/** @type {number} */ y) =>
  //   height - pad.b - ((y - ymin) / (ymax - ymin)) * (height - pad.t - pad.b);

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
  /**
   * @param {number} currentTime
   */
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
      niceMax,
      increment,
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

/**
 * @param {number} min
 * @param {number} max
 */
function computeNiceYAxis(min, max, targetTicks = 5) {
  const range = max - min;

  if (range <= 0) {
    return {
      niceMin: min,
      niceMax: max,
      increment: 1,
      tickCount: 1,
    };
  }

  // Base magnitude (power of 10)
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));

  // Candidate increments (financial-friendly)
  const candidates = [1, 2, 2.5, 5, 10].map(
    (n) => (n * magnitude) / targetTicks
  );

  // Choose increment closest to target tick count
  let bestIncrement = candidates[0];
  let bestScore = Infinity;

  for (const inc of candidates) {
    const ticks = Math.ceil(range / inc);
    const score = Math.abs(targetTicks - ticks);
    if (score < bestScore) {
      bestScore = score;
      bestIncrement = inc;
    }
  }

  const niceMin = Math.floor(min / bestIncrement) * bestIncrement;
  const niceMax = Math.ceil(max / bestIncrement) * bestIncrement;
  const tickCount = Math.round((niceMax - niceMin) / bestIncrement);

  return {
    niceMin,
    niceMax,
    increment: bestIncrement,
    tickCount,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {number} dpr
 * @param {{ l: any; r: any; t: any; b: any; }} pad
 * @param {{ (x: any): number; (arg0: any): any; }} xTo
 * @param {{ (y: any): number; (arg0: number): any; }} yTo
 * @param {number} niceMax
 * @param {number} increment
 * @param {string | any[]} series
 */
function drawStaticChartElements(
  ctx,
  width,
  height,
  dpr,
  pad,
  xTo,
  yTo,
  niceMax,
  increment,
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
for (let v = 0; v <= niceMax; v += increment) {
  const y = yTo(v);

  ctx.strokeStyle = "rgba(34,48,77,.4)";
  ctx.beginPath();
  ctx.moveTo(pad.l, y);
  ctx.lineTo(width - pad.r, y);
  ctx.stroke();

  if (v === 0) continue;

  ctx.fillStyle = "#7c8db5";
  ctx.font = `${12 * dpr}px system-ui`;
  ctx.textAlign = "right";

  ctx.fillText(v.asWholeDollars(), pad.l - 8 * dpr, y + 4 * dpr);
}

  drawXAxisLabels(ctx, series, xTo, width, height, dpr, pad, 8);

  // // X labels
  // ctx.fillStyle = "#7c8db5";
  // ctx.textAlign = "center";
  // ctx.font = `${11 * dpr}px system-ui`;
  // const years = [
  //   series[0].x,
  //   series[Math.floor(series.length / 2)].x,
  //   series[series.length - 1].x,
  // ];
  // years.forEach((x) => ctx.fillText(String(x), xTo(x), height - 6 * dpr));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string | any[]} series
 * @param {(arg0: any) => number} xTo
 * @param {number} width
 * @param {number} height
 * @param {number} dpr
 * @param {{ l: number; r: number; t: number; b: number }} pad
 * @param {number} desiredCount
 */
function drawXAxisLabels(
  ctx,
  series,
  xTo,
  width,
  height,
  dpr,
  pad,
  desiredCount = 5
) {
  ctx.fillStyle = "#7c8db5";
  ctx.font = `${11 * dpr}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // CRITICAL FIX: use plot width, not canvas width
  const plotWidth = width - pad.l - pad.r;

  const labelWidth = ctx.measureText("0000").width;
  const spacing = labelWidth + 12 * dpr;

  const maxLabels = Math.max(2, Math.floor(plotWidth / spacing));

  const labelCount = Math.min(desiredCount, maxLabels);

  const used = new Set();

  const years = Array.from({ length: labelCount }, (_, i) => {
    const index = Math.round((i * (series.length - 1)) / (labelCount - 1));
    const x = series[index].x;

    if (used.has(x)) return null;
    used.add(x);
    return x;
  }).filter(Boolean);

  years.forEach((x) => {
    ctx.fillText(
      String(x),
      xTo(x), // already includes pad.l
      height - pad.b + 4 * dpr
    );
  });
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {any[]} series
 * @param {{ (x: any): number; (arg0: any): any; }} xTo
 * @param {{ (y: any): number; (arg0: any): any; }} yTo
 * @param {number} dpr
 * @param {number} progress
 */
function drawAnimatedElements(ctx, series, xTo, yTo, dpr, progress) {
  // Create animated series where each point moves from $0 to its final position
  const animatedSeries = series.map(
    (
      /** @type {{ x: any; y: number; age: any; }} */ point,
      /** @type {number} */ index
    ) => {
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
    }
  );

  // Draw animated line
  ctx.strokeStyle = "#6ea8fe";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  animatedSeries.forEach(
    (/** @type {{ x: any; y: any; }} */ p, /** @type {number} */ i) => {
      const X = xTo(p.x),
        Y = yTo(p.y);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
  );
  ctx.stroke();

  // Draw animated points
  ctx.fillStyle = "#6ea8fe";
  animatedSeries.forEach(
    (/** @type {{ x: any; y: any; }} */ p, /** @type {number} */ index) => {
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
    }
  );
}

/**
 * @param {ChartCanvas} c
 */
function setupChartTooltips(c) {
  // Setup mouse event handlers for tooltips (only add once)
  if (!c.hasTooltipHandlers) {
    const tooltip = divById("chartTooltip");
    if (!tooltip) return;

    /**
     * @param {HTMLElement} e
     * @param {string | number} x
     * @param {string | number} y
     * @param {ChartPoint | null} point
     */
    function showTooltip(e, x, y, point) {
      //   if (c.hasTooltipHandlers) return;
      if (!point) return;

      const yearDiv = div(e, ".year");
      const balanceDiv = div(e, ".balance");

      if (!yearDiv || !balanceDiv) return;

      yearDiv.textContent = `Year ${point.x} (Age ${point.age})`;
      balanceDiv.textContent = `Balance: ${point.y.asWholeDollars()}`;

      e.style.left = x + "px";
      e.style.top = y + "px";
      e.classList.add("visible");
    }

    /**
     * @param {HTMLElement} e
     */
    function hideTooltip(e) {
      e.classList.remove("visible");
    }

    /**
     * @param {number} mouseX
     * @param {number} mouseY
     * @return {ChartPoint | null}
     */
    function findNearestPoint(mouseX, mouseY) {
      if (!c.chartData) return null;

      const { series, xTo, yTo, dpr } = c.chartData;
      const threshold = 20 * dpr; // 20px hit area
      let nearest = null;
      let minDistance = threshold;

      series.forEach((/** @type {ChartPoint} */ point) => {
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

    c.addEventListener("mousemove", (/** @param {MouseEvent} e */ e) => {
      if (!c.chartData) return;

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

        showTooltip(tooltip, tooltipX, tooltipY, nearestPoint);
        c.style.cursor = "pointer";
      } else {
        hideTooltip(tooltip);
        c.style.cursor = "default";
      }
    });

    c.addEventListener("mouseleave", () => {
      hideTooltip(tooltip);
      c.style.cursor = "default";
    });

    c.hasTooltipHandlers = true;
  }
}
