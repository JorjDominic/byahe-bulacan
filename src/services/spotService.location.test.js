import { addSpot, updateSpot } from "./spotService";
import { addDoc, updateDoc, collection, doc, serverTimestamp } from "firebase/firestore";

jest.mock("./firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "spots"), doc: jest.fn(() => "spot-document"),
  serverTimestamp: jest.fn(() => "timestamp"),
  addDoc: jest.fn(async () => ({ id: "new-spot" })), updateDoc: jest.fn(async () => {}),
}));

const form = { name: "Test spot", municipality: "Malolos", category: "Historical Site", fee: "Free", lat: "", lng: "" };
beforeEach(() => {
  collection.mockReturnValue("spots");
  doc.mockReturnValue("spot-document");
  serverTimestamp.mockReturnValue("timestamp");
  addDoc.mockResolvedValue({ id: "new-spot" });
  updateDoc.mockResolvedValue(undefined);
});

test("creating a destination with unknown coordinates stores null", async () => {
  await addSpot(form);
  expect(addDoc).toHaveBeenCalledWith("spots", expect.objectContaining({ lat: null, lng: null, locationVerified: false }));
});

test("updates store numeric coordinates and verified entrance metadata", async () => {
  await updateSpot("spot-1", { ...form, lat: "14.856", lng: "120.811", locationVerified: true, locationType: "entrance" });
  expect(updateDoc).toHaveBeenCalledWith("spot-document", expect.objectContaining({ lat: 14.856, lng: 120.811, locationVerified: true, locationType: "entrance" }));
});

test("invalid coordinates never reach Firestore", async () => {
  await expect(addSpot({ ...form, lat: "oops", lng: 120 })).rejects.toThrow();
  await expect(updateSpot("spot-1", { ...form, lat: 14, lng: "" })).rejects.toThrow();
  expect(addDoc).not.toHaveBeenCalled();
  expect(updateDoc).not.toHaveBeenCalled();
});
