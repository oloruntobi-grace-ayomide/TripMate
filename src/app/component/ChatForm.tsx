"use client"
import { useEffect, useState, useRef, FormEvent } from "react";
interface ChatFormProps {
    input: string;
    setInput: (value: string) => void;
    isLoading: boolean;
    isSubmitting:boolean;
    isSending?:boolean;
    handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export default function ChatForm({ input, setInput, isLoading, isSubmitting, isSending = false, handleSubmit }: ChatFormProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [hasMultipleLines, setHasMultipleLines] = useState(false);

    // Robust line detection
    useEffect(() => {
        if (textareaRef.current) {
        const lineCount = input.split('\n').length;
        const isMultiLine = lineCount > 1 || textareaRef.current.scrollHeight > textareaRef.current.clientHeight;
        setHasMultipleLines(isMultiLine);
        }
    }, [input]);

    // Reset when input is cleared
    useEffect(() => {
        if (input === "" && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        setHasMultipleLines(false);
        }
    }, [input]);

    const handleInput = (e: FormEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        
        // Auto-resize
        target.style.height = 'auto';
        target.style.height = Math.min(target.scrollHeight, 200) + 'px';
        
        // Update line count
        const lineCount = target.value.split('\n').length;
        const isMultiLine = lineCount > 1 || target.scrollHeight > target.clientHeight;
        setHasMultipleLines(isMultiLine);
  
    };

    const handleEnterKeySubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            // Create a synthetic form event
            const syntheticEvent = {
                preventDefault: () => e.preventDefault(),
                currentTarget: document.createElement('form')
            } as FormEvent<HTMLFormElement>;
            
            handleSubmit(syntheticEvent);
        }
    };

    const getButtonState = () => {
        if (isSubmitting || isSending) {
        return "submitting"; // Message sent, waiting for AI
        }
        if (isLoading) {
            return "streaming"; // AI is generating response
        }
        if (!input.trim()) {
            return "disabled"; // No input text
        }
        return "ready"; // Input ready to send
    };

    const buttonState = getButtonState();

    return (
        <form className="w-full mx-auto px-4" onSubmit={handleSubmit}>
            <div className={`bg-white border border-gray-300 px-[10px] py-[10px] rounded-3xl shadow-sm hover:shadow-md transition-shadow ${hasMultipleLines ? 'grid grid-cols-1 gap-2' : 'flex items-center'}`}>
                <textarea
                ref={textareaRef}
                className={`scrollbar-thin px-4 pr-12 resize-none outline-none rounded-2xl overflow-y-auto text-gray-800 placeholder-gray-500 ${hasMultipleLines ? 'w-full max-h-[200px]' : 'flex-1'}`}
                placeholder="Message AI..."
                value={input}
                onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onInput={handleInput}
                onKeyDown={handleEnterKeySubmit}
                rows={1}
                aria-label="Chat message"
                ></textarea>
                <button 
                type="submit"
                className={`text-[#fff] bg-[#2D3748] rounded-[50%] h-[40px] w-[40px] font-bold text-[18px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed   ${hasMultipleLines ? 'justify-self-end' : ""}`}
                disabled={buttonState !== "ready"}
                aria-label={
                    buttonState === "disabled" ? "Type a message to send" :
                    buttonState === "ready" ? "Send message" :
                    buttonState === "submitting" ? "Message sending..." :
                    "AI is responding"
                }
                >
                    {(buttonState === "disabled" || buttonState === "ready") ? (
                        "↑"
                    ) : 
                    buttonState === "submitting" ? (
                        <span className="loader"></span> // Loading spinner
                    ) : (
                        <span className="streaming h-[10px] w-[10px] bg-[#fff]"></span> // Streaming cursor
                    )}
                </button>
            </div>
        </form>   
    );
}