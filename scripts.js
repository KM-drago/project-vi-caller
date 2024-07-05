const username = "KM:" + Math.floor(Math.random() * 100000);
const password = "asjfasj";
document.getElementById("user-name").innerHTML = username;

const socket = io.connect("https://localhost:8181", {
  auth: {
    username,
    password,
  },
});

const localVidE = document.getElementById("local-vid");
const remoteVidE = document.getElementById("remote-vid");

let localStream;
let remoteStream;
let peerConnection;
let didIOffer = false;

let peerConfig = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
  ],
};

async function call(e) {
  await fetchUserMedia();

  await createPeerConnection();

  try {
    console.log("Creating offer...");
    const offer = await peerConnection.createOffer();
    console.log(offer);
    peerConnection.setLocalDescription(offer);
    didIOffer = true;
    socket.emit("newOffer", offer);
  } catch (err) {
    console.log(err);
  }
}

async function answerOffer(offerObj) {
  await fetchUserMedia();
  await createPeerConnection(offerObj);

  const answer = await peerConnection.createAnswer({});
  await peerConnection.setLocalDescription(answer);
  console.log(offerObj);
  console.log(answer);

  offerObj.answer = answer;

  const offerIceCandidates = await socket.emitWithAck("newAnswer", offerObj);
  offerIceCandidates.forEach((c) => {
    peerConnection.addIceCandidate(c);
    console.log("ICE CANDIDATE ADDED");
  });
  console.log(offerIceCandidates);
}

async function addAnswer(offerObj) {
  await peerConnection.setRemoteDescription(offerObj.answer);
}

function fetchUserMedia() {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVidE.srcObject = stream;
      localStream = stream;
      resolve();
    } catch (err) {
      console.log(err);
      reject();
    }
  });
}

function createPeerConnection(offerObj) {
  return new Promise(async (resolve, reject) => {
    peerConnection = await new RTCPeerConnection(peerConfig);

    remoteStream = new MediaStream();
    remoteVidE.srcObject = remoteStream;

    localStream.getTracks().forEach((TrackEvent) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.addEventListener("signalingestatechange", (e) => {
      console.log(e);
      console.log(peerConnection.signalingState);
    });

    peerConnection.addEventListener("icecandidate", (e) => {
      console.log("ICE CANDIDATE FOUND");
      console.log(e);
      if (e.candidate) {
        socket.emit("sendIceCandidateToSignalingServer", {
          iceCandidate: e.candidate,
          iceUserName: username,
          didIOffer,
        });
      }
    });

    peerConnection.addEventListener("track", (e) => {
      console.log("Track received from other peer");
      console.log(e);
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track, remoteStream);
        console.log("Track added to remote stream");
      });
    });

    if (offerObj) {
      await peerConnection.setRemoteDescription(offerObj.offer);
    }
    resolve();
  });
}

function addNewIceCandidate(iceCandidate) {
  peerConnection.addIceCandidate(iceCandidate);
  console.log("ICE CANDIDATE ADDED");
}

document.getElementById("call-btn").addEventListener("click", call);
