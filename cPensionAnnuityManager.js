import { PensionAnnuityStorage } from "./cPensionAnnuityStorage.js";

/**
 * @typedef {import("./cPensionAnnuityStorage.js").PensionAnnuity} PensionAnnuity
 * @typedef {import("./cPensionAnnuityStorage.js").PensionAnnuityCreate} PensionAnnuityCreate
 */


export class PensionAnnuityManager {
  /**
   * @param {PensionAnnuityStorage} storage
   */
  constructor(storage) {
    this._storage = storage;
  }

  /**
   * @returns {PensionAnnuity[]}
   */
  getAll() {
    return this._storage.getAll();
  }

  /**
   * @param {PensionAnnuityCreate} item
   * @returns {PensionAnnuity}
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
   * @param {PensionAnnuity} item
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
