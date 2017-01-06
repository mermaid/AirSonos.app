(function() {
    const {app, BrowserWindow, Tray, Menu} = require('electron');
    const path = require('path');



    class MenuBar {
        constructor(menuTemplate, optionMenuTemplate) {
            this.animateSpeed = 80;

            this.tray = new Tray(path.join(__dirname, 'img/logo-dim-iconTemplate.png'));

            this.tray.setToolTip('AirSonos');

            this.tray.on('click', event => {
                if (event.altKey) {
                    this.tray.popUpContextMenu(this.trayMenuOption);
                } else {
                    this.tray.popUpContextMenu(this.trayMenu);
                }
            });
        }

        setMenuTemplates(templates) {
            this.trayMenu = Menu.buildFromTemplate(templates[0]);
            this.trayMenuOption = Menu.buildFromTemplate(templates[1]);
        }

        animatieIcon() {
            var i = 0;
            var j = 1;
            this.animationInterval = setInterval(() => {
                if (i < 0 || i > 12) {
                    j *= -1;
                    i += j;
                }
                this.tray.setImage(path.join(__dirname, `img/animations/logo${i}-iconTemplate.png`));
                
                i += j;
            }, this.animateSpeed);
        }

        enableIcon() {
            if(this.animationInterval) {
                clearInterval(this.animationInterval);
            }            
            this.tray.setImage(path.join(__dirname, `img/logo-iconTemplate@2x.png`));
        }
        disableIcon() {
            if(this.animationInterval) {
                clearInterval(this.animationInterval);
            }            
            this.tray.setImage(path.join(__dirname, `img/logo-dim-iconTemplate@2x.png`));
        }
    }

    module.exports = MenuBar;
})();