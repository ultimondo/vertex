/* =======================================================================
   VERTEX — Load a character from Google Drive
   Google Identity Services (OAuth 2.0 token flow) + Google Picker API.
   No build step; attaches to window.Vertex.drive. Lazily initialises the
   Google libraries on first use, so it costs nothing until clicked.

   ⚠ Google OAuth does NOT permit file:// origins. This only works when the
     app is served over http(s) — your GitHub Pages site, or a localhost
     server for testing. Loading from disk (the existing Import) is unaffected.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.drive = (function () {

  /* ===========================================================
     ▼▼▼  PASTE YOUR GOOGLE CREDENTIALS HERE  ▼▼▼
     Generate these in the Google Cloud Console (see the setup
     steps that came with this file). Nothing else needs editing.
     =========================================================== */
  const CLIENT_ID = "PASTE_YOUR_OAUTH_CLIENT_ID_HERE";    // OAuth 2.0 Client ID  → ends in .apps.googleusercontent.com
  const API_KEY   = "PASTE_YOUR_API_KEY_HERE";            // API key (the Picker needs it as the "developer key")
  const APP_ID    = "PASTE_YOUR_PROJECT_NUMBER_HERE";     // Your GCP project NUMBER (used by the Picker as the App ID)
  /* ===========================================================
     ▲▲▲  NOTHING BELOW NEEDS EDITING  ▲▲▲
     =========================================================== */

  // Most-restrictive scope possible: per-file access. The app can only ever
  // touch files the user explicitly hands it through the Picker — never the
  // rest of their Drive. (drive.readonly would expose the WHOLE Drive and is a
  // Google-"restricted" scope requiring a security assessment to publish.)
  const SCOPES = "https://www.googleapis.com/auth/drive.file";

  // Drive stores .json files with this MIME type; the Picker filters to it.
  const JSON_MIME = "application/json";

  let tokenClient = null;   // GIS token client (created once)
  let accessToken = null;   // current short-lived OAuth access token
  let pickerLoaded = false; // has gapi's 'picker' module finished loading?

  /* ---------- small helpers (no external deps) ---------- */

  // Reuse the app's toast element; fall back to alert() if it isn't present.
  function notify(msg) {
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = msg; t.classList.add("show");
      clearTimeout(notify._t);
      notify._t = setTimeout(() => t.classList.remove("show"), 2600);
    } else { alert(msg); }
  }

  function configured() {
    const all = String(CLIENT_ID) + String(API_KEY) + String(APP_ID);
    return all.length > 0 && all.indexOf("PASTE_") === -1;
  }

  // Poll until a library is ready (the <script> tags load async).
  function waitFor(test, label, timeoutMs) {
    timeoutMs = timeoutMs || 10000;
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        let ok = false;
        try { ok = !!test(); } catch (_) { ok = false; }
        if (ok) return resolve();
        if (Date.now() - start > timeoutMs) {
          return reject(new Error(label + " failed to load — check your connection and the Google <script> tags in index.html."));
        }
        setTimeout(poll, 100);
      })();
    });
  }

  /* ---------- Google Identity Services: get an access token ---------- */

  function ensureTokenClient() {
    return waitFor(
      () => window.google && google.accounts && google.accounts.oauth2,
      "Google Identity Services"
    ).then(() => {
      if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: () => {}   // replaced per-request in requestToken()
        });
      }
    });
  }

  function requestToken() {
    return new Promise((resolve, reject) => {
      tokenClient.callback = (resp) => {
        if (!resp || resp.error) {
          return reject(new Error("Google sign-in was cancelled or failed."));
        }
        accessToken = resp.access_token;
        resolve(accessToken);
      };
      // Prompt for consent the first time; silently refresh afterward.
      tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    });
  }

  /* ---------- Google Picker ---------- */

  function loadPicker() {
    if (pickerLoaded) return Promise.resolve();
    return waitFor(() => window.gapi, "Google API loader").then(() =>
      new Promise((resolve, reject) => {
        gapi.load("picker", {
          callback: () => { pickerLoaded = true; resolve(); },
          onerror: () => reject(new Error("Google Picker module failed to load."))
        });
      })
    );
  }

  function showPicker() {
    // A single view, filtered to JSON files only.
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(JSON_MIME)
      .setSelectFolderEnabled(false);

    const picker = new google.picker.PickerBuilder()
      .setAppId(APP_ID)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .setTitle("Select a Vertex character (.json)")
      .setCallback(onPicked)
      .build();

    picker.setVisible(true);
  }

  function onPicked(data) {
    const P = google.picker;
    if (data[P.Response.ACTION] !== P.Action.PICKED) return;  // CANCEL / LOADED — ignore

    const doc    = data[P.Response.DOCUMENTS][0];
    const fileId = doc[P.Document.ID];
    const name   = doc[P.Document.NAME] || "file";

    fetchFileContents(fileId)
      .then((text) => {
        let obj;
        try { obj = JSON.parse(text); }
        catch (_) { notify("“" + name + "” is not valid character JSON."); return; }
        handlePickedCharacterData(obj);
      })
      .catch((err) => { console.error("Vertex.drive:", err); notify("Could not read that file from Drive."); });
  }

  /* ---------- fetch the raw file bytes via the Drive API ---------- */

  function fetchFileContents(fileId) {
    const url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) + "?alt=media";
    return fetch(url, { headers: { Authorization: "Bearer " + accessToken } })
      .then((r) => {
        if (!r.ok) throw new Error("Drive download failed (HTTP " + r.status + ").");
        return r.text();
      });
  }

  /* =====================================================================
     ▼▼▼  SEAM — hand the parsed character object to the character sheet  ▼▼▼
     This is the placeholder you asked for. It is already wired to your
     existing import logic via Vertex.app.onImportData(). To route the data
     somewhere else, change ONLY this function — nothing above needs to know.
     ===================================================================== */
  function handlePickedCharacterData(data) {
    if (Vertex.app && typeof Vertex.app.onImportData === "function") {
      Vertex.app.onImportData(data);          // ← your existing population logic
    } else {
      console.log("Vertex.drive — parsed character payload:", data);
      notify("Loaded a character from Drive, but no handler is connected.");
    }
  }
  /* ▲▲▲  SEAM  ▲▲▲ */

  /* ---------- public entry point (wire this to a button) ---------- */

  function open() {
    if (!configured()) {
      notify("Add your Google API Key, Client ID & App ID near the top of src/drive.js first.");
      return;
    }
    // All async work is kicked off by a real user click, which keeps the
    // OAuth popup and the Picker from being blocked by the browser.
    ensureTokenClient()
      .then(loadPicker)
      .then(requestToken)
      .then(showPicker)
      .catch((err) => { console.error("Vertex.drive:", err); notify(err.message || "Could not open Google Drive."); });
  }

  return { open };
})();
