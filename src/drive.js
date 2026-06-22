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
  const CLIENT_ID = "232162680124-2sg5ig257kdlj74ftb3hu87o2iel25d3.apps.googleusercontent.com";  // OAuth 2.0 Client ID
  const API_KEY   = "AIzaSyCcbEouGRkrWTf0xAer1_Vvusf8YmlQeo4";  // API key (the Picker's "developer key")
  const APP_ID    = "232162680124";                             // GCP project NUMBER (Picker App ID)

  // Auto-share every saved character with the Host's Google account, so the Host
  // collects a live copy of each player's character. Set "" to turn this off.
  const SHARE_WITH_EMAIL = "taylorlanson@gmail.com";  // the Host (collector) account
  const SHARE_ROLE       = "reader";                  // "reader" = view + copy · "writer" = also edit
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

  // New (never-saved) characters land in this folder, created on first save.
  const FOLDER_NAME = "Vertex Characters";
  const FOLDER_KEY  = "vertex.driveFolderId";   // cached folder id (localStorage)

  // localStorage keys for auto-sync state.
  const AUTOSYNC_KEY  = "vertex.driveAutoSync";   // "1" on · "0" off
  const CONNECTED_KEY = "vertex.driveConnected";  // "1" once the user has granted access
  const NOTICE_KEY    = "vertex.driveNoticeAck";  // disclosure acknowledged
  const OFFER_KEY     = "vertex.driveOffered";    // connect offered on creation (once)

  let tokenClient = null;   // GIS token client (created once)
  let accessToken = null;   // current short-lived OAuth access token
  let pickerLoaded = false; // has gapi's 'picker' module finished loading?
  const timers     = {};    // per-character debounce timers (charId -> timeout)
  const lastSynced = {};    // charId -> last payload we pushed (skip no-op syncs)

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
        markConnected();
        resolve(accessToken);
      };
      // Prompt for consent the first time; silently refresh afterward.
      tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    });
  }

  // Resolve to a usable access token, only popping a request when needed.
  function getToken(forceNew) {
    return ensureTokenClient().then(() => {
      if (accessToken && !forceNew) return accessToken;
      return requestToken();
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
        obj.driveFileId = fileId;   // remember the source file so "Save to Drive" updates it in place
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

  /* ---------- save the active character UP to Drive ---------- */

  // Find or create the "Vertex Characters" folder; resolves to its id (cached).
  function ensureFolder(token) {
    const cached = localStorage.getItem(FOLDER_KEY);
    const create = () => fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
    }).then((r) => { if (!r.ok) throw new Error("folder create failed"); return r.json(); })
      .then((m) => { localStorage.setItem(FOLDER_KEY, m.id); return m.id; });

    if (!cached) return create();
    // Verify the cached folder still exists and isn't trashed; recreate if not.
    return fetch("https://www.googleapis.com/drive/v3/files/" + cached + "?fields=id,trashed",
      { headers: { Authorization: "Bearer " + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => (m && !m.trashed ? cached : create()));
  }

  // One multipart upload: PATCH when fileId is given (update), else POST (create).
  function performUpload(char, fileId, parents, token) {
    const content  = JSON.stringify(char, null, 2);
    const safeName = String(char.name || "character").replace(/[^\w\-]+/g, "_");
    const metadata = { name: "vertex-" + safeName + ".json", mimeType: JSON_MIME };
    if (!fileId && parents) metadata.parents = parents;   // parents only allowed on create

    const boundary = "vertexBoundary" + Date.now();
    const body =
      "--" + boundary + "\r\n" +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + "\r\n" +
      "--" + boundary + "\r\n" +
      "Content-Type: " + JSON_MIME + "\r\n\r\n" + content + "\r\n" +
      "--" + boundary + "--";

    const base = "https://www.googleapis.com/upload/drive/v3/files";
    const url  = fileId
      ? base + "/" + encodeURIComponent(fileId) + "?uploadType=multipart&fields=id"
      : base + "?uploadType=multipart&fields=id";

    return fetch(url, {
      method: fileId ? "PATCH" : "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
      body: body
    });
  }

  // Orchestrates create-vs-update, folder placement, token refresh, stale-file recovery.
  function saveFlow(char, token, didRefresh) {
    const parentsP = char.driveFileId
      ? Promise.resolve(null)                  // updates stay wherever the file already lives
      : ensureFolder(token).catch(() => null); // new files go in the folder (root if that fails)

    return parentsP.then((folderId) => {
      const parents = folderId ? [folderId] : null;
      return performUpload(char, char.driveFileId, parents, token).then((res) => {
        if (res.ok) return res.json().then((m) => m.id);
        if (res.status === 401 && !didRefresh) {        // token expired — refresh once
          return getToken(true).then((t) => saveFlow(char, t, true));
        }
        if (res.status === 404 && char.driveFileId) {   // remembered file is gone — make a fresh one
          char.driveFileId = null;
          return saveFlow(char, token, didRefresh);
        }
        throw new Error("Drive save failed (HTTP " + res.status + ").");
      });
    });
  }

  // Grant the Host's account access to an app-created file (best-effort, idempotent).
  // drive.file lets us manage sharing on files the app created. We never email a
  // notification (that would spam the Host), and a failure here never blocks the save.
  function shareWithHost(fileId, token) {
    if (!SHARE_WITH_EMAIL) return Promise.resolve(false);
    const url = "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(fileId) +
                "/permissions?sendNotificationEmail=false&fields=id";
    return fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role: SHARE_ROLE, emailAddress: SHARE_WITH_EMAIL })
    }).then((r) => {
      if (r.ok || r.status === 400) return true;   // 400 = already shared / can't share with self → fine
      return r.text().then((t) => { console.warn("Vertex.drive: share failed", r.status, t); return false; });
    }).catch((e) => { console.warn("Vertex.drive: share error", e); return false; });
  }

  /* ---------- one-time disclosure notice ---------- */

  // Shown once before the first Drive action. Resolves on "continue",
  // rejects with "cancelled" on "not now" (the caller then aborts quietly).
  function ensureDisclosure() {
    if (localStorage.getItem(NOTICE_KEY) === "1") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const wrap = document.createElement("div");
      wrap.className = "drive-modal";
      const hostLine = SHARE_WITH_EMAIL
        ? "<p>When you save a character to Google Drive, a copy is automatically shared with your game’s Host (<b>" + SHARE_WITH_EMAIL + "</b>) so they always have it.</p>"
        : "";
      wrap.innerHTML =
        '<div class="drive-card" role="dialog" aria-modal="true">' +
          "<h3>Saving to Google Drive</h3>" +
          hostLine +
          "<p><b>Auto-sync</b> keeps your character backed up to your own Google Drive as you play. You can turn it off anytime from the character menu.</p>" +
          "<p>You’ll sign in with your own Google account, and Vertex only ever touches the files you save or pick — never the rest of your Drive.</p>" +
          '<div class="drow">' +
            '<button class="no" type="button">Not now</button>' +
            '<button class="ok" type="button">Got it, continue</button>' +
          "</div>" +
        "</div>";
      const finish = (ok) => { wrap.remove(); ok ? resolve() : reject(new Error("cancelled")); };
      wrap.querySelector(".ok").addEventListener("click", () => { localStorage.setItem(NOTICE_KEY, "1"); finish(true); });
      wrap.querySelector(".no").addEventListener("click", () => finish(false));
      wrap.addEventListener("click", (e) => { if (e.target === wrap) finish(false); });
      document.body.appendChild(wrap);
    });
  }

  /* ---------- connection + auto-sync state ---------- */

  function markConnected() {
    localStorage.setItem(CONNECTED_KEY, "1");
    if (localStorage.getItem(AUTOSYNC_KEY) === null) localStorage.setItem(AUTOSYNC_KEY, "1");  // default on
    refreshMenu();
  }
  function autoSyncPref()    { return localStorage.getItem(AUTOSYNC_KEY) === "1"; }
  function autoSyncEnabled() { return configured() && localStorage.getItem(CONNECTED_KEY) === "1" && autoSyncPref(); }
  function refreshMenu()     { if (Vertex.app && typeof Vertex.app.refreshMenu === "function") Vertex.app.refreshMenu(); }
  function activeChar()      { return (Vertex.app && typeof Vertex.app.getActive === "function") ? Vertex.app.getActive() : null; }

  function toggleAutoSync() {
    if (autoSyncPref()) {                                       // turn OFF
      localStorage.setItem(AUTOSYNC_KEY, "0");
      Object.keys(timers).forEach((k) => clearTimeout(timers[k]));
      refreshMenu(); notify("Auto-sync to Drive is off.");
    } else {                                                    // turn ON
      localStorage.setItem(AUTOSYNC_KEY, "1");
      if (localStorage.getItem(CONNECTED_KEY) === "1") {
        refreshMenu(); notify("Auto-sync to Drive is on."); scheduleAutoSave(activeChar(), 200);
      } else {
        ensureDisclosure().then(() => save()).catch(() => {});  // connect first; save() handles upload + share
      }
    }
  }

  /* ---------- silent auto-save ---------- */

  // Get a token WITHOUT ever showing UI; resolves null if interaction would be needed.
  function requestTokenSilent() {
    return ensureTokenClient().then(() => new Promise((resolve) => {
      tokenClient.callback = (resp) => {
        if (resp && resp.access_token) { accessToken = resp.access_token; markConnected(); resolve(accessToken); }
        else resolve(null);
      };
      try { tokenClient.requestAccessToken({ prompt: "" }); } catch (_) { resolve(null); }
    })).catch(() => null);
  }
  function getTokenSilent() { return accessToken ? Promise.resolve(accessToken) : requestTokenSilent(); }

  function scheduleAutoSave(char, delay) {
    if (!autoSyncEnabled() || !char) return;
    clearTimeout(timers[char.id]);
    timers[char.id] = setTimeout(() => { delete timers[char.id]; autoSave(char); }, delay == null ? 2500 : delay);
  }

  function autoSave(char) {
    if (!autoSyncEnabled() || !char) return;
    const payload = JSON.stringify(char);
    if (lastSynced[char.id] === payload) return;        // nothing changed since last sync
    getTokenSilent().then((token) => {
      if (!token) return;                               // can't get a token silently — skip; retry on next change
      lastSynced[char.id] = payload;                    // optimistic: dedupe concurrent triggers
      return saveFlow(char, token, false).then((fileId) => {
        const already = char.driveSharedWith === SHARE_WITH_EMAIL;
        const shareP  = (!SHARE_WITH_EMAIL || already) ? Promise.resolve(already) : shareWithHost(fileId, token);
        return shareP.then((shared) => {
          if (Vertex.app && typeof Vertex.app.onDriveSaved === "function")
            Vertex.app.onDriveSaved(char.id, fileId, shared ? SHARE_WITH_EMAIL : null);
          notify("Synced to Drive ✓");
        });
      });
    }).catch((e) => { console.warn("Vertex.drive auto-save:", e); lastSynced[char.id] = null; });
  }

  // Called by the controller after every local save (edits).
  function noteChange() {
    if (!autoSyncEnabled()) return;
    scheduleAutoSave(activeChar(), 2500);
  }
  // Called by the controller right after a character is created.
  function onCharacterCreated() {
    if (autoSyncEnabled()) { scheduleAutoSave(activeChar(), 600); return; }
    if (localStorage.getItem(OFFER_KEY) === "1") return;        // only offer to connect once
    localStorage.setItem(OFFER_KEY, "1");
    save();   // disclosure → connect → upload + share; aborts quietly if declined
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

  /* ---------- public entry points (wire these to buttons) ---------- */

  // LOAD: pick a character JSON from Drive and import it.
  function open() {
    if (!configured()) {
      notify("Add your Google API Key, Client ID & App ID near the top of src/drive.js first.");
      return;
    }
    // All async work is kicked off by a real user click, which keeps the
    // OAuth popup and the Picker from being blocked by the browser.
    ensureDisclosure()
      .then(ensureTokenClient)
      .then(loadPicker)
      .then(requestToken)
      .then(showPicker)
      .catch((err) => { if (err && err.message === "cancelled") return; console.error("Vertex.drive:", err); notify(err.message || "Could not open Google Drive."); });
  }

  // SAVE: push the active character UP to Drive — updates its file in place if it
  // came from Drive, otherwise creates a new one in the "Vertex Characters" folder.
  function save() {
    if (!configured()) {
      notify("Add your Google API Key, Client ID & App ID near the top of src/drive.js first.");
      return;
    }
    const char = (Vertex.app && typeof Vertex.app.getActive === "function") ? Vertex.app.getActive() : null;
    if (!char) { notify("No character is loaded to save."); return; }

    let savedId = null;
    ensureDisclosure()
      .then(() => { notify("Saving “" + (char.name || "character") + "” to Drive…"); return getToken(); })
      .then((token) => saveFlow(char, token, false))
      .then((fileId) => {
        savedId = fileId;
        // Auto-share the file with the Host — skip the call if it's already shared.
        const already = char.driveSharedWith === SHARE_WITH_EMAIL;
        if (!SHARE_WITH_EMAIL || already) return already;
        return getToken().then((t) => shareWithHost(savedId, t));
      })
      .then((shared) => {
        const sharedEmail = shared ? SHARE_WITH_EMAIL : null;
        if (Vertex.app && typeof Vertex.app.onDriveSaved === "function")
          Vertex.app.onDriveSaved(char.id, savedId, sharedEmail);
        notify("Saved “" + (char.name || "character") + "” to Google Drive.");
      })
      .catch((err) => { if (err && err.message === "cancelled") return; console.error("Vertex.drive:", err); notify(err.message || "Could not save to Drive."); });
  }

  // Once loaded, refresh the menu so the auto-sync toggle reflects saved state.
  setTimeout(refreshMenu, 0);

  return { open, save, noteChange, onCharacterCreated, autoSyncPref, toggleAutoSync };
})();
