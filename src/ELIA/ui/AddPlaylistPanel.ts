import { Component } from "../common/BasePart";
import { RGB, scale, StringFormat } from "../common/common";
import { Button } from "../common/IconButton";
import { IThemeColors, mainColors, globalFontName } from "./Theme";

const panelColors = {
	textColor: mainColors.text,
	secondaryColor: mainColors.secondaryText,
	backgroundColor: RGB(15, 15, 15),
	highlightColor: mainColors.highlight
}

const titleFont = gdi.Font(globalFontName, scale(20), 1);
const textFont = gdi.Font(globalFontName, scale(14));

const panelWidth = scale(650);
const panelHeight = scale(225);

export interface IPanelOptions {
	colors?: IThemeColors;
	titleFont?: IGdiFont;
	textFont?: IGdiFont;
}

const defaultOptions = {
	colors: panelColors,
	titleFont: titleFont,
	textFont: textFont,
}


export class AddPlaylistPanel extends Component {

	readonly modal = true;

	colors: {
		textColor: number;
		secondaryColor: number;
		backgroundColor: number;
		highlightColor: number;
	}

	titleFont: IGdiFont;
	textFont: IGdiFont;
	panelWidth: number;
	panelHeight: number;
	paddings: {
		left: number;
		top: number;
	};

	saveBtn: Button;
	cancelBtn: Button;

	constructor(opts: IPanelOptions) {
		super(opts);

		Object.assign(this, defaultOptions, opts);

		// set colors;
		// this.colors.textColor = opts.colors.text;
		// this.colors.secondaryColor = opts.colors.secondaryText;
		// this.colors.backgroundColor = opts.colors.background;
		// this.colors.highlightColor = opts.colors.highlight;

		// set font;
		// this.titleFont = opts.titleFont;
		// this.textFont = opts.textFont;

		this.paddings = {
			top: scale(44),
			left: scale(40)
		}

		// create buttons;
		this.saveBtn = new Button({
			text: "Save",
			font: this.textFont,
			colors: {
				textColor: this.colors.secondaryColor,
				hoverColor: this.colors.textColor,
			}
		});

		this.cancelBtn = new Button({
			text: "Cancel",
			font: this.textFont,
			colors: {
				textColor: this.colors.secondaryColor,
				hoverColor: this.colors.textColor,
			}
		});

		this.visible = false;
		this.setSize(panelWidth, panelHeight);

	}

	on_paint(gr: IGdiGraphics) {
		const { textColor, secondaryColor, backgroundColor, highlightColor } = this.colors;
		const titleFont = this.titleFont;
		const padLeft = this.paddings.left;
		const padTop = this.paddings.top;

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// title;
		gr.DrawString("Create New Playlist", titleFont, textColor, this.x + padLeft, this.y + padTop, this.width - 2 * padLeft, scale(26), StringFormat.LeftTop);

		// draw inputbox background;
		gr.FillSolidRect(this.x + padLeft, this.y + padTop + scale(26) + scale(20), this.width - 2 * padLeft, scale(36), RGB(30, 30, 30));
	}

}
