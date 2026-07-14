LottoMaster Server V2 Build004 - npm registry fix

원인:
기존 package-lock.json의 resolved 주소가 GitHub에서 접근할 수 없는 OpenAI 내부 Artifactory 주소로 생성되어 있었습니다.
GitHub Actions의 npm ci가 해당 주소를 기다리다가 "Exit handler never called"로 종료되었습니다.

교체 파일:
1. package-lock.json
2. .github/workflows/health-check.yml
3. .github/workflows/update-lotto-data.yml

적용:
저장소의 같은 경로에 세 파일을 덮어쓰고 Commit합니다.
그 뒤 Actions > LottoMaster Server V2 Health > Run workflow를 새로 실행합니다.
기존 실패 실행의 Re-run jobs가 아니라 새 Run workflow를 사용하세요.

정상 예상 시간:
npm ci 10~60초, 전체 Health 1~2분.
