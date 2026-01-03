// Core GameState structure

// /packages/server/src/engine/gameState.ts
// Authoritative Hidden Truth State for Pablo
// Deterministic, server-only, never synced to clients

import { v4 as uuid } from "uuid";

export type CardRank =
    | "A"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "Joker";

// POTENTIAL CARD SUIT PROBLEM HERE
export type CardSuit = "♠" | "♥" | "♦" | "♣" | "Joker";

export interface HiddenCard {
    id: string;
    rank: CardRank;
    suit: CardSuit;
    value: number;
    faceUp: boolean;
    ownerId: string | null; // null = deck/discard
    location: "deck" | "discard" | "grid";
    revealedTo: Set<string>; // players who can temporarily see it
}

export interface HiddenPlayerState {
    id: string;
    name: string;
    connected: boolean;
    hasCalledPablo: boolean;
    grid: (HiddenCard | null)[];
    gridSize: number;
    knownCards: Set<string>; // card IDs this player knows
    totalScore: number;
    roundScore: number | null;
}

export interface HiddenDeck {
    cards: HiddenCard[];
    seed: string;
    drawCount: number;
}

export interface HiddenDiscard {
    cards: HiddenCard[];
}

export interface RoundContext {
    turnOrder: string[];
    currentTurnIndex: number;
    pabloCallerId: string | null;
    finalTurnsRemaining: number | null;
    roundSeed: string;
    roundPhase:
    | "lobby"
    | "deal"
    | "peek"
    | "play"
    | "finalTurn"
    | "scoring"
    | "gameOver";
    dealerIndex: number;
}

export interface TurnContext {
    currentPlayerId: string;
    drawSource: "deck" | "discard" | null;
    drawnCard: HiddenCard | null;
    replacedSlots: number[];
    matchAttemptCount: number;
    isValidMatch: boolean;
    trickEligible: boolean;
    activeTrick: "swap" | "spy" | null;
    trickContext: {
        targetPlayerId: string | null;
        targetSlot: number | null;
    };
    ephemeralReveals: Map<string, Set<string>>;
    complete: boolean;
}

export class HiddenGameState {
    roundNumber = 0;
    phase:
        | "lobby"
        | "deal"
        | "peek"
        | "play"
        | "finalTurn"
        | "scoring"
        | "gameOver" = "lobby";

    rngSeed: string;
    deck: HiddenDeck;
    discard: HiddenDiscard;
    players: Map<string, HiddenPlayerState>;
    roundContext: RoundContext;
    turnContext: TurnContext | null;
    scoreTotals: Map<string, number>;
    auditLog: any[];

    constructor(seed: string) {
        this.rngSeed = seed;
        this.deck = { cards: [], seed, drawCount: 0 };
        this.discard = { cards: [] };
        this.players = new Map();
        this.roundContext = {
            turnOrder: [],
            currentTurnIndex: 0,
            pabloCallerId: null,
            finalTurnsRemaining: null,
            roundSeed: seed,
            roundPhase: "lobby",
            dealerIndex: 0,
        };
        this.turnContext = null;
        this.scoreTotals = new Map();
        this.auditLog = [];
    }

    /** Create a new card object */
    static createCard(rank: CardRank, suit: CardSuit, value: number): HiddenCard {
        return {
            id: uuid(),
            rank,
            suit,
            value,
            faceUp: false,
            ownerId: null,
            location: "deck",
            revealedTo: new Set(),
        };
    }

    /** Assign cards to players at start of round */
    dealCards(playerIds: string[], cardsPerPlayer = 4): void {
        playerIds.forEach((pid) => {
            const player = this.players.get(pid);
            if (!player) return;

            player.grid = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const card = this.deck.cards.pop();
                if (!card) throw new Error("Deck exhausted during deal");
                card.ownerId = pid;
                card.location = "grid";
                player.grid.push(card);
            }
            player.gridSize = cardsPerPlayer;
        });
    }

    /** Draws a card from deck or discard */
    drawCard(playerId: string, source: "deck" | "discard"): HiddenCard {
        const player = this.players.get(playerId);
        if (!player) throw new Error("Invalid playerId");
        let card: HiddenCard;

        if (source === "deck") {
            card = this.deck.cards.pop()!;
            this.deck.drawCount++;
        } else {
            card = this.discard.cards.pop()!;
        }

        card.ownerId = playerId;
        card.location = "grid";
        return card;
    }

    /** Discard card(s) from player’s grid */
    discardCards(playerId: string, slotIndices: number[]): void {
        const player = this.players.get(playerId);
        if (!player) throw new Error("Invalid player");
        for (const i of slotIndices) {
            const card = player.grid[i];
            if (!card) continue;
            card.ownerId = null;
            card.location = "discard";
            card.faceUp = true;
            this.discard.cards.push(card);
            player.grid[i] = null;
        }
        player.gridSize = player.grid.filter((c) => c !== null).length;
    }

    /** Reset hidden state between rounds */
    resetForNextRound(seed: string): void {
        this.rngSeed = seed;
        this.roundNumber++;
        this.deck = { cards: [], seed, drawCount: 0 };
        this.discard = { cards: [] };
        this.turnContext = null;
        this.roundContext = {
            turnOrder: Array.from(this.players.keys()),
            currentTurnIndex: 0,
            pabloCallerId: null,
            finalTurnsRemaining: null,
            roundSeed: seed,
            roundPhase: "deal",
            dealerIndex:
                (this.roundContext.dealerIndex + 1) % this.players.size || 0,
        };

        for (const p of this.players.values()) {
            p.hasCalledPablo = false;
            p.knownCards.clear();
            p.grid = [];
            p.gridSize = 0;
            p.roundScore = null;
        }

        this.phase = "deal";
    }

    /** Deterministic mapping: hidden -> public (used by engine when preparing schema sync) */
    getPublicSnapshot() {
        return {
            phase: this.phase,
            roundNumber: this.roundNumber,
            deckCount: this.deck.cards.length,
            discard: (() => {
                const lastCard = this.discard.cards[this.discard.cards.length - 1];
                return {
                    top: lastCard
                        ? {
                            rank: lastCard.rank,
                            suit: lastCard.suit,
                        }
                        : null,
                    count: this.discard.cards.length,
                };
            })(),
            players: Array.from(this.players.values()).map((p) => ({
                id: p.id,
                name: p.name,
                connected: p.connected,
                gridSize: p.gridSize,
                grid: p.grid.map((c, i) => {
                    if (!c)
                        return {
                            faceUp: false,
                            rank: null,
                            suit: null,
                            placeholderId: `g${p.id}-c${i}`,
                        };
                    return {
                        faceUp: c.faceUp,
                        rank: c.faceUp ? c.rank : null,
                        suit: c.faceUp ? c.suit : null,
                        placeholderId: `g${p.id}-c${i}`,
                    };
                }),
                totalScore: p.totalScore,
                roundScore: p.roundScore,
                hasCalledPablo: p.hasCalledPablo,
            })),
            roundContext: {
                currentTurnId:
                    this.roundContext.turnOrder[this.roundContext.currentTurnIndex],
                pabloCallerId: this.roundContext.pabloCallerId,
                finalTurnsRemaining: this.roundContext.finalTurnsRemaining,
                turnOrder: this.roundContext.turnOrder,
            },
        };
    }
}
