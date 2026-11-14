"use client";
/**
 * 공유 판정 세션 (③ 입력·결과, ④ 상세·챗봇이 함께 써요)
 *
 * - 값은 React 메모리에만 있어요. 새로고침하면 사라져요.
 * - 개인정보 원칙(AGENTS.md 1-2): localStorage·sessionStorage·URL·서버 로그에 남기지 않아요.
 *
 * 사용 예 (④)
 *   const { input, result } = useJudgeSession();
 *   if (!result) → "다시 입력해 주세요" 안내
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { JudgeResponse, ProductCategory, UserInput } from "@/types";
import { EMPTY_DRAFT, type InputDraft } from "./input-draft";

export interface JudgeSession {
  /** 입력 화면 선택값. 조건 수정으로 돌아와도 남아 있어요 */
  draft: InputDraft;
  /** 선택값 일부 바꾸기. 예: updateDraft({ birthDigits: "19990315" }) */
  updateDraft: (patch: Partial<InputDraft>) => void;
  /** 판정에 보낸 입력값. 판정 전이면 null */
  input: UserInput | null;
  /** 판정 결과. 판정 전이거나 새로고침했으면 null */
  result: JudgeResponse | null;
  /** 판정 성공 후 입력값과 결과를 함께 넣어요 */
  setJudged: (input: UserInput, result: JudgeResponse) => void;
  /** 첫 화면에서 고른 탭. 결과 화면에서 먼저 열어요. 안 골랐으면 null */
  preferredTab: ProductCategory | null;
  setPreferredTab: (tab: ProductCategory | null) => void;
}

const JudgeSessionContext = createContext<JudgeSession | null>(null);

export function JudgeSessionProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<InputDraft>(EMPTY_DRAFT);
  const [judged, setJudgedState] = useState<{ input: UserInput; result: JudgeResponse } | null>(null);
  const [preferredTab, setPreferredTab] = useState<ProductCategory | null>(null);

  const updateDraft = useCallback((patch: Partial<InputDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const setJudged = useCallback((input: UserInput, result: JudgeResponse) => {
    setJudgedState({ input, result });
  }, []);

  const value = useMemo<JudgeSession>(
    () => ({
      draft,
      updateDraft,
      input: judged?.input ?? null,
      result: judged?.result ?? null,
      setJudged,
      preferredTab,
      setPreferredTab,
    }),
    [draft, updateDraft, judged, setJudged, preferredTab],
  );

  return <JudgeSessionContext.Provider value={value}>{children}</JudgeSessionContext.Provider>;
}

/** 공유 판정 세션 훅. 루트 레이아웃의 JudgeSessionProvider 안에서만 써요 */
export function useJudgeSession(): JudgeSession {
  const session = useContext(JudgeSessionContext);
  if (!session) throw new Error("useJudgeSession 은 JudgeSessionProvider 안에서만 쓸 수 있어요");
  return session;
}
