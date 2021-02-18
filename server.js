const fs = require('fs');
const express = require('express');
const app = express();
const https = require('https');
const { v4: uuidV4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
var session = require('express-session');
const axios = require('axios');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(
	session({
		secret: 'asadlfkj!@#!@#dfgasdg',
		resave: false,
		saveUninitialized: true,
	})
);

app.get('/room/:room', (req, res) => {
	if (req.headers.referer === 'http://localhost:8081/waittingroom') {
		res.render('room.ejs', {
			roomId: req.params.room,
			test: req,
		});
	} else {
		res.redirect('http://localhost:8081/waittingroom');
	}
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
const maxPeopleList = {};
const emailList = {};

io.on('connection', socket => {
	//클라이언트가 맨처음 로딩 시 방에 대해서 체크
	socket.on('check-room', roomId => {
		if (!maxPeopleList[roomId]) {
			maxPeopleList[roomId] = 6;
		}
		socket.emit(
			'enter-room',
			passwordList[roomId],
			maxPeopleList[roomId],
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
			axios
				.get(
					`http://localhost:80/exitroom/room/${roomId}/user/${emailList[userId]}`
				)
				.then(() => {})
				.catch(error => {
					console.log(error);
				});
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

	socket.on('maxPeople', (roomId, headcountLimit) => {
		maxPeopleList[roomId] = headcountLimit;
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

	socket.on('clubhouse', roomId => {
		socket.to(roomId).broadcast.emit('set-clubhouse');
	});

	socket.on('email', (userId, userEmail) => {
		emailList[userId] = userEmail;
	});
});

server.listen(3333, '0.0.0.0');
