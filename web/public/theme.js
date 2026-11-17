// Before the page first draws: the theme picked in Settings, if not the phone's own, so the app never opens in
// another theme for a moment. src/lib/theme.ts does the same while the app runs; its tests check the two agree.
(function () {
  try {
    var theme = localStorage.getItem("lomosapiens.theme");
    var colours = { light: "#f2f2ef", dark: "#0c0c0d", archive: "#e8dcc2" };
    if (!colours.hasOwnProperty(theme)) return;
    document.documentElement.setAttribute("data-theme", theme);
    // The page's own colour scheme too, for any moment before the stylesheet arrives. Archive paper is light.
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute("content", theme === "dark" ? "dark" : "light");
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", colours[theme]);
    // Archive paper sets all its text in the typewriter face: start loading it now, not when the text first draws.
    if (theme === "archive") {
      var font = document.createElement("link");
      font.rel = "preload";
      font.as = "font";
      font.type = "font/woff2";
      font.href = "./fonts/special-elite-latin.woff2";
      font.crossOrigin = "anonymous";
      document.head.appendChild(font);
    }
  } catch (error) {
    // Storage blocked: the phone's own theme.
  }
})();
