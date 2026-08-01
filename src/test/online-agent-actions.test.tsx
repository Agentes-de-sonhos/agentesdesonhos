import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

let currentUserId = "me";
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: currentUserId } }) }));

let status = "none";
const sendRequest = vi.fn();
const respondRequest = vi.fn();
vi.mock("@/hooks/useTradeConnect", () => ({
  useConnections: () => ({
    getConnectionStatus: () => status,
    getConnectionId: () => "conn-1",
    sendRequest,
    respondRequest,
    isSending: false,
  }),
}));

import { AgentActions } from "@/components/community-chat/OnlineAgentsStrip";

const agent = {
  user_id: "other",
  name: "Ana Souza",
  avatar_url: null,
  agency_name: null,
  city: null,
};

function setup(onMessage = vi.fn(), onViewProfile = vi.fn()) {
  render(<AgentActions agent={agent} onMessage={onMessage} onViewProfile={onViewProfile} />);
  return { onMessage, onViewProfile };
}

beforeEach(() => {
  navigate.mockClear();
  sendRequest.mockClear();
  respondRequest.mockClear();
  currentUserId = "me";
  status = "none";
});

describe("AgentActions (online users popover)", () => {
  it("dispatches the shared start-dm chat event and never navigates", () => {
    const dispatched: unknown[] = [];
    const listener = (e: Event) => dispatched.push((e as CustomEvent).detail);
    window.addEventListener("start-dm", listener);

    const { onMessage } = setup(() =>
      window.dispatchEvent(new CustomEvent("start-dm", { detail: agent }))
    );
    fireEvent.click(screen.getByRole("button", { name: /mensagem/i }));

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(dispatched).toEqual([agent]);
    expect(navigate).not.toHaveBeenCalled();
    window.removeEventListener("start-dm", listener);
  });

  it("keeps Ver perfil navigation callback working", () => {
    const { onViewProfile } = setup(vi.fn(), vi.fn());
    fireEvent.click(screen.getByRole("button", { name: /ver perfil/i }));
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it("sends a connection request when there is no connection", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /conectar/i }));
    expect(sendRequest).toHaveBeenCalledWith("other");
  });

  it("shows Solicitado disabled when a request is pending", () => {
    status = "pending_sent";
    setup();
    const btn = screen.getByRole("button", { name: /solicitado/i });
    expect(btn).toBeDisabled();
  });

  it("accepts an incoming request using the existing connection flow", () => {
    status = "pending_received";
    setup();
    fireEvent.click(screen.getByRole("button", { name: /aceitar/i }));
    expect(respondRequest).toHaveBeenCalledWith({ connectionId: "conn-1", accept: true });
  });

  it("shows Conectados disabled when already connected", () => {
    status = "accepted";
    setup();
    expect(screen.getByRole("button", { name: /conectados/i })).toBeDisabled();
  });

  it("renders no actions for the current user", () => {
    currentUserId = "other";
    setup();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
