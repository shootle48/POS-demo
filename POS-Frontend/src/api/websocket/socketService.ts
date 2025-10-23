// src/api/websocket/socketService.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

/**
 * ✅ สร้างหรือ reuse connection เดิม
 */
export const connectSocket = (): Socket => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socket.on("connect", () => {
            console.log("✅ [Socket] Connected:", socket?.id);
        });

        socket.on("disconnect", (reason) => {
            console.warn("⚠️ [Socket] Disconnected:", reason);
        });

        socket.on("connect_error", (err) => {
            console.error("❌ [Socket] Connection error:", err.message);
        });
    }

    return socket;
};

/**
 * ✅ ปิด connection ปลอดภัย
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        console.log("❎ [Socket] Disconnected manually");
        socket = null;
    }
};

/**
 * ✅ สมัคร event (Listener)
 */
export const onSocketEvent = (event: string, callback: (data: any) => void): void => {
    if (!socket) connectSocket();
    let lastData = "";
    let lastTime = 0;

    socket?.on(event, (data) => {
        const now = Date.now();
        const serialized = JSON.stringify(data);
        if (serialized === lastData && now - lastTime < 800) return; // ข้าม event ซ้ำ
        lastData = serialized;
        lastTime = now;
        callback(data);
    });
};


/**
 * ✅ ยกเลิก event (Listener)
 */
export const offSocketEvent = (event: string, callback?: (data: any) => void): void => {
    if (socket) {
        if (callback) socket.off(event, callback);
        else socket.removeAllListeners(event);
    }
};
