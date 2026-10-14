import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CommuteHelper from "./CommuteHelper";
import { getCommuteGuides, reportCommuteGuide } from "../services/commuteService";
import { useApp } from "../context/AppContext";
jest.mock("../services/commuteService", () => ({ getCommuteGuides: jest.fn(), reportCommuteGuide: jest.fn() }));
jest.mock("../context/AppContext", () => ({ useApp: jest.fn() }));
jest.mock("./DestinationMap", () => () => <div>Guide map</div>);
const destination = { id: "test", name: "Test destination" };
const guide = { id: "guide-1", originLabel: "Test hub", lastVerifiedDate: "2026-10-14", source: "Operator confirmation", fareMin: 20, fareMax: 40, arrivalInstructions: "Walk to the main entrance.", steps: [{ mode: "jeepney", instruction: "Ride the checked route.", boardAt: "Test terminal", alightAt: "Test landmark", signboard: "Test signboard", landmark: "Blue gate" }] };
beforeEach(() => { useApp.mockReturnValue({ userId: "user-1", showToast: jest.fn() }); });

test("verified local guide exposes vehicle, boarding, alighting and final walking directions", async () => {
  getCommuteGuides.mockResolvedValue([guide]);
  render(<CommuteHelper destination={destination} onUseOrigin={jest.fn()} />);
  expect(await screen.findByText("Test signboard")).toBeInTheDocument();
  expect(screen.getByText("Test terminal")).toBeInTheDocument();
  expect(screen.getByText("Test landmark")).toBeInTheDocument();
  expect(screen.getByText("Walk to the main entrance.")).toBeInTheDocument();
});
test("missing local data is reported honestly", async () => {
  getCommuteGuides.mockResolvedValue([]);
  render(<CommuteHelper destination={destination} onUseOrigin={jest.fn()} />);
  expect(await screen.findByText(/No verified local commuting guide/)).toBeInTheDocument();
});
test("fetch failures are distinct from missing guides and can be retried", async () => {
  getCommuteGuides.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([guide]);
  render(<CommuteHelper destination={destination} onUseOrigin={jest.fn()} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Test terminal")).toBeInTheDocument();
});
test("reports reference the selected guide and current user", async () => {
  getCommuteGuides.mockResolvedValue([guide]); reportCommuteGuide.mockResolvedValue(undefined);
  render(<CommuteHelper destination={destination} onUseOrigin={jest.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Report outdated instructions" }));
  fireEvent.change(screen.getByLabelText("What needs updating?"), { target: { value: "The boarding point has moved." } });
  fireEvent.click(screen.getByRole("button", { name: "Send report" }));
  await waitFor(() => expect(reportCommuteGuide).toHaveBeenCalledWith("guide-1", "user-1", "The boarding point has moved."));
});
