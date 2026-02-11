const http = require('http');
const timeSyncModule = require('./同步');

console.log('正在初始化时间同步...');

timeSyncModule.initTimeSync(true) // 以静默模式初始化，不输出时间日志
  .then(() => {
    console.log('时间同步初始化完成，启动时间服务器...');

    http.createServer(async (req, res) => {

      // ===== 获取时间 =====
      if (req.method === 'GET' && req.url === '/time') {
        // 计算下次同步剩余时间
        const remainingMs = timeSyncModule.getNextSyncRemaining();
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });

        res.end(JSON.stringify({
          localTime: Date.now(),
          networkTime: timeSyncModule.getNetworkTime().getTime(),
          clockTime: timeSyncModule.getClockTime().getTime(),
          offset: timeSyncModule.getOffset(),
          nextSyncIn: `${minutes}分${seconds}秒`,
          nextSyncInMinutes: minutes,
          nextSyncInSeconds: seconds
        }));
        return;
      }

      // ===== 手动同步 =====
      if (req.method === 'POST' && req.url === '/sync') {
        try {
          await timeSyncModule.manualSync(); // ⭐ 统一走同步模块

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });

          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });

          res.end(JSON.stringify({
            ok: false,
            error: e.message
          }));
        }
        return;
      }

      // ===== 404 =====
      res.writeHead(404);
      res.end();

    }).listen(3000, () => {
      console.log('时间服务已启动：http://localhost:3000/time');
    });
  })
  .catch(error => {
    console.error('时间同步初始化失败:', error);
    process.exit(1);
  });
