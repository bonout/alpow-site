(() => {
  const root = document.documentElement;
  const api = root.dataset.api;
  const resortId = root.dataset.resort;
  const english = !(navigator.language || "fr").toLowerCase().startsWith("fr");
  const language = english ? "en" : "fr";
  const strings = JSON.parse(document.getElementById("share-strings").textContent)[language];
  const locale = english ? "en-GB" : "fr-FR";
  const $ = (id) => document.getElementById(id);

  if (english) {
    root.lang = "en";
    document.querySelectorAll("[data-en]").forEach((node) => {
      node.textContent = node.dataset.en;
    });
  }

  const number = (value, digits = 0) =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  const day = (iso) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));
  const ago = (iso) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (minutes < 60) return format.format(-minutes, "minute");
    if (minutes < 48 * 60) return format.format(-Math.round(minutes / 60), "hour");
    return format.format(-Math.round(minutes / 1440), "day");
  };
  const text = (id, value) => {
    const node = $(id);
    if (node) node.textContent = value;
  };

  const params = new URLSearchParams(location.search);
  const wantedDay = /^\d{4}-\d{2}-\d{2}$/.test(params.get("day") || "") ? params.get("day") : null;
  const friend = (params.get("prenom") || "")
    .replace(/[^\p{L} '-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20)
    .trim();
  const longDay = (iso) =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(`${iso}T12:00:00Z`));
  const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => values[key]);

  function invite(days) {
    if (!wantedDay) return null;
    const chosen = days.find((entry) => entry.date === wantedDay) || null;
    const values = { name: friend, day: longDay(wantedDay) };
    text("invite-title", fill(friend ? strings.invitedBy : strings.invited, values));
    text(
      "invite-detail",
      chosen ? fill(strings.invitedDetail, { score: number(chosen.score, 1), snow: chosen.fresh_snow_cm || 0 }) : strings.invitedPast,
    );
    $("invite").hidden = false;
    return chosen;
  }

  function render(detail, bulletin) {
    const days = (detail.forecast && detail.forecast.days) || [];
    const today = invite(days) || days[0];
    if (today) {
      text("score", number(today.score, 1));
      text("score-day", `${strings.scoreFor} ${day(today.date)}`);
      $("score-ring").style.setProperty("--score", String(Math.max(0, Math.min(5, today.score)) / 5));
    }
    const max = Math.max(1, ...days.map((entry) => entry.snowfall_cm || 0));
    const bars = $("bars");
    bars.replaceChildren(
      ...days.slice(0, 8).map((entry) => {
        const item = document.createElement("li");
        const bar = document.createElement("span");
        bar.className = "bar";
        bar.style.setProperty("--h", String((entry.snowfall_cm || 0) / max));
        const value = document.createElement("b");
        value.textContent = entry.snowfall_cm ? `${entry.snowfall_cm}` : "";
        const label = document.createElement("small");
        label.textContent = day(entry.date);
        item.append(value, bar, label);
        item.setAttribute("aria-label", `${day(entry.date)} : ${entry.snowfall_cm || 0} cm`);
        return item;
      }),
    );
    const total = days.slice(0, 3).reduce((sum, entry) => sum + (entry.snowfall_cm || 0), 0);
    text("snow-total", `${total} cm`);
    const limits = days.slice(0, 3).flatMap((entry) => [entry.rain_snow_limit_min_m, entry.rain_snow_limit_max_m]).filter(Boolean);
    text("limit", limits.length ? `${number(Math.min(...limits))} – ${number(Math.max(...limits))} m` : "—");
    const avalanche = detail.avalanche;
    if (avalanche && avalanche.current) {
      $("danger").dataset.level = String(avalanche.level);
      text("danger", String(avalanche.level));
      text("danger-label", english ? avalanche.label_en : avalanche.label_fr);
      text("danger-massif", `${avalanche.massif_name} · ${strings.published} ${ago(avalanche.issued_at)}`);
    } else {
      text("danger-label", strings.noBulletin);
    }
    if (bulletin && bulletin.official_url) $("bulletin").href = bulletin.official_url;
    const reports = (detail.reports && detail.reports.tags) || [];
    const list = $("reports");
    if (reports.length) {
      list.replaceChildren(
        ...reports.slice(0, 4).map((entry) => {
          const item = document.createElement("li");
          item.textContent = `${strings.tags[entry.tag] || entry.tag} × ${entry.count}`;
          return item;
        }),
      );
      text("reports-note", detail.reports.latest_at ? `${strings.latest} ${ago(detail.reports.latest_at)}` : "");
    } else {
      list.replaceChildren();
      text("reports-note", strings.noReports);
    }
    if (detail.forecast && detail.forecast.computed_at) text("updated", `${strings.updated} ${ago(detail.forecast.computed_at)}`);
    root.classList.add("live");
  }

  async function load() {
    try {
      const response = await fetch(`${api}/v1/resorts/${encodeURIComponent(resortId)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const detail = await response.json();
      let bulletin = null;
      if (detail.avalanche) {
        bulletin = await fetch(`${api}/v1/bera/${detail.avalanche.massif_id}`)
          .then((answer) => (answer.ok ? answer.json() : null))
          .catch(() => null);
      }
      render(detail, bulletin);
    } catch {
      root.classList.add("offline");
      text("updated", strings.unavailable);
    }
  }

  load();
})();
