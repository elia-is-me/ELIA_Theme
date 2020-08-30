import { RGB, scale } from "../common/common"

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
	highlight: RGB(247, 217, 76)
}

/**
 * Colors for bottom playback bar;
 */
export const bottomColors: IThemeColors = {
	text: mainColors.text,
	background: RGB(17, 17, 17),
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
export const scrollbarColor = {
	cursor: 0x50ffffff & mainColors.text,
	background: 0, // opacity
}

export const scrollbarWidth = scale(14);

export const globalFontName = "Microsoft YaHei";

