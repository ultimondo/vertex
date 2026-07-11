/* =======================================================================
   VERTEX — Cast engine (pure rules logic, no DOM)
   Vertex System Guide v004 (Windfall/Downside revised 2026-07-11):
     - Cast N d6 (N = Core Stat). 5–6 = success. Difficulty = successes required.
     - A Cast SUCCEEDS iff successes >= Difficulty. Nothing else affects pass/fail.
     - Windfall (2+ sixes) and Downside (2+ ones) are TABLE-TRIGGERS ONLY: each
       obliges a roll on the Windfall / Downside table but does NOT force success
       or failure. Sixes and ones cancel 1:1, so a roll carries at most one. A
       Cast can therefore fail yet carry a Windfall, or pass yet carry a Downside.
     - 1-die edge case: if pool === 1 you cast a bonus die that cannot grant a
       success but can still trigger a Windfall/Downside.
     - Folding Fate: cast twice, then compare the two rolls on two qualities only,
       pass/fail and table (Windfall > none > Downside). If one roll is objectively
       better (>= on both, better on one), Advantage keeps it and Disadvantage keeps
       the other — no prompt. If the rolls trade off (one wins on pass, the other on
       table), the player must choose which whole roll to keep (needsChoice). Success
       COUNT never decides this — it is narrative flavour only, and merely breaks the
       tie for which of two otherwise-identical rolls to surface (Advantage the
       higher, Disadvantage the lower). (Confirmed with the creator 2026-07-11.)
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.dice = (function () {
  const rollDie = () => 1 + Math.floor(Math.random() * 6);

  function castOnce(pool, difficulty) {
    pool = Math.max(0, pool | 0);
    const dice = [];
    for (let i = 0; i < pool; i++) dice.push({ v: rollDie(), bonus: false });
    if (pool === 1) dice.push({ v: rollDie(), bonus: true }); // edge case

    let successes = 0, sixes = 0, ones = 0;
    for (const d of dice) {
      if (!d.bonus && d.v >= 5) successes++;   // bonus die never grants a success
      if (d.v === 6) sixes++;
      if (d.v === 1) ones++;
    }
    const windfall = (sixes - ones) >= 2;      // 1:1 cancellation -> at most one
    const downside = (ones - sixes) >= 2;
    const hit = successes >= difficulty;        // pass/fail is successes ONLY
    const outcome = hit ? "success" : "failure";
    return { dice, successes, sixes, ones, windfall, downside, hit, outcome, difficulty, pool };
  }

  // A roll's two comparable qualities (higher = more desirable on each axis).
  const passOf = r => (r.hit ? 1 : 0);
  const tableOf = r => (r.windfall ? 1 : r.downside ? -1 : 0);   // Windfall > none > Downside

  // Fold two rolls per the mode. Returns the kept roll, or null (needsChoice)
  // when neither dominates and the rolls genuinely trade off — the player decides.
  function fold(a, b, mode) {
    const aDom = passOf(a) >= passOf(b) && tableOf(a) >= tableOf(b) && (passOf(a) > passOf(b) || tableOf(a) > tableOf(b));
    const bDom = passOf(b) >= passOf(a) && tableOf(b) >= tableOf(a) && (passOf(b) > passOf(a) || tableOf(b) > tableOf(a));
    if (aDom || bDom) {
      const better = aDom ? a : b, worse = aDom ? b : a;
      return { chosen: mode === "advantage" ? better : worse, needsChoice: false };
    }
    if (passOf(a) === passOf(b) && tableOf(a) === tableOf(b)) {
      // identical outcome -> success count is flavour only; surface the nicer roll
      const chosen = mode === "advantage"
        ? (a.successes >= b.successes ? a : b)
        : (a.successes <= b.successes ? a : b);
      return { chosen, needsChoice: false };
    }
    return { chosen: null, needsChoice: true };   // genuine tradeoff -> player chooses
  }

  // mode: 'normal' | 'advantage' | 'disadvantage'
  function cast(pool, difficulty, mode) {
    if (mode === "advantage" || mode === "disadvantage") {
      const a = castOnce(pool, difficulty);
      const b = castOnce(pool, difficulty);
      const { chosen, needsChoice } = fold(a, b, mode);
      return { mode, rolls: [a, b], chosen, needsChoice };
    }
    const r = castOnce(pool, difficulty);
    return { mode: "normal", rolls: [r], chosen: r, needsChoice: false };
  }

  return { cast, castOnce };
})();
