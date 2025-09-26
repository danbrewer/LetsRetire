Number.prototype.round = function (decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(this * factor) / factor;
};

Number.prototype.asCurrency = function () {
  return this.round(2);
};

Object.defineProperty(Object.prototype, "dump", {
  value: function (title, depth = 0) {
    const indent = "  ".repeat(depth);

    if (depth === 0) {
      const header = title || this._description || "Object Dump";
      console.log(`${header}:`);
    }

    if (Array.isArray(this)) {
      this.forEach((val, i) => {
        if (val && typeof val === "object") {
          console.log(`${indent}- [${i}]`);
          val.dump(null, depth + 1);
        } else {
          console.log(`${indent}- [${i}] ${val}`);
        }
      });
      return;
    }

    for (const [key, value] of Object.entries(this)) {
      if (typeof value === "function") {
        try {
          console.log(`${indent}- ${key.padEnd(25)} ${value.call(this)}`);
        } catch {
          console.log(`${indent}- ${key.padEnd(25)} [function]`);
        }
      } else if (value && typeof value === "object") {
        console.log(`${indent}- ${key}:`);
        value.dump(null, depth + 1);
      } else if (key === "_description") {
        // Skip _description at all levels
      } else {
        console.log(`${indent}- ${key.padEnd(25)} ${value}`);
      }
    }
  },
  enumerable: false,
});

function dedent(strings, ...values) {
  const raw = String.raw({ raw: strings }, ...values);

  // Find minimum indentation
  const lines = raw.split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const indent = Math.min(
    ...nonEmpty.map((line) => line.match(/^(\s*)/)[0].length)
  );

  // Remove that indentation from every line
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    .trim();
}
