/* =======================================================================
   VERTEX — Cast engine (pure rules logic, no DOM)
   System Guide v004:
     - Cast N d6 (N = Core Stat). 5–6 = success. Difficulty = successes required.
     - Windfall: 2+ sixes -> automatic success. Downside: 2+ ones -> automatic failure.
     - Windfall/Downside cancel: sixes and ones cancel 1:1; a Windfall remains if
       (sixes - ones) >= 2, a Downside if (ones - sixes) >= 2  (see note).
     - 1-die edge case: if pool === 1 you cast a bonus die that cannot grant a
       success but can still trigger a Windfall/Downside.
     - Folding Fate: Advantage = cast twice, take the better; Disadvantage = worse.
   NOTE: the 1:1 cancellation interpretation is flagged in CLAUDE.md for the creator
   to confirm; it is isolated here so it is trivial to change.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.dice = (function () {
  const rollDie = () => 1 + Math.floor(Math.random() * 6);

  // Rank used to pick best/worst under Advantage/Disadvantage.
  const RANK = { downside: 0, failure: 1, success: 2, windfall: 3 };

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
    const windfall = (sixes - ones) >= 2;
    const downside = (ones - sixes) >= 2;
    const hit = windfall ? true : downside ? false : successes >= difficulty;
    const outcome = windfall ? "windfall" : downside ? "downside" : hit ? "success" : "failure";
    return { dice, successes, sixes, ones, windfall, downside, hit, outcome, rank: RANK[outcome], difficulty, pool };
  }

  // mode: 'normal' | 'advantage' | 'disadvantage'
  function cast(pool, difficulty, mode) {
    if (mode === "advantage" || mode === "disadvantage") {
      const a = castOnce(pool, difficulty);
      const b = castOnce(pool, difficulty);
      const chosen = mode === "advantage"
        ? (a.rank >= b.rank ? a : b)
        : (a.rank <= b.rank ? a : b);
      return { mode, rolls: [a, b], chosen };
    }
    const r = castOnce(pool, difficulty);
    return { mode: "normal", rolls: [r], chosen: r };
  }

  return { cast, castOnce };
})();
