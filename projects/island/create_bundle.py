# C:\Scripts\create_bundle.py (Upgraded Version for Modern Web Projects)
import os
import pyperclip

# --- Configuration ---
ROOT_DIR = "."  # Use the current directory as the root
OUTPUT_FILENAME = "project_bundle.txt"

# --- List 1: Total Ignore Directories ---
# These directories will NOT appear in the tree OR the content bundle.
# Ideal for build outputs, caches, dependencies, and sensitive folders.
TOTAL_IGNORE_DIRS = {
    # General
    ".git",
    ".vscode",
    "__pycache__",
    ".DS_Store",
    # Python
    ".venv",
    "instance",
    ".mypy_cache",
    # Node.js / JS Frameworks
    "node_modules",
    "dist",
    "build",
    ".vite",
    # --- Project Specific Additions ---
    ".next",  # Next.js build output (CRITICAL to ignore)
    ".turbo",  # Turborepo cache (CRITICAL to ignore)
}

# --- List 2: Total Ignore Files ---
# These specific files will NOT appear in the tree OR the content bundle.
# Ideal for lock files, environment variables, and the script itself.
TOTAL_IGNORE_FILES = {
    OUTPUT_FILENAME,
    "create_bundle.py",  # Or whatever you name this script
    "pc.py",  # The name you used in your file tree
    "tempCodeRunnerFile.py",
    # Environment & Lock Files
    ".env",
    ".env.local",
    "pnpm-lock.yaml",  # Can be very large
    "yarn.lock",
    "package-lock.json",
}

# --- List 3: Total Ignore Extensions (NEW) ---
# Files with these extensions will NOT appear in the tree OR the content bundle.
# Ideal for logs, source maps, and other generated artifacts.
TOTAL_IGNORE_EXTENSIONS = {
    ".log",
    ".js.map",
    ".css.map",
    ".tsbuildinfo",
    ".lock",
    ".DS_Store",
}

# --- List 4: Content-Only Ignore Extensions ---
# Files with these extensions WILL appear in the project tree, but their
# content will NOT be included in the bundle.
# Ideal for images, fonts, and other binary assets where only the filename is needed.
CONTENT_IGNORE_EXTENSIONS = {
    # Images
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".webp",
    # Documents & Archives
    ".pdf",
    ".zip",
    ".gz",
    ".tar",
    ".rar",
    # Audio & Video
    ".mp3",
    ".mp4",
    ".mov",
    ".avi",
    # Fonts
    ".woff",
    ".woff2",
    ".eot",
    ".ttf",
    ".otf",
    # 3D Models / Graphics
    ".glb",
    ".gltf",
    ".hdr",
    ".obj",
    ".fbx",
    # Design Files
    ".afdesign",
    ".psd",
    ".ai",
}
# --- End Configuration ---


def generate_project_tree(root_dir, ignore_dirs, ignore_files, ignore_extensions):
    """
    Generates a clean, visual directory tree.
    It completely ignores anything in TOTAL_IGNORE lists.
    """
    tree_lines = [f"{os.path.basename(os.path.abspath(root_dir))}/"]

    def recurse_tree(directory, prefix=""):
        try:
            entries = sorted(os.listdir(directory))
        except OSError:
            return

        # Filter out all ignored items
        filtered_entries = []
        for entry in entries:
            if entry in ignore_dirs or entry in ignore_files:
                continue
            if any(entry.endswith(ext) for ext in ignore_extensions):
                continue
            filtered_entries.append(entry)

        # Separate directories and files to process dirs first
        dirs = [
            e for e in filtered_entries if os.path.isdir(os.path.join(directory, e))
        ]
        files = [
            e for e in filtered_entries if os.path.isfile(os.path.join(directory, e))
        ]
        all_entries = dirs + files

        for i, entry in enumerate(all_entries):
            path = os.path.join(directory, entry)
            is_last = i == (len(all_entries) - 1)
            connector = "└── " if is_last else "├── "
            tree_lines.append(
                f"{prefix}{connector}{entry}{'/' if os.path.isdir(path) else ''}"
            )

            if os.path.isdir(path):
                new_prefix = prefix + ("    " if is_last else "│   ")
                recurse_tree(path, new_prefix)

    recurse_tree(root_dir)
    return "\n".join(tree_lines)


def gather_file_contents(
    root_dir, ignore_dirs, ignore_files, total_ignore_ext, content_ignore_ext
):
    """
    Gathers the contents of all files, applying all ignore rules.
    """
    content_parts = []
    for root, dirs, files in os.walk(root_dir, topdown=True):
        # Prune fully ignored directories from traversal
        dirs[:] = [d for d in dirs if d not in ignore_dirs]

        for filename in sorted(files):
            # Skip fully ignored files by name or extension
            if filename in ignore_files:
                continue
            if any(filename.endswith(ext) for ext in total_ignore_ext):
                continue

            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, root_dir).replace(os.sep, "/")

            # Skip content for content-only ignored extensions
            if any(filename.endswith(ext) for ext in content_ignore_ext):
                content_parts.append(
                    f"--- FILE: {relative_path} (Content omitted due to extension) ---\n"
                )
                continue

            content_parts.append(f"--- START OF FILE {relative_path} ---")
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content_parts.append(f.read())
            except Exception as e:
                content_parts.append(f"*** Error reading file: {e} ***")
            content_parts.append(f"--- END OF FILE {relative_path} ---\n")

    return "\n".join(content_parts)


def main():
    """Main function to generate and bundle project info."""
    print("🚀 Starting project bundling process...")

    print("🌳 Generating project structure...")
    tree_output = generate_project_tree(
        ROOT_DIR, TOTAL_IGNORE_DIRS, TOTAL_IGNORE_FILES, TOTAL_IGNORE_EXTENSIONS
    )
    full_tree_text = (
        f"--- START OF FILE {OUTPUT_FILENAME} ---\n\n"
        "--- PROJECT STRUCTURE ---\n\n"
        f"{tree_output}\n\n"
        "--- END OF PROJECT STRUCTURE ---\n\n"
    )

    print("📚 Gathering file contents...")
    file_contents = gather_file_contents(
        ROOT_DIR,
        TOTAL_IGNORE_DIRS,
        TOTAL_IGNORE_FILES,
        TOTAL_IGNORE_EXTENSIONS,
        CONTENT_IGNORE_EXTENSIONS,
    )
    final_bundle = full_tree_text + file_contents

    print(f"💾 Saving bundle to '{OUTPUT_FILENAME}'...")
    with open(OUTPUT_FILENAME, "w", encoding="utf-8") as f:
        f.write(final_bundle)

    # --- Final Summary ---
    line_count = len(final_bundle.splitlines())
    file_size_bytes = os.path.getsize(OUTPUT_FILENAME)
    file_size_kb = file_size_bytes / 1024

    print("\n" + "=" * 50)
    print("✨ Process Complete! ✨")
    print(f"  - Output file: '{OUTPUT_FILENAME}'")
    print(f"  - Total lines: {line_count:,}")
    print(f"  - File size: {file_size_kb:.2f} KB")
    print("=" * 50 + "\n")

    try:
        pyperclip.copy(final_bundle)
        print("📋✅ Project bundle successfully copied to clipboard!")
    except pyperclip.PyperclipException:
        print(
            "📋❌ Could not copy to clipboard. "
            f"Please copy contents from '{OUTPUT_FILENAME}'."
        )


if __name__ == "__main__":
    main()
