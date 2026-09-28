function startAuctionTimer(io, auction) {
  if (auction.timerId) {
    clearInterval(auction.timerId);
  }

  auction.timerId = setInterval(() => {
    if (!auction || auction.status !== "active") {
      return;
    }

    auction.timeRemainingSeconds -= 1;

    io.to(auction.id).emit("auction:time_tick", {
      auctionId: auction.id,
      timeRemaining: auction.timeRemainingSeconds,
    });

    if (auction.timeRemainingSeconds <= 0) {
      finishAuction(io, auction);
    }
  }, 1000);
}

function finishAuction(io, auction) {
  if (auction.timerId) {
    clearInterval(auction.timerId);
    auction.timerId = null;
  }

  auction.status = "ended";

  const winner = auction.highestBidder
    ? auction.highestBidder.username
    : "No bidder";
  const finalPrice = auction.currentBid || auction.startingPrice;

  io.to(auction.id).emit("auction:sold", {
    winner,
    finalPrice,
    status: "sold",
    message:
      winner === "No bidder"
        ? "Auction ended without bids."
        : `${winner} wins the auction at ₹${finalPrice}.`,
  });
}

module.exports = {
  startAuctionTimer,
  finishAuction,
};
