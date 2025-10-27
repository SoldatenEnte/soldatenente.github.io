import { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';
import './DialogueBox.css';
import { asset } from '../utils/assetUrl'; // Import the helper

type DialogueBoxProps = {
    show: boolean;
    pages: string[];
    onComplete: () => void;
};

const useDialogue = (pages: string[], typingSpeed: number, soundSrc: string, startTyping: boolean) => {
    const [pageIndex, setPageIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isPageComplete, setIsPageComplete] = useState(false);

    const soundRef = useRef<Howl | null>(null);
    const timeoutRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        soundRef.current = new Howl({
            src: [soundSrc],
            loop: true,
            volume: 0.2,
        });
        return () => {
            soundRef.current?.unload();
        };
    }, [soundSrc]);

    useEffect(() => {
        if (pageIndex >= pages.length || !startTyping) return;

        setIsPageComplete(false);
        setDisplayedText('');
        soundRef.current?.play();

        const currentPage = pages[pageIndex];
        if (!currentPage) return;

        let charIndex = 0;
        const typeChar = () => {
            if (charIndex < currentPage.length) {
                setDisplayedText(currentPage.substring(0, charIndex + 1));
                charIndex++;
                timeoutRef.current = window.setTimeout(typeChar, typingSpeed);
            } else {
                setIsPageComplete(true);
                soundRef.current?.stop();
            }
        };

        typeChar();

        return () => {
            clearTimeout(timeoutRef.current);
            soundRef.current?.stop();
        };
    }, [pageIndex, pages, typingSpeed, startTyping]);

    const skip = useCallback(() => {
        clearTimeout(timeoutRef.current);
        soundRef.current?.stop();
        setDisplayedText(pages[pageIndex]);
        setIsPageComplete(true);
    }, [pageIndex, pages]);

    const next = useCallback(() => {
        if (isPageComplete) {
            setPageIndex((prev) => prev + 1);
        }
    }, [isPageComplete]);

    const isFinished = pageIndex >= pages.length - 1 && isPageComplete;

    return { displayedText, isPageComplete, skip, next, isFinished };
};

export function DialogueBox({ show, pages, onComplete }: DialogueBoxProps) {
    const [canBeVisible, setCanBeVisible] = useState(false);
    // FIX: Use the asset helper for the sound path
    const { displayedText, isPageComplete, skip, next, isFinished } = useDialogue(pages, 30, asset('audio/dialogue-blip.mp3'), canBeVisible);

    const handleInteraction = useCallback(() => {
        if (!isPageComplete) {
            skip();
        } else if (isFinished) {
            onComplete();
        } else {
            next();
        }
    }, [isPageComplete, isFinished, skip, next, onComplete]);

    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => setCanBeVisible(true), 1000);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === ' ' || e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    handleInteraction();
                }
            };

            window.addEventListener('keydown', handleKeyDown);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            setCanBeVisible(false);
        }
    }, [show, handleInteraction]);

    if (!show) {
        return null;
    }

    return (
        <div
            className={`dialogue-box-container ${canBeVisible ? 'visible' : ''}`}
            onClick={handleInteraction}
        >
            <div className="dialogue-box-wrapper">
                <div className="dialogue-box-content">
                    <div>{displayedText}</div>
                </div>
                <div className={`dialogue-next-arrow ${isPageComplete ? 'visible' : ''}`} />
            </div>
        </div>
    );
}