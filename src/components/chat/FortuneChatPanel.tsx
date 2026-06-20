'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, AlertTriangle, ChevronUp } from 'lucide-react';
import type { ChatMessage } from '@/schemas/chat.schema';

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

interface FortuneChatPanelProps {
  chartData: unknown;
  personalContext: unknown;
  forecastSummary: string;
  forecastId: string;
}

// ─────────────────────────────────────────────────────────
// Quick‑question chips
// ─────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  '사업 관련 더 자세히',
  '건강 조언 부탁해요',
  '이번 주 전략은?',
  '관계 관련 조언',
] as const;

const MAX_TURNS = 20;

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function FortuneChatPanel({
  chartData,
  personalContext,
  forecastSummary,
  forecastId,
}: FortuneChatPanelProps) {
  // --- state ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);

  // refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // auto‑scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  // focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ───────────────────────── turn counter ──────────────────
  const userTurnCount = messages.filter((m) => m.role === 'user').length;
  const turnsRemaining = MAX_TURNS - userTurnCount;
  const isAtLimit = turnsRemaining <= 0;

  // ───────────────────────── send message ──────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || isAtLimit) return;

      const userMsg: ChatMessage = {
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsStreaming(true);
      setStreamingText('');
      setSafetyWarning(null);

      // Build request body (schema‑validated on server)
      const chatRequest = {
        forecastId,
        message: text.trim(),
        history: messages, // previous history (before this message)
        chartData,
        personalContext,
        forecastSummary,
      };

      try {
        const response = await fetch('/api/forecast/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatRequest),
        });

        // Handle JSON response (safety redirect / error)
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          if (json.safetyFlag === 'CRISIS_REDIRECT') {
            setSafetyWarning(json.reply);
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: json.reply, timestamp: new Date().toISOString() },
            ]);
            setIsStreaming(false);
            return;
          }
          if (json.error) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `⚠️ ${json.error}`, timestamp: new Date().toISOString() },
            ]);
            setIsStreaming(false);
            return;
          }
        }

        // Handle SSE stream
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line

          let eventName = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventName = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (eventName === 'token') {
                  fullText += data.token;
                  setStreamingText(fullText);
                } else if (eventName === 'done') {
                  if (data.safetyFlag) {
                    setSafetyWarning(
                      '⚠️ 일부 표현이 결정론적 경계를 초과했을 수 있습니다. 참고 목적으로만 활용해주세요.',
                    );
                  }
                } else if (eventName === 'error') {
                  fullText = `⚠️ ${data.message || 'Error'}`;
                  setStreamingText(fullText);
                }
              } catch {
                /* ignore malformed JSON */
              }
            }
          }
        }

        // Add completed assistant message
        if (fullText) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: fullText, timestamp: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error';
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ 오류가 발생했습니다: ${errorMsg}`, timestamp: new Date().toISOString() },
        ]);
      } finally {
        setStreamingText('');
        setIsStreaming(false);
      }
    },
    [isStreaming, isAtLimit, messages, forecastId, chartData, personalContext, forecastSummary],
  );

  // ───────────────────────── keyboard submit ───────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ───────────────────────── render ────────────────────────
  return (
    <>
      {/* ─── Collapsed toggle button ─── */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl
            bg-indigo-600/80 hover:bg-indigo-500/80 backdrop-blur-md
            text-white text-sm font-medium shadow-lg shadow-indigo-500/20
            transition-all duration-200 hover:scale-105"
        >
          <MessageCircle className="w-4 h-4" />
          <span>운세 코치에게 질문하기</span>
          {userTurnCount > 0 && (
            <span className="ml-1 text-xs text-indigo-200/80">
              {userTurnCount}/{MAX_TURNS}
            </span>
          )}
        </button>
      )}

      {/* ─── Expanded chat panel ─── */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50
            w-full sm:w-[400px] h-[70vh] sm:h-[520px] max-h-[90vh]
            flex flex-col
            bg-zinc-900/30 backdrop-blur-md
            border border-zinc-800/80 rounded-t-2xl sm:rounded-2xl
            shadow-2xl shadow-black/40"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-zinc-200">운세 코치에게 질문하기</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {userTurnCount}/{MAX_TURNS}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages area ── */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Empty state */}
            {messages.length === 0 && !streamingText && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                <ChevronUp className="w-6 h-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">
                  오늘의 운세 결과에 대해 궁금한 점을 질문해보세요.
                </p>
                <p className="text-xs text-zinc-600">
                  사주 차트와 운세 데이터 기반으로 맞춤 답변을 드립니다.
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                    ${
                      msg.role === 'user'
                        ? 'bg-indigo-600/30 text-indigo-100 rounded-br-md'
                        : 'bg-zinc-800/50 text-zinc-200 rounded-bl-md'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Streaming text (live) */}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-zinc-800/50 text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-400/60 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Streaming indicator (no text yet) */}
            {isStreaming && !streamingText && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-zinc-800/50">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Safety warning ── */}
          {safetyWarning && (
            <div className="mx-4 mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/90 leading-relaxed">{safetyWarning}</p>
            </div>
          )}

          {/* ── Quick question chips ── */}
          {messages.length === 0 && !isStreaming && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full text-xs
                      bg-zinc-800/60 hover:bg-zinc-700/60
                      text-zinc-300 hover:text-zinc-100
                      border border-zinc-700/40 hover:border-zinc-600/50
                      transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input area ── */}
          <div className="px-4 py-3 border-t border-zinc-800/60">
            {isAtLimit ? (
              <div className="text-center py-2">
                <p className="text-xs text-zinc-500">
                  대화 제한에 도달했습니다 ({MAX_TURNS}턴). 새 운세를 생성하면 대화가 초기화됩니다.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? '응답 중...' : '질문을 입력하세요...'}
                  disabled={isStreaming}
                  maxLength={500}
                  className="flex-1 px-3.5 py-2.5 rounded-xl text-sm
                    bg-zinc-950/80 border border-zinc-800/60
                    text-zinc-200 placeholder:text-zinc-600
                    focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                    disabled:opacity-50 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="p-2.5 rounded-xl
                    bg-indigo-600/70 hover:bg-indigo-500/70
                    disabled:bg-zinc-800/40 disabled:text-zinc-600
                    text-white transition-all duration-150"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
