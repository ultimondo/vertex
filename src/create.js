/* =======================================================================
   VERTEX — guided character creation (the wizard)
   A step-by-step authoring flow, in v004 order:
     Identity → Designation → Archetypes → Backstory → Bonds → Image → Review
   Free-form authoring (no catalogs yet). Builds a Vertex.model character and
   hands it to Vertex.app.commitNewCharacter(). Pure global; no build step.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.create = (function () {
  const M = () => Vertex.model;
  const cap = s => (s || "").charAt(0).toUpperCase() + (s || "").slice(1);
  const esc = s => (s == null ? "" : String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;"));

  const SLOTS = ["Head", "Face", "Neck", "Back", "Torso", "Hands", "Waist", "Legs", "Feet", "Accessory"];
  const STEPS = [
    { key: "identity",    label: "Identity",     hint: "who they are when the Story begins" },
    { key: "designation", label: "Designation",  hint: "the practical shape you take" },
    { key: "archetypes",  label: "Archetypes",   hint: "the forces you must reconcile" },
    { key: "backstory",   label: "Backstory",    hint: "history is as fluid as the future" },
    { key: "bonds",       label: "Convictions & Tethers", hint: "what you will not cross · who others are to you", optional: true },
    { key: "image",       label: "Image",        hint: "the visual expression of your presence", optional: true },
    { key: "review",      label: "Review",       hint: "meet who you have manifested" }
  ];

  let draft = null;
  let step = 0;
  let mode = "create";   // "create" | "edit"

  /* ---------------- lifecycle ---------------- */
  function open() {
    mode = "create";
    draft = M().newCharacter("");
    draft.name = "";
    draft.designation = { name: "", tagline: "", descriptors: "" };
    draft.features = [
      { name: "", type: "major",   desc: "" },
      { name: "", type: "minor",   desc: "" },
      { name: "", type: "passive", desc: "" }
    ];
    draft.items = [
      { kind: "weapon",    name: "", stat: "red", range: "", flavor: "" },
      { kind: "wearable",  name: "", slot: "Torso", armor: 0, flavor: "" },
      { kind: "accessory", name: "", flavor: "" }
    ];
    draft.archetypes = [blankArch()];
    step = 0;
    mount();
    render();
  }

  function close() {
    const o = document.getElementById("overlay");
    if (o) { o.innerHTML = ""; }
    document.removeEventListener("keydown", onKey);
    draft = null;
  }

  function mount() {
    let o = document.getElementById("overlay");
    if (!o) { o = document.createElement("div"); o.id = "overlay"; document.body.appendChild(o); }
    o.onclick = e => { if (e.target === o) close(); };
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function blankArch() {
    return { name: "", tagline: "", desc: "", tag: "red", points: 0, status: "active", drift: 0, driftMax: 5 };
  }

  /* ---------------- navigation ---------------- */
  function go(n) { step = Math.max(0, Math.min(STEPS.length - 1, n)); render(); }
  function next() { if (step < STEPS.length - 1) go(step + 1); }
  function prev() { if (step > 0) go(step - 1); }

  /* ---------------- setters (mutate draft, usually no re-render) ---------------- */
  function set(field, v) { draft[field] = v; }
  function setDesig(field, v) { draft.designation[field] = v; }
  function setFeature(i, field, v) { if (draft.features[i]) draft.features[i][field] = v; }
  function setItem(i, field, v) {
    const it = draft.items[i]; if (!it) return;
    it[field] = field === "armor" ? Math.max(0, Math.min(5, parseInt(v, 10) || 0)) : v;
  }
  function setBack(field, v) { draft.backstory[field] = v; }

  function setArch(i, field, v) { if (draft.archetypes[i]) draft.archetypes[i][field] = v; }
  function addArch() { if (draft.archetypes.length < 5) { draft.archetypes.push(blankArch()); render(); } }
  function removeArch(i) { draft.archetypes.splice(i, 1); if (!draft.archetypes.length) draft.archetypes.push(blankArch()); render(); }
  function totalPoints() { return draft.archetypes.reduce((s, a) => s + (a.points || 0), 0); }
  function stepArchPoints(i, d) {
    const a = draft.archetypes[i]; if (!a) return;
    let n = Math.max(0, Math.min(3, (a.points || 0) + d));
    const others = totalPoints() - (a.points || 0);
    if (others + n > 5) n = Math.max(0, 5 - others);
    a.points = n;
    render();
  }

  function addHold() { if (draft.holds.length < 2) { draft.holds.push({ line: "", status: "active", timesHonored: 0, vignetteOwed: false }); render(); } }
  function removeHold(i) { draft.holds.splice(i, 1); render(); }
  function setHold(i, v) { if (draft.holds[i]) draft.holds[i].line = v; }

  function addTether() { if (draft.tethers.length < 3) { draft.tethers.push({ to: "", line: "", status: "" }); render(); } }
  function removeTether(i) { draft.tethers.splice(i, 1); render(); }
  function setTether(i, field, v) { if (draft.tethers[i]) draft.tethers[i][field] = v; }

  function chooseImage() { const el = document.getElementById("wzImgInput"); if (el) el.click(); }
  function onImage(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => { draft.portrait = r.result; render(); };
    r.readAsDataURL(file);
  }
  function clearImage() { draft.portrait = null; render(); }

  /* ---------------- derived (creation-time) ---------------- */
  // v004: start 1/1/1; each Archetype's Core Stat Tag adds its allocated points.
  function computeStats(d) {
    const s = { red: 1, green: 1, blue: 1 };
    (d.archetypes || []).forEach(a => {
      if (a.tag && a.points) s[a.tag] = (s[a.tag] || 0) + a.points;
    });
    s.red = Math.min(12, s.red); s.green = Math.min(12, s.green); s.blue = Math.min(12, s.blue);
    return s;
  }

  /* ---------------- rendering ---------------- */
  function render() {
    const o = document.getElementById("overlay");
    if (!o) return;
    const s = STEPS[step];
    const rail = STEPS.map((st, i) => {
      const cls = i === step ? "cur" : i < step ? "done" : "";
      return `<button class="wzstep ${cls}" onclick="Vertex.create.go(${i})">
        <span class="dot"></span><span class="lbl">${st.label}${st.optional ? " <em>· optional</em>" : ""}</span></button>`;
    }).join("");
    const last = step === STEPS.length - 1;
    o.innerHTML = `
      <div class="wz" role="dialog" aria-modal="true">
        <aside class="wz-rail">
          <div class="wz-brand">${mode === "edit" ? "Edit Character" : "Create Character"}</div>
          ${rail}
          <button class="wz-cancel" onclick="Vertex.create.close()">Cancel</button>
        </aside>
        <div class="wz-main">
          <header class="wz-head"><h2>${s.label}</h2><span class="wz-hint">${s.hint}</span></header>
          <div class="wz-body">${body()}</div>
          <footer class="wz-foot">
            <button class="wz-ghost" ${step === 0 ? "disabled" : ""} onclick="Vertex.create.prev()">‹ Back</button>
            <span class="wz-count">Step ${step + 1} of ${STEPS.length}</span>
            ${mode === "edit"
              ? `<button class="wz-go" onclick="Vertex.create.commitEdit()">Save changes</button>`
              : last
                ? `<button class="wz-go" onclick="Vertex.create.commit()">Manifest character</button>`
                : `<button class="wz-go" onclick="Vertex.create.next()">Next ›</button>`}
          </footer>
        </div>
      </div>`;
  }

  function field(label, html, sub) {
    return `<label class="wz-field"><span class="wz-lbl">${label}${sub ? ` <em>${sub}</em>` : ""}</span>${html}</label>`;
  }
  const inp = (val, oninput, ph) => `<input type="text" value="${esc(val)}" placeholder="${esc(ph || "")}" oninput="${oninput}">`;
  const ta = (val, oninput, ph, rows) => `<textarea rows="${rows || 3}" placeholder="${esc(ph || "")}" oninput="${oninput}">${esc(val)}</textarea>`;

  function body() {
    switch (STEPS[step].key) {
      case "identity":    return stepIdentity();
      case "designation": return stepDesignation();
      case "archetypes":  return stepArchetypes();
      case "backstory":   return stepBackstory();
      case "bonds":       return stepBonds();
      case "image":       return stepImage();
      case "review":      return stepReview();
    }
    return "";
  }

  function stepIdentity() {
    return `<p class="wz-prose">From this moment you are no longer you. Name who you have become — and the line that lingers beneath the name.</p>
      ${field("Name", inp(draft.name, "Vertex.create.set('name',this.value)", "e.g. Mara Quill"))}
      ${field("Epithet", inp(draft.epithet, "Vertex.create.set('epithet',this.value)", "the version of you that you have never met"), "shown beneath the name · optional")}`;
  }

  function stepDesignation() {
    const d = draft.designation;
    const blue = computeStats(draft).blue;
    const feats = draft.features.map((f, i) => {
      const topts = ["major", "minor", "passive"].map(t =>
        `<option value="${t}" ${f.type === t ? "selected" : ""}>${cap(t)} ${t === "passive" ? "Feature" : "Action"}</option>`).join("");
      const usesRow = f.type === "passive"
        ? `<div class="wz-mini">Passive · always true, costs no Uses.</div>`
        : `<div class="wz-mini">Usable up to your <b class="blue">Blue</b> score (now ${blue}) per encounter/scene — each Feature keeps its own track.</div>`;
      return `<div class="wz-card">
        <div class="wz-card-h"><select class="ftype-sel ${f.type}" onchange="Vertex.create.setFeatureType(${i},this.value)">${topts}</select>
          <button class="wz-x" title="Remove" onclick="Vertex.create.removeFeature(${i})">✕</button></div>
        ${field("Name", inp(f.name, `Vertex.create.setFeature(${i},'name',this.value)`, f.type === "major" ? "the thing only you do" : ""))}
        ${field("What it enables — and what it costs", ta(f.desc, `Vertex.create.setFeature(${i},'desc',this.value)`, "", 2))}
        ${usesRow}
      </div>`;
    }).join("");
    const items = draft.items.map((it, i) => itemCard(it, i)).join("");
    return `<p class="wz-prose">Your Designation is your posture toward the world — the skills your hands have learned. It grants three Features and three starting Items.</p>
      ${field("Designation name", inp(d.name, "Vertex.create.setDesig('name',this.value)", "e.g. Blacksmith"))}
      ${field("Three defining qualities", inp(d.descriptors, "Vertex.create.setDesig('descriptors',this.value)", "Stalwart · Exacting · Worn"))}
      ${field("A single declarative sentence", inp(d.tagline, "Vertex.create.setDesig('tagline',this.value)", "You forge what others only imagine."))}
      <h3 class="wz-sub">Features <em>· each usable up to your Blue score</em></h3>
      <p class="wz-mini">Feature Uses are set by <b class="blue">Blue</b>, which you raise through Archetype Core Stat Tags in the next step (and freely on the Core tab).</p>
      ${feats}
      <h3 class="wz-sub">Items <em>· weapons, wearables, accessories</em></h3>${items}
      <div class="wz-additem">
        <button class="wz-add" onclick="Vertex.create.addItem('weapon')">+ Weapon</button>
        <button class="wz-add" onclick="Vertex.create.addItem('wearable')">+ Wearable</button>
        <button class="wz-add" onclick="Vertex.create.addItem('accessory')">+ Accessory</button>
      </div>`;
  }

  function itemCard(it, i) {
    if (it.kind === "weapon") {
      const opts = ["red", "green", "blue"].map(s => `<option value="${s}" ${it.stat === s ? "selected" : ""}>${cap(s)}</option>`).join("");
      return `<div class="wz-card"><div class="wz-card-h"><span class="ftype">Weapon</span><button class="wz-x" title="Remove" onclick="Vertex.create.removeItem(${i})">✕</button></div>
        ${field("Name", inp(it.name, `Vertex.create.setItem(${i},'name',this.value)`, "e.g. Forge Hammer"))}
        <div class="wz-row">
          ${field("Core Stat", `<select onchange="Vertex.create.setItem(${i},'stat',this.value)">${opts}</select>`, "how it strikes")}
          ${field("Range", inp(it.range, `Vertex.create.setItem(${i},'range',this.value)`, "Close · Reach · Long…"))}
        </div>
        ${field("Flavor", ta(it.flavor, `Vertex.create.setItem(${i},'flavor',this.value)`, "", 2))}</div>`;
    }
    if (it.kind === "wearable") {
      const opts = SLOTS.map(s => `<option value="${s}" ${it.slot === s ? "selected" : ""}>${s}</option>`).join("");
      return `<div class="wz-card"><div class="wz-card-h"><span class="ftype">Wearable</span><button class="wz-x" title="Remove" onclick="Vertex.create.removeItem(${i})">✕</button></div>
        ${field("Name", inp(it.name, `Vertex.create.setItem(${i},'name',this.value)`, "e.g. Leather Apron"))}
        <div class="wz-row">
          ${field("Slot", `<select onchange="Vertex.create.setItem(${i},'slot',this.value)">${opts}</select>`)}
          ${field("Armor", `<input type="number" min="0" max="5" value="${it.armor}" onchange="Vertex.create.setItem(${i},'armor',this.value)">`, "0–5")}
        </div>
        ${field("Flavor", ta(it.flavor, `Vertex.create.setItem(${i},'flavor',this.value)`, "", 2))}</div>`;
    }
    return `<div class="wz-card"><div class="wz-card-h"><span class="ftype">Accessory</span><button class="wz-x" title="Remove" onclick="Vertex.create.removeItem(${i})">✕</button></div>
      ${field("Name", inp(it.name, `Vertex.create.setItem(${i},'name',this.value)`, "e.g. Cracked Pocket Watch"))}
      ${field("Flavor", ta(it.flavor, `Vertex.create.setItem(${i},'flavor',this.value)`, "", 2))}</div>`;
  }

  function stepArchetypes() {
    const used = totalPoints();
    const st = computeStats(draft);
    const chips = ["red", "green", "blue"].map(k =>
      `<span class="wz-chip ${k}">${cap(k)} <b>${st[k]}</b></span>`).join("");
    const overWarn = used > 5 ? ` wz-over` : "";
    const cards = draft.archetypes.map((a, i) => {
      const opts = ["red", "green", "blue"].map(s => `<option value="${s}" ${a.tag === s ? "selected" : ""}>${cap(s)}</option>`).join("");
      return `<div class="wz-card">
        <div class="wz-card-h"><span class="ftype">Archetype ${i + 1}</span>
          <button class="wz-x" title="Remove" onclick="Vertex.create.removeArch(${i})">✕</button></div>
        ${field("Name", inp(a.name, `Vertex.create.setArch(${i},'name',this.value)`, "e.g. Integrity"))}
        ${field("Tagline", inp(a.tagline, `Vertex.create.setArch(${i},'tagline',this.value)`, "what it whispers when you embody it"))}
        ${field("What it enables — and what it costs", ta(a.desc, `Vertex.create.setArch(${i},'desc',this.value)`, "Read both with equal weight. The cost is not a footnote.", 3))}
        <div class="wz-row">
          ${field("Core Stat Tag", `<select onchange="Vertex.create.setArch(${i},'tag',this.value)">${opts}</select>`)}
          ${field("Points", `<div class="wz-pts">
              <button onclick="Vertex.create.stepArchPoints(${i},-1)">−</button>
              <span>${a.points}</span>
              <button onclick="Vertex.create.stepArchPoints(${i},1)">+</button></div>`, "0–3 to the tag")}
        </div>
      </div>`;
    }).join("");
    return `<p class="wz-prose">An Archetype is a force inside your character — a belief, an instinct, the lens you judge every choice through. Choose only enough to feel genuinely inhabited (≤ 5).</p>
      <div class="wz-alloc${overWarn}">
        <div class="wz-alloc-l">Core-Stat points allocated <b>${used} / 5</b>${used > 5 ? " — over the v004 limit" : ""}</div>
        <div class="wz-alloc-r">Starting stats: ${chips}</div>
      </div>
      ${cards}
      <button class="wz-add" ${draft.archetypes.length >= 5 ? "disabled" : ""} onclick="Vertex.create.addArch()">+ Embrace another Archetype</button>`;
  }

  function stepBackstory() {
    const b = draft.backstory;
    return `<p class="wz-prose">Backstory in Vertex defies chronology. It need not be a list of past events — only an exploration of who this person is. Use or ignore these prompts.</p>
      ${field("Where did you come from?", ta(b.origin, "Vertex.create.setBack('origin',this.value)", "A crowded city, a silent frontier, a place that no longer exists?", 2))}
      ${field("Who (or what) has shaped you?", ta(b.shaped, "Vertex.create.setBack('shaped',this.value)", "A mentor, a rival, a lost love, a tragedy, an oath?", 2))}
      ${field("What makes you unique?", ta(b.unique, "Vertex.create.setBack('unique',this.value)", "A secret, a superstition, a brush with the unknown?", 2))}
      ${field("What is your ultimate wish?", ta(b.wish, "Vertex.create.setBack('wish',this.value)", "The one thing you would lose everything to achieve.", 2))}
      ${field("In their own words", ta(draft.biography, "Vertex.create.set('biography',this.value)", "Anything else — a voice, a scene, a fragment.", 3), "free prose · optional")}`;
  }

  function stepBonds() {
    const holds = draft.holds.map((h, i) => `<div class="wz-card">
      <div class="wz-card-h"><span class="ftype">Hold ${i + 1}</span><button class="wz-x" onclick="Vertex.create.removeHold(${i})">✕</button></div>
      ${field("The line you will not cross", ta(h.line, `Vertex.create.setHold(${i},this.value)`, "First person, present tense, specific and testable — “I will not kill anyone who has surrendered to me.”", 2))}
    </div>`).join("");
    const tethers = draft.tethers.map((t, i) => `<div class="wz-card">
      <div class="wz-card-h"><span class="ftype">Tether ${i + 1}</span><button class="wz-x" onclick="Vertex.create.removeTether(${i})">✕</button></div>
      ${field("To whom", inp(t.to, `Vertex.create.setTether(${i},'to',this.value)`, "a specific character"))}
      ${field("What they are to you, now", ta(t.line, `Vertex.create.setTether(${i},'line',this.value)`, "“The only person who has never looked at me with pity.”", 2))}
    </div>`).join("");
    return `<p class="wz-prose">Both are optional at creation. A Hold is a vow staked on your identity (≤ 2). A Tether names what another character is to you now (≤ 3) — and a character who holds none is <b>Isolated</b>.</p>
      <h3 class="wz-sub">Conviction Holds</h3>
      ${holds || `<div class="wz-none">No Holds declared.</div>`}
      <button class="wz-add" ${draft.holds.length >= 2 ? "disabled" : ""} onclick="Vertex.create.addHold()">+ Declare a Hold</button>
      <h3 class="wz-sub">Tethers</h3>
      ${tethers || `<div class="wz-none">No Tethers — this character begins Isolated.</div>`}
      <button class="wz-add" ${draft.tethers.length >= 3 ? "disabled" : ""} onclick="Vertex.create.addTether()">+ Tie a Tether</button>`;
  }

  function stepImage() {
    const has = !!draft.portrait;
    const inner = has
      ? `<img src="${draft.portrait}" alt="">`
      : `<span class="wz-initials">${M().initials(draft.name || "?")}</span>`;
    return `<p class="wz-prose">Your Image need not be literal — a sketch, an abstract blur, anything that captures your presence. You can also add it later.</p>
      <div class="wz-img">
        <div class="wz-img-frame ${has ? "has" : ""}">${inner}</div>
        <div class="wz-img-ctrl">
          <input type="file" id="wzImgInput" accept="image/*" hidden onchange="Vertex.create.onImage(this.files[0])">
          <button class="wz-go" onclick="Vertex.create.chooseImage()">${has ? "Replace image" : "Upload image"}</button>
          ${has ? `<button class="wz-ghost" onclick="Vertex.create.clearImage()">Remove</button>` : ``}
          <p class="wz-mini">Until you add art, every character shares the same dark-purple placeholder with their initials.</p>
        </div>
      </div>`;
  }

  function stepReview() {
    const st = computeStats(draft);
    const d = M().derived({ stats: st });
    const named = arr => arr.filter(x => (x.name || x.line || "").trim());
    const arcs = named(draft.archetypes);
    const feats = named(draft.features);
    const items = named(draft.items);
    const arcList = arcs.length
      ? arcs.map(a => `<li><b>${esc(a.name)}</b> <span class="wz-chip ${a.tag}">${cap(a.tag)} +${a.points || 0}</span>${a.tagline ? ` — <i>${esc(a.tagline)}</i>` : ""}</li>`).join("")
      : `<li class="wz-none">none</li>`;
    const line = (k, v) => `<div class="wz-rv"><span>${k}</span><b>${v}</b></div>`;
    return `<p class="wz-prose">This is who you have manifested. Everything here remains editable on the sheet afterward.</p>
      <div class="wz-review">
        <div class="wz-rv-name">${esc(draft.name || "Unnamed")}</div>
        ${draft.epithet ? `<div class="wz-rv-ep">${esc(draft.epithet)}</div>` : ""}
        ${line("Designation", esc(draft.designation.name || "—"))}
        <div class="wz-chips">
          <span class="wz-chip red">Red <b>${st.red}</b></span>
          <span class="wz-chip green">Green <b>${st.green}</b></span>
          <span class="wz-chip blue">Blue <b>${st.blue}</b></span>
        </div>
        ${line("Max HP", d.maxHP)}
        ${line("Movement", d.move + "u")}
        ${line("Target Difficulty", d.difficulty)}
        ${line("Feature Uses", d.featureUses)}
        <div class="wz-rv-sec">Archetypes <em>(${totalPoints()}/5 points)</em></div>
        <ul class="wz-rv-list">${arcList}</ul>
        ${line("Features authored", feats.length + " / 3")}
        ${line("Items authored", items.length + " / 3")}
        ${line("Conviction Holds", named(draft.holds).length)}
        ${line("Tethers", named(draft.tethers).length || (named(draft.tethers).length === 0 ? "0 · Isolated" : 0))}
      </div>`;
  }

  /* ---------------- commit ---------------- */
  function commit() {
    const d = draft;
    // drop empty rows
    d.archetypes = d.archetypes.filter(a => (a.name || "").trim());
    d.features = d.features.filter(f => (f.name || "").trim());
    d.holds = d.holds.filter(h => (h.line || "").trim());
    d.tethers = d.tethers.filter(t => (t.line || "").trim());
    d.items = d.items.filter(it => (it.name || "").trim()).map(finalizeItem);

    // v004 stats from archetype tags; start at full HP; armor from worn pieces
    d.stats = computeStats(d);
    d.name = (d.name || "").trim() || "Unnamed";
    if (!(d.designation.name || d.designation.tagline || d.designation.descriptors).trim()) d.designation = null;
    d.res.hp.cur = d.stats.red;
    d.res.armor = Math.max(0, Math.min(5, d.items.reduce((s, it) => s + (it.kind === "wearable" ? (it.armor || 0) : 0), 0)));

    Vertex.app.commitNewCharacter(d);
    close();
  }

  /* ---------------- edit mode (reuses every step editor) ---------------- */
  function openEdit(stepKey) {
    const src = Vertex.app.getActive();
    if (!src) return;
    draft = JSON.parse(JSON.stringify(src));
    M().normalize(draft);
    if (!draft.designation) draft.designation = { name: "", tagline: "", descriptors: "" };
    draft.backstory = Object.assign({ origin: "", shaped: "", unique: "", wish: "" }, draft.backstory);
    if (typeof draft.epithet !== "string") draft.epithet = "";
    (draft.items || []).forEach(hydrateItem);
    mode = "edit";
    step = STEPS.findIndex(s => s.key === stepKey);
    if (step < 0) step = 0;
    mount();
    render();
  }

  // Edit-mode keeps the character's live stats/res; only authored content changes.
  function commitEdit() {
    const d = draft;
    d.archetypes = d.archetypes.filter(a => (a.name || "").trim());
    d.features = d.features.filter(f => (f.name || "").trim());
    d.holds = d.holds.filter(h => (h.line || "").trim());
    d.tethers = d.tethers.filter(t => (t.line || "").trim());
    d.items = d.items.filter(it => (it.name || "").trim()).map(finalizeItem);
    d.name = (d.name || "").trim() || "Unnamed";
    const dz = d.designation || {};
    if (!((dz.name || "") + (dz.tagline || "") + (dz.descriptors || "")).trim()) d.designation = null;
    Vertex.app.saveCharacter(d);
    close();
  }

  // Legacy/seed items carry only a meta string; infer structured fields so they edit cleanly.
  function hydrateItem(it) {
    if (it.kind) return;
    const m = it.meta || "";
    if (/^weapon/i.test(m)) { it.kind = "weapon"; it.stat = /green/i.test(m) ? "green" : /blue/i.test(m) ? "blue" : "red"; const r = m.match(/range\s+([^·]+)/i); it.range = r ? r[1].trim() : ""; }
    else if (/^wearable/i.test(m)) { it.kind = "wearable"; it.slot = it.slot || "Torso"; const a = m.match(/armor\s+(\d+)/i); it.armor = a ? +a[1] : (it.armor || 0); }
    else it.kind = "accessory";
  }

  function itemMeta(it) {
    if (it.kind === "weapon") return ["Weapon", cap(it.stat || "red"), it.range].filter(Boolean).join(" · ");
    if (it.kind === "wearable") return ["Wearable", it.slot, it.armor > 0 ? "Armor " + it.armor : ""].filter(Boolean).join(" · ");
    if (it.kind === "accessory") return "Accessory";
    return it.meta || "";
  }
  function finalizeItem(it) {
    return {
      name: it.name, kind: it.kind, meta: itemMeta(it), flavor: it.flavor || "",
      stat: it.stat, range: it.range, slot: it.slot, armor: it.armor,
      equipped: !!it.equipped, broken: !!it.broken
    };
  }

  function setFeatureType(i, v) { setFeature(i, "type", v); render(); }
  function addFeature() { draft.features.push({ name: "", type: "minor", desc: "" }); render(); }
  function removeFeature(i) { draft.features.splice(i, 1); render(); }
  function addItem(kind) {
    draft.items.push(kind === "weapon" ? { kind, name: "", stat: "red", range: "", flavor: "" }
      : kind === "wearable" ? { kind, name: "", slot: "Torso", armor: 0, flavor: "" }
      : { kind: "accessory", name: "", flavor: "" });
    render();
  }
  function removeItem(i) { draft.items.splice(i, 1); render(); }

  return {
    open, openEdit, close, go, next, prev,
    set, setDesig, setFeature, setFeatureType, addFeature, removeFeature, setItem, addItem, removeItem, setBack,
    setArch, addArch, removeArch, stepArchPoints,
    addHold, removeHold, setHold, addTether, removeTether, setTether,
    chooseImage, onImage, clearImage, commit, commitEdit
  };
})();
