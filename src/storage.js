/**
 * window.storage polyfill
 * Mirrors the Claude artifact storage API using localStorage.
 * The main PegasusTrack component calls window.storage.get/set/delete/list
 * and this shim makes those calls work locally without any changes to the
 * component itself.
 */

window.storage = {
  /**
   * Get a value by key.
   * Returns { key, value, shared } or throws if not found.
   */
  get(key, shared = false) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return Promise.reject(new Error(`Key not found: ${key}`));
    }
    return Promise.resolve({ key, value: raw, shared });
  },

  /**
   * Set a value by key.
   * Returns { key, value, shared } or null on failure.
   */
  set(key, value, shared = false) {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve({ key, value, shared });
    } catch (e) {
      console.error('[storage] set failed:', e);
      return Promise.resolve(null);
    }
  },

  /**
   * Delete a value by key.
   * Returns { key, deleted, shared }.
   */
  delete(key, shared = false) {
    localStorage.removeItem(key);
    return Promise.resolve({ key, deleted: true, shared });
  },

  /**
   * List keys, optionally filtered by prefix.
   * Returns { keys, prefix, shared }.
   */
  list(prefix = '', shared = false) {
    const all = Object.keys(localStorage);
    const keys = prefix ? all.filter(k => k.startsWith(prefix)) : all;
    return Promise.resolve({ keys, prefix, shared });
  },
};
