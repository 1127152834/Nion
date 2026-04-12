const navLinks = Array.from(document.querySelectorAll("[data-panel-target]"));
const panels = Array.from(document.querySelectorAll("[data-panel]"));

function activatePanel(target) {
  navLinks.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTarget === target);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === target);
  });
}

navLinks.forEach((button) => {
  button.addEventListener("click", () => activatePanel(button.dataset.panelTarget));
});

const detailButtons = Array.from(document.querySelectorAll("[data-detail-target]"));
const detailCards = Array.from(document.querySelectorAll(".detail-card"));

detailButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.detailTarget;
    detailCards.forEach((card) => {
      card.classList.toggle("is-active", card.id === target);
    });
  });
});

const editButtons = Array.from(document.querySelectorAll("[data-edit-target]"));

editButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.editTarget;
    const section = document.getElementById(target);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
