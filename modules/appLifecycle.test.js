const appLifecycle = require('./appLifecycle');
const { app } = require('electron');

// Mock do módulo 'electron'
jest.mock('electron', () => ({
  app: {
    on: jest.fn(),
    quit: jest.fn(),
    getPath: jest.fn()
  }
}));

describe('appLifecycle', () => {
  // Mock das dependências
  const mockCreateWindowFunction = jest.fn();
  const mockSettingsManager = {
    loadSettings: jest.fn()
  };

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('initializeAppLifecycle', () => {
    it('deve inicializar corretamente com todas as dependências fornecidas', () => {
      const mockApp = {
        on: jest.fn(),
        quit: jest.fn()
      };

      expect(() => {
        appLifecycle.initializeAppLifecycle(mockApp, mockCreateWindowFunction, mockSettingsManager);
      }).not.toThrow();

      // Verifica se os listeners de eventos foram registrados
      expect(mockApp.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
      expect(mockApp.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });

    it('deve lançar um erro se alguma dependência não for fornecida', () => {
      expect(() => {
        appLifecycle.initializeAppLifecycle(null, mockCreateWindowFunction, mockSettingsManager);
      }).toThrow("AppLifecycle: Dependências (app, createWindow, settingsManager) são necessárias.");

      expect(() => {
        appLifecycle.initializeAppLifecycle({}, null, mockSettingsManager);
      }).toThrow("AppLifecycle: Dependências (app, createWindow, settingsManager) são necessárias.");

      expect(() => {
        appLifecycle.initializeAppLifecycle({}, mockCreateWindowFunction, null);
      }).toThrow("AppLifecycle: Dependências (app, createWindow, settingsManager) são necessárias.");
    });

    it('deve registrar o listener para window-all-closed e chamar app.quit() quando não estiver no macOS', () => {
      const mockApp = {
        on: jest.fn(),
        quit: jest.fn()
      };

      // Simula plataforma diferente de macOS
      Object.defineProperty(process, 'platform', {
        value: 'win32'
      });

      appLifecycle.initializeAppLifecycle(mockApp, mockCreateWindowFunction, mockSettingsManager);

      // Verifica se o listener foi registrado
      const windowAllClosedCallback = mockApp.on.mock.calls.find(call => call[0] === 'window-all-closed')[1];
      expect(windowAllClosedCallback).toBeDefined();

      // Executa o callback e verifica se app.quit() foi chamado
      windowAllClosedCallback();
      expect(mockApp.quit).toHaveBeenCalled();
    });

    it('não deve chamar app.quit() no evento window-all-closed quando estiver no macOS', () => {
      const mockApp = {
        on: jest.fn(),
        quit: jest.fn()
      };

      // Simula macOS
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });

      appLifecycle.initializeAppLifecycle(mockApp, mockCreateWindowFunction, mockSettingsManager);

      // Verifica se o listener foi registrado
      const windowAllClosedCallback = mockApp.on.mock.calls.find(call => call[0] === 'window-all-closed')[1];
      expect(windowAllClosedCallback).toBeDefined();

      // Executa o callback e verifica que app.quit() NÃO foi chamado
      windowAllClosedCallback();
      expect(mockApp.quit).not.toHaveBeenCalled();
    });

    it('deve registrar o listener para before-quit e definir isQuiting como true', () => {
      const mockApp = {
        on: jest.fn(),
        quit: jest.fn()
      };

      appLifecycle.initializeAppLifecycle(mockApp, mockCreateWindowFunction, mockSettingsManager);

      // Verifica se o listener foi registrado
      const beforeQuitCallback = mockApp.on.mock.calls.find(call => call[0] === 'before-quit')[1];
      expect(beforeQuitCallback).toBeDefined();

      // Executa o callback e verifica se isQuiting foi definido como true
      beforeQuitCallback();
      
      // Verifica se o valor foi definido corretamente
      expect(appLifecycle.getIsQuiting()).toBe(true);
    });
  });

  describe('setIsQuiting and getIsQuiting', () => {
    beforeEach(() => {
      // Resetar o estado entre testes
      appLifecycle.setIsQuiting(false);
    });

    it('deve definir isQuiting como true quando chamado com true', () => {
      appLifecycle.setIsQuiting(true);
      expect(appLifecycle.getIsQuiting()).toBe(true);
    });

    it('deve definir isQuiting como false quando chamado com false', () => {
      appLifecycle.setIsQuiting(true); // Primeiro define como true
      appLifecycle.setIsQuiting(false); // Depois define como false
      expect(appLifecycle.getIsQuiting()).toBe(false);
    });

    it('deve converter valores truthy para true', () => {
      appLifecycle.setIsQuiting(1);
      expect(appLifecycle.getIsQuiting()).toBe(true);

      appLifecycle.setIsQuiting("string");
      expect(appLifecycle.getIsQuiting()).toBe(true);
    });

    it('deve converter valores falsy para false', () => {
      appLifecycle.setIsQuiting(0);
      expect(appLifecycle.getIsQuiting()).toBe(false);

      appLifecycle.setIsQuiting("");
      expect(appLifecycle.getIsQuiting()).toBe(false);

      appLifecycle.setIsQuiting(null);
      expect(appLifecycle.getIsQuiting()).toBe(false);

      appLifecycle.setIsQuiting(undefined);
      expect(appLifecycle.getIsQuiting()).toBe(false);
    });
  });
});