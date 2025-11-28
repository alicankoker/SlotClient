export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "6929a273d9d7145667de141a" : new URLSearchParams(window.location.search).get("session") || undefined,
};