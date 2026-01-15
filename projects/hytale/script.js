"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const pluginInput = document.getElementById("pluginName");
  const authorInput = document.getElementById("author");
  const descInput = document.getElementById("description");
  const iconInput = document.getElementById("iconUpload");
  const fileNameDisplay = document.getElementById("fileName");
  const iconPreviewImg = document.getElementById("iconPreviewImg");
  const toggleAdvancedBtn = document.getElementById("toggleAdvanced");
  const advancedContent = document.getElementById("advancedContent");
  const includeAssetsCheckbox = document.getElementById("includeAssets");
  const assetWarning = document.getElementById("assetWarning");
  const incCmd = document.getElementById("incCmd");
  const incConfig = document.getElementById("incConfig");
  const incEvents = document.getElementById("incEvents");
  const incGui = document.getElementById("incGui");
  const websiteInput = document.getElementById("pluginWebsite");
  const emailInput = document.getElementById("authorEmail");
  const urlInput = document.getElementById("authorUrl");
  const generateBtn = document.getElementById("generateBtn");
  const prevGroup = document.getElementById("prevGroup");
  const prevArtifact = document.getElementById("prevArtifact");
  const prevPackage = document.getElementById("prevPackage");

  let customIconFile = null;

  const GITIGNORE_TEXT = `### Gradle ###
.gradle
build/
!gradle/wrapper/gradle-wrapper.jar
!**/src/main/**/build/
!**/src/test/**/build/

### Hytale ###
run/
ui-docs/

### IntelliJ IDEA ###
.idea/
*.iws
*.iml
*.ipr
out/
!**/src/main/**/out/
!**/src/test/**/out/

### Eclipse ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache
bin/
!**/src/main/**/bin/
!**/src/test/**/bin/

### NetBeans ###
/nbproject/private/
nbbuild/
dist/
nbdist/
.nb-gradle/

### VS Code ###
.vscode/

### Mac OS ###
.DS_Store

### Kotlin ###
.kotlin`;

  const getMainClassCode = (packageId, className, opts) => {
    let imports = [`package ${packageId};`, ``];

    if (opts.cmd) imports.push(`import ${packageId}.commands.ExampleCommand;`);
    if (opts.gui)
      imports.push(`import ${packageId}.commands.ExampleGuiCommand;`);
    if (opts.config) imports.push(`import ${packageId}.config.ExampleConfig;`);
    if (opts.events)
      imports.push(`import ${packageId}.events.ExampleEventHandler;`);

    imports.push(`import com.hypixel.hytale.logger.HytaleLogger;`);
    if (opts.events)
      imports.push(
        `import com.hypixel.hytale.server.core.event.events.player.PlayerReadyEvent;`
      );
    imports.push(`import com.hypixel.hytale.server.core.plugin.JavaPlugin;`);
    imports.push(
      `import com.hypixel.hytale.server.core.plugin.JavaPluginInit;`
    );
    if (opts.config)
      imports.push(`import com.hypixel.hytale.server.core.util.Config;`);

    let bodyFields = [
      `    private static final HytaleLogger LOGGER = HytaleLogger.forEnclosingClass();`,
    ];

    if (opts.config) {
      bodyFields.push(`    private final Config<ExampleConfig> config;`);
    }

    let constructorLines = [`        super(init);`];
    if (opts.config) {
      constructorLines.push(
        `        this.config = this.withConfig("${className}", ExampleConfig.CODEC);`
      );
    }

    let methods = [];

    if (opts.config) {
      methods.push(`    public Config<ExampleConfig> getConfig() {
        return config;
    }`);
    }

    let setupLogic = [
      `        LOGGER.atInfo().log("Setting up plugin " + getName());`,
      ``,
    ];

    if (opts.config) setupLogic.push(`        saveConfig();`);
    if (opts.cmd || opts.gui) setupLogic.push(`        registerCommands();`);
    if (opts.events) setupLogic.push(`        registerEvents();`);

    setupLogic.push(
      ``,
      `        LOGGER.atInfo().log("Plugin " + getName() + " initialized");`
    );

    let helperMethods = [];

    if (opts.config) {
      helperMethods.push(`    private void saveConfig() {
        this.config.save();
    }`);
    }

    if (opts.cmd || opts.gui) {
      let cmdReg = [];
      let arg = opts.config ? "config" : "";

      if (opts.cmd) {
        cmdReg.push(
          `        this.getCommandRegistry().registerCommand(new ExampleCommand(${arg}));`
        );
      }
      if (opts.gui) {
        cmdReg.push(
          `        this.getCommandRegistry().registerCommand(new ExampleGuiCommand(${arg}));`
        );
      }

      helperMethods.push(`    private void registerCommands() {
${cmdReg.join("\n")}
    }`);
    }

    if (opts.events) {
      helperMethods.push(`    private void registerEvents() {
        this.getEventRegistry().registerGlobal(PlayerReadyEvent.class, ExampleEventHandler::onPlayerReady);
    }`);
    }

    let classContent = [];

    // Fields
    classContent.push(bodyFields.join("\n"));

    // Constructor
    classContent.push(`    public ${className}(JavaPluginInit init) {
${constructorLines.join("\n")}
    }`);

    // Getters
    if (methods.length > 0) {
      classContent.push(methods.join("\n\n"));
    }

    // Setup
    classContent.push(`    @Override
    protected void setup() {
${setupLogic.join("\n")}
    }`);

    // Helpers
    if (helperMethods.length > 0) {
      classContent.push(helperMethods.join("\n\n"));
    }

    return `${imports.join("\n")}

public class ${className} extends JavaPlugin {

${classContent.join("\n\n")}
}`;
  };

  const getExampleConfigCode = (packageId) => `package ${packageId}.config;

import com.hypixel.hytale.codec.Codec;
import com.hypixel.hytale.codec.KeyedCodec;
import com.hypixel.hytale.codec.builder.BuilderCodec;

public final class ExampleConfig {

    public static final BuilderCodec<ExampleConfig> CODEC = BuilderCodec.builder(ExampleConfig.class, ExampleConfig::new)
            .append(new KeyedCodec<>("JoinMessage", Codec.STRING),
                    (config, value, ignored) -> config.joinMessage = value,
                    (config, ignored) -> config.joinMessage)
            .add()
            .build();

    private String joinMessage = "Hello from the ExamplePlugin Config!";

    public String joinMessage() {
        return joinMessage;
    }
}`;

  const getExampleCommandCode = (packageId, hasConfig) => {
    if (hasConfig) {
      return `package ${packageId}.commands;

import ${packageId}.config.ExampleConfig;
import com.hypixel.hytale.protocol.GameMode;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.CommandBase;
import com.hypixel.hytale.server.core.util.Config;

public final class ExampleCommand extends CommandBase {

    private final Config<ExampleConfig> config;

    public ExampleCommand(Config<ExampleConfig> config) {
        super("example", "A simple example command");
        this.config = config;
        this.setPermissionGroup(GameMode.Adventure);
    }

    @Override
    protected void executeSync(CommandContext context) {
        context.sendMessage(Message.raw(config.get().joinMessage()));
    }
}`;
    } else {
      return `package ${packageId}.commands;

import com.hypixel.hytale.protocol.GameMode;
import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.command.system.CommandContext;
import com.hypixel.hytale.server.core.command.system.basecommands.CommandBase;

public final class ExampleCommand extends CommandBase {

    public ExampleCommand() {
        super("example", "A simple example command");
        this.setPermissionGroup(GameMode.Adventure);
    }

    @Override
    protected void executeSync(CommandContext context) {
        context.sendMessage(Message.raw("Hello from ExamplePlugin!"));
    }
}`;
    }
  };

  const getExampleGuiCommandCode = (packageId, hasConfig) => {
    let imports = [
      `package ${packageId}.commands;`,
      ``,
      `import java.util.concurrent.CompletableFuture;`,
      ``,
    ];

    if (hasConfig) imports.push(`import ${packageId}.config.ExampleConfig;`);
    imports.push(`import ${packageId}.gui.ExampleGui;`);
    imports.push(`import com.hypixel.hytale.component.Ref;`);
    imports.push(`import com.hypixel.hytale.component.Store;`);
    imports.push(`import com.hypixel.hytale.protocol.GameMode;`);
    imports.push(
      `import com.hypixel.hytale.server.core.command.system.CommandContext;`
    );
    imports.push(
      `import com.hypixel.hytale.server.core.command.system.basecommands.AbstractAsyncCommand;`
    );
    imports.push(
      `import com.hypixel.hytale.server.core.entity.entities.Player;`
    );
    imports.push(`import com.hypixel.hytale.server.core.universe.PlayerRef;`);
    imports.push(`import com.hypixel.hytale.server.core.universe.world.World;`);
    imports.push(
      `import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;`
    );
    if (hasConfig)
      imports.push(`import com.hypixel.hytale.server.core.util.Config;`);

    let field = hasConfig
      ? `    private final Config<ExampleConfig> config;`
      : ``;
    let ctorParam = hasConfig ? `Config<ExampleConfig> config` : ``;
    let ctorAssign = hasConfig ? `        this.config = config;` : ``;
    let msgLogic = hasConfig
      ? `config.get().joinMessage()`
      : `"Welcome to the GUI!"`;

    return `${imports.join("\n")}

public final class ExampleGuiCommand extends AbstractAsyncCommand {

${field}

    public ExampleGuiCommand(${ctorParam}) {
        super("examplegui", "Opens the example GUI");
${ctorAssign}
        this.setPermissionGroup(GameMode.Adventure);
    }

    @Override
    protected CompletableFuture<Void> executeAsync(CommandContext context) {
        if (!(context.sender() instanceof Player player)) {
            return CompletableFuture.completedFuture(null);
        }

        player.getWorldMapTracker().tick(0);

        Ref<EntityStore> ref = player.getReference();
        if (ref == null || !ref.isValid()) {
            return CompletableFuture.completedFuture(null);
        }

        Store<EntityStore> store = ref.getStore();
        World world = store.getExternalData().getWorld();

        return CompletableFuture.runAsync(() -> {
            PlayerRef playerRef = store.getComponent(ref, PlayerRef.getComponentType());
            if (playerRef != null) {
                player.getPageManager()
                        .openCustomPage(ref, store,
                                new ExampleGui(playerRef, ${msgLogic}));
            }
        }, world);
    }
}`;
  };

  const getExampleEventCode = (packageId) => `package ${packageId}.events;

import com.hypixel.hytale.server.core.Message;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.event.events.player.PlayerReadyEvent;

public final class ExampleEventHandler {

    public static void onPlayerReady(PlayerReadyEvent event) {
        Player player = event.getPlayer();
        player.sendMessage(Message.raw("Welcome, " + player.getDisplayName() + "!"));
    }
}`;

  const getExampleGuiCode = (packageId, uiPath) => `package ${packageId}.gui;

import com.hypixel.hytale.codec.builder.BuilderCodec;
import com.hypixel.hytale.component.Ref;
import com.hypixel.hytale.component.Store;
import com.hypixel.hytale.protocol.packets.interface_.CustomPageLifetime;
import com.hypixel.hytale.server.core.entity.entities.player.pages.InteractiveCustomUIPage;
import com.hypixel.hytale.server.core.ui.builder.UICommandBuilder;
import com.hypixel.hytale.server.core.ui.builder.UIEventBuilder;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.storage.EntityStore;

public final class ExampleGui extends InteractiveCustomUIPage<ExampleGui.ExampleGuiData> {

    private final String message;

    public ExampleGui(PlayerRef playerRef, String message) {
        super(playerRef, CustomPageLifetime.CanDismiss, ExampleGuiData.CODEC);
        this.message = message;
    }

    @Override
    public void build(Ref<EntityStore> ref,
                      UICommandBuilder uiCommandBuilder,
                      UIEventBuilder uiEventBuilder,
                      Store<EntityStore> store) {

        uiCommandBuilder.append("${uiPath}");
        uiCommandBuilder.set("#WelcomeMessage.Text", message);
    }

    public static final class ExampleGuiData {
        public static final BuilderCodec<ExampleGuiData> CODEC =
                BuilderCodec.builder(ExampleGuiData.class, ExampleGuiData::new).build();
    }
}`;

  const getUIFileContent = () => `$C = "../Common.ui";

$C.@PageOverlay {

  $C.@Container {
    Anchor: (Width: 400, Height: 300);

    #Title {
      Group {
        $C.@Title {
          @Text = "EXAMPLE GUI";
        }
      }
    }

    #Content {
      LayoutMode: Top;
      Padding: (Top: 20, Left: 20, Right: 20);

      Label #WelcomeMessage {
        Text: "Loading...";
        Style: (
          FontSize: 18,
          TextColor: #ffffffff,
          Wrap: true,
          RenderBold: true,
          Alignment: Center
        );
        Padding: (Bottom: 20);
      }

      Label {
        Text: "This GUI uses InteractiveCustomUIPage and UICommandBuilder.";
        Style: (
          FontSize: 14,
          TextColor: #ccccccff,
          Wrap: true,
          Alignment: Center
        );
      }
    }
  }
}

$C.@BackButton {}`;

  const toKebabCase = (str) =>
    str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

  // Strict sanitizer: remove anything that isn't alphanumeric (removes hyphens for Java Classes)
  const sanitizePascal = (str) => str.replace(/[^a-zA-Z0-9]/g, "");

  function updatePreview() {
    const rawPlugin = pluginInput.value || "ExamplePlugin";
    const rawAuthor = authorInput.value || "ExamplePublisher";

    // Used for Java Class names (No hyphens)
    const pluginPascal = sanitizePascal(rawPlugin);
    const authorPascal = sanitizePascal(rawAuthor);

    prevGroup.textContent = `com.${authorPascal.toLowerCase()}`;
    // Artifact ID preserves hyphens but makes them lowercase (e.g. My-Plugin -> my-plugin)
    prevArtifact.textContent = toKebabCase(rawPlugin);
    prevPackage.textContent = `com.${authorPascal.toLowerCase()}.${pluginPascal.toLowerCase()}`;
  }

  function checkAssetWarning() {
    const assetsEnabled = includeAssetsCheckbox.checked;
    const guiEnabled = incGui.checked;
    const hasCustomIcon = customIconFile !== null;
    if (!assetsEnabled && (guiEnabled || hasCustomIcon)) {
      assetWarning.classList.remove("hidden");
    } else {
      assetWarning.classList.add("hidden");
    }
  }

  // --- Strict Input Listeners ---
  function enforceSafeInput(e) {
    let val = e.target.value;

    // 1. Auto-convert spaces to hyphens
    val = val.replace(/\s/g, "-");

    // 2. Remove anything that isn't alphanumeric or hyphen (removes underscore)
    const clean = val.replace(/[^a-zA-Z0-9\-]/g, "");

    if (val !== clean || e.target.value !== val) {
      e.target.value = clean;
    }

    e.target.classList.remove("input-error");
    updatePreview();
  }

  pluginInput.addEventListener("input", enforceSafeInput);
  authorInput.addEventListener("input", enforceSafeInput);

  // --- End Strict Input Listeners ---

  iconInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      customIconFile = file;
      fileNameDisplay.textContent = file.name;
      iconPreviewImg.src = URL.createObjectURL(file);
    } else {
      customIconFile = null;
      fileNameDisplay.textContent = "Using default image";
      iconPreviewImg.src = "pack.png";
    }
    checkAssetWarning();
  });

  toggleAdvancedBtn.addEventListener("click", () => {
    advancedContent.classList.toggle("hidden");
    toggleAdvancedBtn.classList.toggle("open");
    const span = toggleAdvancedBtn.querySelector("span");
    span.textContent = advancedContent.classList.contains("hidden")
      ? "Advanced Options"
      : "Hide Advanced Options";
  });

  includeAssetsCheckbox.addEventListener("change", checkAssetWarning);
  incGui.addEventListener("change", checkAssetWarning);
  updatePreview();

  generateBtn.addEventListener("click", async () => {
    // --- Validation Before Generation ---
    const rawPluginName = pluginInput.value.trim();
    const rawAuthorName = authorInput.value.trim();

    let hasError = false;

    // Check 1: Empty
    if (!rawPluginName) {
      pluginInput.classList.add("input-error");
      hasError = true;
    }
    if (!rawAuthorName) {
      authorInput.classList.add("input-error");
      hasError = true;
    }

    // Check 2: Java Class names cannot start with a number
    if (/^\d/.test(rawPluginName)) {
      alert("Plugin name cannot start with a number.");
      pluginInput.classList.add("input-error");
      hasError = true;
    }

    if (hasError) {
      return; // Stop generation
    }
    // --- End Validation ---

    generateBtn.classList.add("loading");
    generateBtn.disabled = true;
    const originalBtnText = generateBtn.querySelector(".btn-text").textContent;
    generateBtn.querySelector(".btn-text").textContent = "Building...";
    await new Promise((r) => setTimeout(r, 100));

    let imageBlob;
    if (customIconFile) {
      imageBlob = customIconFile;
    } else {
      try {
        const response = await fetch("pack.png");
        if (!response.ok) throw new Error("Default pack.png not found");
        imageBlob = await response.blob();
      } catch (error) {
        alert("Error: Could not load default 'pack.png'.");
        resetButton(originalBtnText);
        return;
      }
    }

    try {
      const zip = new JSZip();

      // For Java Classes, we MUST remove hyphens (My-Plugin -> MyPlugin)
      const pluginClassName = sanitizePascal(rawPluginName) || "ExamplePlugin";
      const authorClassName =
        sanitizePascal(rawAuthorName) || "ExamplePublisher";

      const description =
        descInput.value.trim() || "A template for Hytale modding.";

      const includeAssets = includeAssetsCheckbox.checked;
      const flags = {
        cmd: incCmd.checked,
        config: incConfig.checked,
        events: incEvents.checked,
        gui: incGui.checked,
      };

      const website = websiteInput.value.trim();
      const email = emailInput.value.trim();
      const authorUrl = urlInput.value.trim();

      const settingsName = toKebabCase(rawPluginName);
      const packageId = pluginClassName.toLowerCase();
      const fullPackage = `com.${authorClassName.toLowerCase()}.${packageId}`;
      const dirPath = fullPackage.replace(/\./g, "/");

      const authorObj = { Name: authorClassName };
      if (email) authorObj.Email = email;
      if (authorUrl) authorObj.Url = authorUrl;

      // Manifest uses the raw name (with hyphens if typed), Class uses sanitized
      const manifestObj = {
        Group: authorClassName,
        Name: rawPluginName,
        Version: "1.0.0",
        Description: description,
        Authors: [authorObj],
        ServerVersion: "*",
        Main: `${fullPackage}.${pluginClassName}`,
        IncludesAssetPack: includeAssets,
        Dependencies: {},
        OptionalDependencies: {},
        DisabledByDefault: false,
      };

      if (website) manifestObj.Website = website;
      zip.file(
        "src/main/resources/manifest.json",
        JSON.stringify(manifestObj, null, 2)
      );

      zip.file(
        "build.gradle",
        `plugins {
    id 'java'
    id 'org.jetbrains.gradle.plugin.idea-ext' version '1.3'
}

group = project.group
version = project.plugin_version

java {
    toolchain.languageVersion = JavaLanguageVersion.of(java_version)
}

repositories {
    mavenCentral()
}

def hytaleHome = System.getProperty("user.home") + "/AppData/Roaming/Hytale"
def hytaleInstall = "\${hytaleHome}/install"

dependencies {
    implementation(files("\${hytaleInstall}/\${hytale_patchline}/package/game/\${hytale_version}/Server/HytaleServer.jar"))
}

tasks.register('deployPlugin', Copy) {
    dependsOn jar
    from jar.archiveFile
    into "\${hytaleHome}/UserData/Mods"
}

idea.project.settings.runConfigurations {
    'HytaleServer'(org.jetbrains.gradle.ext.Application) {
        mainClass = 'com.hypixel.hytale.Main'
        moduleName = project.idea.module.name + '.main'
        jvmArgs = [
                "--enable-native-access=ALL-UNNAMED",
                "--add-opens", "java.base/java.lang=ALL-UNNAMED",
                "--add-opens", "java.base/java.util=ALL-UNNAMED",
                "--add-opens", "java.base/sun.misc=ALL-UNNAMED"
        ].join(" ")
        programParameters =
                "--assets=\${hytaleInstall}/\${hytale_patchline}/package/game/\${hytale_version}/Assets.zip " +
                "--mods=\${file("src/main").absolutePath} " +
                "--auth-mode authenticated"
        workingDirectory = file("$projectDir/run").absolutePath
    }
}`
      );

      zip.file(
        "gradle.properties",
        `# TECHNICAL METADATA
group=com.${authorClassName.toLowerCase()}
plugin_version=1.0.0

# BUILD SETTINGS
java_version=25

# HYTALE PATH MAPPING
hytale_patchline=release
hytale_version=latest`
      );

      zip.file("settings.gradle", `rootProject.name = '${settingsName}'`);
      zip.file(".gitignore", GITIGNORE_TEXT);
      zip.folder("run");

      if (includeAssets) {
        const uiBasePath = "src/main/resources/Common/UI/Custom";
        const uiPagesPath = `${uiBasePath}/Pages`;

        // Filenames should use safe identifiers
        const pngName = `${authorClassName}_${pluginClassName}.png`;
        zip.file(`${uiBasePath}/${pngName}`, imageBlob);
        zip.folder(uiPagesPath);

        if (flags.gui) {
          const uiFileName = `${authorClassName}_${pluginClassName}_Gui.ui`;
          zip.file(`${uiPagesPath}/${uiFileName}`, getUIFileContent());
        }
      }

      zip.file(
        `src/main/java/${dirPath}/${pluginClassName}.java`,
        getMainClassCode(fullPackage, pluginClassName, flags)
      );

      if (flags.config) {
        zip.file(
          `src/main/java/${dirPath}/config/ExampleConfig.java`,
          getExampleConfigCode(fullPackage)
        );
      }
      if (flags.cmd) {
        zip.file(
          `src/main/java/${dirPath}/commands/ExampleCommand.java`,
          getExampleCommandCode(fullPackage, flags.config)
        );
      }
      if (flags.events) {
        zip.file(
          `src/main/java/${dirPath}/events/ExampleEventHandler.java`,
          getExampleEventCode(fullPackage)
        );
      }
      if (flags.gui) {
        const uiFileName = `${authorClassName}_${pluginClassName}_Gui.ui`;
        const uiRelPath = `Pages/${uiFileName}`;
        zip.file(
          `src/main/java/${dirPath}/gui/ExampleGui.java`,
          getExampleGuiCode(fullPackage, uiRelPath)
        );
        zip.file(
          `src/main/java/${dirPath}/commands/ExampleGuiCommand.java`,
          getExampleGuiCommandCode(fullPackage, flags.config)
        );
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${settingsName}.zip`);
    } catch (err) {
      console.error(err);
      alert("An error occurred during ZIP generation.");
    } finally {
      resetButton(originalBtnText);
    }
  });

  function resetButton(text) {
    generateBtn.classList.remove("loading");
    generateBtn.disabled = false;
    generateBtn.querySelector(".btn-text").textContent = text;
  }
});
