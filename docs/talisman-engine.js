// Exact talisman odds from MHGU's own charm roll (main.text 0x14b790) and Melding Pot
// (sItem 0x196188). A JS port of MHGU-Extract/charm/model.py, odds.py and meld.py, which were
// checked against the ROM's own code under emulation. Pure: no DOM.
(function (root) {
  "use strict";
  const KINDS = ["Mystery", "Shining", "Timeworn", "Enduring"];
  const RARITY = ["", "Pawn", "Bishop", "Knight", "Rook", "Queen", "King", "Dragon", "Hero", "Legend", "Creator"];
  const STYLES = [
    { name: "Mystery Melding", cost: 100, inputs: "3 Pawn or Bishop" },
    { name: "Luminous Melding", cost: 200, inputs: "3 Knight or Rook" },
    { name: "Ancient Melding", cost: 500, inputs: "3 Queen, King or Dragon" },
    { name: "Fabled Melding", cost: 1000, inputs: "3 Hero, Legend or Creator" },
    { name: "Halcyon Melding", cost: 800, inputs: "any 3, Pawn to Dragon" },
    { name: "Juju Melding", cost: 1200, inputs: "any 3, Pawn to Dragon" },
  ];
  const F = Math.fround;

  function make(D) {
    // Points distribution of one row. A range that straddles 0 takes a coin flip for its side,
    // unless positiveOnly (every melded charm): then it is uniform on [1, max].
    function ptsDist(row, positiveOnly) {
      const lo = row[1], hi = row[2], out = [];
      if (hi >= 1 && lo <= 0) {
        const w = positiveOnly ? 1 / hi : 0.5 / hi;
        for (let p = 1; p <= hi; p++) out.push([p, w]);
        if (!positiveOnly) for (let p = lo; p <= 0; p++) out.push([p, 0.5 / (1 - lo)]);
      } else {
        for (let p = lo; p <= hi; p++) out.push([p, 1 / (hi - lo + 1)]);
      }
      return out;
    }
    // Slot score as the ROM computes it, in f32: pts / (max/10) per skill, a negative skill counts
    // 0, clamped to 0..20. The slot-table row is the truncated score.
    function score(r1, p1, r2, p2) {
      let s = p1 >= 0 ? F(F(p1) / F(F(r1[2]) / F(10))) : F(0);
      if (r2) s = F(s + (p2 >= 0 ? F(F(p2) / F(F(r2[2]) / F(10))) : F(0)));
      return Math.min(Math.max(s, 0), 20);
    }
    function rarityOf(kind, s, slots) {
      const v = F(s + F(2 * slots));
      const base = [1, 3, 5, 8][kind];
      if (kind < 2) return v < 8 ? base : base + 1;
      return v < 8 ? base : v >= 13 ? base + 2 : base + 1;
    }
    const okPts = (p, want, exact) => exact ? p === want : p >= want;
    const okSlots = (s, want, exact) => exact ? s === want : s >= want;

    // One charm of `kind`. q = { skills: [{id, pts}], slots, exact }.
    // Returns { p, rarity[11], orders: [{first, second, p, factors}] }.
    function charm(kind, positiveOnly, q) {
      const t1 = D.skill[2 * kind], t2 = D.skill[2 * kind + 1];
      const g = (100 - D.no2[kind]) / 100;
      const [A, B] = q.skills;
      const rarity = new Array(11).fill(0), rows = new Array(21).fill(0);
      let total = 0;
      // per-order accumulators for the breakdown
      const ord = {};
      const addOrder = (key, v) => { ord[key] = (ord[key] || 0) + v; };
      // Every second-skill outcome with its weight; the same for every first skill.
      const branches = [[null, 0, 1 - g]];
      if (g > 0 && t2.length) for (const r2 of t2) for (const [p2, q2] of ptsDist(r2, positiveOnly))
        branches.push([r2, p2, g * q2 / t2.length]);
      for (const r1 of t1) {
        const firstIs = (B && r1[0] === B.id) ? "B" : (r1[0] === A.id ? "A" : null);
        if (B && !firstIs) continue;                       // a two-skill match needs a named first skill
        if (!B && !firstIs && q.exact && !q.secondOnly) continue;   // exact single skill must be the first skill
        for (const [p1, q1] of ptsDist(r1, positiveOnly)) {
          const base = q1 / t1.length;
          for (const [r2, p2raw, qb] of branches) {
            if (qb === 0) continue;
            const p2 = (r2 && r2[0] === r1[0]) ? 0 : p2raw;     // same tree twice: second is deleted
            const id2 = (r2 && p2 !== 0) ? r2[0] : 0;
            let match = false, key = null;
            if (q.secondOnly) {
              // "Any skill" first: the named skill must be the SECOND skill, the first can be anything
              // (a first skill on the same tree deletes the second, so it can never match).
              if (id2 === A.id && okPts(p2, A.pts, q.exact)) { match = true; key = "-A"; }
            } else if (B) {
              if (firstIs === "A" && okPts(p1, A.pts, q.exact) && id2 === B.id && okPts(p2, B.pts, q.exact)) { match = true; key = "AB"; }
              else if (firstIs === "B" && okPts(p1, B.pts, q.exact) && id2 === A.id && okPts(p2, A.pts, q.exact)) { match = true; key = "BA"; }
            } else if (firstIs === "A" && okPts(p1, A.pts, q.exact) && (!q.exact || id2 === 0)) { match = true; key = "A-"; }
            else if (!q.exact && id2 === A.id && okPts(p2, A.pts, false)) { match = true; key = "-A"; }
            if (!match) continue;
            const s = score(r1, p1, r2, p2);
            const ri = Math.trunc(s), row = D.slot[kind][ri];
            let hit = 0;
            for (let sl = 0; sl < 4; sl++) {
              if (!row[sl] || !okSlots(sl, q.slots, q.exact)) continue;
              const v = base * qb * row[sl] / 100;
              hit += v; rarity[rarityOf(kind, s, sl)] += v; addOrder(key, v);
            }
            total += hit; rows[ri] += hit;
          }
        }
      }
      return { p: total, rarity, rows, orders: breakdown(kind, positiveOnly, q, ord) };
    }

    // The factors of each order that can match, ending in the slot chance that makes the
    // product equal that order's exact total (a conditional average when points or the other
    // skill vary).
    function breakdown(kind, positiveOnly, q, ord) {
      const t1 = D.skill[2 * kind], t2 = D.skill[2 * kind + 1];
      const g = (100 - D.no2[kind]) / 100;
      const [A, B] = q.skills;
      const name = id => D.names[id];
      const ptsOk = (row, want, exact) => ptsDist(row, positiveOnly).filter(([p]) => exact ? p === want : p >= want).reduce((a, [, w]) => a + w, 0);
      const ptsLabel = (s, exact) => exact ? `+${s.pts} exactly` : `+${s.pts} or more`;
      const out = [];
      for (const key of Object.keys(ord)) {
        const f = [];
        if (key === "AB" || key === "BA") {
          const X = key === "AB" ? A : B, Y = key === "AB" ? B : A;
          const r1 = t1.find(r => r[0] === X.id), r2 = t2.find(r => r[0] === Y.id);
          f.push([`First skill is ${name(X.id)}`, 1 / t1.length, `1 of ${t1.length}`]);
          f.push([`It rolls ${ptsLabel(X, q.exact)}`, ptsOk(r1, X.pts, q.exact), `range +${r1[1]} to +${r1[2]}`]);
          f.push(["A second skill rolls", g, `${Math.round(g * 100)}%`]);
          f.push([`Second skill is ${name(Y.id)}`, 1 / t2.length, `1 of ${t2.length}`]);
          f.push([`It rolls ${ptsLabel(Y, q.exact)}`, ptsOk(r2, Y.pts, q.exact), straddleNote(r2, positiveOnly)]);
        } else if (key === "A-") {
          const r1 = t1.find(r => r[0] === A.id);
          f.push([`First skill is ${name(A.id)}`, 1 / t1.length, `1 of ${t1.length}`]);
          f.push([`It rolls ${ptsLabel(A, q.exact)}`, ptsOk(r1, A.pts, q.exact), `range +${r1[1]} to +${r1[2]}`]);
          if (q.exact) f.push(["No second skill", null, "no roll, or one that cancelled"]);
        } else {
          const r2 = t2.find(r => r[0] === A.id), inT1 = t1.some(r => r[0] === A.id);
          f.push(["A second skill rolls", g, `${Math.round(g * 100)}%`]);
          f.push([`Second skill is ${name(A.id)}`, 1 / t2.length, `1 of ${t2.length}`]);
          f.push([`It rolls ${ptsLabel(A, q.exact)}`, ptsOk(r2, A.pts, q.exact), straddleNote(r2, positiveOnly)]);
          if (inT1) f.push([`First skill isn't also ${name(A.id)}`, 1 - 1 / t1.length, "a repeat deletes the second"]);
        }
        const known = f.reduce((a, x) => x[1] == null ? a : a * x[1], 1);
        const rest = ord[key] / known;
        f.push([slotLabel(q), rest, "set by the slot table row; see below"]);
        out.push({ key, p: ord[key], factors: f });
      }
      return out.sort((a, b) => b.p - a.p);
    }
    function straddleNote(row, positiveOnly) {
      if (row[2] >= 1 && row[1] <= 0)
        return positiveOnly ? `range +1 to +${row[2]} (melded: never negative)` : `range ${row[1]} to +${row[2]}; coin flip picks the side`;
      return `range +${row[1]} to +${row[2]}`;
    }
    function slotLabel(q) {
      if (q.exact) return q.slots === 1 ? "Exactly 1 slot" : `Exactly ${q.slots} slots`;
      return q.slots === 0 ? "Any slots (the rest of the roll)" : q.slots === 1 ? "1 slot or more" : `${q.slots} slots or more`;
    }

    // Why a kind can't make the talisman, or null.
    function reason(kind, q) {
      const t1 = D.skill[2 * kind], t2 = D.skill[2 * kind + 1], K = KINDS[kind];
      const maxSlots = Math.max(...D.slot[kind].map(r => r.reduce((m, v, i) => v ? i : m, 0)));
      if (q.secondOnly) {
        const s = q.skills[0], b = t2.find(r => r[0] === s.id);
        if (!t2.length) return `${K} Charms never get a second skill`;
        if (!b) return `${D.names[s.id]} is never a second skill here`;
        if (s.pts > b[2]) return `${D.names[s.id]} tops out at +${b[2]} as a second skill here`;
        if (q.slots > maxSlots) return `${K} Charms roll ${maxSlots === 1 ? "1 slot" : maxSlots + " slots"} at most`;
        return "this combination can't roll here";
      }
      for (const s of q.skills) {
        const a = t1.find(r => r[0] === s.id), b = t2.find(r => r[0] === s.id);
        if (!a && !b) return `${D.names[s.id]} isn't on the ${K} tables`;
        const top = Math.max(a ? a[2] : -99, b ? b[2] : -99);
        if (s.pts > top) return `${D.names[s.id]} tops out at +${top} here`;
      }
      if (q.skills.length === 2 && !t2.length) return `${K} Charms never get a second skill`;
      if (q.slots > maxSlots) return `${K} Charms roll ${maxSlots === 1 ? "1 slot" : maxSlots + " slots"} at most`;
      if (q.skills.length === 2) {
        const [A, B] = q.skills;
        const can = (X, Y) => t1.some(r => r[0] === X.id && r[2] >= X.pts) && t2.some(r => r[0] === Y.id && r[2] >= Y.pts);
        if (!can(A, B) && !can(B, A)) return "these two can't share one talisman here";
      }
      return "this combination can't roll here";
    }

    const cache = new Map();
    function charmCached(kind, positiveOnly, q) {
      const k = kind + "|" + (positiveOnly ? 1 : 0) + "|" + JSON.stringify(q);
      if (!cache.has(k)) { if (cache.size > 200) cache.clear(); cache.set(k, charm(kind, positiveOnly, q)); }
      return cache.get(k);
    }

    // One Melding Pot order. Styles 0-3 make one charm of that kind; Halcyon (4) and Juju (5)
    // make several, their counts fixed by the order's 16-bit seed (all 65,536 enumerated).
    function meldOrder(style, q, points) {
      if (style < 4) {
        const r = charmCached(style, true, q);
        return { p: r.p, expected: r.p, counts: null };
      }
      const pk = [0, 1, 2, 3].map(k => charmCached(k, true, q).p);
      const rows = D.meldCounts[style][points];
      let miss = 0, exp = 0, n = 0;
      const mean = [0, 0, 0, 0];
      for (const row of rows) {
        const w = row[4]; n += w;
        let m = 1;
        for (let k = 0; k < 4; k++) { m *= Math.pow(1 - pk[k], row[k]); exp += w * row[k] * pk[k]; mean[k] += w * row[k]; }
        miss += w * m;
      }
      return { p: 1 - miss / n, expected: exp / n, counts: mean.map(v => v / n) };
    }
    // One run of a farmed quest's sub-quest reward box (sItem-side roll 0x382314): N rolls, each a
    // stack of one charm kind. Charms from rewards are appraised like any quest charm (no melding
    // bonus). Computed with log1p/expm1 so a 1-in-millions chance keeps its digits.
    function questRun(qf, q) {
      const pk = [0, 1, 2, 3].map(k => charmCached(k, false, q).p);
      const meanRolls = qf.rolls.reduce((a, [n, p]) => a + n * p, 0);
      const perKind = [0, 0, 0, 0];
      let gMinus1 = 0;                                   // G - 1, G = per-roll chance of no match
      for (const [k, cnt, p] of qf.entries) {
        if (k < 0) continue;
        perKind[k] += cnt * p;
        gMinus1 += p * Math.expm1(cnt * Math.log1p(-pk[k]));
      }
      const logG = Math.log1p(gMinus1);
      const hit = -qf.rolls.reduce((a, [n, p]) => a + p * Math.expm1(n * logG), 0);
      return { p: hit, meanRolls, charms: perKind.map(v => v * meanRolls),
               minRolls: qf.rolls[0][0], maxRolls: qf.rolls[qf.rolls.length - 1][0] };
    }
    const pointsOf = rars => rars.reduce((a, r) => a + D.pts[r], 0);
    const pointsKey = s => Math.min(9, Math.max(3, s));

    return { KINDS, RARITY, STYLES, ptsDist, score, charm: charmCached, reason, meldOrder, questRun, pointsOf, pointsKey, D };
  }
  root.TalismanOdds = make;
  if (typeof module !== "undefined") module.exports = make;
})(typeof window !== "undefined" ? window : globalThis);
