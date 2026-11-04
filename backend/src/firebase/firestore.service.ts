import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createInitialSeedStore, OmniStore, StoreEntity } from '../rpc/seed-data';

@Injectable()
export class FirestoreService implements OnModuleInit, OnModuleDestroy {
  readonly projectId = process.env.FIREBASE_PROJECT_ID || 'omnira-studio-11041651';
  private firestoreDb: admin.firestore.Firestore | null = null;
  private firestoreReady = false;
  private store!: OmniStore;
  private readonly dataFile: string;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly dirtyCollections = new Set<string>();
  private writeInProgress = false;
  private writePending = false;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    this.dataFile = path.join(dataDir, 'omnira-firestore-store.json');
    this.loadOrSeed();
  }

  async onModuleInit(): Promise<void> {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: this.projectId,
        });
      }
      this.firestoreDb = admin.firestore();
      void this.syncToCloudFirestore();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[FirestoreService] Initialized in local-mirror mode for project', this.projectId, msg);
    }
  }

  onModuleDestroy(): void {
    this.flushSync();
  }

  private loadOrSeed(): void {
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        this.store = JSON.parse(raw) as OmniStore;
        if (this.store && Array.isArray(this.store.workspaces) && this.store.workspaces.length > 0) {
          return;
        }
      } catch (e: unknown) {
        console.warn('[FirestoreService] Failed to parse local store, re-seeding:', e);
      }
    }
    this.store = createInitialSeedStore();
    this.flushSync();
  }

  getStore(): OmniStore {
    return this.store;
  }

  /**
   * High-performance non-blocking debounced persistence.
   * Coalesces rapid state mutations into a single background disk write & Firestore batch.
   */
  persist(changedCollection?: keyof OmniStore): void {
    if (changedCollection) {
      this.dirtyCollections.add(String(changedCollection));
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushAsync();
    }, 150);
  }

  private async flushAsync(): Promise<void> {
    if (this.writeInProgress) {
      this.writePending = true;
      return;
    }
    this.writeInProgress = true;
    try {
      const payload = JSON.stringify(this.store, null, 2);
      await fs.promises.writeFile(this.dataFile, payload, 'utf8');
      if (this.firestoreDb && this.firestoreReady && this.dirtyCollections.size > 0) {
        const cols = Array.from(this.dirtyCollections);
        this.dirtyCollections.clear();
        for (const col of cols) {
          await this.pushCollectionToFirestore(col);
        }
      }
    } catch (err: unknown) {
      console.error('[FirestoreService] Async persist error:', err);
    } finally {
      this.writeInProgress = false;
      if (this.writePending) {
        this.writePending = false;
        void this.flushAsync();
      }
    }
  }

  private flushSync(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.store, null, 2), 'utf8');
    } catch (err: unknown) {
      console.error('[FirestoreService] Sync flush error:', err);
    }
  }

  resetAndReseed(): OmniStore {
    this.store = createInitialSeedStore();
    this.persist();
    return this.store;
  }

  private async syncToCloudFirestore(): Promise<void> {
    if (!this.firestoreDb) return;
    try {
      await this.firestoreDb.collection('_meta').doc('app').set(
        {
          projectId: this.projectId,
          version: '1.2.9',
          syncedAt: Date.now(),
        },
        { merge: true }
      );
      this.firestoreReady = true;
      for (const key of ['workspaces', 'accounts', 'channels', 'contentItems', 'series', 'filmProjects']) {
        await this.pushCollectionToFirestore(key);
      }
      console.log(`[FirestoreService] Cloud Firestore (${this.projectId}) connected & synced.`);
    } catch {
      this.firestoreReady = false;
    }
  }

  private async pushCollectionToFirestore(colName: string): Promise<void> {
    if (!this.firestoreDb || !this.firestoreReady) return;
    try {
      const storeRecord = this.store as unknown as Record<string, unknown>;
      const items = storeRecord[colName];
      if (!Array.isArray(items)) return;
      const batch = this.firestoreDb.batch();
      for (const rawItem of items.slice(0, 50)) {
        const item = rawItem as StoreEntity;
        if (item && item.id) {
          const ref = this.firestoreDb.collection(colName).doc(String(item.id));
          batch.set(ref, item, { merge: true });
        }
      }
      await batch.commit();
    } catch {
      // Ignore transient Firestore network errors
    }
  }
}
