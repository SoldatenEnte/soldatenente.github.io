// src/utils/assetUrl.ts
export const asset = (path: string) => {
    // Remove leading slash from the path if it exists,
    // as BASE_URL already has a trailing slash.
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${import.meta.env.BASE_URL}${cleanPath}`;
};