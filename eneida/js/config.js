// js/config.js - Configuration constants

export const CORRECT_PASSWORD = '1982'; // IMPORTANT: Use your password
export const MAX_HISTORY = 50;
export const MAX_TRACE_LOG = MAX_HISTORY * 2; // Limit trace log size

// Initial Typewriter Speed Settings (can be changed via 'config' command)
export let TYPEWRITER_BASE_DELAY = 2;
export let TYPEWRITER_RANDOM_FACTOR = 5;

export function setTypewriterSpeed(base, random) {
    TYPEWRITER_BASE_DELAY = base;
    TYPEWRITER_RANDOM_FACTOR = random;
}

export const WELCOME_MESSAGE = [
    "Initializing Secure Shell...",
    "Connection established.",
    "Authenticating user...",
    "Access Granted.",
    "Welcome, Operator.",
    "Type 'help' to see available commands.",
    ""
];

// --- ASCII Art Frames --- (Replace with your own!)
export const asciiFrames = [
    `         
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
    `
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
    `
       ▄██▓█████ ██▒▄▄▄▒      ▄██▓█████  ▄▓  ██▓██████▄     ▄██▓█████ 
      ██▓    ██▓ ██▓▀▀▀██▄   ██▓    ██▓ ██▓  ██▓   ▀██▓   ██▓    ██▓ 
        ██▓    █▀  ██▓   ██▓   ██▓    █▀  ██▓▌ ██▓    ██▓   ██▓    ██▓ 
     ▄██▓▄▄▄     ██▓   ██▓  ▄██▓▄▄▄     ██▓▌ ██▓    ██▓   ██▓    ██▓ 
    ▀▀██▓▀▀▀     ██▓   ██▓ ▀▀██▓▀▀▀     ██▓▌ ██▓    ██▓ ▀██████████▓ 
     ██▓    █▄  ██▓   ██▓   ██▓    █▄  ██▓  ██▓    ██▓   ██▓    ██▓ 
      ██▓    ██▓ ██▓   ██▓   ██▓    ██▓ ██▓  ██▓   ▄██▓   ██▓    ██▓ 
      ██▓███████  ▀█   ▀▀    ██▓███████ ▀█   ██▓████▀    ██▓    ▀▀  
                                                                     
    `,
    `
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
    `
       ▄▓███████ ██▒▓▓▒▒      ▄▓███████  ▄▓  ██▓██████▓     ▄▓███████ 
      ██▓    ██▓ ██▓▒▒▓██▄   ██▓    ██▓ ██▓  ██▓   ▀██▓   ██▓    ██▓ 
      ██▓    █▀  ██▓   ██▓   ██▓    █▀  ██▓▌ ██▓    ██▓   ██▓    ██▓ 
     ▄██▓▓▓▓     ██▓   ██▓  ▄██▓▓▓▓     ██▓▌ ██▓    ██▓   ██▓    ██▓ 
    ▀▀██▓▀▀▀     ██▓   ██▓ ▀▀██▓▀▀▀     ██▓▌ ██▓    ██▓ ▀██████████▓ 
      ██▓    █▄  ██▓   ██▓   ██▓    █▄  ██▓  ██▓    ██▓   ██▓    ██▓ 
      ██▓    ██▓ ██▓   ██▓   ██▓    ██▓ ██▓  ██▓   ▄██▓   ██▓    ██▓ 
      ██▓███████  ▀█   ▀▀    ██▓███████ ▀█   ██▓████▀    ██▓    ▀▀  
                                                                     
    `,
    `
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
    `
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
    `
       ▄▓████████ ███▓▄▄▓      ▄▓████████  ▄▓  ████████▓     ▄▓████████ 
      ███    ███ ███▓▀▀▓██▄   ███    ███ ███  ███   ▀███   ███    ███ 
     ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▓▓▓     ███   ███  ▄███▓▓▓     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
       ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   ▀▀    ██████████ ▀█   ████████▀    ███    ▀▀  
                                                                     
    `,
    `
       ▄████████ ███▄▄▄▄      ▄████████  ▄█  ████████▄     ▄████████ 
      ███    ███ ███▀▀▀██▄   ███    ███ ███  ███   ▀███   ███    ███ 
      ███    █▀  ███   ███   ███    █▀  ███▌ ███    ███   ███    ███ 
     ▄███▄▄▄     ███   ███  ▄███▄▄▄     ███▌ ███    ███   ███    ███ 
    ▀▀███▀▀▀     ███   ███ ▀▀███▀▀▀     ███▌ ███    ███ ▀███████████ 
      ███    █▄  ███   ███   ███    █▄  ███  ███    ███   ███    ███ 
      ███    ███ ███   ███   ███    ███ ███  ███   ▄███   ███    ███ 
      ██████████  ▀█   █▀    ██████████ █▀   ████████▀    ███    █▀  
                                                                     
    `,
];

// --- Boot Sequence Messages --- (Customize as desired)
export const bootMessages = [
    { text: "BIOS ROM checksum check ....................... [PASS]", delay: 80 },
    { text: "Initializing system hardware .................. [OK]", delay: 120 },
    { text: "Detecting CPU type ............................ [Quantum Entanglement Processor XG-7]", delay: 80 },
    { text: "Detecting RAM banks ........................... [128 ZB HyperRAM @ 10 THz]", delay: 80 },
    { text: "Detecting NVMe drives ......................... [SYSTEM_ROOT] [DATA_VAULT]", delay: 80, style: "success" },
    { text: "Scanning for peripheral nodes ................. [7 FOUND]", delay: 120 },
    { text: "Loading kernel module: quantum_net.ko ......... [LOADED]", delay: 150 },
    { text: "Loading kernel module: crypto_hash_v3.ko ...... [LOADED]", delay: 80 },
    { text: "Loading kernel module: secure_shell_daemon.ko . [LOADED]", delay: 80, style: "success"},
    { text: "Mounting virtual filesystem /dev/portfolio .... [MOUNTED]", delay: 200 },
    { text: "Starting primary network interface (q_eth0) ... ", delay: 250, wait: true },
    { text: "Link detected: 1 Tbps Quantum Fiber", delay: 400, style: "success", indent: true },
    { text: "Acquiring IPv8 address ........................ [ASSIGNED]", delay: 350, style: "success", indent: true },
    { text: "Establishing secure connection to uplink ...... ", delay: 500, wait: true },
    { text: "[SECURE CONNECT ESTABLISHED - AES-1024-Q]", delay: 400, style: "important", indent: true },
    { text: "Running integrity checks on core system files.. ", delay: 250, wait: true },
    { text: "WARNING: Signature mismatch on /bin/auth", delay: 600, style: "warning", indent: true },
    { text: "Attempting self-repair via blockchain ledger... [FAILED - HASH MISMATCH]", delay: 800, style: "error", indent: true },
    { text: "System stability potentially compromised. Audit recommended.", delay: 150, style: "warning" },
    { text: "Initializing Secure Terminal Environment ...... [OK]", delay: 250, style: "success" },
    { text: "Ready for user authentication.", delay: 400, style: "important" },
];