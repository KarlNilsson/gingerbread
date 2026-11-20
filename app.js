const { dataUrl, pollMs } = window.DASHBOARD_CONFIG;

const els = {
  title: document.getElementById("title"),
  question: document.getElementById("question"),
  bars: document.getElementById("bars"),
  total: document.getElementById("total"),
  status: document.getElementById("status"),
};

let lastGood = null;

async function fetchSummary() {
  const res = await fetch(dataUrl, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || data.error)
    throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function render(data) {
  els.title.textContent = data.title;
  els.question.textContent = data.question;
  // els.total.textContent = `${data.totalResponses} ${data.totalResponses === 1 ? "röst" : "röster"}`;

  const max = Math.max(1, ...data.options.map((o) => o.count));
  const top = Math.max(...data.options.map((o) => o.count));

  // Reuse rows keyed by label so bar widths animate smoothly.
  const existing = new Map(
    [...els.bars.children].map((row) => [row.dataset.label, row]),
  );
  data.options.forEach((opt, i) => {
    let row = existing.get(opt.label);
    if (!row) {
      row = document.createElement("div");
      row.className = "row";
      row.dataset.label = opt.label;
      row.innerHTML =
        '<img class="thumb" alt=""><div class="label"></div><div class="track"><div class="fill"></div></div><div class="count"></div>';
      row.querySelector(".label").textContent = opt.label;
      // "Hus 3" → images/3.png; hide the image if there is no number or file.
      const img = row.querySelector(".thumb");
      const num = opt.label.match(/\d+/)?.[0];
      img.onerror = () => (img.style.visibility = "hidden");
      if (num) img.src = `images/${num}.png`;
      else img.style.visibility = "hidden";
    }
    existing.delete(opt.label);
    if (els.bars.children[i] !== row)
      els.bars.insertBefore(row, els.bars.children[i] || null);

    const countEl = row.querySelector(".count");
    if (
      countEl.textContent !== String(opt.count) &&
      countEl.textContent !== ""
    ) {
      row.classList.remove("bump");
      void row.offsetWidth; // restart animation
      row.classList.add("bump");
    }
    countEl.textContent = opt.count;
    row.querySelector(".fill").style.width = `${(opt.count / max) * 100}%`;
    row.classList.toggle("leader", opt.count > 0 && opt.count === top);
  });
  existing.forEach((row) => row.remove());
}

function setStatus(ok, message) {
  els.status.textContent = message;
  els.status.classList.toggle("stale", !ok);
}

async function tick() {
  try {
    const data = await fetchSummary();
    lastGood = data;
    render(data);
    setStatus(true, `Uppdaterad ${new Date().toLocaleTimeString("sv-SE")}`);
  } catch (err) {
    console.error(err);
    setStatus(
      false,
      lastGood
        ? "Kunde inte uppdatera – visar senaste data"
        : "Kunde inte hämta data",
    );
  } finally {
    setTimeout(tick, pollMs);
  }
}

tick();
