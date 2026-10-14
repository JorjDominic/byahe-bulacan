import { getCommuteGuides, saveCommuteGuide, reportCommuteGuide } from "./commuteService";
import { getDocs, where, addDoc, updateDoc } from "firebase/firestore";
jest.mock("./firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(), doc: jest.fn(), query: jest.fn(), where: jest.fn(),
  getDocs: jest.fn(), addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(), serverTimestamp: jest.fn(),
}));
test("public guide queries restrict destination, published status and verification", async () => {
  getDocs.mockResolvedValue({ docs: [] });
  await getCommuteGuides("test-spot");
  expect(where).toHaveBeenCalledWith("spotId", "==", "test-spot");
  expect(where).toHaveBeenCalledWith("status", "==", "published");
  expect(where).toHaveBeenCalledWith("verified", "==", true);
});
test("saving an existing guide as a draft unpublishes it", async () => {
  updateDoc.mockResolvedValue(undefined);
  await saveCommuteGuide({ id: "guide-1", spotId: "spot-1", originLabel: "Test hub", verified: true, steps: [] }, false);
  expect(updateDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ status: "draft", verified: false }));
});
test("reports require a signed-in user and useful details", async () => {
  await expect(reportCommuteGuide("guide-1", "", "The boarding point has moved.")).rejects.toThrow("Log in");
  await expect(reportCommuteGuide("guide-1", "user-1", "bad")).rejects.toThrow("characters");
  expect(addDoc).not.toHaveBeenCalled();
});
test("new reports are created as open records for admin review", async () => {
  addDoc.mockResolvedValue({ id: "report-1" });
  await reportCommuteGuide("guide-1", "user-1", " The boarding point has moved. ");
  expect(addDoc).toHaveBeenCalledWith(undefined, expect.objectContaining({ guideId: "guide-1", userId: "user-1", status: "open", text: "The boarding point has moved." }));
});
