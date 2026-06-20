import { NextRequest, NextResponse } from 'next/server';
import { ChatRequestSchema } from '@/schemas/chat.schema';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { message, history, chartData, personalContext, forecastSummary } = parsed.data;

    // Check LLM availability
    const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM not available' }, { status: 503 });
    }

    // Safety gate: check message for crisis patterns (AGENTS.md §8)
    const dangerousPatterns = [
      /자살|자해/i,
      /약물.*과다/i,
      /어떻게.*죽/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(message)) {
        return NextResponse.json({
          reply:
            '이 주제에 대해서는 전문 상담사와 상의하시기 바랍니다. 자살예방상담전화: 1393, 정신건강위기상담전화: 1577-0199',
          safetyFlag: 'CRISIS_REDIRECT',
        });
      }
    }

    // Build chat system prompt
    const systemPrompt = `당신은 TCO-Vibe 운세 코치입니다. 사용자의 사주 차트와 오늘의 운세 결과를 기반으로 후속 질문에 답변합니다.

## 핵심 규칙
- 모든 답변은 사주 차트 데이터와 TCO-Vibe 이론에 근거해야 합니다
- 결정론적 예언 금지 ("반드시", "확실히" 사용 금지)
- 의학/법률/투자 최종 판단 금지
- 답변은 한국어로, 200~400자 이내
- 사용자의 자율적 판단을 존중하세요

## 컨텍스트
### 사주 차트
${chartData ? JSON.stringify(chartData, null, 1) : '차트 데이터 없음'}

### 개인 맥락
${personalContext ? JSON.stringify(personalContext, null, 1) : '맥락 없음'}

### 오늘의 운세 요약
${forecastSummary || '운세 요약 없음'}`;

    // Build messages array
    const { SystemMessage, HumanMessage, AIMessage } = await import('@langchain/core/messages');
    const messages: (InstanceType<typeof SystemMessage> | InstanceType<typeof HumanMessage> | InstanceType<typeof AIMessage>)[] = [
      new SystemMessage(systemPrompt),
    ];

    for (const msg of history) {
      if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
      else messages.push(new AIMessage(msg.content));
    }
    messages.push(new HumanMessage(message));

    // Create SSE stream for chat response
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          const isGoogle = !!process.env.GOOGLE_API_KEY;
          let llm: any;

          if (isGoogle) {
            // @ts-ignore — optional dependency
            const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
            llm = new ChatGoogleGenerativeAI({
              apiKey: process.env.GOOGLE_API_KEY!,
              model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
              temperature: 0.4,
              streaming: true,
            });
          } else {
            const { ChatOpenAI } = await import('@langchain/openai');
            llm = new ChatOpenAI({
              openAIApiKey: process.env.OPENAI_API_KEY!,
              modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              temperature: 0.4,
              streaming: true,
            });
          }

          const streamResponse = await llm.stream(messages);
          let fullText = '';

          for await (const chunk of streamResponse) {
            const token = typeof chunk.content === 'string' ? chunk.content : '';
            if (token) {
              fullText += token;
              send('token', { token });
            }
          }

          // Post-safety check on output (AGENTS.md §4 — no deterministic predictions)
          const forbiddenOutput = ['반드시 성공', '확실히 이루어', '100% 보장'];
          let safetyFlag: string | null = null;
          for (const pattern of forbiddenOutput) {
            if (fullText.includes(pattern)) {
              safetyFlag = 'DETERMINISTIC_REWRITE';
              break;
            }
          }

          send('done', { fullText, safetyFlag });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Chat error';
          send('error', { message: errorMessage });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
