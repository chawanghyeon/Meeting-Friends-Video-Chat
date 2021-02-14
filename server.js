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
let titles = {};
let powers = {};
let counts = {};
//비밀번호 기능과 방 인원 기능은 server.js에서 구현해야 함
io.on('connection', socket => {
	socket.on('check-room', roomId => {
		socket.emit(
			'set-room',
			(passwords[roomId],
			titles[roomId],
			counts[roomId],
			io.sockets.adapter.rooms[roomId])
		);
	});
	socket.on('join-room', (roomId, userId) => {
		let clientsInRoom = io.sockets.adapter.rooms[roomId];
		let numClients = clientsInRoom
			? Object.keys(clientsInRoom.sockets).length
			: 0;

		if (numClients === 0) {
			powers[roomId] = userId;
			socket.emit('set-power');
			socket.join(roomId);
			socket.to(roomId).broadcast.emit('user-connected', userId);
		} else if (numClients < 2) {
			socket.join(roomId);
			socket.to(roomId).broadcast.emit('user-connected', userId);
		} else {
			socket.to(roomId).broadcast.emit('full', roomId);
		}
		socket.on('disconnect', () => {
			socket.to(roomId).broadcast.emit('user-disconnected', userId);
			if (io.engine.clientsCount === 0) {
				delete passwords[roomId];
			}
		});
	});
	socket.on('password', (password, roomId) => {
		passwords[roomId] = password;
	});
	socket.on('title', (title, roomId) => {
		titles[roomId] = title;
		socket.to(roomId).broadcast.emit('set-title', titles[roomId]);
	});
	socket.on('power', (power, roomId) => {
		powers[roomId] = power;
	});
	socket.on('count', (count, roomId) => {
		counts[roomId] = count;
	});
});

server.listen(3333, '0.0.0.0');
