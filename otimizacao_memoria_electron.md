# Otimização de Memória RAM na Aplicação Electron: Flexibilidade

## Introdução

A aplicação **AI Interaction Hub** foi otimizada para reduzir o consumo de memória RAM, que é um desafio comum em aplicações Electron. Após o feedback do usuário sobre a usabilidade, a otimização foi mantida como padrão, mas foi adicionada uma opção de configuração para permitir que o usuário escolha entre a otimização de memória e um modo de alta performance.

## Estratégia de Otimização: Modo Flexível de Webviews

A solução implementada agora oferece dois modos de operação, controlados por uma nova configuração: **"Manter Abas Ativas (Modo de Alta Performance)"**.

### 1. Modo Otimizado (Padrão)

*   **Configuração:** "Manter Abas Ativas" **desmarcada**.
*   **Funcionamento:** Utiliza a **criação/destruição dinâmica de `webviews`**. Ao trocar de aba, a `webview` anterior é removida do DOM, encerrando seu processo de renderização e liberando a memória RAM.
*   **Vantagem:** **Redução significativa do consumo de memória RAM.**
*   **Desvantagem:** A troca de aba pode ter um pequeno atraso, pois a página precisa ser recarregada.

### 2. Modo de Alta Performance

*   **Configuração:** "Manter Abas Ativas" **marcada**.
*   **Funcionamento:** Utiliza **`webviews` estáticas** (todas as `webviews` estão presentes no DOM, mas apenas a ativa é visível). A troca de aba é feita apenas alternando a classe CSS (`active`).
*   **Vantagem:** **Troca de aba instantânea**, melhorando a usabilidade.
*   **Desvantagem:** **Alto consumo de memória RAM**, pois todos os processos de renderização das abas permanecem ativos em segundo plano.

| Característica | Modo Otimizado (Padrão) | Modo de Alta Performance |
| :--- | :--- | :--- |
| **Configuração** | `keepTabsActive: false` | `keepTabsActive: true` |
| **Consumo de Memória** | Baixo | Alto |
| **Velocidade de Troca** | Lenta (recarregamento) | Instantânea |
| **Implementação** | Criação/Destruição Dinâmica de `webviews` | `webviews` Estáticas (Ocultar/Mostrar) |

## Detalhes da Implementação

As alterações foram feitas para garantir a alternância entre os dois modos:

| Arquivo | Alteração |
| :--- | :--- |
| `index.html` | As tags `<webview>` estáticas foram reintroduzidas. Um novo *checkbox* **"Manter Abas Ativas (Modo de Alta Performance)"** foi adicionado ao modal de configurações. |
| `modules/settingsManager.js` | Adicionada a nova configuração `keepTabsActive` com valor padrão `false` (Modo Otimizado). |
| `modules/ipcHandlers.js` | Adicionado o *handler* IPC `set-keep-tabs-active` para salvar a nova configuração. |
| `assets/js/preload.js` | Exposta a nova API `setKeepTabsActive` para o processo de renderização. |
| `assets/js/renderer.js` | A função `showTab(tabId)` foi refatorada para ler a variável `keepTabsActive` e executar a lógica apropriada: **criação/destruição** (otimizado) ou **ocultar/mostrar** (alta performance). A função `toggleKeepTabsActive` foi adicionada, que recarrega a aplicação após a mudança para aplicar o novo modo. |

## Conclusão

Com esta implementação, o usuário tem total controle sobre o equilíbrio entre o consumo de memória e a usabilidade da aplicação. O padrão continua sendo a otimização de memória, mas a opção de alta performance está disponível para quem preferir a troca de abas instantânea.

---

**Autor:** Manus AI
**Data:** 04 de Dezembro de 2025
