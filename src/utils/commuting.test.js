import { normalizeCommuteGuide, guideNeedsReview } from "./commuting";
const complete = () => ({ spotId: "test-spot", originLabel: "Test hub", verified: true, source: "Operator confirmation", lastVerifiedDate: "2026-10-14", arrivalInstructions: "Walk to the confirmed entrance.", fareMin: "20", fareMax: "40", steps: [{ mode: "jeepney", instruction: "Take the verified route.", signboard: "Test route", boardAt: "Test terminal", alightAt: "Test landmark" }] });
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-14T04:00:00Z")); });
afterEach(() => jest.useRealTimers());

test("published guides normalize verified transport instructions and fares", () => {
  expect(normalizeCommuteGuide(complete(), true)).toMatchObject({ status: "published", verified: true, fareMin: 20, fareMax: 40, steps: [expect.objectContaining({ boardAt: "Test terminal", alightAt: "Test landmark", lat: null, lng: null })] });
});
test("drafts cannot appear verified even if the checkbox was checked", () => {
  expect(normalizeCommuteGuide(complete(), false)).toMatchObject({ status: "draft", verified: false });
});
test.each([
  { verified: false }, { source: "" }, { arrivalInstructions: "" }, { lastVerifiedDate: "2026-10-15" }, { lastVerifiedDate: "2026-02-31" }, { steps: [] }, { fareMin: -1 }, { fareMax: "" }, { fareMax: 10 },
])("incomplete or invalid guides cannot be published: %j", (change) => {
  expect(() => normalizeCommuteGuide({ ...complete(), ...change }, true)).toThrow();
});
test("transport steps require boarding, vehicle and alighting information", () => {
  const guide = complete(); guide.steps[0].boardAt = "";
  expect(() => normalizeCommuteGuide(guide, true)).toThrow("boarding");
});
test("walking connections do not require a vehicle signboard", () => {
  const guide = complete(); guide.steps.push({ mode: "walk", instruction: "Walk to the entrance." });
  expect(normalizeCommuteGuide(guide, true).steps).toHaveLength(2);
});
test("old guide dates are marked for review", () => {
  expect(guideNeedsReview("2026-01-01")).toBe(true);
  expect(guideNeedsReview("2026-10-14")).toBe(false);
});
