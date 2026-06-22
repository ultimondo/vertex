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
    ensureTokenClient()
      .then(loadPicker)
      .then(requestToken)
      .then(showPicker)
      .catch((err) => { console.error("Vertex.drive:", err); notify(err.message || "Could not open Google Drive."); });
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

    notify("Saving “" + (char.name || "character") + "” to Drive…");
    getToken()
      .then((token) => saveFlow(char, token, false))
      .then((fileId) => {
        if (Vertex.app && typeof Vertex.app.onDriveSaved === "function") Vertex.app.onDriveSaved(char.id, fileId);
        notify("Saved “" + (char.name || "character") + "” to Google Drive.");
      })
      .catch((err) => { console.error("Vertex.drive:", err); notify(err.message || "Could not save to Drive."); });
  }

  return { open, save };
})();
