"use client"
import { useRouter } from "next/navigation";
import { useState, FormEvent, useRef } from "react";
import PagesLayout from "@/app/component/Layout";
import ChatForm from "../component/ChatForm";

export default function NewChat() {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>();
  const fileInputRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();   
    const trimmedInput = input.trim();
    
    if (!trimmedInput || isSending) return; 

    setIsSending(true);
    setInput("")

    try {
      const newConversationId = generateConversationId();
      
      let fileRefs: Array<{url: string, name: string, type: string, size: number}> = [];
      
      // Upload files to server if they exist
      if (files && files.length > 0) {
        fileRefs = await uploadFiles(files);
      }

      // Navigate with file URLs from server=
      const queryParams = new URLSearchParams();
      queryParams.set('message', trimmedInput);
      if (fileRefs.length > 0) {
        queryParams.set('fileRefs', JSON.stringify(fileRefs));
      }
      router.push(`/chat/${newConversationId}?${queryParams.toString()}`);
      
      setFiles(undefined);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
    } catch (error) {
      console.error("Failed to start chat:", error);
      setIsSending(false);
    }
  };

  const generateConversationId = (): string => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  };

  const uploadFiles = async (files: FileList): Promise<Array<{url: string, name: string, type: string, size: number}>> => {
    const formData = new FormData();
    
    // Append ALL files to FormData
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('File upload failed');
    }
    
    const result = await response.json();
    return result.files; 
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files || undefined);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = Array.from(files || []).filter((_, i) => i !== index);
    const dt = new DataTransfer();
    newFiles.forEach(file => dt.items.add(file));
    setFiles(dt.files);
  };

  return (
    <PagesLayout footer={""}>
      <div className="flex flex-col space-y-4 p-4">
        <div className="text-center text-gray-500 mt-10">
          <p className="text-[40px]">Start a conversation with TripMate!</p>
        </div>
        <ChatForm
          input={input}
          setInput={setInput}
          fileInputRef={fileInputRef}
          files={files}
          onFileChange={handleFileChange}
          onRemoveFile={handleRemoveFile}
          isSending={isSending}
          handleSubmit={handleSubmit}
        />
      </div>
    </PagesLayout>
  );
}