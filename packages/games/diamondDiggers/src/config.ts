export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "691b0d687091760bfa79b79e" : new URLSearchParams(window.location.search).get("session") || undefined,
};