/**
 * @typedef {Object} PensionAnnuity
 * @property {string} id
 * @property {"subject"|"partner"} owner
 * @property {string} name
 * @property {number} startAge
 * @property {number} monthlyAmount
 * @property {number} withholdingRate
 * @property {number} survivorshipPercent
 */

/**
 * Input type used when creating a new Pension/Annuity
 * Storage layer assigns the id.
 *
 * @typedef {Object} PensionAnnuityCreate
 * @property {"subject"|"partner"} owner
 * @property {string} name
 * @property {number} startAge
 * @property {number} monthlyAmount
 * @property {number} withholdingRate
 * @property {number} survivorshipPercent
 */

const KEY = "pensionAnnuities";

export class PensionAnnuityStorage {
  /**
   * @param {Object<string, any>} persistedInputs
   * @param {() => void} saveCallback
   */
  constructor(persistedInputs, saveCallback) {
    /** @private */
    this._persistedInputs = persistedInputs;

    /** @private */
    this._save = saveCallback;
  }

  /**
   * @returns {PensionAnnuity[]}
   */
  getAll() {
    const list = this._persistedInputs[KEY];

    if (!list) return [];

    return list;
  }

  /**
   * @param {PensionAnnuity[]} list
   */
  setAll(list) {
    this._persistedInputs[KEY] = list;

    this._save();
  }

  /**
   * Creates and persists new entity
   * Storage layer owns identity creation
   *
   * @param {PensionAnnuityCreate} item
   * @returns {PensionAnnuity}
   */
  create(item) {
    const list = this.getAll();

  const entity = /** @type {PensionAnnuity} */ ({
    ...item,
    id: crypto.randomUUID(),
  });

    entity.id = crypto.randomUUID();

    list.push(entity);

    this.setAll(list);

    return entity;
  }

  /**
   * @param {string} id
   */
  delete(id) {
    const list = this.getAll().filter(function (x) {
      return x.id !== id;
    });

    this.setAll(list);
  }

  /**
   * @param {PensionAnnuity} updated
   */
  update(updated) {
    const list = this.getAll().map(function (x) {
      if (x.id === updated.id) return updated;

      return x;
    });

    this.setAll(list);
  }

  /**
   * @param {string} id
   * @returns {PensionAnnuity|null}
   */
  getById(id) {
    const list = this.getAll();

    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }

    return null;
  }
}
