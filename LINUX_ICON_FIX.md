# Correção de Ícones no Linux

## Problema Identificado

O aplicativo estava exibindo apenas o ícone no system tray, mas não na barra de tarefas e menu de aplicativos do Linux. Isso ocorria porque:

1. A configuração do `electron-builder` não estava apontando para a estrutura correta de ícones
2. O arquivo `.desktop` não estava configurado com o `StartupWMClass` correto
3. O título da janela não estava explicitamente definido no BrowserWindow

## Alterações Realizadas

### 1. package.json
- Alterado `build.linux.icon` para apontar para o arquivo PNG de maior resolução: `"icons/hicolor/512x512/apps/aiinteractionhub.png"`
- Adicionado configuração `desktop.entry.StartupWMClass` como `"AI Interaction Hub"` para corresponder ao título da janela
- Adicionado `executableName` e `maintainer`
- Configurado `category` como `"Network"`
- **IMPORTANTE**: O `StartupWMClass` deve estar dentro de `desktop.entry`, não diretamente em `desktop`

### 2. build/linux/aiinteractionhub.desktop
- Atualizado `StartupWMClass` para `"AI Interaction Hub"` (corresponde ao título da janela)
- Adicionado `Version=1.0`
- Adicionado `StartupNotify=true` para feedback visual ao iniciar
- Adicionado `Keywords` para melhor indexação no menu
- Adicionado `MimeType` para registro de protocolo

### 3. modules/windowManager.js
- Adicionado `title: "AI Interaction Hub"` no BrowserWindow
- Isso garante que o WM_CLASS corresponda ao StartupWMClass do arquivo .desktop

## Como Testar

### 1. Limpar builds anteriores
```bash
rm -rf dist/
```

### 2. Gerar novos ícones (se necessário)
```bash
npm run generate-icons
```

### 3. Fazer o build para Linux
```bash
npm run dist
```

### 4. Instalar o pacote .deb (ou executar o AppImage)
```bash
# Para .deb
sudo dpkg -i dist/ai-interaction-hub_1.0.24_amd64.deb

# OU para AppImage
chmod +x dist/AI\ Interaction\ Hub-1.0.24.AppImage
./dist/AI\ Interaction\ Hub-1.0.24.AppImage
```

### 5. Verificar a instalação
```bash
# Verificar se o arquivo .desktop foi instalado
ls -la /usr/share/applications/ | grep aiinteractionhub

# Verificar se os ícones foram instalados
ls -la /usr/share/icons/hicolor/*/apps/ | grep aiinteractionhub

# Verificar o WM_CLASS da janela (com o app rodando)
xprop WM_CLASS
# Clique na janela do aplicativo e veja se retorna: "AI Interaction Hub", "AI Interaction Hub"
```

### 6. Testar os ícones
- Abra o menu de aplicativos do seu sistema (GNOME, KDE, etc.)
- Procure por "AI Interaction Hub"
- Verifique se o ícone personalizado aparece
- Inicie o aplicativo
- Verifique se o ícone aparece na barra de tarefas
- Minimize para o system tray e verifique se o ícone continua correto

## Notas Importantes

### StartupWMClass
O `StartupWMClass` no arquivo `.desktop` deve corresponder exatamente ao WM_CLASS da janela. O Electron define o WM_CLASS baseado no:
1. Primeiro: propriedade `title` do BrowserWindow
2. Se não houver título: usa o `productName` do package.json
3. Como último recurso: usa o nome do executável

Por isso definimos explicitamente `title: "AI Interaction Hub"` no windowManager.js.

### Estrutura de Ícones
O Linux espera ícones em múltiplas resoluções na estrutura:
```
icons/hicolor/
  128x128/apps/aiinteractionhub.png
  256x256/apps/aiinteractionhub.png
  512x512/apps/aiinteractionhub.png
```

O electron-builder automaticamente copia essa estrutura para `/usr/share/icons/hicolor/` durante a instalação.

### AppImage vs .deb
- **AppImage**: Não instala ícones no sistema, mas deve mostrar o ícone na barra de tarefas quando executado
- **.deb**: Instala os ícones em `/usr/share/icons/` e o arquivo `.desktop` em `/usr/share/applications/`

## Troubleshooting

Se os ícones ainda não aparecerem após a instalação:

1. **Atualizar cache de ícones**:
```bash
sudo update-icon-caches /usr/share/icons/*
sudo gtk-update-icon-cache /usr/share/icons/hicolor/
```

2. **Atualizar banco de dados de aplicativos**:
```bash
sudo update-desktop-database /usr/share/applications/
```

3. **Reiniciar o ambiente gráfico**:
```bash
# Para GNOME
killall -SIGQUIT gnome-shell

# Para KDE
kquitapp5 plasmashell && kstart5 plasmashell
```

4. **Verificar logs do electron-builder**:
```bash
DEBUG=electron-builder npm run dist
```

## Referências
- [Electron Builder - Linux Configuration](https://www.electron.build/configuration/linux)
- [Desktop Entry Specification](https://specifications.freedesktop.org/desktop-entry-spec/desktop-entry-spec-latest.html)
- [Icon Theme Specification](https://specifications.freedesktop.org/icon-theme-spec/icon-theme-spec-latest.html)
