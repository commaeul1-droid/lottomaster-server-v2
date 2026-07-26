# LottoMaster Server V2 Build007

## 확인된 실패 원인

1234회 당첨번호는 이미 `data/lotto_seed.csv`, `latest.json`에 정상 저장되어
있었습니다. 이후 예약 Action이 다시 실행되면서 공식 API에 1234회 이후
데이터를 요청했고, 새 회차가 없어서 빈 목록을 받았습니다.

기존 코드는 이 정상적인 빈 응답을 `all collectors failed`로 처리했습니다.
따라서 화면에 1234회가 보이는데도 GitHub Action만 실패하는 거짓 실패가
발생했습니다.

## Build007 변경

- KST 기준 최신 예상 회차를 단일 정책으로 계산합니다.
- 저장 회차가 이미 최신이면 수집·데이터 쓰기 없이 `changed: false`로 종료합니다.
- 새 회차가 필요한 경우에만 Chromium과 자동 수집기를 실행합니다.
- 새 회차가 필요한데 수집기가 이전 또는 미래 회차를 반환하면 저장하지 않습니다.
- 공식 페이지 세션 준비가 차단되어도 JSON API 요청은 계속합니다.
- cursor 요청과 center 요청이 비어 있으면 전역 latest 요청을 마지막으로 시도합니다.
- 최신 무변경 실행에서는 데이터 파일의 타임스탬프도 변경하지 않습니다.

## 적용 후 검사

```powershell
py .\tools\verify_lottomaster_server_v2_build007.py
npm ci
npm test
npm run lint
npm run validate
npm run update
```

현재 데이터가 최신인 경우 `npm run update`의 정상 결과는 다음과 같습니다.

```text
"ok": true
"changed": false
"source": "seed-csv-current"
"message": "Already up to date; automatic collection was not required."
```

다음 토요일 21시 이후에는 예상 회차가 자동으로 증가하므로 수집기가 다시
실행됩니다. 수집 실패 시 기존 데이터는 그대로 보존됩니다.
