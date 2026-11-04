// Expo's Metro config understands pnpm workspaces. Workspace packages ship
// TypeScript source with NodeNext-style ".js" import specifiers, so map those
// to the ".ts" files that actually exist.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (moduleName.startsWith('.') && moduleName.endsWith('.js') && context.originModulePath.includes('/packages/')) {
    try {
      return resolve(context, moduleName.replace(/\.js$/, '.ts'), platform);
    } catch {
      /* fall through to the original specifier */
    }
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
