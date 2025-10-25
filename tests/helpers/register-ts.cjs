const { readFileSync } = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

let registered = false;

function compile(module, filename) {
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
}

function registerExtension(extension) {
  const original = require.extensions[extension];
  require.extensions[extension] = (module, filename) => {
    compile(module, filename);
    return module;
  };
  return original;
}

function register() {
  if (registered) {
    return;
  }
  registered = true;

  const originalExtensions = {
    '.ts': registerExtension('.ts'),
    '.tsx': registerExtension('.tsx'),
  };

  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
    if (request.startsWith('@/')) {
      const resolved = path.join(process.cwd(), 'src', request.slice(2));
      return originalResolveFilename.call(this, resolved, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  const nextServerStub = require(path.join(__dirname, 'next-server-stub.cjs'));
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (global.__MODULE_MOCKS__ && Object.prototype.hasOwnProperty.call(global.__MODULE_MOCKS__, request)) {
      return global.__MODULE_MOCKS__[request];
    }
    if (request === 'next/server') {
      return nextServerStub;
    }
    if (request.endsWith('/useTossPayments') && global.__USE_TOSS_PAYMENTS_MOCK__) {
      return global.__USE_TOSS_PAYMENTS_MOCK__;
    }
    return originalLoad.apply(this, arguments);
  };

  process.once('exit', () => {
    if (originalExtensions['.ts']) {
      require.extensions['.ts'] = originalExtensions['.ts'];
    }
    if (originalExtensions['.tsx']) {
      require.extensions['.tsx'] = originalExtensions['.tsx'];
    }
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  });
}

module.exports = { register };
