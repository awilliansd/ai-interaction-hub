const {
  AUTH_PROVIDER_ROOTS,
  getRootHost,
  isAuthProviderHost,
  isTabSiteHost,
  normalizeConfig,
} = require('./webviewHelpers');

describe('webviewHelpers', () => {
  describe('getRootHost', () => {
    it('deve extrair o domínio raiz de um hostname comum', () => {
      expect(getRootHost('chat.deepseek.com')).toBe('deepseek.com');
    });

    it('deve remover o prefixo www', () => {
      expect(getRootHost('www.google.com')).toBe('google.com');
    });

    it('deve tratar hostname vazio ou ausente', () => {
      expect(getRootHost('')).toBe('');
      expect(getRootHost(undefined)).toBe('');
    });

    it('deve preservar domínios de segundo nível já curtos', () => {
      expect(getRootHost('example.com')).toBe('example.com');
    });
  });

  describe('isAuthProviderHost', () => {
    it('deve reconhecer provedores de autenticação conhecidos', () => {
      for (const root of AUTH_PROVIDER_ROOTS) {
        expect(isAuthProviderHost(root)).toBe(true);
        expect(isAuthProviderHost(`accounts.${root}`)).toBe(true);
        expect(isAuthProviderHost(`login.${root}`)).toBe(true);
      }
    });

    it('deve rejeitar hosts que não são provedores', () => {
      expect(isAuthProviderHost('chat.deepseek.com')).toBe(false);
      expect(isAuthProviderHost('example.org')).toBe(false);
      expect(isAuthProviderHost('')).toBe(false);
    });
  });

  describe('isTabSiteHost', () => {
    it('deve retornar true quando o host pertence ao site da aba', () => {
      expect(isTabSiteHost('chat.deepseek.com', 'https://chat.deepseek.com')).toBe(true);
      expect(isTabSiteHost('www.deepseek.com', 'https://chat.deepseek.com')).toBe(true);
    });

    it('deve retornar false para hosts de outro domínio', () => {
      expect(isTabSiteHost('google.com', 'https://chat.deepseek.com')).toBe(false);
    });

    it('deve retornar false quando a URL da aba é inválida', () => {
      expect(isTabSiteHost('example.com', 'não-é-uma-url')).toBe(false);
      expect(isTabSiteHost('example.com', undefined)).toBe(false);
    });
  });

  describe('normalizeConfig', () => {
    it('deve retornar a config mínima com partition padrão', () => {
      const config = normalizeConfig({ id: 'chatgpt', url: 'https://chat.openai.com' });
      expect(config).toEqual({
        id: 'chatgpt',
        url: 'https://chat.openai.com',
        label: 'chatgpt',
        partition: 'persist:chatgpt',
      });
    });

    it('deve usar label e partition fornecidos', () => {
      const config = normalizeConfig({
        id: 'x',
        url: 'https://x.com',
        label: 'X',
        partition: 'persist:x-work',
      });
      expect(config.label).toBe('X');
      expect(config.partition).toBe('persist:x-work');
    });

    it('deve incluir preload e userAgent quando presentes', () => {
      const config = normalizeConfig({
        id: 'a',
        url: 'https://a.com',
        preload: 'assets/js/p.js',
        userAgent: 'ua-string',
      });
      expect(config.preload).toBe('assets/js/p.js');
      expect(config.userAgent).toBe('ua-string');
    });

    it('não deve incluir chaves ausentes de preload/userAgent', () => {
      const config = normalizeConfig({ id: 'a', url: 'https://a.com' });
      expect(config.preload).toBeUndefined();
      expect(config.userAgent).toBeUndefined();
    });

    it('deve lançar erro para payload inválido', () => {
      expect(() => normalizeConfig(null)).toThrow('payload inválido');
      expect(() => normalizeConfig({})).toThrow('payload inválido');
      expect(() => normalizeConfig({ id: 'a' })).toThrow('payload inválido');
      expect(() => normalizeConfig({ url: 'https://a.com' })).toThrow('payload inválido');
    });
  });
});
