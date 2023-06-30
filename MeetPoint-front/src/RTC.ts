export const iceConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
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
