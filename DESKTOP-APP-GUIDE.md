# 🖥️ AAGC Desktop - Guia de Criação

## 📦 Transformando AAGC em Aplicativo Desktop

Este guia mostra como transformar o AAGC SaaS em um aplicativo desktop nativo para Windows, Mac e Linux.

---

## 🎯 Abordagem Recomendada: Electron

### **Por que Electron?**
- ✅ Usa o mesmo código Next.js (não precisa reescrever)
- ✅ Multiplataforma (Windows `.exe`, Mac `.dmg`, Linux `.deb`)
- ✅ Auto-update automático
- ✅ Notificações nativas do sistema
- ✅ Acesso a APIs do sistema operacional
- ✅ Usado por: VS Code, Slack, Discord, Figma

---

## 🚀 IMPLEMENTAÇÃO PASSO A PASSO

### **Passo 1: Estrutura do Projeto**

```bash
cd aagc-saas
mkdir apps/desktop
cd apps/desktop
npm init -y
```

### **Passo 2: Instalar Dependências**

```bash
npm install --save-dev electron electron-builder
npm install --save electron-is-dev electron-store
```

### **Passo 3: Criar Estrutura**

```
apps/desktop/
├── main.js              # Processo principal do Electron
├── preload.js           # Script de pré-carregamento
├── package.json         # Configuração do desktop app
├── icon.png            # Ícone do aplicativo (512x512)
└── build/              # Recursos de build
    ├── icon.ico        # Windows
    ├── icon.icns       # macOS
    └── icon.png        # Linux
```

### **Passo 4: Criar main.js**

```javascript
// apps/desktop/main.js
const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0A1628',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // URL do Next.js (desenvolvimento ou produção)
  const appURL = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../web/.next/server/app/index.html')}`;

  mainWindow.loadURL(appURL);

  // DevTools apenas em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Salvar posição e tamanho da janela
  mainWindow.on('close', () => {
    const bounds = mainWindow.getBounds();
    store.set('windowBounds', bounds);
  });

  // Restaurar posição anterior
  const savedBounds = store.get('windowBounds');
  if (savedBounds) {
    mainWindow.setBounds(savedBounds);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Criar janela quando o app estiver pronto
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit quando todas as janelas estiverem fechadas (exceto macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Comunicação entre processo principal e renderizador
ipcMain.handle('show-notification', async (event, { title, body }) => {
  new Notification({ title, body }).show();
  return { success: true };
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  // Implementar auto-update aqui (electron-updater)
  return { updateAvailable: false };
});
```

### **Passo 5: Criar preload.js**

```javascript
// apps/desktop/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => 
    ipcRenderer.invoke('show-notification', { title, body }),
  
  getAppVersion: () => 
    ipcRenderer.invoke('get-app-version'),
  
  checkForUpdates: () => 
    ipcRenderer.invoke('check-for-updates'),
  
  platform: process.platform,
  isElectron: true,
});
```

### **Passo 6: Configurar package.json**

```json
{
  "name": "aagc-desktop",
  "version": "1.0.0",
  "description": "AAGC - Gestão Inteligente de Compras e Estoque",
  "main": "main.js",
  "author": "Sua Empresa",
  "license": "MIT",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --no-sandbox",
    "build": "electron-builder",
    "build:win": "electron-builder --win --x64",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.aagc.desktop",
    "productName": "AAGC",
    "directories": {
      "buildResources": "build",
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "icon.png",
      "../web/.next/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "target": [
        "dmg",
        "zip"
      ],
      "icon": "build/icon.icns",
      "category": "public.app-category.business"
    },
    "linux": {
      "target": [
        "AppImage",
        "deb",
        "rpm"
      ],
      "icon": "build/icon.png",
      "category": "Office"
    }
  }
}
```

### **Passo 7: Integrar com Next.js**

No seu `apps/web/src/app/layout.tsx` ou em um hook customizado:

```typescript
// apps/web/src/hooks/useElectron.ts
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    electronAPI?: {
      showNotification: (title: string, body: string) => Promise<any>;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<any>;
      platform: string;
      isElectron: boolean;
    };
  }
}

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, []);

  const showNotification = (title: string, body: string) => {
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else {
      // Fallback para notificação web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  };

  return {
    isElectron,
    appVersion,
    showNotification,
    platform: window.electronAPI?.platform || 'web',
  };
}
```

---

## 🎨 Criar Ícones

### **Ferramentas:**
- **Canva:** Design gráfico online
- **Figma:** Design profissional
- **Icon Kitchen:** Gerador de ícones

### **Requisitos:**
```
icon.png  → 512x512 (fonte)
icon.ico  → Windows (gerar com icoconverter.com)
icon.icns → macOS (gerar com iconutil ou online)
```

---

## 🚀 Build e Distribuição

### **Desenvolvimento:**
```bash
cd apps/desktop
npm run dev
```

### **Build para Produção:**

**Windows:**
```bash
npm run build:win
# Gera: dist/AAGC Setup 1.0.0.exe (instalador)
#       dist/AAGC 1.0.0.exe (portable)
```

**macOS:**
```bash
npm run build:mac
# Gera: dist/AAGC-1.0.0.dmg
#       dist/AAGC-1.0.0-mac.zip
```

**Linux:**
```bash
npm run build:linux
# Gera: dist/AAGC-1.0.0.AppImage
#       dist/aagc_1.0.0_amd64.deb
#       dist/aagc-1.0.0.x86_64.rpm
```

---

## 🔄 Auto-Update

### **Instalar electron-updater:**
```bash
npm install --save electron-updater
```

### **Adicionar ao main.js:**
```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  createWindow();
  
  // Verificar atualizações a cada hora
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3600000);
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});
```

---

## 📱 Funcionalidades Desktop Extras

### **1. Menu Nativo**

```javascript
const { Menu } = require('electron');

const template = [
  {
    label: 'Arquivo',
    submenu: [
      { label: 'Nova Janela', click: createWindow },
      { type: 'separator' },
      { label: 'Sair', role: 'quit' }
    ]
  },
  {
    label: 'Editar',
    submenu: [
      { role: 'undo', label: 'Desfazer' },
      { role: 'redo', label: 'Refazer' },
      { type: 'separator' },
      { role: 'cut', label: 'Recortar' },
      { role: 'copy', label: 'Copiar' },
      { role: 'paste', label: 'Colar' }
    ]
  },
  {
    label: 'Ajuda',
    submenu: [
      {
        label: 'Documentação',
        click: () => shell.openExternal('https://aagc.com.br/docs')
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
```

### **2. System Tray**

```javascript
const { Tray } = require('electron');

let tray;

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir AAGC', click: () => mainWindow.show() },
    { label: 'Sair', click: () => app.quit() }
  ]);
  
  tray.setToolTip('AAGC - Gestão de Compras');
  tray.setContextMenu(contextMenu);
}
```

### **3. Atalhos Globais**

```javascript
const { globalShortcut } = require('electron');

app.whenReady().then(() => {
  // Ctrl+Shift+A para abrir/focar o app
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });
});
```

---

## 💾 Armazenamento Local

### **electron-store (Configurações):**
```javascript
const Store = require('electron-store');

const schema = {
  serverUrl: {
    type: 'string',
    default: 'http://localhost:3001'
  },
  theme: {
    type: 'string',
    default: 'dark'
  }
};

const store = new Store({ schema });

// Usar
store.set('serverUrl', 'https://api.aagc.com.br');
const serverUrl = store.get('serverUrl');
```

---

## 🎯 Distribuição para Clientes

### **Opção 1: Download Direto**
Hospedar os instaladores no seu site:
```
https://aagc.com.br/download/windows
https://aagc.com.br/download/mac
https://aagc.com.br/download/linux
```

### **Opção 2: Microsoft Store / Mac App Store**
- **Windows:** Microsoft Partner Center
- **macOS:** Apple Developer Program (US$ 99/ano)
- **Linux:** Snap Store, Flathub

### **Opção 3: Auto-Update Server**
Configurar servidor para distribuir atualizações:
```javascript
// Em package.json build config
"publish": {
  "provider": "generic",
  "url": "https://releases.aagc.com.br"
}
```

---

## 📊 Estatísticas de Uso

### **Integrar Analytics:**
```javascript
// main.js
const { app } = require('electron');
const analytics = require('electron-google-analytics');

analytics.init('UA-XXXXXXXXX-X');
analytics.screenView('Main Window', app.getName(), app.getVersion());
```

---

## 🔐 Segurança

### **Boas Práticas:**
1. ✅ Sempre usar `contextIsolation: true`
2. ✅ Sempre usar `nodeIntegration: false`
3. ✅ Validar todas as URLs antes de abrir
4. ✅ Usar HTTPS para comunicação
5. ✅ Não expor credenciais no código
6. ✅ Code signing (assinar o executável)

### **Code Signing:**

**Windows:**
```bash
# Comprar certificado code signing
# Configurar em electron-builder
"win": {
  "certificateFile": "cert.p12",
  "certificatePassword": "senha"
}
```

**macOS:**
```bash
# Apple Developer account
# Notarização obrigatória
electron-builder --mac --publish never
xcrun altool --notarize-app ...
```

---

## 📝 Checklist de Lançamento

- [ ] Ícone do app criado (512x512)
- [ ] main.js e preload.js implementados
- [ ] Next.js integrado e funcionando
- [ ] Build testado em Windows
- [ ] Build testado em macOS
- [ ] Build testado em Linux
- [ ] Auto-update configurado
- [ ] Code signing aplicado
- [ ] Instaladores testados
- [ ] Documentação de instalação criada
- [ ] Sistema de distribuição configurado

---

## 💰 Custos

### **Desenvolvimento:**
- Tempo: 2-3 dias (primeira versão)
- Custo: R$ 0 (open source)

### **Distribuição:**
- **Apple Developer:** US$ 99/ano (opcional)
- **Code Signing Windows:** ~US$ 150/ano (opcional)
- **Hospedagem instaladores:** ~R$ 50/mês

---

## 🎉 Resultado Final

Você terá:
- ✅ Aplicativo desktop nativo
- ✅ Instaladores para Windows, Mac e Linux
- ✅ Auto-update automático
- ✅ Mesmo código do web app
- ✅ Funcionalidades extras (notificações, shortcuts)
- ✅ Profissionalismo e credibilidade

---

## 📞 Suporte

Para dúvidas sobre Electron:
- Documentação oficial: https://www.electronjs.org/docs
- Exemplos: https://github.com/electron/electron-quick-start
- Comunidade: Discord do Electron

**Boa sorte com o seu aplicativo desktop! 🚀**
