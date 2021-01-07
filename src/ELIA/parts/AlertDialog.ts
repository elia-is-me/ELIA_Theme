import { scale, RGB, StringFormat, StringTrimming, StringFormatFlags, isFunction, setAlpha } from "../common/common";
import { Component } from "../common/BasePart";
import { Button } from "./Buttons";
import { GdiFont, themeColors } from "./Theme";
import { notifyOthers } from "../common/UserInterface";
import { lang } from "./Lang";

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
	titleFont: GdiFont("semibold, 20"),
	panelWidth: scale(400),
	panelHeight: scale(225),
	textColor: themeColors.titleText,
	backgroundColor: RGB(33, 33, 33),
	highlightColor: themeColors.highlight,
};

export class AlertDialog extends Component implements IAlertDialogOptions, IDefaultOptions {
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

		this.paddings.top = scale(24);
		this.paddings.left = scale(24);

		this.okBtn = new Button({
			style: "contained",
			text: lang("OK"),
			foreColor: themeColors.onPrimary,
			backgroundColor: themeColors.primary

		});
		this.okBtn.on_click = () => {
			if (isFunction(options.onSuccess)) {
				options.onSuccess();
			}
			notifyOthers("Hide.AlertDialog");
		};

		this.cancelBtn = new Button({
			style: "text",
			text: lang("Cancel"),
			foreColor: themeColors.secondary
		});
		this.cancelBtn.on_click = () => {
			notifyOthers("Hide.AlertDialog");
		};

		[this.okBtn, this.cancelBtn].forEach(btn => {
			this.addChild(btn);
		});

		// Measure string;
		let panel_width = scale(400) - 2 * this.paddings.left;
		let panel_height: number = 0;
		let temp_image = gdi.CreateImage(1, 1);
		let temp_gr = temp_image.GetGraphics();
		let textWidth = temp_gr.MeasureString(this.title, this.titleFont, 0, 0, panel_width, 1000).Width;
		if (textWidth > panel_width) {
			panel_height = 2 * this.paddings.top + scale(24) + 2 * this.titleFont.Height * 1.5 + this.okBtn.height;
		} else {
			panel_height = 2 * this.paddings.top + scale(24) + this.titleFont.Height * 1.5 + this.okBtn.height;
		}
		// then set panel size;
		this.setSize(panel_width, panel_height);
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
		gr.DrawRoundRect(this.x, this.y, this.width - scale(1), this.height - scale(1), scale(2), scale(2), scale(1), setAlpha(textColor, 50));

		// title;
		gr.DrawString(this.title, titleFont, textColor, this.x + left, this.y + top, this.width - 2 * left, this.height - 2 * top, StringFormat(0, 0, StringTrimming.None, StringFormatFlags.NoClip));
	}
}
