/// <reference types="vite/client" />

declare module '*.png';
declare module '*.jpg';
declare module '*.hdr';
declare module '*.js';
declare module '*.jsx';
declare module '*.ts';
declare module '*.mp3';

declare module '*.vert?raw' {
    const value: string;
    export default value;
}

declare module '*.frag?raw' {
    const value: string;
    export default value;
}

declare module 'gl-noise/build/glNoise.m' {
    export function patchShaders(shader: string): string;
}