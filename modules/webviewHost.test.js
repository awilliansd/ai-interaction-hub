const { session } = require('electron');

jest.mock('electron', () => ({
  WebContentsView: jest.fn(),
  Menu: jest.fn().mockImplementation(() => ({ append: jest.fn(), popup: jest.fn() })),
  MenuItem: jest.fn(),
  session: {
    fromPartition: jest.fn(),
  },
  app: {
    getAppPath: jest.fn().mockReturnValue('/app'),
  },
}));

jest.mock('electron-log', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

const webviewHost = require('./webviewHost');

function makeSessionMock() {
  return {
    clearCache: jest.fn().mockResolvedValue(undefined),
    clearStorageData: jest.fn().mockResolvedValue(undefined),
    setPermissionRequestHandler: jest.fn(),
    webRequest: { onBeforeSendHeaders: jest.fn() },
  };
}

describe('webviewHost - cache de partições', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clearAllPartitions limpa cada partição informada', async () => {
    const sesA = makeSessionMock();
    const sesB = makeSessionMock();
    session.fromPartition.mockImplementation((partition) => {
      if (partition === 'persist:a') return sesA;
      if (partition === 'persist:b') return sesB;
      return makeSessionMock();
    });

    await webviewHost.clearAllPartitions(['persist:a', 'persist:b']);

    expect(session.fromPartition).toHaveBeenCalledWith('persist:a');
    expect(session.fromPartition).toHaveBeenCalledWith('persist:b');
    expect(sesA.clearCache).toHaveBeenCalled();
    expect(sesA.clearStorageData).toHaveBeenCalled();
    expect(sesB.clearCache).toHaveBeenCalled();
    expect(sesB.clearStorageData).toHaveBeenCalled();
  });

  it('clearAllPartitions sem lista usa a partição default', async () => {
    const sesDefault = makeSessionMock();
    session.fromPartition.mockReturnValue(sesDefault);

    await webviewHost.clearAllPartitions([]);

    expect(session.fromPartition).toHaveBeenCalledWith('default');
    expect(sesDefault.clearCache).toHaveBeenCalled();
    expect(sesDefault.clearStorageData).toHaveBeenCalled();
  });

  it('clearAllPartitions não propaga erro de uma partição', async () => {
    const badSes = makeSessionMock();
    const goodSes = makeSessionMock();
    badSes.clearCache.mockRejectedValue(new Error('falha'));
    session.fromPartition.mockImplementation((partition) =>
      partition === 'persist:bad' ? badSes : goodSes
    );

    await expect(
      webviewHost.clearAllPartitions(['persist:bad', 'persist:good'])
    ).resolves.toBeUndefined();

    expect(goodSes.clearCache).toHaveBeenCalled();
  });

  it('exports a API pública esperada', () => {
    expect(typeof webviewHost.initializeHost).toBe('function');
    expect(typeof webviewHost.showTab).toBe('function');
    expect(typeof webviewHost.reloadTab).toBe('function');
    expect(typeof webviewHost.recreateTab).toBe('function');
    expect(typeof webviewHost.destroyTab).toBe('function');
    expect(typeof webviewHost.destroyAllTabs).toBe('function');
    expect(typeof webviewHost.setOverlay).toBe('function');
    expect(typeof webviewHost.setKeepTabsActive).toBe('function');
    expect(typeof webviewHost.findOpen).toBe('function');
    expect(typeof webviewHost.findInput).toBe('function');
    expect(typeof webviewHost.findNext).toBe('function');
    expect(typeof webviewHost.findClose).toBe('function');
    expect(typeof webviewHost.clearTabCache).toBe('function');
    expect(typeof webviewHost.clearAllPartitions).toBe('function');
    expect(webviewHost.ACCEPT_LANGUAGE_PT_BR).toContain('pt-BR');
  });
});
