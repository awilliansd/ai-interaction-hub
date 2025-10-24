module.exports = {
  // O ambiente de teste que será usado para o teste
  testEnvironment: 'node',

  // O padrão ou padrões que o Jest usa para detectar arquivos de teste
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js$',

  // Uma matriz de caminhos de diretório a serem pesquisados em busca de arquivos
  roots: [
    '<rootDir>/modules'
  ],

  // Ignora a pasta de build do electron-builder
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
