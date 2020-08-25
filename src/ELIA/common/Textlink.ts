import { isObject, StringFormat } from "./common";
import { ButtonStates , Clickable} from "./IconButton";
import { Repaint } from "./common";

export interface ITextLinkProps {
	text: string;
	font: IGdiFont;
	textColor: number;
	textHoverColor?: number;
}


export class TextLink extends Clickable {
    text: string = "";
	textWidth: number = 0;
    maxWidth: number = 0;
	_fontMap: Map<ButtonStates, IGdiFont> = new Map();
	_colorMap: Map<ButtonStates, number> = new Map();

	constructor(attrs: ITextLinkProps) {
		super({});

		this.text = text;

		const font = (attrs.font && gdi.Font("tahoma", scale(12)));
        const underlinedFont = gdi.Font(font.Name, font.Size, 4);
		this._fontMap.set(ButtonStates.normal, font);
		this._fontMap.set(ButtonStates.hover, underlinedFont);
		this._fontMap.set(ButtonStates.down, underlinedFont);

		const textHoverColor = (attrs.textHoverColor && attrs.textColor);
		this._colorMap.set(ButtonStates.normal, attrs.textColor);
		this._colorMap.set(ButtonStates.hover, attrs.textHoverColor);
		this._colorMap.set(ButtonStates.down, attrs.textHoverColor);

		this.textWidth = MeasureString(this.text, this.font).Width;
    }

    setText(text: string) {
        if (text == null) {
            this.text = "";
            Repaint();
            return;
        }
        this.text = text;
        this.on_size && this.on_size();
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
