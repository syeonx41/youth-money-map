"use client";
// ④ 챗봇 화면 본문
// - 판정 결과는 ③ 공유 세션에서 꺼내 판정 결과만 API에 보내요 (입력 원본은 보내지 않아요)
// - 대화는 이 화면 메모리에만 있어요. 나가거나 새로고침하면 사라져요
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProduct } from "@/lib/data";
import { useJudgeSession } from "@/lib/session/judge-session";
import { CHAT_LIMITS, type ChatCitation, type ChatReply, type ChatRequest, type ChatTurn } from "../api/chat/contract";
import { ChevronLeftIcon, ExternalIcon, InfoIcon, LockIcon } from "../ui/icons";
import { suggestedQuestions } from "./suggestions";

interface Message extends ChatTurn {
  citations?: ChatCitation[];
  /** 오류 안내 (API에 다시 보내지 않아요) */
  error?: boolean;
}

export default function ChatView({ productId }: { productId: string | null }) {
  const router = useRouter();
  const { result } = useJudgeSession();
  const product = productId ? (getProduct(productId) ?? null) : null;
  const judgement = product ? (result?.results.find((r) => r.productId === product.id) ?? null) : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [followUps, setFollowUps] = useState<string[]>(() => suggestedQuestions(product, judgement));
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const contextLine = product
    ? `보고 있던 상품: ${product.name}${judgement ? " · 내 판정 결과 반영" : " · 판정 결과 없음"}`
    : result
      ? "전체 조회 결과 기준"
      : "판정 결과 없음";

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages(history);
    setDraft("");
    setFollowUps([]);
    setLoading(true);

    const body: ChatRequest = {
      productId: product?.id ?? null,
      judgements: product ? (judgement ? [judgement] : []) : (result?.results ?? []),
      messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errors?.[0] ?? "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요");
      const reply = data as ChatReply;
      setMessages((prev) => [...prev, { role: "assistant", content: reply.answer, citations: reply.citations }]);
      setFollowUps(reply.followUps);
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : "답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요";
      setMessages((prev) => [...prev, { role: "assistant", content: message, error: true }]);
      setFollowUps(suggestedQuestions(product, judgement));
    } finally {
      setLoading(false);
    }
  }

  const tooLong = draft.length > CHAT_LIMITS.questionMaxLength;

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-3 pb-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 items-center gap-0.5 justify-self-start rounded-lg pr-2 text-sm text-ink-soft"
          >
            <ChevronLeftIcon size={20} />
            닫기
          </button>
          <h1 className="text-base font-semibold text-ink">AI에게 물어보기</h1>
          <span />
        </div>
        <p className="truncate px-5 pb-2.5 text-center text-xs text-ink-mute">{contextLine}</p>
      </header>

      <main className="flex flex-1 flex-col gap-3 overflow-y-auto bg-sea px-4 py-4" aria-live="polite">
        <Bubble role="assistant">
          {product
            ? `안녕하세요! ${product.name}의 조건, 혜택, 신청 일정, 갈아타기에 대해 공고 원문을 기준으로 답해 드려요.`
            : "안녕하세요! 조회한 상품의 조건, 혜택, 신청 일정에 대해 공고 원문을 기준으로 답해 드려요."}
          {!result && (
            <span className="mt-2 block text-ink-soft">
              아직 내 조건으로 조회하지 않아서 가능 여부는 알려드릴 수 없어요.{" "}
              <Link href="/input" className="font-semibold text-go underline">
                조건 입력하기
              </Link>
            </span>
          )}
        </Bubble>

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} error={m.error}>
            {m.content}
            {m.citations && m.citations.length > 0 && <Citations citations={m.citations} />}
            {m.role === "assistant" && !m.error && product && (
              <a
                href={product.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-fit items-center gap-1 text-xs font-semibold text-go underline"
              >
                공식 신청처에서 확인하기
                <ExternalIcon size={13} />
              </a>
            )}
          </Bubble>
        ))}

        {loading && (
          <Bubble role="assistant">
            <span className="text-ink-mute">답변을 만들고 있어요…</span>
          </Bubble>
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {followUps.length > 0 && !loading && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {followUps.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="min-h-9 rounded-full bg-white px-3.5 text-sm text-ink ring-1 ring-inset ring-line active:bg-sea"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!tooLong) send(draft);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">
            질문 입력
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!tooLong) send(draft);
              }
            }}
            placeholder="궁금한 점을 입력하세요"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl px-4 py-3 text-[15px] text-ink ring-1 ring-inset ring-line outline-none focus:ring-2 focus:ring-go"
          />
          <button
            type="submit"
            disabled={loading || draft.trim() === "" || tooLong}
            className="h-12 shrink-0 rounded-2xl bg-ink px-4 font-semibold text-white disabled:opacity-40"
          >
            전송
          </button>
        </form>
        {tooLong && <p className="mt-1.5 text-xs text-bad">질문은 {CHAT_LIMITS.questionMaxLength}자까지 쓸 수 있어요.</p>}
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-mute">
          <LockIcon size={13} className="mt-px" />
          AI 답변은 참고용이에요. 대화 내용은 저장하지 않아요. 주민번호·계좌번호 같은 개인정보는 입력하지 마세요.
        </p>
      </footer>
    </div>
  );
}

function Bubble({ role, error, children }: { role: ChatTurn["role"]; error?: boolean; children: React.ReactNode }) {
  if (role === "user") {
    return (
      <div className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white">
        {children}
      </div>
    );
  }
  return (
    <div
      className={`max-w-[92%] self-start rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
        error ? "bg-bad-soft text-bad" : "bg-white text-ink ring-1 ring-inset ring-line"
      }`}
    >
      {children}
    </div>
  );
}

function Citations({ citations }: { citations: ChatCitation[] }) {
  return (
    <details className="group mt-2.5 whitespace-normal">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-ink-soft">
        <InfoIcon size={14} />
        근거 {citations.length}개 보기
      </summary>
      <ul className="mt-1.5 flex flex-col gap-2">
        {citations.map((c) => (
          <li key={`${c.label}-${c.quote}`} className="rounded-xl bg-sea px-3 py-2 text-xs">
            <p className="font-semibold text-ink-soft">{c.label}</p>
            <p className="mt-0.5 text-ink-soft">“{c.quote}”</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
