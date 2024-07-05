socket.on("availableOffers", (offers) => {
  console.log(offers);
  createOffersBtn(offers);
});

socket.on("newOfferAwaiting", (offers) => {
  createOffersBtn(offers);
});

socket.on("answerResponse", (offerObj) => {
  console.log(offerObj);
  addAnswer(offerObj);
});

socket.on("receivedIceCandidateFromServer", (iceCandidate) => {
  addNewIceCandidate(iceCandidate);
  console.log(iceCandidate);
});

function createOffersBtn(offers) {
  const answerE1 = document.getElementById("answer");

  offers.foreach((o) => {
    console.log(o);
    const newOfferE1 = document.createElement("div");
    newOfferE1.innerHTML = `<button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Answer ${o.offererUserName}</button>`;
    newOfferE1.addEventListener("click", () => answerOffer(o));
    answerE1.appendChild(newOfferE1);
  });
}
