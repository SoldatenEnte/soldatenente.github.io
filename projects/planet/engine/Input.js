export class InputManager {
  constructor() {
    this.rawBuffer = new Uint8Array(64);
    this.justPressedLatch = new Uint8Array(64);
    this.buffer = new Uint8Array(64);
    this.previousBuffer = new Uint8Array(64);
    
    this.rawButtonsBuffer = new Uint8Array(5);
    this.mouseJustPressedLatch = new Uint8Array(5);
    this.buttonsBuffer = new Uint8Array(5);
    this.previousButtonsBuffer = new Uint8Array(5);
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseWheelDelta = 0;

    this._accumulatedDX = 0;
    this._accumulatedDY = 0;
    this._accumulatedWheel = 0;

    this.blockBrowserHotkeys = true;

    this.KEY_MAP = {
      "KeyA": 0, "KeyB": 1, "KeyC": 2, "KeyD": 3, "KeyE": 4, "KeyF": 5, "KeyG": 6, "KeyH": 7, "KeyI": 8, "KeyJ": 9,
      "KeyK": 10, "KeyL": 11, "KeyM": 12, "KeyN": 13, "KeyO": 14, "KeyP": 15, "KeyQ": 16, "KeyR": 17, "KeyS": 18, "KeyT": 19,
      "KeyU": 20, "KeyV": 21, "KeyW": 22, "KeyX": 23, "KeyY": 24, "KeyZ": 25,
      "Digit0": 26, "Digit1": 27, "Digit2": 28, "Digit3": 29, "Digit4": 30, "Digit5": 31, "Digit6": 32, "Digit7": 33, "Digit8": 34, "Digit9": 35,
      "Space": 36, "Enter": 37, "Escape": 38, "Backspace": 39, "Tab": 40,
      "ShiftLeft": 41, "ShiftRight": 42, "ControlLeft": 43, "ControlRight": 44, "AltLeft": 45, "AltRight": 46,
      "ArrowUp": 47, "ArrowDown": 48, "ArrowLeft": 49, "ArrowRight": 50,
      "MetaLeft": 51, "MetaRight": 52
    };

    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (this.blockBrowserHotkeys && e.key !== "F12" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
      const codeId = this.KEY_MAP[e.code];
      if (codeId !== undefined) {
        this.rawBuffer[codeId] = 1;
        this.justPressedLatch[codeId] = 1;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (this.blockBrowserHotkeys && e.key !== "F12" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
      const codeId = this.KEY_MAP[e.code];
      if (codeId !== undefined) {
        this.rawBuffer[codeId] = 0;
      }
    });

    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this._accumulatedDX += e.movementX;
      this._accumulatedDY += e.movementY;
    });

    window.addEventListener("mousedown", (e) => {
      if (e.button < 5) {
        this.rawButtonsBuffer[e.button] = 1;
        this.mouseJustPressedLatch[e.button] = 1;
      }
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button < 5) {
        this.rawButtonsBuffer[e.button] = 0;
      }
    });

    window.addEventListener("wheel", (e) => {
        this._accumulatedWheel += e.deltaY;
    }, { passive: true });

    window.addEventListener("blur", () => {
      this.rawBuffer.fill(0);
      this.rawButtonsBuffer.fill(0);
      this.justPressedLatch.fill(0);
      this.mouseJustPressedLatch.fill(0);
    });

    window.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  update() {
    this.previousBuffer.set(this.buffer);
    this.previousButtonsBuffer.set(this.buttonsBuffer);
    
    // Resolve states with latches to catch sub-frame presses
    for (let i = 0; i < 64; i++) {
      if (this.justPressedLatch[i] === 1) {
        this.buffer[i] = 1;
      } else {
        this.buffer[i] = this.rawBuffer[i];
      }
    }

    for (let i = 0; i < 5; i++) {
      if (this.mouseJustPressedLatch[i] === 1) {
        this.buttonsBuffer[i] = 1;
      } else {
        this.buttonsBuffer[i] = this.rawButtonsBuffer[i];
      }
    }

    // Reset latches
    this.justPressedLatch.fill(0);
    this.mouseJustPressedLatch.fill(0);
    
    this.mouseDX = this._accumulatedDX;
    this.mouseDY = this._accumulatedDY;
    this.mouseWheelDelta = this._accumulatedWheel;

    this._accumulatedDX = 0;
    this._accumulatedDY = 0;
    this._accumulatedWheel = 0;
  }

  setBlockHotkeys(enabled) {
    this.blockBrowserHotkeys = enabled;
  }

  pressed(code) {
    const codeId = this.KEY_MAP[code];
    return codeId !== undefined && this.buffer[codeId] === 1;
  }

  justPressed(code) {
    const codeId = this.KEY_MAP[code];
    return codeId !== undefined && this.buffer[codeId] === 1 && this.previousBuffer[codeId] === 0;
  }

  justReleased(code) {
    const codeId = this.KEY_MAP[code];
    return codeId !== undefined && this.buffer[codeId] === 0 && this.previousBuffer[codeId] === 1;
  }

  mousePressed(btn) {
    return this.buttonsBuffer[btn] === 1;
  }

  mouseJustPressed(btn) {
    return this.buttonsBuffer[btn] === 1 && this.previousButtonsBuffer[btn] === 0;
  }

  mouseJustReleased(btn) {
    return this.buttonsBuffer[btn] === 0 && this.previousButtonsBuffer[btn] === 1;
  }
}