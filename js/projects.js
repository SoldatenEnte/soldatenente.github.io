const projects = [
  // --- Projects with Live Demos ---
  {
    name: "Platform Kinematics",
    description:
      "A real-time 3D web simulator of a 3-axis Stewart platform demonstrating inverse kinematics.",
    href: "./projects/platform/",
    image: "./images/platform_thumbnail.webp",
    status: "In Development",
    docHref: "./case-studies/platform.html",
    featured: true,
    relevance: 100,
    date: "2025-10-01",
    deviceSupport: ["desktop", "mobile"],
    tags: ["React", "Three.js", "3D"],
    techStack: [
      "React",
      "Three.js",
      "React Three Fiber (R3F)",
      "Drei",
      "Tweakpane",
    ],
  },
  {
    name: "Eneida",
    description:
      "An interactive portfolio simulating a retro sci-fi desktop with a CLI, window manager, and playable games with online leaderboards.",
    href: "./projects/eneida/",
    image: "./images/eneida_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/eneida.html",
    featured: false,
    relevance: 90,
    date: "2025-07-15",
    deviceSupport: ["desktop"],
    tags: ["Web"],
    techStack: [
      "Vanilla JavaScript (ES6+)",
      "Firebase (Firestore)",
      "Canvas API",
    ],
  },
  {
    name: "Toolbox",
    description:
      "A web app featuring a suite of polished utilities like a QR Code Generator and JSON Formatter.",
    href: "./projects/toolbox/",
    image: "./images/toolbox_thumbnail.webp",
    status: "In Development",
    docHref: "./case-studies/toolbox.html",
    featured: true,
    relevance: 100,
    date: "2025-10-10",
    deviceSupport: ["desktop", "mobile"],
    tags: ["Web"],
    techStack: [
      "React 19",
      "TypeScript",
      "Tailwind CSS v4",
      "Motion",
      "Radix UI",
      "Vite",
    ],
  },
  {
    name: "Island",
    description:
      "An interactive 3D portfolio where you sail a ship between islands, featuring custom water shaders and spatial audio.",
    href: "./projects/island/",
    image: "./images/island_thumbnail.webp",
    status: "On Hold",
    docHref: "./case-studies/island.html",
    featured: true,
    relevance: 100,
    date: "2025-09-01",
    deviceSupport: ["desktop", "mobile"],
    tags: ["Web", "Three.js"],
    techStack: [
      "React Three Fiber (R3F)",
      "Three.js",
      "GLSL (Shaders)",
      "Zustand",
      "Howler.js",
    ],
  },
  {
    name: "uSeek",
    description:
      "A large-scale, pirate-themed interactive puzzle campaign using scroll-based animations and embedded 3D models.",
    href: "./projects/uSeek/",
    image: "./images/useek_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/useek.html",
    featured: false,
    relevance: 70,
    date: "2024-01-01",
    deviceSupport: ["desktop"],
    tags: ["Web"],
    techStack: [
      "GSAP (ScrollTrigger)",
      "Spline (3D)",
      "Lenis",
      "Vanilla JavaScript",
    ],
  },
  {
    name: "ASCII Video Renderer",
    description:
      "A high-performance, real-time video-to-ASCII art converter using Web Workers to prevent UI blocking.",
    href: "./projects/ASCII/",
    image: "./images/ASCII_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/ascii.html",
    featured: false,
    relevance: 30,
    date: "2025-07-10",
    deviceSupport: ["desktop", "mobile"],
    tags: ["Web"],
    techStack: [
      "JavaScript",
      "Web Workers API",
      "HTML5 Canvas API",
      "HTML5 Video",
    ],
  },
  {
    name: "RPG Combat Minigame",
    description:
      "A tech demo for a turn-based combat system featuring skill-based timing and reaction minigames.",
    href: "./projects/combat/",
    image: "./images/combat_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/combat.html",
    featured: false,
    relevance: 85,
    date: "2025-06-15",
    deviceSupport: ["mobile"],
    tags: ["Web"],
    techStack: ["Vanilla JavaScript", "CSS Animations", "DOM API"],
  },
  {
    name: "Lockpicking Minigame",
    description:
      "A tech demo for a timing-based lockpicking minigame with dynamic difficulty.",
    href: "./projects/lockpick/",
    image: "./images/lockpick_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/lockpick.html",
    featured: false,
    relevance: 60,
    date: "2025-06-10",
    deviceSupport: ["desktop", "mobile"],
    tags: ["Web"],
    techStack: ["Vanilla JavaScript", "CSS3", "requestAnimationFrame"],
  },
  {
    name: "Text Fall Animation",
    description:
      "A kinetic typography experiment using the Canvas API to simulate text falling into place with physics-like motion.",
    href: "./projects/textfall/",
    image: "./images/textfall_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/textfall.html",
    featured: false,
    relevance: 20,
    date: "2025-03-01",
    deviceSupport: ["desktop"],
    tags: ["Web"],
    techStack: [
      "HTML5 Canvas API",
      "Vanilla JavaScript",
      "requestAnimationFrame",
    ],
  },
  {
    name: "Scrub GSAP Portfolio",
    description:
      "A portfolio concept using scroll-scrubbed animations for cinematic horizontal parallax and dynamic text effects.",
    href: "./projects/scrub/",
    image: "./images/scrub_thumbnail.webp",
    status: "Archived",
    docHref: "./case-studies/scrub-gsap.html",
    featured: false,
    relevance: 40,
    date: "2024-09-01",
    deviceSupport: ["desktop"],
    tags: ["Web", "GSAP"],
    techStack: ["GSAP (ScrollTrigger)", "Lenis", "Vanilla JavaScript"],
  },
  {
    name: "Particles Portfolio",
    description:
      "A portfolio where scrolling dissolves 3D point cloud models into chaotic particle fields.",
    href: "./projects/particles/",
    image: "./images/particles_thumbnail.webp",
    status: "Archived",
    docHref: "./case-studies/particles.html",
    featured: false,
    relevance: 40,
    date: "2024-08-01",
    deviceSupport: ["desktop"],
    tags: ["Web", "Three.js"],
    techStack: ["Three.js", "GSAP (ScrollTrigger)", "GLTFLoader"],
  },
  {
    name: "Portal",
    description:
      "A UI demo creating a seamless portal transition effect using transparent video (HEVC/WebM with alpha channel).",
    href: "./projects/portal/",
    image: "./images/portal_thumbnail.webp",
    status: "Completed",
    docHref: "./case-studies/portal.html",
    featured: false,
    relevance: 30,
    date: "2025-07-01",
    deviceSupport: ["desktop", "mobile"],
    tags: ["Web"],
    techStack: ["HTML5 Video API", "JavaScript", "HEVC (H.265)", "WebM"],
  },

  // --- Projects without Live Demos (for the list) ---
  {
    name: "Web Platformer",
    description:
      "A web game to build and play speedrun platformer levels with highly tweakable player controls and competitive leaderboards.",
    status: "In Development",
    date: "November 2025",
    relevance: 30,
    docHref: "./case-studies/web-platformer.html",
    image: "./images/web-platformer_1.webp",
    techStack: ["Next.js", "Turborepo", "TypeScript", "Docker"],
  },
  {
    name: "TileQuest",
    description:
      "A physical/digital hybrid co-op board game using RFID figures on a custom-built, modular electronic hexagonal grid.",
    status: "In Development",
    date: "April 2025",
    relevance: 100,
    docHref: "./case-studies/tilequest.html",
    image: "./images/tilequest_1.webp",
    techStack: ["Raspberry Pi", "Flask", "React", "ESP32", "RFID"],
  },
  {
    name: "Flashdash",
    description:
      "An interactive 15-meter LED strip game of 1D ping-pong with dynamic speed, a custom LED matrix display, and spatial audio.",
    status: "Completed",
    date: "2024 - 2025",
    relevance: 100,
    docHref: "./case-studies/flashdash.html",
    image: "./images/flashdash_1.webp",
    techStack: ["ESP32", "C++", "WS2813B LEDs", "3D Printing"],
  },
  {
    name: "Duckslayer",
    description:
      "A 3D game where you clean a bathtub by performing tricks on a bar of soap, fighting off enemy rubber ducks. Winner of Global Game Jam 2025 (Bremen).",
    status: "Completed",
    date: "January 2025",
    relevance: 95,
    docHref: "./case-studies/duckslayer.html",
    image: "./images/game_icon.webp",
    techStack: ["Godot", "GDScript"],
  },
  {
    name: "Modernized Rotary Telephone",
    description:
      "A vintage rotary telephone retrofitted with modern electronics (Bluetooth, battery, custom ringer) to act as an interactive audio guide.",
    status: "Completed",
    date: "2024 - 2025",
    relevance: 90,
    docHref: "./case-studies/modernized-rotary-telephone.html",
    image: "./images/modernized-rotary-telephone_1.webp",
    techStack: ["ESP32", "C++"],
  },
  {
    name: "HueTogether",
    description:
      "A two-player co-op puzzle game where players can only interact with obstacles of their own color. (University Project Winner)",
    status: "Completed",
    date: "November 2024",
    relevance: 75,
    docHref: "./case-studies/huetogether.html",
    image: "./images/huetogether_1.webp",
    techStack: ["Unreal Engine 5", "Blueprints", "C++"],
  },
  {
    name: "Panzer",
    description:
      "A real-time 2D multiplayer top-down tank game with online lobbies and a map builder, also adapted as a Discord Activity.",
    status: "On Hold",
    date: "October 2025",
    relevance: 50,
    docHref: "./case-studies/panzer.html",
    image: "./images/panzer_1.webp",
    techStack: ["React", "TypeScript", "Tailwind CSS", "Socket.io"],
  },
  {
    name: "Aurora",
    description:
      "A modern, visual website editor architected as a monorepo for modularity and scalability.",
    status: "On Hold",
    date: "August 2025",
    relevance: 96,
    docHref: "./case-studies/aurora.html",
    image: "./images/aurora_1.webp",
    techStack: ["Next.js", "TypeScript", "Turborepo", "pnpm", "React"],
  },
  {
    name: "Scribes",
    description:
      "A minimalist documentation site generator for Markdown/MDX with an extensive, hot-swappable theming system.",
    status: "On Hold",
    date: "October 2025",
    relevance: 50,
    docHref: "./case-studies/scribes.html",
    image: "./images/scribes_1.webp",
    techStack: ["Vite", "React", "TypeScript", "Tailwind CSS"],
  },
  {
    name: "Unity ML-Agents Parkour",
    description:
      "Trained multiple AI agents using machine learning to navigate a complex parkour, developing different locomotion strategies.",
    status: "Completed",
    date: "November 2023",
    relevance: 70,
    docHref: "./case-studies/unity-ml-agents-parkour.html",
    image: "./images/unity-ml-agents-parkour_1.webp",
    techStack: ["Unity", "C#", "ML-Agents (Python, TensorFlow)"],
  },
  {
    name: "Unstable Diffusion",
    description:
      "An art project using Stable Diffusion and depth maps rendered from Blender to generate human-like figures from abstract 3D structures.",
    status: "Completed",
    date: "October 2024",
    relevance: 65,
    docHref: "./case-studies/unstable-diffusion.html",
    image: "./images/unstable-diffusion_0.webp",
    techStack: ["Blender", "Python", "Stable Diffusion", "Flux"],
  },
  {
    name: "MI2 3D Integration",
    description:
      "Created, animated, and composited a 3D Blender model into a real-world video, then built a game around it.",
    status: "Completed",
    date: "August 2024",
    relevance: 73,
    docHref: "./case-studies/mi2-3d-integration.html",
    image: "./images/mi2-3d-integration_1.webp",
    techStack: ["Blender", "Unreal Engine 5"],
  },
  {
    name: "Gunners Gauntlet",
    description:
      "A pseudo-3D top-down shooter built with a self-made 3D rendering engine in Java.",
    status: "Completed",
    date: "November 2023",
    relevance: 67,
    docHref: "./case-studies/gunners-gauntlet.html",
    image: "./images/gunners-gauntlet_1.webp",
    techStack: ["Java", "Processing 4"],
  },
  {
    name: "Birkenhirten",
    description:
      "A game where you play as a god protecting moving sheep from preying wolves.",
    status: "Completed",
    date: "December 2023",
    relevance: 55,
    docHref: "./case-studies/birkenhirten.html",
    image: "./images/birkenhirten_1.webp",
    techStack: ["Java", "Processing 4"],
  },
  {
    name: "Artisan2D Game Engine",
    description:
      "A 2D game engine concept, first built in C++ and later re-envisioned as a web-based tool in TypeScript.",
    status: "Archived",
    date: "2024 - 2025",
    relevance: 27,
    docHref: "./case-studies/artisan2d-game-engine.html",
    image: "./images/artisan2d-game-engine_1.webp",
    techStack: ["C++", "TypeScript"],
  },
  {
    name: "Neosliders",
    description:
      "A mobile game where you roll a ball along curves, changing gravity to navigate the course as fast as possible.",
    status: "Completed",
    date: "2022 - 2024",
    relevance: 64,
    docHref: "./case-studies/neosliders.html",
    image: "./images/neosliders_1.webp",
    techStack: ["Unity", "C#"],
  },
  {
    name: "Webbox",
    description:
      "A static site generator that creates full websites from a single config file using pre-built templates.",
    status: "Archived",
    date: "April 2025",
    relevance: 94,
    docHref: "./case-studies/webbox.html",
    image: "./images/webbox_1.webp",
    techStack: ["Nunjucks", "Python", "HTML", "CSS", "JavaScript"],
  },
  /*
  {
    name: "Mining Grid Game",
    description:
      "A 2D platformer focused on procedural world generation and advanced sprite manipulation techniques.",
    status: "Archived",
    date: "March 2025",
    docHref: "./case-studies/mining-grid-game.html",
    techStack: ["Godot", "GDScript"],
  },
  */
  /*
  {
    name: "Calculator Game Engine Dev",
    description:
      "Developed a game engine and several games (2048, Flappy Bird, Chess) from scratch for TI-83 graphing calculators using TI-BASIC.",
    status: "Completed",
    date: "2021 - 2022",
    docHref: "./case-studies/calculator-game-engine-dev.html",
    techStack: ["TI-BASIC"],
  },
  */

  // --- Skills & Tools ---
  /*
  {
    name: "General Unity Development",
    date: "since 2016",
    type: "skill",
    description:
      "Extensive experience in 2D/3D game development, from prototypes to full games.",
  },
  {
    name: "Unity VR Development",
    date: "since 2019",
    type: "skill",
    description:
      "Early experiments and application development for Oculus Quest, including modding.",
  },
  {
    name: "Godot Engine",
    date: "since 2022",
    type: "skill",
    description:
      "Utilized for rapid 2D game prototyping and game jam projects.",
  },
  {
    name: "Unreal Engine",
    date: "since 2020",
    type: "skill",
    description:
      "Experience creating realistic 3D scenes and architectural visualizations.",
  },
  {
    name: "Blender",
    date: "since 2015",
    type: "skill",
    description:
      "Proficient in 3D modeling, animation, rendering, and scripting for various projects.",
  },
  {
    name: "Illustrator & Vector Design",
    date: "since 2018",
    type: "skill",
    description:
      "Creating scalable vector graphics for UI elements, logos, and digital art.",
  },
  {
    name: "Premiere Pro & After Effects",
    date: "since 2015",
    type: "skill",
    description:
      "Video editing and motion graphics for personal projects and presentations.",
  },
  {
    name: "Digital Art & Photo Editing",
    date: "since 2013",
    type: "skill",
    description:
      "Creating textures, concept art, and editing photos using various raster graphics tools.",
  },
  {
    name: "Minecraft Modding",
    date: "since 2013",
    type: "skill",
    description:
      "Designing resource packs, 3D models, animations, and Java-based mods.",
  },
  */
];

export default projects;
