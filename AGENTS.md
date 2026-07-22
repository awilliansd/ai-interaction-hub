# AGENTS.md

Indicações específicas deste repositório para agentes de IA (e humanos) que forem editar o código.

## Ambiente

- **Node.js 22 LTS** é obrigatório (definido em `.nvmrc`/`.node-version` e em `package.json` `engines`).
  `.npmrc` tem `engine-strict=true`, então `npm install` recusa Node incompatível.
- **npm 10+** (necessário para o bloqueio de install scripts).

### Install scripts (npm 12+ bloqueia por padrão)

Alguns pacotes precisam de seus scripts de instalação aprovados explicitamente:

```sh
npm install-scripts ls                     # lista bloqueados
npm install-scripts approve electron       # approve o binário do Electron
npm install-scripts approve sharp          # approve o sharp (rebuild nativo)
npm install                                # complete a instalação
```

`electron` (>=42) baixa o binário sob demanda na primeira execução de `npx electron`, não no `postinstall`. Se `npx electron --version` imprimir apenas o número da versão, está tudo certo.

## Comandos

| Tarefa | Comando |
|---|---|
| Rodar em desenvolvimento | `npm start` (ou `npx electron .`) |
| Testes (Jest, Node env) | `npm test` |
| Gerar ícones Linux | `npm run generate-icons` |
| Gerar instalador | `npm run dist` |
| Publicar release | `npm run release` |

**Não há lint nem typecheck configurados** neste repositório. O único verificador automatizado é o Jest. Ao terminar uma alteração não-trivial, rode `npm test`.

Para checagem de sintaxe rápida (CJS e ESM):

```sh
node --check caminho/para/arquivo.js        # CJS
node --check caminho/para/arquivo.mjs       # ESM (renomeie se necessário)
```

Smoke GUI não é automatizável via CLI: o app abre uma janela. Ao migrar lógica que afeta a UI/main process, faça você mesmo um smoke manual (`npm start`) pelas IAs e modos — **o single-instance lock bloqueia uma segunda instância** se o app de produção estiver aberto; feche-o antes.

## Arquitetura (visão geral)

- **Main process**: `main.js` + `modules/*.js` (CommonJS).
  - `webviewHost.js` hospeda cada IA numa `WebContentsView` anexada à janela principal (substitui o `<webview>` tag). Resiliência (retry/watchdog/recreate), layout, find-in-page e teardown moram aqui.
  - `windowManager.js` cria a `BrowserWindow` (host do sidebar/modais) e o menu.
  - `ipcHandlers.js` registra handlers IPC; `ipc-channels.js` centraliza os nomes dos canais — **use as constantes**, não strings literais espalhadas.
  - `settingsManager.js` é a fonte única de verdade das configurações (`settings.json` em `app.getPath('userData')`).
- **Renderer**: `index.html` + `assets/js/*` (arquivos `renderer.js` e `tabs.config.js` são **ES modules**; o `renderer.js` é carregado via `<script type="module">`).
- **Preload** (`assets/js/preload.js`): expõe `window.electronAPI` via `contextBridge`. **Não exponha Electron direto** ao conteúdo não-confiável. Nomes de canal neste arquivo ficam como literais (não importam `ipc-channels.js`) porque o preload empacotado em asar não deve depender de path da pasta `modules/`.

## Fontes de verdade importantes (edite em apenas um lugar)

- **Abas de IA** (URL, partição, rótulo, ícone, modos, UA/preload opcionais): `assets/js/tabs.config.js`. A sidebar é gerada em runtime a partir dele — não hardcode botões no `index.html`.
- **Canais IPC**: `modules/ipc-channels.js`. Mantenha o preload com os mesmos literais.
- **Configurações**: `settingsManager.js` (`DEFAULT_SETTINGS`) é a única fonte dos defaults. O renderer lê via `init-settings`; persista `appMode` só no `settings.json` (não duplique em `localStorage`).
- **Resolução de ícone** (janela/bandeja): `modules/iconResolver.js`.

## Segurança (não relaxar)

- `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true` em todas as `WebContentsView`/janelas.
- CSP está definido via `<meta>` no `index.html`; não adicione de volta handlers inline (`onclick`/`oncontextmenu`) no HTML.
- Permissões de IA são allowlist em `webviewHost.js`/main (`ALLOWED_IA_PERMISSIONS`). Não use `callback(true)` genérico.
- `navigator.webdriver` é mascarado via `app.commandLine.appendSwitch('disable-blink-features','AutomationControlled')`. O preload contextIsolated **não** consegue redefinir `navigator` da página (roda num mundo isolado) — não tente trazê-lo de volta.
- Não carregue URLs externas com `webSecurity:false`.

## Convenções de código

- Commits são gerenciados pelo usuário; **não commity sem solicitação explícita**.
- Não adicione comentários explicativos a menos que o usuário peça.
- Mantenha a redação do app em **português (pt-BR)** para textos de UI.
- Ao criar novo arquivo CJS de módulo, exponha uma API limitada via `module.exports` e injete dependências por parâmetro (padrão já em uso em `modules/*.js`).

## Testes

- Stack: **Jest 30**, `testEnvironment: 'node'`, `roots: ['<rootDir>/modules']`.
- Testes em `modules/*.test.js` mockam `electron`/`fs` — ao adicionar API Electron nova nesses módulos, atualize os mocks correspondentes.
- Você não conseguirá rodar testes que dependam de GUI; mantenha lógica de negócio isolada e testável em módulos puros.