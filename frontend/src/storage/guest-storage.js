import { openDB } from 'idb';
const key = 'pilihanku.guest.v1';
const database = () =>
  openDB('pilihanku-local', 1, {
    upgrade(db) {
      db.createObjectStore('drafts');
    },
  });
export function expired(record, now = Date.now()) {
  return !record || record.version !== 1 || now >= record.expiresAt;
}
export async function loadGuest(mode) {
  let record;
  if (mode === 'personal') {
    const db = await database();
    record = await db.get('drafts', key);
    db.close();
  } else record = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (expired(record)) {
    await removeGuest(mode);
    return null;
  }
  return record;
}
export async function saveGuest(mode, data, firstSavedAt = Date.now()) {
  const record = { version: 1, firstSavedAt, expiresAt: firstSavedAt + 30 * 86400000, data };
  if (mode === 'personal') {
    const db = await database();
    await db.put('drafts', record, key);
    db.close();
  } else sessionStorage.setItem(key, JSON.stringify(record));
  return record;
}
export async function removeGuest(mode) {
  if (mode === 'personal') {
    const db = await database();
    await db.delete('drafts', key);
    db.close();
  } else sessionStorage.removeItem(key);
}
