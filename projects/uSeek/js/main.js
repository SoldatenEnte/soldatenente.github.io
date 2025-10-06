import { Application } from "@splinetool/runtime";

const canvas_lock = document.getElementById("canvas3d");
if (canvas_lock) {
  const app = new Application(canvas_lock);
  app.load("https://prod.spline.design/Ep4TGhpwkc-U3k9Z/scene.splinecode");
}

const canvas_globe = document.getElementById("canvas3d-globe");
if (canvas_globe) {
  const app_globe = new Application(canvas_globe);
  app_globe.load(
    "https://prod.spline.design/ge9-WQvAhORVziZw/scene.splinecode"
  );
}

const canvas_chest = document.getElementById("canvas3d-chest");
if (canvas_chest) {
  const app_chest = new Application(canvas_chest);
  app_chest.load(
    "https://prod.spline.design/EPsID204XcJih6aY/scene.splinecode"
  );
}

const canvas_book = document.getElementById("canvas3d-book");
if (canvas_book) {
  const app_book = new Application(canvas_book);
  app_book.load("https://prod.spline.design/V8jocpL6oSzSOu-H/scene.splinecode");
}
