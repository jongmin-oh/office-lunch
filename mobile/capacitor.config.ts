import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.genon.officelunch",
  appName: "점심 뭐먹Gen",
  webDir: "dist",
  plugins: {
    // Native fetch bypasses CORS; Lambda Function URL CORS rejects capacitor://localhost
    CapacitorHttp: { enabled: true },
    SystemBars: { insetsHandling: "css", style: "LIGHT" },
    SocialLogin: {
      providers: {
        google: true,
        apple: false,
        facebook: false,
        twitter: false,
      },
    },
  },
};
export default config;
