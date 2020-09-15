import { Component } from "../common/BasePart";
import { RGB, scale, StringFormat } from "../common/common";
import { Button } from "../common/IconButton";
import { IThemeColors, mainColors, globalFontName } from "./Theme";

const panelColors : IThemeColors  = {
	text: mainColors.text,
	secondaryText: mainColors.secondaryText,
	background: RGB(15, 15, 15),
	highlight: mainColors.highlight
}

const titleFont = gdi.Font(globalFontName, scale(20), 1);
const textFont = gdi.Font(globalFontName, scale(14));

const panelWidth = scale(480);
const panelHeight = scale(400);

export interface IPanelOptions {
	colors: IThemeColors;
	titleFont: IGdiFont;
	textFont: IGdiFont;
	panelWidth: number;
}


export class AddPlaylistPanel extends Component {

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

	constructor (opts: IPanelOptions) {
		super(opts);

		// set colors;
		this.colors.textColor = opts.colors.text;
		this.colors.secondaryColor = opts.colors.secondaryText;
		this.colors.backgroundColor = opts.colors.background;
		this.colors.highlightColor = opts.colors.highlight;

		// set font;
		this.titleFont = opts.titleFont;
		this.textFont = opts.textFont;

		this.paddings = {
			top: scale(16),
			left: scale(24)
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


	}

	on_paint(gr: IGdiGraphics) {
		const {textColor, secondaryColor, backgroundColor, highlightColor} = this.colors;
		const titleFont = this.titleFont;
		const padLeft = this.paddings.left;
		const padTop = this.paddings.top;

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// title;
		gr.DrawString("Create New Playlist", titleFont, textColor, this.x + padLeft, this.y + padTop, this.width - 2 * padLeft, scale(26), StringFormat.LeftCenter);

		// draw inputbox background;
	}

}
