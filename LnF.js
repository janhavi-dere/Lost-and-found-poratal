const form = document.getElementById("itemForm");
const list = document.getElementById("items");
const search = document.getElementById("search");
const chips = document.querySelectorAll(".chip");
const dateInput = document.getElementById("date");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");
const previewImg = document.getElementById("previewImg");
const removePhoto = document.getElementById("removePhoto");

let currentImage = "";

let currentFilter = "all";
let items = load();

dateInput.valueAsDate = new Date();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("lostfound-items"));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return [
    { id: 1, type: "lost", name: "Blue water bottle", location: "Gym", date: "2026-10-12", contact: "sam@example.com", desc: "Steel, dent near the bottom.", resolved: false },
    { id: 2, type: "found", name: "Set of keys", location: "Main gate", date: "2026-10-14", contact: "Security desk", desc: "Three keys with a red tag.", resolved: false }
  ];
}

function save() {
  try {
    localStorage.setItem("lostfound-items", JSON.stringify(items));
    return true;
  } catch (e) {
    return false;
  }
}

// Shrinks the photo so it fits in browser storage (max 700px, JPEG)
function resizeImage(file, maxSize = 700) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function clearPhoto() {
  currentImage = "";
  photoInput.value = "";
  preview.hidden = true;
  previewImg.removeAttribute("src");
}

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return clearPhoto();
  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return clearPhoto();
  }
  try {
    currentImage = await resizeImage(file);
    previewImg.src = currentImage;
    preview.hidden = false;
  } catch (e) {
    alert("That image couldn't be read. Try a different file.");
    clearPhoto();
  }
});

removePhoto.addEventListener("click", clearPhoto);

list.addEventListener("click", e => {
  const img = e.target.closest(".photo");
  if (!img) return;
  const box = document.createElement("div");
  box.className = "lightbox";
  box.innerHTML = `<img src="${img.src}" alt="${img.alt}">`;
  box.addEventListener("click", () => box.remove());
  document.body.appendChild(box);
});

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const visible = items.filter(i =>
    (currentFilter === "all" || i.type === currentFilter) &&
    (`${i.name} ${i.location} ${i.desc}`.toLowerCase().includes(q))
  );

  if (!visible.length) {
    list.innerHTML = `<div class="empty">No items match. Post one using the form.</div>`;
    return;
  }

  list.innerHTML = visible.map(i => `
    <article class="item ${i.type} ${i.resolved ? "resolved" : ""}">
      <span class="tag ${i.type}">${i.type === "lost" ? "Lost" : "Found"}</span>
      ${i.image ? `<img class="photo" src="${i.image}" alt="Photo of ${escapeHTML(i.name)}">` : ""}
      <h3>${escapeHTML(i.name)}</h3>
      <p>${escapeHTML(i.location)} on ${escapeHTML(i.date)}</p>
      ${i.desc ? `<p>${escapeHTML(i.desc)}</p>` : ""}
      <p class="contact">Contact: ${escapeHTML(i.contact)}</p>
      <div class="item-actions">
        <button data-action="resolve" data-id="${i.id}">${i.resolved ? "Reopen" : "Mark returned"}</button>
        <button data-action="delete" data-id="${i.id}">Delete</button>
      </div>
    </article>
  `).join("");
}

form.addEventListener("submit", e => {
  e.preventDefault();
  items.unshift({
    id: Date.now(),
    type: form.elements.type.value,
    name: form.name.value.trim(),
    location: form.location.value.trim(),
    date: form.date.value,
    contact: form.contact.value.trim(),
    desc: form.desc.value.trim(),
    image: currentImage,
    resolved: false
  });
  if (!save()) {
    alert("Browser storage is full, so this post won't be saved after a refresh. Delete some old posts or use a smaller photo.");
  }
  form.reset();
  clearPhoto();
  dateInput.valueAsDate = new Date();
  render();
});

list.addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "delete") {
    items = items.filter(i => i.id !== id);
  } else {
    const item = items.find(i => i.id === id);
    item.resolved = !item.resolved;
  }
  save();
  render();
});

chips.forEach(chip => chip.addEventListener("click", () => {
  chips.forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  render();
}));

search.addEventListener("input", render);

render();