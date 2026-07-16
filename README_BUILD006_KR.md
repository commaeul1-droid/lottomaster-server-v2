# LottoMaster Server V2 RC1 Build006

## 목적

동행복권의 새 추첨결과 페이지가 실제 번호를 페이지 HTML에 직접 넣지 않고
다음 공식 JSON 요청으로 불러오는 구조를 반영합니다.

`/lt645/selectPstLt645InfoNew.do`

페이지 소스에서 확인된 요청 방식은 `GET`이며 주요 파라미터는 다음과 같습니다.

- `srchDir=latest`
- `srchCursorLtEpsd=<현재 저장된 최신 회차>`
- `srchDir=center`
- `srchLtEpsd=<확인할 회차>`

## 변경 파일

- `src/collectors/official-api-collector.js` 신규
- `src/parsers/dhlottery-api-parser.js` 신규
- `src/lib/constants.js` 교체
- `src/update.js` 교체
- `tests/parser.test.js` 교체
- `tests/fixtures/official-api-sample.json` 신규

## Collector 우선순위

1. 긴급 수동 입력
2. 외부 검증 소스(설정된 경우)
3. 새 공식 JSON API
4. 기존 공식 HTML
5. Playwright 브라우저

## 적용

압축을 풀고 저장소 루트에 그대로 덮어씁니다.

```powershell
cd C:\lottomaster-server-v2
npm test
npm run validate
npm run collect
```

### 성공 예상

```text
[dhlottery-official-api] ...
{
  "latest": {
    "round": 1232,
    ...
    "source": "dhlottery-official-api"
  },
  "changed": true
}
```

### 실패해도 안전한 이유

- API 응답은 6개 번호, 보너스, 회차 범위 및 중복 여부를 검증합니다.
- 유효한 데이터가 없으면 기존 CSV를 변경하지 않습니다.
- 기존 HTML/브라우저 Collector가 후순위로 계속 동작합니다.

## GitHub 반영

로컬 테스트 통과 후 변경 파일을 GitHub 저장소의 동일 경로에 업로드합니다.
커밋 메시지 권장:

`Add redesigned official result API collector`
