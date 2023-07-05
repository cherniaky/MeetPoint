import { VideoState } from "./App";
import { sendDataToConnection } from "./socket";

export const iceConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // { urls: "stun:stun1.l.google.com:19302" },
        // { urls: "stun:stun2.l.google.com:19302" },
        // { urls: "stun:stun3.l.google.com:19302" },
        // { urls: "stun:stun4.l.google.com:19302" },
    ],
};

export const connectedPeers: {
    [key: string]: RTCPeerConnection;
} = {};
export const connectedPeersIds: Array<string> = [];

export const remoteVideoStreams: {
    [key: string]: MediaStream;
} = {};
export const remoteAudioStreams: {
    [key: string]: MediaStream;
} = {};

export type rtpSenders = {
    [key: string]: RTCRtpSender | null;
};
export const rtpVideoSenders: rtpSenders = {};
export const rtpAudioSenders: rtpSenders = {};

export function isConnectionAvailable(connection: RTCPeerConnection) {
    if (
        connection &&
        (connection.connectionState == "new" ||
            connection.connectionState == "connecting" ||
            connection.connectionState == "connected")
    ) {
        return true;
    } else return false;
}

export async function createConnection(
    connectionId: string,
    videoState: VideoState,
    videoTrack: MediaStreamTrack | null
) {
    const connection = new RTCPeerConnection(iceConfiguration);

    connection.onicecandidate = function (event) {
        if (event.candidate) {
            console.log("event.candidate");

            sendDataToConnection(
                JSON.stringify({ iceCandidate: event.candidate }),
                connectionId
            );
        }
    };
    connection.onicecandidateerror = function (event) {
        console.log("onicecandidateerror", event);
    };
    connection.onicegatheringstatechange = function (event) {
        console.log("onicegatheringstatechange", event);
    };
    connection.onnegotiationneeded = async function (event) {
        console.log("onnegotiationneeded", event);
        await createOffer(connectionId);
    };
    // New remote media stream was added
    connection.ontrack = function (event) {
        if (!remoteVideoStreams[connectionId]) {
            remoteVideoStreams[connectionId] = new MediaStream();
        }

        if (!remoteAudioStreams[connectionId])
            remoteAudioStreams[connectionId] = new MediaStream();

        if (event.track.kind == "video") {
            remoteVideoStreams[connectionId]
                .getVideoTracks()
                .forEach((t) =>
                    remoteVideoStreams[connectionId].removeTrack(t)
                );
            remoteVideoStreams[connectionId].addTrack(event.track);

            const _remoteVideoPlayer = document.getElementById(
                "video-" + connectionId
            ) as HTMLVideoElement;
            _remoteVideoPlayer.srcObject = null;
            _remoteVideoPlayer.srcObject = remoteVideoStreams[connectionId];
            _remoteVideoPlayer.load();
        } else if (event.track.kind == "audio") {
            const _remoteAudioPlayer = document.getElementById(
                "audio-" + connectionId
            ) as HTMLAudioElement;
            remoteAudioStreams[connectionId]
                .getVideoTracks()
                .forEach((t) =>
                    remoteAudioStreams[connectionId].removeTrack(t)
                );
            remoteAudioStreams[connectionId].addTrack(event.track);
            _remoteAudioPlayer.srcObject = null;
            _remoteAudioPlayer.srcObject = remoteAudioStreams[connectionId];
            _remoteAudioPlayer.load();
        }
    };

    connectedPeersIds.push(connectionId);
    connectedPeers[connectionId] = connection;
    console.log(connectedPeers);

    if (
        videoState == VideoState.Camera ||
        videoState == VideoState.ScreenShare
    ) {
        if (videoTrack) {
            addUpdateAudioVideoSenders(videoTrack, rtpVideoSenders);
        }
    }

    return connection;
}

async function createOffer(connId: string) {
    const connection = connectedPeers[connId];
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    console.log(offer);

    sendDataToConnection(
        JSON.stringify({ offer: connection.localDescription }),
        connId
    );
}

export async function addUpdateAudioVideoSenders(
    track: MediaStreamTrack,
    rtpSenders: rtpSenders
) {
    for (const connId in connectedPeersIds) {
        if (isConnectionAvailable(connectedPeers[connId])) {
            const sender = rtpSenders[connId];
            if (sender && sender.track) {
                sender.replaceTrack(track);
            } else {
                rtpSenders[connId] = connectedPeers[connId].addTrack(track);
            }
        }
    }
}

export async function removeAudioVideoSenders(rtpSenders: rtpSenders) {
    for (const connId in connectedPeersIds) {
        const sender = rtpSenders[connId];
        if (sender && isConnectionAvailable(connectedPeers[connId])) {
            connectedPeers[connId].removeTrack(sender);
            rtpSenders[connId] = null;
        }
    }
}
