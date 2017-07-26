

var Resources = require('./resources');
var Input = require('./input');
var resources = new Resources();
var input = new Input();

var requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


var Game = function () {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.height = 600;
    this.canvas.width = 1200;
    document.body.appendChild(this.canvas);

    this.terrainPattern;
    this.shotSound;

    this.lastTime;
    this.gameTime = 0;
    this.isMuted = false;

    this.bullets = [];
    this.enemies = [];
    this.explosions = [];

    this.lastFire = Date.now();


    this.isGameOver;
    this.isNewRound = true;
    this.isRoundCompleted = false;

    this.round = 1;
    this.score = 0;

    this.scoreEl = document.getElementById('score');

    this.def = {
        playerSpeed: 500,
        bulletSpeed: 1000,
        enemySpeed: 100,
        difficult: 1,
        bulletsPerSec: 3
    }

    this.playerSpeed;
    this.bulletSpeed;
    this.enemySpeed;
    this.difficult;
    this.bulletsPerSec = this.def.bulletsPerSec;
    var self = this;
    this.player = new Player(this.playerSpeed, [50, 50]);

    this.main = function () {
        var now = Date.now();
        var dt = (now - self.lastTime) / 1000.0;
        if (dt < 100) {
            self.update(dt);
            self.render();
            self.lastTime = now;
        }

        requestAnimFrame(self.main);
    }

    this.init = function () {
        self.terrainPattern = self.ctx.createPattern(resources.get('img/terrain.png'), 'repeat');
        self.shotSound = document.getElementById('shot-sound');
        self.shotSound.volume = 1;
        var playAgain = document.getElementById('play-again-button');
        var mute = document.getElementById('mute');
        var newRoundBtn = document.getElementById('new-round-button');


        if (playAgain) {
            playAgain.addEventListener('click', function () {
                self.reset();   //play again after defeat
            });
        }
        if (mute) {
            mute.addEventListener('mousedown', function (e) {
                self.isMuted = !e.target.checked;
                e.preventDefault();
            });
        }
        if (newRoundBtn) {
            newRoundBtn.addEventListener('click', function () {
                self.startNewRound();   //continue playing with the new round
            });
        }



        document.getElementById('start-game-button').addEventListener('click', function () {
            document.getElementById('start-game').style.display = 'none';
            document.getElementById('start-game-overlay').style.display = 'none';
            self.reset();
            self.lastTime = Date.now();
            self.main();
        });


    }
    this.init();
}

Game.prototype = {
    update: function (dt) {
        this.gameTime += dt;
        this.handleInput(dt);
        this.updateEntities(dt);
        this.checkCollisions();
        this.scoreEl.innerHTML = 'Score: ' + this.score;
    },

    updateEntities: function (dt) {
        this.player.sprite.update(dt);

        //update Bullets
        for (var i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update(dt);
            if (this.bullets[i].pos[1] < 0) {
                this.bullets.splice(i, 1);
                i--;
            }
        }
        //update all the enemies
        for (var i = 0; i < this.enemies.length; i++) {
            this.enemies[i].update(dt, this.enemySpeed);
        }

        // moving down after edge
        if (!this.isGameOver && this.enemies.length > 0) {

            var dxRight = getTheRightmost(this.enemies)-(this.canvas.width - this.enemies[0].sprite.size[0] - 15);
            var dxLeft = 15 - getTheLeftmost(this.enemies);

            if (dxRight>0) {
                for (var i = 0; i < this.enemies.length; i++) {
                    this.enemies[i].pos[1] += 30;
                    this.enemies[i].pos[0] -=dxRight;
                }

                this.enemySpeed = -Math.abs(this.enemySpeed);

            } else if (dxLeft>0) {
                for (var i = 0; i < this.enemies.length; i++) {
                    this.enemies[i].pos[1] += 30;
                    this.enemies[i].pos[0] +=dxLeft;
                }
                this.enemySpeed = Math.abs(this.enemySpeed);

            };
        }

        for (var i = 0; i < this.explosions.length; i++) {
            this.explosions[i].sprite.update(dt);

            if (this.explosions[i].sprite.done) {
                this.explosions.splice(i, 1);
                i--;
            }
        }

    },

    handleInput: function (dt) {
        if (input.isDown('LEFT') || input.isDown('a')) {
            this.player.pos[0] -= this.playerSpeed * dt;
        }

        if (input.isDown('RIGHT') || input.isDown('d')) {
            this.player.pos[0] += this.playerSpeed * dt;
        }

        if (input.isDown('SPACE') && !this.isGameOver && !this.isRoundCompleted &&
            Date.now() - this.lastFire > Math.floor(1000 / this.bulletsPerSec)) {
            var x = this.player.pos[0] + this.player.sprite.size[0] / 2 - 3;
            var y = this.player.pos[1] - 1;

            this.bullets.push(
                new Bullet(this.bulletSpeed, [x, y])
            );
            if (!this.isMuted) {
                this.shotSound.play();
            }
            this.lastFire = Date.now();
        }

    },
    checkCollisions: function () {
        this.checkPlayerBounds();
        for (var i = 0; i < this.enemies.length; i++) {
            var pos = this.enemies[i].pos;
            var size = this.enemies[i].sprite.size;

            for (var j = 0; j < this.bullets.length; j++) {
                var pos2 = this.bullets[j].pos;
                var size2 = this.bullets[j].sprite.size;

                if (boxCollides(pos, size, pos2, size2)) {
                    //remove the enemy
                    this.enemies.splice(i, 1);
                    i--;

                    this.enemySpeed += this.enemySpeed < 0 ? -3 * this.difficult : 3 * this.difficult;
                    this.score += 100;
                    // add an explosion
                    this.explosions.push(new Explosion(pos));


                    //remove the bullet and stop the iteration
                    this.bullets.splice(j, 1);
                    if (this.enemies.length === 0) {
                        this.endRound();
                    }
                    break;
                }
            }

            if (boxCollides(pos, size, [0, this.player.pos[1] - 10], [this.canvas.width, this.player.sprite.size[1]])) {
                this.gameOver();
            }
        }
    },
    checkPlayerBounds: function () {
        if (this.player.pos[0] < 5) {
            this.player.pos[0] = 5;
        }
        else if (this.player.pos[0] > (this.canvas.width - this.player.sprite.size[0] - 5)) {
            this.player.pos[0] = this.canvas.width - this.player.sprite.size[0] - 5;
        }
    },
    render: function () {
        this.ctx.fillStyle = this.terrainPattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isGameOver && !this.isRoundCompleted) {
            renderEntity(this.ctx, this.player);
            renderEntities(this.ctx, this.bullets);
            renderEntities(this.ctx, this.enemies);
            renderEntities(this.ctx, this.explosions);
        }
    },


    gameOver: function () {
        document.getElementById('game-over').style.display = "block";
        document.getElementById('game-over-overlay').style.display = "block";
        this.isGameOver = true;
    },

    endRound: function () {
        this.isRoundCompleted = true;
        document.getElementById('new-round').style.display = 'block';
        document.getElementById('new-round-overlay').style.display = 'block';
        this.score += 1000;
        this.canvas.style.display = 'none';
    },
    startNewRound: function () {

        this.round += 1;
        this.enemySpeed = this.def.enemySpeed + 20 * this.round;

        document.getElementById('new-round').style.display = 'none';
        document.getElementById('new-round-overlay').style.display = 'none';
        this.resetEveryRound();
        this.isRoundCompleted = false;
        document.getElementById('round').innerHTML = 'Round ' + this.round; // into var

        console.log('Starting new round');
    },
    resetEveryRound: function () {
        this.canvas.style.display = 'block';
        this.enemies = [];
        this.bullets = [];
        this.player.pos = [(this.canvas.width - this.player.sprite.size[0]) / 2, this.canvas.height - this.player.sprite.size[1] - 5];
        this.isNewRound = true;
        this.enemies = addEnemies(this.enemySpeed);
    },
    reset: function () {
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('game-over-overlay').style.display = 'none';
        this.isGameOver = false;
        this.round = 1;
        this.playerSpeed = this.def.playerSpeed;  // in case if we will want to add some bonuses
        this.bulletSpeed = this.def.bulletSpeed;
        this.enemySpeed = this.def.enemySpeed;
        this.difficult = this.def.difficult;
        this.gameTime = 0;
        this.score = 0;
        this.resetEveryRound();
        this.enemies = addEnemies(this.enemySpeed);
        document.getElementById('round').innerHTML = 'Round ' + this.round;
        console.log('Starting new game');
    },
}

var Enemy = function (enemySpeed, pos) {

    this.sprite = new Sprite('img/sprites.png', [0, 75], [68, 48], 2, [0, 1])
    this.enemySpeed = enemySpeed;
    this.pos = pos;
}

Enemy.prototype = {
    update: function (dt, enemySpeed) {
        this.pos[0] += enemySpeed * dt;
        this.sprite.update(dt);
    }
}

var Explosion = function (pos) {
    this.pos = pos;
    this.sprite = new Sprite('img/sprites.png',
        [0, 128],
        [68, 68],
        20,
        [0, 1, 2],
        null,
        true)
}

var Player = function (playerSpeed, pos) {
    this.sprite = new Sprite('img/sprites.png', [0, 0], [75, 56]);
    this.playerSpeed = playerSpeed;
    this.pos = pos;
}

var Bullet = function (bulletSpeed, pos) {
    this.pos = pos;
    this.sprite = new Sprite('img/sprites.png', [0, 62], [7, 7])
    this.bulletSpeed = bulletSpeed;
};

Bullet.prototype = {

    update: function (dt) {
        this.pos[1] -= this.bulletSpeed * dt;
    }
};

var Sprite = function (url, pos, size, speed, frames, dir, once) {
    this.pos = pos;
    this.size = size;
    this.speed = typeof speed === 'number' ? speed : 0;
    this.frames = frames;
    this._index = 0;
    this.url = url;
    this.dir = dir || 'horizontal';
    this.once = once;
};

Sprite.prototype = {

    update: function (dt) {
        this._index += this.speed * dt;
    },
    render: function (ctx) {
        var frame;
        if (this.speed > 0) {
            var max = this.frames.length;
            var idx = Math.floor(this._index);
            frame = this.frames[idx % max];

            if (this.once && idx >= max) {
                this.done = true;
                return;
            }
        }
        else {
            frame = 0;
        }


        var x = this.pos[0];
        var y = this.pos[1];

        if (this.dir == 'vertical') {
            y += frame * this.size[1];
        }
        else {
            x += frame * this.size[0];
        }

        ctx.drawImage(resources.get(this.url),
            x, y,
            this.size[0], this.size[1],
            0, 0,
            this.size[0], this.size[1]);
    }
}
//other functions

var addEnemies = function (enemySpeed) {
    var enemies = [];
    for (var i = 0; i < 10; i++) {
        for (var j = 0; j < 3; j++) {
            enemies.push(
                new Enemy(enemySpeed, [i * 86 + 25, j * 80 + 5]));
        }
    }
    return enemies;
}

var collides = function (x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 || b <= y2 || y > b2);
}

var boxCollides = function (pos, size, pos2, size2) {
    return collides(pos[0], pos[1],
        pos[0] + size[0], pos[1] + size[1],
        pos2[0], pos2[1],
        pos2[0] + size2[0], pos2[1] + size2[1]);
}

var renderEntity = function (ctx, entity) {
    ctx.save();
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
}

var renderEntities = function (ctx, list) {
    for (var i = 0; i < list.length; i++) {
        renderEntity(ctx, list[i]);
    }
}

var getTheLeftmost = function (enemies) {

    var x = enemies[0].pos[0];
    for (var i = 1; i < enemies.length; i++) {
        var x1 = enemies[i].pos[0]
        if (x1 < x) { x = x1 };
    }
    return Math.floor(x);
}

var getTheRightmost = function (enemies) {
    var x = enemies[0].pos[0];
    for (var i = 1; i < enemies.length; i++) {
        var x1 = enemies[i].pos[0]
        if (x1 > x) { x = x1 };
    }

    return Math.floor(x);
}

// Load resources and start the game

window.addEventListener('load', function () {

    resources.load([
        'img/sprites.png',
        'img/terrain.png'
    ]);
    resources.onReady(function () {
        var game = new Game();
    });

});