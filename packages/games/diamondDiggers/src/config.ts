export default {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || "https://rngengine.com",
    USER_ID: import.meta.env.DEV ? "6925c237fc5e7e66ae3d2018" : new URLSearchParams(window.location.search).get("session") || undefined,
};