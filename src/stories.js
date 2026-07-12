/* =======================================================================
   VERTEX — Stories (the multiplayer surface)
   A Story is the campaign: a Host, a roster of players + their characters,
   and one-time invite codes. Signed-in only. Opens as a full-screen overlay
   (the Index/Ledger language: hairline-divided rows, serif names, mono data).
   All access is enforced by the database (RLS + the create/invite/redeem/roster
   functions); this module is the client for them.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.stories = (function () {
  const supa  = () => window.Vertex.supa;
  const myId  = () => (window.Vertex.cloud && Vertex.cloud.userId());
  const esc   = s => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const host  = () => document.getElementById("overlay");

  let stories = [], current = null, roster = [], invites = [], lastCode = null;

  /* ---------- open / close ---------- */
  async function open() {
    if (!supa() || !myId()) { toast("Sign in to create or join a Story."); return; }
    current = null; lastCode = null;
    await refreshList();
    renderList();
  }
  function close() { const o = host(); if (o) { o.innerHTML = ""; o.onclick = null; } }
  function shell(body, wide) {
    const o = host(); if (!o) return;
    o.innerHTML = `<div class="stories${wide ? " wide" : ""}" role="dialog" aria-modal="true">
      <button class="cast-x" onclick="Vertex.stories.close()" title="Close">✕</button>${body}</div>`;
    o.onclick = e => { if (e.target === o) close(); };
  }
  function toast(m) { if (window.Vertex.app && Vertex.app.refreshMenu) { /* reuse app toast */ }
    const t = document.getElementById("toast"); if (t){ t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"),2600);} }

  /* ---------- data ---------- */
  async function refreshList() {
    const { data, error } = await supa().from("memberships")
      .select("role, story:stories(id,name,host_id)").eq("user_id", myId());
    if (error) { console.warn("stories list:", error.message); stories = []; return; }
    stories = (data || []).filter(m => m.story).map(m => ({
      id: m.story.id, name: m.story.name, hostId: m.story.host_id, role: m.role
    }));
  }
  async function loadStory(id) {
    current = stories.find(s => s.id === id) || current;
    const r = await supa().rpc("get_roster", { p_story: id });
    roster = r.error ? [] : (r.data || []);
    if (current && current.role === "host") {
      const inv = await supa().from("invites").select("*")
        .eq("story_id", id).eq("revoked", false).is("used_by", null).order("created_at", { ascending: false });
      invites = inv.error ? [] : (inv.data || []).filter(i => new Date(i.expires_at) > new Date());
    } else invites = [];
  }

  /* ---------- list view ---------- */
  function renderList() {
    const rows = stories.length ? stories.map(s => `
      <button class="st-row" onclick="Vertex.stories.openStory('${s.id}')">
        <span class="st-nm">${esc(s.name)}</span>
        <span class="st-role ${s.role}">${s.role === "host" ? "Host" : "Player"}</span>
      </button>`).join("")
      : `<div class="st-empty">No Stories yet. Create one to host, or join a friend's with a code.</div>`;
    shell(`
      <div class="st-head"><h2>Stories</h2><span class="sub">your table</span></div>
      <div class="st-actions">
        <button class="st-cta" onclick="Vertex.stories.promptCreate()">+ Create a Story</button>
        <button class="st-cta ghost" onclick="Vertex.stories.promptJoin()">Join with a code</button>
      </div>
      <div class="st-list">${rows}</div>`);
  }

  function promptCreate() {
    shell(`
      <button class="st-back" onclick="Vertex.stories.backToList()">← Stories</button>
      <div class="st-head"><h2>Create a Story</h2><span class="sub">you'll be its Host</span></div>
      <div class="st-form">
        <input id="stName" placeholder="Story name (e.g. Dust &amp; Iron)" onkeydown="if(event.key==='Enter')Vertex.stories.doCreate()">
        <button class="st-cta" onclick="Vertex.stories.doCreate()">Create</button>
      </div>
      <div id="stMsg" class="st-msg"></div>`);
  }
  async function doCreate() {
    const name = (document.getElementById("stName") || {}).value || "";
    if (!name.trim()) { msg("Give your Story a name."); return; }
    msg("Creating…");
    const { data, error } = await supa().rpc("create_story", { p_name: name.trim() });
    if (error) { msg(error.message); return; }
    await refreshList();
    openStory(data.id);
  }

  function promptJoin() {
    const chars = (window.Vertex.app && Vertex.app.getList ? Vertex.app.getList() : []);
    const opts = chars.map(c => `<option value="${c.id}">${esc(c.name)}${c.designation ? " · " + esc(c.designation.name) : ""}</option>`).join("");
    shell(`
      <button class="st-back" onclick="Vertex.stories.backToList()">← Stories</button>
      <div class="st-head"><h2>Join a Story</h2><span class="sub">with an invite code</span></div>
      <div class="st-form">
        <input id="stCode" placeholder="Invite code (e.g. VTX-7QK2)" autocapitalize="characters"
               onkeydown="if(event.key==='Enter')Vertex.stories.doJoin()">
        <label class="st-lab">Bring which character?</label>
        <select id="stChar">${opts || "<option value=''>(no characters yet)</option>"}</select>
        <button class="st-cta" onclick="Vertex.stories.doJoin()">Join</button>
      </div>
      <div id="stMsg" class="st-msg"></div>`);
  }
  async function doJoin() {
    const code = ((document.getElementById("stCode") || {}).value || "").trim().toUpperCase();
    const cid  = (document.getElementById("stChar") || {}).value || null;
    if (!code) { msg("Enter the invite code."); return; }
    msg("Joining…");
    const { data, error } = await supa().rpc("redeem_invite", { p_code: code, p_character: cid || null });
    if (error) { msg(friendly(error.message)); return; }
    await refreshList();
    openStory(data.id);
  }
  function friendly(m) {
    if (/expired/i.test(m)) return "That code has expired — ask the Host for a fresh one.";
    if (/already been used/i.test(m)) return "That code was already used — ask the Host for a new one.";
    if (/revoked/i.test(m)) return "That code was cancelled — ask the Host for a new one.";
    if (/not valid/i.test(m)) return "That code isn't valid — check it and try again.";
    return m;
  }
  function msg(t) { const m = document.getElementById("stMsg"); if (m) m.textContent = t || ""; }

  /* ---------- detail view ---------- */
  async function openStory(id) {
    await loadStory(id);
    renderDetail();
  }
  function backToList() { renderList(); }

  function renderDetail() {
    if (!current) { renderList(); return; }
    const iAmHost = current.role === "host";
    const members = roster.map(m => memberRow(m, iAmHost)).join("");
    const inviteBlock = iAmHost ? hostInvites() : "";
    const foot = iAmHost
      ? `<button class="st-danger" onclick="Vertex.stories.deleteStory('${current.id}')">Delete Story</button>`
      : `<button class="st-danger" onclick="Vertex.stories.leaveStory('${current.id}')">Leave Story</button>`;
    shell(`
      <button class="st-back" onclick="Vertex.stories.backToList()">← Stories</button>
      <div class="st-head"><h2>${esc(current.name)}</h2><span class="sub">${iAmHost ? "you are the Host" : "you are a Player"}</span></div>
      <div class="st-label">Party · ${roster.length}</div>
      <div class="st-roster">${members}</div>
      ${inviteBlock}
      <div class="st-foot">${foot}</div>`);
  }

  function avatar(m) {
    if (m.char_portrait) return `<span class="st-av"><img src="${m.char_portrait}" alt=""></span>`;
    const nm = m.char_name || m.display_name || "?";
    const init = nm.trim().slice(0, 2).toUpperCase();
    return `<span class="st-av">${esc(init)}</span>`;
  }
  function memberRow(m, iAmHost) {
    const isHostRow = m.role === "host";
    const canView = iAmHost && !isHostRow && m.character_id;   // Host can open a player's sheet (read-only)
    const actions = iAmHost && !isHostRow ? `
      ${canView ? `<button class="st-mini" onclick="Vertex.stories.viewCharacter('${m.character_id}')">View</button>` : ""}
      <button class="st-mini danger" onclick="Vertex.stories.kick('${m.user_id}')">Remove</button>` : "";
    const who = isHostRow
      ? `<span class="st-mn">${esc(m.display_name || "Host")}</span><span class="st-ds">Host — runs the table</span>`
      : `<span class="st-mn">${esc(m.char_name || "—")}</span><span class="st-ds">${esc(m.display_name || "")}${m.char_designation ? " · the " + esc(m.char_designation) : ""}</span>`;
    return `<div class="st-member">
      ${avatar(m)}
      <span class="st-who">${who}</span>
      <span class="st-role ${m.role}">${isHostRow ? "Host" : "Player"}</span>
      <span class="st-acts">${actions}</span>
    </div>`;
  }

  function hostInvites() {
    const list = invites.map(i => `
      <div class="st-invite">
        <span class="st-code">${esc(i.code)}</span>
        <span class="st-exp">expires ${timeLeft(i.expires_at)}</span>
        <button class="st-mini" onclick="Vertex.stories.copyCode('${esc(i.code)}')">Copy</button>
        <button class="st-mini danger" onclick="Vertex.stories.revoke('${i.id}')">Revoke</button>
      </div>`).join("");
    const fresh = lastCode ? `<div class="st-fresh">New invite: <b>${esc(lastCode)}</b> — one use, expires in 24h.
      <button class="st-mini" onclick="Vertex.stories.copyCode('${esc(lastCode)}')">Copy</button></div>` : "";
    return `<div class="st-section">
      <div class="st-label">Invites</div>
      <button class="st-cta ghost" onclick="Vertex.stories.invite()">+ Generate invite code</button>
      ${fresh}
      <div class="st-invites">${list || `<div class="st-empty small">No active invites.</div>`}</div>
    </div>`;
  }
  function timeLeft(iso) {
    const h = Math.max(0, Math.round((new Date(iso) - new Date()) / 3.6e6));
    return h >= 1 ? "in ~" + h + "h" : "soon";
  }

  /* ---------- host actions ---------- */
  async function invite() {
    if (!current) return;
    const { data, error } = await supa().rpc("create_invite", { p_story: current.id });
    if (error) { toast(error.message); return; }
    lastCode = data.code;
    await loadStory(current.id); renderDetail();
    copyCode(data.code);
  }
  async function revoke(id) {
    await supa().from("invites").update({ revoked: true }).eq("id", id);
    if (lastCode) lastCode = null;
    await loadStory(current.id); renderDetail();
  }
  async function kick(userId) {
    if (!confirm("Remove this player from the Story? Their character stays with them.")) return;
    await supa().from("memberships").delete().eq("story_id", current.id).eq("user_id", userId);
    await loadStory(current.id); renderDetail();
  }
  async function leaveStory(id) {
    if (!confirm("Leave this Story? Your character stays with you.")) return;
    await supa().from("memberships").delete().eq("story_id", id).eq("user_id", myId());
    await refreshList(); renderList();
  }
  async function deleteStory(id) {
    if (!confirm("Delete this Story for everyone? Players keep their characters. This cannot be undone.")) return;
    await supa().from("stories").delete().eq("id", id);
    await refreshList(); renderList();
  }
  function copyCode(code) {
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast("Invite code copied: " + code), () => {});
    else toast("Invite code: " + code);
  }

  /* ---------- read-only character view (Host) ---------- */
  async function viewCharacter(charId) {
    const { data, error } = await supa().from("characters").select("data").eq("id", charId).maybeSingle();
    if (error || !data) { toast("Couldn't open that character."); return; }
    const c = data.data; c.id = charId;
    Vertex.model.normalize(c);
    const R = Vertex.render;
    const desig = c.designation ? c.designation.name : "—";
    const av = c.portrait ? `<img src="${c.portrait}" alt="">` : `<span class="initials">${Vertex.model.initials(c.name)}</span>`;
    shell(`
      <button class="st-back" onclick="Vertex.stories.openStory('${current.id}')">← ${esc(current.name)}</button>
      <div class="roview-head">
        <div class="portrait ${c.portrait ? "hasart" : ""}">${av}</div>
        <div class="idtext"><h2>${esc(c.name)}</h2><div class="desig">Designation: <b>the ${esc(desig)}</b></div></div>
        <span class="st-ro-badge">read-only</span>
      </div>
      <div class="roview">
        ${R.core(c)}${R.designation(c)}${R.archetypes(c)}${R.bonds(c)}${R.gear(c)}
      </div>`, true);
  }

  return { open, close, backToList, promptCreate, doCreate, promptJoin, doJoin,
           openStory, invite, revoke, kick, leaveStory, deleteStory, copyCode, viewCharacter };
})();
