import { describe, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast as sonnerToast } from "sonner";
import { KanbanMaximizeProvider, useKanbanMaximize } from "@/components/crm/kanban/KanbanMaximizeContext";
import { KanbanMaximizeSurface } from "@/components/crm/kanban/KanbanMaximizeSurface";
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
function H() { const { toggle } = useKanbanMaximize(); return <KanbanMaximizeSurface><button onClick={toggle}>t</button></KanbanMaximizeSurface>; }
describe("dbg", () => { it("x", async () => {
  render(<><KanbanMaximizeProvider><H/></KanbanMaximizeProvider><Sonner/></>);
  act(() => { sonnerToast.error("oi"); });
  await new Promise(r => setTimeout(r, 50));
  act(() => { screen.getByText("t").click(); });
  await new Promise(r => setTimeout(r, 100));
  console.log(document.body.innerHTML.slice(0, 3000));
}); });
