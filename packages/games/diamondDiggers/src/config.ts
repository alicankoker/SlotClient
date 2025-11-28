export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "69280a9e31c5101497233896" : new URLSearchParams(window.location.search).get("session") || undefined,
};