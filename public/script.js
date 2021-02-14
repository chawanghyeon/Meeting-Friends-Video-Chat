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
		vm.$data.roomclients++;
	});
});

myPeer.on('call', call => {
	peers[call.peer] = call;
	vm.$data.roomclients++;
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
		vm.$data.roomclients--;
	}
});

myPeer.on('open', id => {
	//방인원 설정
	console.log(id, 'myid');
	socket.emit('check-room', ROOM_ID);
	socket.on('set-room', (password, title, count, clients) => {
		if (password) {
			vm.$data.passwordStatus = true;
			vm.$data.roomPassword = password;
		}
		if (vm.$data.passwordStatus) {
			let returnValue = prompt('비밀번호를 입력하세요');
			if (returnValue === vm.$data.roomPassword) {
				if (count < clients) {
					socket.emit('join-room', ROOM_ID, id);
				}
			} else {
				alert('비밀번호가 틀렸습니다.');
				// window.location.href='https://wattingroom';
			}
		} else {
			socket.emit('join-room', ROOM_ID, id);
			vm.$data.roomId = ROOM_ID;
		}
		if (title) {
			vm.$data.title = title;
			document.title = title;
		}
	});
	vm.$data.userId = id;
});

socket.on('set-power', () => {
	vm.$data.power = true;
});

function addVideoStream(video, stream) {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	const div = document.createElement('div');
	if (video.id !== 'local') {
		const btn = document.createElement('button');
		div.id = 'divclick';
		btn.id = 'click';
		btn.innerHTML = 'click';
		btn.onclick = () => {
			alert(1);
		};
		div.append(video);
		div.append(btn);
	} else {
		div.append(video);
	}
	videoGrid.append(div);
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
		title: '',
		roomPassword: '',
		roomclients: 6,
		chatting: '',
		passwordStatus: false,
		userId: '',
		power: false,
	},
	watch: {
		roomPassword: function () {
			socket.emit('password', this.roomPassword, ROOM_ID);
			if (this.roomPassword.length > 0) {
				this.passwordStatus = true;
			} else {
				this.passwordStatus = false;
			}
		},
		title: function () {
			socket.emit('title', this.title, ROOM_ID);
			document.title = this.title;
		},
		power: function () {
			if (!this.power) {
				socket.emit('power', ROOM_ID);
			}
		},
	},
});

//채팅 기능
let connections = {};
const chat = document.getElementById('chat');
myPeer.on('connection', function (con) {
	connections[con.peer] = con;
	con.on('data', function (data) {
		chat.innerHTML += data + `\n`;
		console.log('Incoming data', data);
	});
});

document.getElementById('chat_btn').addEventListener('click', () => {
	for (const key in peers) {
		if (typeof connections[key] === 'undefined') {
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
	console.log(vm.$data.chatting);
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
