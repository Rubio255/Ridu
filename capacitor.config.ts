import type { CapacitorConfig } from "@capacitor/cli";

// iOS programėlė „Ridu“: viena visiems (klientams, vairuotojams, MB). Programėlė atidaro gyvą
// svetainę, todėl kiekvienas svetainės atnaujinimas iškart matomas ir programėlėje.
// Pakeitus domeną (pvz. ridu.lt), pakeiskite RIDU_URL ir adresą mobile/www/offline.html, tada išleiskite naują versiją.
// Svarbu: Vercel Deployment Protection turi saugoti tik preview, kitaip programėlė rodo „Nėra ryšio“.
const RIDU_URL = process.env.RIDU_APP_URL ?? "https://ridu-aleksandras255.vercel.app";

const config: CapacitorConfig = {
  appId: "lt.ridu.app",
  appName: "Ridu",
  webDir: "mobile/www", // atsarginis puslapis, kai nėra interneto
  server: { url: RIDU_URL, cleartext: false, errorPath: "offline.html" },
  ios: { contentInset: "automatic", scheme: "Ridu", limitsNavigationsToAppBoundDomains: false },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: { launchShowDuration: 800, backgroundColor: "#0f4c45", showSpinner: false },
  },
};

export default config;
