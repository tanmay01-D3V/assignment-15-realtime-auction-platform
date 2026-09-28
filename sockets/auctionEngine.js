function createAuctionState(auctionId = "AUC_VINTAGE_99") {
  return {
    id: auctionId,
    title: "1967 Vintage Fender Stratocaster",
    description: "Original condition rare electric guitar",
    startingPrice: 50000,
    currentBid: 50000,
    highestBidder: null,
    minIncrement: 2000,
    timeRemainingSeconds: 60,
    status: "active",
    bidHistory: [],
    timerId: null,
  };
}

function getAuctionSnapshot(auction) {
  return {
    id: auction.id,
    title: auction.title,
    description: auction.description,
    startingPrice: auction.startingPrice,
    currentBid: auction.currentBid,
    highestBidder: auction.highestBidder,
    minIncrement: auction.minIncrement,
    timeRemainingSeconds: auction.timeRemainingSeconds,
    status: auction.status,
    bidHistory: auction.bidHistory.slice(0, 10),
  };
}

function handleBidPlacement(io, socket, auction, bidAmount, username) {
  if (
    !auction ||
    auction.status !== "active" ||
    auction.timeRemainingSeconds <= 0
  ) {
    return socket.emit("bid:rejected", { reason: "Auction is closed." });
  }

  if (auction.highestBidder && auction.highestBidder.socketId === socket.id) {
    return socket.emit("bid:rejected", {
      reason: "You are already the highest bidder.",
    });
  }

  const numericBid = Number(bidAmount);
  const minimumRequired = auction.currentBid + auction.minIncrement;

  if (Number.isNaN(numericBid) || numericBid < minimumRequired) {
    return socket.emit("bid:rejected", {
      reason: `Bid too low. Minimum valid bid is ₹${minimumRequired}.`,
    });
  }

  const previousBidder = auction.highestBidder
    ? { ...auction.highestBidder }
    : null;

  auction.currentBid = numericBid;
  auction.highestBidder = { socketId: socket.id, username };
  auction.bidHistory.unshift({
    bidder: username,
    amount: numericBid,
    timestamp: new Date().toLocaleTimeString(),
  });

  if (auction.timeRemainingSeconds <= 15) {
    auction.timeRemainingSeconds = 20;
    io.to(auction.id).emit("auction:extended", {
      message: "Anti-snipe triggered: +20 seconds added!",
      timeRemaining: auction.timeRemainingSeconds,
    });
  }

  io.to(auction.id).emit("bid:success", {
    currentBid: auction.currentBid,
    highestBidder: username,
    bidHistory: auction.bidHistory,
    timeRemaining: auction.timeRemainingSeconds,
  });

  if (previousBidder && previousBidder.socketId !== socket.id) {
    io.to(previousBidder.socketId).emit("bid:outbid", {
      message: `You were outbid by ${username} at ₹${numericBid}!`,
    });
  }

  return true;
}

module.exports = {
  createAuctionState,
  getAuctionSnapshot,
  handleBidPlacement,
};
