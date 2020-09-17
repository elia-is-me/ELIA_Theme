import { Component } from "../common/BasePart";
import { MeasureString, RGB, scale, StringFormat, setAlpha, isEmptyString } from "../common/common";
import { Button2, } from "../common/IconButton";
import { InputBox } from "../common/Inputbox";
import { mainColors, globalFontName } from "./Theme";
import { notifyOthers } from "./Layout";


export interface IInputPopupOptions {
	title: string;
	defaultText?: string;
	emptyText?: string;
	onSuccess?(): void;
	onFail?(): void;
}

interface IInputPopupDefaultOptions {
	titleFont: IGdiFont;
	textFont: IGdiFont;
	panelWidth: number;
	panelHeight: number;
	textColor: number;
	backgroundColor: number;
	highlightColor: number
}

const defaultOptions: IInputPopupDefaultOptions = {
	titleFont: gdi.Font(globalFontName, scale(20), 1),
	textFont: gdi.Font(globalFontName, scale(14)),
	panelWidth: scale(650),
	panelHeight: scale(225),
	textColor: mainColors.text,
	backgroundColor: RGB(15, 15, 15),
	highlightColor: mainColors.highlight,
}


export class InputPopupPanel extends Component implements IInputPopupOptions, IInputPopupDefaultOptions {

	readonly modal = true;
	readonly z = 1000; // Topmost;

	titleFont: IGdiFont;
	textFont: IGdiFont;
	panelWidth: number;
	panelHeight: number;
	textColor: number;
	secondaryColor: number;
	backgroundColor: number;
	highlightColor: number;

	title: string;
	defaultText?: string;
	emptyText?: string;
	onSuccess?: () => void;
	onFail?: () => void;

	okBtn: Button2;
	cancelBtn: Button2;
	inputbox: InputBox;
	inputboxHeight: number;

	constructor(opts: IInputPopupOptions) {
		super(opts);

		Object.assign(this, defaultOptions, opts);

		console.log("defaultText: ", opts.defaultText);
		console.log(this.defaultText);


		this.paddings.top = scale(44);
		this.paddings.left = scale(40);

		// create buttons;
		this.okBtn = new Button2({
			text: "OK",
			textColor: mainColors.text,
			backgroundColor: mainColors.highlight,
			backgroundHoverColor: setAlpha(mainColors.highlight, 200),
			backgroundDownColor: setAlpha(mainColors.highlight, 127)
		});
		this.okBtn.setSize(scale(80), scale(32));
		this.okBtn.on_click = () => {
			notifyOthers("Hide.InputPopupPanel", this.cid);
		}

		this.cancelBtn = new Button2({
			text: "Cancel",
			textColor: this.textColor,
			backgroundHoverColor: RGB(100, 100, 100),
			backgroundDownColor: setAlpha(RGB(100, 100, 100), 127)
		});
		this.cancelBtn.setSize(scale(80), scale(32));
		this.cancelBtn.on_click = () => {
			notifyOthers("Hide.InputPopupPanel", this.cid);
		};

		// inputbox;
		this.inputbox = new InputBox({
			font: gdi.Font(globalFontName, scale(14)),
			font_italic: gdi.Font(globalFontName, scale(14), 2),
			foreColor: mainColors.background,
			backgroundActiveColor: RGB(255, 255, 255),
			backgroundSelectionColor: RGB(33, 136, 255),
			empty_text: (isEmptyString(this.emptyText) ? "" : this.emptyText),
			default_text: (isEmptyString(this.defaultText) ? "" : this.defaultText),
			func() { }
		});

		this.inputboxHeight = Math.round((MeasureString("ABCDgl汉字", this.inputbox.font).Height + scale(8)) / 4) * 4;

		;[this.inputbox, this.okBtn, this.cancelBtn].forEach(btn => {
			this.addChild(btn);
		});

		this.setSize(this.panelWidth, this.panelHeight);

	}

	getInputText() {
		return this.inputbox.text;
	}

	on_size() {
		const { inputbox, cancelBtn, okBtn: saveBtn } = this;
		const { top, left } = this.paddings;

		inputbox.setBoundary(
			this.x + left + scale(8),
			this.y + top + scale(52),
			this.width - 2 * left - scale(16),
			this.inputboxHeight
		);

		saveBtn.setPosition(
			this.x + this.width - saveBtn.width - left,
			inputbox.y + inputbox.height + scale(36));
		cancelBtn.setPosition(
			saveBtn.x - cancelBtn.width - scale(24),
			saveBtn.y);
	}

	on_paint(gr: IGdiGraphics) {
		const { textColor, backgroundColor } = this;
		const titleFont = this.titleFont;
		const { left, top } = this.paddings;

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// title;
		gr.DrawString(
			this.title,
			titleFont,
			textColor,
			this.x + left,
			this.y + top,
			this.width - 2 * left,
			scale(26),
			StringFormat.LeftTop);

		// draw inputbox background;
		let offset = (scale(36) - this.inputbox.height) / 2;
		gr.FillSolidRect(
			this.x + left,
			this.inputbox.y - offset, this.width - 2 * left,
			scale(36),
			this.inputbox.edit ? this.inputbox.backgroundActiveColor : RGB(100, 100, 100));
	}

}
