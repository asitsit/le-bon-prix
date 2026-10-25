import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  redirects: {
    // Ancienne page "Voir les prix" : la liste complète est désormais la page d'accueil
    "/produits": "/",
  },
});
