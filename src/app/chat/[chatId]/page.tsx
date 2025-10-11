"use client"
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useParams, useSearchParams} from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import { BsPaperclip } from "react-icons/bs";
import PagesLayout from "@/app/component/Layout";
import ChatForm from "@/app/component/ChatForm";

interface TripCardData {
  city: string;
  summary: string;
  packingAdvice: string[];
  cautions: string[];
  createdAt?: string;
}

interface PackingItemData {
  item: string;
  reason: string;
}

interface PackingListData {
  items: PackingItemData[];
  totalItems: number;
  createdAt?: string;
}

type UploadedRef = { url: string; name: string; type: string; size: number };
type MessagePart = 
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'file'; mediaType: string; filename: string; name: string; url: string }
  | { type: 'tool-weather'; result: { location: string; temp: number; condition: string; forecast?: Array<{ date: string; temp: number; condition: string }> } }
  | { type: 'tool-create_trip_card'; result: TripCardData }
  | { type: 'tool-create_packing_list'; result: PackingListData };


export default function DynamicChat() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const params = useParams<{ chatId?: string }>();
  const searchParams = useSearchParams();
  
  const { messages, sendMessage, status, stop} = useChat({
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-send initial message from URL
  useEffect(() => {
    const message = searchParams.get('message');
    const fileRefsParam = searchParams.get('fileRefs');

    if (!message?.trim() || !params.chatId) return;

    const storageKey = `chat_${params.chatId}_initial_sent`;   
    if (sessionStorage.getItem(storageKey)) return;

    (async () => {
      try {
        const refs: UploadedRef[] = fileRefsParam ? JSON.parse(fileRefsParam) : [];
        if (refs.length > 0) {
          const fileParts = await Promise.all(
            refs.map(async (ref) => {
              try {
                const response = await fetch(ref.url);
                const blob = await response.blob();
                return new Promise<{ type: 'file'; mediaType: string; url: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({
                    type: 'file',
                    mediaType: ref.type,
                    url: reader.result as string,
                  });
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
              } catch (error) {
                console.error('Failed to convert uploaded file:', error);
                return null;
              }
            })
          ).then(parts => parts.filter((part): part is { type: 'file'; mediaType: string; url: string } => part !== null));
          if (fileParts.length > 0) {
            await sendMessage({
              parts: [
                { type: 'text', text: message },
                ...fileParts,
              ],
            });
          } else {
            await sendMessage({ text: message });
          }
        } else {
          await sendMessage({ text: message });
        }
      } catch (error) {
        console.error("Failed to send initial message:", error);
      } finally {
        sessionStorage.setItem(storageKey, 'true');
        const cleanUrl = `/chat/${params.chatId}`;
        window.history.replaceState({}, '', cleanUrl);
      }
    })();

  }, [searchParams, params.chatId, sendMessage]);
  
  // Auto-scroll ONLY when user sends a new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    if (!trimmedInput || status === "submitted" || status === "streaming") return;
      
    try {
      setInput("");

      const fileParts = files && files.length > 0 
      ? await convertFilesToDataURLs(files)
      : [];

      const parts: Array<{
        type: 'text';
        text: string;
      } | {
        type: 'file';
        mediaType: string;
        url: string;
      }> = [{ type: 'text', text: trimmedInput }];
      parts.push(...fileParts);

      await sendMessage(parts.length > 1 ? { parts } : { text: trimmedInput });

      setFiles(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
    
    } catch (error) {
      console.error("Failed to send message:", error);
    };
  };

  async function convertFilesToDataURLs(files: FileList) {
    return Promise.all(
      Array.from(files).map(
        file =>
          new Promise<{
            type: 'file';
            mediaType: string;
            url: string;
          }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                type: 'file',
                mediaType: file.type,
                url: reader.result as string,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );
  }

  const renderTripCard = (data: TripCardData) => {
    return (
      <div key={`trip-card-${Date.now()}`} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 my-2">
        <h3 className="text-lg font-bold text-blue-800 mb-2">✈️ Trip to {data.city}</h3>
        <p className="text-gray-700 mb-3">{data.summary}</p>
        
        <div className="mb-3">
          <h4 className="font-semibold text-blue-700 mb-1">🎒 Packing Advice:</h4>
          <ul className="list-disc list-inside space-y-1">
            {data.packingAdvice.map((item, index) => (
              <li key={index} className="text-gray-600">{item}</li>
            ))}
          </ul>
        </div>
        
        {data.cautions && data.cautions.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-700 mb-1">⚠️ Cautions:</h4>
            <ul className="list-disc list-inside space-y-1">
              {data.cautions.map((caution, index) => (
                <li key={index} className="text-red-600">{caution}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderPackingList = (data: PackingListData) => {
    return (
      <div key={`packing-list-${Date.now()}`} className="border-2 border-green-200 rounded-lg p-4 bg-green-50 my-2">
        <h3 className="text-lg font-bold text-green-800 mb-3">🎒 Packing List ({data.totalItems} items)</h3>
        
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <div key={index} className="border-b border-green-100 pb-2 last:border-b-0">
              <div className="font-medium text-gray-800">{item.item}</div>
              <div className="text-sm text-gray-600 mt-1">💡 {item.reason}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessagePart = (part:MessagePart, 
    messageId: string, index: number) => {
    if (part.type === "tool-weather" || part.type === "tool-create_trip_card" || part.type === "tool-create_packing_list") {
      try {
        const result = part.result;
        
        // Check if it's a trip card
        if (result && typeof result === 'object' && 'city' in result && 'summary' in result) {
          return renderTripCard(result as TripCardData);
        }
        
        // Check if it's a packing list
        if (result && typeof result === 'object' && 'items' in result && Array.isArray(result.items)) {
          return renderPackingList(result as PackingListData);
        }
        
        // Fallback for other tool results
        return (
          <div key={`${messageId}-${index}-tool-result`} className="bg-yellow-50 border border-yellow-200 rounded p-3 my-2">
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        );
        
      } catch (error) {
        console.error("Error rendering tool result:", error);
        return null;
      }
    }
    switch (part.type) {
      case "reasoning":
        return (
          <div key={`${messageId}-${index}-reasoning`} className="text-sm italic opacity-75 color-[#ff0000]">
            {part.text}
          </div>
        );
      case "text":
        return <div key={`${messageId}-${index}-text`}>{part.text}</div>;
      case "file":
        if (part.mediaType?.startsWith("image/")) {
          return (
            <Image
              key={`${messageId}-${index}-image`}
              src={part.url!}
              alt={part.filename || part.name || `Image-${index}`}
              height={200}
              width={200}
              className="rounded-lg"
            />
          );
        }
        if (part.mediaType === "application/pdf") {
          return (
            <iframe
              key={`${messageId}-${index}-pdf`}
              src={part.url!}
              width="100%"
              height="600"
              title={part.filename || part.name || `PDF-${index}`}
              className="border rounded-lg"
            />
          );
        }
        return (
          <div key={`${messageId}-${index}-file`} className="border p-2 rounded">
            <a href={part.url!} download={part.filename || part.name} className="text-blue-600 hover:underline">
              <BsPaperclip /> {part.filename || part.name}
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files || undefined);
  };

  return (
    <PagesLayout 
      footer={   
        <ChatForm 
          input={input}
          setInput={setInput}
          fileInputRef={fileInputRef}
          status={status}
          onFileChange={handleFileChange}
          handleStop={stop}
          handleSubmit={handleSubmit}
        />
      }
    >
      <div className="flex flex-col space-y-4 p-4">
        {messages.length > 0 && (
          messages.map((message, index) => (
            
            <div key={`${message.id}-${index}`} className={`flex flex-col ${message.role === 'user' ? "items-end" : "items-start"}`}>
              <div className={`p-[10px] ${message.role === 'user' ? "max-w-[70%] w-fit bg-[#dadfe7] text-[#1a1f26] rounded-[15px]" : ""}`}>
                  {message.parts.map((part, i) => renderMessagePart(part as MessagePart, message.id, i))}
              </div>
            </div>            
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </PagesLayout>
  );
}
