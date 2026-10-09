import type { Label } from '../detector/types';
import { CORRECTION_STORE, tx } from './db';

export interface Correction {
  id: string;
  text: string;
  label: Label;
  at: number;
}

const SIMILARITY_THRESHOLD = 0.8;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();
}

function tokens(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export class CorrectionStore {
  async add(text: string, label: Label): Promise<Correction> {
    const entry: Correction = { id: crypto.randomUUID(), text, label, at: Date.now() };
    await tx(CORRECTION_STORE, 'readwrite', (s) => s.put(entry));
    return entry;
  }

  async all(): Promise<Correction[]> {
    const rows = await tx<Correction[]>(CORRECTION_STORE, 'readonly', (s) => s.getAll());
    return rows.sort((a, b) => b.at - a.at);
  }

  async findMatch(text: string): Promise<Correction | null> {
    const rows = await this.all();
    const target = tokens(text);
    let best: Correction | null = null;
    let bestScore = 0;
    for (const row of rows) {
      if (normalize(row.text) === normalize(text)) return row;
      const score = jaccard(target, tokens(row.text));
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    return bestScore >= SIMILARITY_THRESHOLD ? best : null;
  }

  async remove(id: string): Promise<void> {
    await tx(CORRECTION_STORE, 'readwrite', (s) => s.delete(id));
  }

  async clear(): Promise<void> {
    await tx(CORRECTION_STORE, 'readwrite', (s) => s.clear());
  }
}
