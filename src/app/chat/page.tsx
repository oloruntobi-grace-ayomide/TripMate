"use client"
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import PagesLayout from "@/app/component/Layout";
import ChatForm from "../component/ChatForm";

export default function NewChat() {
  const [input, setInput] = useState("");
  const [ isLoading, setIsLoading] = useState(false);
  const [ isSubmitting, setIsSubmitting]  = useState(false);
  const [ isSending , setIsending] = useState(false);
  const router = useRouter()


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();   
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading || isSubmitting) return; 
      try {
        setInput("");
        setIsending(true)
        const newConversationId = crypto.randomUUID();
        router.push(`/chat/${newConversationId}?message=${encodeURIComponent(trimmedInput)}`);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
  };

  return (
    <PagesLayout 
      footer={""}
    >
      <div className="flex flex-col space-y-4 p-4">
          <div className="text-center text-gray-500 mt-10">
            <p className="text-[40px]">Start a conversation with TripMate!</p>
          </div>
          <ChatForm
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            isSending={isSending}
            handleSubmit={handleSubmit}
          />
      </div>
    </PagesLayout>
  );
}