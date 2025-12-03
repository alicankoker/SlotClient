export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "693018ff3feb3605f54cb8e3" : new URLSearchParams(window.location.search).get("session") || undefined,
};
