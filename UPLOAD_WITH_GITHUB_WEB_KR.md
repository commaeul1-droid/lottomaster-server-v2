# GitHub 웹 업로드 안내

Windows/브라우저에서 `.github` 폴더가 누락될 수 있습니다.

## 1. 일반 파일 업로드
저장소 루트에 다음을 업로드합니다.
- data
- scripts
- src
- tests
- package.json
- package-lock.json
- README.md
- README_KR.md
- MIGRATION_KR.md
- rc3_tables_check.sql
- .gitignore

`GITHUB_WORKFLOWS_WEB_UPLOAD` 폴더는 저장소에 올리지 않아도 됩니다. 워크플로 원본을 눈에 보이게 제공하기 위한 복사본입니다.

## 2. 워크플로 직접 생성
GitHub 저장소에서 `Add file` → `Create new file`을 누릅니다.

첫 번째 파일 이름:
`.github/workflows/update-lotto-data.yml`

내용은 `GITHUB_WORKFLOWS_WEB_UPLOAD/update-lotto-data.yml` 전체를 복사해 붙여넣고 Commit 합니다.

두 번째 파일 이름:
`.github/workflows/health-check.yml`

내용은 `GITHUB_WORKFLOWS_WEB_UPLOAD/health-check.yml` 전체를 복사해 붙여넣고 Commit 합니다.

## 3. 확인
저장소에서 아래 파일이 보여야 합니다.
- `.github/workflows/update-lotto-data.yml`
- `.github/workflows/health-check.yml`

그 후 Actions 탭에 다음 워크플로가 표시됩니다.
- LottoMaster Server V2 Update
- LottoMaster Server V2 Health Check
