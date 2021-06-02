import { getOrDefault, RGB, scale, SmoothingMode } from "./Common";
import { Component, IInjectableCallbacks } from "./BasePart";
import { ButtonStates, Clickable } from "./Button";
import { MeasureString, StringFormat } from "./String";
import { GetFont } from "./Theme";

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
		if (!this.text) {
			return;
		}
		let font_: IGdiFont = this._fontMap.get(this.state);
		let textColor_: number = this._colorMap.get(this.state);
		gr.DrawString(this.text, font_, textColor_,
			this.x, this.y, this.width, this.height, StringFormat.LeftCenter);
	}
}

// "Ablum, Playlist, Artist 等等";
export class Label extends Component {
	text: string = "";
	icon?: string = "";
	private textColor: number = RGB(234, 67, 53);
	private backgroundColor: number = 0;
	private font: IGdiFont = GetFont("normal", scale(12));

	constructor(options: {
		text: string;
		icon?: string;
		textColor?: number;
		backgroundColor?: number;
	}) {
		super({});
		this.text = getOrDefault(options, o => o.text, "TEXT");
		this.icon = getOrDefault(options, o => o.icon, "");
		this.setColors({
			textColor: options.textColor,
			backgroundColor: options.backgroundColor,
		});
		this.calc();
	}

	on_paint(gr: IGdiGraphics) {
		gr.SetSmoothingMode(SmoothingMode.AntiAlias);
		let r = scale(2);
		gr.DrawRoundRect(this.x, this.y, this.width, this.height, r, r, scale(1), this.textColor);
		gr.SetSmoothingMode(SmoothingMode.Default);
		gr.DrawString(this.text, this.font, this.textColor, this.x, this.y, this.width, this.height, StringFormat.Center);
	}

	private calc() {
		let lbwidth = MeasureString(this.text, this.font).Width + scale(16);
		let lbheight = this.font.Height + scale(8);
		this.setSize(lbwidth, lbheight);
	}

	setFont(font: IGdiFont) {
		this.font = font;
		this.calc();
	}

	setColors(colors: { textColor: number, backgroundColor: number }) {
		this.textColor = getOrDefault(colors, o => o.textColor, this.textColor);
		this.backgroundColor = getOrDefault(colors, o => o.backgroundColor, this.backgroundColor);
	}
}