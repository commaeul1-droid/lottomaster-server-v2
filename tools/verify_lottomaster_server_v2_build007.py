from __future__ import annotations

from pathlib import Path
import json
import shutil
import subprocess
import sys

try:
    sys.stdout.reconfigure(line_buffering=True)
except AttributeError:
    pass


ROOT = Path.cwd()
UPDATE = ROOT / "src/update.js"
FRESHNESS = ROOT / "src/lib/draw-freshness.js"
OFFICIAL = ROOT / "src/collectors/official-api-collector.js"
PREFLIGHT = ROOT / "scripts/check_update_needed.js"
WORKFLOW = ROOT / ".github/workflows/update-lotto-data.yml"
FRESHNESS_TEST = ROOT / "tests/draw-freshness.test.js"
OFFICIAL_TEST = ROOT / "tests/official-api-collector.test.js"
CSV = ROOT / "data/lotto_seed.csv"
LATEST = ROOT / "data/latest.json"
PACKAGE = ROOT / "package.json"


def compact(text: str) -> str:
    return "".join(text.split())


def read(path: Path) -> str:
    if not path.is_file():
        raise SystemExit(f"[FAIL] missing file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


update = compact(read(UPDATE))
freshness = compact(read(FRESHNESS))
official = compact(read(OFFICIAL))
preflight = compact(read(PREFLIGHT))
workflow = compact(read(WORKFLOW))
freshness_test = read(FRESHNESS_TEST)
official_test = read(OFFICIAL_TEST)
package = json.loads(read(PACKAGE))
lint_script = package.get("scripts", {}).get("lint", "")

checks = {
    "KST expected-round policy": (
        "functionexpectedLatestRoundAt(" in freshness
        and "kst.getUTCDay()===6&&kst.getUTCHours()<21" in freshness
    ),
    "stored round state classification": (
        "state:'current'" in freshness
        and "state:'stale'" in freshness
        and "state:'future'" in freshness
        and "state:'missing'" in freshness
    ),
    "current round exits as safe no-op": (
        "storedFreshness.state==='current'" in update
        and "automaticcollectionwasnotrequired" in update.lower()
        and "return;" in update
    ),
    "manual and force refresh bypass no-op": (
        "Boolean(manual)||process.argv.includes('--force-collect')"
        in update
    ),
    "stale or future collector result fails closed": (
        "selectedFreshness.state!=='current'" in update
        and "stage:'freshness'" in update
        and "Existingdatawaspreserved." in update
    ),
    "collector failure reports expected round": (
        "existingLatestRound" in update
        and "expectedLatestRound:storedFreshness.expectedRound" in update
    ),
    "official global-latest fallback": (
        "{srchDir:'latest',srchCursorLtEpsd:'1'}" in official
    ),
    "official warm-up failure is isolated": (
        "attempts.push(`sessionwarm-up:${error.message}`)" in official
        and "cookie=awaitwarmOfficialSession(timeoutMs)" in official
    ),
    "workflow skips Chromium when already current": (
        "id:preflight" in workflow
        and "node scripts/check_update_needed.js" in read(WORKFLOW)
        and "if:steps.preflight.outputs.collection_required=='true'"
        in workflow
    ),
    "preflight publishes collection requirement": (
        "collection_required=${collectionRequired}" in preflight
        and "freshness.state!=='current'" in preflight
    ),
    "freshness and collector regression tests": (
        "Saturday from 21 KST requires the newly drawn round"
        in freshness_test
        and "Sunday treats the stored latest round as a safe no-op"
        in freshness_test
        and "global latest query after empty cursor responses"
        in official_test
        and "session warm-up fails" in official_test
    ),
    "package lint covers Build007 sources": all(
        f"node --check {relative}" in lint_script
        for relative in (
            "scripts/check_update_needed.js",
            "src/lib/draw-freshness.js",
            "src/collectors/official-api-collector.js",
        )
    ),
}

failed = []
for label, passed in checks.items():
    print(f"[{'PASS' if passed else 'FAIL'}] {label}")
    if not passed:
        failed.append(label)

csv_lines = [
    line.strip()
    for line in read(CSV).replace("\r", "").splitlines()[1:]
    if line.strip()
]
latest_csv_round = int(csv_lines[-1].split(",", 1)[0])
latest_json_round = int(json.loads(read(LATEST))["latest"]["round"])
data_consistent = latest_csv_round == latest_json_round
print(
    f"[{'PASS' if data_consistent else 'FAIL'}] "
    f"existing data consistency csv={latest_csv_round} json={latest_json_round}"
)
if not data_consistent:
    failed.append("existing data consistency")

if failed:
    raise SystemExit(
        "[FAIL] Build007 semantic verification failed: "
        + ", ".join(failed)
    )

if shutil.which("node") is None:
    print("[SKIP] Node runtime unavailable; run npm test in GitHub Actions")
else:
    syntax_files = [
        "src/update.js",
        "src/lib/draw-freshness.js",
        "src/collectors/official-api-collector.js",
        "scripts/check_update_needed.js",
    ]
    for relative in syntax_files:
        completed = subprocess.run(
            ["node", "--check", relative],
            cwd=ROOT,
            check=False,
        )
        if completed.returncode != 0:
            raise SystemExit(f"[FAIL] Node syntax check: {relative}")
    print("[PASS] Node syntax checks")

    completed = subprocess.run(
        [
            "node",
            "--test",
            "tests/draw-freshness.test.js",
            "tests/official-api-collector.test.js",
        ],
        cwd=ROOT,
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit("[FAIL] Build007 focused Node tests")
    print("[PASS] Build007 focused Node tests")
print("[PASS] LottoMaster Server V2 Build007 verification complete")
