# 청년머니맵

조건 입력 한 번으로 찾는 청년 맞춤형 금융상품 통합 조회 서비스

나이·소득·가구·주택 여부를 한 번 입력하면 대출·적금·청약 상품마다 **가능 / 확인 필요 / 해당 없음**을 판정하고, 조건별 이유와 중복 가입·갈아타기 안내를 보여줘요. 로그인 없이 쓰고 입력 정보는 저장하지 않아요.

## 실행 방법

```bash
npm install
cp .env.example .env   # 챗봇 API 키 입력
npm run dev            # http://localhost:3000
npm test               # 판정 엔진 테스트
```

판정 API를 화면 없이 확인하려면 `http://localhost:3000/dev/judge` 를 열어요.

## 기술 스택

Next.js(App Router) · TypeScript · Tailwind CSS · Vitest · Vercel 배포

## 폴더 구조와 담당

| 경로 | 내용 | 담당 |
|---|---|---|
| `types.ts` | 공통 데이터 형식 (바꿀 때는 단톡 공유 먼저) | ① |
| `lib/engine/` | 판정 엔진: 조건 판정, 이유 문구, 중위소득 환산, 병역 나이, 중복 가입 | ① |
| `app/api/judge/` | `POST /api/judge` 판정 API | ① |
| `app/api/products/` | `GET /api/products` 상품 조회 | ① |
| `data/products.json` | 상품 조건표 | ② |
| `data/median-income.json` | 기준 중위소득 표 | ② |
| `lib/calc/` | 금리·수령액 계산 (추가 목표) | ② |
| `app/page.tsx`, `app/input/`, `app/result/` | 첫 화면, 조건 입력, 결과 | ③ |
| `app/products/[id]/`, `app/chat/`, `app/api/chat/` | 상품 상세, 챗봇 화면·API | ④ |
| `lib/engine/__tests__/`, `docs/` | 테스트, 계획서·보고서 | ⑤ |

브랜치·커밋·PR 규칙과 AI 활용 기록 방법은 [AGENTS.md](./AGENTS.md)를 따라요.

## API

### `POST /api/judge`

요청: `UserInput` (모름은 `null`, 빠진 항목도 `null` 처리, 금액 단위는 만원)

```json
{
  "birthDate": "1999-03-15",
  "militaryMonths": 0,
  "region": "서울",
  "annualIncome": 3000,
  "employment": "employee",
  "householdType": "single",
  "householdSize": 1,
  "householdIncome": 3000,
  "ownsHouse": false,
  "isHouseholdHead": true,
  "residence": "jeonse",
  "ownedProductIds": []
}
```

응답: `JudgeResponse` — 상품별 `status`, `summaryReason`, 조건별 `reason`·`sourceText`, `conflicts`(중복 가입·갈아타기), 탭별 `counts`

### 판정 규칙

- 조건 하나라도 미충족 → **해당 없음**
- 미충족은 없고 '모름'이 있음 → **확인 필요**
- 모든 조건 충족 → **가능**

## ② 상품 데이터 추가 방법

1. `data/products.json` 에 상품을 추가해요. 형식은 `types.ts` 의 `Product`.
2. 조건 종류: `age`, `personalIncome`, `householdIncomeRatio`, `householdIncome`, `noHouse`, `householdHead`, `employment`, `region`, `residence`
3. 동시 가입이 안 되는 상품은 **양쪽 모두** `exclusiveWith` 에 적어요.
4. `npm test` 를 돌리면 형식 오류를 알려줘요.
5. 실제 공고로 바꾼 상품은 `isSample` 을 지워요.

## 주의

- API 키는 `.env` 에만 넣고 GitHub에 올리지 않아요.
- 판정 결과는 참고용이에요. 최종 자격은 각 신청처 심사로 확정돼요.
