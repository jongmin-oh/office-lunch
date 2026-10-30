import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Capacitor, SystemBars } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { NativeLifecycle } from "@/app/NativeLifecycle";
import { tokenStorage } from "@/lib/token";

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(), getPlatform: vi.fn() },
  SystemBars: { setStyle: vi.fn() },
  SystemBarsStyle: { Light: "LIGHT" },
}));
vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn(), exitApp: vi.fn() },
}));
vi.mock("@aparajita/capacitor-secure-storage", () => ({
  SecureStorage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));
let back: (event: { canGoBack: boolean }) => void;
const remove = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
  vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
  vi.mocked(App.addListener).mockImplementation(async (_event, callback) => {
    back = callback;
    return { remove };
  });
});
test("web credentials stay in sessionStorage, never the native plugin", async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  await tokenStorage.set("web-token");
  expect(await tokenStorage.get()).toBe("web-token");
  await tokenStorage.remove();
  expect(await tokenStorage.get()).toBeNull();
  expect(SecureStorage.set).not.toHaveBeenCalled();
});
test("native credentials use the secure store", async () => {
  vi.mocked(SecureStorage.get).mockResolvedValue("native-token");
  await tokenStorage.set("native-token");
  expect(await tokenStorage.get()).toBe("native-token");
  await tokenStorage.remove();
  expect(SecureStorage.set).toHaveBeenCalledWith(
    "access_token",
    "native-token",
  );
  expect(SecureStorage.remove).toHaveBeenCalledWith("access_token");
  expect(sessionStorage.length).toBe(0);
});
test("web does not register native listeners", () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  render(
    <MemoryRouter>
      <NativeLifecycle />
    </MemoryRouter>,
  );
  expect(App.addListener).not.toHaveBeenCalled();
  expect(SystemBars.setStyle).not.toHaveBeenCalled();
});
test("Android back closes an open dialog before leaving the app", () => {
  render(
    <MemoryRouter>
      <NativeLifecycle />
      <dialog open aria-label="추가" />
    </MemoryRouter>,
  );
  const dialog = screen.getByRole("dialog");
  back({ canGoBack: false });
  expect(dialog).not.toHaveAttribute("open");
  expect(App.exitApp).not.toHaveBeenCalled();
});
test("Android back navigates within the app and removes its listener", async () => {
  window.history.replaceState({ idx: 1 }, "");
  const view = render(
    <MemoryRouter initialEntries={["/", "/my"]} initialIndex={1}>
      <NativeLifecycle />
      <Routes>
        <Route path="/" element={<p>홈 화면</p>} />
        <Route path="/my" element={<p>내 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const { act } = await import("@testing-library/react");
  act(() => back({ canGoBack: true }));
  expect(screen.getByText("홈 화면")).toBeVisible();
  expect(App.exitApp).not.toHaveBeenCalled();
  view.unmount();
  await waitFor(() => expect(remove).toHaveBeenCalled());
});
test("Android back at app root exits even with external browser history", () => {
  window.history.replaceState({ idx: 0 }, "");
  render(
    <MemoryRouter>
      <NativeLifecycle />
    </MemoryRouter>,
  );
  back({ canGoBack: true });
  expect(App.exitApp).toHaveBeenCalledOnce();
});
