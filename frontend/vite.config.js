import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    base: 'https://github.com/SantoshLalbihariThakur546/SLBT-Supply-Co.',
  },
});
