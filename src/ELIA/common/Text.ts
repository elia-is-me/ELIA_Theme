import { StringFormat } from "./String";

export class TextLine {
	className = "TextLine";
	innerText: string = "";

	font: IGdiFont;
	color: number;
	width: number;
	height: number;
	x: number;
	y: number;

	constructor(text?: string, font?: IGdiFont, color?: number) {
		this.innerText = text;
		this.font = font;
		this.color = color;
		return this;
	}

	setFont(font: IGdiFont) {
		if (font != this.font) {
			this.font = font;
		}
		return this;
	}

	setColor(color: number) {
		if (color !== this.color) {
			this.color = color;
		}
		return this;
	}

	setSize(width: number, height: number) {
		this.width = width;
		this.height = height;
	}

	draw(
		gr: IGdiGraphics,
		x: number,
		y: number,
		width?: number,
		height?: number,
		sf: number = StringFormat.LeftCenter
	): void {
		if (width != null) {
			this.width = width;
			this.height = height;
		}
		this.x = x;
		this.y = y;
		gr.DrawString(
			this.innerText,
			this.font,
			this.color,
			x,
			y,
			this.width,
			this.height,
			sf
		);
	}
}
