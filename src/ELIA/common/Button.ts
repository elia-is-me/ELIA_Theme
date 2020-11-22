import { isObject, scale, StringFormat, TextRenderingHint, isFunction, MeasureString, CursorName, RGB, setAlpha, SmoothingMode, RGBA } from "./common";
import { Component, IPaddings, IInjectableCallbacks } from "./BasePart";
import { SerializableIcon } from "./Icon";
import { globalFontName, mainColors } from "../ui/Theme";
import { ui } from "./UserInterface";
import { Material, MaterialFont } from "./Icon";

const textRenderingHint = ui.textRender;

export const enum ButtonStates {
	Normal = 0,
	Hover = 1,
	Down = 2,
	Disable = 4,
};

export class Clickable extends Component {
	state: ButtonStates = ButtonStates.Normal;

	/**
	 * changeState(state) will not change a disabled button's state;
	 */
	changeState(state: number) {
		if (this.state === ButtonStates.Disable || state === ButtonStates.Disable) {
			return;
		}
		if (this.state !== state) {
			this.state = state;
			this.repaint();
		}
	}

	disable() {
		this.state = ButtonStates.Disable;
	}

	enable() {
		this.state = ButtonStates.Normal;
	}

	on_init() {
		this.changeState(ButtonStates.Normal);
	}

	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.Normal) {
			this.changeState(ButtonStates.Hover);
		}
		if (this.trace(x, y)) {
			window.SetCursor(CursorName.IDC_HAND);
		} else {
			window.SetCursor(CursorName.IDC_ARROW);
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		this.changeState(ButtonStates.Down);
	}

	on_mouse_lbtn_up(x: number, y: number) {
		if (this.state === ButtonStates.Down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x, y);
			}
		}
		this.changeState(ButtonStates.Hover);
	}

	on_mouse_leave() {
		this.changeState(ButtonStates.Normal);
		window.SetCursor(CursorName.IDC_ARROW);
	}
}

export class Icon extends Clickable {
	image: IGdiBitmap;
	downImage: IGdiBitmap;
	hoverImage: IGdiBitmap;
	private hoverAlpha = 200;
	private downAlpha = 128;
	constructor(opts: object, callbacks?: IInjectableCallbacks) {
		super(opts, callbacks);
		if (isObject(opts)) {
			Object.assign(this, opts);
		}
		if (isObject(callbacks)) {
			Object.assign(this, callbacks);
		}
		this.setImage(this.image, this.hoverImage, this.downImage);
	}
	setImage(img: IGdiBitmap, hoverImg?: IGdiBitmap, downImg?: IGdiBitmap) {
		this.image = img;
		this.hoverImage = hoverImg;
		this.downImage = downImg;
		this.setBoundary(this.x, this.y, img.Width, img.Height);
	}
	on_paint(gr: IGdiGraphics) {
		let img = this.image;
		let alpha = 255;
		if (this.state === ButtonStates.Hover) {
			if (this.hoverImage) {
				img = this.hoverImage;
			}
			else {
				alpha = this.hoverAlpha;
			}
		}
		else if (this.state === ButtonStates.Down
			|| this.state === ButtonStates.Disable
		) {
			if (this.downImage) {
				img = this.downImage;
			}
			else {
				alpha = this.downAlpha;
			}
		}
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height, 0, alpha);
	}
}

export interface IButtonColors {
	textColor: number;
	hoverColor: number;
	downColor?: number;
}

export class Button extends Clickable {
	icon?: SerializableIcon;
	text: string;
	font: IGdiFont;
	colors: IButtonColors;
	private _colorMap: Map<ButtonStates, number> = new Map();
	paddings: IPaddings;
	gap: number;

	// TODO...
	private _iconWidth = scale(16);

	constructor(opts: {
		icon?: SerializableIcon;
		text: string;
		font: IGdiFont;
		colors: IButtonColors;
		paddings?: IPaddings;
		gap?: number;
		onClick?: (x?: number, y?: number) => void;
	}) {
		super(opts);

		this.icon = (opts.icon || null);
		this.text = opts.text;
		this.colors = opts.colors;
		this.font = opts.font;
		this.paddings = this.getProperPaddings(opts.paddings);
		this.gap = (opts.gap || 0);
		opts.onClick && (this.on_click = opts.onClick.bind(this));

		this.setColors();
	}

	private setColors() {
		const colors = this.colors;
		this._colorMap.set(ButtonStates.Normal, colors.textColor);
		this._colorMap.set(ButtonStates.Hover, colors.hoverColor);
		if (colors.downColor && colors.downColor > 0) {
			this._colorMap.set(ButtonStates.Down, colors.downColor);
		} else {
			this._colorMap.set(ButtonStates.Down, colors.hoverColor);
		}
	}

	private getProperPaddings(p: IPaddings): IPaddings {
		let paddings_: IPaddings = {
			top: 0,
			bottom: 0,
			left: scale(4),
			right: scale(4),
		}

		return (p ? p : paddings_);
	}

	on_paint(gr: IGdiGraphics) {

		const { icon, text, font, paddings } = this;
		let btnColor: number = this._colorMap.get(this.state);
		let _iconWidth = this._iconWidth;

		/**
		 * draw icon;
		 */
		if (icon != null) {
			let iconX = this.x + paddings.left;
			let iconY = this.y + ((this.height - _iconWidth) / 2) | 0;
			icon.draw(gr, btnColor, iconX, iconY, _iconWidth, _iconWidth);
		}

		/**
		 * draw text;
		 */
		let textX = this.x + paddings.left + (icon ? _iconWidth + this.gap : 0);
		let textW = this.width - paddings.left - paddings.right - (icon ? _iconWidth + this.gap : 0);
		gr.DrawString(text, font, btnColor, textX, this.y, textW, this.height, StringFormat.LeftCenter);
	}

}

export interface IButton2Colors {
	textColor: number;
	textHoverColor?: number;
	textDownColor?: number;
	backgroundColor?: number;
	backgroundHoverColor?: number;
	backgroundDownColor?: number;
}

const highlightColor: IButton2Colors = {
	textColor: RGB(15, 15, 15),
	textHoverColor: RGB(15, 15, 15),
	textDownColor: RGB(15, 15, 15),
	backgroundColor: RGB(255, 255, 255),
	backgroundHoverColor: RGBA(255, 255, 255, 220),
	backgroundDownColor: RGBA(255, 255, 255, 180)
}

const normalColor: IButton2Colors = {
	textColor: mainColors.text,
	textHoverColor: setAlpha(mainColors.text, 200),
	textDownColor: setAlpha(mainColors.text, 170),
	backgroundHoverColor: setAlpha(0xffffffff, 25),
	backgroundDownColor: setAlpha(0xffffffff, 25)
}

const defaultButtonFont = gdi.Font("segoe ui semibold", scale(14));
const defaultIconFont = gdi.Font(MaterialFont, scale(22));
const iconWidth = defaultButtonFont.Height;

export interface IButton2Options {
	text?: string;
	textSize?: number;
	icon?: string;
	iconSize?: number;
	style?: number;
	ghost?: boolean;
}

export class Button2 extends Clickable {
	style: number = 0;
	text: string;
	icon?: string;
	iconSize: number = scale(22);
	ghost: boolean = false;
	private _textFont: IGdiFont = defaultButtonFont;
	private _iconFont: IGdiFont = defaultIconFont;
	private _textColor: Map<ButtonStates, number> = new Map();
	private _backgroundColor: Map<ButtonStates, number> = new Map();

	constructor(opts: IButton2Options) {
		super({})
		this.style = (opts.style || 0);
		this.text = opts.text;;
		this.icon = opts.icon;
		this._textFont = defaultButtonFont;
		this.ghost = (opts.ghost || false);
		if (opts.iconSize) {
			this._iconFont = gdi.Font(MaterialFont, opts.iconSize);
		}
		if (opts.textSize) {
			this._textFont = gdi.Font("Segoe UI Semibold", opts.textSize);
		}
		switch (this.style) {
			case 0:
				this.setColors(normalColor);
				break;
			case 1:
				this.setColors(highlightColor);
				break;
			default:
				break;
		}
	}

	setColors(colors: IButton2Colors) {
		this._textColor.set(ButtonStates.Normal, colors.textColor)
		this._textColor.set(ButtonStates.Hover, (colors.textHoverColor != null) ? colors.textHoverColor : colors.textColor);
		this._textColor.set(ButtonStates.Down, (colors.textDownColor != null) ? colors.textDownColor : colors.textColor);
		this._textColor.set(ButtonStates.Disable, this._textColor.get(ButtonStates.Down));

		this._backgroundColor.set(ButtonStates.Normal, colors.backgroundColor);
		this._backgroundColor.set(ButtonStates.Hover, colors.backgroundHoverColor);
		this._backgroundColor.set(ButtonStates.Down, colors.backgroundDownColor);
		this._backgroundColor.set(ButtonStates.Disable, this._backgroundColor.get(ButtonStates.Down));
	}

	on_size() {
		let _textWidth: number = 0;
		let _totalWidth: number = 0;
		let _iconWidth = 0;
		let gap = scale(8);
		if (this.text) {
			_textWidth = MeasureString(this.text, this._textFont).Width;
		}
		if (this.icon) {
			_iconWidth = this._iconFont.Height;
		}
		_totalWidth = _textWidth + _iconWidth;
		if (this.text && this.icon) {
			_totalWidth += gap;
		}
		this.paddings.left = (this.width - _totalWidth) / 2;
	}

	on_paint(gr: IGdiGraphics) {
		let { text, _textFont, icon, _iconFont, x, y, width, height } = this;
		let textColor = this._textColor.get(this.state);
		let backgroundColor = this._backgroundColor.get(this.state);
		let { left, top } = this.paddings;
		let iconWidth = _iconFont.Height;

		if (backgroundColor != null && !this.ghost) {
			gr.SetSmoothingMode(SmoothingMode.AntiAlias);
			if (text) {
				gr.FillRoundRect(x, y, width, height, scale(2), scale(2), backgroundColor);
			} else {
				gr.FillEllipse(x, y, width - 1, height - 1, backgroundColor);
			}
			gr.SetSmoothingMode(SmoothingMode.Default);
		}

		if (icon) {
			gr.DrawString(icon, _iconFont, textColor, x + left, y, iconWidth, height, StringFormat.Center);
		}

		if (text) {
			let textX = (icon ? x + left + iconWidth + scale(8) : x + left);
			gr.DrawString(text, _textFont, textColor, textX, y, width, height, StringFormat.LeftCenter);
		}
	}
}

interface IIconOptions {
	fontIcon: SerializableIcon;
	normalColor: number;
	hoverColor: number;
	downColor?: number;
	onClick?: (x: number, y: number) => void;
}

/**
 * Icon2 的接口用起来很混乱，迷惑。
 */

export class Icon2 extends Clickable {

	private _colorMap: Map<ButtonStates, number> = new Map();
	fontIcon: SerializableIcon;

	constructor(opts: IIconOptions) {
		super(opts);

		this.fontIcon = opts.fontIcon;

		this._colorMap.set(ButtonStates.Normal, opts.normalColor);
		this._colorMap.set(ButtonStates.Hover, opts.hoverColor);
		if (opts.downColor == null || opts.downColor === 0) {
			this._colorMap.set(ButtonStates.Down, opts.hoverColor);
		} else {
			this._colorMap.set(ButtonStates.Down, opts.downColor);
		}

		if (isFunction(opts.onClick)) {
			this.on_click = opts.onClick;
		}
		return this;
	}

	on_paint(gr: IGdiGraphics) {
		const { fontIcon, _colorMap } = this;
		const iconColor = _colorMap.get(this.state);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		fontIcon.draw(gr, iconColor, this.x, this.y, this.width, this.height);
		gr.SetTextRenderingHint(textRenderingHint);
	}
}
