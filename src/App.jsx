import React, { useState, useEffect, useMemo, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  increment,
  collection,
} from "firebase/firestore";
import {
  Anchor,
  Fish,
  Ship,
  Scissors, // Crabs
  Sword, // Sharks
  Shell, // Shells
  Aperture, // Octopus
  Snowflake, // Penguin/Snowman
  Sparkles, // Mermaid
  Waves,
  Trophy,
  User, // Sailor
  LogOut,
  RotateCcw,
  BookOpen,
  History,
  X,
  CheckCircle,
  AlertTriangle,
  Hand,
  Eye, // Lighthouse
  Crown,
  Sailboat,
  FishingHook,
  Kayak,
  Origami,
  Play,
  Copy,
  Trash2,
  HelpCircle,
  Hammer,
  Bird, // Generic fallback
  Compass,
  ShipWheel, // Captain fallback if needed
} from "lucide-react";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

// Uses environment variables for Firebase Config in Canvas
const firebaseConfig = {
  apiKey: "AIzaSyBjIjK53vVJW1y5RaqEFGSFp0ECVDBEe1o",
  authDomain: "game-hub-ff8aa.firebaseapp.com",
  projectId: "game-hub-ff8aa",
  storageBucket: "game-hub-ff8aa.firebasestorage.app",
  messagingSenderId: "586559578902",
  appId: "1:586559578902:web:c0d92602ad20ed876aa637",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const APP_ID = typeof __app_id !== "undefined" ? __app_id : "paper-oceans";

const STOP_THRESHOLD = 7;

// Dynamic Winning Points based on player count
const GET_WIN_THRESHOLD = (playerCount) => {
  if (playerCount === 4) return 30;
  if (playerCount === 3) return 35;
  return 40; // Default/2 players
};

const CARD_TYPES = {
  // --- DUOS (Action Pairs) ---
  CRAB: {
    id: "CRAB",
    name: "Paper Crab",
    type: "DUO",
    points: 0,
    icon: Scissors,
    color: "text-red-400",
    bg: "bg-red-950",
    border: "border-red-700",
    desc: "Pair: Look through discard pile and pick 1 card.",
    count: 9,
    cardColor: "RED",
  },
  BOAT: {
    id: "BOAT",
    name: "Origami Boat",
    type: "DUO",
    points: 0,
    icon: Sailboat,
    color: "text-blue-400",
    bg: "bg-blue-950",
    border: "border-blue-700",
    desc: "Pair: Take another turn immediately.",
    count: 8,
    cardColor: "BLUE",
  },
  FISH: {
    id: "FISH",
    name: "Flying Fish",
    type: "DUO",
    points: 0,
    icon: Fish,
    color: "text-emerald-400",
    bg: "bg-emerald-950",
    border: "border-emerald-700",
    desc: "Pair: Draw the top card of the deck.",
    count: 7,
    cardColor: "GREEN",
  },
  SHARK: {
    id: "SHARK",
    name: "Shadow Shark",
    type: "DUO",
    points: 0,
    icon: Sword,
    color: "text-slate-400",
    bg: "bg-slate-800",
    border: "border-slate-600",
    desc: "Pair: Steal a random card from an opponent.",
    count: 5,
    cardColor: "BLACK",
  },

  // --- COLLECTORS (Set Collection) ---
  SHELL: {
    id: "SHELL",
    name: "Spiral Shell",
    type: "COLLECT",
    points: 0,
    icon: Shell,
    color: "text-amber-200",
    bg: "bg-amber-950",
    border: "border-amber-700",
    desc: "Set: 2pts per shell.",
    count: 6,
    cardColor: "YELLOW",
  },
  OCTOPUS: {
    id: "OCTOPUS",
    name: "Ink Octopus",
    type: "COLLECT",
    points: 0,
    icon: Aperture,
    color: "text-purple-400",
    bg: "bg-purple-950",
    border: "border-purple-700",
    desc: "Set: 3pts per octopus.",
    count: 5,
    cardColor: "PURPLE",
  },
  PENGUIN: {
    id: "PENGUIN",
    name: "Ice Penguin",
    type: "COLLECT",
    points: 0,
    icon: Bird, // Using Cloud/User to distinguish from Snowman
    color: "text-cyan-200",
    bg: "bg-cyan-950",
    border: "border-cyan-700",
    desc: "Set: 1=1pt, 2=3pts, 3=5pts.",
    count: 3,
    cardColor: "CYAN",
  },
  SAILOR: {
    id: "SAILOR",
    name: "Lost Sailor",
    type: "COLLECT",
    points: 0,
    icon: Kayak,
    color: "text-orange-300",
    bg: "bg-orange-950",
    border: "border-orange-700",
    desc: "Set: 1=0pts, 2=5pts.",
    count: 2,
    cardColor: "ORANGE",
  },

  // --- MULTIPLIERS ---
  MERMAID: {
    id: "MERMAID",
    name: "Mystic Mermaid",
    type: "MULTIPLIER",
    points: 0,
    icon: Sparkles,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-950",
    border: "border-fuchsia-700",
    desc: "+1 Point for each card of your most common color.",
    count: 4,
    cardColor: "MULTI",
  },
  SHIP: {
    id: "SHIP",
    name: "Ship",
    type: "MULTIPLIER",
    points: 0,
    icon: Ship,
    color: "text-blue-200",
    bg: "bg-blue-900",
    border: "border-blue-500",
    desc: "+1 Point for each Boat.",
    count: 1,
    cardColor: "BLUE", // Assuming Lighthouse is Blue-ish
  },
  SHOAL: {
    id: "SHOAL",
    name: "Shoal of Fish",
    type: "MULTIPLIER",
    points: 0,
    icon: FishingHook,
    color: "text-emerald-200",
    bg: "bg-emerald-900",
    border: "border-emerald-500",
    desc: "+1 Point for each Fish.",
    count: 1,
    cardColor: "GREEN",
  },
  SNOWMAN: {
    id: "SNOWMAN",
    name: "Snowman",
    type: "MULTIPLIER",
    points: 0,
    icon: Snowflake,
    color: "text-cyan-100",
    bg: "bg-cyan-900",
    border: "border-cyan-500",
    desc: "+2 Points for each Penguin.",
    count: 1,
    cardColor: "CYAN",
  },
  CAPTAIN: {
    id: "CAPTAIN",
    name: "Captain",
    type: "MULTIPLIER",
    points: 0,
    icon: ShipWheel,
    color: "text-orange-200",
    bg: "bg-orange-900",
    border: "border-orange-500",
    desc: "+3 Points for each Sailor.",
    count: 1,
    cardColor: "ORANGE",
  },
};

// ---------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------

const createDeck = () => {
  let deck = [];
  Object.values(CARD_TYPES).forEach((card) => {
    for (let i = 0; i < card.count; i++) {
      deck.push({
        id: `${card.id}-${Math.random().toString(36).substr(2, 9)}`,
        type: card.id,
      });
    }
  });
  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const calculatePoints = (hand, tableau, isLastChance = false) => {
  const allCards = [...hand, ...tableau];
  let score = 0;

  // 1. Duos (Score for every pair in Hand + Tableau)
  const duoTypes = ["CRAB", "BOAT", "FISH", "SHARK"];
  duoTypes.forEach((type) => {
    // Count ALL cards of this type (played + hand)
    const count = allCards.filter((c) => c.type === type).length;
    score += Math.floor(count / 2);
  });

  // 2. Collectors
  const shells = allCards.filter((c) => c.type === "SHELL").length;
  if (shells > 0) score += shells * 2;

  const octopuses = allCards.filter((c) => c.type === "OCTOPUS").length;
  score += octopuses * 3;

  const penguins = allCards.filter((c) => c.type === "PENGUIN").length;
  if (penguins === 1) score += 1;
  else if (penguins === 2) score += 3;
  else if (penguins >= 3) score += 5;

  const sailors = allCards.filter((c) => c.type === "SAILOR").length;
  if (sailors === 2) score += 5;

  // 3. Multipliers
  const hasShip = allCards.some((c) => c.type === "SHIP");
  if (hasShip) {
    const boats = allCards.filter((c) => c.type === "BOAT").length;
    score += boats;
  }

  const hasShoal = allCards.some((c) => c.type === "SHOAL");
  if (hasShoal) {
    const fish = allCards.filter((c) => c.type === "FISH").length;
    score += fish;
  }

  const hasSnowman = allCards.some((c) => c.type === "SNOWMAN");
  if (hasSnowman) {
    score += penguins * 2;
  }

  const hasCaptain = allCards.some((c) => c.type === "CAPTAIN");
  if (hasCaptain) {
    score += sailors * 3;
  }

  // 4. Mermaids & Color Bonus
  const mermaids = allCards.filter((c) => c.type === "MERMAID").length;

  // Calculate max color frequency
  const colorCounts = {};
  allCards.forEach((c) => {
    const def = CARD_TYPES[c.type];
    const color = def ? def.cardColor : null;
    if (color && color !== "MULTI") {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  });
  const maxColorCount = Math.max(0, ...Object.values(colorCounts));

  if (mermaids > 0) {
    // Standard rule: 1 pt per color per mermaid
    score += mermaids * maxColorCount;
  } else if (isLastChance) {
    // Relaxed rule: If no mermaid, but it's Last Chance, get flat color bonus
    score += maxColorCount;
  }

  return score;
};

// ---------------------------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------------------------

const FloatingBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black" />
    <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 mix-blend-overlay" />
  </div>
);

const GameLogo = () => (
  <div className="flex items-center justify-center gap-2 opacity-40 mt-auto pb-4 pt-2 relative z-10 pointer-events-none select-none">
    <Origami size={14} className="text-cyan-500" />
    <span className="text-[10px] font-black tracking-[0.2em] text-cyan-500 uppercase">
      PAPER OCEANS
    </span>
  </div>
);

const FeedbackOverlay = ({ type, message, subtext, icon: Icon }) => (
  <div className="fixed inset-0 z-[160] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
    <div
      className={`
      flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl border-4 shadow-2xl backdrop-blur-xl max-w-sm md:max-w-xl mx-4 text-center
      ${
        type === "success"
          ? "bg-emerald-900/90 border-emerald-500 text-emerald-100"
          : type === "failure"
          ? "bg-red-900/90 border-red-500 text-red-100"
          : type === "warning"
          ? "bg-amber-900/90 border-amber-500 text-amber-100"
          : "bg-blue-900/90 border-blue-500 text-blue-100"
      }
    `}
    >
      {Icon && (
        <div className="mb-4 p-4 bg-black/20 rounded-full">
          <Icon size={64} className="animate-bounce" />
        </div>
      )}
      <h2 className="text-3xl md:text-5xl font-black uppercase tracking-widest drop-shadow-md mb-2">
        {message}
      </h2>
      {subtext && (
        <p className="text-lg md:text-xl font-bold opacity-90 tracking-wide">
          {subtext}
        </p>
      )}
    </div>
  </div>
);

const CardDisplay = ({
  cardType,
  onClick,
  disabled,
  highlight,
  small,
  tiny,
  count,
}) => {
  const card = CARD_TYPES[cardType];
  if (!card) return <div className="w-16 h-24 bg-gray-800 rounded"></div>;

  if (tiny) {
    return (
      <div
        className={`w-6 h-8 rounded flex items-center justify-center ${card.bg} border ${card.border} shadow-sm shrink-0`}
        title={card.name}
      >
        <card.icon size={12} className={card.color} />
      </div>
    );
  }

  const baseClasses =
    "relative rounded-xl border-2 shadow-lg transition-all flex flex-col items-center justify-between cursor-pointer active:scale-95 select-none";

  const sizeClasses = small
    ? "w-14 h-20 md:w-16 md:h-24 p-1"
    : "w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-44 lg:w-32 lg:h-48 p-2 md:p-3";

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        ${baseClasses} ${sizeClasses} ${card.bg} ${
        highlight ? "ring-4 ring-yellow-400 z-10 scale-105" : card.border
      }
        ${
          disabled
            ? "opacity-50 grayscale cursor-not-allowed"
            : "hover:brightness-110 hover:-translate-y-1"
        }
      `}
    >
      <div className="w-full flex justify-between items-center text-[8px] md:text-[10px] font-bold text-white/70">
        <span>
          {card.type === "DUO"
            ? "DUO"
            : card.type === "COLLECT"
            ? "SET"
            : card.type === "MULTIPLIER"
            ? "MULT"
            : "X"}
        </span>
        {count > 1 && (
          <span className="bg-black/50 px-1 rounded text-white">x{count}</span>
        )}
      </div>

      <card.icon className={`${card.color}`} size={small ? 16 : 28} />

      <div className="w-full text-center">
        <div className="font-bold text-white text-[8px] sm:text-[9px] md:text-xs lg:text-sm leading-tight mb-1 truncate px-1">
          {card.name}
        </div>
        {!small && (
          <div className="text-[7px] sm:text-[8px] md:text-[9px] text-white/60 leading-tight bg-black/40 p-1 rounded h-8 flex items-center justify-center overflow-hidden">
            {card.desc}
          </div>
        )}
      </div>
    </div>
  );
};

const HowToPlayModal = ({ onClose, winPoints }) => (
  <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-10 relative my-8 max-h-[90vh] flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors z-10"
      >
        <X size={24} />
      </button>

      <div className="text-center mb-6 shrink-0">
        <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase mb-2">
          How To Play
        </h2>
        <p className="text-slate-400">
          Collect cards, play pairs, and bet on your victory.
        </p>
      </div>

      <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* BASICS */}
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Anchor className="text-cyan-500" size={20} /> The Goal
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Win rounds to gain points. The first player to reach{" "}
                <strong>{winPoints} points</strong> wins the game.
                <br />
                <br />
                <strong className="text-fuchsia-400">INSTANT WIN:</strong>{" "}
                Collect 4 Mermaids to win immediately!
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <RotateCcw className="text-emerald-500" size={20} /> Your Turn
              </h3>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex gap-3">
                  <div className="bg-slate-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div className="text-sm text-slate-300">
                    <strong>Draw:</strong> Choose one:
                    <ul className="list-disc ml-4 mt-1 text-slate-400">
                      <li>
                        Draw <strong>2 cards</strong> from Deck, keep{" "}
                        <strong>1</strong>.
                      </li>
                      <li>
                        Take <strong>1 card</strong> from Discard.
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-slate-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div className="text-sm text-slate-300">
                    <strong>Play Pairs (Optional):</strong> If you have a
                    matching pair of Duo cards, play them to trigger their
                    effect. Note: Duos score points whether in hand or played!
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="bg-slate-700 w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div className="text-sm text-slate-300">
                    <strong>End Round?</strong> If you have{" "}
                    <strong>{STOP_THRESHOLD}+ points</strong>, you can choose to
                    end the round.
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* CARDS & SCORING */}
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="text-purple-500" size={20} /> New Cards
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-orange-900/20 border border-orange-900/50 p-2 rounded">
                  <strong className="text-orange-400 block mb-1">SAILOR</strong>
                  1 Sailor = 0pts. 2 Sailors = 5pts.
                </div>
                <div className="bg-blue-900/20 border border-blue-900/50 p-2 rounded">
                  <strong className="text-blue-400 block mb-1">SHIP</strong>
                  +1 Point per Boat card.
                </div>
                <div className="bg-cyan-900/20 border border-cyan-900/50 p-2 rounded">
                  <strong className="text-cyan-400 block mb-1">SNOWMAN</strong>
                  +2 Points per Penguin card.
                </div>
                <div className="bg-orange-900/20 border border-orange-900/50 p-2 rounded">
                  <strong className="text-orange-400 block mb-1">
                    CAPTAIN
                  </strong>
                  +3 Points per Sailor card.
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} /> Ending the
                Round
              </h3>
              <div className="space-y-2">
                <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-slate-400">
                  <strong className="text-white block">STOP (Safe)</strong>
                  <span className="text-slate-400 text-xs">
                    Round ends immediately. Everyone scores their points.
                  </span>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border-l-4 border-yellow-500">
                  <strong className="text-yellow-400 block">
                    LAST CHANCE (Bet)
                  </strong>
                  <span className="text-slate-400 text-xs">
                    You bet you have the most points. Everyone else gets{" "}
                    <strong>1 final turn</strong>.
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    <em>Relaxed Rule:</em> Even if you have 0 Mermaids, you get
                    the Color Bonus during Last Chance scoring!
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 border-t border-slate-800 shrink-0">
        <button
          onClick={onClose}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform active:scale-95"
        >
          Got it, Captain!
        </button>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// MAIN LOGIC
// ---------------------------------------------------------------------------

export default function PaperOceans() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("menu");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isMaintenance, setIsMaintenance] = useState(false);

  // UI States
  const [showLogs, setShowLogs] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [selectedHandIndices, setSelectedHandIndices] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [discardSearchMode, setDiscardSearchMode] = useState(false);
  const [sharkStealMode, setSharkStealMode] = useState(false);

  const lastLogIdRef = useRef(null);

  // --- AUTH ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const savedName = localStorage.getItem("paper_oceans_name");
        if (savedName) setPlayerName(savedName);
      }
    });
    return () => unsub();
  }, []);

  // --- RESTORE SESSION ---
  useEffect(() => {
    const savedRoomId = localStorage.getItem("paperoceans_roomId");
    if (savedRoomId) {
      setRoomId(savedRoomId);
    }
  }, []);

  // --- SYNC ---
  useEffect(() => {
    if (!roomId || !user) return;

    const unsub = onSnapshot(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          if (!data.players.some((p) => p.id === user.uid)) {
            setRoomId("");
            setView("menu");
            localStorage.removeItem("paperoceans_roomId");
            setError("You have been kicked from the room.");
            return;
          }

          setGameState(data);

          if (data.status === "lobby") setView("lobby");
          else if (
            data.status === "playing" ||
            data.status === "last_chance" ||
            data.status === "finished" ||
            data.status === "round_end"
          )
            setView("game");
        } else {
          setView("menu");
          setRoomId("");
          localStorage.removeItem("paperoceans_roomId");
          setError("Session dissolved or room does not exist.");
        }
      },
      (err) => {
        console.error("Sync error:", err);
        setError("Connection lost.");
      }
    );
    return () => unsub();
  }, [roomId, user]);

  // --- INSTANT WIN CHECK (4 MERMAIDS) ---
  useEffect(() => {
    if (!gameState || !gameState.players || gameState.status === "finished")
      return;

    const checkInstantWin = async () => {
      const winner = gameState.players.find((p) => {
        const all = [...p.hand, ...p.tableau];
        const mermaids = all.filter((c) => c.type === "MERMAID").length;
        return mermaids === 4;
      });

      if (winner && gameState.status !== "finished") {
        if (gameState.hostId === user.uid) {
          await updateDoc(
            doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
            {
              status: "finished",
              winnerId: winner.id,
              logs: arrayUnion({
                text: `INSTANT WIN! ${winner.name} found all 4 Mermaids!`,
                type: "success",
                id: Date.now(),
              }),
            }
          );
        }
      }
    };
    checkInstantWin();
  }, [
    gameState?.players,
    gameState?.status,
    gameState?.hostId,
    roomId,
    user?.uid,
  ]);

  // --- GLOBAL ALERT SYSTEM ---
  useEffect(() => {
    if (!roomId) {
      lastLogIdRef.current = null;
    }
  }, [roomId]);

  useEffect(() => {
    if (!gameState?.logs || gameState.logs.length === 0) return;

    const latestLog = gameState.logs[gameState.logs.length - 1];

    if (lastLogIdRef.current === null) {
      lastLogIdRef.current = latestLog.id;
      return;
    }

    if (latestLog.id <= lastLogIdRef.current) return;

    lastLogIdRef.current = latestLog.id;

    const text = latestLog.text;
    let title = "";
    let sub = "";
    let Icon = CheckCircle;
    let isImportant = false;

    if (text.includes("played a pair")) {
      isImportant = true;
      title = "PAIR PLAYED!";
      sub = text;
      Icon = Sparkles;
      if (text.includes("Shark")) {
        title = "SHARK ATTACK!";
        Icon = Sword;
      } else if (text.includes("Crab")) {
        title = "SCAVENGER!";
        Icon = Scissors;
      } else if (text.includes("Boat")) {
        title = "FULL SPEED AHEAD!";
        Icon = Ship;
      }
    } else if (text.includes("Stole")) {
      isImportant = true;
      title = "THIEVERY!";
      sub = text;
      Icon = Sword;
    } else if (text.includes("STOP")) {
      isImportant = true;
      title = "ROUND STOPPED!";
      sub = text.split("! ")[0] + " called STOP!";
      Icon = Hand;
    } else if (text.includes("LAST CHANCE")) {
      isImportant = true;
      title = "LAST CHANCE!";
      sub = "All other players get 1 final turn.";
      Icon = AlertTriangle;
    } else if (latestLog.type === "success" && text.includes("Bet")) {
      isImportant = true;
      title = "BET SUCCEEDED!";
      sub = "The gamble paid off!";
      Icon = Trophy;
    } else if (latestLog.type === "failure" && text.includes("Bet")) {
      isImportant = true;
      title = "BET FAILED!";
      sub = "The challenger fell short.";
      Icon = AlertTriangle;
    } else if (text.includes("INSTANT WIN")) {
      isImportant = true;
      title = "INSTANT WIN!";
      sub = "The Mermaids have chosen a winner!";
      Icon = Crown;
    } else if (text.includes("Round") && text.includes("Start")) {
      isImportant = true;
      title = "ANCHORS AWEIGH!";
      sub = `Round ${gameState.round} Begin`;
      Icon = Anchor;
    }

    if (isImportant) {
      triggerFeedback(latestLog.type, title, sub, Icon);
    }
  }, [gameState?.logs]);

  const triggerFeedback = (type, msg, sub, icon) => {
    setFeedback({ type, message: msg, subtext: sub, icon });
    setTimeout(() => setFeedback(null), 2500);
  };

  // --- ACTIONS ---

  const createRoom = async () => {
    if (!playerName) return setError("Enter Name.");
    localStorage.setItem("paper_oceans_name", playerName);
    setLoading(true);

    const newId = Math.random().toString(36).substring(2, 7).toUpperCase();

    const initialData = {
      roomId: newId,
      hostId: user.uid,
      status: "lobby",
      players: [
        {
          id: user.uid,
          name: playerName,
          score: 0,
          hand: [],
          tableau: [],
          ready: true,
        },
      ],
      deck: [],
      discardPile: [],
      turnIndex: 0,
      turnState: "DRAW",
      logs: [],
      winnerId: null,
      bettingPlayerId: null,
      tempDraw: [],
      round: 1,
    };

    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", newId),
        initialData
      );
      localStorage.setItem("paperoceans_roomId", newId); // Save Session
      setRoomId(newId);
    } catch (e) {
      console.error(e);
      setError("Could not create room.");
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!roomCode || !playerName) return setError("Input credentials.");
    localStorage.setItem("paper_oceans_name", playerName);
    setLoading(true);

    const code = roomCode.toUpperCase().trim();
    const ref = doc(db, "artifacts", APP_ID, "public", "data", "rooms", code);

    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError("Room not found.");
        setLoading(false);
        return;
      }

      const data = snap.data();
      if (data.status !== "lobby") {
        setError("Game in progress.");
        setLoading(false);
        return;
      }

      if (data.players.length >= 4) {
        setError("Room full (Max 4).");
        setLoading(false);
        return;
      }

      if (data.players.some((p) => p.id === user.uid)) {
        localStorage.setItem("paperoceans_roomId", code); // Save Session
        setRoomId(code);
        setLoading(false);
        return;
      }

      const newPlayers = [
        ...data.players,
        {
          id: user.uid,
          name: playerName,
          score: 0,
          hand: [],
          tableau: [],
          ready: false,
        },
      ];

      await updateDoc(ref, { players: newPlayers });
      localStorage.setItem("paperoceans_roomId", code); // Save Session
      setRoomId(code);
    } catch (e) {
      console.error(e);
      setError("Error joining room.");
    }
    setLoading(false);
  };

  const toggleReady = async () => {
    const players = [...gameState.players];
    const myIdx = players.findIndex((p) => p.id === user.uid);
    if (myIdx > -1) {
      players[myIdx].ready = !players[myIdx].ready;
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        { players }
      );
    }
  };

  const kickPlayer = async (targetId) => {
    if (gameState.hostId !== user.uid) return;
    const players = gameState.players.filter((p) => p.id !== targetId);
    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      { players }
    );
  };

  const startRound = async (continueGame = false) => {
    if (gameState.hostId !== user.uid) return;

    let deck = createDeck();

    const players = gameState.players.map((p) => ({
      ...p,
      hand: [],
      tableau: [],
      score: continueGame ? p.score : 0,
    }));

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "playing",
        deck,
        discardPile: [deck.pop(), deck.pop()],
        players,
        turnIndex: continueGame
          ? (gameState.turnIndex + 1) % players.length
          : 0,
        turnState: "DRAW",
        logs: arrayUnion({
          text: continueGame
            ? `--- Round ${gameState.round + 1} Start ---`
            : `--- Game Start ---`,
          type: "neutral",
          id: Date.now(),
        }),
        bettingPlayerId: null,
        tempDraw: [],
        round: continueGame ? increment(1) : 1,
      }
    );
  };

  const handleLeave = async () => {
    if (!roomId) return;
    try {
      const ref = doc(
        db,
        "artifacts",
        APP_ID,
        "public",
        "data",
        "rooms",
        roomId
      );
      if (gameState.hostId === user.uid) {
        await deleteDoc(ref);
      } else {
        const newPlayers = gameState.players.filter((p) => p.id !== user.uid);
        await updateDoc(ref, { players: newPlayers });
      }
    } catch (e) {
      console.log("Room might already be deleted");
    }

    localStorage.removeItem("paperoceans_roomId"); // Clear Session
    setRoomId("");
    setView("menu");
    setShowLeaveConfirm(false);
    setGameState(null);
  };

  const returnToLobby = async () => {
    if (gameState.hostId !== user.uid) return;
    const players = gameState.players.map((p) => ({
      ...p,
      hand: [],
      tableau: [],
      score: 0,
      ready: false,
    }));
    const host = players.find((p) => p.id === gameState.hostId);
    if (host) host.ready = true;

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "lobby",
        players,
        deck: [],
        discardPile: [],
        logs: [],
        round: 1,
        turnIndex: 0,
        winnerId: null,
        bettingPlayerId: null,
        tempDraw: [],
      }
    );
    setShowLeaveConfirm(false);
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(roomId);
      triggerFeedback("neutral", "COPIED!", "", CheckCircle);
    } catch (e) {
      const el = document.createElement("textarea");
      el.value = roomId;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      triggerFeedback("neutral", "COPIED!", "", CheckCircle);
    }
  };

  // --- GAMEPLAY LOGIC ---

  const handleDrawDeck = async () => {
    const players = [...gameState.players];
    const deck = [...gameState.deck];

    if (deck.length < 2) {
      const discard = [...gameState.discardPile];
      if (discard.length === 0 && deck.length === 0) {
        return;
      }
      if (gameState.discardPile.length > 0) {
        const topDiscard = discard.pop();
        const newDeck = [...deck, ...discard];
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        await updateDoc(
          doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
          {
            deck: newDeck,
            discardPile: [topDiscard],
            logs: arrayUnion({
              text: "Deck reshuffled from discard.",
              type: "neutral",
              id: Date.now(),
            }),
          }
        );
        return;
      }
    }

    const drawn = [deck.pop(), deck.pop()].filter(Boolean);

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        turnState: "DRAW_DECISION",
        tempDraw: drawn,
        deck,
        logs: arrayUnion({
          text: `${players[gameState.turnIndex].name} draws 2...`,
          type: "neutral",
          id: Date.now(),
        }),
      }
    );
  };

  const handleKeepCard = async (cardIndex) => {
    const players = [...gameState.players];
    const discardPile = [...gameState.discardPile];
    const tempDraw = [...gameState.tempDraw];
    const pIdx = gameState.turnIndex;

    const kept = tempDraw[cardIndex];
    const rejected = tempDraw[cardIndex === 0 ? 1 : 0];

    players[pIdx].hand.push(kept);
    if (rejected) discardPile.push(rejected);

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        turnState: "ACTION_PHASE",
        players,
        discardPile,
        tempDraw: [],
        logs: arrayUnion({
          text: `...kept 1 and discarded 1.`,
          type: "neutral",
          id: Date.now(),
        }),
      }
    );
  };

  const handleDrawDiscard = async () => {
    const players = [...gameState.players];
    const discardPile = [...gameState.discardPile];
    const pIdx = gameState.turnIndex;

    const card = discardPile.pop();
    players[pIdx].hand.push(card);

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        turnState: "ACTION_PHASE",
        players,
        discardPile,
        logs: arrayUnion({
          text: `${players[pIdx].name} took ${
            CARD_TYPES[card.type].name
          } from discard.`,
          type: "neutral",
          id: Date.now(),
        }),
      }
    );
  };

  const handlePlayDuo = async () => {
    if (selectedHandIndices.length !== 2) return;
    const pIdx = gameState.turnIndex;
    const players = [...gameState.players];
    const me = players[pIdx];
    const card1 = me.hand[selectedHandIndices[0]];
    const card2 = me.hand[selectedHandIndices[1]];

    if (card1.type !== card2.type || CARD_TYPES[card1.type].type !== "DUO") {
      triggerFeedback(
        "failure",
        "INVALID DUO",
        "Must pick 2 matching Duo cards.",
        AlertTriangle
      );
      setSelectedHandIndices([]);
      return;
    }

    const indices = [...selectedHandIndices].sort((a, b) => b - a);
    me.hand.splice(indices[0], 1);
    me.hand.splice(indices[1], 1);
    me.tableau.push(card1, card2);

    let nextState = "ACTION_PHASE";
    let logs = [
      {
        text: `${me.name} played a pair of ${CARD_TYPES[card1.type].name}s!`,
        type: "success",
        id: Date.now(),
      },
    ];

    if (card1.type === "BOAT") {
      nextState = "DRAW";
      logs.push({
        text: "Effect: Extra Turn! Draw again.",
        type: "success",
        id: Date.now() + 1,
      });
    } else if (card1.type === "FISH") {
      const deck = [...gameState.deck];
      if (deck.length > 0) {
        const c = deck.pop();
        me.hand.push(c);
        logs.push({
          text: `Effect: Drew a card from deck.`,
          type: "neutral",
          id: Date.now() + 1,
        });
      }
    } else if (card1.type === "CRAB") {
      if (gameState.discardPile.length > 0) {
        setDiscardSearchMode(true);
      }
    } else if (card1.type === "SHARK") {
      const opponentHasCards = players.some(
        (p, i) => i !== pIdx && p.hand.length > 0
      );
      if (opponentHasCards) {
        setSharkStealMode(true);
      } else {
        logs.push({
          text: "No one to steal from!",
          type: "neutral",
          id: Date.now() + 1,
        });
      }
    }

    setSelectedHandIndices([]);

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        players,
        turnState: nextState,
        logs: arrayUnion(...logs),
        deck: gameState.deck,
      }
    );
  };

  const handleCrabPick = async (card) => {
    const players = [...gameState.players];
    const discardPile = [...gameState.discardPile];

    const index = discardPile.findIndex((c) => c.id === card.id);
    if (index > -1) {
      discardPile.splice(index, 1);
      players[gameState.turnIndex].hand.push(card);
    }

    setDiscardSearchMode(false);
    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        players,
        discardPile,
        logs: arrayUnion({
          text: `Effect: Picked a card from discard.`,
          type: "neutral",
          id: Date.now(),
        }),
      }
    );
  };

  const handleSharkSteal = async (targetId) => {
    const players = [...gameState.players];
    const meIdx = gameState.turnIndex;
    const targetIdx = players.findIndex((p) => p.id === targetId);

    if (players[targetIdx].hand.length > 0) {
      const rand = Math.floor(Math.random() * players[targetIdx].hand.length);
      const stolen = players[targetIdx].hand.splice(rand, 1)[0];
      players[meIdx].hand.push(stolen);

      setSharkStealMode(false);
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
        {
          players,
          logs: arrayUnion({
            text: `Effect: Stole card from ${players[targetIdx].name}.`,
            type: "failure",
            id: Date.now(),
          }),
        }
      );
    } else {
      setSharkStealMode(false);
    }
  };

  const handleEndTurn = async () => {
    const players = [...gameState.players];
    const nextIdx = (gameState.turnIndex + 1) % players.length;

    if (gameState.status === "last_chance") {
      if (players[nextIdx].id === gameState.bettingPlayerId) {
        await resolveRound(players);
        return;
      }
    }

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        turnIndex: nextIdx,
        turnState: "DRAW",
        logs: arrayUnion({
          text: `Turn: ${players[nextIdx].name}`,
          type: "neutral",
          id: Date.now(),
        }),
      }
    );
  };

  const handleStop = async () => {
    const players = [...gameState.players];
    const me = players[gameState.turnIndex];

    players.forEach((p) => {
      const pts = calculatePoints(p.hand, p.tableau);
      p.score += pts;
      p.ready = p.id === gameState.hostId;
    });

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "round_end",
        players,
        logs: arrayUnion({
          text: `${me.name} called STOP! Round ended safely.`,
          type: "success",
          id: Date.now(),
        }),
      }
    );
    setTimeout(() => checkForGameWin(players, roomId), 3000);
  };

  const handleLastChance = async () => {
    const players = [...gameState.players];
    const me = players[gameState.turnIndex];

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "last_chance",
        bettingPlayerId: me.id,
        turnIndex: (gameState.turnIndex + 1) % players.length,
        turnState: "DRAW",
        logs: arrayUnion({
          text: `⚠️ ${me.name} called LAST CHANCE! Everyone gets 1 turn to beat them.`,
          type: "warning",
          id: Date.now(),
        }),
      }
    );
  };

  const resolveRound = async (currentPlayers) => {
    const players = [...currentPlayers];
    const bettorId = gameState.bettingPlayerId;
    const bettor = players.find((p) => p.id === bettorId);

    // Calc points for bettor (IsLastChance=true so if they have no mermaids they still get bonus?
    // User Rule: "that means color bonus rules apply even if there is no mermaid."
    // We apply this to EVERYONE during Last Chance resolution or just Bettor?
    // Usually it applies to the hand valuation for everyone in Last Chance mode.
    const bettorPoints = calculatePoints(bettor.hand, bettor.tableau, true);

    let bettorWon = true;

    players.forEach((p) => {
      if (p.id !== bettorId) {
        const pts = calculatePoints(p.hand, p.tableau, true);
        if (pts >= bettorPoints) bettorWon = false;
      }
    });

    // Helper to calculate JUST the color bonus part for the Win/Loss logic
    // (In Sea Salt, if you win bet, opps only score color bonus)
    const getColorBonusOnly = (p) => {
      const all = [...p.hand, ...p.tableau];
      const mermaids = all.filter((c) => c.type === "MERMAID").length;
      const colorCounts = {};
      all.forEach((c) => {
        const def = CARD_TYPES[c.type];
        const color = def ? def.cardColor : null;
        if (color && color !== "MULTI")
          colorCounts[color] = (colorCounts[color] || 0) + 1;
      });
      const max = Math.max(0, ...Object.values(colorCounts));
      // Relaxed rule applies here too
      if (mermaids > 0) return mermaids * max;
      return max;
    };

    if (bettorWon) {
      bettor.score += bettorPoints + 5; // Bettor gets full + Bonus
      players.forEach((p) => {
        if (p.id !== bettorId) {
          p.score += getColorBonusOnly(p); // Opponents get Color Bonus only
        }
      });
    } else {
      bettor.score += getColorBonusOnly(bettor); // Bettor gets Color Bonus only
      players.forEach((p) => {
        if (p.id !== bettorId) {
          p.score += calculatePoints(p.hand, p.tableau, true); // Opponents get full score
        }
      });
    }

    players.forEach((p) => (p.ready = p.id === gameState.hostId));

    await updateDoc(
      doc(db, "artifacts", APP_ID, "public", "data", "rooms", roomId),
      {
        status: "round_end",
        players,
        logs: arrayUnion({
          text: bettorWon
            ? `Bet Succeeded! ${bettor.name} gets bonus.`
            : `Bet Failed! ${bettor.name} gets minimum.`,
          type: bettorWon ? "success" : "failure",
          id: Date.now(),
        }),
      }
    );
    setTimeout(() => checkForGameWin(players, roomId), 4000);
  };

  const checkForGameWin = async (players, rId) => {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const threshold = GET_WIN_THRESHOLD(players.length);

    if (winner.score >= threshold) {
      await updateDoc(
        doc(db, "artifacts", APP_ID, "public", "data", "rooms", rId),
        {
          status: "finished",
          winnerId: winner.id,
        }
      );
    }
  };

  if (isMaintenance) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="bg-orange-500/10 p-8 rounded-2xl border border-orange-500/30">
          <Hammer
            size={64}
            className="text-orange-500 mx-auto mb-4 animate-bounce"
          />
          <h1 className="text-3xl font-bold mb-2">Under Maintenance</h1>
          <p className="text-gray-400">
            Tide is low. Folding operations paused.
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER HELPERS ---

  if (view === "menu") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        <FloatingBackground />

        {/* GUIDE MODAL */}
        {showGuide && (
          <HowToPlayModal
            onClose={() => setShowGuide(false)}
            winPoints={GET_WIN_THRESHOLD(2)}
          />
        )}

        <div className="z-10 text-center mb-10 animate-in fade-in zoom-in duration-700">
          <Origami
            size={64}
            className="text-cyan-400 mx-auto mb-4 animate-bounce"
          />
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-blue-600 tracking-widest drop-shadow-md">
            PAPER OCEANS
          </h1>
          <p className="text-cyan-400/60 tracking-[0.3em] uppercase mt-2 text-sm md:text-base">
            Fold. Collect. Bet.
          </p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 p-8 rounded-2xl w-full max-w-md shadow-2xl z-10 relative">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 mb-4 rounded text-center text-sm font-bold flex items-center justify-center gap-2">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-cyan-500 uppercase ml-1">
                Captain Name
              </label>
              <input
                className="w-full bg-black/50 border border-slate-700 focus:border-cyan-500 p-4 rounded-xl text-white outline-none transition-all text-lg font-bold"
                placeholder="Enter Name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={12}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={createRoom}
                disabled={loading}
                className="bg-gradient-to-br from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 p-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg shadow-cyan-900/50"
              >
                <Anchor size={24} />
                <span>New Voyage</span>
              </button>
              <div className="flex flex-col gap-2">
                <input
                  className="bg-black/50 border border-slate-700 focus:border-cyan-500 p-2 rounded-xl text-white text-center uppercase font-mono font-bold tracking-widest outline-none h-12"
                  placeholder="CODE"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={5}
                />
                <button
                  onClick={joinRoom}
                  disabled={loading}
                  className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl font-bold text-slate-300 transition-all active:scale-95 h-full"
                >
                  Join Fleet
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className="w-full mt-4 text-slate-400 hover:text-cyan-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors py-2"
          >
            <BookOpen size={16} /> How to Play
          </button>
        </div>
        <div className="absolute bottom-4 text-slate-600 text-xs text-center">
          Inspired by Sea, Salt & Paper. <br /> A tribute game.
        </div>
      </div>
    );
  }

  if (view === "lobby" && gameState) {
    const isHost = gameState.hostId === user.uid;

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 relative">
        <FloatingBackground />

        {/* GUIDE MODAL */}
        {showGuide && (
          <HowToPlayModal
            onClose={() => setShowGuide(false)}
            winPoints={GET_WIN_THRESHOLD(gameState.players.length)}
          />
        )}

        <div className="z-10 w-full max-w-lg bg-slate-900/90 backdrop-blur p-8 rounded-2xl border border-cyan-500/30 shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
            <div className="flex flex-col">
              <span className="text-xs text-cyan-500 uppercase font-bold tracking-wider">
                Voyage Code
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-4xl font-black text-white font-mono tracking-widest">
                  {gameState.roomId}
                </h2>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGuide(true)}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-cyan-400 transition-colors"
                title="How to Play"
              >
                <BookOpen size={20} />
              </button>
              <button
                onClick={handleLeave}
                className="p-3 bg-red-900/30 hover:bg-red-900/50 rounded-xl text-red-400 transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
              Crew Manifest ({gameState.players.length}/4)
            </h3>
            {gameState.players.map((p) => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700"
              >
                <span className="font-bold flex items-center gap-3 text-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-black">
                    {p.name.charAt(0)}
                  </div>
                  {p.name}
                  {p.id === gameState.hostId && (
                    <Crown size={16} className="text-yellow-500" />
                  )}
                </span>

                <div className="flex items-center gap-2">
                  {isHost && p.id !== user.uid && (
                    <button
                      onClick={() => kickPlayer(p.id)}
                      className="p-1.5 hover:bg-red-900/50 rounded text-slate-500 hover:text-red-400 transition-colors"
                      title="Kick Player"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {Array.from({ length: 4 - gameState.players.length }).map(
              (_, i) => (
                <div
                  key={i}
                  className="border-2 border-dashed border-slate-800 rounded-xl p-4 flex items-center justify-center text-slate-700 font-bold uppercase text-sm"
                >
                  Empty Slot
                </div>
              )
            )}
          </div>

          {isHost ? (
            <button
              onClick={() => startRound(false)}
              disabled={gameState.players.length < 2}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-4 rounded-xl font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {gameState.players.length < 2 ? (
                "Waiting for Crew..."
              ) : (
                <>
                  <Play size={24} fill="currentColor" /> Set Sail
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-center font-bold">
              Waiting for Captain...
            </div>
          )}
        </div>
        <GameLogo />
      </div>
    );
  }

  if (view === "game" && gameState) {
    const pIdx = gameState.players.findIndex((p) => p.id === user.uid);
    const me = gameState.players[pIdx];
    const isMyTurn = gameState.turnIndex === pIdx;

    // Calculate potential points
    const currentPoints = calculatePoints(me.hand, me.tableau);

    // Can stop rule: Must have >= 7 points
    // AND must be in Action Phase (after drawing)
    const canEndRound =
      currentPoints >= STOP_THRESHOLD &&
      isMyTurn &&
      gameState.turnState === "ACTION_PHASE" &&
      gameState.status !== "last_chance"; // Add this line

    return (
      <div className="fixed inset-0 bg-slate-950 text-white overflow-hidden flex flex-col font-sans select-none">
        <FloatingBackground />

        {/* GUIDE MODAL IN GAME */}
        {showGuide && (
          <HowToPlayModal
            onClose={() => setShowGuide(false)}
            winPoints={GET_WIN_THRESHOLD(gameState.players.length)}
          />
        )}

        {feedback && (
          <FeedbackOverlay
            type={feedback.type}
            message={feedback.message}
            subtext={feedback.subtext}
            icon={feedback.icon}
          />
        )}

        {/* TOP BAR */}
        <div className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 z-50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-900/50 rounded flex items-center justify-center">
              <Fish size={18} className="text-cyan-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-cyan-100 text-sm leading-none">
                ROOM: {gameState.roomId}
              </span>
              <span className="text-[10px] text-cyan-500 font-mono">
                ROUND {gameState.round}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400 transition-colors"
              title="How to Play"
            >
              <BookOpen size={18} />
            </button>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`p-2 rounded transition-colors ${
                showLogs
                  ? "bg-cyan-900 text-cyan-400"
                  : "hover:bg-slate-800 text-slate-400"
              }`}
            >
              <History size={18} />
            </button>
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="p-2 hover:bg-red-900/30 rounded text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* LOGS DRAWER */}
        {showLogs && (
          <div className="absolute top-14 right-0 w-64 bg-slate-900/95 border-l border-slate-700 bottom-0 z-[60] overflow-y-auto p-2 backdrop-blur-xl">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-slate-900/95 py-2">
              Captain's Log
            </h4>
            <div className="space-y-2">
              {gameState.logs
                .slice()
                .reverse()
                .map((log) => (
                  <div
                    key={log.id}
                    className={`text-xs p-2 rounded border-l-2 ${
                      log.type === "success"
                        ? "border-emerald-500 bg-emerald-900/10"
                        : log.type === "failure"
                        ? "border-red-500 bg-red-900/10"
                        : log.type === "warning"
                        ? "border-amber-500 bg-amber-900/10"
                        : "border-slate-500 bg-slate-800/30"
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {/* OPPONENTS AREA */}
          <div className="flex-none p-2 grid grid-cols-3 gap-2">
            {gameState.players.map((p, i) => {
              if (p.id === user.uid) return null;
              const isActive = gameState.turnIndex === i;

              return (
                <div
                  key={p.id}
                  className={`relative p-2 rounded-xl transition-all duration-500 ${
                    isActive
                      ? "bg-slate-800 border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900/50 border border-slate-800 opacity-80"
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest z-20">
                      Active
                    </div>
                  )}

                  {/* Avatar & Info */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs border border-slate-600">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>Cards: {p.hand.length}</span>
                        <span className="text-yellow-500">{p.score}pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Opponent Tableau (Tiny) */}
                  <div className="flex flex-wrap gap-1 h-12 content-start overflow-hidden">
                    {p.tableau.map((c, idx) => (
                      <CardDisplay key={idx} cardType={c.type} tiny />
                    ))}
                    {p.tableau.length === 0 && (
                      <span className="text-[9px] text-slate-600 italic">
                        No cards played
                      </span>
                    )}
                  </div>

                  {/* Shark Target Overlay */}
                  {sharkStealMode && p.hand.length > 0 && (
                    <button
                      onClick={() => handleSharkSteal(p.id)}
                      className="absolute inset-0 bg-red-500/80 rounded-xl z-30 flex flex-col items-center justify-center animate-in zoom-in cursor-pointer hover:bg-red-600/90 transition-colors"
                    >
                      <Sword size={24} className="text-white mb-1" />
                      <span className="font-black text-white text-sm uppercase tracking-widest">
                        STEAL
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* CENTER BOARD: DECK & DISCARD */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px]">
            {/* Draw Decision UI */}
            {isMyTurn && gameState.turnState === "DRAW_DECISION" ? (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                <h3 className="text-lg font-bold text-white bg-black/50 px-4 py-1 rounded-full backdrop-blur">
                  Choose 1 to Keep
                </h3>
                <div className="flex gap-4">
                  {gameState.tempDraw.map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                      <CardDisplay cardType={c.type} highlight={true} />
                      <button
                        onClick={() => handleKeepCard(i)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg transition-transform active:scale-95"
                      >
                        Keep
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Standard Board */
              <div className="flex gap-4 md:gap-8 items-center">
                {/* Deck */}
                <div
                  onClick={() =>
                    isMyTurn && gameState.turnState === "DRAW"
                      ? handleDrawDeck()
                      : null
                  }
                  className={`
                    w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-44 bg-slate-800 rounded-xl border-2 border-slate-600 flex flex-col items-center justify-center relative shadow-xl transition-all
                    ${
                      isMyTurn && gameState.turnState === "DRAW"
                        ? "cursor-pointer hover:-translate-y-2 hover:border-cyan-400 hover:shadow-cyan-500/20 ring-4 ring-cyan-500/20"
                        : "opacity-80"
                    }
                  `}
                >
                  {/* Card Back Pattern */}
                  <div className="absolute inset-2 border-2 border-dashed border-slate-700/50 rounded flex items-center justify-center">
                    <Anchor className="text-slate-700" size={32} />
                  </div>
                  <div className="z-10 bg-slate-900 px-2 py-1 rounded text-xs font-bold text-slate-400 shadow">
                    {gameState.deck.length} Left
                  </div>
                  {isMyTurn && gameState.turnState === "DRAW" && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap animate-bounce">
                      DRAW 2
                    </div>
                  )}
                </div>

                {/* Discard Pile */}
                <div
                  onClick={() =>
                    isMyTurn &&
                    gameState.turnState === "DRAW" &&
                    gameState.discardPile.length > 0
                      ? handleDrawDiscard()
                      : null
                  }
                  className={`
                    w-20 h-28 sm:w-24 sm:h-36 md:w-28 md:h-44 bg-black/20 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center relative
                    ${
                      isMyTurn &&
                      gameState.turnState === "DRAW" &&
                      gameState.discardPile.length > 0
                        ? "cursor-pointer hover:border-cyan-400 hover:bg-slate-800/50"
                        : ""
                    }
                  `}
                >
                  {gameState.discardPile.length > 0 ? (
                    <div className="relative w-full h-full transform rotate-3">
                      <CardDisplay
                        cardType={
                          gameState.discardPile[
                            gameState.discardPile.length - 1
                          ].type
                        }
                        disabled={!isMyTurn || gameState.turnState !== "DRAW"}
                      />
                      {isMyTurn && gameState.turnState === "DRAW" && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap animate-bounce">
                          TAKE 1
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 font-bold uppercase tracking-widest">
                      Empty
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Status Text */}
            <div className="absolute top-0 w-full text-center pointer-events-none">
              {!isMyTurn && gameState.status === "playing" && (
                <div className="inline-block bg-slate-900/80 px-4 py-1 rounded-full text-slate-400 text-sm border border-slate-700">
                  Waiting for {gameState.players[gameState.turnIndex].name}...
                </div>
              )}
            </div>
          </div>

          {/* PLAYER HUD */}
          <div className="flex-none bg-slate-900 border-t border-slate-800 p-3 pb-6 relative z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
            {/* Action Bar (Above Cards) */}
            <div className="flex flex-wrap justify-between items-end mb-3 gap-2">
              <div className="flex gap-4 items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider text-yellow-500/80">
                    Total Score
                  </span>
                  <span className="text-2xl font-black text-yellow-500 leading-none">
                    {me.score}
                  </span>
                </div>
                <div className="w-px bg-slate-700 h-8"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    Round Est.
                  </span>
                  <span className="text-2xl font-black text-white leading-none">
                    {currentPoints}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 items-center flex-wrap justify-end ml-auto">
                {/* Duo Button */}
                {selectedHandIndices.length === 2 &&
                  isMyTurn &&
                  gameState.turnState === "ACTION_PHASE" && (
                    <button
                      onClick={handlePlayDuo}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg animate-in slide-in-from-bottom-2 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Sparkles size={16} /> Play Pair
                    </button>
                  )}

                {/* End Turn */}
                {isMyTurn && gameState.turnState === "ACTION_PHASE" && (
                  <button
                    onClick={handleEndTurn}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-colors animate-bounce"
                  >
                    End Turn <RotateCcw size={16} />
                  </button>
                )}

                {/* STOP / LAST CHANCE */}
                {canEndRound && (
                  <div className="flex gap-2 ml-4 pl-4 border-l border-slate-700">
                    <button
                      onClick={handleStop}
                      className="bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-lg font-black shadow-lg hover:shadow-white/20 transition-all active:scale-95"
                    >
                      STOP
                    </button>
                    <button
                      onClick={handleLastChance}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white px-4 py-2 rounded-lg font-black shadow-lg animate-pulse transition-all active:scale-95 border-2 border-white/20"
                    >
                      LAST CHANCE
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 h-48">
              {/* My Tableau (Left) */}
              <div className="w-24 flex-none flex flex-col gap-1 border-r border-slate-800 pr-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold text-center flex-none">
                  Tableau
                </span>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pb-16">
                  {me.tableau.map((c, i) => (
                    // Stack cards slightly
                    <div
                      key={i}
                      className={`${
                        i > 0 ? "-mt-16" : ""
                      } transition-all hover:translate-x-2`}
                    >
                      <CardDisplay cardType={c.type} small />
                    </div>
                  ))}
                  {me.tableau.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[10px] text-slate-700 text-center">
                      No Pairs Played
                    </div>
                  )}
                </div>
              </div>

              {/* My Hand (Scrollable) */}
              <div className="flex-1 overflow-x-auto pb-2 pt-8 flex items-center gap-2 px-2">
                {me.hand.map((c, i) => {
                  const isSelected = selectedHandIndices.includes(i);
                  return (
                    <div
                      key={i}
                      className={`transition-all duration-200 transform origin-bottom ${
                        isSelected
                          ? "-translate-y-6 scale-105 z-10"
                          : "hover:-translate-y-2 hover:z-10"
                      }`}
                    >
                      <CardDisplay
                        cardType={c.type}
                        highlight={isSelected}
                        onClick={() => {
                          if (
                            gameState.turnState !== "ACTION_PHASE" &&
                            gameState.turnState !== "DRAW_DECISION"
                          )
                            return; // Only selectable in Action

                          if (selectedHandIndices.includes(i)) {
                            setSelectedHandIndices(
                              selectedHandIndices.filter((idx) => idx !== i)
                            );
                          } else if (selectedHandIndices.length < 2) {
                            setSelectedHandIndices([...selectedHandIndices, i]);
                          }
                        }}
                      />
                    </div>
                  );
                })}
                {me.hand.length === 0 && (
                  <div className="w-full text-center text-slate-600 font-bold italic">
                    Hand Empty
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODALS */}

        {/* Discard Search (Crab) */}
        {discardSearchMode && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 shadow-2xl">
              <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <Scissors className="text-red-400" /> Salvage from Discard
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto p-2 bg-black/20 rounded-xl mb-4">
                {gameState.discardPile.map((c, i) => (
                  <CardDisplay
                    key={i}
                    cardType={c.type}
                    onClick={() => handleCrabPick(c)}
                    small
                  />
                ))}
              </div>
              <button
                onClick={() => setDiscardSearchMode(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-xl text-slate-300 font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* WIN / ROUND END SCREEN */}
        {(gameState.status === "finished" ||
          gameState.status === "round_end") && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-[150] flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-500">
            {gameState.status === "finished" ? (
              <Trophy
                size={80}
                className="text-yellow-400 mb-6 animate-bounce"
              />
            ) : (
              <FlagIcon status={gameState.status} />
            )}

            <h2 className="text-4xl md:text-6xl font-black text-white mb-2 uppercase tracking-widest drop-shadow-xl">
              {gameState.status === "finished"
                ? "LEGEND OF THE SEA"
                : "ROUND COMPLETE"}
            </h2>

            <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/10 w-full max-w-md mb-8">
              {/* Scoreboard */}
              <div className="space-y-3">
                {[...gameState.players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-500 font-bold w-6">
                          #{i + 1}
                        </span>
                        <span className="font-bold text-lg">{p.name}</span>
                        {gameState.status === "finished" && i === 0 && (
                          <Crown size={16} className="text-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Ready Badge in End Screen */}
                        {p.ready ? (
                          <span className="text-emerald-400 text-[10px] font-bold uppercase bg-emerald-900/30 px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle size={10} /> Ready
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px] font-bold uppercase bg-slate-900/30 px-2 py-1 rounded">
                            Not Ready
                          </span>
                        )}
                        <span className="text-2xl font-black text-cyan-400">
                          {p.score}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {gameState.hostId === user.uid ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => startRound(gameState.status === "round_end")}
                  disabled={!gameState.players.every((p) => p.ready)}
                  className="bg-white hover:bg-cyan-50 text-cyan-900 px-10 py-4 rounded-full font-black text-xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {!gameState.players.every((p) => p.ready)
                    ? "WAITING FOR READY..."
                    : gameState.status === "finished"
                    ? "NEW GAME"
                    : "NEXT ROUND"}
                  <Play fill="currentColor" size={20} />
                </button>
                <button
                  onClick={returnToLobby}
                  className="text-slate-400 hover:text-white text-sm font-bold uppercase tracking-widest hover:underline"
                >
                  Return to Lobby
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleReady}
                  className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    gameState.players.find((p) => p.id === user.uid)?.ready
                      ? "bg-slate-700 text-emerald-400 hover:bg-slate-600"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {gameState.players.find((p) => p.id === user.uid)?.ready
                    ? "READY! (Wait for Captain)"
                    : "MARK READY"}
                </button>
                <div className="text-slate-400 text-xs font-bold animate-pulse mt-2">
                  Waiting for next round...
                </div>
              </div>
            )}
          </div>
        )}

        {showLeaveConfirm && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-xs w-full text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                Abandon Ship?
              </h3>
              <p className="text-slate-400 mb-6 text-sm">
                You will leave the current game.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 bg-slate-800 py-2 rounded font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeave}
                    className="flex-1 bg-red-600 py-2 rounded font-bold text-white"
                  >
                    Leave
                  </button>
                </div>
                {gameState.hostId === user.uid && (
                  <button
                    onClick={returnToLobby}
                    className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded font-bold text-cyan-400 mt-2 text-sm"
                  >
                    Return All to Lobby
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        <GameLogo />
      </div>
    );
  }

  return null;
}

const FlagIcon = ({ status }) => {
  return <Anchor size={64} className="text-cyan-500 mb-6" />;
};
