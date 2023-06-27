import { useState, useEffect } from "react";
import "./App.css";
import uniqid from "uniqid";
import { isValidHttpUrl } from "./utils";
import { useNavigate } from "react-router-dom";
import { sendDataToConnection, socket } from "./socket";

type IUser = {
    user_id: string;
    userName: string;
};

function App() {
    const [userName, setUsername] = useState("");
    const [userNameInput, setUsernameInput] = useState("");
    const [mid, setMid] = useState("");
    const [inputValue, setInputValue] = useState("");
    const [isMuted, setIsMuted] = useState(false);
    const [users, setUsers] = useState<IUser[]>([]);
    const [audioTrack, setAudioTrack] = useState<null | MediaStreamTrack>(null);

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

    async function startAudio() {
        const astream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });
        const track = astream.getAudioTracks()[0];
        track.enabled = false;
        setAudioTrack(track);
        return track;
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
                    <div>
                        you are in meeting: {mid}
                        <div className="usersVideos">
                            <div>
                                <h2>{userName}(me)</h2>
                                <video autoPlay muted id={"myVideo"}></video>
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
                                onClick={async () => {
                                    let track = null;
                                    if (!audioTrack) {
                                        track = await startAudio();
                                    }
                                    if (!track) {
                                        alert("problem with audio");
                                        return;
                                    }

                                    if (isMuted) {
                                        track.enabled = true;
                                        setAudioTrack(audioTrack);
                                    } else {
                                        track.enabled = false;
                                    }
                                    setIsMuted((prev) => !prev);
                                }}
                            >
                                {" "}
                                {isMuted ? <>Ummute</> : <>Mute</>}
                            </button>
                            <button>Start Camera</button>
                            <button>Screen Share</button>
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
