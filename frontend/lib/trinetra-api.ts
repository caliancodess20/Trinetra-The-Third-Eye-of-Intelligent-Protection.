import { addDoc, collection, getDocs, getFirestore, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { getDatabase, onValue, ref, type Unsubscribe, connectDatabaseEmulator } from 'firebase/database'
import { getApp, getApps, initializeApp } from 'firebase/app'

export type Temple = {
  id: string
  name: string
  city: string
  pressure: number
  status: 'Calm' | 'Moderate' | 'High'
  pilgrims: number
  lastUpdate: string
}

export type EntryRecord = {
  code: string
  pilgrimName?: string
  temple: string
  enteredAt: string
  source: 'qr' | 'manual'
}

export type LiveAlert = {
  templeId: string
  currentVelocity: number
  status: string
  festivalActive?: boolean
  alertTime?: number
}

export type Festival = {
  id: string
  name: string
  date: string
  temple: string
  city: string
  crowdLevel: 'Moderate' | 'High' | 'Very high'
  note: string
}

const demoFestivals: Festival[] = [
  { id: 'maha-shivratri-2026', name: 'Maha Shivratri', date: '2026-02-15', temple: 'Somnath', city: 'Prabhas Patan', crowdLevel: 'Very high', note: 'Night darshan and extended gate operations' },
  { id: 'ram-navami-2026', name: 'Ram Navami', date: '2026-03-26', temple: 'Dwarka', city: 'Devbhumi Dwarka', crowdLevel: 'High', note: 'Morning procession and temple square checks' },
  { id: 'janmashtami-2026', name: 'Janmashtami', date: '2026-09-04', temple: 'Dwarka', city: 'Devbhumi Dwarka', crowdLevel: 'Very high', note: 'Midnight darshan and overnight pilgrim flow' },
  { id: 'navratri-2026', name: 'Navratri', date: '2026-10-11', temple: 'Ambaji', city: 'Banaskantha', crowdLevel: 'Very high', note: 'Nine-day peak season; pre-booked entry recommended' },
  { id: 'diwali-2026', name: 'Diwali', date: '2026-11-08', temple: 'Pavagadh', city: 'Panchmahal', crowdLevel: 'High', note: 'Festival lights and elevated evening arrivals' },
]

const demoTemples: Temple[] = [
  { id: 'temple_1', name: 'Somnath', city: 'Prabhas Patan', pressure: 42, status: 'Calm', pilgrims: 1840, lastUpdate: '2 min ago' },
  { id: 'temple_2', name: 'Dwarka', city: 'Devbhumi Dwarka', pressure: 68, status: 'Moderate', pilgrims: 2260, lastUpdate: '1 min ago' },
  { id: 'temple_3', name: 'Ambaji', city: 'Banaskantha', pressure: 81, status: 'High', pilgrims: 3110, lastUpdate: 'Just now' },
  { id: 'temple_4', name: 'Pavagadh', city: 'Panchmahal', pressure: 54, status: 'Moderate', pilgrims: 1980, lastUpdate: '4 min ago' },
]

function firebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!apiKey || !projectId) return null
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
}

function getFirebase() {
  const config = firebaseConfig()
  if (!config) return null

  const app = getApps().length ? getApp() : initializeApp(config)
  const firestore = getFirestore(app)
  const database = config.databaseURL ? getDatabase(app) : null
  const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true'

  if (useEmulator && typeof window !== 'undefined') {
    const [firestoreHost, firestorePort = '8080'] = (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
    const [databaseHost, databasePort = '9000'] = (process.env.NEXT_PUBLIC_DATABASE_EMULATOR_HOST || '127.0.0.1:9000').split(':')

    try {
      connectFirestoreEmulator(firestore, firestoreHost, Number(firestorePort))
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already been called')) throw error
    }

    if (database) {
      try {
        connectDatabaseEmulator(database, databaseHost, Number(databasePort))
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('already been called')) throw error
      }
    }
  }

  return { firestore, database }
}

export async function getFestivals(): Promise<Festival[]> {
  const firebase = getFirebase()
  if (!firebase) return demoFestivals
  try {
    const snapshot = await getDocs(query(collection(firebase.firestore, 'festivals'), orderBy('date'), limit(24)))
    if (snapshot.empty) return demoFestivals
    return snapshot.docs.map((item) => {
      const data = item.data()
      const crowdLevel = String(data.crowdLevel ?? 'High') as Festival['crowdLevel']
      return {
        id: item.id,
        name: String(data.name ?? item.id),
        date: String(data.date ?? ''),
        temple: String(data.temple ?? data.templeName ?? 'Circuit-wide'),
        city: String(data.city ?? ''),
        crowdLevel: ['Moderate', 'High', 'Very high'].includes(crowdLevel) ? crowdLevel : 'High',
        note: String(data.note ?? 'Review staffing and gate capacity before the festival.'),
      }
    })
  } catch {
    return demoFestivals
  }
}

export async function getTemples(): Promise<Temple[]> {
  const firebase = getFirebase()
  if (!firebase) return demoTemples
  try {
    const snapshot = await getDocs(query(collection(firebase.firestore, 'temples'), orderBy('name'), limit(12)))
    if (snapshot.empty) return demoTemples
    return snapshot.docs.map((item) => {
      const data = item.data()
      const pressure = Number(data.pressure ?? data.pressureIndex ?? 0)
      return { id: item.id, name: String(data.name ?? item.id), city: String(data.city ?? ''), pressure, status: pressure >= 75 ? 'High' : pressure >= 55 ? 'Moderate' : 'Calm', pilgrims: Number(data.pilgrims ?? data.currentPilgrims ?? 0), lastUpdate: 'Live' }
    })
  } catch {
    return demoTemples
  }
}

export async function createQrEntry(entry: EntryRecord): Promise<EntryRecord> {
  const firebase = getFirebase()
  if (!firebase) return entry
  await addDoc(collection(firebase.firestore, 'gate_scans'), {
    code: entry.code,
    source: entry.source,
    templeId: entry.temple,
    timestamp: entry.enteredAt,
    createdAt: serverTimestamp(),
  })
  return entry
}

export function subscribeToLiveAlerts(callback: (alerts: LiveAlert[]) => void): Unsubscribe | undefined {
  const firebase = getFirebase()
  if (!firebase?.database) return undefined
  return onValue(ref(firebase.database, 'live_alerts'), (snapshot) => {
    const value = snapshot.val() ?? {}
    callback(Object.values(value) as LiveAlert[])
  })
}

export function isConfigured() {
  return Boolean(firebaseConfig())
}

export const templeExists = (templeId: string) => query(collection(getFirebase()!.firestore, 'temples'), where('__name__', '==', templeId))
