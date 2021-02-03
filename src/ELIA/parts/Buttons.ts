import { scale, TextRenderingHint, setAlpha, SmoothingMode } from "../common/Common";
import { StringFormat, MeasureString } from "../common/String"
import { Material, MaterialFont } from "../common/Icon";
import { fontNameNormal, GdiFont, themeColors } from "../common/Theme";
import { ButtonStates, Clickable, textRenderingHint } from "../common/Button";
import { IInjectableCallbacks } from "../common/BasePart";

/**
 * Icon button that only contains an icon; Currently there is no click
 * animations or background color effects.
 */

export class IconButton extends Clickable {
	icon: string;
	fontName: string = MaterialFont;
	fontSize: number;
	fontStyle: number = 0;
	foreColors: number[] = [];
	backgroundColors: number[];
	private _iconFont: IGdiFont;

	constructor(options: {
		icon: string;
		fontName?: string;
		fontSize: number;
		colors: number[];
	}) {
		super(options);
		this.setIcon(options.icon, options.fontSize && this.fontSize);
		this.setColors.apply(this, options.colors);
	}

	setIcon(code: string, fontSize?: number) {
		this.icon = code;
		if (fontSize) {
			this.fontSize = fontSize;
			this._iconFont = gdi.Font(this.fontName, this.fontSize, this.fontStyle);
		}
	}

	/**
	 * By default,
	 */
	setColors(foreColor: number, backgroundColor?: number) {
		this.foreColors = [
			foreColor,
			setAlpha(foreColor, 200),
			setAlpha(foreColor, 127),
			setAlpha(foreColor, 100)
		];

		// TODO;
		if (backgroundColor) {
			this.backgroundColors = [];
		}
	}

	on_paint(gr: IGdiGraphics) {
		let { icon, _iconFont, foreColors, state } = this;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(icon, _iconFont, foreColors[state], this.x, this.y, this.width, this.height, StringFormat.Center);
		gr.SetTextRenderingHint(textRenderingHint);
	}
}

export const enum ButtonStyles {
	Contained = "contained",
	Outlined = "outlined",
	Text = "text"
}
const textFont = GdiFont("semibold", scale(14));
const iconFont = gdi.Font(MaterialFont, scale(22));

export interface IButtonOptions {
	style: string;
	text: string;
	icon?: string;
	foreColor: number;
	backgroundColor?: number;
}

export class Button extends Clickable {
	style: string;
	text: string;
	icon?: string;

	private _textFont: IGdiFont = textFont;
	private _iconFont: IGdiFont = iconFont;
	private _foreColors: number[] = [];
	private _backgroundColors: number[] = [];
	private _iconX: number;
	private _textX: number;
	private _textWidth: number;
	private _iconWidth: number;
	private _buttonWidth: number;
	private _buttonHeight: number;
	private _minWidth = scale(70);
	private _padLR: number;
	private _gap: number;

	constructor(opts: IButtonOptions) {
		super({});
		this.style = opts.style;
		this.text = opts.text;
		this.icon = opts.icon;
		this.setColors(opts.foreColor, opts.backgroundColor);
		this._setButtonSize();
	}

	setColors(foreColor: number, backgroundColor: number) {
		switch (this.style) {
			case ButtonStyles.Contained:
				this._foreColors = [
					foreColor, foreColor, foreColor, foreColor
				];
				this._backgroundColors = [
					backgroundColor,
					setAlpha(backgroundColor, 220),
					setAlpha(backgroundColor, 180),
					setAlpha(backgroundColor, 127)
				];
				break;
			case ButtonStyles.Outlined:
			case ButtonStyles.Text:
				this._foreColors = [
					foreColor,
					setAlpha(foreColor, 200),
					setAlpha(foreColor, 127),
					setAlpha(foreColor, 100)
				];
				this._backgroundColors = [];
				break;
		}
	}

	private _setButtonSize() {
		let textWidth = MeasureString(this.text, this._textFont).Width;
		let iconWidth = scale(18);
		let gap = scale(8);
		let padLR: number;
		if (this.style === ButtonStyles.Text) {
			padLR = scale(8);
		} else {
			padLR = scale(16);
		}
		let buttonWidth = 2 * padLR + textWidth + (this.icon ? iconWidth + gap : 0);
		if (buttonWidth < this._minWidth) {
			padLR = (this._minWidth - textWidth - (this.icon ? iconWidth + gap : 0)) / 2;
			buttonWidth = this._minWidth;
		}

		this._iconWidth = iconWidth;
		this._textWidth = textWidth;
		this._buttonWidth = buttonWidth;
		this._buttonHeight = scale(36);
		this._padLR = padLR;
		this._gap = gap;
		//
		this.setSize(this._buttonWidth, this._buttonHeight);
	}

	on_size() {
		this._iconX = this.x + this._padLR;
		this._textX = this.x + this._padLR + (this.icon ? this._iconWidth + this._gap : 0);
	}

	on_paint(gr: IGdiGraphics) {
		let { x, y, width, height } = this;
		let foreColor = this._foreColors[this.state];
		let backgroundColor = this._backgroundColors[this.state];
		let radius = scale(2);
		let borderWidth = scale(1);

		// Button's background & border;
		// -----
		gr.SetSmoothingMode(SmoothingMode.AntiAlias);
		if (this.style === "contained") {
			gr.FillRoundRect(x, y, width, height, radius, radius, backgroundColor);
		} else if (this.style === "outlined") {
			gr.DrawRoundRect(x, y, width - 1, height - 1, radius, radius, borderWidth, foreColor);
		}
		gr.SetSmoothingMode(SmoothingMode.Default);

		// draw  icon & text;
		// ------
		this._iconX = this.x + this._padLR;
		this._textX = this.x + this._padLR + (this.icon ? this._iconWidth + this._gap : 0);
		let { _iconX, _iconWidth, _textX, _textWidth } = this;
		let { text, icon, _textFont, _iconFont } = this;
		if (icon) {
			gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
			gr.DrawString(icon, _iconFont, foreColor, _iconX, y, _iconWidth, height, StringFormat.Center);
			gr.SetTextRenderingHint(textRenderingHint);
		}
		if (text) {
			gr.DrawString(text, _textFont, foreColor, _textX, y, _textWidth, height, StringFormat.LeftCenter);
		}
	}

}

export class DropdownButton extends Clickable {

	foreColor: number;
	backgroundColor: number;
	borderColor: number;
	textFont: IGdiFont;
	iconFont: IGdiFont;

	text: string;
	private _textWidth: number;
	private _iconWidth: number;

	constructor(options: {
		foreColor?: number;
		backgroundColor?: number;
		borderColor?: number;
		textFont?: IGdiFont;
		iconFont?: IGdiFont;
		text: string;
		on_click?: (x?: number, y?: number) => void;
	}) {
		super({})

		this.foreColor = (options.foreColor || themeColors.secondary);
		this.backgroundColor = (options.backgroundColor || setAlpha(this.foreColor, 0x1A));
		this.borderColor = (options.borderColor || setAlpha(this.foreColor, 0x31));
		this.textFont = (options.textFont || textFont);
		this.iconFont = (options.iconFont || iconFont);
		this.text = options.text;

		if (options.on_click) {
			this.on_click = options.on_click;
		}

		// default height = 40;
		let defaultHeight = scale(40);
		let downArrowWidth = MeasureString(Material.arrow_drop_down, this.iconFont).Width;
		this._iconWidth = downArrowWidth;

		let textWidth = MeasureString(this.text, this.textFont).Width;
		this._textWidth = textWidth;
		let pad = scale(16);
		let minWidth = scale(80);
		let btnWidth = Math.max(scale(8) + pad + downArrowWidth + textWidth, minWidth);
		this.setSize(btnWidth, defaultHeight);
	}

	setText(text: string) {
		if (!text) {
			return;
		}
		if (text !== this.text) {
			this.text = text;
			this._textWidth = MeasureString(this.text, this.textFont).Width;
			let pad = scale(16);
			let minWidth = scale(80);
			let btnWidth = Math.max(scale(8) + pad + this._iconWidth + this._textWidth, minWidth);
			this.setSize(btnWidth, this.height);
		}
	}

	on_paint(gr: IGdiGraphics) {
		let pad = scale(16);
		let { borderColor, foreColor, backgroundColor } = this;
		let { iconFont, textFont } = this;
		let text = this.text;
		let icon = Material.arrow_drop_down;

		let textColor: number;
		let arrowColor: number;

		switch (this.state) {
			case ButtonStates.Normal:
				textColor = foreColor;
				arrowColor = setAlpha(foreColor, 0x8D);
				break;
			case ButtonStates.Hover:
				textColor = setAlpha(foreColor, 127);
				arrowColor = textColor;
				break;
			case ButtonStates.Down:
				textColor = setAlpha(foreColor, 100);
				arrowColor = textColor;
				break;
		}

		let R = ((this.height - scale(4) - 1) / 2) >> 0;

		// border & background color;
		gr.SetSmoothingMode(SmoothingMode.HighQuality);
		gr.FillRoundRect(this.x, this.y + scale(2), this.width, this.height - scale(4), R, R, backgroundColor);
		gr.DrawRoundRect(this.x, this.y + scale(2), this.width - scale(1), this.height - scale(4), R, R, scale(1), borderColor);
		gr.SetSmoothingMode(SmoothingMode.Default);

		// text;
		gr.DrawString(text, textFont, textColor, this.x + pad, this.y, this.width, this.height, StringFormat.LeftCenter);

		// icon;
		// console.log("drawing icon: ", icon, arrowColor);
		gr.DrawString(icon, iconFont, arrowColor,
			this.x + scale(4) + pad + this._textWidth, this.y, this.width, this.height, StringFormat.LeftCenter);
	}

}