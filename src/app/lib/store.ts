import type { ModelMessage } from 'ai';

// Limit conversation history to prevent unbounded growth
const MAX_HISTORY_LENGTH = 50;
const memory = new Map<string, ModelMessage[]>();

export function getHistory(id: string) { 
    return memory.get(id) ?? []; 
}

export function setHistory(id: string, messages: ModelMessage[]) { 
    const limitedMessages = messages.slice(-MAX_HISTORY_LENGTH);
    memory.set(id, limitedMessages); 
}

// Optional: Add cleanup for old conversations
export function cleanupOldConversations() { 
    if (memory.size > 100) {
        const entries = Array.from(memory.entries());
        const oldestHalf = entries.slice(0, Math.floor(entries.length / 2));
        oldestHalf.forEach(([id]) => memory.delete(id));
    }
}
