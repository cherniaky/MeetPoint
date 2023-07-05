export function isValidHttpUrl(string: string) {
    return string.slice(0, 4) === "http:" || string.slice(0, 5) === "https:";
}
