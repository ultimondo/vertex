/* =======================================================================
   VERTEX — character data model (no DOM)
   Owns the canonical character shape, derived values, and helpers.
   Derived values follow System Guide v004 and are NEVER stored — always computed.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.model = (function () {

  function uid() {
    // UUID so ids are valid cloud primary keys and globally unique.
    return (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function initials(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Derived (computed) values — see CLAUDE.md §4.1 / §10
  function derived(c) {
    const s = c.stats;
    return {
      maxHP: s.red,
      tempMax: s.red,                 // Temp HP cannot exceed Max HP
      move: s.green * 2,
      difficulty: s.green <= 3 ? 1 : s.green <= 6 ? 2 : s.green <= 9 ? 3 : 4,
      featureUses: s.blue,
      fateMax: 10,
      armorMax: 5
    };
  }

  // Total Core-Stat points granted by archetypes (for the v004 creation rule:
  // start 1/1/1, allocate up to +5 via Archetype Core Stat Tags).
  function archetypePointsSpent(c) {
    return (c.archetypes || []).reduce((sum, a) => {
      const p = a.status === "silent" || a.status === "retired" ? 0 : (a.points || 0);
      return sum + p;
    }, 0);
  }

  function newCharacter(name) {
    return {
      id: uid(),
      name: name || "New Character",
      epithet: "",               // the line beneath the name (idband flavor)
      portrait: null,            // dataURL or null
      designation: null,         // { name, tagline, descriptors }
      stats: { red: 1, green: 1, blue: 1 },
      res: { fate: { cur: 0 }, hp: { cur: 1 }, temp: { cur: 0 }, armor: 0 },
      archetypes: [],            // {name, tag, points, status, drift, driftMax, tagline, desc}
      tethers: [],               // {to, line, cls, old?}
      holds: [],                 // {line, status, timesHonored, vignetteOwed}
      features: [],              // {name, type, spent:[bool...], desc} — uses-max = Blue (derived, not stored)
      items: [],                 // {name, kind, meta, flavor}
      backstory: { origin: "", shaped: "", unique: "", wish: "" }, // v004 prompts
      biography: ""
    };
  }

  // Repair / fill-in any missing fields so older or imported data renders safely.
  function normalize(c) {
    if (typeof c.epithet !== "string") c.epithet = "";
    c.backstory = Object.assign({ origin: "", shaped: "", unique: "", wish: "" }, c.backstory);
    c.stats = Object.assign({ red: 1, green: 1, blue: 1 }, c.stats);
    c.res = c.res || {};
    c.res.fate = c.res.fate || { cur: 0 };
    c.res.hp = c.res.hp || { cur: c.stats.red };
    c.res.temp = c.res.temp || { cur: 0 };
    if (typeof c.res.armor !== "number") c.res.armor = 0;
    ["archetypes", "tethers", "holds", "features", "items"].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
    c.features.forEach(f => {
      // Feature Uses max = Blue score (derived live), tracked per-feature (house rule §1).
      // f.spent[] just records which use-slots are currently spent; its length reconciles to Blue at render.
      delete f.usesMax;  // legacy field — no longer authoritative
      if (f.type !== "passive") { if (!Array.isArray(f.spent)) f.spent = []; }
      else delete f.spent;
    });
    if (typeof c.biography !== "string") c.biography = "";
    return c;
  }

  // Clamp resources to their valid ranges after edits.
  function clampRes(c) {
    const d = derived(c);
    c.res.hp.cur = clamp(c.res.hp.cur, 0, d.maxHP);
    c.res.temp.cur = clamp(c.res.temp.cur, 0, d.tempMax);
    c.res.fate.cur = clamp(c.res.fate.cur, 0, d.fateMax);
    c.res.armor = clamp(c.res.armor, 0, d.armorMax);
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n | 0)); }

  return { uid, initials, derived, archetypePointsSpent, newCharacter, normalize, clampRes, clamp };
})();
