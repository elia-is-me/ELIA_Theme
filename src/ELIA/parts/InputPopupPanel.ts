import { Component } from "../common/BasePart";
import { RGB, scale, isEmptyString, isFunction, setAlpha } from "../common/common";
import { Button } from "./Buttons";
import { InputBox } from "../common/Inputbox";
import { notifyOthers } from "../common/UserInterface";
import { themeColors, fonts, GdiFont } from "./Theme";
import { lang } from "./Lang";
import { MeasureString, StringFormat } from "../common/String";


export interface IInputPopupOptions {
	title: string;
	defaultText?: string;
	emptyText?: string;
	onSuccess?(str: string): void;
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
	titleFont: GdiFont("bold, 20"),
	textFont: GdiFont("semibold,14"),
	panelWidth: scale(450),
	panelHeight: scale(225),
	textColor: themeColors.titleText,
	backgroundColor: RGB(33, 33, 33),
	highlightColor: themeColors.highlight,
}


export class InputPopupPanel
	extends Component
	implements IInputPopupOptions, IInputPopupDefaultOptions {
	readonly modal = true;
	type = 1;
	grabFocus = false;

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

	okBtn: Button;
	cancelBtn: Button;
	inputbox: InputBox;
	inputboxHeight: number;

	constructor(opts: IInputPopupOptions) {
		super(opts);

		this.z = 1000;
		Object.assign(this, defaultOptions, opts);

		this.paddings.top = scale(24);
		this.paddings.left = scale(24);

		// create buttons;
		this.okBtn = new Button({
			text: lang("OK"),
			style: "contained",
			foreColor: themeColors.onPrimary,
			backgroundColor: themeColors.primary
		});
		this.okBtn.on_click = () => {
			if (this.inputbox.text) {
				if (isFunction(opts.onSuccess)) {
					opts.onSuccess(this.inputbox.text);
				}
			}
			notifyOthers("Hide.InputPopupPanel", this.cid);
		};

		this.cancelBtn = new Button({
			style: "text",
			text: lang("Cancel"),
			foreColor: themeColors.secondary,
		});
		this.cancelBtn.on_click = () => {
			notifyOthers("Hide.InputPopupPanel", this.cid);
		};

		// inputbox;
		this.inputbox = new InputBox({
			font: fonts.normal_14,
			font_italic: fonts.normal_14,
			foreColor: RGB(0, 0, 0),
			backgroundActiveColor: RGB(255, 255, 255),
			backgroundSelectionColor: RGB(33, 136, 255),
			empty_text: isEmptyString(this.emptyText) ? "" : this.emptyText,
			default_text: isEmptyString(this.defaultText) ? "" : this.defaultText,
			func: () => {
				if (isFunction(opts.onSuccess)) {
					opts.onSuccess(this.inputbox.text);
				}
				notifyOthers("Hide.InputPopupPanel", this.cid);
			},
		});

		this.inputboxHeight =
			Math.round(
				(MeasureString("ABCDgll" + lang("OK"), this.inputbox.font).Height + scale(8)) / 4
			) * 4;

		[this.inputbox, this.okBtn, this.cancelBtn].forEach(btn => {
			this.addChild(btn);
		});


		// calculate panel height;
		let title_height = this.titleFont.Height;
		let panel_height = 2 * this.paddings.top + title_height + scale(16) + this.inputboxHeight + scale(24) + this.okBtn.height;

		// set panel size;
		this.setSize(this.panelWidth, panel_height);
	}

	on_size() {
		const { inputbox, cancelBtn, okBtn } = this;
		const { top, left } = this.paddings;

		inputbox.setBoundary(
			this.x + left + scale(8),
			this.y + top + this.titleFont.Height + scale(16),
			this.width - 2 * left - scale(16),
			this.inputboxHeight
		);

		okBtn.setPosition(
			this.x + this.width - okBtn.width - left,
			inputbox.y + inputbox.height + scale(24)
		);

		cancelBtn.setPosition(okBtn.x - cancelBtn.width - scale(24), okBtn.y);
	}

	on_paint(gr: IGdiGraphics) {
		const { textColor, backgroundColor } = this;
		const titleFont = this.titleFont;
		const { left, top } = this.paddings;

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);
		gr.DrawRoundRect(this.x, this.y, this.width - scale(1), this.height - scale(1), scale(2), scale(2), scale(1), setAlpha(textColor, 50));

		// title;
		gr.DrawString(this.title, titleFont, textColor, this.x + left, this.y + top, this.width - 2 * left, scale(26), StringFormat.LeftTop);

		// draw inputbox background;
		let offset = (scale(36) - this.inputbox.height) / 2;
		gr.FillSolidRect(
			this.x + left,
			this.inputbox.y - offset,
			this.width - 2 * left,
			scale(36),
			this.inputbox.edit
				? this.inputbox.backgroundActiveColor
				: RGB(100, 100, 100)
		);
	}
}
