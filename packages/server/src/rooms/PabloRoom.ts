import colyseus from "colyseus";
import type { Client } from "colyseus";
import { Schema, type, ArraySchema } from "@colyseus/schema";

// -----------------------------
// Schema Definitions
// -----------------------------

const { Room } = colyseus;

export class PabloPlayer extends Schema {
    @type("string") sessionId: string = "";
    @type("string") name: string = "";
    @type("number") seat: number = 0;
    @type("boolean") connected: boolean = true;
}

export class PabloRoomState extends Schema {
    @type("string") phase: string = "LOBBY";
    @type([PabloPlayer]) players = new ArraySchema<PabloPlayer>();
}

// -----------------------------
// Room Implementation
// -----------------------------

export class PabloRoom extends Room<PabloRoomState> {
    maxClients = 6;

    onAuth(client: Client, options: any) {
        if (this.clients.length >= this.maxClients) {
            throw new Error("ROOM_FULL");
        }
        return true;
    }

    onCreate(options: any) {
        this.setState(new PabloRoomState());
        this.state.phase = "LOBBY";
        this.setMetadata({ roomCode: this.roomId });

        // Basic ping-pong test
        this.onMessage("PING", (client: Client) => {
            client.send("PONG");
        });

        console.log(`PabloRoom ${this.roomId} created. Phase: ${this.state.phase}`);
    }

    onJoin(client: Client, options: any) {
        // TODO: Implement seat assignment logic
        // Maximum 6 players per room
        const seatIndex = this.state.players.length;
        const player = new PabloPlayer();
        player.sessionId = client.sessionId;
        player.name = options?.name || `Player ${seatIndex + 1}`;
        player.seat = seatIndex;
        player.connected = true;

        this.state.players.push(player);
        console.log(`Player joined: ${player.name} (${client.sessionId}) Seat: ${seatIndex}`);
        console.log(this.state.players.length);
        console.log(this.state.toJSON());
    }

    async onLeave(client: Client, consented: boolean) {
        const player = this.state.players.find(p => p.sessionId === client.sessionId);
        if (player) {
            player.connected = false;
            console.log(`Player disconnected: ${player.name}`);
        }
    }

    onDispose() {
        console.log(`PabloRoom ${this.roomId} disposed.`);
    }
}
