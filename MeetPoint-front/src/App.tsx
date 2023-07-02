import { useState, useEffect, useRef } from "react";
import "./App.css";
import uniqid from "uniqid";
import { isValidHttpUrl } from "./utils";
import { useNavigate } from "react-router-dom";
import { sendDataToConnection, socket } from "./socket";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import CallEndIcon from "@mui/icons-material/CallEnd";
import {
    connectedPeers,
    connectedPeersIds,
    iceConfiguration,
    isConnectionAvailable,
    remoteAudioStreams,
    remoteVideoStreams,
    rtpAudioSenders,
    rtpSenders,
    rtpVideoSenders,
} from "./RTC";

type IUser = {
    connectionId: string;
    userName: string;
};
enum VideoState {
    None = 0,
    Camera = 1,
    ScreenShare = 2,
}
function App() {
    const [userName, setUsername] = useState("");
    const [userNameInput, setUsernameInput] = useState("");
    const [mid, setMid] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [isMuted, setIsMuted] = useState(true);
    const [videoState, setVideoState] = useState<VideoState>(VideoState.None);
    const [users, setUsers] = useState<IUser[]>([]);
    const myVideoRef = useRef<null | HTMLVideoElement>(null);
    const [audioTrack, setAudioTrack] = useState<null | MediaStreamTrack>(null);
    const [videoTrack, setVideoTrack] = useState<null | MediaStreamTrack>(null);
    const navigate = useNavigate();

    useEffect(() => {
        socket.connect();

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mid = urlParams.get("mid");
        const uid = urlParams.get("uid");
        if (uid) setUsername(uid);
        if (mid) setMid(mid);
        // socket.on("connect", () => {
        //     console.log("dsfsdf");

        //     if (socket.connected) {
        //         socket.emit("newUser", {
        //             userName,
        //             mid,
        //         });
        //     }
        // });

        socket.on("userConnected", (data: IUser[]) => {
            setUsers(data);
            // console.log("userConnected", data);

            data.forEach((u) => {
                createConnection(u.connectionId);
            });
        });

        socket.on("exchangeData", async (data) => {
            await acceptData(data.message, data.from_connid);
        });

        socket.on("informAboutNewConnection", (data: IUser) => {
            // console.log("informAboutNewConnection");

            setUsers((prev) => [
                ...prev.filter((u) => u.connectionId !== data.connectionId),
                data,
            ]);
            createConnection(data.connectionId);
        });

        socket.on("informAboutConnectionEnd", (connId: string) => {
            setUsers((prev) => prev.filter((u) => u.connectionId !== connId));
        });
    }, []);

    useEffect(() => {
        if (userName && mid) {
            // console.log("newUser");

            socket.emit("newUser", {
                userName,
                mid,
            });
        }
    }, [userName, mid]);

    useEffect(() => {
        if (audioTrack) {
            if (!isMuted) {
                audioTrack.enabled = true;
                addUpdateAudioVideoSenders(audioTrack, rtpAudioSenders);
            } else {
                audioTrack.enabled = false;
                removeAudioVideoSenders(rtpAudioSenders);
            }
            setAudioTrack(audioTrack);
        }
    }, [isMuted]);

    useEffect(() => {
        (async () => {
            if (videoState === VideoState.None) {
                clearCurrentVideoStream();
            } else {
                try {
                    let vstream: MediaStream | null = null;

                    if (videoState === VideoState.Camera) {
                        vstream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                // width: 1080,
                                // height: window.,
                                aspectRatio: 16 / 9,
                                noiseSuppression: true,
                            },
                            audio: false,
                        });
                    } else if (videoState === VideoState.ScreenShare) {
                        vstream = await navigator.mediaDevices.getDisplayMedia({
                            video: {
                                aspectRatio: 16 / 9,
                                noiseSuppression: true,
                            },
                            audio: false,
                        });
                    }
                    clearCurrentVideoStream();

                    if (vstream && vstream.getVideoTracks().length > 0) {
                        setVideoTrack(vstream.getVideoTracks()[0]);
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        })();
    }, [videoState]);

    useEffect(() => {
        if (myVideoRef.current) {
            if (videoTrack) {
                myVideoRef.current.srcObject = new MediaStream([videoTrack]);
                addUpdateAudioVideoSenders(videoTrack, rtpVideoSenders);
            } else {
                myVideoRef.current.srcObject = null;
                removeAudioVideoSenders(rtpVideoSenders);
            }
        }
    }, [videoTrack]);

    const clearCurrentVideoStream = () => {
        videoTrack?.stop();
        setVideoTrack(null);
        removeAudioVideoSenders(rtpVideoSenders);
    };

    async function startAudio() {
        const astream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });
        const track = astream.getAudioTracks()[0];
        track.enabled = false;
        setAudioTrack(track);
    }

    async function createConnection(connectionId: string) {
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
        // console.log(connectedPeers);

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

    async function addUpdateAudioVideoSenders(
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

    async function removeAudioVideoSenders(rtpSenders: rtpSenders) {
        for (const connId in connectedPeersIds) {
            const sender = rtpSenders[connId];
            if (sender && isConnectionAvailable(connectedPeers[connId])) {
                connectedPeers[connId].removeTrack(sender);
                rtpSenders[connId] = null;
            }
        }
    }

    const acceptData = async (msg: string, fromConnectId: string) => {
        const message = JSON.parse(msg);

        if (message.answer) {
            await connectedPeers[fromConnectId]?.setRemoteDescription(
                new RTCSessionDescription(message.answer)
            );
        } else if (message.offer) {
            if (!connectedPeers[fromConnectId]) {
                await createConnection(fromConnectId);
            }

            await connectedPeers[fromConnectId].setRemoteDescription(
                new RTCSessionDescription(message.offer)
            );
            const answer = await connectedPeers[fromConnectId].createAnswer();
            await connectedPeers[fromConnectId].setLocalDescription(answer);
            sendDataToConnection(
                JSON.stringify({ answer: answer }),
                fromConnectId
            );
        } else if (message.iceCandidate) {
            if (!connectedPeers[fromConnectId]) {
                await createConnection(fromConnectId);
            }

            try {
                await connectedPeers[fromConnectId].addIceCandidate(
                    message.iceCandidate
                );
            } catch (e) {
                console.log(e);
            }
        }
    };

    if (mid) {
        return (
            <div>
                {!userName ? (
                    <div>
                        Please type your name
                        <input
                            type="text"
                            value={userNameInput}
                            onChange={(e) => {
                                setUsernameInput(e.target.value);
                            }}
                        />
                        <button
                            disabled={!userNameInput}
                            onClick={() => {
                                setUsername(userNameInput);
                                navigate(
                                    "/?mid=" + mid + "&uid=" + userNameInput
                                );
                            }}
                        >
                            Submit
                        </button>
                    </div>
                ) : (
                    <div
                        style={{
                            backgroundColor: "#202124",
                            color: "white",
                            height: "100vh",
                            paddingTop: "20px",
                        }}
                    >
                        {/* you are in meeting: {mid} */}
                        <div className="usersVideos">
                            <div style={{ height: "min" }}>
                                <video
                                    autoPlay
                                    muted
                                    ref={myVideoRef}
                                    id={"myVideo"}
                                    style={{
                                        backgroundColor: "transparent",
                                        borderRadius: "10px",
                                        transform:
                                            videoState === VideoState.Camera
                                                ? "scaleX(-1)"
                                                : "",
                                        maxWidth: "90vw",
                                        maxHeight: "80vh",
                                        aspectRatio: "16/ 9",
                                    }}
                                ></video>
                                <h4>{userName}</h4>
                            </div>
                            {users.map((user) => {
                                return (
                                    <div key={user.connectionId}>
                                        <h2>{user.userName}</h2>
                                        <video
                                            autoPlay
                                            muted
                                            id={"video-" + user.connectionId}
                                        ></video>
                                        <audio
                                            autoPlay
                                            controls
                                            style={{ display: "none" }}
                                            id={"audio-" + user.connectionId}
                                        ></audio>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="controls">
                            {" "}
                            <button
                                className={`${isMuted ? "inactive" : ""}`}
                                onClick={async () => {
                                    if (!audioTrack) {
                                        await startAudio();
                                    }
                                    setIsMuted((prev) => !prev);
                                }}
                            >
                                {" "}
                                {isMuted ? (
                                    <MicOffIcon fontSize="small" />
                                ) : (
                                    <MicIcon fontSize="small" />
                                )}
                            </button>
                            <button
                                className={`${
                                    videoState !== VideoState.Camera
                                        ? "inactive"
                                        : ""
                                }`}
                                onClick={() => {
                                    setVideoState(
                                        videoState === VideoState.Camera
                                            ? VideoState.None
                                            : VideoState.Camera
                                    );
                                }}
                            >
                                {videoState === VideoState.Camera ? (
                                    <VideocamIcon fontSize="small" />
                                ) : (
                                    <VideocamOffIcon fontSize="small" />
                                )}
                            </button>
                            <button
                                className={`${
                                    videoState === VideoState.ScreenShare
                                        ? "presenting"
                                        : ""
                                }`}
                                onClick={() => {
                                    setVideoState(
                                        videoState === VideoState.ScreenShare
                                            ? VideoState.None
                                            : VideoState.ScreenShare
                                    );
                                }}
                            >
                                <PresentToAllIcon fontSize="small" />
                            </button>
                            <button
                                className="inactive"
                                style={{ width: "56px" }}
                                onClick={() => {
                                    setMid("");
                                }}
                            >
                                <CallEndIcon />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex center">
            <div className="flex">
                Please join or create new meeting
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                    }}
                    placeholder="Please paste url or meeting id"
                />
                <button
                    onClick={() => {
                        if (inputValue) {
                            const midValue = isValidHttpUrl(inputValue)
                                ? new URLSearchParams(
                                      new URL(inputValue).search
                                  ).get("mid") || ""
                                : inputValue;
                            window.location.search = "?mid=" + midValue;
                            // navigate("/?mid=" + midValue);
                            // setMid(midValue);
                        }
                    }}
                >
                    Join
                </button>
                <button
                    onClick={() => {
                        window.location.search = "?mid=" + uniqid();
                        // const newmid = uniqid();
                        // navigate("/?mid=" + newmid);
                        // setMid(newmid);
                    }}
                >
                    Create
                </button>
            </div>
        </div>
    );
}

export default App;
