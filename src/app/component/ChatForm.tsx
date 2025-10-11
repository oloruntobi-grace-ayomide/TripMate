"use client"
import { useEffect, useRef, FormEvent } from "react";
import { ChatStatus } from "ai";
import { BsPaperclip } from "react-icons/bs";

interface ChatFormProps {
    input: string;
    setInput: (value: string) => void;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef?: React.RefObject<HTMLInputElement>; 
    status?: ChatStatus;
    handleStop?: () => void;
    handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function ChatForm({ 
    input, 
    setInput, 
    onFileChange, 
    fileInputRef, 
    status = "ready", 
    handleStop, 
    handleSubmit 
}: ChatFormProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Reset height when input is cleared
    useEffect(() => {
        if (input === "" && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [input]);

    const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        target.style.height = 'auto';
        target.style.height = Math.min(target.scrollHeight, 200) + 'px'; 
    };

    const handleEnterKeySubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
        }
    };

    return (
        <form className="w-full mx-auto px-4" onSubmit={handleSubmit}>
            <div className="bg-white border border-gray-300 px-[10px] py-[10px] rounded-3xl shadow-sm hover:shadow-md transition-shadow grid grid-cols-1 gap-2">
                <textarea
                    ref={textareaRef}
                    className="scrollbar-thin px-4 pr-12 resize-none outline-none rounded-2xl overflow-y-auto text-gray-800 placeholder-gray-500 w-full max-h-[200px]"
                    placeholder="Message AI..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleEnterKeySubmit}
                    rows={1}
                    aria-label="Chat message"
                />

                <div className='flex justify-between'>
                    <label className="group relative flex justify-center items-center h-[35px] w-[35px] rounded-[50%] bg-transparent hover:bg-[#2D374812] text-[#2D3748] cursor-pointer">
                        <BsPaperclip className="text-[17px]"/>
                        <span className="absolute -top-10 hidden opacity-0 text-white text-[10px] whitespace-nowrap bg-black py-1.5 px-2.5 border border-[#3c3c3c] rounded-[5px] shadow-[0_5px_10px_rgba(0,0,0,0.596)] transition-all duration-300 group-hover:block group-hover:opacity-100">
                            Add a file
                        </span>
                        <input 
                            className="hidden" 
                            type="file" 
                            name="file" 
                            onChange={onFileChange}
                            ref={fileInputRef}
                            multiple
                            aria-label="Attach file"
                        />
                    </label>
            
                    {status === "streaming" ? (
                        <button 
                            type="button"
                            className="text-[#fff] bg-[#2D3748] rounded-[50%] h-[40px] w-[40px] font-bold text-[18px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Stop AI response"
                            onClick={handleStop}
                        >
                            <span className="streaming h-[10px] w-[10px] bg-[#fff]"></span>     
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            className="text-[#fff] bg-[#2D3748] rounded-[50%] h-[35px] w-[35px] font-bold text-[18px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={status !== "ready" || !input.trim()}
                            aria-label={
                                !input.trim() ? "Type a message to send" :
                                (status === "submitted") ? "Message sending..." :
                                "Send message"
                            }
                        >
                            {status === "submitted" ? (
                                <span className="loader"></span>
                            ) : "↑"}
                        </button>
                    )}
                </div>
            </div>
        </form>   
    );
}