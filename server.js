const fs = require('fs');
const express = require('express');
const app = express();
const https = require('https');
const { v4: uuidV4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.get('/', (req, res) => {
	res.redirect(`/room/${uuidV4()}`);
});
app.get('/room/:room', (req, res) => {
	res.render('room.ejs', {
		roomId: req.params.room,
	});
});

server = https.createServer(
	{
		key: fs.readFileSync('private.pem'),
		cert: fs.readFileSync('public.pem'),
	},
	app
);
const io = require('socket.io')(server);

//서버운영중 필요한 데이터들
const passwordList = {};
const titleList = {};
const powerList = {};
const headcountLimitList = {};

io.on('connection', socket => {
	//클라이언트가 맨처음 로딩 시 방에 대해서 체크
	socket.on('check-room', roomId => {
		if (!headcountLimitList[roomId]) {
			headcountLimitList[roomId] = 6;
		}
		socket.emit(
			'set-room',
			passwordList[roomId],
			headcountLimitList[roomId],
			io.sockets.adapter.rooms[roomId]
		);
		socket.emit('set-title', titleList[roomId]);
	});

	socket.on('join-room', (roomId, userId) => {
		let clientsInRoom = io.sockets.adapter.rooms[roomId];
		let numClients = clientsInRoom
			? Object.keys(clientsInRoom.sockets).length
			: 0;

		//방에 처음 들어가는거면 방장 권한 줌
		if (numClients === 0) {
			powerList[roomId] = userId;
			socket.emit('set-power', powerList[roomId]);
		}

		socket.join(roomId);
		socket.to(roomId).broadcast.emit('user-connected', userId);

		//연결이 끊어졌을 때
		socket.on('disconnect', () => {
			socket.to(roomId).broadcast.emit('user-disconnected', userId);
			if (io.engine.clientsCount === 0) {
				delete passwordList[roomId];
			}
		});
	});

	//사용자가 서버에 보내는 방 설정
	socket.on('password', (roomId, password) => {
		passwordList[roomId] = password;
	});

	socket.on('title', (roomId, title) => {
		titleList[roomId] = title;
		socket.to(roomId).broadcast.emit('set-title', titleList[roomId]);
	});

	socket.on('headcountLimit', (roomId, headcountLimit) => {
		headcountLimitList[roomId] = headcountLimit;
	});

	socket.on('power', (roomId, power) => {
		powerList[roomId] = power;
		socket.emit('set-power', powerList[roomId]);
		socket.to(roomId).broadcast.emit('set-power', powerList[roomId]);
	});

	//강퇴
	socket.on('retire', (roomId, userId) => {
		socket.to(roomId).broadcast.emit('retire-user', userId);
	});

	socket.on('audio', (roomId, userId) => {
		socket.to(roomId).broadcast.emit('set-audio', userId);
	});

	socket.on('video', (roomId, userId) => {
		socket.to(roomId).broadcast.emit('set-video', userId);
	});
});

server.listen(3333, '0.0.0.0');
