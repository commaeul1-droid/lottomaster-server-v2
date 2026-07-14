# LottoMaster Server V2

동행복권 최신 결과 수집, 검증, GitHub 데이터 생성, Supabase 동기화를 한 프로젝트로 통합한 서버입니다.

## 수집 순서

1. 수동 긴급 입력(입력한 경우에만)
2. `LOTTO_SOURCE_URLS` 외부 보조 소스
3. 동행복권 신규 결과 페이지 HTTP
4. Playwright Chromium 브라우저

모든 수집 경로가 실패하면 기존 CSV/JSON은 절대 변경하지 않습니다.

## 생성 파일

- `data/lotto_seed.csv`: 전체 분석 데이터
- `data/latest.json`: 앱 최신 회차 확인용
- `data/draws.json`: 앱 GitHub fallback용 전체 데이터
- `data/status.json`: 수집/검증 상태

## GitHub 적용

새 저장소 `lottomaster-server-v2`를 만들고 이 ZIP 내용을 루트에 업로드하세요. 저장소 Settings → Actions → General → Workflow permissions에서 **Read and write permissions**를 선택합니다.

Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOTTO_SOURCE_URLS` (선택, 줄바꿈 또는 쉼표로 복수 URL)

Actions → `LottoMaster Server V2 Update` → Run workflow로 첫 실행합니다. 회차/번호 입력란은 자동 수집 전체 실패 시에만 쓰는 Emergency Recovery입니다.

## 로컬 검사

```bash
npm ci
npx playwright install chromium
npm test
npm run validate
npm run collect
```

## 앱용 Raw URL

```text
https://raw.githubusercontent.com/<OWNER>/lottomaster-server-v2/main/data/latest.json
https://raw.githubusercontent.com/<OWNER>/lottomaster-server-v2/main/data/draws.json
```

앱 조회 우선순위는 `Supabase → draws.json → 기기 캐시`를 권장합니다.
