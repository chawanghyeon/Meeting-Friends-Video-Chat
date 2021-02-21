const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const startButton = document.getElementById('screen_btn');
const myVideo = document.createElement('video');
const chat = document.getElementById('chat');
const connectionList = {};
const callList = {};
const peerList = {};
let timeIntervalList = {};
let timeList = {};
let minList = {};
let secList = {};
let countStatus = true;
let videoFocus = true;
let videoStatus = true;
let audioStatus = true;
myVideo.muted = true;
myVideo.id = 'local';
let timer;
let localStream;
let localScreenStream;
let myPeer;

navigator.mediaDevices
	.getUserMedia({ video: true, audio: true })
	.then(stream => {
		if (typeof localStream === 'undefined') {
			localStream = stream;
		}
		addVideoStream(myVideo, localStream, vm.$data.userId);
		if (vm.$data.roomInfo.theme === '클럽하우스') {
			onClubHouseMode();
		}
	})
	.catch(error => {
		console.log(error);
	});

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
		host: false,
		userId: '',
		chatting: '',
		userEmail: '',
		roomPassword: '',
		roomInfo: {},
		userInfo: {},
	},
	computed: {
		title() {
			return this.roomInfo.title;
		},
		theme() {
			return this.roomInfo.theme;
		},
	},
	methods: {
		setRoom: function (data) {
			if (
				data.title.value !== '' &&
				data.maxPeople.value !== '' &&
				data.theme.value !== ''
			) {
				this.roomInfo.title = data.title.value;
				this.roomPassword = data.pw.value;
				this.roomInfo.maxPeople = data.maxPeople.value;
				this.roomInfo.theme = data.theme.value;
				sendRoomData();
			} else {
				alert('입력칸을 모두 채워주세요');
			}
		},
		watchClubhouse: function () {
			if (this.roomInfo.theme === '클럽하우스') {
				if (this.host) {
					socket.emit('on-clubhouse', ROOM_ID);
					let voiceBtns = document.getElementsByClassName('voice');
					for (let i = 0; i < voiceBtns.length; i++) {
						voiceBtns[i].style.display = 'inline-block';
					}
					document.getElementById('offClubHouseMode_btn').disabled = false;
					document.getElementById('audio_btn').style.display = 'inline-block';
				} else {
					let voiceBtns = document.getElementsByClassName('voice');
					for (let i = 0; i < voiceBtns.length; i++) {
						voiceBtns[i].style.display = 'none';
					}
				}
			}
		},
	},
	watch: {
		theme: function () {
			this.watchClubhouse();
		},
		roomPassword: function () {
			socket.emit('password', ROOM_ID, this.roomPassword);
		},
		title: function () {
			socket.emit('title', ROOM_ID, this.roomInfo.title);
			document.title = this.roomInfo.title;
		},
		host: function () {
			if (this.host) {
				let temp = document.getElementsByClassName('host');
				for (let index = 0; index < temp.length; index++) {
					temp[index].style.display = 'inline-block';
				}
				this.watchClubhouse();
			} else {
				let temp = document.getElementsByClassName('host');
				for (let index = 0; index < temp.length; index++) {
					temp[index].style.display = 'none';
				}
				this.watchClubhouse();
			}
		},
	},
});

//peer event
myPeer.on('open', id => {
	loadData(id);
});

myPeer.on('call', call => {
	answerCall(call);
});

myPeer.on('error', e => {
	alert(e);
});

myPeer.on('connection', connection => {
	makeConnection(connection);
});

//socket event
socket.on('set-clubhouse', () => {
	onClubHouseMode();
});

socket.on('remove-clubhouse', () => {
	offClubHouseMode();
});

socket.on('set-voice', userId => {
	beBecomedSpeakerByHost(userId);
});

socket.on('set-title', title => {
	setTitle(title);
});

socket.on('set-host', userId => {
	becomeHost(userId);
});

socket.on('retire-user', userId => {
	beKickedOutByHost(userId);
});

socket.on('set-audio', userId => {
	beSetAudioByHost(userId);
});

socket.on('set-video', userId => {
	beSetVideoByHost(userId);
});

socket.on('user-disconnected', userId => {
	disconnectUser(userId);
});

socket.on('user-connected', newUserId => {
	connectUser(newUserId);
});

socket.on('enter-room', (password, clients) => {
	enterRoom(password, clients);
});

socket.on('set-countUp', userId => {
	setRemoteCountUp(userId);
});

socket.on('set-countDown', userId => {
	setRemoteCountDown(userId);
});

socket.on('stop-count', userId => {
	clearInterval(timeIntervalList[userId]);
});

socket.on('remove-count', userId => {
	removeRemoteCount(userId);
});

socket.on('host-disconnected', () => {
	socket.emit('host-reset', ROOM_ID, vm.$data.userId);
});

socket.on('alert-userInfo', userEmail => {
	alertUserInfo(userEmail);
});

//방설정 버튼
room_btn.onclick = () => {
	openRoomModal();
};
room_close.onclick = () => {
	closeRoomModal();
};

//타이머 버튼
timer_btn.onclick = () => {
	openTimerModal();
};
timer_close.onclick = () => {
	closeTimerModal();
};

//채팅 버튼
chat_btn.onclick = () => {
	openChatModal();
};
chat_close.onclick = () => {
	closeChatModal();
};
send.onclick = () => {
	sendMessage();
};

//비디오 오디오 온오프 기능
video_btn.onclick = () => {
	if (videoStatus) {
		offVideo();
	} else {
		onVideo();
	}
};

audio_btn.onclick = () => {
	if (audioStatus) {
		offAudio();
	} else {
		onAudio();
	}
};

//button event
//나가기 버튼
exit_btn.onclick = () => {
	window.location.href = 'http://localhost:8081/waittingroom';
};

//타이머
countup_btn.onclick = () => {
	countUp(vm.$data.userId);
};

countdown_btn.onclick = () => {
	countDown(vm.$data.userId);
};

countreset_btn.onclick = () => {
	resetCount(vm.$data.userId);
};

offClubHouseMode_btn.onclick = () => {
	offClubHouseMode();
};

//화면 공유
screen_btn.onclick = () => {
	shareScreen();
};

document.onkeydown = doNotReload;

//API
function answerCall(call) {
	navigator.mediaDevices
		.getUserMedia({ video: true, audio: true })
		.then(stream => {
			if (typeof localStream === 'undefined') {
				localStream = stream;
			}
			call.answer(localStream);
			setCall(call, call.peer);
		})
		.catch(error => {
			console.log(error);
		});
}

function makeConnection(connection) {
	connectionList[connection.peer] = connection;
	connection.on('data', data => {
		document.getElementById('chat').innerHTML += data + `\n`;
	});
}

async function loadData(id) {
	vm.$data.userId = id;
	vm.$data.userEmail = getParameterByName('userEmail');
	socket.emit('email', id, vm.$data.userEmail);

	if (vm.$data.userEmail !== '') {
		await getUserInfo();
		await getRoomInfo();
	}

	document.title = vm.$data.roomInfo.title;
	socket.emit('check-room', ROOM_ID);
}

function beBecomedSpeakerByHost(userId) {
	if (vm.$data.userId === userId) {
		document.getElementById('audio_btn').style.display = 'inline-block';
	} else {
		document.getElementById('audio_btn').style.display = 'none';
	}
}

function setTitle(title) {
	if (title) {
		vm.$data.roomInfo.title = title;
		document.title = title;
	}
}

function becomeHost(userId) {
	if (vm.$data.userId === userId) {
		vm.$data.host = true;
	}
}

function beKickedOutByHost(userId) {
	if (userId === vm.$data.userId) {
		window.location.href = 'http://192.168.35.115:8081/waittingroom';
	}
}

function beSetAudioByHost(userId) {
	if (vm.$data.userId === userId) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		audioStatus = false;
		audio_btn.style.color = 'red';
	}
}

function beSetVideoByHost(userId) {
	if (vm.$data.userId === userId) {
		document
			.getElementById('local')
			.srcObject.getVideoTracks()[0].enabled = false;
		videoStatus = false;
		video_btn.style.color = 'red';
	}
}

function disconnectUser(userId) {
	if (peerList[userId]) {
		peerList[userId].close();
		delete peerList[userId];
		delete connectionList[userId];
		vm.$data.headcount--;
	}
}

function connectUser(newUserId) {
	let callUser;
	if (startButton.disabled) {
		callUser = myPeer.call(newUserId, localScreenStream);
	} else {
		callUser = myPeer.call(newUserId, localStream);
	}
	setCall(callUser, newUserId);
}

function enterRoom(password, clients) {
	if (password) {
		//비밀번호가 있는 경우
		let returnValue = prompt('비밀번호를 입력하세요');
		if (returnValue === password) {
			//비밀번호가 맞은 경우
			if (clients) {
				console.log(clients);
				if (clients.length < vm.$data.roomInfo.maxPeople) {
					socket.emit('join-room', ROOM_ID, vm.$data.userId);
				} else {
					alert('Room ' + ROOM_ID + ' is full');
					window.location.href = document.referrer;
				}
			} else {
				socket.emit('join-room', ROOM_ID, vm.$data.userId);
			}
		} else {
			//비밀번호가 틀린 경우
			alert('비밀번호가 틀렸습니다.');
			window.location.href = document.referrer;
		}
	} else {
		//비밀번호가 없는 경우
		if (clients) {
			if (clients.length < vm.$data.roomInfo.maxPeople) {
				socket.emit('join-room', ROOM_ID, vm.$data.userId);
			} else {
				alert('Room ' + ROOM_ID + ' is full');
				window.location.href = document.referrer;
			}
		} else {
			socket.emit('join-room', ROOM_ID, vm.$data.userId);
		}
	}
}

//화면 공유
function shareScreen() {
	navigator.mediaDevices
		.getDisplayMedia({ video: true, audio: true })
		.then(handleSuccess, handleError);
}

function handleSuccess(stream) {
	const video = document.getElementById('local');
	startButton.disabled = true;
	video.srcObject = stream;
	localScreenStream = stream;

	//for문으로 모든 유저한테 공유하기
	makeScreenCall(stream);
	stream.getVideoTracks()[0].addEventListener('ended', () => {
		startButton.disabled = false;
		video.srcObject = localStream;
		makeScreenCall(localStream);
		errorMsg('The user has ended sharing the screen');
	});
}

function makeScreenCall(stream) {
	Object.keys(peerList).forEach(element => {
		const call = myPeer.call(element, stream);
		setCall(call, element);
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
function sendRoomData() {
	axios
		.post(
			`http://localhost:80/changeroominfo`,
			JSON.stringify(vm.$data.roomInfo),
			{
				headers: { 'Content-Type': `application/json` },
			}
		)
		.then(() => {
			alert('방 설정을 변경했습니다.');
		})
		.catch(e => {
			console.log(e);
			alert('방 정보를 저장하는 중 문제가 발생했습니다.');
		});
}

async function getRoomInfo() {
	await axios
		.get(`http://localhost:80/room/${ROOM_ID}`, {
			headers: { 'Access-Control-Allow-Origin': '*' },
		})
		.then(response => {
			vm.$data.roomInfo = response.data;
		})
		.catch(e => {
			alert('방 정보를 가져오는 중 문제가 발생했습니다.');
		});
}

async function getUserInfo() {
	await axios
		.get(`http://localhost:80/user/${vm.$data.userEmail}`, {
			headers: { 'Access-Control-Allow-Origin': '*' },
		})
		.then(response => {
			vm.$data.userInfo = response.data;
		})
		.catch(e => {
			alert('유저 정보를 가져오는 중 문제가 발생했습니다.');
		});
}

function addVideoStream(video, stream, userId) {
	video.srcObject = stream;
	video.addEventListener('loadedmetadata', () => {
		video.play();
	});
	const div = document.createElement('div');
	if (video.id !== 'local') {
		const hostBtn = document.createElement('button');
		const retireBtn = document.createElement('button');
		const remoteAudioBtn = document.createElement('button');
		const remoteVideoBtn = document.createElement('button');
		const voiceBtn = document.createElement('button');

		video.id = userId;
		voiceBtn.className = 'voice';
		hostBtn.className = 'host';
		retireBtn.className = 'host';
		remoteAudioBtn.className = 'host';
		remoteVideoBtn.className = 'host';

		voiceBtn.innerHTML = '발언권';
		hostBtn.innerHTML = '방장';
		retireBtn.innerHTML = '강퇴';
		remoteAudioBtn.innerHTML = '오디오';
		remoteVideoBtn.innerHTML = '비디오';

		//각 버튼의 기능
		voiceBtn.onclick = () => {
			let returnValue = confirm('발언권을 넘기시겠습니까?');
			if (returnValue) {
				socket.emit('voice', ROOM_ID, userId);
			}
		};

		hostBtn.onclick = () => {
			let returnValue = confirm('방장권한을 넘기시겠습니까?');
			if (returnValue) {
				socket.emit('host', ROOM_ID, userId);
				vm.$data.host = false;
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
		if (!vm.$data.host) {
			hostBtn.style.display = 'none';
			retireBtn.style.display = 'none';
			remoteAudioBtn.style.display = 'none';
			remoteVideoBtn.style.display = 'none';
		} else {
			if (vm.$data.roomInfo.theme !== '클럽하우스') {
				voiceBtn.style.display = 'none';
			} else {
				voiceBtn.style.display = 'inline-block';
			}
		}

		div.append(video);
		div.append(hostBtn);
		div.append(retireBtn);
		div.append(voiceBtn);
		div.append(remoteAudioBtn);
		div.append(remoteVideoBtn);
	} else {
		div.append(video);
	}

	video.addEventListener('dblclick', () => {
		if (videoFocus) {
			div.remove();
			videoGrid.style.display = 'none';
			let focus = document.getElementById('focus');
			focus.append(div);
			focus.style.display = 'block';
			videoFocus = !videoFocus;
		} else {
			div.remove();
			document.getElementById('focus').style.display = 'none';
			videoGrid.style.display = 'grid';
			videoGrid.append(div);
			videoFocus = !videoFocus;
		}
	});

	video.addEventListener('contextmenu', () => {
		socket.emit('userInfo', userId);
	});

	timer = document.createElement('div');
	timer.setAttribute('name', userId);
	timer.className = 'timer';

	div.append(timer);
	videoGrid.append(div);
	return div;
}

function alertUserInfo(userEmail) {
	for (let i = 0; i < vm.$data.roomInfo.roommember.length; i++) {
		if (vm.$data.roomInfo.roommember[i].id === userEmail) {
			let temp = vm.$data.roomInfo.roommember[i];
			alert(`닉네임 : ${temp.nickname} 성별 : ${temp.gender}`);
			break;
		}
	}
}

function onClubHouseMode() {
	if (!vm.$data.host) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		document.getElementById('audio_btn').style.display = 'none';
	} else {
		document.getElementById('offClubHouseMode_btn').disabled = false;
	}
}

function offClubHouseMode() {
	if (vm.$data.host) {
		socket.emit('off-clubhouse', ROOM_ID);

		vm.$data.roomInfo.theme = '수다방';
		sendRoomData();

		document.getElementById('offClubHouseMode_btn').disabled = true;
		let voiceBtns = document.getElementsByClassName('voice');
		for (let i = 0; i < voiceBtns.length; i++) {
			voiceBtns[i].style.display = 'none';
		}
	} else {
		document.getElementById('audio_btn').style.display = 'inline-block';
	}
}

function resetCount(userId) {
	clearInterval(timeIntervalList[userId]);
	timeList[userId] = 0;
	minList[userId] = 0;
	secList[userId] = 0;
	document.getElementsByName(userId)[0].innerHTML = '';
	socket.emit('reset-count', ROOM_ID, userId);
}

function countUp(userId) {
	if (countStatus) {
		socket.emit('on-countUp', ROOM_ID, vm.$data.userId);

		if (typeof timeList[userId] === 'undefined') {
			timeList[userId] = 0;
		}

		timeIntervalList[userId] = setInterval(() => {
			minList[userId] = parseInt(timeList[userId] / 60);
			secList[userId] = timeList[userId] % 60;

			document.getElementsByName(
				userId
			)[0].innerHTML = `${minList[userId]}분 ${secList[userId]}초`;
			timeList[userId]++;
		}, 1000);
		countStatus = !countStatus;
	} else {
		clearInterval(timeIntervalList[userId]);
		socket.emit('off-count', ROOM_ID, vm.$data.userId);
		countStatus = !countStatus;
	}
}

function countDown(userId) {
	if (countStatus) {
		if (vm.$data.time > 0) {
			socket.emit('on-countDown', ROOM_ID, vm.$data.userId, vm.$data.time);

			vm.$data.time = Number(vm.$data.time);
			timeList[userId] = vm.$data.time * 60;
			vm.$data.time = 0;

			timeIntervalList[userId] = setInterval(() => {
				minList[userId] = parseInt(timeList[userId] / 60);
				secList[userId] = timeList[userId] % 60;

				document.getElementsByName(
					userId
				)[0].innerHTML = `${minList[userId]}분 ${secList[userId]}초`;
				timeList[userId]--;

				if (timeList[userId] < 0) {
					clearInterval(timeIntervalList[userId]);
					alert('시간이 초과되었습니다.');
				}
			}, 1000);
			countStatus = !countStatus;
		}
	} else {
		clearInterval(timeIntervalList[userId]);
		socket.emit('off-count', ROOM_ID, vm.$data.userId);
		countStatus = !countStatus;
	}
}

function doNotReload() {
	if (
		(event.ctrlKey == true && (event.keyCode == 78 || event.keyCode == 82)) ||
		event.keyCode == 116
	) {
		event.keyCode = 0;
		event.cancelBubble = true;
		event.returnValue = false;
	}
}

function closeRoomModal() {
	document.getElementById('room_wrap').style.display = 'none';
	document.getElementById('room_bg').style.display = 'none';
}

function openRoomModal() {
	document.getElementById('room_wrap').style.display = 'block';
	document.getElementById('room_bg').style.display = 'block';
}

function closeTimerModal() {
	document.getElementById('timer_wrap').style.display = 'none';
	document.getElementById('timer_bg').style.display = 'none';
}

function openTimerModal() {
	document.getElementById('timer_wrap').style.display = 'block';
	document.getElementById('timer_bg').style.display = 'block';
}

function closeChatModal() {
	document.getElementById('chat_wrap').style.display = 'none';
	document.getElementById('chat_bg').style.display = 'none';
}

function openChatModal() {
	document.getElementById('chat_wrap').style.display = 'block';
	document.getElementById('chat_bg').style.display = 'block';
	for (const key in peerList) {
		if (typeof connectionList[key] === 'undefined') {
			connectionList[key] = myPeer.connect(key);
			connectionList[key].on('data', data => {
				document.getElementById('chat').innerHTML += data + `\n`;
			});
		}
	}
}

function sendMessage() {
	if (vm.$data.chatting.replace(/\s+/g, '') !== '') {
		document.getElementById('chat').innerHTML +=
			vm.$data.userInfo.id + ': ' + vm.$data.chatting + `\n`;
		for (const key in connectionList) {
			connectionList[key].send(vm.$data.userInfo.id + ': ' + vm.$data.chatting);
		}
	}
	vm.$data.chatting = '';
}

function offVideo() {
	document
		.getElementById('local')
		.srcObject.getVideoTracks()[0].enabled = false;
	document.getElementById('local').style.display = 'none';
	video_btn.style.color = 'red';
	videoStatus = !videoStatus;
}

function onVideo() {
	document.getElementById('local').srcObject.getVideoTracks()[0].enabled = true;
	document.getElementById('local').style.display = 'inline';
	video_btn.style.color = null;
	videoStatus = !videoStatus;
}

function offAudio() {
	document
		.getElementById('local')
		.srcObject.getAudioTracks()[0].enabled = false;
	audio_btn.style.color = 'red';
	audioStatus = !audioStatus;
}

function onAudio() {
	document.getElementById('local').srcObject.getAudioTracks()[0].enabled = true;
	audio_btn.style.color = null;
	audioStatus = !audioStatus;
}

function setRemoteCountUp(userId) {
	if (typeof timeList[userId] === 'undefined') {
		timeList[userId] = 0;
	}
	timeIntervalList[userId] = setInterval(() => {
		minList[userId] = parseInt(timeList[userId] / 60);
		secList[userId] = timeList[userId] % 60;

		document.getElementsByName(
			userId
		)[0].innerHTML = `${minList[userId]}분 ${secList[userId]}초`;
		timeList[userId]++;
	}, 1000);
}

function setRemoteCountDown(userId) {
	vm.$data.time = Number(vm.$data.time);
	if (vm.$data.time > 0) {
		timeList[userId] = vm.$data.time * 60;
	}
	vm.$data.time = 0;
	countStatus = !countStatus;
	timeIntervalList[userId] = setInterval(() => {
		minList[userId] = parseInt(timeList[userId] / 60);
		secList[userId] = timeList[userId] % 60;
		document.getElementsByName(
			userId
		)[0].innerHTML = `${minList[userId]}분 ${secList[userId]}초`;
		timeList[userId]--;
		if (timeList[userId] < 0) {
			clearInterval(timeIntervalList[userId]);
		}
	}, 1000);
}

function removeRemoteCount(userId) {
	clearInterval(timeIntervalList[userId]);
	timeList[userId] = 0;
	minList[userId] = 0;
	secList[userId] = 0;
	document.getElementsByName(userId)[0].innerHTML = '';
}
