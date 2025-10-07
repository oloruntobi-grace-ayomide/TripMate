"use client"
import { useChat } from "@ai-sdk/react";
import { useParams, useRouter, useSearchParams} from "next/navigation";
import { useState, useEffect, useRef, FormEvent } from "react";
import PagesLayout from "@/app/component/Layout";
import ChatForm from "@/app/component/ChatForm";

export default function Home() {
  const [input, setInput] = useState("");
  const params = useParams<{ chatId?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  const { messages, sendMessage, status } = useChat({
    transport:{
      api:"/api/chat",
      body:{//send this to the server along side the messages
        conversationId: params?.chatId ?? null
      }
    }
  });

  const isSubmitting = status === "submitted";
  const isLoading = status === "streaming";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageCountRef = useRef(0);

  // Auto-send initial message from URL
   useEffect(() => {
    const initialMessage = searchParams.get('message');
    console.log("Checking conditions:", { 
      initialMessage, 
      initialMessageSent, 
      messagesCount: messages.length,
      hasParamsId: !!params.chatId
    });

    const sendInitialMessage = async () => {
      if (!initialMessage?.trim() || initialMessageSent || !params.chatId) {
        console.log("Skipping - condition not met");
        return;
      }
      try {
        console.log("Sending initial message:", initialMessage);
        await sendMessage({text: initialMessage});
        setInitialMessageSent(true); 
        const newUrl = `/chat/${params.chatId}`;
        window.history.replaceState(null, '', newUrl); 
      } catch (error) {
        console.error("Failed to send initial message:", error);
        setInitialMessageSent(true);
      }
    };

    sendInitialMessage();
  }, []);
  
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
      await sendMessage({text:trimmedInput});
    } catch (error) {
      console.error("Failed to send message:", error);
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
          messages.map(message => (
            
            <div key={message.id} className={`flex flex-col ${message.role === 'user' ? "items-end" : "items-start"}`}>
              <div className={`p-[10px] ${message.role === 'user' ? "max-w-[70%] w-fit bg-[#dadfe7] text-[#1a1f26] rounded-[15px]" : ""}`}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "reasoning":
                      return (
                        <div key={`${message.id}-${i}`} className="text-sm italic opacity-75">
                          {part.text}
                        </div>
                      ); 
                    case 'text':
                      return (
                        <div key={`${message.id}-${i}`}>{part.text}</div>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            </div>            
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </PagesLayout>
  );
}