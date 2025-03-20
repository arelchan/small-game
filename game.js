// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const startScreen = document.getElementById('startScreen');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const weaponIndicator = document.getElementById('weaponIndicator');

// 游戏常量
const CELL_SIZE = 40; // 迷宫单元格大小
const PLAYER_SIZE = 30; // 玩家大小
const BULLET_SIZE = 8; // 子弹大小
const ENEMY_SIZE = 25; // 敌人大小
const PLAYER_SPEED = 3;
const BULLET_SPEED = 5;
const ENEMY_SPEED = 1.5;
const ENEMY_SPAWN_RATE = 5000; // 毫秒
const SUPPLY_SPAWN_RATE = 10000; // 补给生成间隔
const SUPPLY_DURATION = 15000; // 补给持续时间

// 武器类型
const WEAPON_TYPES = {
    NORMAL: 'normal',
    SHOTGUN: 'shotgun',
    FLAMETHROWER: 'flamethrower',
    LASER: 'laser',
    RAPID_FIRE: 'rapid_fire'
};

// 补给类型
const SUPPLY_TYPES = {
    HEALTH: 'health',
    SHIELD: 'shield',
    WEAPON: 'weapon'
};

// 定义迷宫
const MAZE_COLS = 12;
const MAZE_ROWS = 16;
// 0=通道, 1=墙壁
const maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// 更新Canvas尺寸以适应迷宫
canvas.width = MAZE_COLS * CELL_SIZE;
canvas.height = MAZE_ROWS * CELL_SIZE;

// 游戏状态
let gameRunning = false;
let score = 0;
let lives = 3;
let animationId;
let lastEnemySpawn = 0;
let lastSupplySpawn = 0;
let supplies = [];
let playerWeapon = WEAPON_TYPES.NORMAL;
let weaponTimer = 0;
let playerShield = 0;

// 游戏对象
const player = {
    x: CELL_SIZE * 1.5 - PLAYER_SIZE / 2, // 起始位置
    y: CELL_SIZE * 1.5 - PLAYER_SIZE / 2,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: PLAYER_SPEED,
    color: '#00ff00',
    dx: 0,
    dy: 0,
    // 按角度旋转（0 = 向上，值以弧度计算）
    angle: 0,
    weapon: WEAPON_TYPES.NORMAL,
    shield: 0
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

// 添加鼠标位置追踪
let mouseX = 0;
let mouseY = 0;

// 添加鼠标事件监听
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    if (gameRunning) {
        createBullet();
    }
});

// 事件监听
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        // 阻止箭头键的默认行为（页面滚动）
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
    
    // 空格键射击
    if (e.key === ' ' && gameRunning) {
        createBullet();
        e.preventDefault(); // 阻止空格键的默认行为
    }
});

// 确保在页面加载完成后添加事件监听
document.addEventListener('DOMContentLoaded', () => {
    // 确保开始按钮事件监听器
    startButton.addEventListener('click', () => {
        if (!gameRunning) {
            startGame();
        }
    });

    // 添加初始化显示逻辑
    startScreen.style.display = 'flex';
    startButton.disabled = false;
});

// 初始化墙体
function initializeWalls() {
    walls = []; // 清空墙体

    // 遍历迷宫，寻找连续的墙体
    for (let row = 0; row < MAZE_ROWS; row++) {
        for (let col = 0; col < MAZE_COLS; col++) {
            if (maze[row][col] === 1) {
                // 检查是否有相邻的墙体
                let wallLength = 1;
                let wallHeight = 1;
                
                // 向右检查
                while (col + wallLength < MAZE_COLS && maze[row][col + wallLength] === 1) {
                    wallLength++;
                }
                
                // 向下检查
                while (row + wallHeight < MAZE_ROWS) {
                    let isWallRow = true;
                    for (let i = 0; i < wallLength; i++) {
                        if (maze[row + wallHeight][col + i] !== 1) {
                            isWallRow = false;
                            break;
                        }
                    }
                    if (!isWallRow) break;
                    wallHeight++;
                }
                
                // 创建墙体
                if (wallLength > 1 || wallHeight > 1) {
                    // 根据墙体大小选择形状
                    if (wallLength > wallHeight) {
                        // 水平墙体
                        walls.push({
                            type: 'rect',
                            x: col * CELL_SIZE,
                            y: row * CELL_SIZE,
                            width: wallLength * CELL_SIZE,
                            height: wallHeight * CELL_SIZE,
                            color: '#333'
                        });
                    } else if (wallHeight > wallLength) {
                        // 垂直墙体
                        walls.push({
                            type: 'rect',
                            x: col * CELL_SIZE,
                            y: row * CELL_SIZE,
                            width: wallLength * CELL_SIZE,
                            height: wallHeight * CELL_SIZE,
                            color: '#333'
                        });
                    } else {
                        // 正方形墙体
                        walls.push({
                            type: 'rect',
                            x: col * CELL_SIZE,
                            y: row * CELL_SIZE,
                            width: wallLength * CELL_SIZE,
                            height: wallHeight * CELL_SIZE,
                            color: '#333'
                        });
                    }
                    
                    // 标记已处理的墙体
                    for (let r = row; r < row + wallHeight; r++) {
                        for (let c = col; c < col + wallLength; c++) {
                            maze[r][c] = 2; // 使用2标记已处理的墙体
                        }
                    }
                }
            }
        }
    }
    
    // 添加一些装饰性的斜角墙体
    for (let row = 0; row < MAZE_ROWS - 1; row++) {
        for (let col = 0; col < MAZE_COLS - 1; col++) {
            if (maze[row][col] === 1 && Math.random() < 0.2) { // 20%的概率添加斜角
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                
                // 随机选择斜角方向
                if (Math.random() < 0.5) {
                    walls.push({
                        type: 'triangle',
                        points: [
                            {x: x, y: y},
                            {x: x + CELL_SIZE, y: y},
                            {x: x, y: y + CELL_SIZE}
                        ],
                        color: '#333'
                    });
                } else {
                    walls.push({
                        type: 'triangle',
                        points: [
                            {x: x + CELL_SIZE, y: y},
                            {x: x, y: y + CELL_SIZE},
                            {x: x + CELL_SIZE, y: y + CELL_SIZE}
                        ],
                        color: '#333'
                    });
                }
                
                maze[row][col] = 2;
            }
        }
    }
}

// 游戏函数
function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    bullets.length = 0;
    enemies.length = 0;
    supplies.length = 0;
    
    // 设置玩家初始位置
    player.x = CELL_SIZE * 1.5 - PLAYER_SIZE / 2;
    player.y = CELL_SIZE * 1.5 - PLAYER_SIZE / 2;
    player.angle = 0;
    player.weapon = WEAPON_TYPES.NORMAL;
    player.shield = 0;
    
    // 初始化墙体
    initializeWalls();
    
    updateScore();
    updateLives();
    updateWeaponIndicator();
    
    // 隐藏开始界面
    startScreen.style.display = 'none';
    startButton.disabled = true;
    
    // 启动游戏循环
    animationId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制迷宫
    drawMaze();
    
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
    
    // 更新和绘制补给
    if (timestamp - lastSupplySpawn > SUPPLY_SPAWN_RATE) {
        createSupply();
        lastSupplySpawn = timestamp;
    }
    updateSupplies();
    
    // 检查武器时间
    if (weaponTimer && Date.now() > weaponTimer) {
        player.weapon = WEAPON_TYPES.NORMAL;
        weaponTimer = 0;
        updateWeaponIndicator();
    }
    
    // 更新护盾
    if (player.shield > 0) {
        player.shield = Math.max(0, player.shield - 0.1);
    }
    
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

// 绘制迷宫
function drawMaze() {
    // 绘制背景
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制所有墙体
    for (const wall of walls) {
        ctx.fillStyle = wall.color;
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        
        switch(wall.type) {
            case 'rect':
                // 绘制主体
                ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
                // 绘制边框
                ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
                // 添加阴影效果
                ctx.fillStyle = '#222';
                ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(wall.points[0].x, wall.points[0].y);
                ctx.lineTo(wall.points[1].x, wall.points[1].y);
                ctx.lineTo(wall.points[2].x, wall.points[2].y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
    }
}

// 检查点是否在三角形内部
function isPointInTriangle(px, py, triangle) {
    const {x: x1, y: y1} = triangle.points[0];
    const {x: x2, y: y2} = triangle.points[1];
    const {x: x3, y: y3} = triangle.points[2];
    
    const area = 0.5 * Math.abs(x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    const area1 = 0.5 * Math.abs(px * (y2 - y3) + x2 * (y3 - py) + x3 * (py - y2));
    const area2 = 0.5 * Math.abs(x1 * (py - y3) + px * (y3 - y1) + x3 * (y1 - py));
    const area3 = 0.5 * Math.abs(x1 * (y2 - py) + x2 * (py - y1) + px * (y1 - y2));

    return Math.abs(area - (area1 + area2 + area3)) < 0.01;
}

// 检查位置是否合法（不是墙壁）
function isValidPosition(x, y) {
    for (const wall of walls) {
        switch(wall.type) {
            case 'rect':
                if (x >= wall.x && x <= wall.x + wall.width && 
                    y >= wall.y && y <= wall.y + wall.height) {
                    return false;
                }
                break;
            case 'triangle':
                if (isPointInTriangle(x, y, wall)) {
                    return false;
                }
                break;
            case 'diamond':
                // 简化为到中心的曼哈顿距离检查
                const dx = Math.abs(x - wall.x);
                const dy = Math.abs(y - wall.y);
                if (dx + dy <= wall.radius) {
                    return false;
                }
                break;
            case 'circle':
                const dist = Math.sqrt(Math.pow(x - wall.x, 2) + Math.pow(y - wall.y, 2));
                
                if (dist <= wall.radius) {
                    return false;
                }
                break;
        }
    }
    
    // 检查边界
    if (x < 0 || x >= MAZE_COLS * CELL_SIZE || y < 0 || y >= MAZE_ROWS * CELL_SIZE) {
        return false;
    }
    
    return true;
}

function updatePlayerPosition() {
    // 保存当前位置用于碰撞检测
    const prevX = player.x;
    const prevY = player.y;
    
    // 重置移动方向
    player.dx = 0;
    player.dy = 0;
    
    // 设置移动方向
    if (keys.ArrowLeft || keys.a) {
        player.dx = -player.speed;
    }
    if (keys.ArrowRight || keys.d) {
        player.dx = player.speed;
    }
    if (keys.ArrowUp || keys.w) {
        player.dy = -player.speed;
    }
    if (keys.ArrowDown || keys.s) {
        player.dy = player.speed;
    }
    
    // 计算玩家朝向鼠标的角度
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    player.angle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);
    
    // 尝试更新位置（水平和垂直分开检查，以实现"滑动"效果）
    const newX = player.x + player.dx;
    const newY = player.y + player.dy;
    
    // 检查角落点（左上、右上、左下、右下）是否碰撞
    const cornerSize = 5; // 角点碰撞检测缩小一点，使玩家可以更容易地穿过通道
    
    // 水平移动检测
    if (
        isValidPosition(newX + cornerSize, player.y + cornerSize) &&
        isValidPosition(newX + player.width - cornerSize, player.y + cornerSize) &&
        isValidPosition(newX + cornerSize, player.y + player.height - cornerSize) &&
        isValidPosition(newX + player.width - cornerSize, player.y + player.height - cornerSize)
    ) {
        player.x = newX;
    }
    
    // 垂直移动检测
    if (
        isValidPosition(player.x + cornerSize, newY + cornerSize) &&
        isValidPosition(player.x + player.width - cornerSize, newY + cornerSize) &&
        isValidPosition(player.x + cornerSize, newY + player.height - cornerSize) &&
        isValidPosition(player.x + player.width - cornerSize, newY + player.height - cornerSize)
    ) {
        player.y = newY;
    }
    
    // 防止玩家超出边界
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    if (player.y < 0) player.y = 0;
    if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    ctx.rotate(player.angle);
    
    // 绘制护盾效果
    if (player.shield > 0) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, player.width/2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = player.shield / 100;
        ctx.fillStyle = '#00ffff';
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    
    // 绘制坦克主体
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-player.width/2, -player.height/2, player.width, player.height);
    
    // 绘制坦克履带
    ctx.fillStyle = '#34495e';
    ctx.fillRect(-player.width/2 - 2, -player.height/2, 4, player.height);
    ctx.fillRect(player.width/2 - 2, -player.height/2, 4, player.height);
    
    // 绘制坦克炮塔
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(0, 0, player.width/3, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制坦克炮管
    ctx.fillStyle = '#2c3e50';
    // 炮管长度
    const barrelLength = 12;
    // 炮管宽度
    const barrelWidth = 4;
    
    // 绘制炮管（始终在坦克前方）
    ctx.fillRect(-barrelWidth/2, -player.height/2 - barrelLength, barrelWidth, barrelLength);
    
    // 添加一些细节
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 2;
    ctx.strokeRect(-player.width/2, -player.height/2, player.width, player.height);
    
    ctx.restore();
}

function createBullet() {
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    
    const dx = Math.cos(player.angle);
    const dy = Math.sin(player.angle);
    
    switch(player.weapon) {
        case WEAPON_TYPES.SHOTGUN:
            // 霰弹枪：发射5发子弹
            for (let i = -2; i <= 2; i++) {
                const spread = i * 0.2; // 扩散角度
                const angle = player.angle + spread;
                bullets.push({
                    x: centerX - BULLET_SIZE / 2,
                    y: centerY - BULLET_SIZE / 2,
                    width: BULLET_SIZE,
                    height: BULLET_SIZE,
                    speed: BULLET_SPEED,
                    dx: Math.cos(angle),
                    dy: Math.sin(angle),
                    color: '#ffff00',
                    bounceCount: 0,
                    maxBounces: 2,
                    owner: 'player'
                });
            }
            break;
            
        case WEAPON_TYPES.FLAMETHROWER:
            // 喷火器：发射3发子弹
            for (let i = -1; i <= 1; i++) {
                const spread = i * 0.1;
                const angle = player.angle + spread;
                bullets.push({
                    x: centerX - BULLET_SIZE / 2,
                    y: centerY - BULLET_SIZE / 2,
                    width: BULLET_SIZE,
                    height: BULLET_SIZE,
                    speed: BULLET_SPEED * 0.8,
                    dx: Math.cos(angle),
                    dy: Math.sin(angle),
                    color: '#ff6600',
                    bounceCount: 0,
                    maxBounces: 0,
                    owner: 'player'
                });
            }
            break;
            
        case WEAPON_TYPES.LASER:
            // 激光：发射1发大子弹
            bullets.push({
                x: centerX - BULLET_SIZE,
                y: centerY - BULLET_SIZE,
                width: BULLET_SIZE * 2,
                height: BULLET_SIZE * 2,
                speed: BULLET_SPEED * 1.5,
                dx: dx,
                dy: dy,
                color: '#00ffff',
                bounceCount: 0,
                maxBounces: 0,
                owner: 'player'
            });
            break;
            
        case WEAPON_TYPES.RAPID_FIRE:
            // 快速射击：发射3发子弹
            for (let i = 0; i < 3; i++) {
                bullets.push({
                    x: centerX - BULLET_SIZE / 2,
                    y: centerY - BULLET_SIZE / 2,
                    width: BULLET_SIZE,
                    height: BULLET_SIZE,
                    speed: BULLET_SPEED * 1.2,
                    dx: dx,
                    dy: dy,
                    color: '#ff00ff',
                    bounceCount: 0,
                    maxBounces: 2,
                    owner: 'player'
                });
            }
            break;
            
        default:
            // 普通子弹
            bullets.push({
                x: centerX - BULLET_SIZE / 2,
                y: centerY - BULLET_SIZE / 2,
                width: BULLET_SIZE,
                height: BULLET_SIZE,
                speed: BULLET_SPEED,
                dx: dx,
                dy: dy,
                color: '#ffff00',
                bounceCount: 0,
                maxBounces: 2,
                owner: 'player'
            });
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 移动子弹
        const newX = bullet.x + bullet.dx * bullet.speed;
        const newY = bullet.y + bullet.dy * bullet.speed;
        
        // 检查是否撞墙
        if (checkBulletWallCollision(bullet, newX, newY)) {
            bullet.bounceCount++;
            
            // 如果超过最大反弹次数，移除子弹
            if (bullet.bounceCount > bullet.maxBounces) {
                bullets.splice(i, 1);
                continue;
            }
        }
        
        // 更新子弹位置
        bullet.x = newX;
        bullet.y = newY;
        
        // 绘制子弹
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 移除超出屏幕的子弹
        if (bullet.x < -bullet.width || bullet.x > canvas.width + bullet.width || 
            bullet.y < -bullet.height || bullet.y > canvas.height + bullet.height) {
            bullets.splice(i, 1);
        }
    }
}

function createEnemy() {
    // 查找空点位用于生成敌人
    let validSpawnPoints = [];
    
    for (let row = 1; row < MAZE_ROWS - 1; row++) {
        for (let col = 1; col < MAZE_COLS - 1; col++) {
            if (maze[row][col] === 0) {
                // 不要太靠近玩家生成敌人
                const cellX = col * CELL_SIZE + CELL_SIZE / 2;
                const cellY = row * CELL_SIZE + CELL_SIZE / 2;
                const distToPlayer = Math.sqrt(
                    Math.pow(cellX - (player.x + player.width/2), 2) + 
                    Math.pow(cellY - (player.y + player.height/2), 2)
                );
                
                if (distToPlayer > 200) { // 至少要在一定距离之外
                    validSpawnPoints.push({ x: cellX - ENEMY_SIZE/2, y: cellY - ENEMY_SIZE/2 });
                }
            }
        }
    }
    
    if (validSpawnPoints.length > 0) {
        // 随机选择一个生成点
        const spawnPoint = validSpawnPoints[Math.floor(Math.random() * validSpawnPoints.length)];
        
        const enemy = {
            x: spawnPoint.x,
            y: spawnPoint.y,
            width: ENEMY_SIZE,
            height: ENEMY_SIZE,
            speed: ENEMY_SPEED,
            color: '#ff0000',
            lastMove: Date.now(),
            lastShot: Date.now(), // 添加射击时间记录
            shape: Math.floor(Math.random() * 2),
            angle: 0
        };
        
        enemies.push(enemy);
    }
}

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
    ctx.rotate(enemy.angle);
    
    if (enemy.shape === 0) { // 圆形敌人 - 绘制机器人
        // 机器人头部
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 机器人眼睛
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-enemy.width/4, -enemy.height/4, enemy.width/6, 0, Math.PI * 2);
        ctx.arc(enemy.width/4, -enemy.height/4, enemy.width/6, 0, Math.PI * 2);
        ctx.fill();
        
        // 机器人天线
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height/2);
        ctx.lineTo(0, -enemy.height/2 - 5);
        ctx.stroke();
        
    } else { // 方形敌人 - 绘制战车
        // 战车主体
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
        
        // 战车履带
        ctx.fillStyle = '#a93226';
        ctx.fillRect(-enemy.width/2 - 2, -enemy.height/2, 4, enemy.height);
        ctx.fillRect(enemy.width/2 - 2, -enemy.height/2, 4, enemy.height);
        
        // 战车炮塔
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.width/3, 0, Math.PI * 2);
        ctx.fill();
        
        // 战车炮管
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(-2, -enemy.height/2 - 6, 4, 10);
    }
    
    ctx.restore();
}

function createEnemyBullet(enemy) {
    const centerX = enemy.x + enemy.width / 2;
    const centerY = enemy.y + enemy.height / 2;
    
    const dx = Math.cos(enemy.angle);
    const dy = Math.sin(enemy.angle);
    
    const bullet = {
        x: centerX - BULLET_SIZE / 2,
        y: centerY - BULLET_SIZE / 2,
        width: BULLET_SIZE,
        height: BULLET_SIZE,
        speed: BULLET_SPEED * 0.8, // 敌人子弹速度稍慢
        dx: dx,
        dy: dy,
        color: '#ff4444', // 敌人子弹颜色不同
        bounceCount: 0,
        maxBounces: 2,
        owner: 'enemy'
    };
    
    bullets.push(bullet);
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const now = Date.now();
        
        // 更新敌人朝向玩家的角度
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        enemy.angle = Math.atan2(playerCenterY - enemyCenterY, playerCenterX - enemyCenterX);
        
        // 敌人射击逻辑
        if (now - enemy.lastShot > 2000) { // 每2秒射击一次
            createEnemyBullet(enemy);
            enemy.lastShot = now;
        }
        
        // 向玩家方向移动
        if (now - enemy.lastMove > 100) {
            enemy.lastMove = now;
            
            // 寻路：尝试4个方向，选择使敌人更接近玩家的方向
            const directions = [
                { dx: enemy.speed, dy: 0 },    // 右
                { dx: -enemy.speed, dy: 0 },   // 左
                { dx: 0, dy: enemy.speed },    // 下
                { dx: 0, dy: -enemy.speed }    // 上
            ];
            
            // 打乱方向以增加随机性
            directions.sort(() => Math.random() - 0.5);
            
            let moved = false;
            for (const dir of directions) {
                const newX = enemy.x + dir.dx;
                const newY = enemy.y + dir.dy;
                
                // 检查移动是否有效
                if (
                    isValidPosition(newX + 2, newY + 2) &&
                    isValidPosition(newX + enemy.width - 2, newY + 2) &&
                    isValidPosition(newX + 2, newY + enemy.height - 2) &&
                    isValidPosition(newX + enemy.width - 2, newY + enemy.height - 2)
                ) {
                    // 计算新位置到玩家的距离
                    const currentDist = Math.sqrt(
                        Math.pow(playerCenterX - enemyCenterX, 2) + 
                        Math.pow(playerCenterY - enemyCenterY, 2)
                    );
                    
                    const newDist = Math.sqrt(
                        Math.pow(playerCenterX - (newX + enemy.width/2), 2) + 
                        Math.pow(playerCenterY - (newY + enemy.height/2), 2)
                    );
                    
                    // 如果新位置更接近玩家
                    if (newDist < currentDist || Math.random() < 0.2) {
                        enemy.x = newX;
                        enemy.y = newY;
                        moved = true;
                        break;
                    }
                }
            }
        }
        
        // 绘制敌人
        drawEnemy(enemy);
    }
}

function checkCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 检查子弹与玩家的碰撞（只检查敌人的子弹）
        if (bullet.owner === 'enemy' && 
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            
            bullets.splice(i, 1);
            
            // 如果有护盾，先扣除护盾值
            if (player.shield > 0) {
                player.shield = Math.max(0, player.shield - 20);
            } else {
                lives--;
                updateLives();
                flashPlayer();
            }
            continue;
        }
        
        // 检查子弹与敌人的碰撞
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            if (bullet.owner === 'player' && // 只检查玩家的子弹
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                updateScore();
                break;
            }
        }
    }
    
    // 检查玩家与敌人的碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            enemies.splice(i, 1);
            lives--;
            updateLives();
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
    
    // 显示开始界面
    startScreen.style.display = 'flex';
    startButton.disabled = false;
    
    // 更新开始按钮文本
    startButton.textContent = '重新开始';
    
    // 绘制游戏结束文本
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `
        <h2 style="font-size: 2.5em; margin-bottom: 20px;">游戏结束</h2>
        <p style="font-size: 1.5em;">最终得分: ${score}</p>
    `;
    document.getElementById('gameContainer').appendChild(gameOverDiv);
    
    // 3秒后移除游戏结束文本
    setTimeout(() => {
        gameOverDiv.remove();
    }, 3000);
}

function checkBulletWallCollision(bullet, newX, newY) {
    const bulletCenterX = newX + bullet.width/2;
    const bulletCenterY = newY + bullet.height/2;
    
    // 检查边界碰撞
    if (bulletCenterX < 0 || bulletCenterX >= MAZE_COLS * CELL_SIZE || 
        bulletCenterY < 0 || bulletCenterY >= MAZE_ROWS * CELL_SIZE) {
        // 边界反弹
        if (bulletCenterX < 0 || bulletCenterX >= MAZE_COLS * CELL_SIZE) {
            bullet.dx = -bullet.dx;
        }
        if (bulletCenterY < 0 || bulletCenterY >= MAZE_ROWS * CELL_SIZE) {
            bullet.dy = -bullet.dy;
        }
        return true;
    }
    
    // 检查墙体碰撞
    for (const wall of walls) {
        let isCollision = false;
        let normalX = 0;
        let normalY = 0;
        
        switch(wall.type) {
            case 'rect':
                // 简单矩形碰撞
                if (bulletCenterX >= wall.x && bulletCenterX <= wall.x + wall.width && 
                    bulletCenterY >= wall.y && bulletCenterY <= wall.y + wall.height) {
                    
                    isCollision = true;
                    
                    // 计算距离矩形最近的边
                    const distLeft = bulletCenterX - wall.x;
                    const distRight = wall.x + wall.width - bulletCenterX;
                    const distTop = bulletCenterY - wall.y;
                    const distBottom = wall.y + wall.height - bulletCenterY;
                    
                    const minDist = Math.min(distLeft, distRight, distTop, distBottom);
                    
                    if (minDist === distLeft) {
                        normalX = -1;
                        normalY = 0;
                    } else if (minDist === distRight) {
                        normalX = 1;
                        normalY = 0;
                    } else if (minDist === distTop) {
                        normalX = 0;
                        normalY = -1;
                    } else {
                        normalX = 0;
                        normalY = 1;
                    }
                }
                break;
            case 'triangle':
                if (isPointInTriangle(bulletCenterX, bulletCenterY, wall)) {
                    isCollision = true;
                    
                    // 计算三角形的边法线（简化）
                    // 这里我们使用入射角度和反射角度相等的规律
                    // 找出三角形哪个边最近
                    const {x: x1, y: y1} = wall.points[0];
                    const {x: x2, y: y2} = wall.points[1];
                    const {x: x3, y: y3} = wall.points[2];
                    
                    // 计算到三条边的距离
                    const dist1 = distanceToLine(bulletCenterX, bulletCenterY, x1, y1, x2, y2);
                    const dist2 = distanceToLine(bulletCenterX, bulletCenterY, x2, y2, x3, y3);
                    const dist3 = distanceToLine(bulletCenterX, bulletCenterY, x3, y3, x1, y1);
                    
                    let nx = 0, ny = 0;
                    
                    if (dist1 <= dist2 && dist1 <= dist3) {
                        nx = y2 - y1;
                        ny = -(x2 - x1);
                    } else if (dist2 <= dist1 && dist2 <= dist3) {
                        nx = y3 - y2;
                        ny = -(x3 - x2);
                    } else {
                        nx = y1 - y3;
                        ny = -(x1 - x3);
                    }
                    
                    // 归一化法线向量
                    const len = Math.sqrt(nx * nx + ny * ny);
                    normalX = nx / len;
                    normalY = ny / len;
                }
                break;
            case 'diamond':
                // 到菱形中心的曼哈顿距离
                const dx = Math.abs(bulletCenterX - wall.x);
                const dy = Math.abs(bulletCenterY - wall.y);
                
                if (dx + dy <= wall.radius) {
                    isCollision = true;
                    
                    // 计算到菱形中心的方向向量
                    normalX = bulletCenterX - wall.x;
                    normalY = bulletCenterY - wall.y;
                    // 归一化
                    const len = Math.abs(normalX) + Math.abs(normalY);
                    if (len > 0) {
                        normalX /= len;
                        normalY /= len;
                    }
                }
                break;
            case 'circle':
                const dist = Math.sqrt(Math.pow(bulletCenterX - wall.x, 2) + Math.pow(bulletCenterY - wall.y, 2));
                
                if (dist <= wall.radius) {
                    isCollision = true;
                    
                    // 法线就是从圆心指向子弹的向量
                    normalX = bulletCenterX - wall.x;
                    normalY = bulletCenterY - wall.y;
                    // 归一化
                    const len = Math.sqrt(normalX * normalX + normalY * normalY);
                    if (len > 0) {
                        normalX /= len;
                        normalY /= len;
                    }
                }
                break;
        }
        
        if (isCollision) {
            // 计算反弹方向
            const dot = 2 * (bullet.dx * normalX + bullet.dy * normalY);
            bullet.dx = bullet.dx - dot * normalX;
            bullet.dy = bullet.dy - dot * normalY;
            
            // 归一化新方向向量
            const len = Math.sqrt(bullet.dx * bullet.dx + bullet.dy * bullet.dy);
            if (len > 0) {
                bullet.dx /= len;
                bullet.dy /= len;
            }
            
            return true;
        }
    }
    
    return false;
}

// 计算点到线段的距离
function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

// 创建补给
function createSupply() {
    // 查找空位生成补给
    let validSpawnPoints = [];
    
    for (let row = 1; row < MAZE_ROWS - 1; row++) {
        for (let col = 1; col < MAZE_COLS - 1; col++) {
            if (maze[row][col] === 0) {
                const cellX = col * CELL_SIZE + CELL_SIZE / 2;
                const cellY = row * CELL_SIZE + CELL_SIZE / 2;
                validSpawnPoints.push({ x: cellX, y: cellY });
            }
        }
    }
    
    if (validSpawnPoints.length > 0) {
        const spawnPoint = validSpawnPoints[Math.floor(Math.random() * validSpawnPoints.length)];
        const supplyType = Math.random() < 0.4 ? SUPPLY_TYPES.WEAPON : 
                          Math.random() < 0.7 ? SUPPLY_TYPES.HEALTH : 
                          SUPPLY_TYPES.SHIELD;
        
        const supply = {
            x: spawnPoint.x - 15,
            y: spawnPoint.y - 15,
            width: 30,
            height: 30,
            type: supplyType,
            spawnTime: Date.now(),
            color: supplyType === SUPPLY_TYPES.WEAPON ? '#ff00ff' :
                   supplyType === SUPPLY_TYPES.HEALTH ? '#00ff00' :
                   '#00ffff'
        };
        
        supplies.push(supply);
    }
}

// 绘制补给
function drawSupply(supply) {
    ctx.save();
    ctx.translate(supply.x + supply.width/2, supply.y + supply.height/2);
    
    // 绘制补给图标
    ctx.fillStyle = supply.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    switch(supply.type) {
        case SUPPLY_TYPES.WEAPON:
            // 绘制武器图标
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(10, -10);
            ctx.lineTo(10, 10);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case SUPPLY_TYPES.HEALTH:
            // 绘制生命值图标
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(10, 10);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case SUPPLY_TYPES.SHIELD:
            // 绘制护盾图标
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
    }
    
    // 绘制闪烁效果
    const timeLeft = SUPPLY_DURATION - (Date.now() - supply.spawnTime);
    if (timeLeft < 3000) { // 最后3秒闪烁
        ctx.globalAlpha = Math.sin(Date.now() / 200) * 0.5 + 0.5;
        ctx.fillStyle = '#fff';
        ctx.fillRect(-15, -15, 30, 30);
    }
    
    ctx.restore();
}

// 更新补给
function updateSupplies() {
    for (let i = supplies.length - 1; i >= 0; i--) {
        const supply = supplies[i];
        
        // 检查补给是否过期
        if (Date.now() - supply.spawnTime > SUPPLY_DURATION) {
            supplies.splice(i, 1);
            continue;
        }
        
        // 检查玩家是否拾取补给
        if (player.x < supply.x + supply.width &&
            player.x + player.width > supply.x &&
            player.y < supply.y + supply.height &&
            player.y + player.height > supply.y) {
            
            switch(supply.type) {
                case SUPPLY_TYPES.WEAPON:
                    // 随机选择武器类型
                    const weapons = Object.values(WEAPON_TYPES).filter(w => w !== WEAPON_TYPES.NORMAL);
                    player.weapon = weapons[Math.floor(Math.random() * weapons.length)];
                    weaponTimer = Date.now() + 10000; // 武器持续10秒
                    updateWeaponIndicator();
                    break;
                case SUPPLY_TYPES.HEALTH:
                    lives = Math.min(lives + 1, 5); // 最多5条命
                    updateLives();
                    break;
                case SUPPLY_TYPES.SHIELD:
                    player.shield = 100; // 护盾值
                    break;
            }
            
            supplies.splice(i, 1);
        }
        
        // 绘制补给
        drawSupply(supply);
    }
}

function updateWeaponIndicator() {
    if (player.weapon !== WEAPON_TYPES.NORMAL) {
        weaponIndicator.textContent = `当前武器: ${getWeaponName(player.weapon)}`;
        weaponIndicator.classList.add('active');
    } else {
        weaponIndicator.classList.remove('active');
    }
}

function getWeaponName(weaponType) {
    switch(weaponType) {
        case WEAPON_TYPES.SHOTGUN: return '霰弹枪';
        case WEAPON_TYPES.FLAMETHROWER: return '喷火器';
        case WEAPON_TYPES.LASER: return '激光';
        case WEAPON_TYPES.RAPID_FIRE: return '快速射击';
        default: return '普通';
    }
} 