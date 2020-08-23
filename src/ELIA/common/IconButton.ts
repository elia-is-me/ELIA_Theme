import { isObject, Repaint, scale, StringFormat } from "./common";
import { Component, IPaddings } from "./BasePart";
import { SerializableIcon } from "./IconType";

export enum ButtonStates {
	normal = 0,
	hover = 1,
	down = 2
};

export class Icon extends Component {
	state: ButtonStates = ButtonStates.normal;
	image: IGdiBitmap;
	downImage: IGdiBitmap;
	hoverImage: IGdiBitmap;
	private hoverAlpha = 200;
	private downAlpha = 128;
	constructor(attrs: object) {
		super(attrs);
		if (isObject(attrs)) {
			Object.assign(this, attrs);
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
	changeState(state_: number) {
		if (this.state !== state_) {
			this.state = state_;
			Repaint();
		}
	}
	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.normal) {
			this.changeState(ButtonStates.hover);
		}
	}
	on_mouse_lbtn_down(x: number, y: number) {
		this.changeState(ButtonStates.down);
	}
	on_mouse_lbtn_up(x: number, y: number) {
		if (this.state === ButtonStates.down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x, y);
				// invoke(this, "on_click", x, y);
			}
		}
		this.changeState(ButtonStates.hover);
	}
	on_mouse_leave() {
		this.changeState(ButtonStates.normal);
	}
}

export interface IButtonColors {
	textColor: number;
	hoverColor: number;
	downColor?: number;
}

export class Button extends Component {
	state: ButtonStates = ButtonStates.normal;
	icon?: SerializableIcon;
	text: string;
	font: IGdiFont;
	colors: IButtonColors;
	private _colorMap: Map<ButtonStates, number> = new Map();
	paddings: IPaddings;

	constructor(attrs: {
		icon?: SerializableIcon;
		text: string;
		font: IGdiFont;
		colors: IButtonColors;
		paddings?: IPaddings;
		onClick?: (x?: number, y?: number) => void;
	}) {
		super({});

		this.icon = (attrs.icon || null);
		this.text = attrs.text;
		this.colors = attrs.colors;
		this.font = attrs.font;
		this.paddings = this.getProperPaddings(attrs.paddings);
		attrs.onClick && (this.on_click = attrs.onClick.bind(this));

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

	changeState(state_: number) {
		if (this.state !== state_) {
			this.state = state_;
			Repaint();
		}
	}
	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.normal) {
			this.changeState(ButtonStates.hover);
		}
	}
	on_mouse_lbtn_down(x: number, y: number) {
		this.changeState(ButtonStates.down);
	}
	on_mouse_lbtn_up(x: number, y: number) {
		if (this.state === ButtonStates.down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x, y);
			}
		}
		this.changeState(ButtonStates.hover);
	}
	on_mouse_leave() {
		this.changeState(ButtonStates.normal);
	}

}
