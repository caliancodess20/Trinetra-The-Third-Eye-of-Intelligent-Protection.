const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// 1. CROSS-TEMPLE BOOKING ENGINE
exports.validateCircuitBooking = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const booking = event.data?.data();
  if (!booking || !booking.circuit) return;

  const TRAVEL_TIME_MATRIX = { "temple_1-temple_2": 30, "temple_2-temple_3": 45, "temple_3-temple_4": 30 };
  let isFeasible = true;

  for (let i = 0; i < booking.circuit.length - 1; i++) {
    const current = booking.circuit[i];
    const next = booking.circuit[i + 1];
    const pairKey = `${current.templeId}-${next.templeId}`;
    const diffMinutes = (new Date(next.timeSlot) - new Date(current.timeSlot)) / (1000 * 60);

    if (TRAVEL_TIME_MATRIX[pairKey] && diffMinutes < TRAVEL_TIME_MATRIX[pairKey]) {
      isFeasible = false;
      break;
    }
  }

  await event.data.ref.update({
    isValid: isFeasible,
    warning: isFeasible ? null : "WARNING: Insufficient travel time between scheduled temples.",
  });
});

// 2. BORROWED BANDHANI STOLE LIFECYCLE
exports.handleStoleScan = onDocumentCreated("stole_scans/{scanId}", async (event) => {
  const scan = event.data?.data();
  if (!scan) return;

  const { stoleId, bookingId, isFirstStop, isLastStop } = scan;

  if (isFirstStop) {
    await db.collection("stoles").doc(stoleId).set({ status: "IN_USE", activeBooking: bookingId });
  }

  if (isLastStop) {
    await db.collection("stoles").doc(stoleId).set({ status: "AVAILABLE", activeBooking: null });
    
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    await db.collection("keepsakes").doc(bookingId).set({
      bookingId,
      printedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: bookingDoc.exists ? bookingDoc.data() : {},
    });
  }
});

// 3. ROLE-BASED ACCESS CONTROL (RBAC)
exports.assignUserRole = onDocumentCreated("users/{userId}", async (event) => {
  const user = event.data?.data();
  if (!user || user.role) return;

  const email = user.email || "";
  let role = "pilgrim";
  if (email.includes("staff")) role = "staff";
  if (email.includes("emergency")) role = "emergency";

  await event.data.ref.update({ role });
});

// 4 & 5. NEURALWATCH SURGE VELOCITY & FESTIVAL CALENDAR LAYER
exports.monitorSurgeVelocity = onDocumentCreated("gate_scans/{scanId}", async (event) => {
  const scan = event.data?.data();
  if (!scan) return;

  const { templeId, timestamp } = scan;
  const now = timestamp ? new Date(timestamp) : new Date();
  const threeMinsAgo = new Date(now.getTime() - 3 * 60 * 1000);

  const dateKey = now.toISOString().split("T")[0];
  const festivalDoc = await db.collection("festival_calendar").doc(dateKey).get();
  
  const velocityThreshold = (festivalDoc.exists && festivalDoc.data().isHighSurge) ? 100 : 150;

  const recentScans = await db.collection("gate_scans")
    .where("templeId", "==", templeId)
    .where("timestamp", ">=", threeMinsAgo)
    .get();

  if (recentScans.size >= velocityThreshold) {
    await rtdb.ref(`live_alerts/${templeId}`).set({
      templeId,
      currentVelocity: recentScans.size,
      status: "HIGH_VELOCITY_SURGE",
      festivalActive: festivalDoc.exists,
      alertTime: Date.now(),
    });
  }
});