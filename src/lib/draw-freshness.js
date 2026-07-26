const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FIRST_DRAW_DATE_KST = Date.UTC(2002, 11, 7);

export function expectedLatestRoundAt(now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) {
    throw new Error('invalid freshness clock');
  }

  const kst = new Date(instant.getTime() + KST_OFFSET_MS);
  const todayKst = Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate(),
  );
  let expected = Math.max(
    1,
    Math.floor((todayKst - FIRST_DRAW_DATE_KST) / WEEK_MS) + 1,
  );

  if (kst.getUTCDay() === 6 && kst.getUTCHours() < 21) {
    expected = Math.max(1, expected - 1);
  }
  return expected;
}

export function assessStoredRound(storedRound, now = new Date()) {
  const expectedRound = expectedLatestRoundAt(now);
  const round = Number(storedRound);
  if (!Number.isInteger(round) || round < 1) {
    return {
      state: 'missing',
      storedRound: null,
      expectedRound,
      lag: expectedRound,
    };
  }
  if (round === expectedRound) {
    return {
      state: 'current',
      storedRound: round,
      expectedRound,
      lag: 0,
    };
  }
  if (round < expectedRound) {
    return {
      state: 'stale',
      storedRound: round,
      expectedRound,
      lag: expectedRound - round,
    };
  }
  return {
    state: 'future',
    storedRound: round,
    expectedRound,
    lag: expectedRound - round,
  };
}
