(function() {
    'use strict';

    console.log(process.version);

    const {app, BrowserWindow, Tray, Menu} = require('electron');
    const path = require('path');
    const AirSonos = require('airsonos');
    // const ipc = require('ipc');

    var mainWindow = null;

    let animationInterval;
    let tray = null;

    app.on('ready', function() {
        // mainWindow = new BrowserWindow({
        //     height: 600,
        //     width: 800
        // });

        // console.log('dirname');

        // mainWindow.loadURL(`file://${__dirname }/app/index.html`);


        if (process.platform === 'darwin') {
            tray = new Tray(path.join(__dirname, 'img/logo-iconTemplate.png'));
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

        console.log('Searching for Sonos devices on network...\n');

        let instance = new AirSonos({
            timeout: 5,
        });

        instance.start().then((tunnels) => {

            tunnels.forEach((tunnel) => {
            console.log(`${ tunnel.deviceName } (@ ${ tunnel.device.host }:${ tunnel.device.port }, ${ tunnel.device.groupId })`);
            });

            console.log(`\nSearch complete. Set up ${ tunnels.length } device tunnel${ tunnels.length === 1 ? '' : 's' }.`);
        }).done();

        
        animate();
        setTimeout(stopAnimation, 10000);
    });


    function animate() {
        var i = 0;
        var j = 1;
        animationInterval = setInterval(function() {
            if (i < 0 || i > 12) {
                j *= -1;
                i += j;
            }
            tray.setImage(path.join(__dirname, `img/animations/logo${i}-iconTemplate.png`));
            
            i += j;
        }, 80);
    }

    function stopAnimation() {
        if(animationInterval) {
            clearInterval(animationInterval);
            tray.setImage(path.join(__dirname, `img/animations/logo-dim-iconTemplate@2x.png`));
        }            
    }


})();