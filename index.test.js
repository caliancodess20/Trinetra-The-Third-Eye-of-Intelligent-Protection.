process.env.FIREBASE_DATABASE_EMULATOR_HOST = "127.0.0.1:9000";

const fft = require("firebase-functions-test")({
  databaseURL: "https://demo-trinetra-default-rtdb.firebaseio.com",
  projectId: "demo-trinetra",
});

const myFunctions = require("./index.js");

describe("Trinetra Backend Complete Test Suite", () => {
  afterAll(() => {
    fft.cleanup();
  });

  it("assignUserRole executes cleanly", async () => {
    const wrapped = fft.wrap(myFunctions.assignUserRole);
    const snap = fft.firestore.makeDocumentSnapshot(
      { email: "emergency_unit@temple.org" },
      "users/user_test"
    );
    await expect(wrapped(snap)).resolves.not.toThrow();
  });

  it("validateCircuitBooking processes booking data", async () => {
    const wrapped = fft.wrap(myFunctions.validateCircuitBooking);
    const snap = fft.firestore.makeDocumentSnapshot(
      { templeId: "T1", travelTimeMinutes: 20 },
      "bookings/booking_test"
    );
    await expect(wrapped(snap)).resolves.not.toThrow();
  });

  it("monitorSurgeVelocity processes gate scan events", async () => {
    const wrapped = fft.wrap(myFunctions.monitorSurgeVelocity);
    const snap = fft.firestore.makeDocumentSnapshot(
      { templeId: "T1", timestamp: Date.now() },
      "gate_scans/scan_test"
    );
    await expect(wrapped(snap)).resolves.not.toThrow();
  });

  it("handleStoleScan processes stole scan events", async () => {
    const wrapped = fft.wrap(myFunctions.handleStoleScan);
    const snap = fft.firestore.makeDocumentSnapshot(
      { stoleId: "STOLE_001", status: "VALID" },
      "stole_scans/stole_test"
    );
    await expect(wrapped(snap)).resolves.not.toThrow();
  });
});

