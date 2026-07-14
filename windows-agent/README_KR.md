# Windows 자동 수집 에이전트

동행복권이 GitHub 공용 Runner IP를 차단할 때 사용하는 자동 보조 수집기입니다.
사용자 PC의 일반 인터넷 회선에서 토요일마다 자동 실행하고, 새 결과가 있으면 GitHub에 커밋합니다.
GitHub의 `LottoMaster Server V2 Data Sync` 워크플로가 변경을 감지해 Supabase로 동기화합니다.

## 최초 1회 준비

1. Node.js 22 LTS와 Git을 설치합니다.
2. 저장소를 PC에 clone하고 GitHub 로그인/푸시가 되는 상태로 만듭니다.
3. PowerShell을 관리자 권한으로 열고 저장소에서 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\windows-agent\install_scheduled_task.ps1
```

기본 실행 시각은 매주 토요일 21:20입니다.

## 즉시 수동 테스트

```powershell
powershell -ExecutionPolicy Bypass -File .\windows-agent\run_update.ps1
```

로그는 저장소의 `logs` 폴더에 생성됩니다. `logs/`는 Git에 올리지 않습니다.
