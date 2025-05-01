const { ipcRenderer } = require('electron');
const net = require('net');

// Function to send a command to the Unix domain socket.
// The 'id' parameter indicates the target (either a specific jukebox or global).
function sendCommand(command, id = "global") {
  console.log("Sending command:", command, "to", id);
  const client = net.createConnection({ path: '/tmp/jukebox_commands.sock' }, () => {
    // Send a JSON payload if you need to include the target
    //const payload = JSON.stringify({ jukebox: id, command: command });
    if (id === "global") {
      client.write(`command:${command}`);
    } else {
      client.write(`command:${id}:${command}`);
    }
  });

  client.on('data', (data) => {
    console.log('Received:', data.toString());
    client.end();
  });
  
  client.on('error', (err) => {
    console.error('Socket Error:', err);
  });
}

// Global controls listeners
document.getElementById('global-turn-on').addEventListener('click', () => {
  sendCommand("ON");
});
document.getElementById('global-turn-off').addEventListener('click', () => {
  sendCommand("OFF");
});
document.getElementById('global-cancel').addEventListener('click', () => {
  sendCommand("cancel_all");
});

// Set up listeners for each individual jukebox panel.
const panels = document.querySelectorAll('.jukebox-panel');
panels.forEach(panel => {
  panel.querySelector('.turn-on').addEventListener('click', () => {
    sendCommand("turn_on", panel.id);
  });
  panel.querySelector('.turn-off').addEventListener('click', () => {
    sendCommand("turn_off", panel.id);
  });
  panel.querySelector('.cancel').addEventListener('click', () => {
    sendCommand("cancel", panel.id);
  });
});

// Receive real‑time updates:
ipcRenderer.on('jukebox-update', (_event, msg) => {
  // msg = { jukebox: "jukebox1", status: "Playing" }
  statuses = JSON.parse(msg.message); //Need to parse again because the data is double JSON encoded for some reason by JukeboxBase program.
  console.log("Statuses: ", statuses);
  for (const [jukebox, status] of Object.entries(statuses)){
    const jukeboxPanel = document.getElementById(`${jukebox}`);
    if (jukeboxPanel) jukeboxPanel.querySelector('.status').textContent = status;
  }
  // const panel = document.getElementById(msg.jukebox);
  // if (panel) panel.querySelector('.status').textContent = msg.status;
});

const serviceIndicator = document.getElementById('service-status');
ipcRenderer.on('service-status', (_e, status) => {
  serviceIndicator.textContent = status;
});

// Exit button sends a message to the main process to quit the application.
document.getElementById('exit-button').addEventListener('click', () => {
  ipcRenderer.send('quit-app');
});
