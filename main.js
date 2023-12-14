import { Application } from "@splinetool/runtime";

const canvas = document.getElementById("canvas3d");
const app = new Application(canvas);
app.load("https://prod.spline.design/Ep4TGhpwkc-U3k9Z/scene.splinecode");

const canvas_2 = document.getElementById("canvas3d_2");
const app_2 = new Application(canvas_2);
app_2.load("https://prod.spline.design/V8jocpL6oSzSOu-H/scene.splinecode");
