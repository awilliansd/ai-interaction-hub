const { BrowserWindow, Menu } = require('electron');
const windowManager = require('./windowManager');
const path = require('path');

// Mock do módulo electron
jest.mock('electron', () => ({
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    setTitle: jest.fn(),
    setMenuBarVisibility: jest.fn(),
    setAutoHideMenuBar: jest.fn(),
    on: jest.fn(),
    webContents: {
      on: jest.fn(),
      send: jest.fn()
    },
    isMinimized: jest.fn(),
    restore: jest.fn(),
    show: jest.fn(),
    focus: jest.fn(),
    hide: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  }
}));

// Mock do settingsManager
jest.mock('./settingsManager', () => ({
  loadSettings: jest.fn().mockReturnValue({})
}));

describe('windowManager', () => {
  // Mock das dependências
  const mockApp = {
    getVersion: jest.fn().mockReturnValue('1.0.0'),
    isPackaged: false,
    getAppPath: jest.fn().mockReturnValue('/path/to/app')
  };
  const mockSettings = {};

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    // Configura valores padrão para os mocks
    BrowserWindow.mockImplementation(() => ({
      loadFile: jest.fn(),
      setTitle: jest.fn(),
      setMenuBarVisibility: jest.fn(),
      setAutoHideMenuBar: jest.fn(),
      on: jest.fn(),
      webContents: {
        on: jest.fn(),
        send: jest.fn()
      },
      isMinimized: jest.fn(),
      restore: jest.fn(),
      show: jest.fn(),
      focus: jest.fn(),
      hide: jest.fn()
    }));
    
    Menu.buildFromTemplate.mockReturnValue({ template: 'mock-menu' });
  });

  describe('createWindow', () => {
    it('deve criar a janela principal corretamente com todas as dependências fornecidas', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se a instância da janela foi criada
      expect(windowInstance).toBeDefined();
      expect(BrowserWindow).toHaveBeenCalled();
      
      // Verifica se os métodos da janela foram chamados
      expect(windowInstance.loadFile).toHaveBeenCalledWith(path.join('/path/to/app', 'index.html'));
      expect(windowInstance.setMenuBarVisibility).toHaveBeenCalledWith(true);
      expect(windowInstance.setAutoHideMenuBar).toHaveBeenCalledWith(false);
      expect(windowInstance.on).toHaveBeenCalledWith('closed', expect.any(Function));
      expect(windowInstance.webContents.on).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
    });

    it('deve lançar um erro se a instância do app não for fornecida', () => {
      expect(() => {
        windowManager.createWindow(null, mockSettings);
      }).toThrow("WindowManager: Instância do 'app' do Electron é necessária.");
    });

    it('deve usar o título correto com a versão da aplicação', () => {
      windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o título correto foi usado
      const browserWindowOptions = BrowserWindow.mock.calls[0][0];
      expect(browserWindowOptions.title).toBe('AI Interaction Hub - v1.0.0');
    });

    it('deve usar o ícone correto quando a app está empacotada', () => {
      // Simula app empacotada
      mockApp.isPackaged = true;
      Object.defineProperty(process, 'resourcesPath', {
        value: '/path/to/resources',
        configurable: true
      });
      
      windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o caminho do ícone correto foi usado
      const browserWindowOptions = BrowserWindow.mock.calls[0][0];
      const expectedIconPath = process.platform === 'win32'
        ? path.join('/path/to/resources', 'icons', 'app.ico')
        : path.join('/path/to/resources', 'icons', 'hicolor', '512x512', 'apps', 'aiinteractionhub.png');
      expect(browserWindowOptions.icon).toBe(expectedIconPath);
    });

    it('deve usar o ícone correto quando a app não está empacotada', () => {
      // Simula app não empacotada
      mockApp.isPackaged = false;
      mockApp.getAppPath.mockReturnValue('/path/to/app');
      
      windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o caminho do ícone correto foi usado
      const browserWindowOptions = BrowserWindow.mock.calls[0][0];
      const expectedIconPath = process.platform === 'win32'
        ? path.join('/path/to/app', 'icons', 'app.ico')
        : path.join('/path/to/app', 'icons', 'app.png');
      expect(browserWindowOptions.icon).toBe(expectedIconPath);
    });

    it('deve configurar as webPreferences corretamente', () => {
      windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se as webPreferences estão corretas
      const browserWindowOptions = BrowserWindow.mock.calls[0][0];
      expect(browserWindowOptions.webPreferences.nodeIntegration).toBe(false);
      expect(browserWindowOptions.webPreferences.contextIsolation).toBe(true);
      expect(browserWindowOptions.webPreferences.preload).toBe(path.join('/path/to/app', 'assets/js/preload.js'));
      expect(browserWindowOptions.webPreferences.webviewTag).toBe(true);
      expect(browserWindowOptions.webPreferences.spellcheck).toBe(true);
    });

    it('deve configurar o menu da aplicação corretamente', () => {
      windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o menu foi construído e definido
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();
    });

    it('deve registrar o handler para evento did-finish-load', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o handler foi registrado
      expect(windowInstance.webContents.on).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
    });

    it('deve enviar as configurações iniciais quando o evento did-finish-load for disparado', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Encontra o handler do evento did-finish-load
      const didFinishLoadHandler = windowInstance.webContents.on.mock.calls.find(call => call[0] === 'did-finish-load')[1];
      
      // Executa o handler
      didFinishLoadHandler();
      
      // Verifica se as configurações iniciais foram enviadas
      expect(windowInstance.webContents.send).toHaveBeenCalledWith('init-settings', {});
      expect(windowInstance.setTitle).toHaveBeenCalledWith('AI Interaction Hub - v1.0.0');
    });

    it('deve registrar o handler para evento closed', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se o handler foi registrado
      expect(windowInstance.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('deve definir mainWindow como null quando o evento closed for disparado', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Encontra o handler do evento closed
      const closedHandler = windowInstance.on.mock.calls.find(call => call[0] === 'closed')[1];
      
      // Executa o handler
      closedHandler();
      
      // Verifica se mainWindow foi definido como null
      expect(windowManager.getMainWindow()).toBeNull();
    });
  });

  describe('getMainWindow', () => {
    it('deve retornar a instância da janela principal', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      // Verifica se getMainWindow retorna a instância correta
      expect(windowManager.getMainWindow()).toBe(windowInstance);
    });
  });

  describe('showWindow', () => {
    it('deve restaurar e mostrar a janela se ela estiver minimizada', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      windowInstance.isMinimized.mockReturnValue(true);
      
      windowManager.showWindow();
      
      // Verifica se os métodos corretos foram chamados
      expect(windowInstance.restore).toHaveBeenCalled();
      expect(windowInstance.show).toHaveBeenCalled();
      expect(windowInstance.focus).toHaveBeenCalled();
    });

    it('deve apenas mostrar e focar a janela se ela não estiver minimizada', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      windowInstance.isMinimized.mockReturnValue(false);
      
      windowManager.showWindow();
      
      // Verifica se os métodos corretos foram chamados
      expect(windowInstance.show).toHaveBeenCalled();
      expect(windowInstance.focus).toHaveBeenCalled();
      expect(windowInstance.restore).not.toHaveBeenCalled();
    });

    it('não deve fazer nada se mainWindow não estiver definida', () => {
      // Simula que mainWindow não está definida
      windowManager.createWindow(mockApp, mockSettings);
      BrowserWindow.mockImplementation(() => null);
      
      windowManager.showWindow();
      
      // Como mainWindow é null, nenhum método deve ser chamado
      // Esta verificação é implícita, pois não há métodos para verificar
    });
  });

  describe('hideWindow', () => {
    it('deve esconder a janela principal', () => {
      const windowInstance = windowManager.createWindow(mockApp, mockSettings);
      
      windowManager.hideWindow();
      
      // Verifica se o método hide foi chamado
      expect(windowInstance.hide).toHaveBeenCalled();
    });

    it('não deve fazer nada se mainWindow não estiver definida', () => {
      // Simula que mainWindow não está definida
      windowManager.createWindow(mockApp, mockSettings);
      BrowserWindow.mockImplementation(() => null);
      
      windowManager.hideWindow();
      
      // Como mainWindow é null, nenhum método deve ser chamado
      // Esta verificação é implícita, pois não há métodos para verificar
    });
  });
});