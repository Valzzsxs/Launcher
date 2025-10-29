type ManifestDevice = {
  display?: boolean;
  name: string;
  description?: string;
  link?: string;
  family: string;
  id: string;
};

type ManifestData = Record<string, ManifestDevice[]>;

type WebInstallButtonElement = HTMLElement & {
  manifest?: unknown;
};

type SelectionState = {
  releaseValue: string;
  releaseLabel: string;
  vendor: string;
  deviceId: string;
  deviceName: string;
};

const releaseOptions = [
  {
    value: "Release",
    label: "Last Release",
    description: "Stable builds recommended for everyday use.",
    cta: "Use Last Release"
  },
  {
    value: "Beta",
    label: "Beta Release",
    description: "Early-access updates with the newest features.",
    cta: "Use Beta Release"
  }
] as const;

const ensureSelectionStyles = () => {
  if (document.getElementById("webflasher-selection-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "webflasher-selection-style";
  style.textContent = `
    .selection-card {
      border-radius: var(--radius-md);
      border: 1px solid rgba(0, 221, 0, 0.2);
      background: rgba(28, 32, 36, 0.8);
      display: grid;
      gap: 12px;
      padding: 20px;
      text-align: left;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .selection-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 221, 0, 0.4);
    }
    .selection-card strong {
      font-size: 1.1rem;
    }
    .selection-card[data-selected="true"] {
      border-color: rgba(224, 210, 4, 0.7);
      box-shadow: 0 0 0 2px rgba(224, 210, 4, 0.25);
    }
    .selection-card:focus-visible {
      outline: 2px solid rgba(224, 210, 4, 0.7);
      outline-offset: 3px;
    }
    .selection-card__cta {
      justify-self: start;
      font-size: 0.9rem;
    }
  `;
  document.head.appendChild(style);
};

const createSelectionCard = (config: {
  title: string;
  subtitle?: string;
  value: string;
  cta: string;
}): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "selection-card";
  button.dataset.value = config.value;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <strong>${config.title}</strong>
    ${config.subtitle ? `<p>${config.subtitle}</p>` : ""}
    <span class="button button--ghost selection-card__cta">${config.cta}</span>
  `;
  return button;
};

document.addEventListener("DOMContentLoaded", () => {
  ensureSelectionStyles();

  const releaseContainer = document.querySelector<HTMLElement>("[data-release-container]");
  const vendorContainer = document.querySelector<HTMLElement>("[data-vendor-container]");
  const vendorPlaceholder = document.querySelector<HTMLElement>("[data-vendor-empty]");
  const deviceContainer = document.querySelector<HTMLElement>("[data-device-container]");
  const descriptionTarget = document.querySelector<HTMLElement>("[data-device-description]");
  const linkTarget = document.querySelector<HTMLAnchorElement>("[data-device-link]");
  const vendorSection = document.querySelector<HTMLElement>("[data-vendor-section]");
  const deviceSection = document.querySelector<HTMLElement>("[data-device-section]");
  const installSection = document.querySelector<HTMLElement>("[data-install-section]");
  const installButton = document.querySelector<WebInstallButtonElement>("esp-web-install-button");
  const manifestSummary = document.querySelector<HTMLElement>("[data-manifest-summary]");

  if (
    !releaseContainer ||
    !vendorContainer ||
    !deviceContainer ||
    !installButton ||
    !manifestSummary
  ) {
    return;
  }

  const vendorMap = new Map<string, ManifestDevice[]>();
  const vendorDevices = new Map<string, ManifestDevice[]>();
  const summaryFallback = "Selection pending...";
  const state: SelectionState = {
    releaseValue: releaseOptions[0]?.value ?? "Release",
    releaseLabel: releaseOptions[0]?.label ?? "Release",
    vendor: "",
    deviceId: "",
    deviceName: ""
  };

  let releaseCards: HTMLButtonElement[] = [];
  let vendorCards: HTMLButtonElement[] = [];
  let deviceCards: HTMLButtonElement[] = [];
  let currentManifestUrl: string | null = null;

  const revokeManifestUrl = () => {
    if (currentManifestUrl) {
      URL.revokeObjectURL(currentManifestUrl);
      currentManifestUrl = null;
    }
  };

  const scrollToSection = (section: HTMLElement | null | undefined) => {
    if (!section) {
      return;
    }
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setSummary = () => {
    const parts: string[] = [];
    if (state.releaseLabel) {
      parts.push(state.releaseLabel);
    }
    if (state.vendor) {
      parts.push(state.vendor);
    }
    if (state.deviceName) {
      parts.push(state.deviceName);
    }
    manifestSummary.textContent = parts.length > 0 ? parts.join(" -> ") : summaryFallback;
  };

  const hideInstallButton = () => {
    revokeManifestUrl();
    installButton.setAttribute("hidden", "");
    installButton.removeAttribute("manifest");
  };

  const resetDeviceDetails = (message?: string) => {
    if (descriptionTarget) {
      if (message) {
        descriptionTarget.hidden = false;
        descriptionTarget.textContent = message;
      } else {
        descriptionTarget.hidden = true;
        descriptionTarget.textContent = "";
      }
    }
    if (linkTarget) {
      linkTarget.hidden = true;
      linkTarget.href = "";
    }
  };

  const highlightCards = (cards: HTMLButtonElement[], selected: string) => {
    cards.forEach((card) => {
      const isSelected = card.dataset.value === selected;
      if (isSelected) {
        card.dataset.selected = "true";
      } else {
        delete card.dataset.selected;
      }
      card.setAttribute("aria-pressed", isSelected.toString());
    });
  };

  const applySelection = () => {
    if (!state.vendor || !state.deviceId) {
      state.deviceName = "";
      setSummary();
      hideInstallButton();
      resetDeviceDetails();
      return;
    }

    const devices = vendorDevices.get(state.vendor) ?? [];
    const device = devices.find((entry) => entry.id === state.deviceId);
    if (!device) {
      state.deviceName = "";
      setSummary();
      hideInstallButton();
      resetDeviceDetails("Device not found in manifest.");
      return;
    }

    state.deviceName = device.name;
    setSummary();

    if (descriptionTarget) {
      if (device.description) {
        descriptionTarget.hidden = false;
        descriptionTarget.textContent = device.description;
      } else {
        descriptionTarget.hidden = true;
        descriptionTarget.textContent = "";
      }
    }

    if (linkTarget) {
      if (device.link) {
        linkTarget.hidden = false;
        linkTarget.href = device.link;
      } else {
        linkTarget.hidden = true;
        linkTarget.href = "";
      }
    }

    const manifest = {
      name: device.name,
      new_install_prompt_erase: true,
      builds: [
        {
          chipFamily: device.family,
          improv: false,
          parts: [
            {
              path: `bins${state.releaseValue}/Launcher-${device.id}.bin`,
              offset: 0
            }
          ]
        }
      ]
    };

    revokeManifestUrl();
    currentManifestUrl = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: "application/json" })
    );
    installButton.setAttribute("manifest", currentManifestUrl);
    installButton.removeAttribute("hidden");
  };

  const renderDeviceCards = (devices: ManifestDevice[]) => {
    deviceContainer.innerHTML = "";
    deviceCards = [];

    if (devices.length === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "No devices available for this vendor.";
      deviceContainer.appendChild(tile);
      return;
    }

    devices.forEach((device) => {
      const card = createSelectionCard({
        title: device.name,
        subtitle: device.description ?? "Manifest generated automatically.",
        value: device.id,
        cta: "Select device"
      });

      card.addEventListener("click", () => {
        state.deviceId = device.id;
        highlightCards(deviceCards, state.deviceId);
        applySelection();
        scrollToSection(installSection);
      });

      deviceCards.push(card);
      deviceContainer.appendChild(card);
    });

    highlightCards(deviceCards, state.deviceId);
  };

  const renderVendorCards = () => {
    vendorContainer.innerHTML = "";
    vendorCards = [];
    vendorDevices.clear();

    if (vendorPlaceholder && vendorPlaceholder.isConnected) {
      vendorPlaceholder.remove();
    }

    if (vendorMap.size === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "Manifest does not list any vendors.";
      vendorContainer.appendChild(tile);
      return;
    }

    const sortedVendors = Array.from(vendorMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    sortedVendors.forEach(([vendorName, devices]) => {
      const visibleDevices = devices.filter((device) => device.display !== false);
      if (visibleDevices.length === 0) {
        return;
      }

      vendorDevices.set(vendorName, visibleDevices);

      const card = createSelectionCard({
        title: vendorName,
        subtitle: `${visibleDevices.length} device(s) available`,
        value: vendorName,
        cta: "Select vendor"
      });

      card.addEventListener("click", () => {
        state.vendor = vendorName;
        state.deviceId = "";
        state.deviceName = "";
        highlightCards(vendorCards, state.vendor);
        renderDeviceCards(visibleDevices);
        setSummary();
        hideInstallButton();
        resetDeviceDetails("Select a device to continue.");
        scrollToSection(deviceSection);
      });

      vendorCards.push(card);
      vendorContainer.appendChild(card);
    });

    if (vendorCards.length === 0) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = "No vendors with visible devices.";
      vendorContainer.appendChild(tile);
      return;
    }

    highlightCards(vendorCards, state.vendor);

    if (state.vendor) {
      const devices = vendorDevices.get(state.vendor) ?? [];
      renderDeviceCards(devices);
    }
  };

  const renderReleaseCards = () => {
    releaseContainer.innerHTML = "";
    releaseCards = [];

    releaseOptions.forEach((option) => {
      const card = createSelectionCard({
        title: option.label,
        subtitle: option.description,
        value: option.value,
        cta: option.cta
      });

      card.addEventListener("click", () => {
        state.releaseValue = option.value;
        state.releaseLabel = option.label;
        highlightCards(releaseCards, state.releaseValue);
        setSummary();
        applySelection();
        scrollToSection(vendorSection);
      });

      releaseCards.push(card);
      releaseContainer.appendChild(card);
    });

    highlightCards(releaseCards, state.releaseValue);
  };

  setSummary();
  hideInstallButton();
  resetDeviceDetails("Select a vendor to see the devices.");

  renderReleaseCards();

  fetch("manifest.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      return response.json() as Promise<ManifestData>;
    })
    .then((manifest) => {
      vendorMap.clear();
      Object.entries(manifest).forEach(([vendorName, devices]) => {
        vendorMap.set(vendorName, devices);
      });
      renderVendorCards();
    })
    .catch(() => {
      manifestSummary.textContent = "Manifest load failed.";
      hideInstallButton();
      vendorContainer.innerHTML = "";
      deviceContainer.innerHTML = "";

      const vendorTile = document.createElement("div");
      vendorTile.className = "tile";
      vendorTile.textContent = "Unable to load the manifest.";
      vendorContainer.appendChild(vendorTile);

      const deviceTile = document.createElement("div");
      deviceTile.className = "tile";
      deviceTile.textContent = "Manifest unavailable.";
      deviceContainer.appendChild(deviceTile);
    });

  window.addEventListener("beforeunload", () => {
    revokeManifestUrl();
  });
});

