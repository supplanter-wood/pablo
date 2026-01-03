// Entry point (creates Colyseus server)

import http from "http";
import express from "express";
import cors from "cors";
import colyseus from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import dotenv from "dotenv";

import { PabloRoom } from "./rooms/PabloRoom.js";

dotenv.config();

// -----------------------------
// Server Configuration
// -----------------------------

const { Server } = colyseus;

const PORT = Number(process.env.PORT) || 2567;
const DEV_ORIGIN = process.env.DEV_ORIGIN || "http://localhost:5173";

const app = express();
app.use(cors({ origin: DEV_ORIGIN, credentials: true }));
app.use(express.json());

// Optional Colyseus Monitor for debugging
app.use("/colyseus", monitor());

const server = http.createServer(app);

// -----------------------------
// Colyseus Server Setup
// -----------------------------

const gameServer = new Server({
    transport: new WebSocketTransport({
        server,
    }),
});

// Register PabloRoom under the name "pablo"
gameServer.define("pablo", PabloRoom);

// -----------------------------
// Start Server
// -----------------------------

gameServer.listen(PORT);
console.log(`🃏 Pablo Colyseus Server running on ws://localhost:${PORT}`);
console.log(`Room type 'pablo' registered and ready.`);
console.log(`CORS origin allowed: ${DEV_ORIGIN}`);

// -----------------------------
// Graceful Shutdown
// -----------------------------

process.on("SIGINT", () => {
    console.log("Shutting down Pablo server...");
    gameServer.gracefullyShutdown();
    process.exit(0);
});

