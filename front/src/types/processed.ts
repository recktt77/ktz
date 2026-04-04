import type { KZ8ATelemetry, KZ8AProcessed } from './kz8a';
import type { TE33ATelemetry, TE33AProcessed } from './te33a';

// ──── Discriminated unions ────

export type LocomotiveTelemetry = KZ8ATelemetry | TE33ATelemetry;
export type LocomotiveProcessed = KZ8AProcessed | TE33AProcessed;

// ──── Type guards ────

export function isKZ8ATelemetry(t: LocomotiveTelemetry): t is KZ8ATelemetry {
  return t.locomotive_model === 'KZ8A';
}

export function isTE33ATelemetry(t: LocomotiveTelemetry): t is TE33ATelemetry {
  return t.locomotive_model === 'TE33A';
}

export function isKZ8AProcessed(p: LocomotiveProcessed): p is KZ8AProcessed {
  return p.locomotive_model === 'KZ8A';
}

export function isTE33AProcessed(p: LocomotiveProcessed): p is TE33AProcessed {
  return p.locomotive_model === 'TE33A';
}
