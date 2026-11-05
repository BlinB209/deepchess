function createEmbeddedSearchWorker() {
  if (typeof Worker === 'undefined' || typeof SEARCH_WORKER_SOURCE !== 'string') {
    throw new Error('Background chess worker is unavailable');
  }
  const url = URL.createObjectURL(new Blob([SEARCH_WORKER_SOURCE], { type: 'text/javascript' }));
  try {
    return { worker: new Worker(url), release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export class SearchClient {
  constructor(createWorker = createEmbeddedSearchWorker) {
    this.createWorker = createWorker;
    this.pending = new Map();
    this.sequence = 0;
    this.connection = null;
  }

  request(kind, payload) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.connection) {
          const connection = this.createWorker();
          this.connection = connection;
          connection.worker.onmessage = ({ data }) => {
            if (this.connection !== connection) return;
            const pending = this.pending.get(data.id);
            if (!pending) return;
            clearTimeout(pending.timeout);
            this.pending.delete(data.id);
            if (data.error) pending.reject(new Error(data.error));
            else pending.resolve(data.result);
          };
          connection.worker.onerror = () => {
            if (this.connection === connection) this.cancel(new Error('Background chess search failed'));
          };
          connection.worker.onmessageerror = connection.worker.onerror;
        }
        const id = ++this.sequence;
        const timeout = setTimeout(() => this.cancel(new Error('Background chess search timed out')), 20000);
        this.pending.set(id, { resolve, reject, timeout });
        try { this.connection.worker.postMessage({ ...payload, kind, id }); }
        catch (error) { this.cancel(error); }
      } catch (error) { reject(error); }
    });
  }

  cancel(reason) {
    const error = reason || Object.assign(new Error('Search cancelled'), { name: 'AbortError' });
    const connection = this.connection;
    this.connection = null;
    if (connection) {
      connection.worker.terminate();
      connection.release?.();
    }
    for (const { reject, timeout } of this.pending.values()) {
      clearTimeout(timeout);
      reject(error);
    }
    this.pending.clear();
  }
}
