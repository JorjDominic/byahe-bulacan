import { fireEvent, render, screen } from "@testing-library/react";
import CommuteAdmin from "./CommuteAdmin";
import { getAllCommuteGuides, getCommuteReports, saveCommuteGuide, resolveCommuteReport } from "../services/commuteService";
jest.mock("../services/commuteService", () => ({ getAllCommuteGuides: jest.fn(), getCommuteReports: jest.fn(), saveCommuteGuide: jest.fn(), deleteCommuteGuide: jest.fn(), resolveCommuteReport: jest.fn() }));
jest.mock("./DestinationMap", () => () => <div>Pin picker</div>);
beforeEach(() => { getAllCommuteGuides.mockResolvedValue([]); getCommuteReports.mockResolvedValue([]); });

test("publishing incomplete commuting instructions is blocked before saving", async () => {
  render(<CommuteAdmin spots={[{ id: "test", name: "Test spot" }]} />);
  await screen.findByText("No guides yet.");
  fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "test" } });
  fireEvent.change(screen.getByLabelText("Starting hub / terminal (include municipality)"), { target: { value: "Test terminal" } });
  fireEvent.click(screen.getByRole("button", { name: "Publish verified guide" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Publishing requires");
  expect(saveCommuteGuide).not.toHaveBeenCalled();
});
test("unfinished instructions can be saved as private drafts", async () => {
  saveCommuteGuide.mockResolvedValue({ id: "draft-1", spotId: "test", originLabel: "Test terminal", status: "draft" });
  render(<CommuteAdmin spots={[{ id: "test", name: "Test spot" }]} />);
  await screen.findByText("No guides yet.");
  fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "test" } });
  fireEvent.change(screen.getByLabelText("Starting hub / terminal (include municipality)"), { target: { value: "Test terminal" } });
  fireEvent.click(screen.getByRole("button", { name: "Save draft / unpublish" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Draft saved");
  expect(saveCommuteGuide).toHaveBeenCalledWith(expect.objectContaining({ originLabel: "Test terminal", verified: false }), false);
});
test("changing a verified guide invalidates its confirmation", async () => {
  render(<CommuteAdmin spots={[]} />);
  await screen.findByText("No guides yet.");
  const confirmation = screen.getByRole("checkbox");
  fireEvent.click(confirmation); expect(confirmation).toBeChecked();
  fireEvent.change(screen.getByLabelText("Where to board"), { target: { value: "New terminal" } });
  expect(confirmation).not.toBeChecked();
});
test("admin can review and resolve reported guide issues", async () => {
  getCommuteReports.mockResolvedValue([{ id: "report-1", guideId: "guide-1", text: "Boarding point has moved" }]);
  resolveCommuteReport.mockResolvedValue(undefined);
  render(<CommuteAdmin spots={[]} />);
  await screen.findByText("Boarding point has moved");
  fireEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
  await screen.findByText("No open reports.");
  expect(resolveCommuteReport).toHaveBeenCalledWith("report-1");
});
