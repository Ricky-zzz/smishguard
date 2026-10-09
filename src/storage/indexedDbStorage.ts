import type { Label } from '../detector/types';

export interface HistoryEntry {
  id: string;
  text: string;
  label: Label;
  confidence: number;
  at: number;
}

export interface Storage {
  add(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry>;
  all(): Promise<HistoryEntry[]>;
  remove(id: string): Promise<void>;
}

const DB_NAME = 'smishguard';
const STORE = 'history';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB error'));
      })
  );
}

export class IndexedDbStorage implements Storage {
  async add(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> {
    const full: HistoryEntry = { ...entry, id: crypto.randomUUID() };
    await tx('readwrite', (s) => s.put(full));
    return full;
  }

  async all(): Promise<HistoryEntry[]> {
    const rows = await tx<HistoryEntry[]>('readonly', (s) => s.getAll());
    return rows.sort((a, b) => b.at - a.at);
  }

  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
  }
}
