class LabeledInput extends HTMLElement {
  constructor() {
    super();
    /** @type {((event: Event, helpKey: string) => void) | null} */
    this.onHelp = null;
  }

  connectedCallback() {
    console.log("LabeledInput connected");
    const id = this.getAttribute("input-id");
    const label = this.getAttribute("label") ?? "";
    const help = this.getAttribute("help");
    const type = this.getAttribute("type") ?? "number";
    const step = this.getAttribute("step");
    const value = this.getAttribute("value");

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
        <input id="${id}"
               type="${type}"
               ${step ? `step="${step}"` : ""}
               ${value !== null ? `value="${value}"` : ""} />
      </div>
    `;

    if (help) {
      const icon = this.querySelector(".help-icon");
      if (icon) {
        icon.addEventListener("click", (e) => {
          if (typeof this.onHelp === "function") {
            this.onHelp(e, help);
          }
        });
      }
    }
  }
}

customElements.define("labeled-input", LabeledInput);

export { LabeledInput };
