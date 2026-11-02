document.querySelectorAll("video[data-src]").forEach((video) => {
  const load = () => {
    video.querySelectorAll("source[data-src]").forEach((source) => { source.src = source.dataset.src; });
    video.load();
    video.play().catch(() => {});
  };
  if (!("IntersectionObserver" in window)) { load(); return; }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer.disconnect(); load(); }
  }, { rootMargin: "200px" });
  observer.observe(video);
});
