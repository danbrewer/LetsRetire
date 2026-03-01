/**
 * @typedef {Object} WithdrawalLimit
 * @property {string} id
 * @property {string} name
 * @property {number} year
 * @property {number} amount
 */

/**
 * Input type used when creating a new Withdrawal Limit
 * Storage layer assigns the id.
 *
 * @typedef {Object} WithdrawalLimitCreate
 * @property {string} name
 * @property {number} year
 * @property {number} amount
 */

/**
 * @typedef {Object} WithdrawalLimitBreakdown
 * @property {string} name
 * @property {number} year
 * @property {number} amount
 */

const KEY = "withdrawalLimits";

export class WithdrawalLimitStorage {
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
   * @returns {WithdrawalLimit[]}
   */
  getAll() {
    const list = this._persistedInputs[KEY];

    if (!list) return [];

    return list;
  }

  /**
   * @param {WithdrawalLimit[]} list
   */
  setAll(list) {
    this._persistedInputs[KEY] = list;

    this._save();
  }

  /**
   * Creates and persists new entity
   * Storage layer owns identity creation
   *
   * @param {WithdrawalLimitCreate} item
   * @returns {WithdrawalLimit}
   */
  create(item) {
    const list = this.getAll();

  const entity = /** @type {WithdrawalLimit} */ ({
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
   * @param {WithdrawalLimit} updated
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
   * @returns {WithdrawalLimit|null}
   */
  getById(id) {
    const list = this.getAll();

    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }

    return null;
  }
}
