import { isObject, Repaint, scale, StringFormat, TextRenderingHint, isFunction, setAlpha, MeasureString } from "./common";
import { Component, IPaddings, textRenderingHint, IInjectableCallbacks } from "./BasePart";
import { SerializableIcon } from "./IconType";
import { globalFontName } from "../ui/Theme";

export const enum ButtonStates {
	Normal = 0,
	Hover = 1,
	Down = 2,
	Disable = 4,
};

export abstract class Clickable extends Component {

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


	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.Normal) {
			this.changeState(ButtonStates.Hover);
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
			left: scale(4),
			right: scale(4),
		}

		return (p ? p : paddings_);
	}

	on_paint(gr: IGdiGraphics) {

		const { icon, text, font, paddings } = this;
		let btnColor: number = this._colorMap.get(this.state);

		/**
		 * draw icon;
		 */
		if (icon != null) {
			let iconX = this.x + paddings.left;
			let iconY = this.y + ((this.height - icon.height) / 2) | 0;
			icon.draw(gr, btnColor, 0, iconX, iconY);
		}

		/**
		 * draw text;
		 */
		let textX = this.x + paddings.left + (icon ? icon.width + this.gap : 0);
		let textW = this.width - paddings.left - paddings.right - (icon ? icon.width + this.gap : 0);
		gr.DrawString(text, font, btnColor, textX, this.y, textW, this.height, StringFormat.LeftCenter);
	}

}

export interface IButtonColors {
	textColor: number;
	textHoverColor?: number;
	textDownColor?: number;
	backgroundColor?: number;
	backgroundHoverColor?: number;
	backgroundDownColor?: number;
}

export const defaultButtonFont = gdi.Font(globalFontName, scale(14));

export interface IButton2Options extends IButtonColors {
	text: string;
	textFont?: IGdiFont;

}

export class Button2 extends Clickable {
	icon?: SerializableIcon;
	text: string;
	textFont: IGdiFont;
	private _textColor: Map<ButtonStates, number> = new Map();
	private _backgroundColor: Map<ButtonStates, number> = new Map();
	private paddings: { top: number; left: number; }

	constructor(opts: IButton2Options) {
		super({})

		this.setColors(opts);
		this.text = opts.text;;
		this.textFont = (opts.textFont && defaultButtonFont);
		this.paddings = { top: 0, left: 0 };
	}

	setColors(colors: IButtonColors) {
		this._textColor.set(ButtonStates.Normal, colors.textColor)
		this._textColor.set(ButtonStates.Hover, (colors.hoverColor != null) ? colors.hoverColor : setAlpha(colors.textColor, 200));
		this._textColor.set(ButtonStates.Down, (colors.textDownColor != null) ? colors.textDownColor : setAlpha(colors.textColor, 127));
		this._textColor.set(ButtonStates.Disable, this._textColor.get(ButtonStates.Down));

		this._backgroundColor.set(ButtonStates.Normal, colors.backgroundColor);
		this._backgroundColor.set(ButtonStates.Hover, colors.backgroundHoverColor);
		this._backgroundColor.set(ButtonStates.Down, colors.backgroundDownColor);
		this._backgroundColor.set(ButtonStates.Disable, this._backgroundColor.get(ButtonStates.Down));
	}

	on_size() {
		let textSize = MeasureString(this.text, this.textFont);
		this.paddings.top = (this.height - textSize.Height) / 2;
		this.paddings.left = (this.width - textSize.Width) / 2;
	}

	on_paint(gr: IGdiGraphics) {
		let {text, textFont} = this;
		let textColor = this._textColor.get(this.state);
		let backgroundColor = this._backgroundColor.get(this.state);
		let {left, top} = this.paddings;

		if (backgroundColor != null) {
			gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);
		}
		gr.DrawString(text, textFont, textColor, this.x + left, this.y + top, this.width, this.height, StringFormat.LeftCenter);
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
			this.on_click = opts.onClick.bind(this);
		}
	}

	on_paint(gr: IGdiGraphics) {
		const { fontIcon, _colorMap } = this;
		const { code, iconFont } = fontIcon;
		const iconColor = _colorMap.get(this.state);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(code, iconFont, iconColor, this.x, this.y, this.width, this.height, StringFormat.Center);
		gr.SetTextRenderingHint(textRenderingHint);
	}

}
