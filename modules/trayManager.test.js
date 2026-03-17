const { Tray, Menu } = require('electron');
const trayManager = require('./trayManager');
const path = require('path');
const fs = require('fs');

// Mock do módulo electron
jest.mock('electron', () => ({
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn()
  })),
  Menu: {
    buildFromTemplate: jest.fn()
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn()
}));

// Mock dos módulos internos
jest.mock('./windowManager', () => ({
  showWindow: jest.fn()
}));

jest.mock('./appLifecycle', () => ({
  setIsQuiting: jest.fn()
}));

describe('trayManager', () => {
  // Mock das dependências
  const mockApp = {
    isPackaged: false,
    getAppPath: jest.fn().mockReturnValue('/path/to/app'),
    quit: jest.fn()
  };
  const mockMainWindow = {};
  const mockSettingsManager = {};

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    
    // Configura valores padrão para os mocks
    Tray.mockImplementation(() => ({
      setToolTip: jest.fn(),
      setContextMenu: jest.fn(),
      on: jest.fn()
    }));
    
    Menu.buildFromTemplate.mockReturnValue({ template: 'mock-menu' });
  });

  describe('createTray', () => {
    it('deve criar a bandeja corretamente com todas as dependências fornecidas', () => {
      const trayInstance = trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se a instância da bandeja foi criada
      expect(trayInstance).toBeDefined();
      expect(Tray).toHaveBeenCalled();
      
      // Verifica se os métodos da bandeja foram chamados
      expect(trayInstance.setToolTip).toHaveBeenCalledWith('AI Interaction Hub');
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(trayInstance.setContextMenu).toHaveBeenCalled();
      expect(trayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('deve lançar um erro se a instância do app não for fornecida', () => {
      expect(() => {
        trayManager.createTray(null, mockMainWindow, mockSettingsManager);
      }).toThrow("TrayManager: Instância do 'app' do Electron é necessária.");
    });

    it('deve mostrar um aviso se mainWindow não for fornecida', () => {
      // Espiona console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      trayManager.createTray(mockApp, null, mockSettingsManager);
      
      // Verifica se o aviso foi mostrado
      expect(consoleWarnSpy).toHaveBeenCalledWith("TrayManager: mainWindow não fornecida na criação da bandeja.");
      
      // Restaura console.warn
      consoleWarnSpy.mockRestore();
    });

    it('deve usar o ícone correto quando a app está empacotada', () => {
      // Simula app empacotada
      mockApp.isPackaged = true;
      Object.defineProperty(process, 'resourcesPath', {
        value: '/path/to/resources',
        configurable: true
      });
      
      trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se o caminho do ícone correto foi usado
      const expectedIconPath = process.platform === 'win32'
        ? path.join('/path/to/resources', 'icons', 'app.ico')
        : path.join('/path/to/resources', 'icons', 'hicolor', '512x512', 'apps', 'aiinteractionhub.png');
      expect(Tray).toHaveBeenCalledWith(expectedIconPath);
    });

    it('deve usar o ícone correto quando a app não está empacotada', () => {
      // Simula app não empacotada
      mockApp.isPackaged = false;
      mockApp.getAppPath.mockReturnValue('/path/to/app');
      
      trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se o caminho do ícone correto foi usado
      const expectedIconPath = process.platform === 'win32'
        ? path.join('/path/to/app', 'icons', 'app.ico')
        : path.join('/path/to/app', 'icons', 'app.png');
      expect(Tray).toHaveBeenCalledWith(expectedIconPath);
    });

    it('deve retornar null se não conseguir criar a bandeja', () => {
      // Simula falhas ao criar a bandeja
      Tray.mockImplementation(() => {
        throw new Error('Erro ao carregar ícone');
      });
      
      const trayInstance = trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se null foi retornado
      expect(trayInstance).toBeNull();
    });

    it('deve configurar o menu de contexto corretamente', () => {
      trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se o menu foi construído com o template correto
      expect(Menu.buildFromTemplate).toHaveBeenCalledWith([
        {
          label: "Mostrar",
          click: expect.any(Function)
        },
        {
          label: "Sair",
          click: expect.any(Function)
        }
      ]);
    });

    it('deve registrar o handler para clique na bandeja', () => {
      const trayInstance = trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Verifica se o handler de clique foi registrado
      expect(trayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('deve chamar showWindow quando o item "Mostrar" do menu for clicado', () => {
      trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Encontra o handler do item "Mostrar" do menu
      const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
      const mostrarItem = menuTemplate.find(item => item.label === "Mostrar");
      
      // Executa o handler
      mostrarItem.click();
      
      // Verifica se showWindow foi chamado
      expect(require('./windowManager').showWindow).toHaveBeenCalled();
    });

    it('deve chamar app.quit quando o item "Sair" do menu for clicado', () => {
      trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Encontra o handler do item "Sair" do menu
      const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
      const sairItem = menuTemplate.find(item => item.label === "Sair");
      
      // Executa o handler
      sairItem.click();
      
      // Verifica se setIsQuiting foi chamado com true e app.quit foi chamado
      expect(require('./appLifecycle').setIsQuiting).toHaveBeenCalledWith(true);
      expect(mockApp.quit).toHaveBeenCalled();
    });

    it('deve chamar showWindow quando a bandeja for clicada', () => {
      const trayInstance = trayManager.createTray(mockApp, mockMainWindow, mockSettingsManager);
      
      // Encontra o handler de clique na bandeja
      const clickHandler = trayInstance.on.mock.calls.find(call => call[0] === 'click')[1];
      
      // Executa o handler
      clickHandler();
      
      // Verifica se showWindow foi chamado
      expect(require('./windowManager').showWindow).toHaveBeenCalled();
    });
  });
});
