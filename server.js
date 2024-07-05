const fs = require("fs");
const https = require("https");
const express = require("express");
const socketio = require("socket.io");

const app = express();
app.use(express.static(__dirname));

const key = fs.readFileSync("cert.key");
const cert = fs.readFileSync("cert.crt");

const expressServer = https.createServer({ key, cert }, app);

const io = socketio(expressServer, {
  cors: {
    origin: ["https://localhost"],
    methods: ["GET", "POST"],
  },
});
expressServer.listen(8181);

const offers = [];

const connectedSockets = [];

io.on("connection", (socket) => {
  const username = socket.handshake.auth.username;
  const password = socket.handshake.auth.password;

  if (password !== "asjfasj") {
    socket.disconnect(true);
    return;
  }

  connectedSockets.push({
    socketId: socket.id,
    username,
  });

  if (offers.length) {
    socket.emit("availableOffers", offers);
  }

  socket.on("newOffer", (newOffer) => {
    offers.push({ offererUsername: username, offer: newOffer, offerIceCandidates: [], answererUsername: null, answer: null, answererIceCandidates: [] });

    socket.broadcast.emit("newOfferAwaiting", offers.slice(-1));
  });

  socket.on("newAnswer", (offerObj, ackFunction) => {
    console.log(offerObj);

    const socketToAnswer = connectedSockets.find((s) => s.username === offerObj.offererUsername);

    if (!socketToAnswer) {
      console.log("No matching socket");
      return;
    }

    const socketIdToAnswer = socketToAnswer.socketId;

    const offerToUpdate = offers.find((o) => o.offererUsername === offerObj.offererUsername);
    if (!offerToUpdate) {
      console.log("No offer to update");
      return;
    }

    ackFunction(offerToUpdate.offerIceCandidates);
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUsername = username;

    socket.to(socketIdToAnswer).emit("answerResponse", offerToUpdate);
  });

  socket.on("sendIceCandidateToSignalingServer", (iceCandidateObj) => {
    const { didIOffer, iceUsername, iceCandidate } = iceCandidateObj;

    if (didIOffer) {
      const offerInOffers = offers.find((o) => o.offererUsername === iceUsername);

      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);

        if (offerInOffers.answererUsername) {
          const socketToSendTo = connectedSockets.find((s) => s.username === offerInOffers.answererUsername);

          if (socketToSendTo) {
            socket.to(socketToSendTo.socketId).emit("receivedIceCandidateFromServer", iceCandidate);
          } else {
            console.log("Ice candidate recieved but could not find answerer");
          }
        }
      }
    } else {
      const offerInOffers = offers.find((o) => o.answererUsername === iceUsername);
      const socketToSendTo = connectedSockets.find((s) => s.username === offerInOffers.offererUsername);

      if (socketToSendTo) {
        socket.to(socketToSendTo.socketId).emit("receivedIceCandidatesFromServer", iceCandidate);
      } else {
        console.log("Ice candidate received but could not find offerer");
      }
    }
  });
});
