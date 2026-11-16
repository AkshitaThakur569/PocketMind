import * as SQLite from 'expo-sqlite';


let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!dbPromise) {
        dbPromise = (async () => {
            const db = await SQLite.openDatabaseAsync('pocketmind.db');

        await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS conversations(
        id TEXT PRIMARY KEY NOT NULL , 
        title TEXT NOT NULL , 
        created_at INTEGER NOT NULL , 
        updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS messages(
        id TEXT PRIMARY KEY NOT NULL ,
        conversation_id TEXT NOT NULL ,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')) ,
        content TEXT NOT NULL ,
        created_at INTEGER NOT NULL ,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      `);

            console.log("PocketMind database initialized successfully!");
            return db;
        })().catch((error) => {
            dbPromise = null;
            console.log("Error initializing PocketMind database:", error);
            throw error;

        })
    }
    return dbPromise;
}
