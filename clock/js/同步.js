const readline = require('readline');
const timeSync = require('precise-time-ntp');

/* ===============================
   配置
================================ */
const AUTO_SYNC_INTERVAL = 10 * 60 * 1000;
const LOG_INTERVAL = 1000;
const OFFSET_THRESHOLD = 2000;

let syncing = false;
let lastSyncTime = Date.now(); // 记录上次同步时间

/* ===============================
   时钟时间
================================ */
function getClockTime() {
  const localTime = new Date();
  const networkTime = timeSync.now();
  const offset = timeSync.offset();

  return Math.abs(offset) < OFFSET_THRESHOLD
    ? localTime
    : new Date(networkTime);
}

/* ===============================
   下次同步剩余时间
================================ */
function getNextSyncRemaining() {
  const nextSyncTime = lastSyncTime + AUTO_SYNC_INTERVAL;
  const remaining = nextSyncTime - Date.now();
  return Math.max(0, remaining); // 确保不返回负数
}

/* ===============================
   更新上次同步时间
================================ */
function updateLastSyncTime() {
  lastSyncTime = Date.now();
}

/* ===============================
   ✅ 正确的手动同步（重点修复）
================================ */
async function manualSync() {
  if (syncing) return;
  syncing = true;

  try {
    // 🚨 关键：直接 await Promise
    await timeSync.sync({ 
      coherenceValidation: true,
      servers: [
        'ntp.ntsc.ac.cn',
        'ntp.aliyun.com', 
        'time.tencentcloud.com',
        'ntp.myhuaweicloud.com',
        'time.windows.com',
        'time.asia.apple.com'
      ]
    });
    updateLastSyncTime(); // 更新上次同步时间
  } finally {
    syncing = false;
  }
}

/* ===============================
   初始化
================================ */
async function initTimeSync(silent = false) {
  try {
    console.log('[初始化] 开始首次网络时间同步...');
    // 首次同步使用指定的NTP服务器
    await timeSync.sync({ 
      coherenceValidation: true,
      servers: [
        'ntp.ntsc.ac.cn',
        'ntp.aliyun.com', 
        'time.tencentcloud.com',
        'ntp.myhuaweicloud.com',
        'time.windows.com',
        'time.asia.apple.com'
      ]
    });
    console.log('[初始化] 首次同步完成');


    timeSync.startAutoSync(AUTO_SYNC_INTERVAL);
    console.log(`[自动同步] 每 ${AUTO_SYNC_INTERVAL / 60000} 分钟一次`);

    // 设置定时器更新上次同步时间（模拟自动同步发生）
    setInterval(() => {
      updateLastSyncTime();
    }, AUTO_SYNC_INTERVAL);

    if (!silent) {
      startLogOutput();
    }
    
    if (!silent) {
      listenManualSync();
    }

  } catch (e) {
    console.error('[初始化失败]', e.message);
    process.exit(1);
  }
}

/* ===============================
   日志
================================ */
function startLogOutput() {
  setInterval(() => {
    console.log(`
[时间日志]
  本地时间: ${new Date().toISOString()}
  网络时间: ${timeSync.now().toISOString()}
  时钟时间: ${getClockTime().toISOString()}
  偏移量: ${timeSync.offset()} ms
`);
  }, LOG_INTERVAL);
}

/* ===============================
   CLI 同步
================================ */
function listenManualSync() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '输入 "sync" 触发同步 > '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    if (line.trim() === 'sync') {
      console.log('[手动同步] 开始...');
      try {
        await manualSync();
        console.log('[手动同步] 完成');
      } catch (e) {
        console.error('[手动同步失败]', e.message);
      }
    } else {
      console.log('[提示] 仅支持 sync');
    }
    rl.prompt();
  });
}

/* ===============================
   导出
================================ */
module.exports = {
  initTimeSync,
  manualSync,
  getClockTime,
  getOffset: () => timeSync.offset(),
  getNetworkTime: () => timeSync.now(),
  getNextSyncRemaining, // 获取下次同步剩余时间
  updateLastSyncTime // 更新上次同步时间
};

/* ===============================
   直接运行
================================ */
if (require.main === module) {
  initTimeSync(false); // 直接运行时启用日志输出
}
