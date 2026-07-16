import { assertValidDraw, normalizeDraw } from '../validators/draw-validator.js';

/**
 * Parses the response used by the redesigned official result page.
 *
 * Expected item fields:
 * - ltEpsd
 * - ltRflYmd
 * - tm1WnNo ... tm6WnNo
 * - bnsWnNo
 */
export function parseOfficialResultResponse(payload, source = 'dhlottery-official-api') {
  const list = findResultList(payload);
  if (!list.length) {
    throw new Error('official API JSON did not contain a draw list');
  }

  const valid = [];
  for (const item of list) {
    try {
      valid.push(parseOfficialResultItem(item, source));
    } catch {
      // Ignore malformed/non-lotto records and continue.
    }
  }

  if (!valid.length) {
    throw new Error('official API draw list contained no valid 6/45 result');
  }

  return valid.sort((a, b) => b.round - a.round)[0];
}

export function parseOfficialResultItem(item, source = 'dhlottery-official-api') {
  const draw = normalizeDraw(
    {
      round: item?.ltEpsd ?? item?.drwNo ?? item?.round,
      numbers: [
        item?.tm1WnNo ?? item?.drwtNo1 ?? item?.n1,
        item?.tm2WnNo ?? item?.drwtNo2 ?? item?.n2,
        item?.tm3WnNo ?? item?.drwtNo3 ?? item?.n3,
        item?.tm4WnNo ?? item?.drwtNo4 ?? item?.n4,
        item?.tm5WnNo ?? item?.drwtNo5 ?? item?.n5,
        item?.tm6WnNo ?? item?.drwtNo6 ?? item?.n6,
      ],
      bonus: item?.bnsWnNo ?? item?.bnusNo ?? item?.bonus,
      drawDate: item?.ltRflYmd ?? item?.drwNoDate ?? item?.drawDate,
    },
    source,
  );

  return assertValidDraw(draw);
}

function findResultList(payload) {
  const candidates = [
    payload?.data?.list,
    payload?.data?.data?.list,
    payload?.result?.data?.list,
    payload?.result?.list,
    payload?.body?.data?.list,
    payload?.body?.list,
    payload?.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  // Some wrappers store the response object under a single unknown key.
  if (payload && typeof payload === 'object') {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && value.some(looksLikeOfficialItem)) return value;
      if (value && typeof value === 'object') {
        const nested = value.list ?? value.data?.list;
        if (Array.isArray(nested)) return nested;
      }
    }
  }

  return [];
}

function looksLikeOfficialItem(value) {
  return value && typeof value === 'object'
    && ('ltEpsd' in value || 'tm1WnNo' in value || 'drwNo' in value);
}
