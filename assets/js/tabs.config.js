// assets/js/tabs.config.js
// Fonte única de verdade para abas: URL, partição, rótulo, ícone, modos e,
// quando necessário, User-Agent / preload específicos (consumidos pelo
// webviewHost no processo principal).

export const APP_MODES = {
  PERSONAL: "personal",
  DEVELOPER: "developer",
};

// Cada aba declara em quais modos aparece.
export const TAB_CONFIGS = [
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app", partition: "persist:gemini", icon: "assets/icons/gemini.png", modes: [APP_MODES.PERSONAL] },
  { id: "chatgpt", label: "ChatGPT", url: "https://chat.openai.com", partition: "persist:chatgpt", icon: "assets/icons/chatgpt.png", modes: [APP_MODES.PERSONAL] },
  { id: "claude", label: "Claude", url: "https://claude.ai", partition: "persist:claude", icon: "assets/icons/claude.png", modes: [APP_MODES.PERSONAL, APP_MODES.DEVELOPER] },
  { id: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com", partition: "persist:deepseek", icon: "assets/icons/deepseek.png", modes: [APP_MODES.PERSONAL], preload: "assets/js/deepseek-preload.js", userAgent: "clean-chrome" },
  { id: "manus", label: "Manus", url: "https://manus.im/app", partition: "persist:manus", icon: "assets/icons/manus.png", modes: [APP_MODES.DEVELOPER] },
  { id: "grok", label: "Grok", url: "https://grok.com", partition: "persist:grok", icon: "assets/icons/grok.png", modes: [APP_MODES.PERSONAL] },
  { id: "kimi", label: "Kimi", url: "https://www.kimi.com/", partition: "persist:kimi", icon: "assets/icons/kimi.png", modes: [APP_MODES.PERSONAL] },
  { id: "qwen", label: "Qwen Chat", url: "https://chat.qwen.ai/", partition: "persist:qwen", icon: "assets/icons/qwen.png", modes: [APP_MODES.PERSONAL] },
  { id: "zai", label: "Z.ai", url: "https://chat.z.ai/", partition: "persist:zai", icon: "assets/icons/zai.svg", modes: [APP_MODES.DEVELOPER] },
  { id: "replit", label: "Replit", url: "https://replit.com/", partition: "persist:replit", icon: "assets/icons/replit.ico", modes: [APP_MODES.DEVELOPER] },
  { id: "groq", label: "Groq", url: "https://console.groq.com/playground", partition: "persist:groq", icon: "assets/icons/groq.ico", modes: [APP_MODES.DEVELOPER] },
  { id: "copilot", label: "MS Copilot", url: "https://copilot.microsoft.com", partition: "persist:copilot", icon: "assets/icons/mscopilot.png", modes: [APP_MODES.PERSONAL] },
  { id: "metaai", label: "Meta AI", url: "https://www.meta.ai", partition: "persist:metaai", icon: "assets/icons/metaai.png", modes: [APP_MODES.PERSONAL] },
  { id: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai", partition: "persist:perplexity", icon: "assets/icons/perplexity.png", modes: [APP_MODES.PERSONAL] },
];

export const TAB_BY_ID = Object.fromEntries(TAB_CONFIGS.map((t) => [t.id, t]));

export function getTabsByMode(mode) {
  return TAB_CONFIGS.filter((t) => t.modes.includes(mode));
}

export function getAllowedTabIds(mode) {
  return getTabsByMode(mode).map((t) => t.id);
}

export const DEFAULT_SETTINGS = {
  minimizeToTray: false,
  keepTabsActive: false,
  appMode: APP_MODES.PERSONAL,
};