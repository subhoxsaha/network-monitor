import L from 'leaflet';

/**
 * Shared colour palette for waypoints + connecting lines.
 * Uses golden-angle HSL distribution for visually distinct, stable colours.
 */
export const waypointColor = (i) => {
  const hue = (i * 137.5) % 360;
  return `hsl(${hue}, 85%, 55%)`;
};

/**
 * Creates a professional circular PFP marker for Leaflet.
 */
export const createPFPMarker = (pfpUrl, isActive = true, isOtherUser = false, isOnline = true) => {
  // Offline users get grayscale profile pics and a muted pin tip
  const filterStyle = (!isOnline && isOtherUser) ? 'filter: grayscale(100%) opacity(70%);' : '';
  const opacityClass = (!isOnline && isOtherUser) ? 'offline-marker' : '';
  const showRipple = isOtherUser ? false : isActive; // Only the active current user gets the pulse

  return L.divIcon({
    className: `custom-pfp-marker ${opacityClass}`,
    html: `
      <div class="pfp-container-ui simple" style="${filterStyle}">
        ${showRipple ? '<div class="pfp-ripple"></div>' : ''}
        <div class="pfp-inner-ui">
          ${pfpUrl
            ? `<img
                src="${pfpUrl}"
                class="pfp-image-ui"
                onload="this.nextElementSibling.style.display='none'"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
              />`
            : ''}
          <div class="pfp-fallback-ui" style="${pfpUrl ? 'display:none' : 'display:flex'}">
            ${pfpUrl ? '' : 'U'}
          </div>
        </div>
        <div class="pfp-pin-tip"></div>
      </div>
    `,
    iconSize: [42, 52],
    iconAnchor: [21, 52],
    popupAnchor: [0, -52]
  });
};

/**
 * Creates a professional waypoint icon with the shared colour.
 */
export const createWaypointIcon = (index, isSelected = false) => {
  const color = isSelected ? '#ff453a' : waypointColor(index);
  const size = isSelected ? 32 : 24;
  
  return L.divIcon({
    className: `custom-waypoint-marker ${isSelected ? 'selected' : ''}`,
    html: `
      <div style="width: ${size}px; height: ${size}px; background: ${color}; font-size: ${size * 0.4}px;">
        ${index + 1}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};
