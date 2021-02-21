import { isNumber, RGB, RGBA, scale } from "./Common"
import { MaterialFont } from "./Icon"

export let isDarkMode = window.GetProperty("Global.Is Dark Mode", false);

// Custom colors;
// --------------

const themeColorsLight = {
    titleText: RGB(0, 0, 0),
    text: RGBA(0, 0, 0, 245),
    secondaryText: RGBA(0, 0, 0, 170),
    // highlight: RGB(251, 114, 153),
    highlight: RGB(234, 67, 53),

    mood: RGBA(221, 0, 27, 220),

    topbarBackground: RGB(255, 255, 255),

    playbackBarBackground: RGB(255, 255, 255),
    splitLine: RGBA(0, 0, 0, 25),

    sidebarInactiveText: RGBA(0, 0, 0, 170),
    sidebarBackground: RGB(255, 255, 255),
    sidebarSplitLine: RGBA(0, 0, 0, 118),

    playlistBackground: RGB(249, 249, 249),
    playlistBackgroundSelection: RGBA(0, 0, 0, 52),
    playlistSplitLine: RGBA(0, 0, 0, 15),

    scrollbarCursor: RGBA(0, 0, 0, 80),
    scrollbarBackground: 0,

    panelText: RGB(0, 0, 0),
    panelBackground: RGB(255, 255, 255),

    // primary: RGB(0, 0, 0),
    primary: RGB(52, 168, 83),
    onPrimary: RGBA(255, 255, 255, 245),
    secondary: RGB(0, 0, 0),
    onSecondary: RGBA(255, 255, 255, 245),
}

const themeColorsDark = {
    // 
    titleText: RGB(255, 255, 255),
    text: RGBA(255, 255, 255, 245),
    secondaryText: RGBA(255, 255, 255, 100),
    // highlight: RGB(251, 114, 153),
    highlight: RGB(234, 67, 53),

    // loved,
    mood: RGBA(221, 0, 27, 220),

    // topbar spec
    topbarBackground: RGB(18, 18, 18),

    // playback control bar,
    playbackBarBackground: RGB(40, 40, 40),

    splitLine: RGBA(255, 255, 255, 25),

    // siderbar,
    sidebarInactiveText: RGBA(255, 255, 255, 120),
    sidebarBackground: RGB(18, 18, 18),
    sidebarSplitLine: RGBA(255, 255, 255, 118),

    // playlist,
    playlistBackground: RGB(24, 24, 24),
    playlistBackgroundSelection: RGBA(255, 255, 255, 52),
    playlistSplitLine: RGBA(255, 255, 255, 15),

    // scrollbar,
    scrollbarCursor: RGBA(255, 255, 255, 80),
    scrollbarBackground: 0, // opacity,

    //
    panelText: RGB(255, 255, 255),
    panelBackground: RGB(33, 33, 33),

    // inputbox;
    inputboxText: RGB(255, 255, 255),
    inputboxSecondaryText: RGBA(255, 255, 255, 120),
    // inputboxActiveBackground: RGB()
    inputboxBorder: RGBA(255, 255, 255, 118),
    // inputboxBorderActive: RGB()

    // buttons,

    primary: RGB(52, 168, 83),
    onPrimary: RGBA(255, 255, 255, 245),
    // primary: RGB(255, 255, 255),
    // onPrimary: RGBA(0, 0, 0, 245),
    secondary: RGB(255, 255, 255),
    onSecondary: RGBA(0, 0, 0, 245),
};

export let themeColors = isDarkMode ? themeColorsDark : themeColorsLight;

export function ToggleDarkmode() {
    let mode = !isDarkMode;
    window.SetProperty("Global.Is Dark Mode", mode);
    window.Reload();
}

// Font names that may used;
// -------------------------

const useFbFonts = window.GetProperty("Font.Use foobar fonts", false);

const fontNames = {
    normal: window.GetProperty("Font.Normal", "Microsoft Yahei UI"),
    semibold: window.GetProperty("Font.Semibold", "Microsoft Yahei UI Semibold"),
    bold: window.GetProperty("Font.bold", "Microsoft Yahei UI Heavy"),
}

const FontTypeCUI = {
    items: 0,
    labels: 1
};
// Used in window.GetFontDUI()
const FontTypeDUI = {
    defaults: 0,
    tabs: 1,
    lists: 2,
    playlists: 3,
    statusbar: 4,
    console: 5
};


function getFonts() {
    let fbFont: IGdiFont;
    let fbSemiFont: IGdiFont;
    let instanceType = window.InstanceType;

    if (useFbFonts) {
        if (instanceType === 0) {
            fbFont = window.GetFontCUI(FontTypeCUI.items);
            fbSemiFont = window.GetFontCUI(FontTypeCUI.labels);
        } else {
            fbFont = window.GetFontDUI(FontTypeDUI.defaults);
            fbSemiFont = window.GetFontDUI(FontTypeDUI.tabs);
        }

        fontNames.normal = fbFont.Name;
        fontNames.semibold = fbSemiFont.Name;
        fontNames.bold = fbFont.Name;
    } else {
        fontNames.normal = window.GetProperty("Font.Normal", "");
        fontNames.semibold = window.GetProperty("Font.Semibold", "");
        fontNames.bold = window.GetProperty("Font.bold", "");
    }
}

getFonts();

export const fontNameNormal = fontNames.normal;
export const fontNameSemibold = fontNames.semibold;
export const fontNameBold = fontNames.bold;

export const fonts = {
    normal_12: gdi.Font(fontNameNormal, scale(12)),
    normal_13: gdi.Font(fontNameNormal, scale(13)),
    normal_14: gdi.Font(fontNameNormal, scale(14)),
    normal_28: gdi.Font(fontNameNormal, scale(28)),
    semibold_14: gdi.Font(fontNameSemibold, scale(14)),
    bold_32: gdi.Font(fontNameBold, scale(32), 1),

    material_22: gdi.Font(MaterialFont, scale(22)),

    // playback time;
    trebuchet_12: gdi.Font("Trebuchet MS", scale(12)),
}

export function GetFont(fontInfo: string): IGdiFont;
export function GetFont(fontName: string, size: number, style?: number): IGdiFont;
export function GetFont(infoOrName: string, size?: number, style?: number): IGdiFont {
    if (size !== undefined) {
        let fontName = infoOrName.trim().toLowerCase();
        if (fontName === "semibold" || fontName === "semi") {
            fontName = fontNames.semibold;
            return gdi.Font(fontName, size, style);
        } else if (fontName === "normal") {
            fontName = fontNames.normal;
            return gdi.Font(fontName, size, style);
        } else if (fontName === "bold") {
            fontName = fontNames.bold;
            if (fontName === fontNames.normal && style == null) {
                style = 1;
            }
            return gdi.Font(fontName, size, style);
        } else { }
        return gdi.Font(fontName, size, style);
    } else {
        let infos = infoOrName.split(",").map(i => i.trim());
        let fontName = infos[0];
        let size: number;
        let style: number;
        if (!isNumber(+infos[1])) {
            throw new Error("Invalid parameter: GdiFont(), " + infoOrName)
        } else {
            size = scale(+infos[1]);
        }
        if (isNumber(+infos[2])) {
            style = +infos[2];
        }
        return GetFont(fontName, size, style);
    }
}

// Height of seekbar or volumebar;
export const sliderHeight = scale(20);

// Width of scrollbar;
export const scrollbarWidth = scale(14);