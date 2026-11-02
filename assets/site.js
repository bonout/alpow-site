const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll("[data-switch]").forEach((link) => {
  link.addEventListener("click", () => {
    if (location.hash) link.hash = location.hash;
  });
});

document.querySelectorAll("video[data-lazy-video]").forEach((video) => {
  const showPoster = () => {
    if (video.dataset.poster) video.poster = video.dataset.poster;
  };
  const load = () => {
    showPoster();
    video.querySelectorAll("source[data-src]").forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    video.load();
    if (reduceMotion.matches) {
      video.controls = true;
      return;
    }
    video.play().catch(() => {
      video.controls = true;
    });
  };
  if (!("IntersectionObserver" in window)) {
    video.controls = true;
    video.preload = "metadata";
    load();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    },
    { rootMargin: "200px 0px" },
  );
  observer.observe(video);
});
