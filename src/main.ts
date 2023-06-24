import "./style.css";
import { initializeApp } from "firebase/app";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    setDoc,
    updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBVz8IuV_wa-YdfkFiIoQXQmIDqljvahQ8",
    authDomain: "meetpoint-2fe02.firebaseapp.com",
    projectId: "meetpoint-2fe02",
    storageBucket: "meetpoint-2fe02.appspot.com",
    messagingSenderId: "114339595120",
    appId: "1:114339595120:web:9363dc2e4d3790b2ff05b5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// db.toJSON()
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

const webcamButton = document.getElementById(
    "webcamButton"
) as HTMLButtonElement;
const webcamVideo = document.getElementById("webcamVideo") as HTMLVideoElement;
const callButton = document.getElementById("callButton") as HTMLButtonElement;
const callInput = document.getElementById("callInput") as HTMLInputElement;
const answerButton = document.getElementById(
    "answerButton"
) as HTMLButtonElement;
const remoteVideo = document.getElementById("remoteVideo") as HTMLVideoElement;
const hangupButton = document.getElementById(
    "hangupButton"
) as HTMLButtonElement;

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

        callButton.disabled = false;
        answerButton.disabled = false;
        webcamButton.disabled = true;
    };
}

if (callButton) {
    callButton.onclick = async () => {
        const callDoc = await addDoc(collection(db, "calls"), {});
        const offerCandidates = collection(
            db,
            "calls",
            callDoc.id,
            "offerCandidates"
        );
        const answerCandidates = collection(
            db,
            "calls",
            callDoc.id,
            "answerCandidates"
        );

        callInput.value = callDoc.id;

        pc.onicecandidate = async (event) => {
            event.candidate &&
                (await addDoc(offerCandidates, event.candidate.toJSON()));
        };
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await setDoc(callDoc, { offer });

        onSnapshot(callDoc, (doc) => {
            const data = doc.data();
            if (!pc.currentLocalDescription && data?.answer) {
                const answerDescriptor = new RTCSessionDescription(data.answer);
                pc.setRemoteDescription(answerDescriptor);
            }
        });

        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            });
        });
        hangupButton.disabled = false;
    };
}

if (answerButton) {
    answerButton.onclick = async () => {
        const callId = callInput.value;
        const callDoc = doc(db, "calls", callId);
        const answerCandidates = collection(
            db,
            "calls",
            callId,
            "answerCandidates"
        );
        const offerCandidates = collection(
            db,
            "calls",
            callId,
            "offerCandidates"
        );

        pc.onicecandidate = async (event) => {
            event.candidate &&
                (await addDoc(answerCandidates, event.candidate.toJSON()));
        };
        const callData = (await getDoc(callDoc)).data();
        const offerDescription = callData?.offer;
        await pc.setRemoteDescription(
            new RTCSessionDescription(offerDescription)
        );

        const answerDescriptor = await pc.createAnswer();
        await pc.setLocalDescription(answerDescriptor);

        const answer = {
            type: answerDescriptor.type,
            sdp: answerDescriptor.sdp,
        };

        await updateDoc(callDoc, { answer });

        onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            });
        });
    };
}
