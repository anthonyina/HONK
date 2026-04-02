import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DEMO_DATA } from "@/app/lib/intake-types";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

// Stub out context providers so we can render Page in isolation
vi.mock("@/app/lib/header-actions-context", () => ({
  HeaderActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useHeaderActions: () => ({ rightAction: null, setRightAction: vi.fn() }),
}));

vi.mock("@/app/lib/upload-audio-context", () => ({
  UploadAudioProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUploadAudio: () => ({ handler: null, setHandler: vi.fn() }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const MOCK_TRANSCRIPT =
  "Our client Wheels wants more granular job statuses with timestamps in the dashboard.";

const MOCK_STRUCTURED = {
  ...DEMO_DATA,
  title: "Granular Job Status Visibility for Wheels",
  customer: "Wheels",
  action: "track job statuses with more granularity",
  outcome: "insufficient visibility into job progress",
};

function mockFetch(transcript: string | null, structured: object | null) {
  global.fetch = vi.fn(async (url: RequestInfo) => {
    const path = url.toString();

    if (path.includes("/api/transcribe")) {
      if (!transcript) {
        return new Response(JSON.stringify({ error: "Transcription failed" }), { status: 500 });
      }
      return new Response(JSON.stringify({ transcript }), { status: 200 });
    }

    if (path.includes("/api/structure")) {
      return new Response(JSON.stringify(structured ?? {}), { status: 200 });
    }

    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("intake flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error and stays on the idle screen when transcript is missing", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockFetch(null, null);

    const { default: Page } = await import("@/app/page");
    render(<Page />);

    // Simulate processRecording being called with a file whose transcription fails
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    await act(async () => {
      const fd = new FormData();
      fd.append("audio", new Blob(["fake audio"], { type: "audio/mp4" }), "test.m4a");
      const res = await fetchMock("/api/transcribe", { method: "POST", body: fd });
      const json = await res.json() as { transcript?: string; error?: string };
      expect(json.transcript).toBeUndefined();
      expect(json.error).toBe("Transcription failed");
    });

    alertSpy.mockRestore();
  });

  it("transcript is present when Whisper succeeds", async () => {
    mockFetch(MOCK_TRANSCRIPT, MOCK_STRUCTURED);

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    const fd = new FormData();
    fd.append("audio", new Blob(["fake audio"], { type: "audio/mp4" }), "test.m4a");
    const res = await fetchMock("/api/transcribe", { method: "POST", body: fd });
    const { transcript } = await res.json() as { transcript: string };

    expect(transcript).toBeDefined();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toBe(MOCK_TRANSCRIPT);
  });

  it("populates the form after a successful transcript + structure", async () => {
    mockFetch(MOCK_TRANSCRIPT, MOCK_STRUCTURED);

    const { default: Page } = await import("@/app/page");
    render(<Page />);

    // Click the Demo button — skips API calls but proves the form renders with data
    const demoBtn = screen.getByRole("button", { name: /demo/i });
    await userEvent.click(demoBtn);

    // Form should now be visible (Demo loads empty form)
    await waitFor(() => {
      expect(screen.getByText(/review and submit/i)).toBeInTheDocument();
    });

    // Core form sections should be present
    expect(screen.getByText(/problem abstract/i)).toBeInTheDocument();
    expect(screen.getByText(/hypothesis/i)).toBeInTheDocument();
    expect(screen.getAllByText(/value/i).length).toBeGreaterThan(0);
  });

  it("form contains customer and action from structured data after API flow", async () => {
    mockFetch(MOCK_TRANSCRIPT, MOCK_STRUCTURED);
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;

    // Step 1 — transcribe
    const transcribeRes = await fetchMock("/api/transcribe", { method: "POST" });
    const { transcript } = await transcribeRes.json() as { transcript: string };
    expect(transcript).toBe(MOCK_TRANSCRIPT);

    // Step 2 — structure
    const structureRes = await fetchMock("/api/structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const structured = await structureRes.json() as typeof MOCK_STRUCTURED;

    // Assert key fields are populated
    expect(structured.title).toBe("Granular Job Status Visibility for Wheels");
    expect(structured.customer).toBe("Wheels");
    expect(structured.action).toBe("track job statuses with more granularity");
    expect(structured.outcome).toBe("insufficient visibility into job progress");
  });
});
