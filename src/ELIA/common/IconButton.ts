import { isObject, Repaint, scale, StringFormat, TextRenderingHint, isFunction } from "./common";
import { Component, IPaddings, textRenderingHint, IInjectableCallbacks } from "./BasePart";
import { SerializableIcon } from "./IconType";

export enum ButtonStates {
	normal = 0,
	hover = 1,
	down = 2
};

export abstract class Clickable extends Component {

	state: ButtonStates = ButtonStates.normal;

	changeState(state: number) {
		if (this.state !== state) {
			this.state = state;
			this.repaint();
		}
	}

	on_mouse_move (x: number, y: number) {
		if (this.state === ButtonStates.normal) {
			this.changeState(ButtonStates.hover);
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		this.changeState(ButtonStates.down);
	}

	on_mouse_lbtn_up(x: number, y:number) {
		if (this.state === ButtonStates.down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x,y);
			}
		}
		this.changeState(ButtonStates.hover);
	}

	on_mouse_leave() {
		this.changeState(ButtonStates.normal);
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
		this.setSize(this.x, this.y, img.Width, img.Height);
	}
	on_paint(gr: IGdiGraphics) {
		let img = this.image;
		let alpha = 255;
		if (this.state === ButtonStates.hover) {
			if (this.hoverImage) {
				img = this.hoverImage;
			}
			else {
				alpha = this.hoverAlpha;
			}
		}
		else if (this.state === ButtonStates.down) {
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

	constructor(opts: {
		icon?: SerializableIcon;
		text: string;
		font: IGdiFont;
		colors: IButtonColors;
		paddings?: IPaddings;
		onClick?: (x?: number, y?: number) => void;
	}) {
		super(opts);

		this.icon = (opts.icon || null);
		this.text = opts.text;
		this.colors = opts.colors;
		this.font = opts.font;
		this.paddings = this.getProperPaddings(opts.paddings);
		opts.onClick && (this.on_click = opts.onClick.bind(this));

		this.setColors();
	}

	private setColors() {
		const colors = this.colors;
		this._colorMap.set(ButtonStates.normal, colors.textColor);
		this._colorMap.set(ButtonStates.hover, colors.hoverColor);
		if (colors.downColor && colors.downColor > 0) {
			this._colorMap.set(ButtonStates.down, colors.downColor);
		} else {
			this._colorMap.set(ButtonStates.down, colors.hoverColor);
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
		let  btnColor: number = this._colorMap.get(this.state);

		/**
		 * draw icon;
		 */
		if (icon != null) {
			let iconX = this.x + paddings.left;
			let iconY = this.y + ((this.height - icon.height) / 2) | 0;
			icon.draw(gr, btnColor	, 0, iconX, iconY);
		}

		/**
		 * draw text;
		 */
		let textX = this.x + paddings.left + (icon ? icon.width : 0);
		let textW = this.width - paddings.left - paddings.right - (icon ? icon.width : 0);
		gr.DrawString(text, font, btnColor, textX, this.y, textW, this.height, StringFormat.LeftCenter);
	}

}

interface IIconOptions {
	fontIcon: SerializableIcon;
	normalColor: number;
	hoverColor: number;
	downColor?: number;
	onClick?: (x: number, y: number) => void;
}

export class Icon2 extends Clickable {

	private _colorMap: Map<ButtonStates, number> = new Map();
	fontIcon: SerializableIcon;

	constructor(opts: IIconOptions) {
		super(opts);

		this.fontIcon = opts.fontIcon;

		this._colorMap.set(ButtonStates.normal, opts.normalColor);
		this._colorMap.set(ButtonStates.hover, opts.hoverColor);
		if (opts.downColor ==null || opts.downColor === 0) {
			this._colorMap.set(ButtonStates.down, opts.hoverColor);
		} else {
			this._colorMap.set(ButtonStates.down, opts.downColor);
		}

		if (isFunction(opts.onClick)) {
			this.on_click= opts.onClick.bind(this);
		}
	}

	on_paint(gr: IGdiGraphics) {
		const {fontIcon, _colorMap} = this;
		const {code, iconFont} = fontIcon;
		const iconColor = _colorMap.get(this.state);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(code, iconFont, iconColor, this.x, this.y, this.width, this.height, StringFormat.Center);
		gr.SetTextRenderingHint(textRenderingHint);
	}

}
