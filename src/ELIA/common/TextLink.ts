import { StringFormat, scale, MeasureString, isEmptyString } from "./common";
import { ButtonStates, Clickable } from "./Button";
import { IInjectableCallbacks } from "./BasePart";

export interface ITextLinkProps {
	text: string;
	font: IGdiFont;
	textColor: number;
	textHoverColor?: number;
	maxWidth?: number;
}

export class TextLink extends Clickable {
	className = "TextLink";
	text: string = "";
	font: IGdiFont;
	textWidth: number = 0;
	maxWidth: number = 0;
	_fontMap: Map<ButtonStates, IGdiFont> = new Map();
	_colorMap: Map<ButtonStates, number> = new Map();

	constructor(opts: ITextLinkProps, callbacks?: IInjectableCallbacks) {
		super(opts, callbacks);

		// set font;
		const font_ = opts.font || gdi.Font("tahoma", scale(12));
		this.font = font_;
		const underlinedFont = gdi.Font(font_.Name, font_.Size, 4);
		this._fontMap.set(ButtonStates.Normal, font_);
		this._fontMap.set(ButtonStates.Hover, underlinedFont);
		this._fontMap.set(ButtonStates.Down, underlinedFont);

		// set colors;
		const textHoverColor_ = opts.textHoverColor && opts.textColor;
		this._colorMap.set(ButtonStates.Normal, opts.textColor);
		this._colorMap.set(ButtonStates.Hover, textHoverColor_);
		this._colorMap.set(ButtonStates.Down, textHoverColor_);

		// set text max width;
		this.maxWidth = opts.maxWidth || 0;

		// init text link;
		this.setText(opts.text);
	}

	setText(text: string) {
		if (text == null) {
			this.text = "";
			this.repaint();
			return;
		}
		this.text = text;
		this.textWidth = MeasureString(
			this.text,
			this._fontMap.get(ButtonStates.Normal)
		).Width;
		if (this.maxWidth > 0) {
			this.setSize(this.textWidth > this.maxWidth ? this.maxWidth : this.textWidth, null);
		} else {
			this.setSize(this.textWidth, null);
		}
	}

	setMaxWidth(maxWidth: number = 0) {
		this.maxWidth = maxWidth;
		this.setText(this.text);
	}

	on_paint(gr: IGdiGraphics) {
		if (isEmptyString(this.text)) {
			return;
		}
		let font_: IGdiFont = this._fontMap.get(this.state);
		let textColor_: number = this._colorMap.get(this.state);
		gr.DrawString(
			this.text,
			font_,
			textColor_,
			this.x,
			this.y,
			this.width,
			this.height,
			StringFormat.LeftCenter
		);
	}
}
