export {
	handleError,
	handleSuccess,
	makeConnection,
	makeScreenCall,
	errorMsg,
	addVideoStream,
	countDown,
	countUp,
	getParameterByName,
	getTracks,
	resetTimer,
	sendMessage,
	setAudio,
	setCall,
	setVideo,
};
const videoGrid = document.getElementById('video-grid');
let videoTrack;
let audioTrack;
const callList = {};
const timer = document.getElementById('timer');
let countStatus = false;
let timeInterval;
let time = 0;
let min = 0;
let sec = 0;

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

function getTracks() {
	videoTrack = document.getElementById('local').srcObject.getVideoTracks()[0]
		.enabled;
	audioTrack = document.getElementById('local').srcObject.getAudioTracks()[0]
		.enabled;
}

function makeConnection() {
	for (const key in peerList) {
		if (typeof connectionList[key] === 'undefined') {
			connectionList[key] = myPeer.connect(key);
			connectionList[key].on('data', data => {
				chat.innerHTML += data + `\n`;
			});
		}
	}
}

function sendMessage() {
	if (vm.$data.chatting.replace(/\s+/g, '') !== '') {
		chat.innerHTML += vm.$data.chatting + `\n`;
		for (const key in connectionList) {
			connectionList[key].send(vm.$data.chatting);
		}
	}
	vm.$data.chatting = '';
}

let videoStatus = true;
let audioStatus = true;
function setVideo() {
	if (videoStatus) {
		videoTrack = false;
		document.getElementById('local').style.display = 'none';
		video_btn.style.color = 'red';
		videoStatus = !videoStatus;
	} else {
		videoTrack = true;
		document.getElementById('local').style.display = 'inline';
		video_btn.style.color = null;
		videoStatus = !videoStatus;
	}
}

function setAudio() {
	if (audioStatus) {
		audioTrack = false;
		audio_btn.style.color = 'red';
		audioStatus = !audioStatus;
	} else {
		audioTrack = true;
		audio_btn.style.color = null;
		audioStatus = !audioStatus;
	}
}

function countUp() {
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
}

function countDown() {
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
}

function resetTimer() {
	clearInterval(timeInterval);
	timer.innerHTML = '';
}
