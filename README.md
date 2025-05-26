<p align="center">
  <img src="icons/aiinteractionhub-dark.png" alt="Descrição da imagem">
</p>

# AI Interaction Hub 
Projeto que fiz para ser um hub de IA, as que eu mais utilizo em um lugar só. Tomei como base o Ferdium para criar essa aplicação

É necessário para começar emular a aplicação na máquina local, deve executar esse comando para instalar o electron e suas dependências: npm install electron --save-dev

Para iniciar a aplicação para teste: npm start

Para gerar um executável com o instalador: npm install --save-dev electron-builder e depois utilize o npm run dist para gerar a distribuição

Chat GPT
![Chat GPT](assets/images/Screenshot1.png)

Claude


![Claude](assets/images/Screenshot2.png)


# AI Interaction Hub

![AI Interaction Hub Logo](icons/aiinteractionhub-dark.png)

**AI Interaction Hub** é um aplicativo desktop que reúne, em uma única interface, os principais assistentes de IA do mercado, facilitando o acesso e a organização das suas conversas.

## Funcionalidades

- Interface unificada para múltiplos chats de IA:
  - ChatGPT
  - Claude
  - Microsoft Copilot
  - DeepSeek
  - Gemini
  - Grok
  - Meta AI
  - Manus
- Alternância rápida entre assistentes via barra lateral
- Suporte a múltiplas abas e duplicação de sessões
- Menu de contexto com opções de recarregar, fechar e duplicar abas
- Minimizar para a bandeja do sistema (tray)
- Modal de configurações e atalho para informações sobre o app
- Atalhos de teclado para recarregar abas e fechar modais

## Instalação

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

4. **Para gerar o instalador (Windows):**
   ```sh
   npm run dist
   ```
   O instalador será gerado na pasta `dist/`.

## Estrutura do Projeto

```
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── icons/
│   ├── images/
│   └── js/
│       └── renderer.js
├── icons/
├── index.html
├── main.js
├── preload.js
├── package.json
└── README.md
```

## Como Usar

- **Alternar entre IAs:** Use a barra lateral esquerda para escolher o assistente desejado.
- **Menu de contexto:** Clique com o botão direito sobre o ícone de uma IA para acessar opções como recarregar, fechar ou duplicar a aba.
- **Configurações:** Clique no ícone de engrenagem para abrir o modal de configurações e ativar/desativar a opção de minimizar para a bandeja.
- **Sobre:** Acesse o menu "Ajuda" para informações sobre o aplicativo e o desenvolvedor.

## Atalhos

- **Ctrl + R:** Recarrega a aba ativa
- **ESC:** Fecha modais e menus abertos
- **Botão direito:** Abre menu de contexto nas abas

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença

Este projeto está sob a licença MIT.


🔄 Futuras Melhorias
- Suporte a múltiplas janelas (caso queira cada IA em uma janela separada).
- Exportar logs de conversas ou sessões com as IAs.
- Adicionar abas dinâmicas com ícones customizados via drag-and-drop.


---

**Desenvolvido por [Alessandro Willian](https://github.com/awilliansd)**  
2025
