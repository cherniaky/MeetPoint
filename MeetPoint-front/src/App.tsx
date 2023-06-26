import { useState, useEffect } from "react";
import "./App.css";
import uniqid from "uniqid";
import { isValidHttpUrl } from "./utils";
import { useNavigate } from "react-router-dom";

function App() {
    const [userName, setUsername] = useState("");
    const [userNameInput, setUsernameInput] = useState("");
    const [mid, setMid] = useState("");
    const [inputValue, setInputValue] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mid = urlParams.get("mid");
        const uid = urlParams.get("uid");
        if (uid) setUsername(uid);
        if (mid) setMid(mid);
    }, []);

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
                    <div>you are in meeting</div>
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
