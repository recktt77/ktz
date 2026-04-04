export function appendToRingBuffer<T>(
  buffer: T[],
  items: T | T[],
  maxSize: number,
): T[] {
  const toAdd = Array.isArray(items) ? items : [items];
  const next = buffer.concat(toAdd);
  return next.length > maxSize ? next.slice(next.length - maxSize) : next;
}
