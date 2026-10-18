import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { MapPoint } from "../../classes.types";

import { LocationMapPicker } from "./location-map-picker.component";

const SET: MapPoint = { latitude: -3.7442, longitude: -38.4617 };

const map = () => screen.getByTestId("location-map-picker");

function Harness({ initial, onChange }: { initial: MapPoint | null; onChange?: (p: MapPoint) => void }) {
  const [point, setPoint] = useState(initial);

  return (
    <LocationMapPicker
      point={point}
      onChange={(next) => {
        setPoint(next);
        onChange?.(next);
      }}
    />
  );
}

describe("LocationMapPicker", () => {
  it("opens on Fortaleza with no marker and asks to tap the map when there is no point", async () => {
    await render(<LocationMapPicker point={null} onChange={jest.fn()} />);

    expect(screen.getByText("Point on the map")).toBeTruthy();
    expect(screen.getByText("Tap the map to mark the point")).toBeTruthy();
    expect(map().props.region).toEqual({
      latitude: -3.7319,
      longitude: -38.5267,
      latitudeDelta: 0.2,
      longitudeDelta: 0.2,
    });
    expect(screen.queryByTestId("location-marker")).toBeNull();
  });

  it("opens on the point with a marker and the move hint", async () => {
    await render(<LocationMapPicker point={SET} onChange={jest.fn()} />);

    expect(screen.getByText("Tap to move the point")).toBeTruthy();
    expect(map().props.region).toMatchObject(SET);
    expect(screen.getByTestId("location-marker").props.coordinate).toEqual(SET);
  });

  it("reports a tap, marks it without recentring the map and changes the hint", async () => {
    const onChange = jest.fn();
    await render(<Harness initial={null} onChange={onChange} />);
    const tapped = { latitude: -3.8, longitude: -38.6 };

    await fireEvent(map(), "press", { nativeEvent: { coordinate: { ...tapped, extra: 1 } } });

    expect(onChange).toHaveBeenCalledWith(tapped);
    expect(screen.getByText("Tap to move the point")).toBeTruthy();
    expect(screen.getByTestId("location-marker").props.coordinate).toEqual(tapped);
    expect(map().props.region).toMatchObject({ latitude: -3.7319, longitude: -38.5267 });
  });

  it("recentres on a point that moved from outside, such as a picked suggestion", async () => {
    const { rerender } = await render(<LocationMapPicker point={null} onChange={jest.fn()} />);

    await rerender(<LocationMapPicker point={SET} onChange={jest.fn()} />);

    expect(map().props.region).toMatchObject(SET);
  });

  it("follows the region the user drags to", async () => {
    await render(<LocationMapPicker point={SET} onChange={jest.fn()} />);
    const dragged = { latitude: -3.9, longitude: -38.7, latitudeDelta: 0.05, longitudeDelta: 0.05 };

    await fireEvent(map(), "regionChangeComplete", dragged);

    expect(map().props.region).toEqual(dragged);
  });
});
