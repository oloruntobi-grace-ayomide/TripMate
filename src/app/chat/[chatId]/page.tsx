"use client"
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useParams, useSearchParams} from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import PagesLayout from "@/app/component/Layout";
import ChatForm from "@/app/component/ChatForm";


export type MessagePartType = 
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolName: string }
  | { type: "tool-result"; result: unknown }
  | { type: "data"; data: unknown };


export default function DynamicChat() {
  const [input, setInput] = useState("");
  const params = useParams<{ chatId?: string }>();
  const searchParams = useSearchParams();
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  const { messages, sendMessage, status} = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id }) {
        return {
          body: {
            messages,          
            conversationId: params.chatId ?? id,
          },
        };
      }
    }),
    onError: (error) => {
      console.error("Chat error:", error);
    }
  });

  const isSubmitting = status === "submitted";
  const isLoading = status === "streaming";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageCountRef = useRef(0);

  // Auto-send initial message from URL
  useEffect(() => {
    const initialMessage = searchParams.get('message');
    if (!initialMessage?.trim() || !params.chatId) return;
  
    const storageKey = `chat:${params.chatId}:initial-sent`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === '1') return;
  
    (async () => {
      try {
        await sendMessage({ text: initialMessage });
      } finally {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(storageKey, '1');
          const newUrl = `/chat/${params.chatId}`;
          window.history.replaceState(null, '', newUrl);
        }
      }
    })();
  }, [searchParams, initialMessageSent, params.chatId, sendMessage]);

  // Auto-scroll ONLY when user sends a new message
  useEffect(() => {
    const currentUserMessages = messages.filter(msg => msg.role === 'user').length;
    
    if (currentUserMessages > lastUserMessageCountRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      lastUserMessageCountRef.current = currentUserMessages;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || isSubmitting || isLoading) return;
    
    try {
      setInput("");
      await sendMessage({ text: trimmedInput })
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const renderMessagePart = (part: MessagePartType, messageId: string, index: number) => {
    switch (part.type) {
      case "reasoning":
        return (
          <div key={`${messageId}-${index}-reasoning`} className="text-sm italic opacity-75">
            {part.text}
          </div>
        ); 
      case 'text':
        return (
          <div key={`${messageId}-${index}-text`}>{part.text}</div>
        );
      case 'tool-call':
        return (
          <div key={`${messageId}-${index}-tool-call`} className="text-sm text-blue-600">
            Calling tool: {part.toolName}
          </div>
        );
      case 'tool-result':
        return (
          <div key={`${messageId}-${index}-tool-result`} className="text-sm text-green-600">
            Tool result received
          </div>
        );
      case 'data':
        return (
          <div key={`${messageId}-${index}-data`} className="text-sm text-gray-600">
            Data: {JSON.stringify(part.data)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <PagesLayout 
      footer={   
        <ChatForm 
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
        />
      }
    >
      <div className="flex flex-col space-y-4 p-4">
        {messages.length > 0 && (
          messages.map((message, index) => (
            
            <div key={`${message.id}-${index}`} className={`flex flex-col ${message.role === 'user' ? "items-end" : "items-start"}`}>
              <div className={`p-[10px] ${message.role === 'user' ? "max-w-[70%] w-fit bg-[#dadfe7] text-[#1a1f26] rounded-[15px]" : ""}`}>
                  {message.parts.map((part, i) => renderMessagePart(part as MessagePartType, message.id, i))}
              </div>
            </div>            
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </PagesLayout>
  );
}