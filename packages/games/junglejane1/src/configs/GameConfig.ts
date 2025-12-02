export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "692ec9f6b233aba78406c282" : new URLSearchParams(window.location.search).get("session") || undefined,
};
