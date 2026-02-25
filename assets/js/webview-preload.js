// assets/js/webview-preload.js
// Script de preload para WebViews - Mascara características do Electron de forma nativa

(function() {
  const googleUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  // Mascarar navigator.webdriver
  Object.defineProperty(navigator, 'webdriver', { get: () => false });

  // Mascarar User-Agent
  Object.defineProperty(navigator, 'userAgent', { get: () => googleUserAgent });
  Object.defineProperty(navigator, 'appVersion', { get: () => googleUserAgent.replace('Mozilla/', '') });

  // Mascarar plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const p = [
        { name: 'Chrome PDF Plugin', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', description: '' },
        { name: 'Native Client Executable', description: '' }
      ];
      p.item = (i) => p[i];
      p.namedItem = (n) => p.find(x => x.name === n);
      p.refresh = () => {};
      return p;
    }
  });

  // Mascarar languages
  Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });

  // Mascarar chrome runtime
  window.chrome = {
    runtime: {},
    loadTimes: () => {},
    csi: () => {}
  };

  // Remover sinais de Electron/Node
  delete window.require;
  delete window.module;
  delete window.process;

  console.log('[WebView] Mascaramento aplicado via Preload Nativo');
})();
