# LOTTO MASTER Server V2 Build002

기존 서버가 없어도 새 GitHub 저장소에서 바로 시작할 수 있는 독립형 서버 프로젝트입니다.

## 핵심 데이터 흐름

1. 동행복권 결과 페이지 HTTP 수집
2. 실패 시 Playwright Chromium 브라우저 수집
3. 선택적으로 외부 보조 소스 확인
4. 자동 수집이 모두 실패할 때만 Emergency 수동 입력
5. 번호·보너스·회차·날짜 검증
6. `data/lotto_seed.csv`, `latest.json`, `draws.json`, `status.json` 갱신
7. Supabase `lotto_results` UPSERT
8. 변경된 데이터만 GitHub에 자동 커밋

## 폴더 역할

- `.github/workflows` — 예약 실행과 상태 점검
- `scripts` — 실행 진입 스크립트
- `src/collectors` — HTTP·브라우저·외부·수동 수집기
- `src/parsers` — 동행복권 결과 페이지 파서
- `src/validators` — 당첨 데이터 검증
- `src/storage` — CSV·JSON·Supabase 저장
- `tests` — 파서·검증 테스트
- `data` — 앱과 Supabase가 사용하는 결과 데이터

## 새 저장소 업로드

압축을 푼 뒤 `lottomaster-server-v2` 폴더 내부의 모든 파일을 새 저장소 루트에 올립니다.
`node_modules`는 포함되어 있지 않으며 올릴 필요가 없습니다.

저장소 루트에 다음 항목이 바로 보여야 합니다.

```text
.github
scripts
src
tests
data
package.json
package-lock.json
README.md
README_KR.md
```

## GitHub 설정

`Settings → Actions → General → Workflow permissions`에서 `Read and write permissions`를 선택합니다.

Actions Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOTTO_SOURCE_URLS` (선택)

## 최초 실행

`Actions → LottoMaster Server V2 Update → Run workflow`

처음에는 Emergency 입력값을 모두 비워 자동 수집을 시험합니다.

## 로컬 검사

```powershell
npm ci
npx playwright install chromium
npm test
npm run validate
npm run lint
npm run update
```
