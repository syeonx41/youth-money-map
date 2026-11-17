# 청년머니맵

조건 입력 한 번으로 찾는 청년 맞춤형 금융상품 통합 조회 서비스

나이·소득·가구·주택 여부를 한 번 입력하면 대출·적금·청약 상품마다 **가능 / 확인 필요 / 해당 없음**을 판정하고, 조건별 이유와 중복 가입·갈아타기 안내를 보여줘요. 로그인 없이 쓰고 입력 정보는 저장하지 않아요.

- **접속 주소**: https://youth-money-map.vercel.app (휴대폰 화면에 맞춘 모바일 웹이에요)
- **시연 영상**: https://youtube.com/shorts/kbqA6HGD_BQ
- **결과보고서**: [docs/report.md](./docs/report.md) (제출 양식: [docs/report.docx](./docs/report.docx))

## 주요 기능

| 기능 | 내용 |
|---|---|
| 조건 입력 5단계 | 나이(생년월일·지역·병역) → 소득(연소득·취업 상태) → 가구 → 주택 → 가입 중인 상품. 생년월일 말고는 모두 '모름'으로 넘어갈 수 있어요 |
| 맞춤 판정 + 이유 | 상품 7개(대출 3·적금 2·청약·주거 2)마다 가능 / 확인 필요 / 해당 없음과 조건별 이유, 공고 원문을 보여줘요 |
| 탭별 결과 비교 | 대출·적금·청약·주거 탭에서 가능한 상품부터 보여주고, 상태별로 걸러 볼 수 있어요 |
| 중복 가입·갈아타기 | 동시에 가입할 수 없는 상품은 경고 띠와 '가능 · 전환 필요'로 알려주고, 상품 상세에서 갈아타는 순서를 안내해요 |
| 상품 상세 | 조건별 판정과 공고 원문, 금리·정부 지원, 신청 일정, 공식 신청처·출처·정보 기준일을 보여줘요 |
| AI에게 물어보기 | 보고 있는 상품의 판정 결과와 공고 원문만 근거로 AI(Gemini)가 쉬운 말로 답해요. 근거 문장은 원문과 대조해 실제 있는 문장만 보여줘요 |

## 사용 방법 (작동 방법)

1. 접속 주소에서 **내 조건으로 찾기**를 눌러요. 첫 화면의 대출·적금·청약 버튼으로 시작하면 결과 화면에서 그 탭이 먼저 열려요.
2. 1~5단계에 조건을 넣고 **다음**을 눌러요. 모르는 항목은 '모름'을 고르면 '확인 필요'로 표시돼요.
   - 예시: 생년월일 `19990315`, 서울, 병역 해당 없음 → 연소득 `3000`, 중소기업 재직 → 1인 가구 → 무주택·세대주·월세 → 가입한 상품 없음
3. **결과 보기**를 누르면 탭별로 상품 카드가 나와요. 상태 칩(가능·확인 필요·해당 없음)을 눌러 걸러 볼 수 있어요.
4. 카드를 누르면 상품 상세로 가요. 조건별 판정 이유와 공고 원문, 신청 일정을 보고 **공식 신청처로 이동**할 수 있어요.
5. **AI에게 물어보기**에서 궁금한 점을 물어보면 판정 결과와 공고 원문을 근거로 답해요. 개인정보(주민번호·계좌번호)는 입력하지 마세요.
6. 조건을 바꾸려면 결과 화면의 **조건 수정**을 눌러요. 입력한 내용은 새로고침하면 사라져요(저장하지 않아요).

## 실행 방법 (개발 환경)

```bash
npm install
cp .env.example .env   # GEMINI_API_KEY 에 챗봇용 Gemini API 키 입력 (없으면 챗봇만 안 돼요)
npm run dev            # http://localhost:3000
npm test               # 자동 테스트 (판정 엔진, 정답 프로필, 화면 모델, 챗봇 API)
```

- 판정 API를 화면 없이 확인하려면 `http://localhost:3000/dev/judge` 를 열어요.
- 배포는 Vercel이에요. Vercel 환경변수에도 `GEMINI_API_KEY` 를 같은 이름으로 넣어요.

## 테스트

- `npm test`: 자동 테스트 (2026-11-16 기준 323개 통과)
- 공고 기준 정답 프로필 20개: [정답표](./docs/test/answer-table.md), [화면 테스트 입력표](./docs/test/screen-test.md)
- 챗봇 예시 질문 10개와 배포 사이트 결과: [chatbot-questions.md](./docs/test/chatbot-questions.md)

## 기술 스택

Next.js(App Router) · TypeScript · Tailwind CSS · Vitest · Google Gemini API(챗봇) · Vercel 배포

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
| `lib/session/` | 화면 사이 입력값·판정 결과 공유(`useJudgeSession`, 메모리에만 저장, ④도 사용), 입력값 변환 | ③ |
| `lib/result/`, `lib/home/` | 결과 화면 모델(탭·필터·카드), 첫 화면 기준일 | ③ |
| `app/ui/` | 화면 공통 그림: 선 아이콘, 시·도 지도, 상품 그림 타일, 판정 3종 색 | ③ |
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
- 신규 가입 종료 상품(`newSignupClosed`) → 조건과 상관없이 **해당 없음**
- '신청 시 확인' 조건(`checkAtApply`)은 판정에 영향이 없어요 (조건 결과 `status: "checkAtApply"`)
- 중위소득 비율은 반올림 전 값으로 비교하고, 문구에서만 반올림해요

## ② 상품 데이터 추가 방법

1. `data/products.json` 에 상품을 추가해요. 형식은 `types.ts` 의 `Product`.
2. 조건 종류: `age`, `personalIncome`, `householdIncomeRatio`, `householdIncome`, `noHouse`, `householdHead`, `employment`, `region`, `residence`, `checkAtApply`
   - 중위소득 하한이 있으면 `householdIncomeRatio` 에 `minPercent` 를 넣어요. 하한은 "초과"예요. (예: 48% 초과~150% 이하 → `minPercent: 48, maxPercent: 150`)
   - 순자산·보증금·면적처럼 입력받지 않는 조건은 `checkAtApply` 로 넣어요. 판정에는 영향이 없고 화면에 "신청할 때 확인돼요"로 보여줘요. `description` 에 화면 문구를 적어요.
3. 동시 가입이 안 되는 상품은 **양쪽 모두** `exclusiveWith` 에 적어요.
   - 신규 가입이 끝난 상품은 `"newSignupClosed": true` 와 `signupClosedNote` 를 넣어요. 판정은 '해당 없음'이지만 결과 목록과 갈아타기 안내에는 계속 쓰여요.
4. `npm test` 를 돌리면 형식 오류를 알려줘요.
5. 실제 공고로 바꾼 상품은 `isSample` 을 지워요.

## 주의

- API 키는 `.env` 에만 넣고 GitHub에 올리지 않아요.
- 판정 결과는 참고용이에요. 최종 자격은 각 신청처 심사로 확정돼요.
