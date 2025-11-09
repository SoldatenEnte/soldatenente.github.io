import projects from "./projects.js";

document.addEventListener("DOMContentLoaded", () => {
  const featuredContainer = document.getElementById("featured-projects");
  const regularContainer = document.getElementById("regular-projects");
  const otherContainer = document.getElementById("other-projects-list");
  const skillsContainer = document.getElementById("skills-list");
  const skillsSection = document.getElementById("skills-section");

  const warningModal = document.getElementById("warning-modal");
  const modalMessage = document.getElementById("modal-message");
  const modalContinueBtn = document.getElementById("modal-continue-btn");
  const modalCloseBtns = document.querySelectorAll(".js-modal-close");

  if (!featuredContainer || !regularContainer || !otherContainer) return;

  const iconDesktop = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  const iconMobile = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
  const iconPlay = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const iconBook = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;

  const createProjectCard = (project) => {
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

  const createOtherProjectItem = (project) => {
    const techStack = (project.techStack || [])
      .map((tech) => `<span class="archive-tech-tag">${tech}</span>`)
      .join("");

    const mobileImageTags = (project.techStack || [])
      .map(
        (tech) =>
          `<span class="archive-tech-tag mobile-tag-overlay">${tech}</span>`
      )
      .join("");

    const docLink = project.docHref
      ? `<a href="${project.docHref}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">${iconBook}<span>Docs</span></a>`
      : "";

    const statusSlug = project.status.replace(/\s+/g, "-").toLowerCase();

    const hasImage = !!project.image;
    const liClass = hasImage ? "archive-item has-image" : "archive-item";
    const imageHTML = hasImage
      ? `
      <div class="archive-item-image">
        <img src="${project.image}" alt="${project.name} thumbnail" loading="lazy" width="200" height="200">
        <div class="mobile-tags-container">${mobileImageTags}</div>
      </div>
    `
      : "";

    const desktopTechStack = hasImage
      ? `<div class="archive-item-tech-stack desktop-view-only">${techStack}</div>`
      : `<div class="archive-item-tech-stack">${techStack}</div>`;

    return `
      <li class="${liClass}" data-project-name="${project.name}">
        ${imageHTML}
        <div class="archive-item-content">
          <div class="archive-item-header">
            <h4 class="archive-item-title">${project.name}</h4>
            <div class="archive-header-right">
              <span class="project-date desktop-date-view">${project.date}</span>
              <span class="project-status" data-status-slug="${statusSlug}">${project.status}</span>
            </div>
          </div>
          <p class="archive-item-description">${project.description}</p>
          <div class="archive-item-footer">
            <span class="project-date mobile-date-view">${project.date}</span>
            ${desktopTechStack}
            <div class="archive-item-links">
              ${docLink}
            </div>
          </div>
        </div>
      </li>
    `;
  };

  const createSkillItem = (skill) => {
    return `
      <li class="skill-item">
        <strong class="skill-name">${skill.name}</strong>
        <span class="skill-date">${skill.date}</span>
        <p class="skill-description">${skill.description}</p>
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

  const renderContent = () => {
    const allProjects = projects.filter((p) => p.type !== "skill");
    const allSkills = projects.filter((p) => p.type === "skill");

    const projectsWithDemo = allProjects.filter((p) => p.href);
    const projectsWithoutDemo = allProjects.filter(
      (p) => !p.href && !p.featured
    );

    const sortFn = (a, b) => (b.relevance || 0) - (a.relevance || 0);

    const featuredProjects = projectsWithDemo
      .filter((p) => p.featured)
      .sort(sortFn);
    const regularProjects = projectsWithDemo
      .filter((p) => !p.featured)
      .sort(sortFn);
    const otherProjects = projectsWithoutDemo.sort(sortFn);
    const sortedSkills = allSkills.sort(sortFn);

    featuredContainer.innerHTML = featuredProjects
      .map(createProjectCard)
      .join("");
    regularContainer.innerHTML = regularProjects
      .map(createProjectCard)
      .join("");
    otherContainer.innerHTML = otherProjects
      .map(createOtherProjectItem)
      .join("");

    if (sortedSkills.length > 0 && skillsContainer && skillsSection) {
      skillsContainer.innerHTML = sortedSkills.map(createSkillItem).join("");
      skillsSection.classList.remove("hidden");
    } else if (skillsSection) {
      skillsSection.classList.add("hidden");
    }

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
    if (!card) return;

    if (viewDemoButton.tagName === "A") e.preventDefault();

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

  renderContent();
});
