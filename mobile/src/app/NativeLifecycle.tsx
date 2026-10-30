import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { App } from "@capacitor/app";

export function NativeLifecycle() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void SystemBars.setStyle({ style: SystemBarsStyle.Light });
    if (Capacitor.getPlatform() !== "android") return;
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (dialog) {
        dialog.close();
        return;
      }
      // React Router's index excludes history entries from outside the app.
      if (canGoBack && window.history.state?.idx > 0) navigate(-1);
      else void App.exitApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [navigate]);
  return null;
}
