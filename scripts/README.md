# scripts

GitHub Actions나 로컬 명령에서 직접 실행하는 진입 파일입니다.
실제 수집·파싱·검증·저장 로직은 `src/`에 역할별로 분리되어 있습니다.

- `update_lotto_data.js` — 수집 → 검증 → 파일 생성 → Supabase 동기화
- `fetch_latest_draw.js` — 수집·파일 생성만 수행
- `sync_supabase.js` — 기존 CSV를 Supabase에 동기화
- `validate_data.js` — CSV와 JSON 데이터 검증
- `health_check.js` — 최신 데이터 상태 점검
