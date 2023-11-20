import { DebugLogger } from '@affine/debug';
import type {
  CallbackMap,
  ExpectedLayout,
  LayoutNode,
  PluginContext,
} from '@affine/sdk/entry';
import { AffineFormatBarWidget } from '@blocksuite/blocks';
import { assertExists } from '@blocksuite/global/utils';
import {
  addCleanup,
  pluginEditorAtom,
  pluginHeaderItemAtom,
  pluginSettingAtom,
  pluginWindowAtom,
} from '@toeverything/infra/__internal__/plugin';
import {
  contentLayoutAtom,
  currentPageIdAtom,
  currentWorkspaceAtom,
} from '@toeverything/infra/atom';
import { atom } from 'jotai';
import { Provider } from 'jotai/react';
import type { createStore } from 'jotai/vanilla';
import { createElement, type PropsWithChildren } from 'react';

import { createFetch } from './endowments/fercher';
import { createTimers } from './endowments/timer';
import { setupImportsMap } from './setup-imports-map';

// DO NOT REMOVE INVISIBLE CHARACTERS
const dynamicImportKey = '$h‍_import';

const permissionLogger = new DebugLogger('plugins:permission');
const importLogger = new DebugLogger('plugins:import');
const entryLogger = new DebugLogger('plugins:entry');

const pushLayoutAtom = atom<
  null,
  // fixme: check plugin name here
  [
    pluginName: string,
    create: (root: HTMLElement) => () => void,
    options:
      | {
          maxWidth: (number | undefined)[];
        }
      | undefined,
  ],
  void
>(null, (_, set, pluginName, callback, options) => {
  set(pluginWindowAtom, items => ({
    ...items,
    [pluginName]: callback,
  }));
  set(contentLayoutAtom, layout => {
    if (layout === 'editor') {
      return {
        direction: 'horizontal',
        first: 'editor',
        second: pluginName,
        splitPercentage: 70,
        maxWidth: options?.maxWidth,
      };
    } else {
      return {
        direction: 'horizontal',
        first: 'editor',
        splitPercentage: 70,
        second: {
          direction: 'horizontal',
          first: pluginName,
          second: layout.second,
          splitPercentage: 50,
        },
      } satisfies ExpectedLayout;
    }
  });
  addCleanup(pluginName, () => {
    set(deleteLayoutAtom, pluginName);
  });
});

const deleteLayoutAtom = atom<null, [string], void>(null, (_, set, id) => {
  set(pluginWindowAtom, items => {
    const newItems = { ...items };
    delete newItems[id];
    return newItems;
  });
  const removeLayout = (layout: LayoutNode): LayoutNode | string => {
    if (typeof layout === 'string') {
      return layout;
    }
    if (layout.first === id) {
      return layout.second;
    } else if (layout.second === id) {
      return layout.first;
    } else {
      return {
        ...layout,
        second: removeLayout(layout.second),
      };
    }
  };

  set(contentLayoutAtom, layout => {
    if (layout === 'editor') {
      return 'editor';
    } else {
      return removeLayout(layout) as ExpectedLayout;
    }
  });
});

const setupWeakMap = new WeakMap<
  ReturnType<typeof createStore>,
  ReturnType<typeof createSetupImpl>
>();

export function createSetup(rootStore: ReturnType<typeof createStore>) {
  if (setupWeakMap.has(rootStore)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return setupWeakMap.get(rootStore)!;
  }
  const setup = createSetupImpl(rootStore);
  setupWeakMap.set(rootStore, setup);
  return setup;
}

function createSetupImpl(rootStore: ReturnType<typeof createStore>) {
  // clean up plugin windows when switching to other pages
  rootStore.sub(currentPageIdAtom, () => {
    rootStore.set(contentLayoutAtom, 'editor');
  });

  // module -> importName -> updater[]
  const _rootImportsMap = new Map<string, Map<string, any>>();
  const rootImportsMapSetupPromise = setupImportsMap(_rootImportsMap, {
    react: import('react'),
    'react/jsx-runtime': import('react/jsx-runtime'),
    'react-dom': import('react-dom'),
    'react-dom/client': import('react-dom/client'),
    jotai: import('jotai'),
    'jotai/utils': import('jotai/utils'),
    swr: import('swr'),
    '@affine/component': import('@affine/component'),
    '@blocksuite/icons': import('@blocksuite/icons'),
    '@blocksuite/blocks': import('@blocksuite/blocks'),
    '@blocksuite/virgo': import('@blocksuite/virgo'),
    '@affine/sdk/entry': {
      rootStore,
      currentWorkspaceAtom: currentWorkspaceAtom,
      currentPageIdAtom: currentPageIdAtom,
      pushLayoutAtom: pushLayoutAtom,
      deleteLayoutAtom: deleteLayoutAtom,
    },
    '@blocksuite/global/utils': import('@blocksuite/global/utils'),
    '@toeverything/infra/atom': import('@toeverything/infra/atom'),
    '@toeverything/components/button': import(
      '@toeverything/components/button'
    ),
    '@toeverything/components/tooltip': import(
      '@toeverything/components/tooltip'
    ),
  });

  // pluginName -> module -> importName -> updater[]
  const _pluginNestedImportsMap = new Map<
    string,
    Map<string, Map<string, any>>
  >();

  const pluginImportsFunctionMap = new Map<
    string,
    (newUpdaters: [string, [string, ((val: any) => void)[]][]][]) => void
  >();
  const createImports = (pluginName: string) => {
    if (pluginImportsFunctionMap.has(pluginName)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return pluginImportsFunctionMap.get(pluginName)!;
    }
    const imports = (
      newUpdaters: [string, [string, ((val: any) => void)[]][]][]
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const currentImportMap = _pluginNestedImportsMap.get(pluginName)!;
      importLogger.debug('currentImportMap', pluginName, currentImportMap);

      for (const [module, moduleUpdaters] of newUpdaters) {
        importLogger.debug('imports module', module, moduleUpdaters);
        let moduleImports = _rootImportsMap.get(module);
        if (!moduleImports) {
          moduleImports = currentImportMap.get(module);
        }
        if (moduleImports) {
          for (const [importName, importUpdaters] of moduleUpdaters) {
            const updateImport = (value: any) => {
              for (const importUpdater of importUpdaters) {
                importUpdater(value);
              }
            };
            if (moduleImports.has(importName)) {
              const val = moduleImports.get(importName);
              updateImport(val);
            }
          }
        } else {
          console.error(
            'cannot find module in plugin import map',
            module,
            currentImportMap,
            _pluginNestedImportsMap
          );
        }
      }
    };
    pluginImportsFunctionMap.set(pluginName, imports);
    return imports;
  };

  const abortController = new AbortController();

  const pluginFetch = createFetch({});
  const timer = createTimers(abortController.signal);

  const sharedGlobalThis = Object.assign(Object.create(null), timer, {
    Object: globalThis.Object,
    fetch: pluginFetch,
    ReadableStream: globalThis.ReadableStream,
    Symbol: globalThis.Symbol,
    Error: globalThis.Error,
    TypeError: globalThis.TypeError,
    RangeError: globalThis.RangeError,
    console: globalThis.console,
    crypto: globalThis.crypto,
  });

  const dynamicImportMap = new Map<
    string,
    (moduleName: string) => Promise<any>
  >();

  const createOrGetDynamicImport = (baseUrl: string, pluginName: string) => {
    if (dynamicImportMap.has(pluginName)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return dynamicImportMap.get(pluginName)!;
    }
    const dynamicImport = async (moduleName: string): Promise<any> => {
      const codeUrl = `${baseUrl}/${moduleName}`;
      const analysisUrl = `${baseUrl}/${moduleName}.json`;
      const response = await fetch(codeUrl);
      const analysisResponse = await fetch(analysisUrl);
      const analysis = await analysisResponse.json();
      const exports = analysis.exports as string[];
      const code = await response.text();
      const moduleCompartment = new Compartment(
        createOrGetGlobalThis(
          pluginName,
          // use singleton here to avoid infinite loop
          createOrGetDynamicImport(pluginName, baseUrl)
        )
      );
      const entryPoint = moduleCompartment.evaluate(code, {
        __evadeHtmlCommentTest__: true,
      });
      const moduleExports = {} as Record<string, any>;
      const setVarProxy = new Proxy(
        {},
        {
          get(_, p: string): any {
            return (newValue: any) => {
              moduleExports[p] = newValue;
            };
          },
        }
      );
      entryPoint({
        imports: createImports(pluginName),
        liveVar: setVarProxy,
        onceVar: setVarProxy,
      });
      importLogger.debug('import', moduleName, exports, moduleExports);
      return moduleExports;
    };
    dynamicImportMap.set(pluginName, dynamicImport);
    return dynamicImport;
  };

  const globalThisMap = new Map<string, any>();

  const createOrGetGlobalThis = (
    pluginName: string,
    dynamicImport: (moduleName: string) => Promise<any>
  ) => {
    if (globalThisMap.has(pluginName)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return globalThisMap.get(pluginName)!;
    }
    const pluginGlobalThis = Object.assign(
      Object.create(null),
      sharedGlobalThis,
      {
        // fixme: vite build output bundle will have this, we should remove it
        process: Object.freeze({
          env: {
            NODE_ENV: process.env.NODE_ENV,
          },
        }),
        // dynamic import function
        [dynamicImportKey]: dynamicImport,
        // UNSAFE: React will read `window` and `document`
        window: new Proxy(
          {},
          {
            get(_, key) {
              permissionLogger.debug(`${pluginName} is accessing window`, key);
              if (sharedGlobalThis[key]) return sharedGlobalThis[key];
              const result = Reflect.get(window, key);
              if (typeof result === 'function') {
                if (result === ShadowRoot) {
                  return result;
                }
                return function (...args: any[]) {
                  permissionLogger.debug(
                    `${pluginName} is calling window`,
                    key,
                    args
                  );
                  return result.apply(window, args);
                };
              }
              permissionLogger.debug('window', key, result);
              return result;
            },
          }
        ),
        document: new Proxy(
          {},
          {
            get(_, key) {
              permissionLogger.debug(
                `${pluginName} is accessing document`,
                key
              );
              if (sharedGlobalThis[key]) return sharedGlobalThis[key];
              const result = Reflect.get(document, key);
              if (typeof result === 'function') {
                return function (...args: any[]) {
                  permissionLogger.debug(
                    `${pluginName} is calling window`,
                    key,
                    args
                  );
                  return result.apply(document, args);
                };
              }
              permissionLogger.debug('document', key, result);
              return result;
            },
          }
        ),
        navigator: globalThis.navigator,

        MouseEvent: globalThis.MouseEvent,
        KeyboardEvent: globalThis.KeyboardEvent,
        CustomEvent: globalThis.CustomEvent,

        // copilot uses these
        Date: globalThis.Date,
        Math: globalThis.Math,
        URL: globalThis.URL,
        URLSearchParams: globalThis.URLSearchParams,
        Headers: globalThis.Headers,
        TextEncoder: globalThis.TextEncoder,
        TextDecoder: globalThis.TextDecoder,
        Request: globalThis.Request,

        // image-preview uses these
        Blob: globalThis.Blob,
        ClipboardItem: globalThis.ClipboardItem,

        // vue uses these
        Element: globalThis.Element,
        SVGElement: globalThis.SVGElement,

        // fixme: use our own db api
        indexedDB: globalThis.indexedDB,
        IDBRequest: globalThis.IDBRequest,
        IDBDatabase: globalThis.IDBDatabase,
        IDBCursorWithValue: globalThis.IDBCursorWithValue,
        IDBFactory: globalThis.IDBFactory,
        IDBKeyRange: globalThis.IDBKeyRange,
        IDBOpenDBRequest: globalThis.IDBOpenDBRequest,
        IDBTransaction: globalThis.IDBTransaction,
        IDBObjectStore: globalThis.IDBObjectStore,
        IDBIndex: globalThis.IDBIndex,
        IDBCursor: globalThis.IDBCursor,
        IDBVersionChangeEvent: globalThis.IDBVersionChangeEvent,
      }
    );
    pluginGlobalThis.global = pluginGlobalThis;
    globalThisMap.set(pluginName, pluginGlobalThis);
    return pluginGlobalThis;
  };

  const setupPluginCode = async (
    baseUrl: string,
    pluginName: string,
    filename: string
  ) => {
    await rootImportsMapSetupPromise;
    if (!_pluginNestedImportsMap.has(pluginName)) {
      _pluginNestedImportsMap.set(pluginName, new Map());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentImportMap = _pluginNestedImportsMap.get(pluginName)!;
    const isMissingPackage = (name: string) =>
      _rootImportsMap.has(name) && !currentImportMap.has(name);

    const bundleAnalysis = await fetch(`${baseUrl}/${filename}.json`).then(
      res => res.json()
    );
    const moduleExports = bundleAnalysis.exports as Record<string, [string]>;
    const moduleImports = bundleAnalysis.imports as string[];
    const moduleReexports = bundleAnalysis.reexports as Record<
      string,
      [localName: string, exportedName: string][]
    >;
    await Promise.all(
      moduleImports.map(name => {
        if (isMissingPackage(name)) {
          return Promise.resolve();
        } else {
          importLogger.debug('missing package', name);
          return setupPluginCode(baseUrl, pluginName, name);
        }
      })
    );
    const code = await fetch(
      `${baseUrl}/${filename.replace(/^\.\//, '')}`
    ).then(res => res.text());
    importLogger.debug('evaluating', filename);
    const moduleCompartment = new Compartment(
      createOrGetGlobalThis(
        pluginName,
        // use singleton here to avoid infinite loop
        createOrGetDynamicImport(baseUrl, pluginName)
      )
    );
    const entryPoint = moduleCompartment.evaluate(code, {
      __evadeHtmlCommentTest__: true,
    });
    const moduleExportsMap = new Map<string, any>();
    const setVarProxy = new Proxy(
      {},
      {
        get(_, p: string): any {
          return (newValue: any) => {
            moduleExportsMap.set(p, newValue);
          };
        },
      }
    );
    currentImportMap.set(filename, moduleExportsMap);
    entryPoint({
      imports: createImports(pluginName),
      liveVar: setVarProxy,
      onceVar: setVarProxy,
    });

    for (const [newExport, [originalExport]] of Object.entries(moduleExports)) {
      if (newExport === originalExport) continue;
      const value = moduleExportsMap.get(originalExport);
      moduleExportsMap.set(newExport, value);
      moduleExportsMap.delete(originalExport);
    }

    for (const [name, reexports] of Object.entries(moduleReexports)) {
      const targetExports = currentImportMap.get(filename);
      const moduleExports = currentImportMap.get(name);
      assertExists(targetExports);
      assertExists(moduleExports);
      for (const [exportedName, localName] of reexports) {
        const exportedValue: any = moduleExports.get(exportedName);
        assertExists(exportedValue);
        targetExports.set(localName, exportedValue);
      }
    }
  };

  const PluginProvider = ({ children }: PropsWithChildren) =>
    createElement(
      Provider,
      {
        store: rootStore,
      },
      children
    );

  const evaluatePluginEntry = (pluginName: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const currentImportMap = _pluginNestedImportsMap.get(pluginName)!;
    const pluginExports = currentImportMap.get('index.js');
    assertExists(pluginExports);
    const entryFunction = pluginExports.get('entry');
    const cleanup = entryFunction(<PluginContext>{
      register: (part, callback) => {
        entryLogger.info(`Registering ${pluginName} to ${part}`);
        if (part === 'headerItem') {
          rootStore.set(pluginHeaderItemAtom, items => ({
            ...items,
            [pluginName]: callback as CallbackMap['headerItem'],
          }));
          addCleanup(pluginName, () => {
            rootStore.set(pluginHeaderItemAtom, items => {
              const newItems = { ...items };
              delete newItems[pluginName];
              return newItems;
            });
          });
        } else if (part === 'editor') {
          rootStore.set(pluginEditorAtom, items => ({
            ...items,
            [pluginName]: callback as CallbackMap['editor'],
          }));
          addCleanup(pluginName, () => {
            rootStore.set(pluginEditorAtom, items => {
              const newItems = { ...items };
              delete newItems[pluginName];
              return newItems;
            });
          });
        } else if (part === 'setting') {
          rootStore.set(pluginSettingAtom, items => ({
            ...items,
            [pluginName]: callback as CallbackMap['setting'],
          }));
          addCleanup(pluginName, () => {
            rootStore.set(pluginSettingAtom, items => {
              const newItems = { ...items };
              delete newItems[pluginName];
              return newItems;
            });
          });
        } else if (part === 'formatBar') {
          const register = (widget: AffineFormatBarWidget) => {
            const div = document.createElement('div');
            const root = widget.root;
            const cleanup = (callback as CallbackMap['formatBar'])(
              div,
              widget.page,
              () => {
                return root.selection.value;
              }
            );
            addCleanup(pluginName, () => {
              AffineFormatBarWidget.customElements.delete(register);
              cleanup();
            });
            return div;
          };
          AffineFormatBarWidget.customElements.add(register);
        } else {
          throw new Error(`Unknown part: ${part}`);
        }
      },
      utils: {
        PluginProvider,
      },
    });
    if (typeof cleanup !== 'function') {
      throw new Error('Plugin entry must return a function');
    }
    addCleanup(pluginName, cleanup);
  };
  return {
    _rootImportsMap,
    _pluginNestedImportsMap,
    createImports,
    createOrGetDynamicImport,
    setupPluginCode,
    evaluatePluginEntry,
    createOrGetGlobalThis,
  };
}
