import type { configuracion as configuracionEs } from "../es/configuracion";

export const configuracion: typeof configuracionEs = {
  eyebrow: "Administration",
  title: "Settings",
  subtitle: "Global settings for the academic term",
  loading: "Loading…",
  servicesStatus: {
    title: "Service status",
    ready: "Ready",
    pending: "Pending",
    unavailable: "Could not check backend diagnostics.",
  },
  zoomLink: {
    title: "Term Zoom link",
    description: "This link is shared for the whole term. All roles see it on the course screen.",
    urlLabel: "Zoom meeting URL",
    saveButton: "Save link",
    saving: "Saving…",
    testLink: "Test link",
    saveSuccess: "Link saved successfully.",
    saveError: "Error saving. Check the link.",
  },
};
