const stage = document.querySelector(".robot-stage");
const robot = document.querySelector("#robot-model");
const form = document.querySelector(".reserve-form");

let rotationX = -14;
let rotationY = -28;
let pointerStart = null;
let activePointerId = null;
let autoRotate = true;

function renderRobot() {
  robot.style.setProperty("--rx", `${rotationX}deg`);
  robot.style.setProperty("--ry", `${rotationY}deg`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return;

  event.preventDefault();
  activePointerId = event.pointerId;
  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    rotationX,
    rotationY,
  };
  autoRotate = false;
  robot.classList.add("is-dragging");

  if (stage.setPointerCapture) {
    stage.setPointerCapture(event.pointerId);
  }
}

function dragRobot(event) {
  if (!pointerStart) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;

  event.preventDefault();

  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  rotationY = pointerStart.rotationY + deltaX * 0.32;
  rotationX = clamp(pointerStart.rotationX - deltaY * 0.24, -34, 18);
  renderRobot();
}

function endDrag(event) {
  if (!pointerStart) return;
  if (event && activePointerId !== null && event.pointerId !== activePointerId) return;

  if (activePointerId !== null && stage.hasPointerCapture?.(activePointerId)) {
    stage.releasePointerCapture(activePointerId);
  }
  pointerStart = null;
  activePointerId = null;
  robot.classList.remove("is-dragging");
}

stage.addEventListener("pointerdown", startDrag);
window.addEventListener("pointermove", dragRobot, { passive: false });
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

function animate() {
  if (autoRotate) {
    rotationY += 0.09;
    renderRobot();
  }
  requestAnimationFrame(animate);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.textContent = "You're on the list";
  button.disabled = true;
});

renderRobot();
animate();
