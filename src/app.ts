

import {Resources} from './resources';
import {Input} from './input';
const resources = new Resources();
const input = new Input();


type VoidFunction = () => void;


const timeoutAnimate = (callback: VoidFunction) => {
    window.setTimeout(callback, 1000 / 60);
};

const requestAnimFrame =  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
// @ts-ignore
        window.mozRequestAnimationFrame ||
// @ts-ignore
        window['oRequestAnimationFrame'] ||
// @ts-ignore
        window['msRequestAnimationFrame'] || timeoutAnimate;

interface Def {
    playerSpeed: number;
    bulletSpeed: number;
    enemySpeed: number;
    difficult: number;
    bulletsPerSec: number;
}

class Game {
    canvas = document.createElement("canvas");
    ctx: CanvasRenderingContext2D;
    // terranPattern;
    shotSound: HTMLAudioElement;
    lastTime = Date.now();
    gameTime = 0;
    isMuted: boolean = false;
    bullets: Bullet[] = [];
    enemies: Enemy[] = [];
    explosions: Explosion[]= [];
    lastFire = Date.now();
    isGameOver : boolean = false;
    isNewRound: boolean = true;
    isRoundCompleted: boolean = false;
    round: number = 0;
    score: number = 0;
    scoreEl: HTMLElement;
    def: Def = {
        playerSpeed: 500,
        bulletSpeed: 1000,
        enemySpeed: 100,
        difficult: 1,
        bulletsPerSec: 3
    };

    playerSpeed: number;
    bulletSpeed: number;
    enemySpeed: number;
    difficult: number;
    bulletsPerSec: number;
    player: Player;
    terrainPattern: CanvasPattern | null = null;

    constructor() {
        this.canvas.height = 600;
        this.canvas.width = 1200;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
       
        document.body.appendChild(this.canvas);
        this.scoreEl = document.getElementById('score') as HTMLElement;
        this.shotSound = document.getElementById('shot-sound') as HTMLAudioElement;

        this.playerSpeed = this.def.playerSpeed; 
        this.bulletSpeed = this.def.bulletSpeed;
        this.enemySpeed = this.def.enemySpeed;
        this.difficult = this.def.difficult;
        this.bulletsPerSec = this.def.bulletsPerSec;

        this.player = new Player(this.playerSpeed, {x: 50, y: 50});
    }

    main = () => {
        const now = Date.now();
        const dt = (now - this.lastTime) / 1000;
        if (dt < 100) {
            this.update(dt);
            this.render();
            this.lastTime = now;
        }
        requestAnimFrame(this.main);
    };

   init = () => {
        const terrain = resources.get('src/img/terrain.png');
        if (terrain == null) {
            // wait for some time and init again
            return;
        }
        this.terrainPattern = this.ctx.createPattern(terrain, 'repeat');
        this.shotSound.volume = 1;
        const playAgain = document.getElementById('play-again-button');
        const mute = document.getElementById('mute') as HTMLInputElement;
        const newRoundBtn = document.getElementById('new-round-button');
        if (playAgain) {
            playAgain.addEventListener('click', () => {
                this.reset(); //play again after defeat
            });
        }
        if (mute) {
            mute.addEventListener('mousedown', (e) => {
                this.isMuted = !mute.checked;
                e.preventDefault();
            });
        }
        if (newRoundBtn) {
            newRoundBtn.addEventListener('click', () => {
                this.startNewRound(); //continue playing with the new round
            });
        }

        document.getElementById('start-game-button')?.addEventListener('click', () => {
            const startGame = document.getElementById('start-game');
            const startGameOverlay =  document.getElementById('start-game-overlay');

            if (startGame !== null) {
                startGame.style.display = 'none';
            };

            if (startGameOverlay !== null) {
                startGameOverlay.style.display = 'none';
            }
            this.reset();
            this.lastTime = Date.now();
            this.main();
        });
    };

    update = (dt: number) => {
        this.gameTime += dt;
        this.handleInput(dt);
        this.updateEntities(dt);
        this.checkCollisions();
        this.scoreEl.innerHTML = 'Score: ' + this.score;
    };

    updateEntities = (dt: number) => {
        this.player.sprite.update(dt);
        this.bullets.forEach((bullet) => bullet.update(dt));
        this.bullets = this.bullets.filter((bullet) => bullet.pos.y >= 0);
       
        //update all the enemies
        this.enemies.forEach(enemy => {
            enemy.update(dt, this.enemySpeed);
        });
       
        // moving down after edge
        if (!this.isGameOver && this.enemies.length > 0) {
            const dxRight = getTheRightmost(this.enemies) - (this.canvas.width - this.enemies[0].sprite.size.width - 15);
            const dxLeft = 15 - getTheLeftmost(this.enemies);
            if (dxRight > 0) {
                this.enemies.forEach(enemy => {
                    // TODO change it to 'moveEnemy'
                    enemy.pos.x -= dxRight;
                    enemy.pos.y +=30;
                });

                this.enemySpeed = -Math.abs(this.enemySpeed);

            } else if (dxLeft > 0) {
                this.enemies.forEach(enemy => {
                    enemy.pos.y += 30;
                    enemy.pos.x +=dxLeft;
                })
                this.enemySpeed = Math.abs(this.enemySpeed);

            };
        }

        this.explosions.forEach(explosion => {
            explosion.sprite.update(dt);
        });
        // @TODO think how to combine it with other filterings
        this.explosions = this.explosions.filter(explosion => !explosion.sprite.done)

    };

    handleInput = (dt: number) => {
        if (input.isDown('LEFT') || input.isDown('a')) {
            this.player.pos.x -= this.playerSpeed * dt;
        }

        if (input.isDown('RIGHT') || input.isDown('d')) {
            this.player.pos.x += this.playerSpeed * dt;
        }

        if (
            input.isDown('SPACE') && !this.isGameOver && !this.isRoundCompleted &&
            Date.now() - this.lastFire > Math.floor(1000 / this.bulletsPerSec)
        ) {
            const x = this.player.pos.x + this.player.sprite.size.width / 2 - 3;
            const y = this.player.pos.y - 1;

            this.bullets.push(
                new Bullet(this.bulletSpeed, {x, y})
            );
            if (!this.isMuted) {
                this.shotSound.play();
            }
            this.lastFire = Date.now();
        }

    };
    checkCollisions = () => {
        this.checkPlayerBounds();
        this.enemies.forEach(enemy => {
            const pos = enemy.pos;
            const size = enemy.sprite.size;
            
            this.bullets.forEach(bullet => {
                const pos2 = bullet.pos;
                const size2 = bullet.sprite.size;
                
                if (boxCollides(pos, size, pos2, size2)) {
                    // @TODO add this variable
                    enemy.shouldBeRemoved = true;
                    // @TODO move to increaseSpeed
                    this.enemySpeed += this.enemySpeed < 0 ? -3 * this.difficult : 3 * this.difficult;
                    this.score += 100;

                    this.explosions.push(new Explosion(pos));
                    bullet.shouldBeRemoved = true;

                    if (this.enemies.filter(enemy => !enemy.shouldBeRemoved).length === 0) {
                        this.endRound();
                    }
                }
            });

            this.bullets = this.bullets.filter(bullet => !bullet.shouldBeRemoved);

            if (boxCollides(pos, size, 
                {
                    x: 0, 
                    y: this.player.pos.y - 10
                },
                {
                    width: this.canvas.width,
                    height: this.player.sprite.size.height
                }
            )) {
                this.gameOver();
            }
        });
        // @TODO move to smth like 'removeKilledEntitites
        this.enemies = this.enemies.filter(enemy => !enemy.shouldBeRemoved);

     

    };
    checkPlayerBounds = () => {
        if (this.player.pos.x < 5) {
            this.player.pos.x = 5;
        }
        else if (this.player.pos.x > (this.canvas.width - this.player.sprite.size.width - 5)) {
            this.player.pos.x = this.canvas.width - this.player.sprite.size.width - 5;
        }
    };
    render = () => {
        if (!this.terrainPattern) {
            return;
        }
        
        this.ctx.fillStyle = this.terrainPattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isGameOver && !this.isRoundCompleted) {
            renderEntity(this.ctx, this.player);
            renderEntities(this.ctx, this.bullets);
            renderEntities(this.ctx, this.enemies);
            renderEntities(this.ctx, this.explosions);
        }
    };


    gameOver = () => {
        const gameOver = document.getElementById('game-over');
        if (gameOver !== null) {
            gameOver.style.display = "block";
        }

        const gameOverOverlay = document.getElementById('game-over-overlay');
        
        if (gameOverOverlay !== null) {
            gameOverOverlay.style.display = "block";
        }
        this.isGameOver = true;
    };

    endRound = () => {
        this.isRoundCompleted = true;

        const newRound = document.getElementById('new-round');
        if (newRound !== null) {
            newRound.style.display = 'block';
        }
        const newRoundOverlay = document.getElementById('new-round-overlay');
        if (newRoundOverlay !== null) { 
            newRoundOverlay.style.display = 'block';
        }
        this.score += 1000;
        this.canvas.style.display = 'none';
        this.bullets = [];
    };
    startNewRound = () => {

        this.round += 1;
        this.enemySpeed = this.def.enemySpeed + 20 * this.round;

        const newRound = document.getElementById('new-round');
        if (newRound !== null) {
            newRound.style.display = 'none';
        }
        const newRoundOverlay = document.getElementById('new-round-overlay');
        if (newRoundOverlay !== null) {
            newRoundOverlay.style.display = 'none';
        }
        this.resetEveryRound();
        this.isRoundCompleted = false;
        const round = document.getElementById('round');
        if (round !== null) {
            round.innerHTML = 'Round ' + this.round;
        }

        console.log('Starting new round');
    };

    resetEveryRound = () => {
        this.canvas.style.display = 'block';
        this.enemies = [];
        this.bullets = [];
        this.player.pos = { 
            x: (this.canvas.width - this.player.sprite.size.width) / 2,
            y:  this.canvas.height - this.player.sprite.size.height - 5
        };
        this.isNewRound = true;
        this.enemies = addEnemies(this.enemySpeed);
    };
    reset = () => {
        const gameOver = document.getElementById('game-over')
        if (gameOver !== null) {
            gameOver.style.display = 'none';
        }

       const gameOverOverlay =  document.getElementById('game-over-overlay')

        if (gameOverOverlay !== null) {
            gameOverOverlay.style.display = 'none';
        }
        
        this.isGameOver = false;
        this.round = 1;
        this.playerSpeed = this.def.playerSpeed;  // in case if we will want to add some bonuses
        this.bulletSpeed = this.def.bulletSpeed;
        this.enemySpeed = this.def.enemySpeed;
        this.difficult = this.def.difficult;
        this.bulletsPerSec = this.def.bulletsPerSec;
        this.gameTime = 0;
        this.score = 0;
        this.resetEveryRound();
        this.enemies = addEnemies(this.enemySpeed);
        const round = document.getElementById('round');
        if (round !== null) {
            round.innerHTML = 'Round ' + this.round;
        }
        console.log('Starting new game');
    };
}

interface Position {x: number, y: number}
interface Size { width: number; height: number}

interface Entity {
  sprite: Sprite;
  pos: Position;
  shouldBeRemoved: boolean;
}

class Enemy implements Entity {
    sprite: Sprite;
    pos: Position;
    enemySpeed: number;
    shouldBeRemoved: boolean;

    constructor(enemySpeed: number, pos: Position) {
        this.sprite = new Sprite('src/img/sprites.png', {x: 0, y: 75}, {width: 68, height: 48}, 2, [0, 1]);
        this.enemySpeed = enemySpeed;
        this.pos = pos;
        this.shouldBeRemoved = false;
    }

    update = (dt: number, enemySpeed: number) => {
        this.pos.x += enemySpeed * dt;
        this.sprite.update(dt);
    }
}


class Explosion implements Entity {
    sprite: Sprite;
    pos: Position;
    shouldBeRemoved: boolean;
    constructor(pos: Position) {
        this.pos = pos;
        this.sprite = new Sprite('src/img/sprites.png', { x: 0, y: 128}, {width: 68, height: 68}, 20, [0, 1, 2], undefined, true);
        this.shouldBeRemoved = false;
    }
}

class Player implements Entity {
    sprite: Sprite;
    pos: Position;
    playerSpeed: number;
    shouldBeRemoved: boolean;
    constructor(playerSpeed: number, pos: Position) {
        this.sprite = new Sprite('src/img/sprites.png', {x: 0, y: 0}, {width: 75, height: 56});
        this.playerSpeed = playerSpeed;
        this.pos = pos;
        this.shouldBeRemoved = false;
    }
}

class Bullet implements Entity {
    pos: Position;
    sprite: Sprite;
    bulletSpeed: number;
    shouldBeRemoved: boolean;
    constructor(bulletSpeed: number, pos: Position) {
        this.pos = pos;
        this.sprite = new Sprite('src/img/sprites.png', {x: 0, y: 62}, {width: 7, height: 7});
        this.bulletSpeed = bulletSpeed;
        this.shouldBeRemoved = false;
    }
    update = (dt: number) => {
        this.pos.y -= this.bulletSpeed * dt;
    }
}


class Sprite {
    pos: Position;
    size: Size;
    speed: number;
    frames: number[];
    private index = 0;
    url: string;
    dir: string;
    once: boolean;
    done: boolean = false;

    constructor(url: string, pos: Position, size: Size, speed?: number, frames?: number[], dir?: string, once?: boolean) {
        this.pos = pos;
        this.size = size;
        this.speed = typeof speed === 'number' ? speed : 0;
        this.frames = frames ?? [];
        this.index = 0;
        this.url = url;
        this.dir = dir || 'horizontal';
        this.once = once || false;
    }

    update = (dt: number) => {
        this.index += this.speed * dt;
    };

    render = (ctx: CanvasRenderingContext2D) => {
        let frame: number;
        if (this.speed > 0) {
            const max = this.frames.length;
            const idx = Math.floor(this.index);
            frame = this.frames[idx % max];

            if (this.once && idx >= max) {
                this.done = true;
                return;
            }
        }
        else {
            frame = 0;
        }


        let x = this.pos.x;
        let y = this.pos.y;

        if (this.dir == 'vertical') {
            y += frame * this.size.height;
        }
        else {
            x += frame * this.size.width;
        }

        const image = resources.get(this.url);
        if (!image) {
            return;
            // @TODO wait some time for loading
        }
        ctx.drawImage(image,
            x, y,
            this.size.width, this.size.height,
            0, 0,
            this.size.width, this.size.height);
    }
}

//other functions

const addEnemies = (enemySpeed: number) => {
    const enemies = [];
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 3; j++) {
            const enemy = new Enemy(enemySpeed, {x: i * 86 + 25, y: j * 80 + 5});
            enemies.push(enemy);
        }
    }
    return enemies;
}

const collides = (
    x: number,
    y: number,
    r: number,
    b: number,
    x2: number,
    y2: number,
    r2: number,
    b2:number
): boolean =>  !(r <= x2 || x > r2 || b <= y2 || y > b2);

const boxCollides = (pos: Position, size: Size, pos2: Position, size2: Size): boolean => {
    return collides(pos.x, pos.y,
        pos.x + size.width, pos.y + size.height,
        pos2.x, pos2.y,
        pos2.x + size2.width, pos2.y + size2.height);
}

const renderEntity = (ctx: CanvasRenderingContext2D, entity: Entity) => {
    ctx.save();
    ctx.translate(entity.pos.x, entity.pos.y);
    entity.sprite.render(ctx);
    ctx.restore();
}

const renderEntities = (ctx: CanvasRenderingContext2D, list: Entity[]) => list.forEach(
    entity => renderEntity(ctx, entity),
);

const getTheLeftmost = (enemies: Enemy[]): number => {
    if (enemies.length === 0) {
        return 0;
    }
    const min = enemies
        .map(enemy => enemy.pos.x)
        .reduce(
            (prev, current) => Math.min(prev, current),
            enemies[0].pos.x,
        );
    return Math.floor(min);
}

const getTheRightmost = (enemies: Enemy[]): number => {
    if (enemies.length === 0) {
        return 10000;
    }
    const max = enemies
        .map(enemy => enemy.pos.x)
        .reduce(
            (prev, current) => Math.max(current, prev), 
            enemies[0].pos.x
        );
    return Math.floor(max);
}

// Load resources and start the game

window.addEventListener('load', () => {
    resources.load([
        'src/img/sprites.png',
        'src/img/terrain.png'
    ]);
    resources.onReady(() => {
        const game = new Game();
        game.init();
    });

});