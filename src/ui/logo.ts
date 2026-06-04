// The Marhiv logo, resolved to a URL usable from content-script UI.
//
// The bundled asset path is root-relative (e.g. "/assets/icon-….png"); inside a
// content script it must be loaded from the extension origin, not the host
// page's, so we resolve it through chrome.runtime.getURL (the asset is
// web-accessible). Shared by the Menu Ball and the Panel's brand mark so the
// brand asset is referenced in exactly one place.
//
// The simplified icon variant — a circular disc with transparent corners that
// stays legible at small sizes (BRAND.md: use the icon below 64px). A 128px
// source keeps it crisp on high-DPI screens when shown small.

import logoUrl from '../../assets/brand/icons/icon-128.png'

export const MARHIV_LOGO_URL = chrome.runtime.getURL(logoUrl.replace(/^\/+/, ''))
