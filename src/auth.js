/* =======================================================================
   VERTEX — accounts / identity (Supabase Auth)
   Gates the app behind a sign-in screen (accounts are the main path, with a
   one-click guest fallback for local-only play). Handles email+password
   (with email verification), Google sign-in, sign-out, and shows the signed-in
   display name in the title bar. Character STORAGE stays local for now — the
   cloud storage adapter is the next step.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.auth = (function () {
  const GUEST_KEY = "vertex.guest";
  let user = null, profile = null, gateMode = "in";   // 'in' = sign in · 'up' = create account

  const esc  = s => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const supa = () => window.Vertex.supa;
  const isGuest = () => localStorage.getItem(GUEST_KEY) === "1";
  const gateEl  = () => document.getElementById("authgate");

  function msg(text, kind) {
    const m = document.getElementById("gateMsg");
    if (m) { m.textContent = text || ""; m.className = "gate-msg" + (kind ? " " + kind : ""); }
  }

  function renderGate() {
    const g = gateEl(); if (!g) return;
    const signingIn = gateMode === "in";
    g.innerHTML = `
      <div class="gate-card" role="dialog" aria-modal="true" aria-label="Sign in to Vertex">
        <div class="gate-brand">VERTEX</div>
        <div class="gate-sub">${signingIn
          ? "Sign in to sync your characters and join Stories."
          : "Create an account to sync your characters and join Stories."}</div>
        <div class="gate-tabs">
          <button class="gt ${signingIn ? "on" : ""}" onclick="Vertex.auth.setMode('in')">Sign in</button>
          <button class="gt ${signingIn ? "" : "on"}" onclick="Vertex.auth.setMode('up')">Create account</button>
        </div>
        <div class="gate-fields">
          <input id="gateEmail" type="email" placeholder="Email" autocomplete="email"
                 onkeydown="if(event.key==='Enter')Vertex.auth.submit()">
          <input id="gatePass" type="password" placeholder="Password"
                 autocomplete="${signingIn ? "current-password" : "new-password"}"
                 onkeydown="if(event.key==='Enter')Vertex.auth.submit()">
        </div>
        <button class="gate-primary" onclick="Vertex.auth.submit()">${signingIn ? "Sign in" : "Create account"}</button>
        <div class="gate-or"><span>or</span></div>
        <button class="gate-google" onclick="Vertex.auth.signInGoogle()">Continue with Google</button>
        <button class="gate-guest" onclick="Vertex.auth.continueAsGuest()">Continue as guest — local only, no account</button>
        <div id="gateMsg" class="gate-msg" role="status"></div>
      </div>`;
  }

  function setMode(m) { gateMode = m; renderGate(); }

  function friendly(e) {
    const m = (e && e.message) || "Something went wrong. Try again.";
    if (/Email not confirmed/i.test(m)) return "Please verify your email first — check your inbox for the link.";
    if (/Invalid login credentials/i.test(m)) return "That email or password isn't right.";
    if (/already registered|already exists/i.test(m)) return "That email already has an account — try signing in.";
    if (/should be at least/i.test(m)) return "Password is too short (at least 6 characters).";
    return m;
  }

  async function submit() {
    if (!supa()) { msg("Can't reach the sign-in service right now.", "bad"); return; }
    const email = (document.getElementById("gateEmail") || {}).value || "";
    const pass  = (document.getElementById("gatePass")  || {}).value || "";
    if (!email || !pass) { msg("Enter your email and password.", "bad"); return; }
    msg(gateMode === "in" ? "Signing in…" : "Creating your account…");
    try {
      if (gateMode === "in") {
        const { error } = await supa().auth.signInWithPassword({ email, password: pass });
        if (error) throw error;   // success → onAuthStateChange hides the gate
      } else {
        const { data, error } = await supa().auth.signUp({ email, password: pass });
        if (error) throw error;
        if (!data.session) {      // email verification required
          gateMode = "in"; renderGate();
          msg("Account created — check your email to verify, then sign in.", "ok");
        }
      }
    } catch (e) { msg(friendly(e), "bad"); }
  }

  function signInGoogle() {
    if (!supa()) { msg("Can't reach the sign-in service right now.", "bad"); return; }
    supa().auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
  }

  function continueAsGuest() { localStorage.setItem(GUEST_KEY, "1"); hideGate(); updateIdentityBar(); }
  function signInFromGuest() { localStorage.removeItem(GUEST_KEY); gateMode = "in"; showGate(); }

  async function signOut() {
    localStorage.removeItem(GUEST_KEY);
    try { if (supa()) await supa().auth.signOut(); } catch (_) {}
    user = null; profile = null; gateMode = "in";
    if (window.Vertex.cloud) Vertex.cloud.onSignOut();
    if (window.Vertex.app && Vertex.app.loadList) Vertex.app.loadList(Vertex.storage.loadAll() || []);
    showGate(); updateIdentityBar();
  }

  function showGate() { const g = gateEl(); if (g) { g.classList.remove("hidden"); renderGate(); } }
  function hideGate() { const g = gateEl(); if (g) g.classList.add("hidden"); }

  async function loadProfile() {
    if (!user) { profile = null; return; }
    const fallback = { display_name: (user.email || "player").split("@")[0] };
    try {
      const { data } = await supa().from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      profile = data || fallback;
    } catch (_) { profile = fallback; }
  }

  function updateIdentityBar() {
    const el = document.getElementById("identityCtl");
    if (!el) return;
    if (user) {
      el.innerHTML = `<span class="idname" title="Signed in">${esc(profile && profile.display_name || "")}</span>` +
                     `<button class="btn" onclick="Vertex.auth.signOut()">Sign out</button>`;
    } else if (isGuest()) {
      el.innerHTML = `<button class="btn" onclick="Vertex.auth.signInFromGuest()">Sign in</button>`;
    } else { el.innerHTML = ""; }
  }

  async function resolve() {
    const { data } = await supa().auth.getSession();
    user = data.session ? data.session.user : null;
    if (user)          { await loadProfile(); if (window.Vertex.cloud) await Vertex.cloud.onSignIn(user); hideGate(); }
    else if (isGuest()) { hideGate(); }
    else               { showGate(); }
    updateIdentityBar();
  }

  function init() {
    if (!supa()) { hideGate(); return; }   // no backend reachable → stay local, don't block the app
    supa().auth.onAuthStateChange(async (_event, session) => {
      user = session ? session.user : null;
      if (user) { await loadProfile(); if (window.Vertex.cloud) await Vertex.cloud.onSignIn(user); hideGate(); }
      updateIdentityBar();
    });
    resolve();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { setMode, submit, signInGoogle, continueAsGuest, signInFromGuest, signOut };
})();
