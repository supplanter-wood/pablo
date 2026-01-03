import { useEffect, useState, useCallback, useRef } from "react";
import { Client, Room } from "colyseus.js";
import type { GameState } from "@pablo/shared";

interface UseColyseusReturn {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    state: GameState | null;
    roomId: string | null;
    client: Client | null;
    room: Room<GameState> | null;
    createRoom: (name: string) => Promise<void>;
    joinRoom: (roomId: string, name: string) => Promise<void>;
    sendPing: () => void;
    disconnect: () => void;
}

export function useColyseus(): UseColyseusReturn {
    const [client, setClient] = useState<Client | null>(null);
    const [room, setRoom] = useState<Room<GameState> | null>(null);
    const [state, setState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    // Vite setup for environment variables, needs vite type definitions
    const endpoint =
        import.meta.env.VITE_COLYSEUS_ENDPOINT ||
        import.meta.env.VITE_SERVER_URL ||
        "http://localhost:2567";
    const roomRef = useRef<Room<GameState> | null>(null);

    // Initialize Colyseus client once
    useEffect(() => {
        const c = new Client(endpoint);
        setClient(c);
        return () => {
            // Leave any active room before unmounting
            if (roomRef.current) {
                roomRef.current.leave();
            }
        };
    }, [endpoint]);

    const subscribeToState = useCallback((joinedRoom: Room<GameState>) => {
        joinedRoom.onStateChange((newState: GameState) => {
            setState(newState.toJSON() as unknown as GameState);
            console.log("State:", newState.toJSON());
            console.log("Players:", newState.players);
            console.log("Players length:", newState.players.length);
            console.log("State JSON:", JSON.stringify(newState.toJSON()));
        });

        joinedRoom.onMessage("PONG", () => {
            console.log("PONG received from server");
        });

        joinedRoom.onLeave(() => {
            setConnected(false);
            setRoom(null);
            setState(null);
            console.warn("Disconnected from room");
        });
    }, []);

    const createRoom = useCallback(
        async (name: string) => {
            if (!client) return;
            setConnecting(true);
            setError(null);
            try {
                const newRoom = await client.create<GameState>("pablo", { name });
                setRoom(newRoom);
                roomRef.current = newRoom;
                setRoomId(newRoom.id);
                setConnected(true);
                subscribeToState(newRoom);
            } catch (err: any) {
                console.error("Create room failed", err);
                setError("Failed to create room");
            } finally {
                setConnecting(false);
            }
        },
        [client, subscribeToState]
    );

    const joinRoom = useCallback(
        async (joinId: string, name: string) => {
            if (!client) return;
            setConnecting(true);
            setError(null);
            try {
                const joined = await client.joinById<GameState>(joinId, { name });
                setRoom(joined);
                roomRef.current = joined;
                setRoomId(joined.id);
                setConnected(true);
                subscribeToState(joined);
            } catch (err: any) {
                console.error("Join room failed", err);
                const message = typeof err?.message === "string" ? err.message : "";
                const code = err?.code;
                if (message.includes("ROOM_FULL") || code === "ROOM_FULL") {
                    setError("Room is full (max 6 players).");
                } else if (
                    code === 421 ||
                    message.toLowerCase().includes("not found") ||
                    message.toLowerCase().includes("invalid")
                ) {
                    setError("Room not found. Check the room code.");
                } else {
                    setError("Failed to join room. Try again.");
                }
            } finally {
                setConnecting(false);
            }
        },
        [client, subscribeToState]
    );

    const sendPing = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.send("PING");
        }
    }, []);

    const disconnect = useCallback(() => {
        if (roomRef.current) {
            roomRef.current.leave();
            roomRef.current = null;
            setRoom(null);
            setConnected(false);
            setState(null);
        }
    }, []);

    return {
        connected,
        connecting,
        error,
        state,
        roomId,
        client,
        room,
        createRoom,
        joinRoom,
        sendPing,
        disconnect,
    };
}
