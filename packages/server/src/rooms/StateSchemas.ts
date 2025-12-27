// Colyseus schema models (Prompt 2)

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class PublicCardPlaceholder extends Schema {
    @type("boolean") faceUp: boolean = false; // true if card is publicly visible
    @type("string") rank: string | null = null; // only set if faceUp
    @type("string") suit: string | null = null; // only set if faceUp
    @type("string") placeholderId: string = ""; // stable ID per grid slot
  }

  export class PublicPlayer extends Schema {
    @type("string") id: string;
    @type("string") name: string;
    @type("boolean") connected: boolean = true;
    @type("boolean") ready: boolean = false;
    @type([ PublicCardPlaceholder ]) grid = new ArraySchema<PublicCardPlaceholder>();
    @type("number") gridSize: number = 4;
    @type("number") totalScore: number = 0;
    @type("number") roundScore: number | null = null;
    @type("boolean") isActive: boolean = false;
    @type("boolean") hasCalledPablo: boolean = false;
  }
  