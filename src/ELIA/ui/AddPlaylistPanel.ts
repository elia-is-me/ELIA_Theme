import { Component } from "../common/BasePart";
import { MeasureString, RGB, RGBA, scale, StringFormat } from "../common/common";
import { Button2 } from "../common/IconButton";
import { InputBox } from "../common/Inputbox";
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

	saveBtn: Button2;
	cancelBtn: Button2;
	inputbox: InputBox;
	inputbox_height: number;

	constructor(opts: IPanelOptions) {
		super(opts);

		Object.assign(this, defaultOptions, opts);

		this.paddings = {
			top: scale(44),
			left: scale(40)
		}

		// create buttons;
		this.saveBtn = new Button2({
			text: "Save",
			textColor: this.colors.textColor,
			textHoverColor: this.colors.secondaryColor
		});
		this.saveBtn.setSize(scale(80), scale(32));
		this.saveBtn.on_click = () => { }

		this.cancelBtn = new Button2({
			text: "Cancel",
			textColor: this.colors.textColor,
			textHoverColor: this.colors.secondaryColor
		});
		this.cancelBtn.setSize(scale(80), scale(32));
		this.cancelBtn.on_click = () => { };

		// inputbox;
		this.inputbox = new InputBox({
			font: gdi.Font(globalFontName, scale(14)),
			font_italic: gdi.Font(globalFontName, scale(14), 2),
			foreColor: this.colors.textColor,
			backgroundActiveColor: RGB(255, 255, 255),
			backgroundSelectionColor: RGBA(33, 136, 255, 130),
			empty_text: "",
			func() {}
		});
		
		this.inputbox_height = MeasureString("ABCDgl汉字", this.inputbox.font).Height + scale(4);

		;[this.saveBtn, this.cancelBtn].forEach(btn => {
			this.addChild(btn);
		});

		this.visible = false;
		this.setSize(panelWidth, panelHeight);

	}

	on_size() {
		const {inputbox, cancelBtn, saveBtn} = this;
		const {top, left} = this.paddings;

		inputbox.setBoundary(
			this.x + left + scale(4),
			this.y + top + scale(46),
			this.width - 2 * left - scale(8),
			this.inputbox_height
		);

		saveBtn.setPosition(
			this.x + this.width - saveBtn.width - left, 
			inputbox.y + inputbox.height + scale(16));
		cancelBtn.setPosition(
			saveBtn.x - cancelBtn.width - scale(24), 
			saveBtn.y);
	}

	on_paint(gr: IGdiGraphics) {
		const { textColor, backgroundColor } = this.colors;
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
