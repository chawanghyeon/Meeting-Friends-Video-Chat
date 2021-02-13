const socket = io('/');
const videoGrid = document.getElementById('video-grid');
let myPeer;

if (location.hostname === '192.168.35.115') {
	myPeer = new Peer({
		config: {
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' },
				{
					urls: 'turn:110.8.201.37:3478?transport=tcp',
					username: 'carking',
					credential: 'carking',
				},
			],
		},
		host: '192.168.35.115',
		secure: true,
		port: '3001',
		debug: true,
	});
} else {
	myPeer = new Peer({
		config: {
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' },
				{
					urls: 'turn:110.8.201.37:3478?transport=tcp',
					username: 'carking',
					credential: 'carking',
				},
			],
		},
		host: '110.8.201.37',
		secure: true,
		port: '3001',
		debug: true,
	});
}

const myVideo = document.createElement('video');
myVideo.muted = true;
myVideo.id = 'local';
let peers = {};
const callList = [];
let localStream;
let getUserMedia =
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;

getUserMedia({ video: true, audio: true }, stream => {
	if (typeof localStream == 'undefined') {
		console.log('!');
		localStream = stream;
	}
	addVideoStream(myVideo, localStream);
	socket.on('user-connected', newUserId => {
		const call = myPeer.call(newUserId, localStream);
		console.log(call);
		const video = document.createElement('video');
		video.id = 'remote';
		call.on('stream', userVideoStream => {
			// call의 remotestreamdl user
			if (!callList[call.peer]) {
				console.log(userVideoStream, 'connect');
				addVideoStream(video, userVideoStream);
				callList[call.peer] = call;
			}
		});
		call.on('close', () => {
			video.remove();
		});
		peers[newUserId] = call;
	});
});

myPeer.on('call', call => {
	peers[call.peer] = call;
	getUserMedia({ video: true, audio: true }, function (stream) {
		if (typeof localStream == 'undefined') {
			console.log('!');
			localStream = stream;
		}
		console.log(localStream, 'call');
		call.answer(localStream);
		const video = document.createElement('video');
		video.id = 'remote';
		call.on('stream', userVideoStream => {
			if (!callList[call.peer]) {
				console.log(userVideoStream, 'uservideo');
				addVideoStream(video, userVideoStream);
				callList[call.peer] = call;
			}
		});
		call.on('close', () => {
			video.remove();
		});
	});
});
//연결을 요청하는 곳에서 받는 call

socket.on('user-disconnected', userId => {
	if (peers[userId]) {
		peers[userId].close();
		delete peers[userId];
		delete connections[userId];
	}
});

myPeer.on('open', id => {
	console.log(id, 'myid');
	socket.emit('check-password', ROOM_ID, id);
	socket.on('set-password', password => {
		vm.$data.password = true;
		vm.$data.roomPassword = password;
	});
	if (vm.$data.password) {
		let returnValue = prompt('비밀번호를 입력하세요');
		if (returnValue === vm.$data.roomPassword) {
			socket.emit('join-room', ROOM_ID, id);
		} else {
			// window.location.href='https://wattingroom';
		}
	} else {
		socket.emit('join-room', ROOM_ID, id);
		vm.$data.roomId = ROOM_ID;
	}
});

function addVideoStream(video, stream) {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	videoGrid.append(video);
}

myPeer.on('error', e => {
	alert(e);
});

//방이 꽉 찼을 때
socket.on('full', room => {
	alert('Room ' + room + ' is full');
	// window.location.href='https://';
});

//vue 객체

let vm = new Vue({
	el: '#app',
	data: {
		roomName: '',
		roomPassword: '',
		roomclients: 1,
		chatting: '',
		password: false,
		roomId: '',
	},
	watch: {
		roomPassword: function () {
			socket.emit('password', this.roomPassword, this.roomId);
		},
	},
});

//채팅 기능
let connections = {};
const chat = document.getElementById('chat');
myPeer.on('connection', function (con) {
	console.log(con.peer);
	connections[con.peer] = con;
	con.on('data', function (data) {
		chat.innerHTML += data + `\n`;
		console.log('Incoming data', data);
	});
});

document.getElementById('chat_btn').addEventListener('click', () => {
	for (const key in peers) {
		if (typeof connections[key] === 'undefined') {
			console.log('실행?');
			connections[key] = myPeer.connect(key);
			connections[key].on('data', data => {
				chat.innerHTML += data + `\n`;
				console.log('Incoming data', data);
			});
		}
	}
});

document.getElementById('send').addEventListener('click', () => {
	chat.innerHTML += vm.$data.chatting + `\n`;
	for (const key in connections) {
		connections[key].send(vm.$data.chatting);
	}
	vm.$data.chatting = '';
});

//방설정 버튼
function onClickRoombtn() {
	document.getElementById('room_wrap').style.display = 'block';
	document.getElementById('room_bg').style.display = 'block';
}
function offClickRoombtn() {
	document.getElementById('room_wrap').style.display = 'none';
	document.getElementById('room_bg').style.display = 'none';
}

document.getElementById('room_btn').addEventListener('click', onClickRoombtn);
document
	.getElementById('room_close')
	.addEventListener('click', offClickRoombtn);

//게임 버튼
function onClickGamebtn() {
	document.getElementById('game_wrap').style.display = 'block';
	document.getElementById('game_bg').style.display = 'block';
}
function offClickGamebtn() {
	document.getElementById('game_wrap').style.display = 'none';
	document.getElementById('game_bg').style.display = 'none';
}

document.getElementById('game_btn').addEventListener('click', onClickGamebtn);
document
	.getElementById('game_close')
	.addEventListener('click', offClickGamebtn);

//채팅 버튼
function onClickChatbtn() {
	document.getElementById('chat_wrap').style.display = 'block';
	document.getElementById('chat_bg').style.display = 'block';
}
function offClickChatbtn() {
	document.getElementById('chat_wrap').style.display = 'none';
	document.getElementById('chat_bg').style.display = 'none';
}

document.getElementById('chat_btn').addEventListener('click', onClickChatbtn);
document
	.getElementById('chat_close')
	.addEventListener('click', offClickChatbtn);

//비디오 오디오 온오프 기능
let videoStatus = true;

video_btn.onclick = () => {
	if (videoStatus) {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = false;
		document.getElementById('local').style.display = 'none';
		document.getElementById('video_btn').style.color = 'red';
		videoStatus = !videoStatus;
	} else {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = true;
		document.getElementById('local').style.display = 'inline';
		document.getElementById('video_btn').style.color = null;
		videoStatus = !videoStatus;
	}
};

let audioStatus = true;
audio_btn.onclick = () => {
	if (audioStatus) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		document.getElementById('audio_btn').style.color = 'red';
		audioStatus = !audioStatus;
	} else {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = true;
		document.getElementById('audio_btn').style.color = null;
		audioStatus = !audioStatus;
	}
};
