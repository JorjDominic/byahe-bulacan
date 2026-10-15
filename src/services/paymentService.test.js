import { httpsCallable } from "firebase/functions";
import { onSnapshot } from "firebase/firestore";
import { startPremiumCheckout, waitForPremiumAccess } from "./paymentService";

jest.mock("./firebase", () => ({ db: {}, functions: {} }));
jest.mock("firebase/functions", () => ({ httpsCallable: jest.fn() }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn(), onSnapshot: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test("checkout calls Firebase without trusting a client-provided user ID", async () => {
  const create = jest.fn().mockResolvedValue({ data: { checkoutUrl: "https://checkout.paymongo.com/test" } });
  httpsCallable.mockReturnValue(create);
  expect(await startPremiumCheckout()).toBe("https://checkout.paymongo.com/test");
  expect(httpsCallable).toHaveBeenCalledWith({}, "createPremiumCheckout");
  expect(create).toHaveBeenCalledWith();
});
test("an immediately verified profile releases the subscription and timer", async () => {
  const stop = jest.fn();
  onSnapshot.mockImplementation((ref, receive) => {
    receive({ data: () => ({ isPremium: true }) }); return stop;
  });
  expect(await waitForPremiumAccess("user")).toBe(true);
  expect(stop).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});
test("timeout and read failures release the subscription without granting access", async () => {
  const stop = jest.fn(); onSnapshot.mockReturnValue(stop);
  const waiting = waitForPremiumAccess("user", 100);
  jest.advanceTimersByTime(100);
  expect(await waiting).toBe(false); expect(stop).toHaveBeenCalledTimes(1);
  const error = new Error("permission denied");
  onSnapshot.mockImplementation((ref, receive, fail) => { fail(error); return stop; });
  await expect(waitForPremiumAccess("user")).rejects.toThrow("permission denied");
  expect(jest.getTimerCount()).toBe(0);
});
