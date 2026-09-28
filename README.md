# 🔨 Assignment 15: Real-Time Live Auction & Bidding Engine (Socket.io)

This project is a real-time live auction platform built with Node.js, Express.js, and Socket.io. It includes a server-authoritative bidding engine, live countdown timer, outbid notifications, and anti-snipe timer extension logic.

## Features

- Real-time auction room updates using Socket.io
- Validation for minimum bid increments
- Self-outbid protection
- Outbid alerts sent to previous highest bidder
- Server-side countdown timer
- Anti-snipe extension when bids come in at the final seconds
- Bid history tracking and viewer count
- Responsive trading floor UI

## Project Structure

```text
assignment-15-auction-socket/
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── sockets/
│   ├── auctionEngine.js
│   └── timerManager.js
├── server.js
├── package.json
└── README.md
```

## Installation

```bash
npm install
```

## Run Locally

```bash
npm start
```

Then open:

```text
http://localhost:5000
```

## Render Deployment

1. Push this project to GitHub.
2. In Render, create a new Web Service.
3. Connect the GitHub repository.
4. Set the root directory to the project folder if needed.
5. Use the following settings:
   - Build command: `npm install`
   - Start command: `npm start`
6. Add `PORT` if required, but Render sets it automatically.

## Notes

The app is designed to run as a single auction room. The default auction ID is `AUC_VINTAGE_99`.
