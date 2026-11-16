import { initializeDatabase } from './database';

export type Conversation = {
    id: string;
    title: string;
    created_at: number;
    updated_at: number;
};

export type ChatMessage = {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: number;
};

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function createConversation(title: string): Promise<string> {
    const db = await initializeDatabase();

    const id = generateId();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO conversations (id , title, created_at , updated_at) VALUES (?, ?, ?, ?)`,
        [id, title, now, now]
    );

    return id;
}

export async function saveMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
): Promise<void> {
    const db = await initializeDatabase();

    const id = generateId();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO messages
         (id, conversation_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, conversationId, role, content, now]
    );

    await db.runAsync(
        `UPDATE conversations
         SET updated_at = ?
         WHERE id = ?`,
        [now, conversationId]
    );
}

export async function getMessages(
    conversationId: string
): Promise<ChatMessage[]> {
    const db = await initializeDatabase();

    const messages = await db.getAllAsync<ChatMessage>(
        `SELECT *
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC`,
        [conversationId]
    );

    return messages;
}

export async function getAllConversations() : Promise<Conversation[]> {
const db = await initializeDatabase();
const conversations = await db.getAllAsync<Conversation>(
    `SELECT * FROM conversations ORDER BY updated_at DESC`
);
return conversations;
}


export async function deleteConversation(
  conversationId: string
): Promise<void> {
  const db = await initializeDatabase();

  await db.runAsync(
    `DELETE FROM conversations WHERE id = ?`,
    [conversationId]
  );
}
