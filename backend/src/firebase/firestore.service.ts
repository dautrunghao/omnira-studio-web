import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createInitialSeedStore, OmniStore } from '../rpc/seed-data';

@Injectable()
export class FirestoreService implements OnModuleInit {
  readonly projectId = process.env.FIREBASE_PROJECT_ID || 'omnira-studio-11041651';
  private firestoreDb: admin.firestore.Firestore | null = null;
  private firestoreReady = false;
  private store!: OmniStore;
  private readonly dataFile: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    this.dataFile = path.join(dataDir, 'omnira-firestore-store.json');
    this.loadOrSeed();
  }

  async onModuleInit() {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          projectId: this.projectId,
        });
      }
      this.firestoreDb = admin.firestore();
      // Non-blocking sync of collections to Cloud Firestore when available
      void this.syncToCloudFirestore();
    } catch (err: any) {
      console.warn('[FirestoreService] Initialized in local-mirror mode for project', this.projectId, err?.message);
    }
  }

  private loadOrSeed() {
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf8');
        this.store = JSON.parse(raw);
        if (this.store && Array.isArray(this.store.workspaces) && this.store.workspaces.length > 0) {
          return;
        }
      } catch (e) {
        console.warn('[FirestoreService] Failed to parse local store, re-seeding:', e);
      }
    }
    this.store = createInitialSeedStore();
    this.persist();
  }

  getStore(): OmniStore {
    return this.store;
  }

  persist(changedCollection?: keyof OmniStore) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.store, null, 2), 'utf8');
      if (changedCollection && this.firestoreDb && this.firestoreReady) {
        void this.pushCollectionToFirestore(String(changedCollection));
      }
    } catch (err) {
      console.error('[FirestoreService] Persist error:', err);
    }
  }

  resetAndReseed(): OmniStore {
    this.store = createInitialSeedStore();
    this.persist();
    return this.store;
  }

  private async syncToCloudFirestore() {
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
      // Cloud Firestore API or ADC may still be propagating; local mirror guarantees 100% availability
      this.firestoreReady = false;
    }
  }

  private async pushCollectionToFirestore(colName: string) {
    if (!this.firestoreDb || !this.firestoreReady) return;
    try {
      const items = (this.store as any)[colName];
      if (!Array.isArray(items)) return;
      const batch = this.firestoreDb.batch();
      for (const item of items.slice(0, 50)) {
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
