import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColorTheme } from "@/lib/hooks/use-color-theme";

const store: Record<string, string> = {};

beforeAll(() => {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  });
});

describe("useColorTheme", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.spyOn(document.documentElement, "setAttribute").mockImplementation(() => {});
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("defaults to classique", () => {
    const { result } = renderHook(() => useColorTheme());
    expect(result.current.colorTheme).toBe("classique");
  });

  it("toggles to sobre", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(result.current.colorTheme).toBe("sobre");
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(store["color-theme"]).toBe("sobre");
  });
});
