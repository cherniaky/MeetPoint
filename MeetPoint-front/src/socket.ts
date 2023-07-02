import { io } from "socket.io-client";

const URL = "http://localhost:4000";

export const socket = io(URL, { autoConnect: false });

export const sendDataToConnection = function (data: any, to_connid: string) {
    socket.emit("exchangeData", { message: data, to_connid: to_connid });
};
