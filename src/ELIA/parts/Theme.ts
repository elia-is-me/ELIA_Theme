import { isNumber, RGB, RGBA, scale } from "../common/common"
import { MaterialFont } from "../common/Icon"

// Custom colors;
// --------------

export const themeColors = {
    // 
    titleText: RGB(255, 255, 255),
    text: RGBA(255, 255, 255, 245),
    secondaryText: RGBA(255, 255, 255, 100),
    highlight: RGB(251, 114, 153),

    // loved,
    mood: RGBA(221, 0, 27, 220),

    // topbar spec
    topbarBackground: RGB(18, 18, 18),

    // playback control bar,
    playbackBarBackground: RGB(40, 40, 40),

    // siderbar,
    sidebarInactiveText: RGBA(255, 255, 255, 120),
    sidebarBackground: RGB(18, 18, 18),
    sidebarSplitLine: RGBA(255, 255, 255, 118),

    // playlist,
    playlistBackground: RGB(24, 24, 24),
    playlistBackgroundSelection: RGBA(255, 255, 255, 17),
    playlistSplitLine: RGBA(255, 255, 255, 15),

    // scrollbar,
    scrollbarCursor: RGBA(255, 255, 255, 80),
    scrollbarBackground: 0, // opacity,

    // buttons,
    primary: RGB(255, 255, 255),
    onPrimary: RGBA(0, 0, 0, 245),
    secondary: RGB(255, 255, 255),
    onSecondary: RGBA(0, 0, 0, 245),
};

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
            fbFont = window.GetFontCUI(FontTypeCUI.items, "{82196D79-69BC-4041-8E2A-E3B4406BB6FC}");
            fbSemiFont = window.GetFontCUI(FontTypeCUI.labels, "{C0D3B76C-324D-46D3-BB3C-E81C7D3BCB85}");
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

export function GdiFont(fontInfo: string): IGdiFont;
export function GdiFont(fontName: string, size: number, style?: number): IGdiFont;
export function GdiFont(infoOrName: string, size?: number, style?: number): IGdiFont {
    if (size !== undefined) {
        let fontName = infoOrName.trim().toLowerCase();
        if (fontName === "semibold" || fontName === "semi") {
            fontName = fontNames.semibold;
        } else if (fontName === "normal") {
            fontName = fontNames.normal;
        } else if (fontName === "bold") {
            fontName = fontNames.bold;
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
        return GdiFont(fontName, size, style);
    }
}

// Height of seekbar or volumebar;
export const sliderHeight = scale(20);

// Width of scrollbar;
export const scrollbarWidth = scale(14);