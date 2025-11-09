document.addEventListener("DOMContentLoaded", () => {
  const galleryLinks = document.querySelectorAll(".gallery-grid a");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxClose = document.getElementById("lightbox-close");

  if (!lightbox || !lightboxImg || !lightboxClose) return;

  const openLightbox = (imgSrc, imgAlt) => {
    lightboxImg.src = imgSrc;
    lightboxImg.alt = imgAlt;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
  };

  galleryLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const img = link.querySelector("img");
      openLightbox(link.href, img ? img.alt : "Enlarged image");
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === lightboxClose) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("active")) {
      closeLightbox();
    }
  });
});
