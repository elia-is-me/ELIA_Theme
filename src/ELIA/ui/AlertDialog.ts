import { Component } from "../common/BasePart";
import { Button } from "../common/Button";
import { globalFontName, mainColors } from "./Theme";
import {
	scale,
	RGB,
	StringFormat,
	StringTrimming,
	StringFormatFlags, isFunction
} from "../common/common";
import { notifyOthers } from "../common/UserInterface";

export interface IAlertDialogOptions {
	title: string;
	description?: string;
	onSuccess?: () => void;
}

interface IDefaultOptions {
	titleFont: IGdiFont;
	panelWidth: number;
	panelHeight: number;
	textColor: number;
	backgroundColor: number;
	highlightColor: number;
}

const defaultOptions: IDefaultOptions = {
	titleFont: gdi.Font(globalFontName, scale(16)),
	panelWidth: scale(400),
	panelHeight: scale(225),
	textColor: mainColors.text,
	backgroundColor: RGB(33, 33, 33),
	highlightColor: mainColors.highlight,
};

export class AlertDialog
	extends Component
	implements IAlertDialogOptions, IDefaultOptions {
	className = "AlertDialog";
	readonly modal: boolean = true;

	titleFont: IGdiFont;
	panelWidth: number;
	panelHeight: number;
	textColor: number;
	backgroundColor: number;
	highlightColor: number;

	title: string;

	okBtn: Button;
	cancelBtn: Button;

	constructor(options: IAlertDialogOptions) {
		super({});

		Object.assign(this, defaultOptions, options);

		this.paddings.top = scale(44);
		this.paddings.left = scale(40);

		this.okBtn = new Button({
			style: "text",
			text: "OK",
			foreColor: mainColors.text,

			// textColor: this.highlightColor,
			// textHoverColor: setAlpha(this.highlightColor, 200),
			// textDownColor: setAlpha(this.highlightColor, 127),
		});
		this.okBtn.setSize(scale(80), scale(32));
		this.okBtn.on_click = () => {
			if (isFunction(options.onSuccess)) {
				options.onSuccess();
			}
			notifyOthers("Hide.AlertDialog");
		};

		this.cancelBtn = new Button({
			style: "text",
			text: "Cancel",
			foreColor: mainColors.text,

			// textColor: this.textColor,
			// textHoverColor: setAlpha(this.textColor, 200),
			// textDownColor: setAlpha(this.textColor, 127),
		});
		this.cancelBtn.setSize(scale(80), scale(32));
		this.cancelBtn.on_click = () => {
			notifyOthers("Hide.AlertDialog");
		};

		[this.okBtn, this.cancelBtn].forEach(btn => {
			this.addChild(btn);
		});

		this.setSize(this.panelWidth, this.panelHeight);
	}

	on_size() {
		const { okBtn, cancelBtn } = this;
		const { top, left } = this.paddings;

		okBtn.setPosition(
			this.x + this.width - okBtn.width - left,
			this.y + this.height - top - okBtn.height
		);
		cancelBtn.setPosition(okBtn.x - cancelBtn.width - scale(24), okBtn.y);
	}

	on_paint(gr: IGdiGraphics) {
		const { textColor, backgroundColor } = this;
		const titleFont = this.titleFont;
		const { top, left } = this.paddings;

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
			this.height - 2 * top,
			StringFormat(0, 0, StringTrimming.None, StringFormatFlags.NoClip)
		);
	}
}
