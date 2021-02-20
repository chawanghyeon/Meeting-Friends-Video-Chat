const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
const connectionList = {};
const callList = {};
const peerList = {};
let timer;
let localStream;
let localScreenStream;
let myPeer;
let videoFocus = true;
let videoStatus = true;
let audioStatus = true;
myVideo.muted = true;
myVideo.id = 'local';

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
		power: false,
		userId: '',
		chatting: '',
		userEmail: '',
		roomPassword: '',
		roomInfo: {},
		userInfo: {},
		testRoom: {},
	},
	computed: {
		title() {
			return this.roomInfo.title;
		},
		maxPeople() {
			return this.roomInfo.maxPeople;
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
				console.log(data.title.value);
				this.roomInfo.title = data.title.value;
				this.roomPassword = data.pw.value;
				this.roomInfo.maxPeople = data.maxPeople.value;
				this.roomInfo.theme = data.theme.value;
				sendRoomData();
			} else {
				alert('입력칸을 모두 채워주세요');
			}
		},
	},
	watch: {
		theme: function () {
			if (this.roomInfo.theme === '클럽하우스') {
				socket.emit('on-clubhouse', ROOM_ID);
				let voiceBtns = document.getElementsByClassName('voice');
				for (let i = 0; i < voiceBtns.length; i++) {
					voiceBtns[i].style.display = 'inline-block';
				}
				document.getElementById('offClubHouseMode_btn').disabled = false;
			}
		},
		roomPassword: function () {
			socket.emit('password', ROOM_ID, this.roomPassword);
		},
		title: function () {
			socket.emit('title', ROOM_ID, this.roomInfo.title);
			document.title = this.roomInfo.title;
		},
		maxPeople: function () {
			if (
				this.roomInfo.maxPeople >= this.headcount &&
				this.roomInfo.maxPeople < 9
			) {
				socket.emit('maxPeople', ROOM_ID, this.roomInfo.maxPeople);
			} else {
				this.roomInfo.maxPeople = this.headcount;
			}
			if (this.roomInfo.maxPeople === '') {
				this.roomInfo.maxPeople = 0;
			}
			this.roomInfo.maxPeople = Number(this.roomInfo.maxPeople);
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
	vm.$data.roomId = ROOM_ID;
	vm.$data.userId = id;
	vm.$data.userEmail = getParameterByName('userEmail');
	socket.emit('email', id, vm.$data.userEmail);
	loadData();
});

async function loadData() {
	if (vm.$data.userEmail !== '') {
		await getUserInfo();
		await getRoomInfo();
	}
	document.title = vm.$data.roomInfo.title;
	socket.emit('check-room', ROOM_ID);
}

//연결을 요청하는 곳에서 받는 call
myPeer.on('call', call => {
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
});

myPeer.on('error', e => {
	alert(e);
});

socket.on('set-clubhouse', () => {
	onClubHouseMode();
});

socket.on('remove-clubhouse', () => {
	offClubHouseMode();
});

socket.on('set-voice', userId => {
	if (vm.$data.userId === userId) {
		document.getElementById('audio_btn').style.display = 'inline-block';
	} else {
		document.getElementById('audio_btn').style.display = 'none';
	}
});

socket.on('set-title', title => {
	if (title) {
		vm.$data.roomInfo.title = title;
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
		window.location.href = 'http://192.168.35.115:8081/waittingroom';
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
		//exit
	}
});

socket.on('user-connected', newUserId => {
	let callUser;
	if (startButton.disabled) {
		callUser = myPeer.call(newUserId, localScreenStream);
	} else {
		callUser = myPeer.call(newUserId, localStream);
	}
	setCall(callUser, newUserId);
});

socket.on('enter-room', (password, clients) => {
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
});

//화면 공유
const startButton = document.getElementById('screen_btn');

function handleSuccess(stream) {
	startButton.disabled = true;
	const video = document.getElementById('local');
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

screen_btn.onclick = () => {
	navigator.mediaDevices
		.getDisplayMedia({ video: true, audio: true })
		.then(handleSuccess, handleError);
};

//이거 에러???
// if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
// 	startButton.disabled = false;
// } else {
// 	errorMsg('getDisplayMedia is not supported');
// }

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
		.then(response => {
			console.log(response.data);
		})
		.catch(e => {
			console.log(e);
			alert('방 정보를 저장하는 중 문제가 발생했습니다.');
		});
}
let e;
async function getRoomInfo() {
	await axios
		.get(`http://localhost:80/room/${ROOM_ID}`, {
			headers: { 'Access-Control-Allow-Origin': '*' },
		})
		.then(response => {
			console.log('getroom');
			e = response.data;
			vm.$data.roomInfo = response.data;
		})
		.catch(e => {
			console.log(e);
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
			console.log(e);
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
		const powerBtn = document.createElement('button');
		const retireBtn = document.createElement('button');
		const remoteAudioBtn = document.createElement('button');
		const remoteVideoBtn = document.createElement('button');
		const voiceBtn = document.createElement('button');

		video.id = userId;
		voiceBtn.className = 'voice';
		powerBtn.className = 'power';
		retireBtn.className = 'power';
		remoteAudioBtn.className = 'power';
		remoteVideoBtn.className = 'power';

		voiceBtn.innerHTML = '발언권';
		powerBtn.innerHTML = '방장';
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
		powerBtn.onclick = () => {
			let returnValue = confirm('방장권한을 넘기시겠습니까?');
			if (returnValue) {
				socket.emit('power', ROOM_ID, userId);
				vm.$data.power = false;
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
		} else {
			if (vm.$data.roomInfo.theme !== '클럽하우스') {
				voiceBtn.style.display = 'none';
			} else {
				voiceBtn.style.display = 'inline-block';
			}
		}

		div.append(video);
		div.append(powerBtn);
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
			focus.style.display = 'inline-block';
			videoFocus = !videoFocus;
		} else {
			div.remove();
			document.getElementById('focus').style.display = 'none';
			videoGrid.style.display = 'grid';
			videoGrid.append(div);
			videoFocus = !videoFocus;
		}
	});

	timer = document.createElement('div');
	timer.setAttribute('name', userId);
	timer.className = 'timer';
	div.append(timer);
	videoGrid.append(div);
	return div;
}

function onClubHouseMode() {
	if (!vm.$data.power) {
		document
			.getElementById('local')
			.srcObject.getAudioTracks()[0].enabled = false;
		document.getElementById('audio_btn').style.display = 'none';
	} else {
		document.getElementById('offClubHouseMode_btn').disabled = false;
	}
}

function offClubHouseMode() {
	if (!vm.$data.power) {
		document.getElementById('audio_btn').style.display = 'inline-block';
	} else {
		document.getElementById('offClubHouseMode_btn').disabled = true;
		let voiceBtns = document.getElementsByClassName('voice');
		for (let i = 0; i < voiceBtns.length; i++) {
			voiceBtns[i].style.display = 'none';
		}
	}
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
timer_btn.onclick = () => {
	document.getElementById('timer_wrap').style.display = 'block';
	document.getElementById('timer_bg').style.display = 'block';
};

timer_close.onclick = () => {
	document.getElementById('timer_wrap').style.display = 'none';
	document.getElementById('timer_bg').style.display = 'none';
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
		chat.innerHTML += vm.$data.userInfo.id + ': ' + vm.$data.chatting + `\n`;
		for (const key in connectionList) {
			connectionList[key].send(vm.$data.userInfo.id + ': ' + vm.$data.chatting);
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
	axios
		.get(
			`http://localhost:80/exitroom/room/${ROOM_ID}/user/${vm.$data.userEmail}`
		)
		.then(() => {
			window.location.href = 'http://192.168.35.115:8081/waittingroom';
		})
		.catch(() => {
			alert('나가는 중 문제가 발생했습니다.');
		});
};

//타이머
let countStatus = true;
let timeIntervalList = {};
let timeList = {};
let minList = {};
let secList = {};

function countUp(userId) {
	vm.$data.time = 0;
	if (countStatus) {
		if (typeof timeList[userId] === 'undefined') {
			timeList[userId] = 0;
			minList[userId] = 0;
			secList[userId] = 0;
		}
		timeIntervalList[userId] = setInterval(() => {
			minList[userId] = parseInt(timeList[userId] / 60);
			secList[userId] = timeList[userId] % 60;
			document.getElementsByName(userId)[0].innerHTML =
				minList[userId] + '분' + secList[userId] + '초';
			timeList[userId]++;
		}, 1000);
		countStatus = !countStatus;
	} else {
		clearInterval(timeIntervalList[userId]);
		countStatus = !countStatus;
	}
}

socket.on('set-countUp', userId => {
	if (typeof timeList[userId] === 'undefined') {
		timeList[userId] = 0;
		minList[userId] = 0;
		secList[userId] = 0;
	}
	timeIntervalList[userId] = setInterval(() => {
		minList[userId] = parseInt(timeList[userId] / 60);
		secList[userId] = timeList[userId] % 60;
		document.getElementsByName(userId)[0].innerHTML =
			minList[userId] + '분' + secList[userId] + '초';
		timeList[userId]++;
	}, 1000);
});

socket.on('set-countDown', userId => {
	if (typeof timeList[userId] === 'undefined') {
		timeList[userId] = 0;
		minList[userId] = 0;
		secList[userId] = 0;
	}
	vm.$data.time = Number(vm.$data.time);
	if (vm.$data.time > 0) {
		timeList[userId] = vm.$data.time * 60;
	}
	vm.$data.time = 0;
	countStatus = !countStatus;
	timeIntervalList[userId] = setInterval(() => {
		minList[userId] = parseInt(timeList[userId] / 60);
		secList[userId] = timeList[userId] % 60;
		document.getElementsByName(userId)[0].innerHTML =
			minList[userId] + '분' + secList[userId] + '초';
		timeList[userId]--;
		if (timeList[userId] < 0) {
			clearInterval(timeIntervalList[userId]);
		}
	}, 1000);
});

socket.on('stop-count', userId => {
	clearInterval(timeIntervalList[userId]);
});

socket.on('remove-count', userId => {
	clearInterval(timeIntervalList[userId]);
	timeList[userId] = 0;
	minList[userId] = 0;
	secList[userId] = 0;
	document.getElementsByName(userId)[0].innerHTML = '';
});

let sendStatus = true;
countup_btn.onclick = () => {
	countUp(vm.$data.userId);
	if (sendStatus) {
		socket.emit('on-countUp', ROOM_ID, vm.$data.userId);
		sendStatus = !sendStatus;
	} else {
		socket.emit('off-count', ROOM_ID, vm.$data.userId);
		sendStatus = !sendStatus;
	}
};

function countDown(userId) {
	if (countStatus) {
		if (typeof timeList[userId] === 'undefined') {
			timeList[userId] = 0;
			minList[userId] = 0;
			secList[userId] = 0;
		}
		vm.$data.time = Number(vm.$data.time);
		if (vm.$data.time > 0) {
			timeList[userId] = vm.$data.time * 60;
		}
		vm.$data.time = 0;
		countStatus = !countStatus;
		timeIntervalList[userId] = setInterval(() => {
			minList[userId] = parseInt(timeList[userId] / 60);
			secList[userId] = timeList[userId] % 60;
			document.getElementsByName(userId)[0].innerHTML =
				minList[userId] + '분' + secList[userId] + '초';
			timeList[userId]--;
			if (timeList[userId] < 0) {
				clearInterval(timeIntervalList[userId]);
				alert('시간이 초과되었습니다.');
			}
		}, 1000);
	} else {
		clearInterval(timeIntervalList[userId]);
		countStatus = !countStatus;
	}
}
countdown_btn.onclick = () => {
	countDown(vm.$data.userId);
	if (sendStatus) {
		socket.emit('on-countDown', ROOM_ID, vm.$data.userId);
		sendStatus = !sendStatus;
	} else {
		socket.emit('off-count', ROOM_ID, vm.$data.userId);
		sendStatus = !sendStatus;
	}
};

function resetCount(userId) {
	clearInterval(timeIntervalList[userId]);
	timeList[userId] = 0;
	minList[userId] = 0;
	secList[userId] = 0;
	document.getElementsByName(userId)[0].innerHTML = '';
	socket.emit('reset-count', ROOM_ID, userId);
}
countreset_btn.onclick = () => {
	resetCount(vm.$data.userId);
};

offClubHouseMode_btn.onclick = () => {
	socket.emit('off-clubhouse', ROOM_ID);
	offClubHouseMode();
};

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
document.onkeydown = doNotReload;
