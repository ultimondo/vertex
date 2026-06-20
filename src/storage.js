/* =======================================================================
   VERTEX — persistence (browser localStorage)
   Abstracted so a cloud/multiplayer backend can replace it later without
   changing the rest of the app. Stores the whole character list + active id.
   ======================================================================= */
window.Vertex = window.Vertex || {};
Vertex.storage = (function () {
  const KEY = "vertex.characters.v1";
  const ACTIVE = "vertex.activeId.v1";

  function loadAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : null;
    } catch (e) {
      console.warn("Vertex: could not read saved characters —", e);
      return null;
    }
  }

  function saveAll(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // Most likely the quota (large portrait images). Surface it.
      console.error("Vertex: save failed —", e);
      return false;
    }
  }

  function getActiveId() { return localStorage.getItem(ACTIVE); }
  function setActiveId(id) { localStorage.setItem(ACTIVE, id); }

  // ---- export / import a single character as a .json file ----
  function exportCharacter(character) {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (character.name || "character").replace(/[^\w\-]+/g, "_");
    a.href = url; a.download = "vertex-" + safe + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importCharacter(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result)); }
        catch (e) { reject(new Error("That file is not valid Vertex character JSON.")); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  return { loadAll, saveAll, getActiveId, setActiveId, exportCharacter, importCharacter };
})();
