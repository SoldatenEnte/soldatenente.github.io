document.addEventListener("DOMContentLoaded", () => {
  const config = {
    FONT_SIZE: 13.5,
    SATURATION: 1.5,
    BRIGHTNESS: 1.1,
    IS_COLOR_ENABLED: true,
    FRAMES_TO_SKIP: 1,
    CHAR_ASPECT_RATIO: 0.6,
  };

  const video = document.getElementById("sourceVideo");
  const displayCanvas = document.getElementById("asciiCanvas");
  const displayContext = displayCanvas.getContext("2d");
  const loader = document.getElementById("loader");

  let isWorkerBusy = false;
  let animationFrameId;
  let lastRenderedData = null;
  let frameCounter = 0;

  const processingCanvas = document.createElement("canvas");
  const processingContext = processingCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  const worker = new Worker("worker.js");

  worker.onmessage = (e) => {
    if (e.data.type === "frame") {
      lastRenderedData = e.data.data;
      drawAsciiFrame(lastRenderedData);
      isWorkerBusy = false;
    }
  };

  const drawAsciiFrame = (frameData) => {
    if (!frameData) return;
    const { isColor, lines, colorBatches, charHeight } = frameData;
    displayContext.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    if (isColor && config.IS_COLOR_ENABLED) {
      for (const color in colorBatches) {
        displayContext.fillStyle = color;
        const batch = colorBatches[color];
        for (let i = 0; i < batch.length; i++) {
          displayContext.fillText(batch[i].text, batch[i].x, batch[i].y);
        }
      }
    } else {
      displayContext.fillStyle = "#afff8c";
      for (let i = 0; i < lines.length; i++) {
        displayContext.fillText(lines[i], 0, i * charHeight + charHeight);
      }
    }
  };

  const updateDimensions = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = displayCanvas.getBoundingClientRect();
    displayCanvas.width = rect.width * dpr;
    displayCanvas.height = rect.height * dpr;
    const charHeight = Math.floor(config.FONT_SIZE * dpr);
    const charWidth = charHeight * config.CHAR_ASPECT_RATIO;
    processingCanvas.width = Math.max(
      1,
      Math.floor(displayCanvas.width / charWidth)
    );
    processingCanvas.height = Math.max(
      1,
      Math.floor(displayCanvas.height / charHeight)
    );
    worker.postMessage({
      type: "updateDimensions",
      config: { charWidth, charHeight },
    });
    displayContext.font = `bold ${charHeight}px "Courier New", Courier, monospace`;
    displayContext.textBaseline = "bottom";
  };

  const processVideoFrame = () => {
    const canvasWidth = processingCanvas.width;
    const canvasHeight = processingCanvas.height;
    const videoRatio = video.videoWidth / video.videoHeight;
    const effectiveCanvasRatio =
      (canvasWidth / canvasHeight) * config.CHAR_ASPECT_RATIO;

    let sx = 0,
      sy = 0,
      sWidth = video.videoWidth,
      sHeight = video.videoHeight;

    if (videoRatio > effectiveCanvasRatio) {
      sWidth = video.videoHeight * effectiveCanvasRatio;
      sx = (video.videoWidth - sWidth) / 2;
    } else {
      sHeight = video.videoWidth / effectiveCanvasRatio;
      sy = (video.videoHeight - sHeight) / 2;
    }

    processingContext.fillStyle = "#000";
    processingContext.fillRect(0, 0, canvasWidth, canvasHeight);
    processingContext.drawImage(
      video,
      sx,
      sy,
      sWidth,
      sHeight,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
    return processingContext.getImageData(0, 0, canvasWidth, canvasHeight);
  };

  const sendFrameToWorker = (imageData) => {
    const workerConfig = {
      width: processingCanvas.width,
      height: processingCanvas.height,
      isColorEnabled: config.IS_COLOR_ENABLED,
      saturation: config.SATURATION,
      brightness: config.BRIGHTNESS,
    };
    worker.postMessage(
      { type: "processFrame", imageData, config: workerConfig },
      [imageData.data.buffer]
    );
  };

  const renderLoop = () => {
    animationFrameId = requestAnimationFrame(renderLoop);

    if (video.paused || video.ended) {
      if (lastRenderedData) drawAsciiFrame(lastRenderedData);
      return;
    }

    if (isWorkerBusy || frameCounter % (config.FRAMES_TO_SKIP + 1) !== 0) {
      if (lastRenderedData) drawAsciiFrame(lastRenderedData);
      frameCounter++;
      return;
    }

    isWorkerBusy = true;
    frameCounter++;
    const imageData = processVideoFrame();
    sendFrameToWorker(imageData);
  };

  const init = () => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    video.play().catch((e) => console.error("Autoplay failed:", e));
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(renderLoop);
    }
  };

  const startApp = () => {
    loader.style.opacity = "0";
    setTimeout(() => {
      loader.style.display = "none";
      init();
    }, 500);
  };

  if (video.readyState >= 1) {
    // HAVE_METADATA
    startApp();
  } else {
    video.addEventListener("loadedmetadata", startApp, { once: true });
  }

  document.body.addEventListener(
    "click",
    () => {
      if (video.paused) video.play();
    },
    { once: true }
  );
});
