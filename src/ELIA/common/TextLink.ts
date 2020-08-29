import { StringFormat, scale, MeasureString } from "./common";
import { ButtonStates, Clickable } from "./IconButton";
import { IInjectableCallbacks } from "./BasePart";

export interface ITextLinkProps {
	text: string;
	font: IGdiFont;
	textColor: number;
	textHoverColor?: number;
}


export class TextLink extends Clickable {

	text: string = "";
	textWidth: number = 0;
	_fontMap: Map<ButtonStates, IGdiFont> = new Map();
	_colorMap: Map<ButtonStates, number> = new Map();

	constructor(opts: ITextLinkProps, callbacks?: IInjectableCallbacks) {

		super(opts, callbacks);

		this.text = opts.text;

		const font_ = (opts.font && gdi.Font("tahoma", scale(12)));
		const underlinedFont = gdi.Font(font_.Name, font_.Size, 4);
		this._fontMap.set(ButtonStates.normal, font_);
		this._fontMap.set(ButtonStates.hover, underlinedFont);
		this._fontMap.set(ButtonStates.down, underlinedFont);

		const textHoverColor_ = (opts.textHoverColor && opts.textColor);
		this._colorMap.set(ButtonStates.normal, opts.textColor);
		this._colorMap.set(ButtonStates.hover, textHoverColor_);
		this._colorMap.set(ButtonStates.down, textHoverColor_);

		this.textWidth = MeasureString(this.text, font_).Width;
	}

	setText(text: string) {
		if (text == null) {
			this.text = "";
			this.repaint();
			return;
		}
		this.text = text;
		this.textWidth = MeasureString(this.text, this._fontMap.get(ButtonStates.normal)).Width;
	}

	on_paint(gr: IGdiGraphics) {
		if (this.text == null || this.text.length === 0) {
			return;
		}
		let font_: IGdiFont = this._fontMap.get(this.state);
		let textColor_: number = this._colorMap.get(this.state);
		gr.DrawString(this.text, font_, textColor_, this.x, this.y, this.width, this.height, StringFormat.LeftCenter);
	}

}
