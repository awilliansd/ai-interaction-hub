// assets/js/deepseek-preload.js
// Preload minimo para reduzir falsos positivos de "ambiente anormal" no DeepSeek.

(function () {
  try {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
      configurable: true
    });
  } catch (_err) {
    // Ignora falhas de redefinicao em ambientes mais restritos.
  }
})();
