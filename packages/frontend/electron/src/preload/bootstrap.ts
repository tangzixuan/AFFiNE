import { contextBridge, ipcRenderer } from 'electron';

(async () => {
  const { appInfo, getElectronAPIs } = await import(
    '@toeverything/infra/preload/electron'
  );
  const { apis, events } = getElectronAPIs();

  contextBridge.exposeInMainWorld('appInfo', appInfo);
  contextBridge.exposeInMainWorld('apis', apis);
  contextBridge.exposeInMainWorld('events', events);

  // Credit to microsoft/vscode
  const globals = {
    ipcRenderer: {
      send(channel: string, ...args: any[]) {
        ipcRenderer.send(channel, ...args);
      },

      invoke(channel: string, ...args: any[]) {
        return ipcRenderer.invoke(channel, ...args);
      },

      on(
        channel: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
      ) {
        ipcRenderer.on(channel, listener);
        return this;
      },

      once(
        channel: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
      ) {
        ipcRenderer.once(channel, listener);
        return this;
      },

      removeListener(
        channel: string,
        listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
      ) {
        ipcRenderer.removeListener(channel, listener);
        return this;
      },
    },
  };

  try {
    contextBridge.exposeInMainWorld('affine', globals);
  } catch (error) {
    console.error('Failed to expose affine APIs to window object!', error);
  }
})().catch(err => {
  console.error('Failed to bootstrap preload script!', err);
});
