import { MongoClient, type Db } from 'mongodb';
import { requireEnv } from './env';

const COLLECTION = 'travel_app';
const DOC_ID = 'main';

export interface StoredTripData {
  trips: unknown[];
  updatedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var _travelMongo: { client: MongoClient; db: Db } | undefined;
}

async function connect(): Promise<Db> {
  if (global._travelMongo) {
    return global._travelMongo.db;
  }
  const uri = requireEnv('MONGODB_URI');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  global._travelMongo = { client, db };
  return db;
}

export async function loadTripData(): Promise<StoredTripData | null> {
  const db = await connect();
  const doc = await db.collection(COLLECTION).findOne({ _id: DOC_ID });
  if (!doc) return null;
  return {
    trips: Array.isArray(doc['trips']) ? doc['trips'] : [],
    updatedAt:
      typeof doc['updatedAt'] === 'string'
        ? doc['updatedAt']
        : new Date().toISOString(),
  };
}

export async function saveTripData(data: StoredTripData): Promise<void> {
  const db = await connect();
  await db.collection(COLLECTION).updateOne(
    { _id: DOC_ID },
    {
      $set: {
        trips: data.trips,
        updatedAt: data.updatedAt,
      },
    },
    { upsert: true },
  );
}
