const screenshots = [
  {id: "workspace", title: "Workspace", caption: "The canvas, layers, and machine controls in the Rayforge main window."},
  {id: "file-menu", title: "Import artwork", caption: "Choose File → Import… to bring an artwork file into the workspace."},
  {id: "layers", title: "Layers", caption: "Each layer has its own operation pipeline. Use + to add an operation."},
  {id: "layer-settings", title: "Layer settings", caption: "Open a layer’s gear button to edit its color, coordinate system, or rotary settings."},
  {id: "operations", title: "Add an operation", caption: "Choose an operation such as Contour for cuts or Engrave for raster work."},
  {id: "contour", title: "Contour settings", caption: "Set the cut side and path order in the Step Settings tab."},
  {id: "laser", title: "Laser settings", caption: "The Laser tab contains power, cut speed, travel speed, and air assist."},
  {id: "object-menu", title: "Object menu", caption: "Open the Object menu to create a new sketch or edit a selected object."},
  {id: "sketch", title: "Sketch editor", caption: "Draw and edit geometry in the built-in sketch editor."},
  {id: "selection", title: "Select a workpiece", caption: "Click a workpiece on the canvas to reveal its selection handles."}
];

const guideDialog = document.querySelector("#guide-dialog");
const guideContent = document.querySelector("#dialog-content");
const shotDialog = document.querySelector("#shot-dialog");
const shotTitle = document.querySelector("#shot-title");
const shotImage = document.querySelector("#shot-image");
const shotCaption = document.querySelector("#shot-caption");
let currentShot = 0;

function showShot(index) {
  currentShot = (index + screenshots.length) % screenshots.length;
  const shot = screenshots[currentShot];
  shotTitle.textContent = shot.title;
  shotImage.src = `assets/${shot.id}.webp`;
  shotImage.alt = shot.caption;
  shotCaption.textContent = shot.caption;
  if (!shotDialog.open) shotDialog.showModal();
}

const gallery = document.querySelector("#gallery");
for (const shot of screenshots) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "glass";
  button.dataset.shot = shot.id;

  const thumbnail = document.createElement("img");
  thumbnail.src = `assets/${shot.id}.webp`;
  thumbnail.loading = "lazy";
  thumbnail.alt = "";

  const label = document.createElement("span");
  label.textContent = shot.title;
  button.append(thumbnail, label);
  gallery.append(button);
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-dialog], [data-shot], [data-shot-step], [data-close]");
  if (!trigger) return;

  if (trigger.hasAttribute("data-close")) {
    trigger.closest("dialog").close();
  } else if (trigger.hasAttribute("data-dialog")) {
    const template = document.getElementById(trigger.dataset.dialog);
    guideContent.replaceChildren(template.content.cloneNode(true));
    if (!guideDialog.open) guideDialog.showModal();
    guideDialog.querySelector("[data-close]").focus();
    guideDialog.scrollTop = 0;
  } else if (trigger.hasAttribute("data-shot")) {
    showShot(screenshots.findIndex((shot) => shot.id === trigger.dataset.shot));
  } else {
    showShot(currentShot + Number(trigger.dataset.shotStep));
  }
});

for (const dialog of [guideDialog, shotDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const {left, right, top, bottom} = dialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) dialog.close();
  });
}
shotDialog.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  showShot(currentShot + (event.key === "ArrowLeft" ? -1 : 1));
});

const thickness = document.querySelector("#thickness");
const presets = document.querySelectorAll("[data-thickness]");
const drop = document.querySelector("#drop");
const focusError = document.querySelector("#focus-error");

function updateDrop() {
  const value = thickness.valueAsNumber;
  const valid = value > 0 && value <= 17;
  drop.value = valid ? `${(17 - value).toFixed(2)} mm` : "—";
  focusError.hidden = valid;
  thickness.setAttribute("aria-invalid", String(!valid));
  for (const preset of presets) {
    preset.setAttribute("aria-pressed", String(Number(preset.dataset.thickness) === value));
  }
}

thickness.addEventListener("input", updateDrop);
for (const preset of presets) {
  preset.addEventListener("click", () => {
    thickness.value = preset.dataset.thickness;
    updateDrop();
  });
}
updateDrop();

const units = document.querySelector("#units");
const speedHeading = document.querySelector("#speed-heading");
const speeds = document.querySelectorAll("[data-speed]");
const formatSpeed = new Intl.NumberFormat("en");

function updateSpeeds() {
  const perMinute = units.value === "min";
  speedHeading.textContent = perMinute ? "Speed (mm/min)" : "Speed (mm/s)";
  for (const speed of speeds) {
    speed.textContent = formatSpeed.format(Number(speed.dataset.speed) * (perMinute ? 60 : 1));
  }
}
units.addEventListener("change", updateSpeeds);
updateSpeeds();

const sectionLinks = [...document.querySelectorAll(".nav nav a")];
const sections = sectionLinks.map((link) => document.querySelector(link.hash));
function updateSection() {
  const visible = sections.findLastIndex((section) => section.getBoundingClientRect().top <= 145);
  for (const [index, link] of sectionLinks.entries()) {
    if (index === visible) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("scroll", updateSection, {passive: true});
updateSection();
