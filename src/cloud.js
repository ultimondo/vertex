/* =======================================================================
   VERTEX — cloud character storage (Supabase)
   When signed in, characters live in the `characters` table (one row each,
   the whole sheet in `data`). Guests stay on localStorage (src/storage.js).
   On sign-in this pulls the user's characters — or, on first sign-in, auto-
   imports whatever characters were on this device — and pushes edits back
   (debounced). Cloud character ids are UUIDs (globally unique; seed ids like
   'seed_mara' would collide across users). The seam Vertex.storage anticipated.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.cloud = (function () {
  const supa = () => window.Vertex.supa;
  let currentUser = null;          // set by auth.js on sign-in / cleared on sign-out
  let synced = false;              // guards against the double auth event re-importing
  const timers = {};               // per-character debounce timers

  function signedIn() { return !!currentUser; }
  function userId()   { return currentUser ? currentUser.id : null; }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = s => typeof s === "string" && UUID_RE.test(s);
  const newUuid = () => (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); });

  /* ---- reads ---- */
  async function pull() {
    if (!signedIn()) return [];
    const { data, error } = await supa().from("characters").select("id,data").eq("owner_id", userId());
    if (error) { console.warn("Vertex.cloud pull:", error.message); return []; }
    return (data || []).map(row => { const c = row.data || {}; c.id = row.id; return c; });
  }

  /* ---- writes ---- */
  async function upsert(char) {
    if (!signedIn() || !char) return;
    if (!isUuid(char.id)) char.id = newUuid();     // ensure a cloud-valid primary key
    const { error } = await supa().from("characters")
      .upsert({ id: char.id, owner_id: userId(), data: char });
    if (error) console.warn("Vertex.cloud upsert:", error.message);
  }
  async function remove(id) {
    if (!signedIn() || !id) return;
    const { error } = await supa().from("characters").delete().eq("id", id);
    if (error) console.warn("Vertex.cloud remove:", error.message);
  }
  async function importAll(chars) {
    if (!signedIn() || !chars || !chars.length) return chars;
    const rows = chars.map(c => { if (!isUuid(c.id)) c.id = newUuid(); return { id: c.id, owner_id: userId(), data: c }; });
    const { error } = await supa().from("characters").upsert(rows);
    if (error) console.warn("Vertex.cloud importAll:", error.message);
    return chars;
  }

  // Debounced push of an edited character (mirrors the Drive auto-sync pattern).
  function noteChange(char) {
    if (!signedIn() || !char) return;
    clearTimeout(timers[char.id]);
    timers[char.id] = setTimeout(() => { delete timers[char.id]; upsert(char); }, 900);
  }

  /* ---- lifecycle (called by auth.js) ---- */
  async function onSignIn(user) {
    currentUser = user;
    if (synced) return;            // the double auth event (resolve + INITIAL_SESSION) fires this twice
    synced = true;
    const cloud = await pull();
    if (cloud.length) { Vertex.app.loadList(cloud); return; }
    // first sign-in for this account: bring this device's characters into it
    const local = Vertex.storage.loadAll() || [];
    if (local.length) { await importAll(local); Vertex.app.loadList(local); }
    else { Vertex.app.loadList([]); await upsert(Vertex.app.getActive()); }
  }
  function onSignOut() { currentUser = null; synced = false; Object.keys(timers).forEach(k => clearTimeout(timers[k])); }

  return { signedIn, userId, pull, upsert, remove, importAll, noteChange, onSignIn, onSignOut };
})();
