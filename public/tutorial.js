(() => {
  "use strict";
  const guide = document.getElementById("tutorial");
  const open = document.getElementById("openTutorial");
  if (typeof guide.showModal !== "function") return;

  const storagePrefix = document.documentElement.dataset.marinelliTest === "true" ? "marinelli.test." : "";
  const seenKey = storagePrefix + "svs.quickStartSeen";
  open.hidden = false;
  open.addEventListener("click", () => guide.showModal());
  guide.addEventListener("keydown", event => event.stopPropagation());
  guide.addEventListener("close", () => {
    try {
      localStorage.setItem(seenKey, "1");
    } catch {
      // The guide can still be reopened when browser storage is disabled.
    }
  });

  let firstVisit = true;
  try {
    firstVisit = !localStorage.getItem(seenKey) && !localStorage.getItem(storagePrefix + "svs01");
  } catch {
    // Show the guide when the browser cannot report visit history.
  }
  if (firstVisit) guide.showModal();
})();
