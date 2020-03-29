

interface Keys {
    [key: string]: boolean
}

export class Input {
    pressedKeys: Keys = {};

    setKey = (event: KeyboardEvent, status: boolean) => {
        const code = event.keyCode;
        let key: string;
        switch (code) {
            case 32: key = 'SPACE'; break;
            case 37: key = 'LEFT'; break;
            // case 38: key = 'UP'; break;
            case 39: key = 'RIGHT'; break;
            // case 40: key = 'DOWN'; break;
            default:
                // convert ASCII codes to letters
                key = String.fromCharCode(code);
        }

        this.pressedKeys[key] = status;
    }

    isDown = (key: string) => this.pressedKeys[key.toUpperCase()];


    constructor() {
        document.addEventListener('keydown',  (e: KeyboardEvent) => {
            this.setKey(e, true);
        });
    
        document.addEventListener('keyup', (e: KeyboardEvent) => {
            this.setKey(e, false);
        });
    
        window.addEventListener('blur', () => {
            this.pressedKeys = {};
        });
    }

};


