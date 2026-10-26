import { createRequire } from 'node:module';
import { constants, openSync, closeSync, chmodSync, mkdirSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, basename, resolve, join } from 'node:path';

const require = createRequire(import.meta.url);
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_FILE_BYTES = 4 * MAX_PAYLOAD_BYTES;
const APPLICATION_ID = 0x4f434541; // OCEA; refuse unrelated SQLite files.
const privateKeys = new Set(['resumetoken', 'admissionnonce', 'resumenonce', 'capability', 'token']);
const fail = code => { throw new Error('room_store_' + code); };

// The authority validates room relationships and deadlines. This boundary only
// accepts bounded, ordinary JSON, its format/version, and no plaintext secrets.
function encode(document, contentVersion) {
  if (!document || Array.isArray(document) || document.schema !== 1 || document.contentVersion !== contentVersion) fail('document_version');
  const ancestors = new Set(); let count = 0;
  function visit(value, depth) {
    if (++count > 100000 || depth > 32) fail('document_bounds');
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail('invalid_json'); return; }
    if (typeof value !== 'object' || ancestors.has(value)) fail('invalid_json');
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) fail('invalid_json');
    ancestors.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') fail('invalid_json');
      if (Array.isArray(value) && key === 'length') continue;
      if (privateKeys.has(key.toLowerCase())) fail('private_capability');
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (!property.enumerable || !Object.hasOwn(property, 'value')) fail('invalid_json');
      visit(property.value, depth + 1);
    }
    ancestors.delete(value);
  }
  visit(document, 0);
  const payload = JSON.stringify(document);
  if (Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES) fail('document_bounds');
  return payload;
}

// A deployed adapter boundary, not a test state-export API. EXCLUSIVE ownership
// lasts until close/process death. SQLite's rollback journal owns atomicity;
// no PID lock, rename race, plaintext token journal or best-effort fallback.
export function openRoomStore({ path, contentVersion } = {}) {
  if (typeof path !== 'string' || !path.trim() || path.includes('\0') || path === ':memory:' ||
    typeof contentVersion !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(contentVersion)) fail('configuration');
  let database, closed = false, failed = false;
  try {
    const requested = resolve(path), parent = dirname(requested);
    mkdirSync(parent, { recursive: true, mode: 0o700 });
    const filename = join(realpathSync(parent), basename(requested));
    let created = false;
    try {
      const fd = openSync(filename, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL, 0o600);
      closeSync(fd); created = true;
    } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const stat = lstatSync(filename);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
      !created && (stat.size === 0 || stat.size > MAX_FILE_BYTES)) fail('invalid_file');
    chmodSync(filename, 0o600);
    // Loading SQLite is optional: memory-only CLI use does not import the
    // experimental native module or create/lock a file.
    const { DatabaseSync } = require('node:sqlite');
    database = new DatabaseSync(filename, { timeout: 0, allowExtension: false });
    database.exec('PRAGMA trusted_schema=OFF; PRAGMA journal_mode=DELETE; PRAGMA synchronous=EXTRA; PRAGMA fullfsync=ON; PRAGMA locking_mode=EXCLUSIVE; PRAGMA journal_size_limit=4194304;');
    const pragma = name => Object.values(database.prepare('PRAGMA ' + name).get())[0];
    if (pragma('journal_mode') !== 'delete' || pragma('synchronous') !== 3 ||
      pragma('fullfsync') !== 1 || pragma('locking_mode') !== 'exclusive') fail('durability_unavailable');
    const pageSize = pragma('page_size');
    if (!Number.isSafeInteger(pageSize) || pageSize < 512 || pageSize > 65536) fail('invalid_file');
    const maxPages = Math.floor(MAX_FILE_BYTES / pageSize);
    database.exec('PRAGMA max_page_count=' + maxPages);
    if (pragma('page_count') > maxPages || pragma('quick_check(1)') !== 'ok') fail('invalid_file');
    // Explicitly acquire a write lock before listening. Merely setting the
    // locking_mode pragma would only acquire a shared lock on an initial read.
    database.exec('BEGIN EXCLUSIVE');
    if (created) {
      database.exec('PRAGMA application_id=' + APPLICATION_ID + '; PRAGMA user_version=1;');
      database.exec('CREATE TABLE room_state (id INTEGER PRIMARY KEY CHECK(id=1), schema INTEGER NOT NULL CHECK(schema=1), content_version TEXT NOT NULL, payload TEXT CHECK(payload IS NULL OR length(CAST(payload AS BLOB))<=1048576)) STRICT');
      database.prepare('INSERT INTO room_state(id,schema,content_version,payload) VALUES(1,1,?,NULL)').run(contentVersion);
    } else if (pragma('application_id') !== APPLICATION_ID || pragma('user_version') !== 1) fail('format_version');
    const row = database.prepare('SELECT schema,content_version,length(CAST(payload AS BLOB)) AS bytes FROM room_state WHERE id=1').get();
    if (!row || row.schema !== 1 || row.content_version !== contentVersion ||
      row.bytes !== null && (!Number.isSafeInteger(row.bytes) || row.bytes > MAX_PAYLOAD_BYTES) ||
      database.prepare('SELECT count(*) AS count FROM room_state').get().count !== 1) fail('document_version');
    database.exec('COMMIT');
    const select = database.prepare('SELECT payload,length(CAST(payload AS BLOB)) AS bytes FROM room_state WHERE id=1');
    const update = database.prepare('UPDATE room_state SET payload=? WHERE id=1');
    function usable() { if (closed || failed) fail('unavailable'); }
    function load() {
      usable();
      try {
        const value = select.get();
        if (!value) fail('invalid_file');
        if (value.payload === null) return null;
        if (typeof value.payload !== 'string' || !Number.isSafeInteger(value.bytes) ||
          value.bytes > MAX_PAYLOAD_BYTES || Buffer.byteLength(value.payload, 'utf8') !== value.bytes) fail('document_bounds');
        const document = JSON.parse(value.payload);
        encode(document, contentVersion);
        return document;
      } catch { failed = true; fail('load_failed'); }
    }
    // Parse/validate existing data now. Corrupt or incompatible files cannot
    // become an empty authority just because the caller has not called load yet.
    load();
    return {
      load,
      commit(document) {
        usable(); const payload = encode(document, contentVersion);
        try {
          database.exec('BEGIN IMMEDIATE');
          if (update.run(payload).changes !== 1) fail('invalid_file');
          database.exec('COMMIT');
        } catch {
          failed = true;
          try { database.exec('ROLLBACK'); } catch { /* Commit outcome can be unknown; remain failed. */ }
          fail('commit_failed');
        }
      },
      close() { if (closed) return; closed = true; database.close(); }
    };
  } catch {
    if (database) try { database.close(); } catch { /* Preserve the original, fixed error. */ }
    fail('open_failed');
  }
}
