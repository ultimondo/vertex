/* =======================================================================
   VERTEX — Supabase client (accounts + cloud backend)
   The Project URL and anon key below are the PUBLIC / publishable credentials:
   they are designed to live in client code and are protected by Row-Level
   Security in the database. NEVER put the service_role / secret key here.
   Loads after the supabase-js UMD bundle (see index.html). Attaches the client
   to Vertex.supa; the auth + cloud-storage layers build on it.
   ======================================================================= */
window.Vertex = window.Vertex || {};

Vertex.SUPA_URL = "https://fcuiaerlovooloamckot.supabase.co";
Vertex.SUPA_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdWlhZXJsb3Zvb2xvYW1ja290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjA3MDUsImV4cCI6MjA5OTQzNjcwNX0.Flirboib9zmWxh9QhJmGlx-mCwFB9HVfKfTCjBbEvuk";

Vertex.supa = (window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(Vertex.SUPA_URL, Vertex.SUPA_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

if (!Vertex.supa) console.error("Vertex.supa: supabase-js did not load — check the CDN <script> in index.html.");

/* Keepalive (see supabase/003_keepalive.sql). A free-tier project is paused after
   7 days with no activity, so every visit to the app counts as a heartbeat — at
   most one per browser per day, fire-and-forget, never blocking the page. The
   nightly GitHub Action is the guarantee; this is the layer that means ordinary
   use alone keeps the project awake. */
(function () {
  if (!Vertex.supa) return;
  try {
    var key = "vertex.lastPing";
    if (Date.now() - (+localStorage.getItem(key) || 0) < 864e5) return;   // 24h
    localStorage.setItem(key, String(Date.now()));
  } catch (e) { /* private mode: ping anyway */ }
  Vertex.supa.rpc("ping").then(null, function () {});
})();
