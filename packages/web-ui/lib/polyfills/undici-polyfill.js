// undici polyfill for Firebase compatibility
module.exports = {
  Headers: global.Headers || class Headers {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (typeof init[Symbol.iterator] === 'function') {
          for (const [key, value] of init) {
            this.append(key, value);
          }
        } else {
          for (const [key, value] of Object.entries(init)) {
            this.append(key, value);
          }
        }
      }
    }
    
    append(key, value) {
      this._headers.set(key.toLowerCase(), String(value));
    }
    
    get(key) {
      return this._headers.get(key.toLowerCase()) || null;
    }
    
    has(key) {
      return this._headers.has(key.toLowerCase());
    }
    
    set(key, value) {
      this._headers.set(key.toLowerCase(), String(value));
    }
    
    delete(key) {
      this._headers.delete(key.toLowerCase());
    }
    
    entries() {
      return this._headers.entries();
    }
    
    keys() {
      return this._headers.keys();
    }
    
    values() {
      return this._headers.values();
    }
    
    [Symbol.iterator]() {
      return this._headers.entries();
    }
  },
  Request: global.Request || class Request {},
  Response: global.Response || class Response {},
  fetch: global.fetch || (() => Promise.reject(new Error('fetch not available')))
};

// undici polyfill for Next.js compatibility
// This polyfill provides basic fetch functionality without private fields syntax

// Export a minimal undici-compatible interface using standard fetch
const undiciPolyfill = {
  fetch: globalThis.fetch || fetch,
  Agent: class Agent {
    constructor() {
      // Minimal agent implementation
    }
  },
  setGlobalDispatcher: () => {
    // No-op for compatibility
  },
  getGlobalDispatcher: () => {
    return null
  }
}

// Re-export native fetch as default
if (typeof globalThis !== 'undefined' && globalThis.fetch) {
  undiciPolyfill.default = globalThis.fetch
} else if (typeof window !== 'undefined' && window.fetch) {
  undiciPolyfill.default = window.fetch
} else {
  // Fallback for environments without fetch
  undiciPolyfill.default = () => {
    throw new Error('fetch is not available')
  }
}

export default undiciPolyfill
export const { fetch: polyfillFetch, Agent, setGlobalDispatcher, getGlobalDispatcher } = undiciPolyfill 
// This polyfill provides basic fetch functionality without private fields syntax
