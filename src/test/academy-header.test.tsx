import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AcademyCollapsibleCard } from "@/components/dashboard/AcademyCollapsibleCard";
import { AuthProvider } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("AcademyCollapsibleCard header", () => {
  it("renders title, link and subtitle in the expected structure", () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AcademyCollapsibleCard />
          </QueryClientProvider>
        </AuthProvider>
      </BrowserRouter>
    );

    const title = screen.getByRole("heading", { name: /EducaTravel Academy/i });
    const links = screen.getAllByRole("button", { name: /Ver todos os treinamentos/i });
    const link = links[0];
    const subtitle = screen.getByText(/Explore trilhas rápidas/i);

    // Title and link should be in the same flex row
    const row = title.closest("div.flex");
    expect(row).toContainElement(link);

    // Subtitle should be in a sibling container below the row
    const subtitleContainer = subtitle.closest("div.space-y-3");
    expect(subtitleContainer).toContainElement(title.closest("div.flex"));
    expect(subtitleContainer).toContainElement(subtitle);
  });
});
