# AI Interaction Hub

<p align="center">
  <img src="icons/aiinteractionhub-dark.png" alt="AI Interaction Hub" width="200">
</p>

**AI Interaction Hub** é um aplicativo desktop Electron que reúne, em uma única interface, os principais assistentes de IA do mercado, facilitando o acesso e a organização das suas conversas.

## Funcionalidades

- Interface unificada para múltiplos chats de IA:
  - Gemini
  - ChatGPT
  - Claude
  - DeepSeek
  - Grok
  - Manus
  - Kimi
  - Z.ai
  - Microsoft Copilot
  - Meta AI
  - Perplexity
  - Replit (modo desenvolvedor)

- **Modos de uso:**
  - Modo Pessoal (abas focadas em IAs gerais)
  - Modo Desenvolvedor (abas focadas em ferramentas de desenvolvimento)

- **Alternância rápida** entre assistentes via barra lateral
- **Suporte a múltiplas abas** e duplicação de sessões
- **Menu de contexto** com opções de recarregar, fechar e duplicar abas
- **Barra de busca integrada** (Ctrl+F) para encontrar texto nas páginas
- **Modo de alta performance** para manter abas ativas em segundo plano
- **Minimizar para a bandeja do sistema** (tray)
- **Limpeza de cache** para resolver problemas de login ou performance
- **Modal de configurações** completo com opções avançadas
- **Atalhos de teclado** para navegação eficiente

## Pré-requisitos

- Node.js (versão 16 ou superior)
- npm (geralmente vem com o Node.js)

## Instalação

### Para Desenvolvimento

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/awilliansd/ai-interaction-hub.git
   cd ai-interaction-hub
   ```

2. **Instale as dependências:**
   ```sh
   npm install
   ```

3. **Execute o aplicativo em modo de desenvolvimento:**
   ```sh
   npm start
   ```

### Para Produção

1. **Instale o Electron globalmente (opcional):**
   ```sh
   npm install -g electron
   ```

2. **Execute diretamente:**
   ```sh
   npx electron .
   ```

### Gerando o Instalador

Para gerar instaladores nativos:

**Windows:**
```sh
npm run dist
```

O instalador será gerado na pasta `dist/`.

## Estrutura do Projeto

```
├── assets/
│   ├── css/
│   │   └── style.css              # Estilos da interface
│   ├── icons/                     # Ícones das IAs
│   ├── images/                    # Imagens adicionais
│   └── js/
│       ├── renderer.js            # Lógica da interface
│       ├── preload.js             # Preload para comunicação segura
│       ├── deepseek-preload.js   # Preload específico para DeepSeek
│       └── webview-preload.js    # Preload para webviews
├── icons/                         # Ícones do aplicativo
├── modules/                       # Módulos principais do Electron
│   ├── appLifecycle.js           # Gerenciamento do ciclo de vida
│   ├── ipcHandlers.js            # Manipuladores IPC
│   ├── settingsManager.js        # Gerenciamento de configurações
│   ├── trayManager.js            # Gerenciamento da bandeja
│   └── windowManager.js          # Gerenciamento de janelas
├── scripts/
│   └── generate-icons.js         # Script para gerar ícones
├── tests/                        # Testes automatizados
│   └── settingsManager.test.js   # Testes do gerenciador de configurações
├── index.html                    # Página principal
├── main.js                       # Arquivo principal do Electron
├── package.json                  # Configurações do projeto
└── README.md                     # Este arquivo
```

## Como Usar

### Navegação Básica

- **Alternar entre IAs:** Use a barra lateral esquerda para escolher o assistente desejado.
- **Alternar modos:** Clique no botão de modo (P/D) para alternar entre modo pessoal e desenvolvedor.
- **Menu de contexto:** Clique com o botão direito sobre o ícone de uma IA para acessar opções como recarregar, fechar ou duplicar a aba.
- **Buscar texto:** Pressione Ctrl+F para abrir a barra de busca.

### Configurações

Acesse o ícone de engrenagem para abrir o modal de configurações:

- **Manter abas ativas:** Mantém as abas carregadas em segundo plano (modo de alta performance)
- **Minimizar para bandeja:** Minimiza o aplicativo para a bandeja do sistema ao invés de fechar
- **Modo do aplicativo:** Alterna entre modo pessoal e desenvolvedor

### Sobre o Aplicativo

Acesse o menu "Ajuda" → "Sobre" para informações sobre o aplicativo, versão e desenvolvedor.

## Atalhos

- **Ctrl + R:** Recarrega a aba ativa
- **Ctrl + F:** Abre a barra de busca
- **ESC:** Fecha modais e menus abertos
- **Botão direito:** Abre menu de contexto nas abas

## Testes

Para executar os testes automatizados:

```sh
npm test
```

## Desenvolvimento

### Arquitetura

O aplicativo utiliza Electron com uma arquitetura modular:

- **Main Process:** `main.js` e módulos em `modules/`
- **Renderer Process:** `index.html` e arquivos em `assets/js/`
- **Preload Scripts:** Scripts de segurança para comunicação entre processos

### Adicionando Novas IAs

Para adicionar uma nova IA, edite `assets/js/renderer.js`:

1. Adicione a configuração no objeto `tabConfigs`
2. Inclua o ID na lista apropriada (`personalTabs` ou `developerTabs`)
3. Adicione o ícone correspondente em `assets/icons/`

### Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## Problemas Comuns e Soluções

### Problemas de Login

Se estiver tendo problemas para fazer login em alguma IA:

1. Tente recarregar a aba (botão direito → Recarregar)
2. Se persistir, use a opção "Limpar cache do app" no menu Ajuda

### Performance

Se o aplicativo estiver lento:

1. Verifique se a opção "Manter abas ativas" está ativada (ela melhora a performance)
2. Reinicie o aplicativo

## Futuras Melhorias

- Suporte a múltiplas janelas (caso queira cada IA em uma janela separada)
- Exportar logs de conversas ou sessões com as IAs
- Adicionar abas dinâmicas com ícones customizados via drag-and-drop
- Histórico de conversas offline
- Temas personalizáveis

## Licença

Este projeto está sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido por [Alessandro Willian](https://github.com/awilliansd)**  
2026