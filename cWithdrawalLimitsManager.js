import { WithdrawalLimitStorage } from "./cWithdrawalLimitsStorage.js";

/**
 * @typedef {import("./cWithdrawalLimitsStorage.js").WithdrawalLimit} WithdrawalLimit
 * @typedef {import("./cWithdrawalLimitsStorage.js").WithdrawalLimitCreate} WithdrawalLimitCreate
 */


export class WithdrawalLimitManager {
  /**
   * @param {WithdrawalLimitStorage} storage
   */
  constructor(storage) {
    this._storage = storage;
  }

  /**
   * @returns {WithdrawalLimit[]}
   */
  getAll() {
    return this._storage.getAll();
  }

  /**
   * @param {WithdrawalLimitCreate} item
   * @returns {WithdrawalLimit}
   */
  add(item) {
    return this._storage.create(item);
  }

  /**
   * @param {string} id
   */
  delete(id) {
    this._storage.delete(id);
  }

  /**
   * @param {WithdrawalLimit} item
   */
  update(item) {
    this._storage.update(item);
  }

  /**
   * @param {string} id
   */
  getById(id) {
    return this._storage.getById(id);
  }
}
