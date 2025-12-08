const settingsManager = require('./settingsManager');
const fs = require('fs');
const path = require('path');

// Mock do módulo 'fs'
jest.mock('fs');

describe('settingsManager', () => {
  // Mock da instância 'app' do Electron
  const mockApp = {
    getPath: jest.fn().mockReturnValue('/fake/userData/path'),
  };

  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
    // Reinicializa o estado do settingsManager se necessário (opcional, mas boa prática)
    // Para este módulo, a inicialização é o ponto chave, então vamos controlá-la nos testes.
  });

  describe('initialize', () => {
    it('deve definir o caminho das configurações corretamente', () => {
      settingsManager.initialize(mockApp);
      // Acessar a variável interna para teste é complexo, então vamos testar o efeito
      // indireto: salvar algo deve usar o caminho certo.
      const expectedPath = path.join(mockApp.getPath('userData'), 'settings.json');

      // Tentativa de salvar para verificar se o caminho foi usado
      fs.writeFileSync.mockClear(); // Limpa chamadas anteriores
      settingsManager.saveSettings({ test: 'data' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expectedPath,
        expect.any(String),
        'utf-8'
      );
    });

    it('deve lançar um erro se a instância do app não for fornecida', () => {
      expect(() => settingsManager.initialize(null)).toThrow(
        "SettingsManager: Instância do 'app' do Electron é necessária para inicialização."
      );
    });
  });

  describe('loadSettings', () => {
    beforeEach(() => {
      // Garante que o módulo está inicializado para os testes de load/save
      settingsManager.initialize(mockApp);
    });

    it('deve carregar e parsear o arquivo de configurações se ele existir', () => {
      const settings = { minimizeToTray: true };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(settings));

      const loadedSettings = settingsManager.loadSettings();
      expect(loadedSettings).toEqual(settings);
    });

    it('deve retornar as configurações padrão se o arquivo não existir', () => {
      fs.existsSync.mockReturnValue(false);

      const loadedSettings = settingsManager.loadSettings();
      expect(loadedSettings).toEqual({ minimizeToTray: false, keepTabsActive: false });
    });

    it('deve retornar as configurações padrão se ocorrer um erro de parse', () => {
      // 1. Criar um spy e silenciar o console.error original
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{"invalid json"');

      const loadedSettings = settingsManager.loadSettings();

      // Você pode até verificar se o console.error foi chamado
      expect(consoleErrorSpy).toHaveBeenCalled();

      // 2. Restaurar a função console.error original após o teste
      consoleErrorSpy.mockRestore();

      // Lembre-se de usar a correção do objeto padrão aqui também:
      expect(loadedSettings).toEqual({ minimizeToTray: false, keepTabsActive: false });
    });
  });

  describe('saveSettings', () => {
    beforeEach(() => {
      settingsManager.initialize(mockApp);
    });

    it('deve salvar as configurações no arquivo correto', () => {
      const settings = { minimizeToTray: true, anotherSetting: 'value' };
      const expectedPath = path.join(mockApp.getPath('userData'), 'settings.json');

      settingsManager.saveSettings(settings);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expectedPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
    });
  });
});
