import type { Label } from '../detector/types';
import { HISTORY_STORE, tx } from './db';

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

export class IndexedDbStorage implements Storage {
  async add(entry: Omit<HistoryEntry, 'id'>): Promise<HistoryEntry> {
    const full: HistoryEntry = { ...entry, id: crypto.randomUUID() };
    await tx(HISTORY_STORE, 'readwrite', (s) => s.put(full));
    return full;
  }

  async all(): Promise<HistoryEntry[]> {
    const rows = await tx<HistoryEntry[]>(HISTORY_STORE, 'readonly', (s) => s.getAll());
    return rows.sort((a, b) => b.at - a.at);
  }

  async remove(id: string): Promise<void> {
    await tx(HISTORY_STORE, 'readwrite', (s) => s.delete(id));
  }
}
