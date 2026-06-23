/* =======================================================================
   VERTEX — rendering (character data -> tab HTML)
   Pure string builders. Interactive controls call Vertex.app.* handlers.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.render = (function () {
  const M = () => Vertex.model;
  const esc = s => (s == null ? "" : String(s));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  const DOMAINS = {
    red: "Force · Presence · Resilience · Fortitude",
    green: "Precision · Reflex · Balance · Stealth",
    blue: "Intellect · Discourse · Perception · Abstraction"
  };

  function core(c) {
    const s = c.stats, r = c.res, d = M().derived(c);
    // The Monument: each Core Stat is a large centered serif numeral carrying its
    // colour, its domains on one line, and quiet hover steppers to edit it.
    // derived lines are passed as an array so they stack vertically (no wrapping)
    const mono = (key, label, lines) => `
      <div class="mn ${key}">
        <div class="mnstep">
          <button title="decrease ${label}" onclick="Vertex.app.stepStat('${key}',-1)">−</button>
          <button title="increase ${label}" onclick="Vertex.app.stepStat('${key}',1)">+</button>
        </div>
        <div class="big" title="Cast ${label}" onclick="Vertex.app.openCast('${key}')">${s[key]}</div>
        <div class="lbl">${label}</div>
        <div class="dom">${DOMAINS[key]}</div>
        <div class="der">${lines.map(l => `<div class="derline">${l}</div>`).join("")}</div>
      </div>`;
    return `
    <div class="resblock">
      <div class="blabel">Resources</div>
      <div class="resgrid">
        ${meter("fate", "Fate:", r.fate.cur, d.fateMax)}
        ${meter("hp", "Hit Points:", r.hp.cur, d.maxHP)}
        ${armorMeter(r.armor)}
        ${meter("temp", "Temporary Hit Points:", r.temp.cur, d.tempMax)}
      </div>
    </div>
    <div class="monnum">
      ${mono("red", "Red", [`Maximum Hit Points: <b class="red">${d.maxHP}</b>`])}
      ${mono("green", "Green", [
        `Initiative: <b class="green">${s.green}</b>`,
        `Movement Speed: <b class="green">${d.move}</b> Units`,
        `Difficulty: <b class="green">${d.difficulty}</b>`
      ])}
      ${mono("blue", "Blue", [`Feature Uses: <b class="blue">${d.featureUses}</b>`])}
    </div>`;
  }

  function meter(key, label, cur, max) {
    const pct = max > 0 ? (100 * cur / max) : 0;
    return `<div class="meter ${key}"><span class="mk">${label}</span>
      <div class="stepper">
        <button onclick="Vertex.app.stepRes('${key}',-1)">−</button>
        <span class="mv">${cur} / ${max}</span>
        <button onclick="Vertex.app.stepRes('${key}',1)">+</button>
      </div>
      <div class="track"><i style="width:${pct}%"></i></div></div>`;
  }

  function armorMeter(armor) {
    const pips = [1,2,3,4,5].map(n =>
      `<span class="p ${n <= armor ? "on" : ""}" onclick="Vertex.app.setArmor(${n})"></span>`).join("");
    return `<div class="meter armor"><span class="mk">Armor:</span>
      <div class="stepper"><span class="mv">${armor} / 5</span></div>
      <div class="pips">${pips}</div></div>`;
  }

  function archetypes(c) {
    if (!c.archetypes.length) return tabLead("Archetypes · forces in tension", "archetypes") + `<div class="empty">No Archetypes yet.</div>`;
    const cards = c.archetypes.map((a, i) => {
      const max = a.driftMax || 5;
      const frozen = a.status === "silent" || a.status === "retired";
      const chip = frozen ? "susp." : `${cap(a.tag)} · ${a.points >= 0 ? "+" + a.points : a.points}`;
      const drift = frozen
        ? `<span class="dnote">${a.status === "silent" ? "numbed · woken at a Crossing" : "retired · kept as record"}</span>`
        : `<span class="notch">${Array.from({ length: max }, (_, n) =>
            `<i class="${n < a.drift ? "on" : ""}" title="set drift to ${n + 1}" onclick="Vertex.app.setDrift(${i},${n + 1})"></i>`).join("")}<button class="driftadd" title="Mark Drift +1" onclick="Vertex.app.markDrift(${i})">+</button></span>`;
      return `<div class="ix-arc ${a.tag} ${a.status}">
        <div class="a1"><span class="nm">${esc(a.name)}</span><span class="st ${a.status}">${cap(a.status)}</span></div>
        <div class="tl">${esc(a.tagline)}</div>
        <div class="drow"><span class="statchip ${a.tag}">${chip}</span>${drift}</div>
      </div>`;
    }).join("");
    return tabLead("Archetypes · forces in tension · drift and the Crossing", "archetypes")
      + `<div class="ix-grid">${cards}</div>`
      + `<div class="tabactions"><button class="editbtn" onclick="Vertex.app.openCrossing()">Call the Crossing</button></div>`;
  }

  // The Crossing — a reckoning at arc boundaries (modal in #overlay).
  function crossingModal(c) {
    const rows = c.archetypes.length ? c.archetypes.map((a, i) => {
      const acts = a.status === "silent"
        ? `<button onclick="Vertex.app.crossWake(${i})">Wake</button>`
        : a.status === "retired"
          ? `<span class="dnote">kept as record</span>`
          : `<button onclick="Vertex.app.crossRevise(${i})">Revise</button><button onclick="Vertex.app.crossRetire(${i})">Retire</button><button onclick="Vertex.app.crossSilence(${i})">Let fall Silent</button>`;
      return `<div class="cross-row">
        <div><span class="nm">${esc(a.name)}</span> <span class="st ${a.status}">${cap(a.status)}</span>
          <div class="cross-tl">${esc(a.tagline)}</div></div>
        <div class="cross-acts">${acts}</div></div>`;
    }).join("") : `<div class="empty">No Archetypes to reckon with.</div>`;
    return `<div class="cross" role="dialog" aria-modal="true">
      <div class="cross-head"><h3>The Crossing</h3>
        <p>The reckoning. <b>Revise</b> to clear Drift, <b>Retire</b> or let one fall <b>Silent</b>
        (its Core-Stat points suspend, lowering the stat), or <b>Wake</b> a Silent one.</p></div>
      <div class="cross-body">${rows}</div>
      <div class="cross-foot">
        <button class="editbtn" onclick="Vertex.app.editSection('backstory')">Revise Backstory</button>
        <button class="wz-go" onclick="Vertex.app.closeCrossing()">Done</button></div>
    </div>`;
  }

  function bonds(c) {
    const tethers = c.tethers.length ? c.tethers.map((t, i) => {
      const acts = t.status === "open"
        ? `<div class="acts"><button onclick="Vertex.app.tetherRetie(${i})">Re-tie</button></div>`
        : `<div class="acts"><button onclick="Vertex.app.tetherAct(${i})">Act · +2</button><button onclick="Vertex.app.tetherDraw(${i})">Draw · Adv</button><button onclick="Vertex.app.tetherFray(${i})">Fray · +2</button><button onclick="Vertex.app.tetherSever(${i})">Sever</button></div>`;
      if (t.status === "knot")
        return `<div class="ix-bond"><div class="to">to ${esc(t.to)} · re-tied</div>
          <div class="line"><span class="old">${esc(t.old)}</span><span class="new">${esc(t.line)}</span></div>
          <div class="meta"><span>Knot · the moment it changed</span></div>${acts}</div>`;
      if (t.status === "open")
        return `<div class="ix-bond severed"><div class="to">to ${esc(t.to)} · open / severed</div><div class="line">${esc(t.line)}</div>${acts}</div>`;
      return `<div class="ix-bond"><div class="to">to ${esc(t.to)}</div><div class="line">${esc(t.line)}</div><div class="meta"><span>Active</span></div>${acts}</div>`;
    }).join("") : `<div class="empty">No Tethers yet. A character who holds none is Isolated.<div class="acts"><button onclick="Vertex.app.isolationAward()">Succeeded alone · +2</button></div></div>`;

    const holds = c.holds.length ? c.holds.map((h, i) => {
      const meta = h.status === "yielded"
        ? `<span>Yielded</span>${h.vignetteOwed ? `<span class="owed">Vignette owed · slot locked</span>` : ""}`
        : `<span>Active</span><span>Honored under pressure <b>×${h.timesHonored || 0}</b></span>`;
      const acts = h.status === "yielded"
        ? (h.vignetteOwed ? `<div class="acts"><button onclick="Vertex.app.holdVignettePlayed(${i})">Vignette played</button></div>` : "")
        : `<div class="acts"><button onclick="Vertex.app.holdHonor(${i})">Honor · +3</button><button onclick="Vertex.app.holdYield(${i})">Yield · +6</button><button onclick="Vertex.app.holdHoldLine(${i})">Hold the Line · −5</button></div>`;
      return `<div class="ix-bond hold ${h.status === "yielded" ? "yielded" : ""}"><div class="line">${esc(h.line)}</div><div class="meta">${meta}</div>${acts}</div>`;
    }).join("") : `<div class="empty">No Conviction Holds yet.</div>`;

    return tabLead("Tethers · what they are to you, now", "bonds") + tethers
      + `<div class="tablead" style="margin-top:34px">Conviction Holds · the line you will not cross</div>` + holds;
  }

  function designation(c) {
    if (!c.designation && !c.features.length) return tabLead("Designation", "designation") + `<div class="empty">No Designation selected yet. Use Edit to choose one.</div>`;
    const dz = c.designation || { name: "—", tagline: "", descriptors: "" };
    const uses = M().derived(c).featureUses;   // = Blue score; each Feature is usable this many times
    const feats = c.features.map((f, i) => {
      const right = f.type === "passive"
        ? `<span class="always">Always active · costs no uses</span>`
        : `<div class="uses"><span class="ulbl">Uses <b class="blue">Blue ${uses}</b></span>${
            Array.from({ length: uses }, (_, b) =>
              `<span class="ubox ${f.spent && f.spent[b] ? "" : "on"}" onclick="Vertex.app.toggleUse(${i},${b})"></span>`).join("")
          }<button class="ureset" onclick="Vertex.app.resetFeature(${i})">Reset</button></div>`;
      const tlabel = f.type === "major" ? "Major Action" : f.type === "minor" ? "Minor Action" : "Passive";
      return `<div class="ld-row">
        <div class="top"><div><div class="ld-kicker ${f.type}">${tlabel}</div><div class="ld-name">${esc(f.name)}</div></div>${right}</div>
        <div class="ld-body">${f.desc || ""}</div>
      </div>`;
    }).join("");
    return `<div class="ld-hero">
        <div class="ld-herotop"><span class="ld-eyebrow">Designation</span><button class="editbtn" onclick="Vertex.app.editSection('designation')">Edit</button></div>
        <div class="ld-bigname">${c.designation ? esc("The " + dz.name) : "—"}</div>
        <div class="ld-htag">${esc(dz.tagline)}</div>
        <div class="ld-hdesc">${esc(dz.descriptors)}</div>
      </div>${feats}`;
  }

  function gear(c) {
    const lead = c.designation ? `Equipment & Weapons · ${esc(c.designation.name)} kit` : "Equipment & Weapons · what you carry";
    if (!c.items.length) return tabLead(lead, "designation") + `<div class="empty">No items yet.</div>`;
    const cards = c.items.map(it =>
      `<div class="ix-card"><div class="imeta">${esc(it.meta)}</div><div class="iname">${esc(it.name)}</div><div class="iflav">${esc(it.flavor)}</div></div>`).join("");
    return tabLead(lead, "designation") + `<div class="ix-bento">${cards}</div>`;
  }

  function tabLead(label, editKey) {
    const edit = editKey ? `<button class="editbtn" onclick="Vertex.app.editSection('${editKey}')">Edit</button>` : "";
    return `<div class="tablead"><span>${label}</span>${edit}</div>`;
  }

  function cast(c, state) {
    const s = c.stats;
    const btn = (key, label) => `<button class="castbtn ${key} ${state.stat === key ? "primary" : ""}" ${s[key] < 1 ? "disabled" : ""} onclick="Vertex.app.doCast('${key}')">Cast ${label} · ${s[key]}d6</button>`;
    const diffOpts = Array.from({ length: 12 }, (_, i) => `<option ${i + 1 === state.difficulty ? "selected" : ""}>${i + 1}</option>`).join("");
    const modeBtn = (m, label) => `<button class="${state.mode === m ? "on" : ""}" onclick="Vertex.app.setCastMode('${m}')">${label}</button>`;
    return `<div class="panel"><div class="head"><h2>Cast</h2><span class="sub">resolving truth</span></div>
      <ul class="legend"><li><b>5–6</b> = success</li><li><b>2+ sixes</b> = Windfall</li><li><b>2+ ones</b> = Downside</li></ul>
      <div class="castmode">${modeBtn("normal", "Normal")}${modeBtn("advantage", "Advantage")}${modeBtn("disadvantage", "Disadvantage")}</div>
      <div class="controls">${btn("red", "Red")}${btn("green", "Green")}${btn("blue", "Blue")}
        <span class="diff">Difficulty <select onchange="Vertex.app.setDifficulty(this.value)">${diffOpts}</select></span></div>
      <div id="castOut"><div class="dice"><span style="color:var(--faint);font-size:13px">Choose a stat to Cast…</span></div></div>
    </div>`;
  }

  // The former Cast-tab UI, surfaced as a modal when a Core stat numeral is clicked.
  function castModal(c, state) {
    return `<div class="cast" role="dialog" aria-modal="true">
      <button class="cast-x" onclick="Vertex.app.closeCast()" title="Close">✕</button>
      ${cast(c, state)}
    </div>`;
  }

  // result of a cast -> HTML (handles Advantage/Disadvantage showing both rolls)
  function castResult(res, label) {
    const dieHTML = d => `<div class="die ${d.bonus ? "bonus" : d.v === 6 ? "six" : d.v >= 5 ? "hit" : d.v === 1 ? "one" : ""}">${d.v}</div>`;
    const rollHTML = r => `<div class="dice">${r.dice.map(dieHTML).join("")}</div>`;
    const ch = res.chosen;
    let groups = "";
    if (res.mode !== "normal") {
      groups = res.rolls.map((r, i) => {
        const isChosen = r === ch;
        const tag = res.mode === "advantage" ? "Advantage" : "Disadvantage";
        return `<div class="rollgroup ${isChosen ? "" : "dim"}"><div class="glabel">Roll ${i + 1}${isChosen ? " · taken (" + tag + ")" : ""}</div>${rollHTML(r)}</div>`;
      }).join("");
    } else {
      groups = rollHTML(ch);
    }
    let v;
    if (ch.windfall) v = `<span class="win">Windfall.</span> Automatic success — roll the Windfall Table.<small>${label} · ${ch.sixes} sixes${res.mode !== "normal" ? " · " + res.mode : ""}</small>`;
    else if (ch.downside) v = `<span class="down">Downside.</span> Automatic failure — roll the Downside Table.<small>${label} · ${ch.ones} ones${res.mode !== "normal" ? " · " + res.mode : ""}</small>`;
    else if (ch.hit) v = `<span class="ok">Success.</span> Your intent becomes reality.<small>${label} · ${ch.successes}/${ch.difficulty} successes${res.mode !== "normal" ? " · " + res.mode : ""}</small>`;
    else v = `<span class="no">Not enough.</span> The truth refuses you.<small>${label} · ${ch.successes}/${ch.difficulty} successes${res.mode !== "normal" ? " · " + res.mode : ""}</small>`;
    return `${groups}<div class="verdict">${v}</div>`;
  }

  function panelEmpty(title, sub, msg) {
    return `<div class="panel"><div class="head"><h2>${title}</h2><span class="sub">${sub}</span></div><div class="empty">${msg}</div></div>`;
  }

  function menu(list, activeId) {
    const items = list.map(c => `
      <div class="mi ${c.id === activeId ? "cur" : ""}" onclick="Vertex.app.switchTo('${c.id}')">
        <span class="av">${c.portrait ? `<img src="${c.portrait}" alt="">` : Vertex.model.initials(c.name)}</span>
        <span class="who"><span class="nm">${esc(c.name)}</span><br><span class="ds">${esc(c.designation ? c.designation.name : "No designation")}</span></span>
        <button class="del" title="Delete" onclick="event.stopPropagation();Vertex.app.deleteCharacter('${c.id}')">✕</button>
      </div>`).join("");
    const syncOn = !!(window.Vertex.drive && Vertex.drive.autoSyncPref && Vertex.drive.autoSyncPref());
    return `<div class="mlabel">Characters</div>${items}
      <div class="mfoot">
        <button onclick="Vertex.app.exportCurrent()">Export</button>
        <button onclick="Vertex.drive.save()">Save to Drive</button>
        <button onclick="Vertex.app.importPrompt()">Import</button>
        <button onclick="Vertex.drive.open()">Load from Drive</button>
        <button onclick="Vertex.create.open()">+ New</button>
      </div>
      <div class="syncrow">
        <span class="lab">Auto-sync to Drive<em>${syncOn ? "backing up as you play" : "off — saves stay on this device"}</em></span>
        <button class="tg ${syncOn ? "on" : ""}" onclick="event.stopPropagation();Vertex.drive.toggleAutoSync()">${syncOn ? "On" : "Off"}</button>
      </div>`;
  }

  return { core, archetypes, bonds, designation, gear, cast, castModal, castResult, menu, crossingModal };
})();
