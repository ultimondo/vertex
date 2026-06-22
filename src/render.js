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
    const spent = M().archetypePointsSpent(c);
    const statRow = (key, label, derivedHTML) => `
      <div class="statrow ${key}">
        <div class="sval">${s[key]}</div>
        <div class="sname">${label}</div>
        <div class="sdom">${DOMAINS[key]}</div>
        <div class="sder">${derivedHTML}</div>
        <div class="ministep">
          <button title="decrease" onclick="Vertex.app.stepStat('${key}',-1)">−</button>
          <button title="increase" onclick="Vertex.app.stepStat('${key}',1)">+</button>
        </div>
      </div>`;
    const note = spent > 5
      ? `<div class="statnote warn">⚠ ${spent} of 5 Archetype Core-Stat points allocated — over the v004 limit of 5.</div>`
      : `<div class="statnote">Start 1 / 1 / 1 · ${spent} of 5 Archetype Core-Stat points allocated.</div>`;
    return `
    <div class="panel">
      <div class="head"><h2>Core Stats</h2></div>
      ${statRow("red", "Red", `Max HP <b class="red">${d.maxHP}</b>`)}
      ${statRow("green", "Green", `Move <b class="green">${d.move}u</b> · Difficulty <b class="green">${d.difficulty}</b>`)}
      ${statRow("blue", "Blue", `Feature Uses <b class="blue">${d.featureUses}</b>`)}
      ${note}
    </div>
    <div class="panel">
      <div class="head"><h2>Resources</h2></div>
      ${meter("fate", "Fate", r.fate.cur, d.fateMax)}
      ${meter("hp", "Hit Points", r.hp.cur, d.maxHP)}
      <div class="res"><span class="k">Armor</span>
        <div class="armorpips">${[1,2,3,4,5].map(n => `<span class="apip ${n <= r.armor ? "on" : ""}" onclick="Vertex.app.setArmor(${n})"></span>`).join("")}</div>
      </div>
      ${meter("temp", "Temp HP", r.temp.cur, d.tempMax)}
    </div>`;
  }

  function meter(key, label, cur, max) {
    const pct = max > 0 ? (100 * cur / max) : 0;
    return `<div class="res"><span class="k">${label}</span>
      <div class="stepper">
        <button onclick="Vertex.app.stepRes('${key}',-1)">−</button>
        <span class="v">${cur} / ${max}</span>
        <button onclick="Vertex.app.stepRes('${key}',1)">+</button>
      </div>
      <div class="bar ${key}"><i style="width:${pct}%"></i></div></div>`;
  }

  function archetypes(c) {
    if (!c.archetypes.length) return panelEmpty("Archetypes", "forces in tension", "No Archetypes yet. (Add them in the upcoming character-creation flow.)");
    const rows = c.archetypes.map((a, i) => {
      const notches = Array.from({ length: a.driftMax || 5 }, (_, n) =>
        `<i class="notch ${n < a.drift ? "on" : ""}" title="set drift to ${n + 1}" onclick="Vertex.app.setDrift(${i},${n + 1})"></i>`).join("");
      const dt = a.status === "silent" ? "Numbed — grants neither Advantage nor Disadvantage. Wake it only through a Vignette."
        : a.status === "retired" ? "Retired — struck through, kept as record. Its Core Stat points are suspended."
        : `Drift <span class="notches">${notches}</span> ${a.drift} / ${a.driftMax || 5}${a.status === "faltering" ? " — answer it at the next Crossing" : ""}`;
      const ptsLabel = (a.status === "silent" || a.status === "retired") ? "susp." : (a.points >= 0 ? "+" + a.points : a.points);
      return `<div class="arc ${a.status}">
        <div class="row1">
          <div><span class="aname">${esc(a.name)}</span> &nbsp;<span class="status ${a.status === "active" ? "active" : ""}">${cap(a.status)}</span></div>
          <span class="tag ${a.tag}">${cap(a.tag)} · ${ptsLabel}</span>
        </div>
        <div class="tagline">${esc(a.tagline)}</div>
        <div class="drift">${dt}</div>
      </div>`;
    }).join("");
    return `<div class="panel"><div class="head"><h2>Archetypes</h2><span class="sub">forces in tension · drift &amp; the crossing</span></div>${rows}</div>`;
  }

  function bonds(c) {
    const tethers = c.tethers.length ? c.tethers.map(t => {
      const cls = t.status === "knot" ? "knot" : t.status === "open" ? "tether-open" : "";
      const toSuffix = t.status === "knot" ? " · re-tied" : "";
      const body = t.status === "knot"
        ? `<div class="line"><span class="old">${esc(t.old)}</span><span class="new">${esc(t.line)}</span></div><div class="seam">⌇ knot · the moment it changed</div>`
        : `<div class="line">${esc(t.line)}</div>`;
      return `<div class="bond ${cls}"><div class="to">to ${esc(t.to)}${toSuffix}</div>${body}</div>`;
    }).join("") : `<div class="empty">No Tethers yet — and a character who holds none is Isolated.</div>`;

    const holds = c.holds.length ? c.holds.map(h => {
      const cls = h.status === "yielded" ? "yielded" : "";
      const meta = h.status === "yielded"
        ? `<span>Status <b>Yielded</b></span>${h.vignetteOwed ? `<span class="owed">⚑ Vignette owed — slot locked</span>` : ""}`
        : `<span>Status <b>Active</b></span><span>Honored under pressure <b>×${h.timesHonored || 0}</b></span>`;
      return `<div class="bond hold ${cls}"><div class="line">${esc(h.line)}</div><div class="meta">${meta}</div></div>`;
    }).join("") : `<div class="empty">No Conviction Holds yet.</div>`;

    return `<div class="panel"><div class="head"><h2>Tethers</h2><span class="sub">what they are to you, now</span></div>${tethers}</div>
            <div class="panel"><div class="head"><h2>Conviction Holds</h2><span class="sub">the line you will not cross</span></div>${holds}</div>`;
  }

  function designation(c) {
    if (!c.designation && !c.features.length) {
      return panelEmpty("Designation &amp; Features", "the practical shape you take", "No Designation selected yet. (Pick one in the upcoming character-creation flow.)");
    }
    const dz = c.designation || { name: "—", tagline: "", descriptors: "" };
    const uses = M().derived(c).featureUses;   // = Blue score; each Feature is usable this many times
    const feats = c.features.map((f, i) => {
      const right = f.type === "passive"
        ? `<span class="always">always active · costs no uses</span>`
        : `<div class="uses"><span class="ulbl">Uses <b class="blue">· Blue ${uses}</b></span>${
            Array.from({ length: uses }, (_, b) =>
              `<span class="ubox ${f.spent && f.spent[b] ? "" : "on"}" onclick="Vertex.app.toggleUse(${i},${b})"></span>`).join("")
          }<button class="ureset" onclick="Vertex.app.resetFeature(${i})">Reset</button></div>`;
      const tlabel = f.type === "major" ? "Major Action" : f.type === "minor" ? "Minor Action" : "Passive";
      return `<div class="feature ${f.type}"><div class="stripe"></div><div class="body">
        <div class="frow"><div><span class="fn">${esc(f.name)}</span><span class="ft">${tlabel}</span></div>${right}</div>
        <div class="fd">${f.desc || ""}</div></div></div>`;
    }).join("");
    return `<div class="panel">
      <div class="desig-hero"><div class="big">${esc((dz.name || "").toUpperCase())}</div><div class="tag2">${esc(dz.tagline)}</div><div class="desc3">${esc(dz.descriptors)}</div></div>
      ${feats}</div>`;
  }

  function gear(c) {
    if (!c.items.length) return panelEmpty("Equipment &amp; Weapons", "what you carry", "No items yet.");
    const items = c.items.map(it => `<div class="item"><div class="iname">${esc(it.name)}</div><div class="imeta">${esc(it.meta)}</div><div class="iflavor">${esc(it.flavor)}</div></div>`).join("");
    return `<div class="panel"><div class="head"><h2>Equipment &amp; Weapons</h2><span class="sub">${esc(c.designation ? c.designation.name + " items" : "carried")}</span></div>${items}</div>`;
  }

  function cast(c, state) {
    const s = c.stats;
    const btn = (key, label) => `<button class="castbtn ${key}" ${s[key] < 1 ? "disabled" : ""} onclick="Vertex.app.doCast('${key}')">Cast ${label} · ${s[key]}d6</button>`;
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

  return { core, archetypes, bonds, designation, gear, cast, castResult, menu };
})();
