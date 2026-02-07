class LabeledInput extends HTMLElement {
  constructor() {
    super();
    /** @type {((event: Event, helpKey: string) => void) | null} */
    this.onHelp = null;
  }

  connectedCallback() {
    console.log("LabeledInput connected");
    const id = this.getAttribute("input-id") ?? "";
    const label = this.getAttribute("label") ?? "";
    const help =
      this.getAttribute("show-help") != null ||
      this.getAttribute("help") != null;
    const type = this.getAttribute("type") ?? "number";
    const step = this.getAttribute("step");
    const value = this.getAttribute("value");

    /** @type {HTMLInputElement | HTMLSelectElement} */
    let control;

    if (type === "select") {
      control = document.createElement("select");
      control.id = id;

      // Move declarative <option>s into the select
      this.querySelectorAll("option").forEach((opt) => {
        control.appendChild(opt);
      });

      if (value !== null) {
        control.value = value;
      }
    } else {
      control = document.createElement("input");
      control.id = id;
      control.type = type;
      if (step) control.step = step;
      if (value !== null) control.value = value;
    }

    this.innerHTML = `
      <div>
        <div class="label-with-help">
          <label for="${id}">${label}</label>
          <svg class="help-icon"
               role="button"
               tabindex="0"
               aria-label="Help">
            <use href="#icon-help"></use>
          </svg>
        </div>
      </div>
    `;

    this.querySelector("div")?.appendChild(control);

    if (help) {
      const icon = this.querySelector(".help-icon");
      if (icon) {
        icon.addEventListener("click", (e) => {
          if (typeof this.onHelp === "function") {
            this.onHelp(e, id);
          }
        });
      }
    }
  }
}

customElements.define("labeled-input", LabeledInput);

export { LabeledInput };
