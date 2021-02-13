const fs = require('fs');
const express = require('express');
const app = express();
const https = require('https');

const { v4: uuidV4 } = require('uuid');

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req, res) => {
	res.render('room', { roomId: req.params.room });
});

server = https.createServer(
	{
		key: fs.readFileSync('private.pem'),
		cert: fs.readFileSync('public.pem'),
	},
	app
);
const io = require('socket.io')(server);
let passwords = {};
//비밀번호 기능과 방 인원 기능은 server.js에서 구현해야 함
io.on('connection', socket => {
	socket.on('check-password', (roomId, userId) => {
    
  });
	socket.on('join-room', (roomId, userId) => {
		let clientsInRoom = io.sockets.adapter.rooms[roomId];
		let numClients = clientsInRoom
			? Object.keys(clientsInRoom.sockets).length
			: 0;

		//passwords에서 roomid로 찾았는데 있거나 없으면 ....
		if (passwords[roomId] || passwords[roomId].length > 0) {
			socket.to(roomId).broadcast.emit('set-password', passwords[roomId]);
		}
		if (numClients === 0 || numClients <= 2) {
			socket.join(roomId);
			socket.to(roomId).broadcast.emit('user-connected', userId);
		} else {
			socket.emit('full', roomId);
		}
		socket.on('disconnect', () => {
			socket.to(roomId).broadcast.emit('user-disconnected', userId);
		});
	});
	socket.on('password', (password, roomId) => {
		passwords[roomId] = password;
	});
});

server.listen(3333, '0.0.0.0');
