import projects from "./projects.js";

document.addEventListener("DOMContentLoaded", () => {
  const featuredContainer = document.getElementById("featured-projects");
  const regularContainer = document.getElementById("regular-projects");

  const warningModal = document.getElementById("warning-modal");
  const modalMessage = document.getElementById("modal-message");
  const modalContinueBtn = document.getElementById("modal-continue-btn");
  const modalCloseBtns = document.querySelectorAll(".js-modal-close");

  if (!featuredContainer || !regularContainer) return;

  const iconDesktop = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  const iconMobile = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
  const iconPlay = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;

  const createProjectCard = (project) => {
    // OPTIMIZED: Simple single image source, but with explicit dimensions to prevent layout shift.
    const thumbnail = project.image
      ? `<img src="${project.image}" alt="${project.name} thumbnail" loading="lazy" width="600" height="400">`
      : `<div class="card-thumbnail-placeholder"></div>`;

    const projectTags =
      project.tags && project.tags.length
        ? `<div class="card-tags">${project.tags
            .map((tag) => `<span class="card-tag">${tag}</span>`)
            .join("")}</div>`
        : "";

    const demoButton = project.href
      ? `<a href="${project.href}" class="btn btn-primary">${iconPlay} <span>View Demo</span></a>`
      : `<button class="btn btn-primary" disabled>Demo Unavailable</button>`;

    const docLink = project.docHref
      ? `<a href="${project.docHref}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Docs</a>`
      : "";

    const deviceIcons = `
      <div class="device-support-icons">
        ${project.deviceSupport.includes("desktop") ? iconDesktop : ""}
        ${project.deviceSupport.includes("mobile") ? iconMobile : ""}
      </div>
    `;

    const formattedDate = new Date(project.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    });

    const liClass = project.featured ? "project-card featured" : "project-card";

    return `
      <li class="${liClass}" data-status="${project.status
      .replace(/\s+/g, "-")
      .toLowerCase()}" data-project-name="${project.name}">
        <div class="card-inner">
          <div class="card-thumbnail">
            ${thumbnail}
            ${projectTags}
          </div>
          <div class="card-content">
            <div class="card-header">
              <h3 class="project-title">${project.name}</h3>
              <span class="project-status">${project.status}</span>
            </div>
            <p class="project-description">${project.description}</p>
            <div class="card-meta">
              ${deviceIcons}
              <span class="project-date">${formattedDate}</span>
            </div>
          </div>
          <div class="card-footer">
            ${docLink}
            ${demoButton}
          </div>
        </div>
      </li>
    `;
  };

  const setupCardHoverEffects = () => {
    const cards = document.querySelectorAll(".project-card");
    cards.forEach((card) => {
      if (window.matchMedia("(pointer: fine)").matches) {
        card.addEventListener("mousemove", (e) => {
          if (card.classList.contains("featured")) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const maxRotation = 8;
            const rotateX = (-maxRotation * (y / rect.height - 0.5)).toFixed(2);
            const rotateY = (maxRotation * (x / rect.width - 0.5)).toFixed(2);
            card.style.setProperty("--rotate-x", `${rotateX}deg`);
            card.style.setProperty("--rotate-y", `${rotateY}deg`);
          }
        });
        card.addEventListener("mouseleave", () => {
          if (card.classList.contains("featured")) {
            card.style.setProperty("--rotate-x", `0deg`);
            card.style.setProperty("--rotate-y", `0deg`);
          }
        });
      }
    });
  };

  const setupMobileCardFocus = () => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      const cards = document.querySelectorAll(".project-card");
      if (cards.length === 0) return;
      let cardVisibility = new Map();
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            cardVisibility.set(entry.target, entry.intersectionRatio);
          });
          let mostVisibleCard = null;
          let maxRatio = 0;
          cardVisibility.forEach((ratio, card) => {
            if (ratio > maxRatio) {
              maxRatio = ratio;
              mostVisibleCard = card;
            }
          });
          cards.forEach((card) => {
            if (card === mostVisibleCard && maxRatio > 0.5) {
              card.classList.add("is-visible");
            } else {
              card.classList.remove("is-visible");
            }
          });
        },
        {
          threshold: Array.from({ length: 21 }, (_, i) => i * 0.05),
        }
      );
      cards.forEach((card) => observer.observe(card));
    }
  };

  const renderProjects = () => {
    const featuredProjects = projects.filter((p) => p.featured);
    const regularProjects = projects
      .filter((p) => !p.featured)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    featuredContainer.innerHTML = featuredProjects
      .map(createProjectCard)
      .join("");
    regularContainer.innerHTML = regularProjects
      .map(createProjectCard)
      .join("");

    setupCardHoverEffects();
    setupMobileCardFocus();
  };

  const showWarningModal = (href) => {
    const isMobileDevice = window.innerWidth < 768;
    modalMessage.textContent = `This project is not optimized for a ${
      isMobileDevice ? "mobile" : "desktop"
    } device. It may not display or function correctly.`;
    modalContinueBtn.href = href;
    warningModal.classList.remove("hidden");
  };

  const hideWarningModal = () => {
    warningModal.classList.add("hidden");
  };

  document.body.addEventListener("click", (e) => {
    const viewDemoButton = e.target.closest(".btn-primary");
    if (!viewDemoButton || viewDemoButton.hasAttribute("disabled")) return;

    const card = viewDemoButton.closest(".project-card");
    if (!card) {
      return;
    }

    if (viewDemoButton.tagName === "A") {
      e.preventDefault();
    }

    const projectName = card.dataset.projectName;
    const project = projects.find((p) => p.name === projectName);
    const href = viewDemoButton.href;

    if (!project || !href) return;

    const isMobileDevice = window.innerWidth < 768;
    const isDesktopOptimized = project.deviceSupport.includes("desktop");
    const isMobileOptimized = project.deviceSupport.includes("mobile");

    let shouldWarn = false;
    if (isMobileDevice && !isMobileOptimized) {
      shouldWarn = true;
    } else if (!isMobileDevice && !isDesktopOptimized) {
      shouldWarn = true;
    }

    if (shouldWarn) {
      showWarningModal(href);
    } else {
      window.location.href = href;
    }
  });

  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      hideWarningModal();
    });
  });

  renderProjects();
});
