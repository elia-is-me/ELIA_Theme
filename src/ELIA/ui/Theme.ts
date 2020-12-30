import { RGB, RGBA, scale } from "../common/common"
import { MaterialFont } from "../common/Icon"

export interface IThemeColors {
    text: number;
    secondaryText?: number;
    text2?: number;
    background: number;
    highlight: number;
    background_sel?: number;
    text_sel?: number;
    [name: string]: number;
};

/**
 * Colors of main panel area;
 */
export const mainColors: IThemeColors = {
    text: RGB(235, 235, 235),
    secondaryText: RGB(170, 170, 170),
    background: RGB(35, 35, 35),
    highlight: RGB(251, 114, 153)
}

/**
 * Colors for bottom playback bar;
 */
export const bottomColors: IThemeColors = {
    text: mainColors.text,
    background: RGB(40, 40, 40),
    highlight: RGB(251, 114, 153),
    text_sel: RGB(255, 255, 255),
    heart: RGB(195, 45, 46)
}

/**
 * Colors for sidebar like playlist manager;
 */
export const sidebarColors: IThemeColors = {
    text: mainColors.text,
    secondaryText: mainColors.secondaryText,
    background: RGB(24, 24, 24),
    highlight: RGB(247, 217, 76),
    HEART_RED: RGB(221, 0, 27) // Color for mood;
}

/**
 * Scrollbar color;
 */
// export const scrollbarColor = {
//     cursor: 0x50ffffff & mainColors.text,
//     background: 0, // opacity
// }

// Custom colors;
// --------------

export const themeColors = {
    // 
    titleText: RGB(255, 255, 255),
    text: RGBA(255, 255, 255, 245),
    secondaryText: RGBA(255, 255, 255, 170),
    highlight: RGB(251, 114, 153),

    // loved,
    mood: RGB(221, 0, 27),

    // topbar spec
    topbarBackground: RGB(18, 18, 18),

    // playback control bar,
    playbackBarBackground: RGB(40, 40, 40),

    // siderbar,
    sidebarInactiveText: RGBA(255, 255, 255, 170),
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

}


// Font names that may used;
// -------------------------

const useFbFonts = window.GetProperty("Font.Use foobar fonts", true);

const fontNames = {
    normal: window.GetProperty("Font.Normal", ""),
    semibold: window.GetProperty("Font.Semibold", ""),
    bold: window.GetProperty("Font.bold", ""),
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

export function GdiFont(fontName: string, size: number, style?: number) {
    fontName = fontName.trim().toLowerCase();
    if (fontName === "semibold" || fontName === "semi") {
        fontName = fontNames.semibold;
    } else if (fontName === "normal") {
        fontName = fontNames.normal;
    } else if (fontName === "bold") {
        fontName = fontNames.bold;
    } else { }
    return gdi.Font(fontName, size, style);
}

// Height of seekbar or volumebar;
export const sliderHeight = scale(20);

// Width of scrollbar;
export const scrollbarWidth = scale(14);