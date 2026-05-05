import * as THREE from "three";
import { STLLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/STLLoader.js";

const stage = document.querySelector(".robot-stage");
const canvas = document.querySelector("#robot-model");
const statusLabel = document.querySelector("#model-status");
const form = document.querySelector(".reserve-form");

document.documentElement.classList.add("js-enabled");

const modelPath = "./assets/dog.stl";
const modelDisplaySize = 4.1;
const modelPalette = [
  new THREE.Color(0xd9834f),
  new THREE.Color(0x5f8ea8),
  new THREE.Color(0x7c9a70),
  new THREE.Color(0xf2c66c),
];
let modelGroup = null;
let renderer = null;
let camera = null;
let scene3d = null;
let rotationX = -0.2;
let rotationY = -0.45;
let pointerStart = null;
let activePointerId = null;
let autoRotate = true;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setModelStatus(message, hidden = false) {
  if (!statusLabel) return;
  statusLabel.textContent = message;
  statusLabel.classList.toggle("is-hidden", hidden);
}

function renderModel() {
  if (!renderer || !scene3d || !camera || !modelGroup) return;
  modelGroup.rotation.x = rotationX;
  modelGroup.rotation.y = rotationY;
  renderer.render(scene3d, camera);
}

function resizeModelViewer() {
  if (!renderer || !camera || !canvas) return;

  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 520;

  if (modelGroup) {
    modelGroup.position.x = window.matchMedia("(max-width: 900px)").matches ? 0 : 0.35;
  }

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderModel();
}

function fitGeometryToStage(geometry) {
  geometry.computeBoundingBox();

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.boundingBox.getSize(size);
  geometry.translate(-center.x, -center.y, -center.z);

  const largestSide = Math.max(size.x, size.y, size.z) || 1;
  geometry.scale(
    modelDisplaySize / largestSide,
    modelDisplaySize / largestSide,
    modelDisplaySize / largestSide,
  );
  geometry.computeVertexNormals();
}

function addModelColors(geometry) {
  geometry.computeBoundingBox();

  const position = geometry.getAttribute("position");
  const colors = [];
  const height = geometry.boundingBox.max.y - geometry.boundingBox.min.y || 1;
  const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x || 1;
  const color = new THREE.Color();

  for (let index = 0; index < position.count; index += 1) {
    const x = (position.getX(index) - geometry.boundingBox.min.x) / width;
    const y = (position.getY(index) - geometry.boundingBox.min.y) / height;
    const band = Math.min(modelPalette.length - 1, Math.floor(y * modelPalette.length));
    const nextBand = Math.min(modelPalette.length - 1, band + 1);
    const mix = (y * modelPalette.length) % 1;

    color.copy(modelPalette[band]).lerp(modelPalette[nextBand], mix * 0.62);
    color.lerp(modelPalette[(band + 2) % modelPalette.length], Math.sin(x * Math.PI) * 0.16);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

function startDrag(event) {
  if (!modelGroup) return;
  if (event.button !== undefined && event.button !== 0) return;

  event.preventDefault();
  autoRotate = false;
  activePointerId = event.pointerId;
  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    rotationX,
    rotationY,
  };

  if (stage?.setPointerCapture) {
    stage.setPointerCapture(event.pointerId);
  }
}

function dragModel(event) {
  if (!pointerStart) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;

  event.preventDefault();

  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  rotationY = pointerStart.rotationY + deltaX * 0.008;
  rotationX = clamp(pointerStart.rotationX + deltaY * 0.006, -0.9, 0.55);
  renderModel();
}

function endDrag(event) {
  if (!pointerStart) return;
  if (event && activePointerId !== null && event.pointerId !== activePointerId) return;

  if (activePointerId !== null && stage?.hasPointerCapture?.(activePointerId)) {
    stage.releasePointerCapture(activePointerId);
  }

  pointerStart = null;
  activePointerId = null;
}

function initStlViewer() {
  if (!stage || !canvas) return;

  scene3d = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 0.5, 0.1, 100);
  camera.position.set(0, 0.8, 7);

  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  modelGroup = new THREE.Group();
  modelGroup.position.x = window.matchMedia("(max-width: 900px)").matches ? 0 : 0.35;
  modelGroup.position.y = 0.70;
  scene3d.add(modelGroup);

  const keyLight = new THREE.DirectionalLight(0xfff3df, 2.8);
  keyLight.position.set(4, 5, 6);
  scene3d.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8fb3c2, 1.25);
  fillLight.position.set(-5, 2, 3);
  scene3d.add(fillLight);

  const ambientLight = new THREE.HemisphereLight(0xfff7ea, 0x6d7f5d, 1.8);
  scene3d.add(ambientLight);

  resizeModelViewer();

  const loader = new STLLoader();
  loader.load(
    modelPath,
    (geometry) => {
      fitGeometryToStage(geometry);
      addModelColors(geometry);

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.08,
        roughness: 0.54,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      modelGroup.add(mesh);
      setModelStatus("", true);
      renderModel();
    },
    (event) => {
      if (!event.total) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setModelStatus(`Loading 3D model... ${percent}%`);
    },
    () => {
      setModelStatus("3D model could not load.");
    },
  );

  stage.addEventListener("pointerdown", startDrag);
  window.addEventListener("pointermove", dragModel, { passive: false });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", resizeModelViewer);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resizeModelViewer);
    resizeObserver.observe(canvas);
  }
}

function animate() {
  if (modelGroup && autoRotate) {
    rotationY += 0.001;
  }
  renderModel();
  requestAnimationFrame(animate);
}

function setupRevealAnimations() {
  const revealGroups = [
    ".hero-copy",
    ".robot-stage",
    ".section-header",
    ".feature-card",
    ".studio-copy",
    ".interface-panel",
    ".timeline div",
    ".reserve > div",
    ".reserve-form",
    ".footer-main",
    ".footer-bottom",
  ];

  const revealItems = document.querySelectorAll(revealGroups.join(","));

  revealItems.forEach((item, index) => {
    item.classList.add("reveal");
    item.style.setProperty("--reveal-delay", `${Math.min(index * 45, 220)}ms`);
  });

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px 0px 0px",
    },
  );

  revealItems.forEach((item) => observer.observe(item));
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.textContent = "You're on the list";
    button.disabled = true;
  });
}

setupRevealAnimations();
initStlViewer();
animate();
