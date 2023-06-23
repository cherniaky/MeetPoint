import "./style.css";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "AIzaSyBVz8IuV_wa-YdfkFiIoQXQmIDqljvahQ8",
    authDomain: "meetpoint-2fe02.firebaseapp.com",
    projectId: "meetpoint-2fe02",
    storageBucket: "meetpoint-2fe02.appspot.com",
    messagingSenderId: "114339595120",
    appId: "1:114339595120:web:9363dc2e4d3790b2ff05b5",
};

const app = initializeApp(firebaseConfig);

const servers = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

let pc = new RTCPeerConnection(servers);

let localStream: null | MediaStream = null;
let remoteStream: null | MediaStream = null;

const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo") as HTMLVideoElement;
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
const hangupButton = document.getElementById("hangupButton");

if (webcamButton) {
    webcamButton.onclick = async () => {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        remoteStream = new MediaStream();

        localStream.getTracks().forEach((track) => {
            if (localStream) {
                pc.addTrack(track, localStream);
            }
        });
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream?.addTrack(track);
            });
        };

        if (webcamVideo && remoteVideo) {
            webcamVideo.srcObject = localStream;
            remoteVideo.srcObject = remoteStream;
        }
    };
}
