# 기존 서버에서 V2로 이전

1. 새 GitHub 저장소 `lottomaster-server-v2` 생성
2. 본 패키지 전체 업로드
3. 기존 `lotto_seed.csv`는 이미 포함되어 있으므로 유지
4. Actions 쓰기 권한 설정
5. Supabase Secrets 등록
6. Update workflow 수동 실행
7. `data/latest.json`, `data/draws.json`, Supabase `lotto_results` 확인
8. 확인 후 Flutter 앱의 GitHub fallback 주소를 새 저장소 Raw URL로 변경

기존 저장소는 V2 검증 완료 전까지 삭제하지 마세요.
