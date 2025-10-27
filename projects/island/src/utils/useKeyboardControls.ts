import { useEffect, useRef } from "react";

export const useKeyboardControls = () => {
    const keys = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.key.toLowerCase()) {
                case "w":
                case "arrowup":
                    keys.current.forward = true;
                    break;
                case "s":
                case "arrowdown":
                    keys.current.backward = true;
                    break;
                case "a":
                case "arrowleft":
                    keys.current.left = true;
                    break;
                case "d":
                case "arrowright":
                    keys.current.right = true;
                    break;
                default:
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            switch (event.key.toLowerCase()) {
                case "w":
                case "arrowup":
                    keys.current.forward = false;
                    break;
                case "s":
                case "arrowdown":
                    keys.current.backward = false;
                    break;
                case "a":
                case "arrowleft":
                    keys.current.left = false;
                    break;
                case "d":
                case "arrowright":
                    keys.current.right = false;
                    break;
                default:
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return keys;
};