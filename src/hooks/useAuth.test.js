import { act, renderHook } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";

const mockLogin = jest.fn();
const mockSetPremium = jest.fn();
jest.mock("../context/AppContext", () => ({ useApp: () => ({ login: mockLogin, setPremium: mockSetPremium, logout: jest.fn() }) }));
jest.mock("../services/firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));
jest.mock("firebase/firestore", () => ({ doc: jest.fn((db, collection, uid) => uid), getDoc: jest.fn(), onSnapshot: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  getDoc.mockResolvedValue({ exists: () => true, data: () => ({ name: "Traveler", isPremium: false }) });
});

test("receives a later Premium update without logging in or navigating again", async () => {
  const stopAuth = jest.fn(); const stopProfile = jest.fn();
  onAuthStateChanged.mockReturnValue(stopAuth); onSnapshot.mockReturnValue(stopProfile);
  const { result } = renderHook(() => useAuth());
  const stop = result.current.initAuthListener(jest.fn());
  const onAuth = onAuthStateChanged.mock.calls[0][1];
  await act(async () => { await onAuth({ uid: "user_1" }); });
  const receive = onSnapshot.mock.calls[0][1];
  act(() => receive({ exists: () => true, data: () => ({ isPremium: true }) }));
  expect(mockSetPremium).toHaveBeenLastCalledWith(true);
  expect(mockLogin).toHaveBeenCalledTimes(1);
  act(() => stop());
  expect(stopAuth).toHaveBeenCalled(); expect(stopProfile).toHaveBeenCalled();
  act(() => receive({ exists: () => true, data: () => ({ isPremium: false }) }));
  expect(mockSetPremium).toHaveBeenLastCalledWith(true);
});

test("sign-out removes the previous user's listener and clears Premium", async () => {
  const stopProfile = jest.fn();
  onAuthStateChanged.mockReturnValue(jest.fn()); onSnapshot.mockReturnValue(stopProfile);
  const { result } = renderHook(() => useAuth());
  result.current.initAuthListener();
  const onAuth = onAuthStateChanged.mock.calls[0][1];
  await act(async () => { await onAuth({ uid: "user_1" }); });
  const oldReceive = onSnapshot.mock.calls[0][1];
  await act(async () => { await onAuth(null); });
  expect(stopProfile).toHaveBeenCalled();
  act(() => oldReceive({ exists: () => true, data: () => ({ isPremium: true }) }));
  expect(mockSetPremium).toHaveBeenLastCalledWith(false);
});
