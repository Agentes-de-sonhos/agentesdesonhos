import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useCommunityNotifications } from "@/hooks/useCommunityNotifications";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

const calls = vi.hoisted(() => ({ filter: vi.fn(), select: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({user: {id: "auth-user"}}) }));
vi.mock("@/components/community/CommunitySearchOverlay", () => ({ CommunitySearchOverlay: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => ({ select: (fields: string) => {
  calls.select(fields);
  if (table === "community_notifications") return { order: () => ({ limit: async () => ({data: [{id: "n", actor_id: "auth-user", type: "mention"}], error: null}) }) };
  return { in: async (key: string, ids: string[]) => { calls.filter(key, ids); return {data: key === "user_id" ? [{user_id: "auth-user", id: "profile-id", name: "Ana Silva"}] : []}; }, eq: (key: string, id: string) => ({maybeSingle: async () => { calls.filter(key, id); return {data: key === "user_id" ? {name: "Ana Silva", avatar_url: "https://example.com/avatar.png"} : null}; }}) };
} }) } }));
function wrapper({children}: {children: React.ReactNode}) { return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>; }
afterEach(cleanup);
describe("community auth user identity", () => {
  it("resolves actors through profiles.user_id", async () => {
    const {result} = renderHook(() => useCommunityNotifications(), {wrapper});
    await waitFor(() => expect(result.current.data?.[0].actor_name).toBe("Ana Silva"));
    expect(calls.filter).toHaveBeenCalledWith("user_id", ["auth-user"]);
  });
  it("loads the mobile profile using auth rather than profile id", async () => {
    render(<MobileTopBar/>, {wrapper});
    await waitFor(() => expect(screen.getByText("AS")).toBeInTheDocument());
    expect(calls.filter).toHaveBeenCalledWith("user_id", "auth-user");
    expect(calls.select).toHaveBeenCalledWith("name, avatar_url");
  });
});
