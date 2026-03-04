const { ipcMain, shell } = require('electron');
const ipcHandlers = require('./ipcHandlers');

// Mock do módulo electron
jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn(),
    removeHandler: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  }
}));

// Mock dos módulos internos
jest.mock('./windowManager', () => ({
  getMainWindow: jest.fn()
}));

jest.mock('./appLifecycle', () => ({
  setIsQuiting: jest.fn()
}));

describe('ipcHandlers', () => {
  // Mock das dependências
  const mockMainWindow = {
    webContents: {
      send: jest.fn(),
      session: {
        clearCache: jest.fn(),
        clearStorageData: jest.fn()
      }
    },
    reload: jest.fn()
  };
  const mockApp = {
    quit: jest.fn(),
    getVersion: jest.fn().mockReturnValue('1.0.0')
  };
  const mockSettingsManager = {
    loadSettings: jest.fn(),
    saveSettings: jest.fn()
  };

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    // Configura valores padrão para os mocks
    require('./windowManager').getMainWindow.mockReturnValue(mockMainWindow);
    mockApp.getVersion.mockReturnValue('1.0.0');
    mockSettingsManager.loadSettings.mockReturnValue({});
  });

  describe('initializeIpcHandlers', () => {
    it('deve inicializar corretamente com todas as dependências fornecidas', () => {
      expect(() => {
        ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);
      }).not.toThrow();
    });

    it('deve registrar handlers para eventos IPC', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Verifica se os handlers foram registrados
      expect(ipcMain.on).toHaveBeenCalledWith('reload-tab', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('exit-app', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('open-github', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('set-minimize-to-tray', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('set-keep-tabs-active', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('app:close', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('clear-app-cache', expect.any(Function));
      
      expect(ipcMain.handle).toHaveBeenCalledWith('get-app-version', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('get-settings', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('save-settings', expect.any(Function));
      
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('get-app-version');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('get-settings');
      expect(ipcMain.removeHandler).toHaveBeenCalledWith('save-settings');
    });

    it('deve registrar o handler para reload-tab e enviar mensagem para a janela', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'reload-tab'
      const reloadTabHandler = ipcMain.on.mock.calls.find(call => call[0] === 'reload-tab')[1];
      
      // Executa o handler com um tabId de exemplo
      const tabId = 'tab-1';
      reloadTabHandler({}, tabId);
      
      // Verifica se a mensagem foi enviada para a janela
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('reload-tab', tabId);
    });

    it('deve registrar o handler para exit-app e chamar app.quit()', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'exit-app'
      const exitAppHandler = ipcMain.on.mock.calls.find(call => call[0] === 'exit-app')[1];
      
      // Executa o handler
      exitAppHandler();
      
      // Verifica se app.quit() foi chamado
      expect(mockApp.quit).toHaveBeenCalled();
      // Verifica se setIsQuiting foi chamado com true
      expect(require('./appLifecycle').setIsQuiting).toHaveBeenCalledWith(true);
    });

    it('deve registrar o handler para open-github e abrir o link externo', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'open-github'
      const openGithubHandler = ipcMain.on.mock.calls.find(call => call[0] === 'open-github')[1];
      
      // Executa o handler
      openGithubHandler();
      
      // Verifica se o link externo foi aberto
      expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/awilliansd');
    });

    it('deve registrar o handler para set-minimize-to-tray e salvar as configurações', () => {
      const settings = { minimizeToTray: false };
      mockSettingsManager.loadSettings.mockReturnValue(settings);
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'set-minimize-to-tray'
      const setMinimizeToTrayHandler = ipcMain.on.mock.calls.find(call => call[0] === 'set-minimize-to-tray')[1];
      
      // Executa o handler com um valor de exemplo
      const newValue = true;
      setMinimizeToTrayHandler({}, newValue);
      
      // Verifica se as configurações foram carregadas e salvas corretamente
      expect(mockSettingsManager.loadSettings).toHaveBeenCalled();
      expect(settings.minimizeToTray).toBe(newValue);
      expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith(settings);
    });

    it('deve registrar o handler para set-keep-tabs-active e salvar as configurações', () => {
      const settings = { keepTabsActive: false };
      mockSettingsManager.loadSettings.mockReturnValue(settings);
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'set-keep-tabs-active'
      const setKeepTabsActiveHandler = ipcMain.on.mock.calls.find(call => call[0] === 'set-keep-tabs-active')[1];
      
      // Executa o handler com um valor de exemplo
      const newValue = true;
      setKeepTabsActiveHandler({}, newValue);
      
      // Verifica se as configurações foram carregadas e salvas corretamente
      expect(mockSettingsManager.loadSettings).toHaveBeenCalled();
      expect(settings.keepTabsActive).toBe(newValue);
      expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith(settings);
    });

    it('deve registrar o handler para app:close e chamar app.quit()', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'app:close'
      const appCloseHandler = ipcMain.on.mock.calls.find(call => call[0] === 'app:close')[1];
      
      // Executa o handler
      appCloseHandler();
      
      // Verifica se app.quit() foi chamado
      expect(mockApp.quit).toHaveBeenCalled();
      // Verifica se setIsQuiting foi chamado com true
      expect(require('./appLifecycle').setIsQuiting).toHaveBeenCalledWith(true);
    });

    it('deve registrar o handler para get-app-version e retornar a versão correta', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'get-app-version'
      const getAppVersionHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'get-app-version')[1];
      
      // Executa o handler
      const result = getAppVersionHandler();
      
      // Verifica se a versão correta foi retornada
      expect(result).toBe('1.0.0');
      expect(mockApp.getVersion).toHaveBeenCalled();
    });

    it('deve registrar o handler para get-app-version e retornar "N/A" em caso de erro', () => {
      // Simula um erro ao obter a versão
      mockApp.getVersion.mockImplementationOnce(() => {
        throw new Error('Erro ao obter versão');
      });
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'get-app-version'
      const getAppVersionHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'get-app-version')[1];
      
      // Executa o handler
      const result = getAppVersionHandler();
      
      // Verifica se "N/A" foi retornado em caso de erro
      expect(result).toBe('N/A');
    });

    it('deve registrar o handler para get-settings e retornar as configurações', () => {
      const settings = { theme: 'dark', language: 'pt-BR' };
      mockSettingsManager.loadSettings.mockReturnValue(settings);
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'get-settings'
      const getSettingsHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'get-settings')[1];
      
      // Executa o handler
      const result = getSettingsHandler();
      
      // Verifica se as configurações corretas foram retornadas
      expect(result).toEqual(settings);
      expect(mockSettingsManager.loadSettings).toHaveBeenCalled();
    });

    it('deve registrar o handler para save-settings e salvar as configurações', () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'save-settings'
      const saveSettingsHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'save-settings')[1];
      
      // Executa o handler com configurações de exemplo
      const settings = { theme: 'light', language: 'en-US' };
      const result = saveSettingsHandler({}, settings);
      
      // Verifica se as configurações foram salvas e o resultado é verdadeiro
      expect(mockSettingsManager.saveSettings).toHaveBeenCalledWith(settings);
      expect(result).toBe(true);
    });

    it('deve registrar o handler para clear-app-cache e limpar o cache', async () => {
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'clear-app-cache'
      const clearAppCacheHandler = ipcMain.on.mock.calls.find(call => call[0] === 'clear-app-cache')[1];
      
      // Executa o handler
      await clearAppCacheHandler();
      
      // Verifica se o cache foi limpo
      expect(mockMainWindow.webContents.session.clearCache).toHaveBeenCalled();
      expect(mockMainWindow.webContents.session.clearStorageData).toHaveBeenCalled();
      expect(mockMainWindow.reload).toHaveBeenCalled();
    });

    it('deve mostrar um aviso se mainWindow não estiver definida no handler reload-tab', () => {
      // Simula que mainWindow não está definida
      require('./windowManager').getMainWindow.mockReturnValueOnce(null);
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, mockSettingsManager);

      // Encontra o handler registrado para 'reload-tab'
      const reloadTabHandler = ipcMain.on.mock.calls.find(call => call[0] === 'reload-tab')[1];
      
      // Espiona console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Executa o handler
      reloadTabHandler({}, 'tab-1');
      
      // Verifica se o aviso foi mostrado
      expect(consoleWarnSpy).toHaveBeenCalledWith('IPC reload-tab: Janela principal não encontrada.');
      
      // Restaura console.warn
      consoleWarnSpy.mockRestore();
    });

    it('deve registrar handlers mesmo se mainWindow não for fornecida', () => {
      expect(() => {
        ipcHandlers.initializeIpcHandlers(null, mockApp, mockSettingsManager);
      }).not.toThrow();
      
      // Verifica se os handlers ainda foram registrados
      expect(ipcMain.on).toHaveBeenCalledWith('reload-tab', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('exit-app', expect.any(Function));
      expect(ipcMain.on).toHaveBeenCalledWith('open-github', expect.any(Function));
    });

    it('deve mostrar erro se app não for fornecido', () => {
      // Espiona console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, null, mockSettingsManager);
      
      // Verifica se o erro foi mostrado
      expect(consoleErrorSpy).toHaveBeenCalledWith("IPC Handlers: Instância do 'app' não fornecida.");
      
      // Restaura console.error
      consoleErrorSpy.mockRestore();
    });

    it('deve mostrar erro se settingsManager não for fornecido', () => {
      // Espiona console.error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      ipcHandlers.initializeIpcHandlers(mockMainWindow, mockApp, null);
      
      // Verifica se o erro foi mostrado
      expect(consoleErrorSpy).toHaveBeenCalledWith("IPC Handlers: settingsManager não fornecido.");
      
      // Restaura console.error
      consoleErrorSpy.mockRestore();
    });
  });
});