export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "69315b479b7696eb439e98f4" : new URLSearchParams(window.location.search).get("session") || undefined,
};
