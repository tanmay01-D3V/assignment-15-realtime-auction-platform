require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const {
  createAuctionState,
  getAuctionSnapshot,
  handleBidPlacement,
} = require("./sockets/auctionEngine");
const { startAuctionTimer } = require("./sockets/timerManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = Number(process.env.PORT) || 5000;
const AUCTION_ID = "AUC_VINTAGE_99";
const auctions = {
  [AUCTION_ID]: createAuctionState(AUCTION_ID),
};

const roomMembers = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Assignment 15 Live Auction & Bidding Engine",
    auctionId: AUCTION_ID,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/auction", (req, res) => {
  const auction = auctions[AUCTION_ID];

  res.status(200).json({
    success: true,
    auction: getAuctionSnapshot(auction),
  });
});

function getRoomParticipants(roomId) {
  return roomMembers.get(roomId) || new Set();
}

function updateRoomMembers(roomId, socketId, username) {
  if (!roomMembers.has(roomId)) {
    roomMembers.set(roomId, new Map());
  }

  const room = roomMembers.get(roomId);
  room.set(socketId, username || "Guest");
  io.to(roomId).emit("user:joined", {
    username: username || "Guest",
    totalViewers: room.size,
  });
  return room.size;
}

function removeRoomMember(roomId, socketId) {
  if (!roomMembers.has(roomId)) return;

  const room = roomMembers.get(roomId);
  room.delete(socketId);

  if (room.size === 0) {
    roomMembers.delete(roomId);
  } else {
    io.to(roomId).emit("user:joined", {
      username: "A bidder",
      totalViewers: room.size,
    });
  }
}

io.on("connection", (socket) => {
  console.log(`New socket connected: ${socket.id}`);

  socket.on(
    "auction:join",
    ({ auctionId = AUCTION_ID, username = "Guest" } = {}) => {
      const roomId = auctionId;
      const auction = auctions[roomId] || createAuctionState(roomId);
      auctions[roomId] = auction;

      socket.join(roomId);
      socket.data.auctionId = roomId;
      socket.data.username = username;

      if (!auction.timerId && auction.status === "active") {
        startAuctionTimer(io, auction);
      }

      updateRoomMembers(roomId, socket.id, username);

      socket.emit("auction:init", {
        item: getAuctionSnapshot(auction),
        bidHistory: auction.bidHistory,
        timeRemaining: auction.timeRemainingSeconds,
      });
    },
  );

  socket.on("bid:place", ({ auctionId = AUCTION_ID, amount } = {}) => {
    const auction = auctions[auctionId];
    if (!auction) {
      return socket.emit("bid:rejected", { reason: "Auction room not found." });
    }

    const username = socket.data.username || "Guest";
    handleBidPlacement(io, socket, auction, amount, username);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.auctionId;
    if (roomId) {
      removeRoomMember(roomId, socket.id);
    }
  });
});

const auction = auctions[AUCTION_ID];
if (auction && auction.status === "active") {
  startAuctionTimer(io, auction);
}

function startServer(port = PORT) {
  server.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Auction Server running on http://localhost:${port}`);
    console.log(`📡 Socket.io live bidding engine ready`);
    console.log(`🔔 Auction Room: ${AUCTION_ID}`);
    console.log(`====================================================`);
  });
}

if (process.env.NODE_ENV !== "test") {
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const fallbackPort = PORT + 1;
      console.warn(`Port ${PORT} is busy. Retrying on ${fallbackPort}.`);
      startServer(fallbackPort);
      return;
    }

    throw error;
  });

  startServer(PORT);
}

module.exports = { app, server, io, auctions };
