const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path'); // 引入路徑套件
const io = require('socket.io')(http, {
    cors: { origin: "*" } // 允許所有來源連線
});
// 新增這段：處理網頁顯示
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// 記錄房間資訊 (可選，用於後續擴充)
const rooms = {};

io.on('connection', (socket) => {
    console.log('連線成功，玩家 ID:', socket.id);

    // 處理加入房間請求
    socket.on('join_room', (roomCode) => {
        // 取得該房間目前的連線數
        const clients = io.sockets.adapter.rooms.get(roomCode);
        const numClients = clients ? clients.size : 0;

        if (numClients < 2) {
            socket.join(roomCode);
            socket.roomCode = roomCode; // 在 socket 物件上記錄房號
            console.log(`玩家 ${socket.id} 進入房間: ${roomCode}`);

            // 如果是第二個人進來，通知該房間開賽
            if (numClients === 1) {
                io.to(roomCode).emit('start_race', { startTime: Date.now() });
                console.log(`房間 ${roomCode} 正式開賽！`);
            }
        } else {
            // 房間人數已滿
            socket.emit('error_msg', '該房間人數已滿 (上限 2 人)');
        }
    });

    // 轉發進度給房間內的對手
    socket.on('update_progress', (percent) => {
        if (socket.roomCode) {
            socket.to(socket.roomCode).emit('opponent_progress', percent);
        }
    });

    // 轉發勝負結果給對手
    socket.on('game_finished', (data) => {
        if (socket.roomCode) {
            socket.to(socket.roomCode).emit('opponent_finished', data);
        }
    });

    // 玩家離線處理
    socket.on('disconnect', () => {
        console.log('玩家已離線:', socket.id);
    });
});

// 啟動伺服器，監聽 3000 埠
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`====================================`);
    console.log(`  競速踩地雷伺服器已啟動！`);
    console.log(`  監聽埠口: ${PORT}`);
    console.log(`  請開啟瀏覽器訪問 http://localhost:3000`);
    console.log(`====================================`);
});
