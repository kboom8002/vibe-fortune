import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  forecastId: z.string(),
  message: z.string().max(500),
  history: z.array(ChatMessageSchema).max(20), // 20 turn limit
  chartData: z.any().optional(),
  personalContext: z.any().optional(),
  forecastSummary: z.string().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
