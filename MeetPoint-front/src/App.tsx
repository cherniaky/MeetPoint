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

type IUser = {
    user_id: string;
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
    const [isMuted, setIsMuted] = useState(false);
    const [videoState, setVideoState] = useState<VideoState>(VideoState.None);
    const [users, setUsers] = useState<IUser[]>([]);
    const myVideoRef = useRef<null | HTMLVideoElement>(null);
    const [audioTrack, setAudioTrack] = useState<null | MediaStreamTrack>(null);
    const [videoTrack, setVideoTrack] = useState<null | MediaStreamTrack>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mid = urlParams.get("mid");
        const uid = urlParams.get("uid");
        if (uid) setUsername(uid);
        if (mid) setMid(mid);
        socket.on("connect", () => {
            if (socket.connected) {
                // WrtcHelper.init(sendDataToConnection, socket.id);

                if (userName && mid) {
                    socket.emit("newUser", {
                        userName,
                        mid,
                    });
                }
            }
        });

        socket.on("userConnected", (data) => {
            setUsers((prev) => [...prev, data]);
        });
    }, []);

    useEffect(() => {
        if (audioTrack) {
            if (isMuted) {
                audioTrack.enabled = true;
            } else {
                audioTrack.enabled = false;
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
            } else {
                myVideoRef.current.srcObject = null;
            }
        }
    }, [videoTrack]);

    const clearCurrentVideoStream = () => {
        videoTrack?.stop();
        setVideoTrack(null);
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
                                        backgroundColor: "black",
                                        borderRadius: "10px",
                                        transform:
                                            videoState === VideoState.Camera
                                                ? "scaleX(-1)"
                                                : "",
                                        width: "90vw",
                                    }}
                                ></video>
                                <h4>{userName}</h4>
                            </div>
                            {users.map((user) => {
                                return (
                                    <div>
                                        <h2>{user.userName}</h2>
                                        <video
                                            autoPlay
                                            muted
                                            id={"video-" + user.user_id}
                                        ></video>
                                        <audio
                                            autoPlay
                                            controls
                                            style={{ display: "none" }}
                                            id={"audio-" + user.user_id}
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
