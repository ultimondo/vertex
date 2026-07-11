/* =======================================================================
   VERTEX — app controller
   Owns in-memory state, persistence, events, rendering orchestration.
   Runs as a plain global (no build step); works from file:// or hosted.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.app = (function () {
  const M = () => Vertex.model;
  const R = () => Vertex.render;
  const S = () => Vertex.storage;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const state = {
    list: [],
    activeId: null,
    activeTab: "core",
    cast: { mode: "normal", difficulty: 2 }
  };

  const active = () => state.list.find(c => c.id === state.activeId) || state.list[0];

  /* ---------------- bootstrapping ---------------- */
  function init() {
    let list = S().loadAll();
    if (!list || !list.length) {
      list = JSON.parse(JSON.stringify(Vertex.SEED || []));   // deep-clone seeds on first run
    }
    list.forEach(M().normalize);
    state.list = list;
    state.activeId = S().getActiveId() && list.some(c => c.id === S().getActiveId())
      ? S().getActiveId() : list[0].id;
    save();
    renderAll();
    setTab(state.activeTab);
  }

  let suppressAutoSync = false;
  function save() {
    const ok = S().saveAll(state.list);
    S().setActiveId(state.activeId);
    if (!ok) toast("Couldn’t save — storage may be full (large portrait image?).");
    // Nudge the silent Drive auto-save (no-op unless the player enabled it).
    if (!suppressAutoSync && window.Vertex.drive && Vertex.drive.noteChange) Vertex.drive.noteChange();
  }
  function refreshMenu() {
    const m = document.getElementById("menu");
    if (m) m.innerHTML = R().menu(state.list, state.activeId);
  }

  /* ---------------- rendering ---------------- */
  function renderAll() {
    const c = active();
    document.getElementById("idName").textContent = c.name;
    document.getElementById("idDesig").textContent = c.designation ? "the " + c.designation.name : "—";
    renderPortrait();
    renderTab("core"); renderTab("archetypes"); renderTab("bonds");
    renderTab("designation"); renderTab("gear");
    document.getElementById("menu").innerHTML = R().menu(state.list, state.activeId);
  }

  function renderTab(id) {
    const c = active();
    const el = document.getElementById("tab-" + id);
    if (!el) return;
    if (id === "core") el.innerHTML = R().core(c);
    else if (id === "archetypes") el.innerHTML = R().archetypes(c);
    else if (id === "bonds") el.innerHTML = R().bonds(c);
    else if (id === "designation") el.innerHTML = R().designation(c);
    else if (id === "gear") el.innerHTML = R().gear(c);
    else if (id === "cast") el.innerHTML = R().cast(c, state.cast);  // PRESERVED for reuse; no tab mounts #tab-cast now
  }

  function renderPortrait() {
    const c = active();
    const el = document.getElementById("portrait");
    el.title = c.portrait ? "Click to change the character image" : "Click to set the character image";
    if (c.portrait) {
      el.classList.add("hasart");
      el.innerHTML = `<img src="${c.portrait}" alt="${c.name}">`;
    } else {
      el.classList.remove("hasart");
      el.innerHTML = `<span class="initials">${M().initials(c.name)}</span>`;
    }
  }

  /* ---------------- tabs ---------------- */
  function setTab(id, btn) {
    state.activeTab = id;
    document.querySelectorAll(".tabpanel").forEach(p => p.classList.toggle("active", p.id === "tab-" + id));
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  }

  /* ---------------- Core: stats & resources ---------------- */
  function stepStat(key, d) {
    const c = active();
    c.stats[key] = M().clamp(c.stats[key] + d, 1, 12);
    M().clampRes(c);
    save(); renderTab("core"); renderTab("designation"); // Blue drives Feature Uses
  }
  function stepRes(key, d) {
    const c = active();
    c.res[key].cur = c.res[key].cur + d;
    M().clampRes(c);
    save(); renderTab("core");
  }
  function setArmor(n) {
    const c = active();
    c.res.armor = (c.res.armor === n ? n - 1 : n);
    M().clampRes(c);
    save(); renderTab("core");
  }

  /* ---------------- Archetypes: drift ---------------- */
  function setDrift(ai, n) {
    const a = active().archetypes[ai]; if (!a) return;
    const max = a.driftMax || 5;
    a.drift = (a.drift === n ? n - 1 : Math.min(n, max));
    // Drift at threshold → Faltering; below → Active (don't touch Silent/Retired).
    if (a.status === "active" || a.status === "faltering") a.status = a.drift >= max ? "faltering" : "active";
    save(); renderTab("archetypes");
  }
  function markDrift(i) { const a = active().archetypes[i]; if (a) setDrift(i, (a.drift || 0) + 1); }

  /* ---------------- assistive Fate / Tethers / Holds (P1) ---------------- */
  function addFate(delta) { const c = active(); c.res.fate.cur = M().clamp(c.res.fate.cur + delta, 0, 10); }

  function tetherAct(i)  { addFate(2); save(); renderTab("core"); toast("Acted on the Tether · +2 Fate"); }
  function tetherDraw(i) { const t = active().tethers[i]; toast(`Draw on ${t ? t.to : "the Tether"} — your next Cast has Advantage.`); }
  function tetherFray(i) { addFate(2); save(); renderTab("core"); toast("Frayed under pressure · +2 Fate"); }
  function tetherSever(i) {
    const t = active().tethers[i]; if (!t) return;
    t.status = "open"; addFate(2); save(); renderTab("core"); renderTab("bonds");
    toast("Severed · +2 Fate · re-tie it when its truth returns");
  }
  function tetherRetie(i) {
    const t = active().tethers[i]; if (!t) return;
    const nl = prompt("Re-tie the Tether — the truth as it is now:", t.line || "");
    if (nl == null) return;
    if (!Array.isArray(t.record)) t.record = [];
    t.record.push(t.line); t.old = t.line; t.line = (nl.trim() || t.line); t.status = "knot";
    save(); renderTab("bonds"); toast("Re-tied · a Knot in the Record");
  }
  function isolationAward() { addFate(2); save(); renderTab("core"); toast("Succeeded entirely alone · +2 Fate"); }

  function holdHonor(i) {
    const h = active().holds[i]; if (!h) return;
    h.timesHonored = (h.timesHonored || 0) + 1; addFate(3); save(); renderTab("core"); renderTab("bonds");
    toast("Honored under pressure · +3 Fate");
  }
  function holdYield(i) {
    const h = active().holds[i]; if (!h) return;
    h.status = "yielded"; h.vignetteOwed = true; addFate(6); save(); renderTab("core"); renderTab("bonds");
    toast("Yielded · +6 Fate · a Vignette is owed");
  }
  function holdHoldLine(i) {
    const c = active(); if (c.res.fate.cur < 5) { toast("Not enough Fate (need 5)."); return; }
    addFate(-5); save(); renderTab("core"); toast("Held the Line · −5 Fate");
  }
  function holdVignettePlayed(i) {
    const h = active().holds[i]; if (!h) return;
    h.vignetteOwed = false; save(); renderTab("bonds"); toast("The Vignette is played · the slot is free");
  }

  /* ---------------- the Crossing (P1) ---------------- */
  // Changing counted↔suspended adjusts the archetype's Core-Stat points on its tag (v004 §6.2).
  function setArchStatus(i, newStatus) {
    const c = active(); const a = c.archetypes[i]; if (!a) return;
    const wasCounted = a.status === "active" || a.status === "faltering";
    const willCount = newStatus === "active" || newStatus === "faltering";
    if (wasCounted && !willCount) c.stats[a.tag] = M().clamp(c.stats[a.tag] - (a.points || 0), 1, 12);
    if (!wasCounted && willCount) c.stats[a.tag] = M().clamp(c.stats[a.tag] + (a.points || 0), 1, 12);
    a.status = newStatus;
    if (newStatus === "active") a.drift = 0;   // Revise / Wake clears Drift
    M().clampRes(c);
    save(); renderTab("core"); renderTab("designation"); renderTab("archetypes"); refreshCrossing();
  }
  function crossRevise(i)  { setArchStatus(i, "active"); }
  function crossRetire(i)  { setArchStatus(i, "retired"); }
  function crossSilence(i) { setArchStatus(i, "silent"); }
  function crossWake(i)    { setArchStatus(i, "active"); }
  function openCrossing() {
    const o = document.getElementById("overlay");
    o.innerHTML = R().crossingModal(active());
    o.onclick = e => { if (e.target === o) closeCrossing(); };
  }
  function closeCrossing() { const o = document.getElementById("overlay"); if (o) { o.innerHTML = ""; o.onclick = null; } }
  function refreshCrossing() { const o = document.getElementById("overlay"); if (o && o.querySelector(".cross")) o.innerHTML = R().crossingModal(active()); }

  /* ---------------- Designation: feature uses (per-feature house rule) ---------------- */
  function toggleUse(fi, bi) {
    const f = active().features[fi]; if (!f) return;
    if (!Array.isArray(f.spent)) f.spent = [];
    f.spent[bi] = !f.spent[bi];
    save(); renderTab("designation");
  }
  function resetFeature(fi) {
    const f = active().features[fi]; if (!f) return;
    f.spent = [];   // all use-slots available again
    save(); renderTab("designation");
  }

  /* ---------------- Cast ---------------- */
  function setCastMode(m) { state.cast.mode = m; refreshCast(); }
  function setDifficulty(v) { state.cast.difficulty = parseInt(v, 10) || 1; }
  function doCast(key) {
    const c = active();
    const res = Vertex.dice.cast(c.stats[key], state.cast.difficulty, state.cast.mode);
    const out = document.getElementById("castOut");
    if (out) out.innerHTML = R().castResult(res, cap(key));
  }
  // The Cast modal — opened by clicking a Core stat numeral. Locked to that stat.
  function openCast(key) {
    state.cast = Object.assign({}, state.cast, { stat: key, mode: "normal", step: "difficulty", result: null });
    const o = document.getElementById("overlay");
    o.innerHTML = R().castModal(active(), state.cast);
    o.onclick = e => { if (e.target === o) closeCast(); };
  }
  function castChooseMode() { state.cast.step = "mode"; refreshCast(); }          // step 1 -> the mode dialog
  function castBackToDifficulty() { state.cast.step = "difficulty"; state.cast.result = null; refreshCast(); }
  function castWithMode(m) {                                                        // pick a mode -> roll
    state.cast.mode = m;
    const c = active();
    const res = Vertex.dice.cast(c.stats[state.cast.stat], state.cast.difficulty, m);
    state.cast.result = res;
    state.cast.step = res.needsChoice ? "choose" : "result";                       // tradeoff -> let the player pick
    refreshCast();
  }
  function castPickRoll(i) {                                                        // player resolves a tradeoff
    const res = state.cast.result;
    if (res && res.rolls[i]) { res.chosen = res.rolls[i]; state.cast.step = "result"; refreshCast(); }
  }
  function closeCast() { const o = document.getElementById("overlay"); if (o) { o.innerHTML = ""; o.onclick = null; } }
  function refreshCast() { const o = document.getElementById("overlay"); if (o && o.querySelector(".cast")) o.innerHTML = R().castModal(active(), state.cast); }

  /* ---------------- identity ---------------- */
  function editName(text) {
    const c = active();
    c.name = (text || "").trim() || "Unnamed";
    document.getElementById("idName").textContent = c.name;
    renderPortrait();
    document.getElementById("menu").innerHTML = R().menu(state.list, state.activeId);
    save();
  }
  function choosePortrait() { document.getElementById("portraitInput").click(); }
  function onPortraitFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      active().portrait = reader.result;
      renderPortrait();
      document.getElementById("menu").innerHTML = R().menu(state.list, state.activeId);
      save();
    };
    reader.readAsDataURL(file);
  }

  /* ---------------- character management ---------------- */
  function switchTo(id) {
    state.activeId = id;
    closeMenu(); renderAll(); setTab(state.activeTab);
    save();
  }
  function createNew() {
    const c = M().newCharacter();
    state.list.push(c); state.activeId = c.id;
    closeMenu(); save(); renderAll(); setTab("core");
    toast("New character created.");
  }
  // Called by the creation wizard (Vertex.create) with a fully-authored draft.
  function commitNewCharacter(c) {
    M().normalize(c);
    if (!c.id || state.list.some(x => x.id === c.id)) c.id = M().uid();
    state.list.push(c); state.activeId = c.id;
    closeMenu(); save(); renderAll(); setTab("core");
    toast(`“${c.name}” manifested.`);
    if (window.Vertex.drive && Vertex.drive.onCharacterCreated) Vertex.drive.onCharacterCreated();
  }
  // Called by the wizard in edit mode — replace the existing character in place (keeps its id).
  function saveCharacter(c) {
    M().normalize(c);
    const i = state.list.findIndex(x => x.id === c.id);
    if (i >= 0) state.list[i] = c; else { c.id = c.id || M().uid(); state.list.push(c); }
    state.activeId = c.id;
    closeMenu(); save(); renderAll(); setTab(state.activeTab);
    toast("Saved.");
  }
  function editSection(key) { Vertex.create.openEdit(key); }
  function deleteCharacter(id) {
    const c = state.list.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete “${c.name}”? This cannot be undone.`)) return;
    state.list = state.list.filter(x => x.id !== id);
    if (!state.list.length) state.list.push(M().newCharacter());
    if (state.activeId === id) state.activeId = state.list[0].id;
    save(); renderAll(); setTab(state.activeTab);
    toast("Character deleted.");
  }
  function exportCurrent() { S().exportCharacter(active()); closeMenu(); }
  function importPrompt() { document.getElementById("importInput").click(); }
  // Ingest a parsed character object (from a local file OR Google Drive).
  function onImportData(obj) {
    if (!obj || typeof obj !== "object") { toast("That file is not a Vertex character."); return; }
    M().normalize(obj);
    // Match an existing character by its linked Drive file, then by id, and UPDATE
    // it in place. Otherwise loading the same character — especially via Load from
    // Drive, whose file carries the original id — would append an endless duplicate.
    let i = -1;
    if (obj.driveFileId) i = state.list.findIndex(c => c.driveFileId === obj.driveFileId);
    if (i < 0 && obj.id) i = state.list.findIndex(c => c.id === obj.id);
    if (i >= 0) {
      obj.id = state.list[i].id;               // keep the existing entry's identity
      state.list[i] = obj; state.activeId = obj.id;
      closeMenu(); save(); renderAll(); setTab("core");
      toast(`Updated “${obj.name}” from the loaded copy.`);
      return;
    }
    if (!obj.id) obj.id = M().uid();
    state.list.push(obj); state.activeId = obj.id;
    closeMenu(); save(); renderAll(); setTab("core");
    toast(`Imported “${obj.name}”.`);
  }
  function onImportFile(file) {
    if (!file) return;
    S().importCharacter(file).then(onImportData).catch(err => toast(err.message || "Import failed."));
  }
  // ---- Google Drive seams (used by Vertex.drive) ----
  function getActive() { return active(); }
  function onDriveSaved(id, fileId, sharedEmail) {
    const c = state.list.find(x => x.id === id);
    if (!c) return;
    if (fileId) c.driveFileId = fileId;        // remember the file for in-place updates
    if (sharedEmail) c.driveSharedWith = sharedEmail;  // remember we've shared it with the Host
    suppressAutoSync = true; save(); suppressAutoSync = false;   // persist without re-triggering auto-save
  }

  /* ---------------- menu + misc ---------------- */
  function toggleMenu(e) { e.stopPropagation(); document.getElementById("menu").classList.toggle("open"); }
  function closeMenu() { document.getElementById("menu").classList.remove("open"); }
  function toast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800);
  }

  document.addEventListener("click", closeMenu);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return {
    init, setTab, stepStat, stepRes, setArmor, setDrift, markDrift, toggleUse, resetFeature,
    setCastMode, setDifficulty, doCast, openCast, castChooseMode, castBackToDifficulty, castWithMode, castPickRoll, closeCast, editName, choosePortrait, onPortraitFile,
    tetherAct, tetherDraw, tetherFray, tetherSever, tetherRetie, isolationAward,
    holdHonor, holdYield, holdHoldLine, holdVignettePlayed,
    openCrossing, closeCrossing, crossRevise, crossRetire, crossSilence, crossWake,
    switchTo, createNew, commitNewCharacter, saveCharacter, editSection, deleteCharacter, exportCurrent, importPrompt, onImportFile, onImportData,
    getActive, onDriveSaved, refreshMenu, toggleMenu
  };
})();
