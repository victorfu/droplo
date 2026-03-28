import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { SiteMeta } from '@/types';

export async function checkSiteExists(siteId: string): Promise<boolean> {
  const q = query(collection(db, 'sites'), where('siteId', '==', siteId));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function getSiteMeta(siteId: string): Promise<SiteMeta | null> {
  const q = query(collection(db, 'sites'), where('siteId', '==', siteId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as SiteMeta;
}
