import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  
  // During build time, we don't need a real MongoDB connection
  // This allows the build to succeed on Cloudflare Pages
  if (!uri) {
    if (process.env.NODE_ENV === 'production' && !process.env.BUILDING) {
      throw new Error('Please define the MONGODB_URI environment variable');
    }
    
    // Return a dummy database object during build time
    // This will never be used in production as env vars will be set
    console.warn('MONGODB_URI not defined, using placeholder for build');
    return {} as Db;
  }

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('github_planner');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function closeDatabaseConnection() {
  if (client) {
    await client.close();
  }
}