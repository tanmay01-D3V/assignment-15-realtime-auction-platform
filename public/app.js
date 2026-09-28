const socket = io();

const state = {
  auctionId: "AUC_VINTAGE_99",
  currentBid: 50000,
  highestBidder: null,
  timeRemaining: 60,
  username: "Vikram",
  joined: false,
};

const roomNameEl = document.getElementById("roomName");
const viewerCountEl = document.getElementById("viewerCount");
const timerDisplayEl = document.getElementById("timerDisplay");
const currentBidEl = document.getElementById("currentBid");
const highestBidderEl = document.getElementById("highestBidder");
const startingPriceEl = document.getElementById("startingPrice");
const incrementValueEl = document.getElementById("incrementValue");
const auctionDescriptionEl = document.getElementById("auctionDescription");
const timeRemainingEl = document.getElementById("timeRemaining");
const auctionTitleEl = document.getElementById("auctionTitle");
const auctionStatusEl = document.getElementById("auctionStatus");
const toastEl = document.getElementById("toast");
const bidHistoryEl = document.getElementById("bidHistory");
const joinBtn = document.getElementById("joinBtn");
const usernameInput = document.getElementById("usernameInput");

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function showToast(message, type = "info") {
  toastEl.textContent = message;
  toastEl.style.color =
    type === "error" ? "#ffadad" : type === "success" ? "#93f1c8" : "#fbbf24";
}

function renderHistory(history = []) {
  bidHistoryEl.innerHTML = "";

  if (!history.length) {
    const li = document.createElement("li");
    li.innerHTML = "<span>No bids yet</span><strong>₹50,000</strong>";
    bidHistoryEl.appendChild(li);
    return;
  }

  history.slice(0, 6).forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${entry.bidder} • ${entry.timestamp}</span>
      <strong>${formatPrice(entry.amount)}</strong>
    `;
    bidHistoryEl.appendChild(li);
  });
}

function renderAuction(item = null) {
  if (!item) return;

  state.currentBid = item.currentBid || state.currentBid;
  state.timeRemaining = item.timeRemainingSeconds || state.timeRemaining;
  state.highestBidder = item.highestBidder ? item.highestBidder.username : null;

  roomNameEl.textContent = item.id || state.auctionId;
  currentBidEl.textContent = formatPrice(state.currentBid);
  highestBidderEl.textContent = state.highestBidder || "Waiting for first bid";
  startingPriceEl.textContent = formatPrice(item.startingPrice || 50000);
  incrementValueEl.textContent = formatPrice(item.minIncrement || 2000);
  auctionDescriptionEl.textContent =
    item.description || "Original condition rare electric guitar";
  timeRemainingEl.textContent = `${state.timeRemaining}s`;
  timerDisplayEl.textContent = `${state.timeRemaining}s`;
  auctionTitleEl.textContent = item.title || "1967 Vintage Fender Stratocaster";

  if (item.status === "ended") {
    auctionStatusEl.textContent = "Ended";
    auctionStatusEl.className = "status-pill ended";
  } else {
    auctionStatusEl.textContent = "Live";
    auctionStatusEl.className = "status-pill live";
  }
}

function joinAuction() {
  const username = usernameInput.value.trim() || "Guest";
  state.username = username;
  socket.emit("auction:join", { auctionId: state.auctionId, username });
  state.joined = true;
  showToast(`Joined live auction as ${username}`);
}

joinBtn.addEventListener("click", joinAuction);
usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    joinAuction();
  }
});

document.querySelectorAll(".quick-bid").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.joined) {
      showToast("Join the auction first.", "error");
      return;
    }

    const increment = Number(button.dataset.amount || 2000);
    const amount = state.currentBid + increment;
    socket.emit("bid:place", { auctionId: state.auctionId, amount });
  });
});

socket.on("connect", () => {
  showToast("Connected to auction server");
});

socket.on("auction:init", ({ item, bidHistory, timeRemaining }) => {
  renderAuction(item);
  state.timeRemaining = timeRemaining || 60;
  renderHistory(bidHistory || []);
  showToast("Auction room synced successfully");
});

socket.on("auction:time_tick", ({ timeRemaining }) => {
  state.timeRemaining = timeRemaining;
  timeRemainingEl.textContent = `${timeRemaining}s`;
  timerDisplayEl.textContent = `${timeRemaining}s`;
});

socket.on("user:joined", ({ username, totalViewers }) => {
  viewerCountEl.textContent = totalViewers || 0;
  if (username && username !== "A bidder") {
    showToast(`${username} joined the auction floor`, "success");
  }
});

socket.on(
  "bid:success",
  ({ currentBid, highestBidder, bidHistory, timeRemaining }) => {
    state.currentBid = currentBid;
    state.highestBidder = highestBidder;
    state.timeRemaining = timeRemaining;
    currentBidEl.textContent = formatPrice(currentBid);
    highestBidderEl.textContent = highestBidder || "Waiting for first bid";
    timeRemainingEl.textContent = `${timeRemaining}s`;
    timerDisplayEl.textContent = `${timeRemaining}s`;
    renderHistory(bidHistory || []);
    showToast(`New leading bid: ${formatPrice(currentBid)}`, "success");
  },
);

socket.on("bid:outbid", ({ message }) => {
  showToast(message, "error");
});

socket.on("bid:rejected", ({ reason }) => {
  showToast(reason, "error");
});

socket.on("auction:extended", ({ message, timeRemaining }) => {
  state.timeRemaining = timeRemaining;
  timeRemainingEl.textContent = `${timeRemaining}s`;
  timerDisplayEl.textContent = `${timeRemaining}s`;
  showToast(message, "success");
});

socket.on("auction:sold", ({ winner, finalPrice, message }) => {
  auctionStatusEl.textContent = "Ended";
  auctionStatusEl.className = "status-pill ended";
  highestBidderEl.textContent = winner || "No bidder";
  currentBidEl.textContent = formatPrice(finalPrice);
  showToast(message, "success");
});

renderAuction({
  id: state.auctionId,
  title: "1967 Vintage Fender Stratocaster",
  description: "Original condition rare electric guitar",
  startingPrice: 50000,
  currentBid: 50000,
  minIncrement: 2000,
  timeRemainingSeconds: 60,
  status: "active",
});
renderHistory([]);
