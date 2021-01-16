/// <reference path="../../typings/foo_spider_monkey_panel.d.ts" />

export const enum StringTrimming {
	None = 0,
	Character = 1,
	Word = 2,
	EllipsisCharacter = 3,
	EllipsisWord = 4,
	EllipsisPath = 5
}
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
}

// Helper function for DrawString() and MeasureString()
// args: h_align, v_align, trimming, flags
export function StringFormat(
	h_align = 0,
	v_align = 0,
	trimming = 0,
	flags = 0
) {
	return (h_align << 28) | (v_align << 24) | (trimming << 20) | flags;
}
StringFormat.LeftCenter = StringFormat(
	0,
	1,
	StringTrimming.EllipsisCharacter,
	StringFormatFlags.NoWrap
);
StringFormat.Center = StringFormat(
	1,
	1,
	StringTrimming.Character,
	StringFormatFlags.NoWrap
);
StringFormat.LeftTop = StringFormat(
	0,
	0,
	StringTrimming.EllipsisCharacter,
	StringFormatFlags.NoWrap
);
StringFormat.LeftTopNoTrim = StringFormat(
	0,
	0,
	StringTrimming.None,
	StringFormatFlags.NoWrap
);
StringFormat.RightCenter = StringFormat(
	2, 1, StringTrimming.EllipsisCharacter, StringFormatFlags.NoWrap
);

let _temp_g = gdi.CreateImage(1, 1).GetGraphics();
export const MeasureString = (str: string | number, font: IGdiFont) => {
	return _temp_g.MeasureString(str, font, 0, 0, 99999, 999, StringFormat.LeftCenter);
}

export const spaceStart = (str: string) => str.padStart(str.length + 1);
export const spaceEnd = (str: string) => str.padEnd(str.length + 1);
export const spaceStartEnd = (str: string) => spaceStart(str).padEnd(str.length + 2);