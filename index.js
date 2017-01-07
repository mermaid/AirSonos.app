'use strict';

const {app, BrowserWindow} = require('electron');
app.dock.hide();

const AirSonos = require('airsonos');
const MenuBar = require('./menubar');
const path = require('path');
const fs = require('fs');
const request = require('request-promise');
const cmp = require('semver-compare');
const Config = require('electron-config');
const config = new Config();
const updateURL = 'https://raw.githubusercontent.com/mermaid/AirSonos.app/master/package.json';

let aboutWindow;
let updateWindow;
let menubar;
let instance;
let sonosTunnels;

var access = fs.createWriteStream(path.join(app.getPath('appData'), 'access.log'));
process.stdout.write = process.stderr.write = access.write.bind(access);

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
      instance && instance.stop();
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

  optionTemplate = optionTemplate.concat([separatorMenu, rebootMenu, forceQuitMenu]);
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