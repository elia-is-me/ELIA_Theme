/*------------------------------------------------------------------------------------
 *  Commonly used utilites, constants, etc. 
 *------------------------------------------------------------------------------------*/

/*
 * 不知为何在 tsconfig.json 里 include foo_spider_monkey_panel.d.ts 时，使用 browserify +
 * tsify 编译始终报错，提示找不到变量 fb 什么的。
 */
/// <reference path="../../typings/foo_spider_monkey_panel.d.ts" />

export function RGB(r: number, g: number, b: number) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
};

export function RGBA(r: number, g: number, b: number, a: number) {
	return ((a << 24) | (r << 16) | (g << 8) | (b));
};

export function toRGB(color: number) { // returns an array like [192, 0, 0]
	var a = color - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

export function getAlpha(colour: number) {
	return ((colour >> 24) & 0xff);
}

/**
 *  Set a color's alpha value, alpha <= [0 - 255]. The origenal alpha info will
 *  be negelected.
 */
export function setAlpha(color: number, alpha: number) {
	return (color & 0x00ffffff) | (alpha << 24);
}

/**
 *  When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
 */
export function blendColors(c1: number, c2: number, factor: number) {
	var c1_ = toRGB(c1);
	var c2_ = toRGB(c2);
	var r = Math.round(c1_[0] + factor * (c2_[0] - c1_[0]));
	var g = Math.round(c1_[1] + factor * (c2_[1] - c1_[1]));
	var b = Math.round(c1_[2] + factor * (c2_[2] - c1_[2]));
	//fb.trace("R = " + r + " G = " + g + " B = " + b);
	return (0xff000000 | (r << 16) | (g << 8) | (b));
};

interface IRGBA_Color {
	r: number; // [0, 255];
	g: number; // [0, 255];
	b: number; // [0, 255];
	a: number; // [0, 255];
}

interface IHSLA_Color {
	h: number; // Hue: integer in [0, 360];
	s: number; // Saturation: float in [0, 1];
	l: number; // Luminosity: float in [0, 1];
	a: number; // Alpha: float in [0, 1];
}

export function rgba2hsla(rgba: IRGBA_Color): IHSLA_Color {
	const r = rgba.a / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.max(r, g, b);
	let h = 0;
	let s = 0;
	const l = (min + max) / 2;
	const chroma = max - min;

	if (chroma > 0) {
		s = Math.min((l <= 0.5 ? chroma / (2 * l) : chroma / (2 - (2 * l))), 1);
		switch (max) {
			case r: h = (g - b) / chroma + (g < b ? 6 : 0); break;
			case g: h = (b - r) / chroma + 2; break;
			case b: h = (r - g) / chroma + 4; break;
		}
		h *= 60;
		h = Math.round(h);
	}
	return { h: h, s: s, l: l, a: rgba.a };
}

export function hslToRgb(hue: number, sat: number, light: number) {
	var t1, t2, r, g, b;
	hue = hue / 60;
	if (light <= 0.5) {
		t2 = light * (sat + 1);
	} else {
		t2 = light + sat - (light * sat);
	}
	t1 = light * 2 - t2;
	r = hueToRgb(t1, t2, hue + 2) * 255;
	g = hueToRgb(t1, t2, hue) * 255;
	b = hueToRgb(t1, t2, hue - 2) * 255;
	return { r: r, g: g, b: b };
}

export function hueToRgb(t1: number, t2: number, hue: number) {
	if (hue < 0) hue += 6;
	if (hue >= 6) hue -= 6;
	if (hue < 1) return (t2 - t1) * hue + t1;
	else if (hue < 3) return t2;
	else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
	else return t1;
}

export function lighten(color: number, factor: number): number {
	let rgb_ = toRGB(color);
	let alpha = getAlpha(color);
	let hsla: IHSLA_Color = rgba2hsla({ r: rgb_[0], g: rgb_[1], b: rgb_[2], a: alpha });
	hsla.l = hsla.l * (1 + factor);
	let rgb__ = hslToRgb(hsla.h, hsla.s, hsla.l);
	return RGBA(rgb__.r, rgb__.g, rgb__.b, alpha);
}

export function darken(color: number, factor: number): number {
	let rgb_ = toRGB(color);
	let alpha = getAlpha(color);
	let hsla: IHSLA_Color = rgba2hsla({ r: rgb_[0], g: rgb_[1], b: rgb_[2], a: alpha });
	hsla.l = hsla.l * (1 - factor);
	let rgb__ = hslToRgb(hsla.h, hsla.s, hsla.l);
	return RGBA(rgb__.r, rgb__.g, rgb__.b, alpha);
}
// dpi scale
export const scale = (function () {
	var factor = window.GetProperty("_Global.Zoom Factor(%, 0 = default)", 0) / 100;
	var round = Math.round;
	if (factor === 0) {
		try {
			var ws = new ActiveXObject("WScript.Shell");
			var dpiVal = ws.RegRead("HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI");
			factor = Math.round((dpiVal / 96) * 100) / 100;
		} catch (e) {
			factor = 1;
		}
	} else { };
	return function (value: number) {
		return round(value * factor * 100) / 100;
	}
})();

export function isFunction(obj: any) {
	return Object.prototype.toString.call(obj) === "[object Function]"
}

// Array
export function isArray(item: any) {
	return Object.prototype.toString.call(item) === '[object Array]';
}

// OBJECT
export function isObject(item: any) {
	return typeof item === 'object' && item !== null && !isArray(item);
}

export function isString(x: any) {
	return Object.prototype.toString.call(x) === "[object String]"
}

export const BuildFullPath = function (path: string) {
	var tmpFileLoc = '',
		pattern = /(.*?)\\/gm;
	let result;
	let fs = new ActiveXObject('Scripting.FileSystemObject');
	let create = function (fo: string) {
		try {
			if (!fs.FolderExists(fo)) fs.CreateFolder(fo);
		} catch (e) {
			// fb.trace('BuildFullPath: ', e);
		}
	};
	while ((result = pattern.exec(path))) {
		tmpFileLoc = tmpFileLoc.concat(result[0]);
		try {
			create(tmpFileLoc);
		} catch (e) { }
	}
};

export const enum StringTrimming {
	None = 0,
	Character = 1,
	Word = 2,
	EllipsisCharacter = 3,
	EllipsisWord = 4,
	EllipsisPath = 5
};

// flags, can be combined of:
// http://msdn.microsoft.com/en-us/library/ms534181(VS.85).aspx
export const enum StringFormatFlags {
	DirectionRightToLeft = 0x00000001,
	DirectionVertical = 0x00000002,
	NoFitBlackBox = 0x00000004,
	DisplayFormatControl = 0x00000020,
	NoFontFallback = 0x00000400,
	MeasureTrailingSpaces = 0x00000800,
	NoWrap = 0x00001000,
	LineLimit = 0x00002000,
	NoClip = 0x00004000
};

// Used in SetSmoothingMode()
// For more information, see: http://msdn.microsoft.com/en-us/library/ms534173(VS.85).aspx
export const enum SmoothingMode {
	Invalid = -1,
	Default = 0,
	HighSpeed = 1,
	HighQuality = 2,
	None = 3,
	AntiAlias = 4
};

// Used in SetInterpolationMode()
// For more information, see: http://msdn.microsoft.com/en-us/library/ms534141(VS.85).aspx
export const enum InterpolationMode {
	Invalid = -1,
	Default = 0,
	LowQuality = 1,
	HighQuality = 2,
	Bilinear = 3,
	Bicubic = 4,
	NearestNeighbor = 5,
	HighQualityBilinear = 6,
	HighQualityBicubic = 7
};


export const enum TextRenderingHint {
	SystemDefault = 0,
	SingleBitPerPixelGridFit = 1,
	SingleBitPerPixel = 2,
	AntiAliasGridFit = 3,
	AntiAlias = 4,
	ClearTypeGridFit = 5
};

export const enum PlaybackOrder {
	Normal = 0,
	RepeatPlaylist = 1,
	RepeatTrack = 2,
	Random = 3,
	ShuffleTracks = 4,
	ShuffleAlbums = 5,
	ShuffleFolders = 6
};

// Helper function for DrawString() and MeasureString()
// args: h_align, v_align, trimming, flags
export function StringFormat(h_align = 0, v_align = 0, trimming = 0, flags = 0) {
	return ((h_align << 28) | (v_align << 24) | (trimming << 20) | flags);
}
StringFormat.LeftCenter = StringFormat(0, 1, StringTrimming.EllipsisCharacter, StringFormatFlags.NoWrap);
StringFormat.Center = StringFormat(1, 1, StringTrimming.Character, StringFormatFlags.NoWrap);
StringFormat.LeftTop = StringFormat(0, 0, StringTrimming.EllipsisCharacter, StringFormatFlags.NoWrap);
StringFormat.LeftTopNoTrim = StringFormat(0, 0, StringTrimming.None, StringFormatFlags.NoWrap);

export function debounce(fn: Function, delay: number) {
	var timer: number = null;
	delay = delay || 250;
	return function () {
		var context = this,
			args = arguments;
		timer && window.ClearTimeout(timer);
		timer = window.SetTimeout(function () {
			fn.apply(context, args);
		}, delay);
	};
}

export function throttle(fn: Function, threshhold: number, scope?: any) {
	threshhold || (threshhold = 250);
	var last: number,
		deferTimer: number;
	return function () {
		var context = scope || this;

		var now = +new Date(),
			args = arguments;
		if (last && now < last + threshhold) {
			// hold on to it
			window.ClearTimeout(deferTimer);
			deferTimer = window.SetTimeout(function () {
				last = now;
				fn.apply(context, args);
			}, threshhold);
		} else {
			last = now;
			fn.apply(context, args);
		}
	};
}

/**
 * 
 * @param {IGdiBitmap} image 
 * @param {number} width 
 * @param {number} height 
 * @param {number?} itp 
 */
export function CropImage(image: IGdiBitmap, width: number, height?: number, itp: number = 0) {
	if (height == null) {
		height = width;
	}
	var sc = width / height;
	var src_w = image.Width;
	var src_h = image.Height;
	var src_sc = src_w / src_h;
	var tmp_w, tmp_h, crop, tmp_img;
	if (src_sc > sc) {
		tmp_w = src_h * sc;
		crop = Math.round((src_w - tmp_w) / 2);
		tmp_img = image.Clone(crop, 0, tmp_w, src_h);
	}
	else {
		tmp_h = src_w / sc;
		crop = Math.round((src_h - tmp_h) / 2);
		tmp_img = image.Clone(0, crop, src_w, tmp_h);
	}
	return tmp_img.Resize(width, height, itp);
}

export function imageFromCode(code: string, font: IGdiFont, color: number, width: number, height: number, fmt = StringFormat(1, 1)): IGdiBitmap {
	var img = gdi.CreateImage(width, height);
	var g = img.GetGraphics();
	g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
	g.DrawString(code, font, color, 0, 0, width, height, fmt);
	img.ReleaseGraphics(g);
	return img;
}

/**
 * @param {string} str
 * @param {IGdiFont} str
 */
export const MeasureString = (() => {
	let g = gdi.CreateImage(1, 1).GetGraphics();
	return (str: string | number, font: IGdiFont) => g.MeasureString(str, font, 0, 0, 99999, 999, StringFormat.LeftCenter);
})();

export const enum MenuFlag {
	STRING = 0x00000000,
	GRAYED = 0x00000001,
}

/**
 * 
 *  See https://github.com/microsoft/vscode/blob/f74e473238aca7b79c08be761d99a0232838ca4c/src/vs/base/common/objects.ts
 *  Copyright (c) Microsoft Corporation.
 */
export function deepClone<T>(obj: T): T {
	if (!obj || typeof obj !== 'object') {
		return obj;
	}
	if (obj instanceof RegExp) {
		// See https://github.com/Microsoft/TypeScript/issues/10990
		return obj as any;
	}
	const result: any = Array.isArray(obj) ? [] : {};
	Object.keys(<any>obj).forEach((key: string) => {
		if ((<any>obj)[key] && typeof (<any>obj)[key] === 'object') {
			result[key] = deepClone((<any>obj)[key]);
		} else {
			result[key] = (<any>obj)[key];
		}
	});
	return result;
}

export const enum StopReason {

export function isEmptyString(str: string) {
	return !str || 0 === str.length;
}

export enum StopReason {
	InvokedByUser = 0,
	EndOfFile = 1,
	StartingAnotherTrack = 2,
	IsShyttingDown = 3
}

export const Repaint = () => window.Repaint();
export const ThrottledRepaint = throttle(Repaint, 15);
