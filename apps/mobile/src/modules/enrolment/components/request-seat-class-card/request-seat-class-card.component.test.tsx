import { render, screen } from "@testing-library/react-native";

import i18n from "@/i18n";

import { RequestSeatClassCard } from "./request-seat-class-card.component";
import type { RequestSeatClassCardProps } from "./request-seat-class-card.types";

const renderCard = (overrides: Partial<RequestSeatClassCardProps> = {}) =>
  render(
    <RequestSeatClassCard
      discipline="surf"
      level="beginner"
      startsAt="2026-09-16T12:00:00.000Z" // Wednesday, 09:00 in Fortaleza
      endsAt="2026-09-16T13:00:00.000Z" // 10:00
      locationName="Praia do Norte"
      {...overrides}
    />,
  );

afterEach(() => i18n.changeLanguage("en-US"));

describe("RequestSeatClassCard", () => {
  it("shows the chips, the day, the duration, the time range and the location", async () => {
    await renderCard();

    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("Wednesday")).toBeOnTheScreen();
    expect(screen.getByText("16 SEP")).toBeOnTheScreen();
    expect(screen.getByText("1 hour")).toBeOnTheScreen();
    expect(screen.getByText("09:00 – 10:00")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Norte")).toBeOnTheScreen();
  });

  it.each([
    ["2026-09-16T14:00:00.000Z", "2 hours"],
    ["2026-09-16T12:45:00.000Z", "45 minutes"],
    ["2026-09-16T13:30:00.000Z", "1 h 30 min"],
  ])("reads a class ending at %s as %s", async (endsAt, duration) => {
    await renderCard({ endsAt });

    expect(screen.getByText(duration)).toBeOnTheScreen();
  });

  it("shortens the weekday in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    await renderCard();

    expect(screen.getByText("Quarta")).toBeOnTheScreen();
    expect(screen.getByText("16 SET")).toBeOnTheScreen();
    expect(screen.getByText("1 hora")).toBeOnTheScreen();
  });
});
