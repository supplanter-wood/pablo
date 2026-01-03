// Colyseus schema models (Prompt 2)

// GameState
//  ├── players[] → PublicPlayer
//  │     └── grid[] → PublicCardPlaceholder
//  ├── discard → PublicDiscard
//  ├── roundContext → PublicRoundContext
//  └── scoreboard → PublicScoreboard
//        └── entries[] → ScoreboardEntry


import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class PublicCardPlaceholder extends Schema {
    @type("boolean") faceUp: boolean = false; // true if card is publicly visible
    @type("string") rank: string | null = null; // only set if faceUp
    @type("string") suit: string | null = null; // only set if faceUp
    @type("string") placeholderId: string = ""; // stable ID per grid slot
}

export class PublicPlayer extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("boolean") connected: boolean = true;
    @type("boolean") ready: boolean = false;
    @type([PublicCardPlaceholder]) grid = new ArraySchema<PublicCardPlaceholder>();
    @type("number") gridSize: number = 4;
    @type("number") totalScore: number = 0;
    @type("number") roundScore: number | null = null;
    @type("boolean") isActive: boolean = false;
    @type("boolean") hasCalledPablo: boolean = false;
}

export class PublicDiscard extends Schema {
    @type("string") rank: string | null = null;
    @type("string") suit: string | null = null;
    @type("number") count: number = 0;
}

export class PublicRoundContext extends Schema {
    @type("string") currentTurnId: string = "";
    @type(["string"]) turnOrder = new ArraySchema<string>();
    @type("string") pabloCallerId: string | null = null;
    @type("number") finalTurnsRemaining: number | null = null;
    @type("number") phaseTimer: number | null = null;
}

export class ScoreboardEntry extends Schema {
    @type("string") playerId: string = "";
    @type("number") roundScore: number = 0;
    @type("number") totalScore: number = 0;
}

export class PublicScoreboard extends Schema {
    @type([ScoreboardEntry]) entries = new ArraySchema<ScoreboardEntry>();
    @type(["string"]) winnerIds = new ArraySchema<string>();
}

export class GameState extends Schema {
    @type("string") phase: string = "lobby"; // lobby, deal, peek, play, finalTurn, scoring, gameOver
    @type("number") roundNumber: number = 0;
    @type([PublicPlayer]) players = new ArraySchema<PublicPlayer>();
    @type(PublicDiscard) discard = new PublicDiscard();
    @type("number") deckCount: number = 0;
    @type(PublicRoundContext) roundContext = new PublicRoundContext();
    @type(PublicScoreboard) scoreboard = new PublicScoreboard();
}

