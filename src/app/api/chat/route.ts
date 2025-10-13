import { createGatewayProvider } from "@ai-sdk/gateway";
import { streamText, UIMessage, convertToModelMessages, tool, ModelMessage, stepCountIs } from "ai";
import { z } from "zod";
import { fetchWeather } from "@/app/lib/fetchWeather";
import { setHistory, getHistory } from "@/app/lib/store";
import { TripCard, PackingList } from "@/app/lib/schemas";

const gatewayProvider = createGatewayProvider({
    apiKey: process.env.AI_GATEWAY_API_KEY
})

interface RequestBody {
  messages: UIMessage[];
  conversationId?: string | null;
}

const isTravelRelated = (input: string): boolean => {
    const travelKeywords = [
      'travel', 'trip', 'vacation', 'holiday', 'destination', 'city', 'country',
      'hotel', 'flight', 'packing', 'luggage', 'itinerary', 'tour', 'sightseeing',
      'beach', 'mountain', 'weather', 'climate', 'visa', 'passport', 'currency',
      'local', 'culture', 'food', 'restaurant', 'accommodation', 'transport',
      'safety', 'insurance', 'budget', 'plan', 'recommend', 'visit', 'go to',
      'best time', 'what to see', 'things to do', 'where to stay', 'how to get'
    ];
    
    const inputLower = input.toLowerCase();
    return travelKeywords.some(keyword => inputLower.includes(keyword));
};
  
const getOutOfScopeResponse = (): string => {
const responses = [
    "I specialize in travel planning and destination advice. How can I help with your travel questions?",
    "As your travel companion, I focus on trips, destinations, and travel planning. What travel plans can I assist with?",
    "I'm here to help with travel-related questions like trip planning, packing, and destination advice. How can I assist with your travel needs?",
    "Let's focus on travel! I can help you plan trips, suggest destinations, or create packing lists.",
];
return responses[Math.floor(Math.random() * responses.length)];
};

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

        const lastMessage = modelMessages[modelMessages.length - 1];
        if (lastMessage && typeof lastMessage.content === 'string') {
            const userInput = lastMessage.content.toLowerCase();
            if (!isTravelRelated(userInput)) {
                return new Response(JSON.stringify({
                    type: 'text',
                    text: getOutOfScopeResponse()
                }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-conversation-id': finalConversationId,
                    },
                });
            }
        }

        const response = streamText({
            model: gatewayProvider("openai/gpt-4o"),
            system: `TripMate: Travel planning - destinations, itineraries, packing, local info.
            Bounds: No medical/financial/legal advice. Redirect off-topic queries.
            Style: Practical travel help with structured tools when relevant.`,
            messages: [...prior.slice(-20), ...modelMessages],
            onChunk({ chunk }) {
                if (chunk.type === 'reasoning-delta') {
                    console.log("Reasoning:", chunk.text);
                }
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
                            return data;
                        } catch (error) {
                            console.error("Weather fetch error:", error);
                            return { error: "Failed to fetch weather data" };
                        }
                    },
                }),
                create_trip_card: tool({
                    description: "Create a structured trip recommendation card with packing advice and cautions",
                    inputSchema: TripCard,
                    execute({ city, summary, packingAdvice, cautions }) {
                        return {
                            city,
                            summary,
                            packingAdvice,
                            cautions,
                            createdAt: new Date().toISOString()
                        };
                    },
                }),
                create_packing_list: tool({
                    description: "Create a detailed packing list with reasons for each item",
                    inputSchema: z.object({
                        items: PackingList.describe('Array of packing items with reasons')
                    }),
                    execute({items}) {
                        return {
                            items,
                            totalItems: items.length,
                            createdAt: new Date().toISOString()
                        };
                    },
                })
            },
            toolChoice: "auto",
            stopWhen: stepCountIs(10),
            onFinish({ response, totalUsage }) {
                const generated = response.messages;
                setHistory(finalConversationId, [...prior, ...modelMessages, ...generated]);
                console.log('[totalUsage]', totalUsage);
            },
            onError({ error }) {
                console.error("Stream Error: ", error);
            },
        });

        return response.toUIMessageStreamResponse({
            originalMessages: messages,
            headers: {
                'x-conversation-id': finalConversationId,
            },
        });
        
    } catch (error) {
        console.error("API Route Error:", error);
        return new Response(JSON.stringify(
            { 
                error: "Chat service temporarily unavailable",
                details: error instanceof Error ? error.message : "Unknown error"
            }
        ), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}


