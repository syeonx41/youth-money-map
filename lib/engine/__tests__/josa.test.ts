import { describe, expect, it } from "vitest";
import { withJosa } from "../josa";
import { findConflicts } from "../judge";
import { SAVING_NEW, SAVING_OLD, profile } from "./fixtures";

describe("받침에 맞는 조사", () => {
  it("받침 없음 → 와", () => {
    expect(withJosa("청년도약계좌", "과", "와")).toBe("청년도약계좌와");
  });
  it("받침 있음 → 과", () => {
    expect(withJosa("청년미래적금", "과", "와")).toBe("청년미래적금과");
  });
  it("한글이 아니면 받침 없는 쪽", () => {
    expect(withJosa("상품 B", "과", "와")).toBe("상품 B와");
  });
});

describe("중복 가입 경고 문구", () => {
  it("받침 없는 상품 이름에는 '와'를 붙여요", () => {
    const old = { ...SAVING_OLD, name: "청년도약계좌" };
    const [conflict] = findConflicts(SAVING_NEW, profile({ ownedProductIds: ["saving-old"] }), [SAVING_NEW, old]);
    expect(conflict.message).toBe("가입 중인 청년도약계좌와 동시에 가입할 수 없어요. 갈아타려면 순서를 꼭 확인하세요");
  });
});
