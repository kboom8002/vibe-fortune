import { NextRequest } from 'next/server';
import { checkInputSafety, checkOutputSafety } from '@/lib/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { birthProfile, vibeData, personalContext, focusDomain, rlhfBias, userMessage } = body;

  // Create ReadableStream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // 0. Safety Gate — check user input before any LLM call (AGENTS.md §8)
        const combinedInput = [
          userMessage,
          vibeData?.oneLineEvent,
          typeof personalContext === 'string' ? personalContext : JSON.stringify(personalContext || ''),
        ]
          .filter(Boolean)
          .join(' ');
        const inputSafety = checkInputSafety(combinedInput);
        if (!inputSafety.safe) {
          const blockMsg =
            inputSafety.flags[0]?.message ||
            '안전 경계 정책에 의해 요청이 차단되었습니다. 전문 상담기관(자살예방상담전화 1393)에 연락하시기 바랍니다.';
          send('token', { token: blockMsg });
          send('summary', { text: blockMsg, safetyFlags: inputSafety.flags });
          send('done', { timestamp: new Date().toISOString(), safetyFlags: inputSafety.flags });
          controller.close();
          return;
        }

        // 1. Import deterministic chart calculation modules
        const { calculateChart, calculateDailyLuckRange, calculateMonthlyLuck, calculateAnnualLuck } =
          await import('@/lib/manse');

        // 2. Calculate chart (deterministic — all chart logic in manse engine, never LLM)
        const today = new Date();
        const localDateStr = today.toISOString().split('T')[0];
        const chartResult = calculateChart(birthProfile);

        let dailyLuck = null;
        let monthlyLuck = null;
        let annualLuck = null;
        try {
          const dailyRange = calculateDailyLuckRange({
            from: localDateStr,
            to: localDateStr,
            timezone: birthProfile.timezone || 'Asia/Seoul',
          });
          dailyLuck = dailyRange.days[0] || null;
        } catch { /* ignore */ }
        try {
          monthlyLuck = calculateMonthlyLuck({
            year: today.getFullYear(),
            month: today.getMonth() + 1,
          });
        } catch { /* ignore */ }
        try {
          annualLuck = calculateAnnualLuck({ year: today.getFullYear() });
        } catch { /* ignore */ }

        send('chart', { chartResult, dailyLuck, monthlyLuck, annualLuck });

        // 3. Check if LLM is available
        const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          send('error', { message: 'No LLM API key configured' });
          controller.close();
          return;
        }

        // 4. Build prompt for streaming
        const fs = await import('fs');
        let systemPromptFile = 'You are TCO-Vibe Fortune Coach.';
        try {
          systemPromptFile = fs.readFileSync(process.cwd() + '/prompts/system.md', 'utf-8');
        } catch { /* use default */ }

        let forecastPromptFile = '';
        try {
          forecastPromptFile = fs.readFileSync(process.cwd() + '/prompts/forecast_writer.md', 'utf-8');
        } catch { /* use default */ }

        const contextData = {
          chartResult: {
            dayMaster: chartResult.dayMaster,
            pillars: chartResult.pillars,
            tenGods: chartResult.tenGods,
            fiveElementDistribution: chartResult.fiveElementDistribution,
          },
          dailyLuck,
          monthlyLuck,
          annualLuck,
          vibeData,
          personalContext,
          focusDomain,
          rlhfBias,
        };

        const userPrompt = `${forecastPromptFile}\n\n---\n## 입력 데이터\n${JSON.stringify(contextData, null, 2)}`;

        // 5. Stream LLM response using LangChain
        const provider = process.env.GOOGLE_API_KEY ? 'google' : 'openai';
        const model = process.env.GOOGLE_API_KEY
          ? (process.env.GOOGLE_MODEL || 'gemini-2.5-flash')
          : (process.env.OPENAI_MODEL || 'gpt-6-luna');

        const { SystemMessage, HumanMessage } = await import('@langchain/core/messages');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let llm: any;

        if (provider === 'google') {
          // @ts-ignore — optional dependency, only loaded when Google provider is configured
          const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
          llm = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY!,
            model,
            temperature: 0.3,
            streaming: true,
          });
        } else {
          const { ChatOpenAI } = await import('@langchain/openai');
          llm = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY!,
            modelName: model,
            temperature: 0.3,
            streaming: true,
          });
        }

        const streamResponse = await llm.stream([
          new SystemMessage(systemPromptFile),
          new HumanMessage(userPrompt),
        ]);

        let fullText = '';
        for await (const chunk of streamResponse) {
          const token = typeof chunk.content === 'string' ? chunk.content : '';
          if (token) {
            fullText += token;
            send('token', { token });
          }
        }

        // 6. Safety Boundary Review on output before sending final summary (AGENTS.md §8)
        const outputSafety = checkOutputSafety(fullText);
        const safeText = outputSafety.sanitizedOutput ?? fullText;
        const safetyFlags = [...inputSafety.flags, ...outputSafety.flags];

        send('summary', { text: safeText, safetyFlags });
        send('done', { timestamp: new Date().toISOString(), safetyFlags });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Stream error';
        send('error', { message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
