import type { CatalogProduct } from "@/data/products";

const DB_NAME = "agrichem-pro-field-guide";
const DB_VERSION = 1;
const STORE = "products";
const META = "metadata";

function openCatalogDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "productId" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open catalog database"));
  });
}

export async function seedOrLoadCatalog(seed: CatalogProduct[]) {
  if (typeof indexedDB === "undefined") return seed;
  const db = await openCatalogDb();
  const existing = await new Promise<CatalogProduct[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as CatalogProduct[]);
    request.onerror = () => reject(request.error);
  });
  if (existing.length === seed.length) return existing;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, META], "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    seed.forEach((product) => store.put(product));
    tx.objectStore(META).put({ key: "catalog", rowCount: seed.length, updatedAt: new Date().toISOString(), schemaVersion: 1 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return seed;
}

export async function persistCatalog(products: CatalogProduct[]) {
  if (typeof indexedDB === "undefined") return;
  const db = await openCatalogDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, META], "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    products.forEach((product) => store.put(product));
    tx.objectStore(META).put({ key: "catalog", rowCount: products.length, updatedAt: new Date().toISOString(), schemaVersion: 1 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
