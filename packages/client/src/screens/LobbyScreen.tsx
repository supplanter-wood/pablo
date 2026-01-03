import React, { useMemo, useState } from "react";
import type { PublicPlayer } from "@pablo/shared";
import { useColyseus } from "../app/hooks/useColyseus.js";

// -----------------------------
// Optional: GameTable Component
// -----------------------------

interface GameTableProps {
  players: readonly PublicPlayer[];
}

export function GameTable({ players }: GameTableProps) {
  if (!players || players.length === 0) {
    return <div>No players yet.</div>;
  }

  return (
    <table border={1} cellPadding={4} style={{ marginTop: "1rem" }}>
      <thead>
        <tr>
          <th>Seat</th>
          <th>Name</th>
          <th>Connected</th>
        </tr>
      </thead>
      <tbody>
        {players.map((p, index) => (
          <tr key={p.sessionId ?? p.id ?? index}>
            <td>{index + 1}</td>
            <td>{p.name}</td>
            <td>{p.connected ? "✅" : "❌"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// -----------------------------
// LobbyScreen Component
// -----------------------------

export default function LobbyScreen() {
  const {
    connected,
    connecting,
    error,
    state,
    roomId,
    createRoom,
    joinRoom,
    sendPing,
    disconnect,
  } = useColyseus();

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [pongMsg, setPongMsg] = useState("");
  const players = useMemo(() => {
    if (!state?.players) return [];
    return Array.from(state.players).filter(
      (player): player is PublicPlayer => Boolean(player)
    );
  }, [state?.players]);

  const handleCreate = async () => {
    if (!name) return alert("Enter a name first");
    await createRoom(name);
  };

  const handleJoin = async () => {
    if (!name || !joinCode) return alert("Enter name and room code");
    await joinRoom(joinCode, name);
  };

  const handlePing = () => {
    sendPing();
    setPongMsg("Ping sent — waiting for PONG...");
    setTimeout(() => setPongMsg(""), 3000);
  };

//   console.log("State:", state);
//   console.log("Players:", state?.players);
//   console.log("Players length:", state?.players.length);
//   console.log("State JSON:", JSON.stringify(state));

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>Pablo Multiplayer Lobby</h2>

      {!connected && (
        <div>
          <div>
            <label>
              Your Name: <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <button disabled={connecting} onClick={handleCreate}>
              Create Room
            </button>
            <button disabled={connecting} onClick={() => setShowJoin(!showJoin)}>
              {showJoin ? "Cancel" : "Join Room"}
            </button>
          </div>

          {showJoin && (
            <div style={{ marginTop: "1rem" }}>
              <input
                placeholder="Enter Room Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button disabled={connecting} onClick={handleJoin}>
                Join
              </button>
            </div>
          )}

          {connecting && <p>Connecting...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
      )}

      {connected && (
        <div>
          <h3>Connected to Room</h3>
          <p>
            Room Code: <strong>{roomId}</strong>
          </p>

          <h4>Players</h4>
          <GameTable players={players} />

          <div style={{ marginTop: "1rem" }}>
            <button onClick={handlePing}>Send Ping</button>
            <button onClick={disconnect} style={{ marginLeft: "1rem" }}>
              Leave Room
            </button>
          </div>

          {pongMsg && <p>{pongMsg}</p>}
        </div>
      )}
    </div>
  );
}
