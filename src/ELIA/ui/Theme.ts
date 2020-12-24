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
    sidebarInactiveText: RGBA(255, 255, 255, 200),
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

export const globalFontName = "Yu Gothic UI";
export const fontNameNormal = "Yu Gothic UI";
// export const fontNameSemibold = "Yu Gothic UI Semibold";
export const fontNameSemibold = "source han sans sc medium";
export const fontNameBold = "source han sans sc";
export const fontNameHeavy = "Yu Gothic UI Bold";

export const fonts = {
    normal_12: gdi.Font(fontNameNormal, scale(12)),
    normal_13: gdi.Font(fontNameNormal, scale(13)),
    normal_14: gdi.Font(fontNameNormal, scale(14)),
    normal_28: gdi.Font(fontNameNormal, scale(28)),
    semibold_14: gdi.Font(fontNameSemibold, scale(14)),

    material_22: gdi.Font(MaterialFont, scale(22)),

    // playback time;
    trebuchet_12: gdi.Font("Trebuchet MS", scale(12)),

}

// Height of seekbar or volumebar;
export const sliderHeight = scale(20);

// Width of scrollbar;
export const scrollbarWidth = scale(14);