// Wraps the File System Access API (Chrome/Edge only -- Firefox and
// Safari don't implement it) so letters can be saved straight onto a
// shared drive instead of going through the browser's Downloads folder.
// The chosen root directory's handle is persisted in IndexedDB so the
// user only has to pick it once per browser/device; the browser still
// requires a fresh permission grant (a click, not silent) periodically.

const DB_NAME = "parkman2-documents";
const STORE_NAME = "handles";
const ROOT_KEY = "root";

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredRootHandle() {
  return (await idbGet(ROOT_KEY)) || null;
}

// Must be called from a click handler -- showDirectoryPicker() requires
// a user gesture.
export async function chooseDocumentsFolder() {
  const handle = await window.showDirectoryPicker({ id: "parkman2-documents", mode: "readwrite" });
  await idbSet(ROOT_KEY, handle);
  return handle;
}

// Also must run from (or right after) a user gesture the first time --
// requestPermission() only prompts silently once already granted.
export async function ensureReadWritePermission(handle) {
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

// Windows forbids \ / : * ? " < > | in file/folder names.
export function sanitizeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function getOrCreateSubfolder(rootHandle, folderName) {
  return rootHandle.getDirectoryHandle(sanitizeName(folderName), { create: true });
}

export async function saveFile(dirHandle, fileName, blob) {
  const fileHandle = await dirHandle.getFileHandle(sanitizeName(fileName), { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}
