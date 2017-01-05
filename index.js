(function() {
    'use strict';

    const {app, BrowserWindow, Tray, Menu} = require('electron');
    const path = require('path');
    // const ipc = require('ipc');

    var mainWindow = null;

    app.on('ready', function() {
        // mainWindow = new BrowserWindow({
        //     height: 600,
        //     width: 800
        // });

        // console.log('dirname');

        // mainWindow.loadURL(`file://${__dirname }/app/index.html`);

        var tray = null;

        if (process.platform === 'darwin') {
            tray = new Tray(path.join(__dirname, 'img/tray-iconTemplate.png'));
        }
        else {
            tray = new Tray(path.join(__dirname, 'img/tray-icon-alt.png'));
        }

        var trayMenuTemplate = [
            {
                label: 'AirSonos',
                enabled: false
            },
            {
                label: 'Settings',
                // click: function () {
                    // ipc.send('open-settings-window');
                // },
                type: 'radio'
            },
            {
                label: 'Quit',
                click: function () {
                    app.quit();
                }
            }
        ];
        var trayMenu = Menu.buildFromTemplate(trayMenuTemplate);
        tray.setToolTip('AirSonos');
        tray.setContextMenu(trayMenu);
        var t = true;
        
        const animate = function() {
            var i = 0;
            setInterval(function() {
                tray.setImage(path.join(__dirname, 'img/animations/frame_' + i + '.png'));
                i += 1;
                i %= 8;
            }, 200);

        };
        animate();

    });












})();