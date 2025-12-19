
import { JobState } from '../types';

const DB_NAME = 'DubberAI_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_FILES = 'files';

export class DBService {
  private static db: IDBDatabase | null = null;

  static async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject('IndexedDB initialization failed');
    });
  }

  static async saveProject(project: JobState): Promise<void> {
    await this.init();
    // We don't save File objects directly in the project state to avoid serialization issues
    const projectToSave = { ...project, originalFile: null };
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PROJECTS, 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      store.put(projectToSave);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject('Failed to save project');
    });
  }

  static async getAllProjects(): Promise<JobState[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_PROJECTS, 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as JobState[]);
      request.onerror = () => reject('Failed to fetch projects');
    });
  }

  static async deleteProject(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_PROJECTS, STORE_FILES], 'readwrite');
      transaction.objectStore(STORE_PROJECTS).delete(id);
      transaction.objectStore(STORE_FILES).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject('Failed to delete project');
    });
  }

  static async saveFile(id: string, file: Blob | File): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_FILES, 'readwrite');
      const store = transaction.objectStore(STORE_FILES);
      store.put({ id, data: file });
      transaction.oncomplete = () => resolve();
    });
  }

  static async getFile(id: string): Promise<Blob | null> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(STORE_FILES, 'readonly');
      const store = transaction.objectStore(STORE_FILES);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  }
}
