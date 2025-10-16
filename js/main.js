import projects from "./projects.js";

document.addEventListener("DOMContentLoaded", () => {
  const featuredContainer = document.getElementById("featured-projects");
  const regularContainer = document.getElementById("regular-projects");

  // Modal elements
  const warningModal = document.getElementById("warning-modal");
  const modalMessage = document.getElementById("modal-message");
  const modalContinueBtn = document.getElementById("modal-continue-btn");
  const modalCloseBtns = document.querySelectorAll(".js-modal-close");

  if (!featuredContainer || !regularContainer) return;

  // --- ICONS ---
  const iconDesktop = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
  const iconMobile = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;

  const createProjectCard = (project) => {
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

    return `
      <li class="project-card" data-status="${project.status
        .replace(/\s+/g, "-")
        .toLowerCase()}" data-project-name="${project.name}">
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
          <a href="${project.href}" class="btn btn-primary">View Demo</a>
          ${docLink}
        </div>
      </li>
    `;
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
  };

  const showWarningModal = (href, isMobile) => {
    const requiredDevice = isMobile ? "desktop" : "mobile";
    modalMessage.textContent = `This project is not optimized for a ${
      isMobile ? "mobile" : "desktop"
    } device. It may not display or function correctly.`;
    modalContinueBtn.href = href;
    warningModal.classList.remove("hidden");
  };

  const hideWarningModal = () => {
    warningModal.classList.add("hidden");
  };

  // --- EVENT LISTENERS ---

  // Main listener for "View Demo" clicks
  document.body.addEventListener("click", (e) => {
    const viewDemoButton = e.target.closest(".btn-primary");
    if (!viewDemoButton) return;

    e.preventDefault();

    const card = viewDemoButton.closest(".project-card");
    const projectName = card.dataset.projectName;
    const project = projects.find((p) => p.name === projectName);
    const href = viewDemoButton.href;

    if (!project) return;

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
      showWarningModal(href, isMobileDevice);
    } else {
      window.location.href = href;
    }
  });

  // Listeners for closing the modal
  modalCloseBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      hideWarningModal();
    });
  });

  // Initial Render
  renderProjects();
});
