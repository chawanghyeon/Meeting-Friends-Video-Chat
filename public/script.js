const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
const connectionList = {};
const callList = {};
const peerList = {};
let localStream;
let myPeer;
let videoStatus = true;
let audioStatus = true;
myVideo.muted = true;
myVideo.id = 'local';
let getUserMedia =
	navigator.getUserMedia ||
	navigator.webkitGetUserMedia ||
	navigator.mozGetUserMedia;

//배포할 때 192.168.35.115주소인 경우는 삭제
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

//vue 객체
const vm = new Vue({
	el: '#app',
	data: {
		time: 0,
		headcount: 1,
		power: false,
		title: '',
		userId: '',
		chatting: '',
		userEmail: '',
		roomPassword: '',
		headcountLimit: 6,
		roomInfo: {},
		userInfo: {},
	},
	methods: {
		setRoom: function (data) {
			this.title = data.title.value;
			this.roomPassword = data.pw.value;
			this.headcountLimit = data.limit.value;
			alert('적용완료');
		},
	},
	watch: {
		roomPassword: function () {
			socket.emit('password', ROOM_ID, this.roomPassword);
		},
		title: function () {
			socket.emit('title', ROOM_ID, this.title);
			document.title = this.title;
		},
		headcountLimit: function () {
			if (this.headcountLimit >= this.headcount && this.headcountLimit < 7) {
				socket.emit('headcountLimit', ROOM_ID, this.headcountLimit);
				console.log('emit');
			} else {
				this.headcountLimit = this.headcount;
			}
			if (this.headcountLimit === '') {
				this.headcountLimit = 0;
			}
			this.headcountLimit = Number(this.headcountLimit);
		},
		power: function () {
			if (vm.$data.power) {
				let temp = document.getElementsByClassName('power');
				for (let index = 0; index < temp.length; index++) {
					temp[index].style.display = 'inline-block';
				}
			} else {
				let temp = document.getElementsByClassName('power');
				for (let index = 0; index < temp.length; index++) {
					temp[index].style.display = 'none';
				}
			}
		},
	},
});

//peer가 생성되었을 때 실행
myPeer.on('open', id => {
	console.log(id, 'myid');
	socket.emit('check-room', ROOM_ID);
	vm.$data.roomId = ROOM_ID;
	vm.$data.userId = id;
	vm.$data.userInfo = USER_INFO;
	vm.$data.userEmail = getParameterByName('userEmail');
	// if (vm.$data.userEmail !== '') {
	// 	getUserInfo();
	// 	getRoomInfo();
	// }
});

//연결을 요청하는 곳에서 받는 call
myPeer.on('call', call => {
	getUserMedia({ video: true, audio: true }, function (stream) {
		if (typeof localStream === 'undefined') {
			localStream = stream;
		}
		call.answer(localStream);
		setCall(call, call.peer);
	});
});

myPeer.on('error', e => {
	alert(e);
});

socket.on('set-title', title => {
	if (title) {
		vm.$data.title = title;
		document.title = title;
	}
});

socket.on('set-power', power => {
	console.log(power, 'power');
	if (vm.$data.userId === power) {
		vm.$data.power = true;
	}
});

socket.on('retire-user', userId => {
	if (userId === vm.$data.userId) {
		window.location.href = 'https://naver.com';
	}
});

socket.on('set-audio', userId => {
	if (vm.$data.userId === userId) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		audioStatus = false;
		audio_btn.style.color = 'red';
	}
});

socket.on('set-video', userId => {
	if (vm.$data.userId === userId) {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = false;
		videoStatus = false;
		video_btn.style.color = 'red';
	}
});

socket.on('user-disconnected', userId => {
	if (peerList[userId]) {
		peerList[userId].close();
		delete peerList[userId];
		delete connectionList[userId];
		vm.$data.headcount--;
		socket.emit('power', ROOM_ID, vm.$data.userId);
	}
});

socket.on('user-connected', newUserId => {
	const call = myPeer.call(newUserId, localStream);
	setCall(call, newUserId);
});

socket.on('set-room', (password, headcountLimit, clients) => {
	if (password) {
		//비밀번호가 있는 경우
		let returnValue = prompt('비밀번호를 입력하세요');
		if (returnValue === password) {
			//비밀번호가 맞은 경우
			if (clients) {
				//방인원제한이 있는 경우
				if (clients.length < headcountLimit) {
					console.log(clients.length, headcountLimit);
					socket.emit('join-room', ROOM_ID, vm.$data.userId);
				} else {
					alert('Room ' + ROOM_ID + ' is full');
					window.location.href = 'https://naver.com';
				}
			} else {
				//방인원제한이 없는 경우
				socket.emit('join-room', ROOM_ID, vm.$data.userId);
			}
		} else {
			//비밀번호가 틀린 경우
			alert('비밀번호가 틀렸습니다.');
			window.location.href = 'https://naver.com';
		}
	} else {
		//비밀번호가 없는 경우
		if (clients) {
			if (clients.length < headcountLimit) {
				socket.emit('join-room', ROOM_ID, vm.$data.userId);
			} else {
				alert('Room ' + ROOM_ID + ' is full');
				window.location.href = 'https://naver.com';
			}
		} else {
			socket.emit('join-room', ROOM_ID, vm.$data.userId);
		}
	}
});

//화면 공유
const startButton = document.getElementById('screen_btn');
function handleSuccess(stream) {
	startButton.disabled = true;
	const video = document.getElementById('local');
	video.srcObject = stream;

	const call = myPeer.call(Object.keys(peerList)[0], stream);
	setCall(call, Object.keys(peerList)[0]);
	// demonstrates how to detect that the user has stopped
	// sharing the screen via the browser UI.
	stream.getVideoTracks()[0].addEventListener('ended', () => {
		errorMsg('The user has ended sharing the screen');
		startButton.disabled = false;
	});
}

function handleError(error) {
	errorMsg(`getDisplayMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
	const errorElement = document.querySelector('#errorMsg');
	errorElement.innerHTML += `<p>${msg}</p>`;
	if (typeof error !== 'undefined') {
		console.error(error);
	}
}

screen_btn.onclick = () => {
	navigator.mediaDevices
		.getDisplayMedia({ video: true, audio: true })
		.then(handleSuccess, handleError);
};

if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
	startButton.disabled = false;
} else {
	errorMsg('getDisplayMedia is not supported');
}

getUserMedia({ video: true, audio: true }, stream => {
	if (typeof localStream === 'undefined') {
		localStream = stream;
	}
	addVideoStream(myVideo, localStream);
});

function setCall(call, userId) {
	const video = document.createElement('video');
	let div;

	call.on('stream', userVideoStream => {
		if (!callList[call.peer]) {
			div = addVideoStream(video, userVideoStream, userId);
			callList[call.peer] = call;
			peerList[call.peer] = call;
			vm.$data.headcount++;
		} else {
			callList[call.peer] = call;
			peerList[call.peer] = call;
			document.getElementById(userId).srcObject = userVideoStream;
		}
	});

	call.on('close', () => {
		if (div) {
			div.remove();
		} else {
			document.getElementById(userId).parentNode.remove();
		}
	});
}

//파라미터값 가져오기
function getParameterByName(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
	let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	let results = regex.exec(location.search);
	return results == null
		? ''
		: decodeURIComponent(results[1].replace(/\+/g, ' '));
}

//스프링과 통신
// function getUserInfo() {
// 	axios
// 		.get(`http://localhost:80/room/${ROOM_ID}/user/${userEmail}`)
// 		.then(response => {
// 			vm.$data.userInfo = response.data;
// 		})
// 		.catch(() => {
// 			alert('사용자 정보를 가져오는 중 문제가 발생했습니다.');
// 		});
// }

// function getRoomInfo() {
// 	axios
// 		.get(`http://localhost:80/room/${ROOM_ID}`)
// 		.then(response => {
// 			vm.$data.roomInfo = response.data;
// 		})
// 		.catch(() => {
// 			alert('방 정보를 가져오는 중 문제가 발생했습니다.');
// 		});
// }

function addVideoStream(video, stream, userId) {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	const div = document.createElement('div');
	if (video.id !== 'local') {
		const powerBtn = document.createElement('button');
		const reportBtn = document.createElement('button');
		const retireBtn = document.createElement('button');
		const remoteAudioBtn = document.createElement('button');
		const remoteVideoBtn = document.createElement('button');

		video.id = userId;
		reportBtn.id = 'click';
		powerBtn.className = 'power';
		retireBtn.className = 'power';
		remoteAudioBtn.className = 'power';
		remoteVideoBtn.className = 'power';

		powerBtn.innerHTML = '방장';
		reportBtn.innerHTML = '신고';
		retireBtn.innerHTML = '강퇴';
		remoteAudioBtn.innerHTML = '오디오';
		remoteVideoBtn.innerHTML = '비디오';

		//각 버튼의 기능
		powerBtn.onclick = () => {
			let returnValue = confirm('방장권한을 넘기시겠습니까?');
			if (returnValue) {
				socket.emit('power', ROOM_ID, userId);
				vm.$data.power = false;
			}
		};
		reportBtn.onclick = () => {
			let returnValue = confirm('신고하시겠습니까?');
			if (returnValue) {
				returnValue = prompt('신고할 내용을 입력하세요.');
				axios
					.post(`http://localhost:80/${ROOM_ID}/${userEmail}`, {
						params: {
							report: returnValue,
						},
					})
					.then(message => {
						alert(message);
					})
					.catch(() => {
						alert('신고 제출중 문제가 발생했습니다.');
					});
			}
		};
		retireBtn.onclick = () => {
			let returnValue = confirm('강퇴하시겠습니까?');
			if (returnValue) {
				socket.emit('retire', ROOM_ID, userId);
			}
		};
		remoteAudioBtn.onclick = () => {
			socket.emit('audio', ROOM_ID, userId);
		};
		remoteVideoBtn.onclick = () => {
			socket.emit('video', ROOM_ID, userId);
		};
		//방장인 경우만 버튼 표시
		if (!vm.$data.power) {
			powerBtn.style.display = 'none';
			retireBtn.style.display = 'none';
			remoteAudioBtn.style.display = 'none';
			remoteVideoBtn.style.display = 'none';
		}

		div.append(video);
		div.append(reportBtn);
		div.append(powerBtn);
		div.append(retireBtn);
		div.append(remoteAudioBtn);
		div.append(remoteVideoBtn);
	} else {
		div.append(video);
	}

	videoGrid.append(div);
	return div;
}

//방설정 버튼
room_close.onclick = () => {
	document.getElementById('room_wrap').style.display = 'none';
	document.getElementById('room_bg').style.display = 'none';
};

room_btn.onclick = () => {
	document.getElementById('room_wrap').style.display = 'block';
	document.getElementById('room_bg').style.display = 'block';
};

//게임 버튼
game_btn.onclick = () => {
	document.getElementById('game_wrap').style.display = 'block';
	document.getElementById('game_bg').style.display = 'block';
};

game_close.onclick = () => {
	document.getElementById('game_wrap').style.display = 'none';
	document.getElementById('game_bg').style.display = 'none';
};

//채팅 버튼
chat_btn.onclick = () => {
	document.getElementById('chat_wrap').style.display = 'block';
	document.getElementById('chat_bg').style.display = 'block';
	for (const key in peerList) {
		if (typeof connectionList[key] === 'undefined') {
			connectionList[key] = myPeer.connect(key);
			connectionList[key].on('data', data => {
				chat.innerHTML += data + `\n`;
			});
		}
	}
};

chat_close.onclick = () => {
	document.getElementById('chat_wrap').style.display = 'none';
	document.getElementById('chat_bg').style.display = 'none';
};

const chat = document.getElementById('chat');

myPeer.on('connection', con => {
	connectionList[con.peer] = con;
	con.on('data', data => {
		chat.innerHTML += data + `\n`;
	});
});

send.onclick = () => {
	if (vm.$data.chatting.replace(/\s+/g, '') !== '') {
		chat.innerHTML += vm.$data.chatting + `\n`;
		for (const key in connectionList) {
			connectionList[key].send(vm.$data.chatting);
		}
	}
	vm.$data.chatting = '';
};

//비디오 오디오 온오프 기능
video_btn.onclick = () => {
	if (videoStatus) {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = false;
		document.getElementById('local').style.display = 'none';
		video_btn.style.color = 'red';
		videoStatus = !videoStatus;
	} else {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = true;
		document.getElementById('local').style.display = 'inline';
		video_btn.style.color = null;
		videoStatus = !videoStatus;
	}
};

audio_btn.onclick = () => {
	if (audioStatus) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		audio_btn.style.color = 'red';
		audioStatus = !audioStatus;
	} else {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = true;
		audio_btn.style.color = null;
		audioStatus = !audioStatus;
	}
};

//나갈 때 스프링으로 통신
exit_btn.onclick = () => {
	//window.location.href = `http://192.168.35.115:3333/room/${userEmail}`
	window.location.href = 'https://naver.com';
};

//타이머
const timer = document.getElementById('timer');
let countStatus = false;
let timeInterval;
let time = 0;
let min = 0;
let sec = 0;

countup_btn.onclick = () => {
	vm.$data.time = 0;
	countStatus = !countStatus;
	if (countStatus) {
		timeInterval = setInterval(() => {
			min = parseInt(time / 60);
			sec = time % 60;
			timer.innerHTML = min + '분' + sec + '초';
			time++;
		}, 1000);
	} else {
		clearInterval(timeInterval);
	}
};

countdown_btn.onclick = () => {
	vm.$data.time = Number(vm.$data.time);
	if (vm.$data.time > 0) {
		time = vm.$data.time * 60;
	}
	vm.$data.time = 0;
	countStatus = !countStatus;
	if (countStatus) {
		timeInterval = setInterval(() => {
			min = parseInt(time / 60);
			sec = time % 60;
			timer.innerHTML = min + '분' + sec + '초';
			time--;
			if (time < 0) {
				clearInterval(timeInterval);
				alert('시간이 초과되었습니다.');
			}
		}, 1000);
	} else {
		clearInterval(timeInterval);
	}
};

countreset_btn.onclick = () => {
	clearInterval(timeInterval);
	timer.innerHTML = '';
};
