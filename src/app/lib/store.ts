import type { ModelMessage } from 'ai';

const memory = new Map<string, ModelMessage[]>();

export function getHistory(id: string) { 
    return memory.get(id) ?? []; 
}

export function setHistory(id: string, messages: ModelMessage[]) { 
    memory.set(id, messages); 
}
