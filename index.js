'use strict';

const {app, BrowserWindow, shell} = require('electron');

if (app.dock) {
   app.dock.hide();
}

const AirSonos = require('airsonos');
const MenuBar = require('./menubar');
const path = require('path');
const fs = require('fs');
const request = require('request-promise');
const cmp = require('semver-compare');
const Config = require('electron-config');
const config = new Config();
const updateURL = 'https://raw.githubusercontent.com/mermaid/AirSonos.app/master/package.json';
const helper = require('./node_modules/nodetunes/lib/helper');
const crypto = require('crypto');

//Fixes a bug in nodetunes that is not released to the public yet
helper.decryptAudioData = function(data, audioAesKey, audioAesIv, headerSize) {
  var tmp = new Buffer(16);
  if (!headerSize) headerSize = 12;

  var remainder = (data.length - 12) % 16;
  var endOfEncodedData = data.length - remainder;

  var audioAesKeyBuffer = new Buffer(audioAesKey, 'binary');
  var decipher = crypto.createDecipheriv('aes-128-cbc', audioAesKeyBuffer, audioAesIv);
  decipher.setAutoPadding(false);

  for (var i = headerSize, l = endOfEncodedData - 16; i <= l; i += 16) {
    data.copy(tmp, 0, i, i + 16);
    decipher.update(tmp).copy(data, i, 0, 16);
  }

  return data.slice(headerSize);
};

let aboutWindow;
let updateWindow;
let errorWindow;
let menubar;
let instance;
let sonosTunnels;

if (!fs.existsSync(path.join(app.getPath('appData'), 'AirSonos'))) {
    fs.mkdirSync(path.join(app.getPath('appData'), 'AirSonos'));
}

const logPath = path.join(app.getPath('appData'), 'AirSonos/logs.log');
const access = fs.createWriteStream(logPath);
process.stdout.write = process.stderr.write = access.write.bind(access);

let errorCount = 0;

process.on('uncaughtException', function (e) {
  errorCount++;
  console.error(e);

  if (errorCount > 10) {
    if (!errorWindow) {

        errorWindow = new BrowserWindow({
            height: 230,
            width: 450,
            title: 'AirSonos',
            center: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
        });

        errorWindow.on('closed', () => {
          errorWindow = null
          app.quit();
        });

        errorWindow.loadURL(`file://${__dirname }/app/errors.html`);
      } else {
        errorWindow.show();
      }
    }

})

if (config.get('automatic-updates') === undefined) {
  config.set('automatic-updates', true);
}

const airSonosMenu = {
    label: 'AirSonos',
    click: () => {
      if (!aboutWindow) {

        aboutWindow = new BrowserWindow({
            height: 220,
            width: 420,
            title: 'AirSonos',
            center: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
        });

        aboutWindow.on('closed', () => {
          aboutWindow = null
        });

        aboutWindow.loadURL(`file://${__dirname }/app/about.html`);
      } else {
        aboutWindow.show();
      }
    }
};
const quitMenu = {
    label: 'Quit',
    click: () => {
      app.quit();
    }
};
const forceQuitMenu = {
    label: 'Force Quit',
    click: () => {
        app.exit(0);
    }
};
const rebootMenu = {
    label: 'Restart',
    click: () => {                        
        app.relaunch();
        app.quit();
    }
};
const separatorMenu = {
    type: 'separator'
};
const connectedMenu = {
    label: 'Connected To:',
    enabled: false
};
const connectingMenu = {
    label: 'Connecting...',
    enabled: false
};
const failedToConnectMenu = {
    label: 'Failed to Connect',
    enabled: false
};
const reconnectMenu = {
    label: 'Reconnect',
    click: () => stopTunnel().then(startTunnel)
};
const automaticUpdatesMenu = {
  label: 'Check for Updates',
  type: 'checkbox',
  click: () => {
    config.set('automatic-updates', !config.get('automatic-updates'));
  },
  checked: config.get('automatic-updates')
}
const sonosMenu = {
  label: '<Sonos Name>',
  enabled: false
}

const diagnosticsMenu = {
  label: 'Colled Debug Logs',
  click: () => {
    if(require('airsonos/lib/diagnostics')) {
      console.log();
      require('airsonos/lib/diagnostics')();
    }
  }
}

const openLogMenu = {
  label: 'Show Log File',
  click: () => {
    shell.showItemInFolder(logPath);
  }
}


app.on('ready', function() {
  menubar = new MenuBar();
  menubar.animatieIcon();
  menubar.setMenuTemplates(constructMenuTemplates(0));

  startTunnel();

  console.log('Searching for Sonos devices on network...\n');
});

app.on('window-all-closed', function() {
  //dont quit on windows close
});

function stopTunnel() {
  sonosTunnels = null;
  return instance && instance.stop();
}

function startTunnel() {
  instance = new AirSonos({
    verbose: true,
    timeout: 5,
  });

  return instance.start().timeout(30000).then((tunnels) => {
    sonosTunnels = tunnels;
    tunnels.forEach((tunnel) => {
      console.log(`${ tunnel.deviceName } (@ ${ tunnel.device.host }:${ tunnel.device.port }, ${ tunnel.device.groupId })`);
    });

    menubar.enableIcon();
    menubar.setMenuTemplates(constructMenuTemplates(1));

    console.log(`\nSearch complete. Set up ${ tunnels.length } device tunnel${ tunnels.length === 1 ? '' : 's' }.`);
  }).catch(function() { 
    menubar.disableIcon();
    menubar.setMenuTemplates(constructMenuTemplates(-1));
  }).done();
}

//option: Bool, wether or not to construct the option menubar
//connected: 0 - connecting, 1 - connected, -1 - failed to connect
function constructMenuTemplates(connected) {
  var template = [airSonosMenu, automaticUpdatesMenu, separatorMenu];
  var optionTemplate = [airSonosMenu, automaticUpdatesMenu, separatorMenu];

  template.push(!connected ? connectingMenu : (~connected ?  connectedMenu : failedToConnectMenu));
  optionTemplate.push(!connected ? connectingMenu : (~connected ? connectedMenu : failedToConnectMenu));

  if (!~connected) {
    template.push(reconnectMenu);
    optionTemplate.push(reconnectMenu);
  }

  if (sonosTunnels && sonosTunnels.length) {
    sonosTunnels.forEach((tunnel) => {
      var menu = Object.assign({}, sonosMenu);
      var optionMenu = Object.assign({}, sonosMenu);

      menu.label = tunnel.deviceName;
      optionMenu.label = `${ tunnel.deviceName } @ ${ tunnel.device.host }:${ tunnel.device.port }`;

      template.push(menu);
      optionTemplate.push(optionMenu);
    });
  }

  optionTemplate = optionTemplate.concat([separatorMenu, diagnosticsMenu, openLogMenu, rebootMenu, forceQuitMenu]);
  template = template.concat([separatorMenu, quitMenu]);

  return [template, optionTemplate];
}

if (config.get('automatic-updates')) {
  request.get('https://raw.githubusercontent.com/mermaid/AirSonos.app/master/package.json').then(json => {
    const p = JSON.parse(json);

    if (cmp(p.version, app.getVersion()) > 0) {
      if (!updateWindow) {
        updateWindow = new BrowserWindow({
            height: 220,
            width: 420,
            title: 'AirSonos',
            center: true,
            resizable: false,
            minimizable: false,
            maximizable: false,
        });

        updateWindow.on('closed', () => {
          updateWindow = null;
        });

        updateWindow.loadURL(`file://${__dirname }/app/update.html`);
      } else {
        updateWindow.show();
      }
    }

  }).catch().done();
}
