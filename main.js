// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const net = require('net');
let win;

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 480,
    fullscreen: true, // Start in fullscreen mode
    webPreferences: {
      nodeIntegration: true,  // Enable Node.js integration in the renderer
      contextIsolation: false // Disable contextIsolation for simplicity (note security risks in production)
    }
  });

  win.loadFile('index.html');
  // Optional: win.webContents.openDevTools(); // Uncomment for debugging
}

// --- Update socket: push real‑time status to renderer ---
const updatesClient = net.createConnection({ path: '/tmp/jukebox_updates.sock' });
updatesClient.on('data', raw => {
  console.log('[update]: ', raw.toString());
  
  //Split messages that were received at the same time
  const messages = raw.toString().trim().split('}\n{');
  messages.forEach((message, idx) => {
    // Rebuild JSON string
    let messageStr = message;
    if (!messageStr.startsWith('{')) messageStr = '{' + messageStr;
    if (!messageStr.endsWith('}')) messageStr = messageStr + '}';

    try { 
      const msg = JSON.parse(messageStr.toString()); 
      // forward to renderer
      if (msg.type === 'status') {
        win.webContents.send('jukebox-update', msg);
      }
    }
    catch (err) { 
      console.error(`Failed to parse message #${idx}:`, err);
    }
  })

});

// --- Listen for commands from the renderer ---
ipcMain.on('send-command', (_e, payload) => {
  const cmdClient = net.createConnection({ path: '/tmp/jukebox_socket' }, () => {
    cmdClient.write(JSON.stringify(payload));
  });
  cmdClient.on('error', err => console.error('Command socket error:', err));
});


app.whenReady().then(() => {
  createWindow();

  //Poll every 5 seconds
  setInterval(() => {
    exec('systemctl show -p ActiveState --value jukebox_base.service', (err, stdout) => {
      const status = stdout.trim() || 'unknown';
      //Should contain the status of jukebox_base.service or 'unknown'
      win.webContents.send('service-status', status);
    });
  }, 5000);
});

// Listen for the quit message from the renderer process
ipcMain.on('quit-app', () => {
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
