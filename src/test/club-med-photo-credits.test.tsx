import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HotelGallery } from "@/components/hotel-page/HotelGallery";
import { getClubMedSnowPhotos } from "@/lib/clubMedSnow/photos";

afterEach(cleanup);
describe("créditos da galeria", () => {
  it("identifica a origem oficial Club Med sem atribuí-la ao Google", () => {
    render(<HotelGallery hotelName="Club Med" photos={getClubMedSnowPhotos("yabuli")} />);
    expect(screen.getByRole("link", { name: "Club Med" })).toHaveAttribute("href", "https://www.clubmed.com.br/r/yabuli/w");
    expect(screen.queryByText(/Fotos via Google Maps/)).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("photo-credit")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Ampliar foto 1" }));
    expect(screen.queryAllByTestId("photo-credit")).toHaveLength(0);
  });
  it("mantém o crédito Google nas galerias que ainda usam essa fonte", () => {
    render(<HotelGallery hotelName="Hotel" photos={[{ url: "https://example.com/photo.jpg", alt: "Hotel", credit: "Hotel · Google Maps", creditUrl: "https://maps.google.com/" }]} />);
    expect(screen.getByText(/Fotos via Google Maps/)).toBeInTheDocument();
  });
});
