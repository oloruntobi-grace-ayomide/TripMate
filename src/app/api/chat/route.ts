import { createGatewayProvider } from "@ai-sdk/gateway";
import { streamText, UIMessage, convertToModelMessages, stepCountIs, tool, ModelMessage } from "ai";
import { z } from "zod";
import { fetchWeather } from "@/app/lib/fetchWeather";
import { setHistory, getHistory } from "@/app/lib/store";
// import { TripCard } from '@/app/lib/schemas';

const gatewayProvider = createGatewayProvider({
    apiKey: process.env.AI_GATEWAY_API_KEY
})

interface RequestBody {
  messages: UIMessage[];
  conversationId?: string | null;
}

export async function POST(request:Request){
    try {
        if (!process.env.AI_GATEWAY_API_KEY) {
            return new Response(JSON.stringify({ error: "API configuration error" }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const { messages, conversationId }: RequestBody = await request.json();
        const finalConversationId = conversationId || crypto.randomUUID();

        // Convert UI messages to model messages
        const modelMessages: ModelMessage[] = convertToModelMessages(messages);
        const prior: ModelMessage[] = getHistory(finalConversationId) || [];
        
        const response = streamText({
            model: gatewayProvider("openai/gpt-4o"),
            system: "You are TripMate, a smart travel companion that provides users with travel suggestions, local event updates, and real-time weather insights to help them plan better trips.",
            messages: [...prior, ...modelMessages],
            onChunk({ chunk }) {
                if (chunk.type === 'reasoning-delta') {
                    console.log("Reasoning:", chunk.text);
                }
            },
            stopWhen: stepCountIs(5),
            prepareStep: async ({ stepNumber, messages }) => {
                const lastMessage = messages[messages.length - 1];
                let userInput = '';
                
                if (typeof lastMessage.content === 'string') {
                    userInput = lastMessage.content.toLowerCase();
                } else if (Array.isArray(lastMessage.content)) {
                    userInput = lastMessage.content
                        .map(part => part.type === 'text' ? (part).text : '')
                        .join(' ')
                        .toLowerCase();
                }

                console.log(`Step ${stepNumber}, User input:`, userInput);

                if (stepNumber === 0) {
                    if (userInput.includes('weather') || userInput.includes('temperature')) {
                        return {
                            toolChoice: { type: 'tool', toolName: 'weather' },
                            activeTools: ['weather'],
                        };
                    }
                }
                
                return {
                    toolChoice: "none",
                    activeTools: ['weather'],
                };
            },
            onStepFinish({ text, toolCalls, finishReason, usage }) {
                console.log('[step done]', { text: text?.substring(0, 100), finishReason, usage });
                if (toolCalls?.length) console.log('[tool calls]', toolCalls);
            },
            onFinish({ response, totalUsage }) {
                const generated = response.messages;
                setHistory(finalConversationId, [...prior, ...modelMessages, ...generated]);
                console.log('[totalUsage]', totalUsage);
            },
            tools: {
                weather: tool({
                    description: "Get weather for a city (°C) with short forecast",
                    inputSchema: z.object({
                        location: z.string().describe('City name, e.g., "Lagos"')
                    }),
                    async execute({ location }) {
                        console.log("Fetching weather for:", location);
                        try {
                            const data = await fetchWeather(location);
                            console.log("Weather data:", data);
                            return data;
                        } catch (error) {
                            console.error("Weather fetch error:", error);
                            return { error: "Failed to fetch weather data" };
                        }
                    },
                })
            },
            onError({ error }) {
                console.error("Stream Error: ", error);
            },
        });

        const streamResponse = response.toUIMessageStreamResponse({
            originalMessages: messages,
        });
        return new Response(streamResponse.body, {
            headers: {
                ...streamResponse.headers,
                'x-conversation-id': finalConversationId,
            },
        });
        
    } catch (error) {
        console.error("API Route Error:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

