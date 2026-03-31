export interface BigRoadColumn {
  type: string;
  count: number;
}

export interface GoodRoadNotification {
  deskId: number;
  deskName: string;
  gameType: string;
  patternType: string;
  patternKey: string;
  columns: BigRoadColumn[];
  priority: number;
  deskStatus: string;
}

function getMainResult(key: string): string {
  const parts = key.split("|");
  if (parts.includes("banker")) return "banker";
  if (parts.includes("player")) return "player";
  if (parts.includes("dragon")) return "dragon";
  if (parts.includes("tiger")) return "tiger";
  return "";
}

export function resultsToBigRoadColumns(
  results: { key: string }[],
): BigRoadColumn[] {
  const columns: BigRoadColumn[] = [];
  for (const res of results) {
    if (res.key.split("|").includes("tie")) continue;
    const main = getMainResult(res.key);
    if (!main) continue;
    if (columns.length === 0 || columns[columns.length - 1].type !== main) {
      columns.push({ type: main, count: 1 });
    } else {
      columns[columns.length - 1].count++;
    }
  }
  return columns;
}

/*
 * Priority (lower = displayed first when multiple patterns match):
 *  1  斜坡路         slope
 *  2  画龙点睛       finishing-touch
 *  3  二连跳       double-jump
 *  4  单跳       single-jump
 *  5  排排黐         sticky-pairs
 *  6  一房两厅(庄/闲) one-hall-two-rooms-banker / player
 *  8  逢庄跳/逢闲跳  banker-jump / player-jump
 *  9  逢庄连/逢闲连  banker-consecutive / player-consecutive
 *  7  长庄/长闲       long-banker / long-player
 */
const PRIORITY: Record<string, number> = {
  slope: 1,
  "finishing-touch": 2,
  "double-jump": 3,
  "single-jump": 4,
  "sticky-pairs": 5,
  "one-hall-two-rooms-banker": 6,
  "one-hall-two-rooms-player": 6,
  "long-banker": 7,
  "long-player": 7,
  "banker-jump": 8,
  "player-jump": 8,
  "banker-consecutive": 9,
  "player-consecutive": 9,
};

function getLabel(key: string, gameType: string): string {
  const lh = gameType === "LONGHU";
  const map: Record<string, string> = {
    slope: "斜坡路",
    "finishing-touch": "画龙点睛",
    "double-jump": "二连跳",
    "single-jump": "单跳",
    "sticky-pairs": "排排黐",
    "one-hall-two-rooms-banker": "一房两厅",
    "one-hall-two-rooms-player": "一房两厅",
    "banker-jump": lh ? "逢龙跳" : "逢庄跳",
    "player-jump": lh ? "逢虎跳" : "逢闲跳",
    "banker-consecutive": lh ? "逢龙连" : "逢庄连",
    "player-consecutive": lh ? "逢虎连" : "逢闲连",
    "long-banker": "长龙",
    "long-player": "长龙",
  };
  return map[key] || key;
}

type Hit = { key: string; cols: BigRoadColumn[] };

export function detectGoodRoads(
  deskId: number,
  deskName: string,
  gameType: string,
  results: { key: string }[],
  deskStatus: string,
): GoodRoadNotification | null {
  const columns = resultsToBigRoadColumns(results);
  if (columns.length === 0) return null;

  const bType = gameType === "LONGHU" ? "dragon" : "banker";
  const pType = gameType === "LONGHU" ? "tiger" : "player";
  const lengths = columns.map((c) => c.count);
  const lastCol = columns[columns.length - 1];
  const hits: Hit[] = [];

  // ── 斜坡路 (Slope)
  // Each column has exactly 1 more than the previous, 4+ columns.
  if (columns.length >= 4) {
    let n = 1;
    for (let i = columns.length - 1; i > 0; i--) {
      if (columns[i].count === columns[i - 1].count + 1) n++;
      else break;
    }
    if (n >= 4) hits.push({ key: "slope", cols: columns.slice(-n) });
  }

  // ── 画龙点睛 (Finishing touch)
  // Take last 4 columns; only show last 3. Of those 3 (2nd/3rd/4th of the 4):
  // 2nd col ≥ 4, 3rd col = 1, last col ≥ 4. First of the 4 is not shown.
  if (columns.length >= 4) {
    const second = lengths[lengths.length - 3];
    const third = lengths[lengths.length - 2];
    const last = lengths[lengths.length - 1];
    if (second >= 4 && third === 1 && last >= 4)
      hits.push({ key: "finishing-touch", cols: columns.slice(-3) });
  }

  // ── 二连跳 (Double Jump)
  // 4+ consecutive columns each with count = 2.
  if (columns.length >= 4) {
    let n = 0;
    for (let i = lengths.length - 1; i >= 0; i--) {
      if (lengths[i] === 2) n++;
      else break;
    }
    if (n >= 4) hits.push({ key: "double-jump", cols: columns.slice(-n) });
  }

  // ── 单跳 (Single Jump)
  // 4+ consecutive columns each with count = 1.
  if (columns.length >= 4) {
    let n = 0;
    for (let i = lengths.length - 1; i >= 0; i--) {
      if (lengths[i] === 1) n++;
      else break;
    }
    if (n >= 4) hits.push({ key: "single-jump", cols: columns.slice(-n) });
  }

  // ── 排排黐 (Sticky Pairs)
  // Adjacent pairs of columns where both have the same count, 2+ pairs.
  if (columns.length >= 4) {
    let pairs = 0;
    for (let i = columns.length - 1; i >= 1; i -= 2) {
      if (columns[i].count === columns[i - 1].count) pairs++;
      else break;
    }
    if (pairs >= 2)
      hits.push({ key: "sticky-pairs", cols: columns.slice(-pairs * 2) });
  }

  // 一 厅两房(庄)
  // All recent banker cols have count=1 AND all recent player cols have
  // count=2.  Pattern: B(1) P(2) B(1) P(2)…  Need 4+ matching columns.
  if (columns.length >= 4) {
    let n = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      const c = columns[i];
      if (
        (c.type === bType && c.count === 1) ||
        (c.type === pType && c.count === 2)
      )
        n++;
      else break;
    }
    if (n >= 4)
      hits.push({ key: "one-hall-two-rooms-banker", cols: columns.slice(-n) });
  }

  // ── 一房两厅(闲)
  // All recent player cols have count=1 AND all recent banker cols have
  // count=2.  Pattern: P(1) B(2) P(1) B(2)…  Need 4+ matching columns.
  if (columns.length >= 4) {
    let n = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      const c = columns[i];
      if (
        (c.type === pType && c.count === 1) ||
        (c.type === bType && c.count === 2)
      )
        n++;
      else break;
    }
    if (n >= 4)
      hits.push({ key: "one-hall-two-rooms-player", cols: columns.slice(-n) });
  }

  // ── 逢庄跳 (Banker Jump)
  // Within the last 4 columns: 3+ banker columns each with count = 1.
  if (columns.length >= 4) {
    const last4 = columns.slice(-4);
    const bSingles = last4.filter(
      (c) => c.type === bType && c.count === 1,
    ).length;
    if (bSingles >= 3)
      hits.push({ key: "banker-jump", cols: columns.slice(-4) });
  }

  // ── 逢闲跳 (Player Jump)
  // Within the last 4 columns: 3+ player columns each with count = 1.
  if (columns.length >= 4) {
    const last4 = columns.slice(-4);
    const pSingles = last4.filter(
      (c) => c.type === pType && c.count === 1,
    ).length;
    if (pSingles >= 3)
      hits.push({ key: "player-jump", cols: columns.slice(-4) });
  }

  // ── 逢庄连 (Banker Consecutive)
  // In the last 4 columns: at least 2 banker columns each with count ≥ 2.
  if (columns.length >= 4) {
    const last4 = columns.slice(-4);
    const bankerWith2 = last4.filter(
      (c) => c.type === bType && c.count >= 2,
    ).length;
    if (bankerWith2 >= 2)
      hits.push({ key: "banker-consecutive", cols: columns.slice(-4) });
  }

  // ── 逢闲连 (Player Consecutive)
  // In the last 4 columns: at least 2 player columns each with count ≥ 2.
  if (columns.length >= 4) {
    const last4 = columns.slice(-4);
    const playerWith2 = last4.filter(
      (c) => c.type === pType && c.count >= 2,
    ).length;
    if (playerWith2 >= 2)
      hits.push({ key: "player-consecutive", cols: columns.slice(-4) });
  }

  // ── 长庄 (Long Banker)
  if (lastCol.type === bType && lastCol.count >= 4)
    hits.push({ key: "long-banker", cols: [lastCol] });

  // ── 长闲 (Long Player)
  if (lastCol.type === pType && lastCol.count >= 4)
    hits.push({ key: "long-player", cols: [lastCol] });

  if (hits.length === 0) return null;

  hits.sort((a, b) => (PRIORITY[a.key] ?? 99) - (PRIORITY[b.key] ?? 99));
  const best = hits[0];

  return {
    deskId,
    deskName,
    gameType,
    patternType: getLabel(best.key, gameType),
    patternKey: best.key,
    columns: best.cols,
    priority: PRIORITY[best.key] ?? 99,
    deskStatus,
  };
}

export function detectAllGoodRoads(
  desks: {
    id: number;
    name: string;
    game?: { type: string };
    results: { key: string }[];
  }[],
  deskStatuses?: Record<number, string>,
): GoodRoadNotification[] {
  const all: GoodRoadNotification[] = [];
  for (const desk of desks) {
    if (!desk.game || desk.game.type === "NIUNIU" || desk.results.length === 0)
      continue;
    const status = deskStatuses?.[desk.id] ?? "active";
    const road = detectGoodRoads(
      desk.id,
      desk.name,
      desk.game.type,
      desk.results,
      status,
    );
    if (road) all.push(road);
  }
  return all;
}
