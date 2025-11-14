export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "690e208ccf23c2819ca80bc6" : new URLSearchParams(window.location.search).get("session") || undefined,
};