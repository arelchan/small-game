// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');

// 游戏常量
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 15;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 40;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ENEMY_SPEED = 2;
const ENEMY_SPAWN_RATE = 1500; // 毫秒

// 游戏状态
let gameRunning = false;
let score = 0;
let lives = 3;
let animationId;
let lastEnemySpawn = 0;

// 游戏对象
const player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: PLAYER_SPEED,
    color: '#00ff00',
    dx: 0,
    dy: 0
};

const bullets = [];
const enemies = [];

// 键盘控制
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    a: false,
    d: false,
    w: false,
    s: false,
    ' ': false
};

// 事件监听
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
    
    // 空格键射击
    if (e.key === ' ' && gameRunning) {
        createBullet();
    }
});

startButton.addEventListener('click', () => {
    if (!gameRunning) {
        startGame();
    }
});

// 游戏函数
function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    bullets.length = 0;
    enemies.length = 0;
    player.x = canvas.width / 2 - PLAYER_WIDTH / 2;
    player.y = canvas.height - PLAYER_HEIGHT - 20;
    
    updateScore();
    updateLives();
    
    startButton.textContent = '游戏进行中';
    startButton.disabled = true;
    
    // 启动游戏循环
    animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新玩家位置
    updatePlayerPosition();
    
    // 绘制玩家
    drawPlayer();
    
    // 更新和绘制子弹
    updateBullets();
    
    // 更新和绘制敌人
    if (timestamp - lastEnemySpawn > ENEMY_SPAWN_RATE) {
        createEnemy();
        lastEnemySpawn = timestamp;
    }
    updateEnemies();
    
    // 碰撞检测
    checkCollisions();
    
    // 检查游戏状态
    if (lives <= 0) {
        gameOver();
        return;
    }
    
    // 继续游戏循环
    animationId = requestAnimationFrame(gameLoop);
}

function updatePlayerPosition() {
    // 重置移动方向
    player.dx = 0;
    player.dy = 0;
    
    // 水平移动
    if ((keys.ArrowLeft || keys.a) && player.x > 0) {
        player.dx = -player.speed;
    }
    if ((keys.ArrowRight || keys.d) && player.x < canvas.width - player.width) {
        player.dx = player.speed;
    }
    
    // 垂直移动
    if ((keys.ArrowUp || keys.w) && player.y > canvas.height / 2) {
        player.dy = -player.speed;
    }
    if ((keys.ArrowDown || keys.s) && player.y < canvas.height - player.height) {
        player.dy = player.speed;
    }
    
    // 更新位置
    player.x += player.dx;
    player.y += player.dy;
    
    // 边界检查
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.beginPath();
    // 绘制三角形飞船
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
}

function createBullet() {
    const bullet = {
        x: player.x + (player.width / 2) - (BULLET_WIDTH / 2),
        y: player.y,
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        speed: BULLET_SPEED,
        color: '#ffff00'
    };
    
    bullets.push(bullet);
    
    // 播放射击音效
    // const shootSound = new Audio('shoot.wav');
    // shootSound.play();
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 移动子弹
        bullet.y -= bullet.speed;
        
        // 绘制子弹
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        
        // 移除超出屏幕的子弹
        if (bullet.y < 0) {
            bullets.splice(i, 1);
        }
    }
}

function createEnemy() {
    // 随机位置生成敌人
    const enemy = {
        x: Math.random() * (canvas.width - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        speed: ENEMY_SPEED,
        color: '#ff0000'
    };
    
    enemies.push(enemy);
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // 移动敌人
        enemy.y += enemy.speed;
        
        // 绘制敌人
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.closePath();
        ctx.fill();
        
        // 移除超出屏幕的敌人
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            // 减少生命值
            lives--;
            updateLives();
        }
    }
}

function checkCollisions() {
    // 检查子弹与敌人的碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                // 碰撞发生，移除子弹和敌人
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                
                // 增加分数
                score += 10;
                updateScore();
                
                // 播放爆炸音效
                // const explosionSound = new Audio('explosion.wav');
                // explosionSound.play();
                
                // 防止同一个子弹打中多个敌人
                break;
            }
        }
    }
    
    // 检查玩家与敌人的碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // 碰撞发生，移除敌人
            enemies.splice(i, 1);
            
            // 减少生命值
            lives--;
            updateLives();
            
            // 闪烁玩家表示受伤
            flashPlayer();
        }
    }
}

function flashPlayer() {
    // 玩家闪烁效果
    const originalColor = player.color;
    player.color = '#ff0000';
    
    setTimeout(() => {
        player.color = originalColor;
    }, 200);
}

function updateScore() {
    scoreElement.textContent = score;
}

function updateLives() {
    livesElement.textContent = lives;
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // 更新开始按钮
    startButton.textContent = '重新开始';
    startButton.disabled = false;
    
    // 绘制游戏结束文本
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
} 