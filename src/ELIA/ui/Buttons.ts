import { textRenderingHint } from "../common/BasePart";
import {
	MeasureString,
	RGB,
	scale,
	setAlpha,
	SmoothingMode,
} from "../common/common";
import { Button, ButtonStates, Clickable } from "../common/IconButton";
import { Material, MaterialFont } from "../common/iconCode";
import { SerializableIcon } from "../common/IconType";
import { globalFontName, mainColors } from "./Theme";

export class ShuffleButton extends Clickable {
	foreColorMap: Map<string, number> = new Map();
	backgroundColorMap: Map<number, number> = new Map();
	constructor() {
		super({});
		const colors = {
			foreColor: RGB(5, 5, 5),
			foreHoverColor: setAlpha(mainColors.text, 200),
			foreDownColor: setAlpha(mainColors.text, 127),
			backgroundColor: RGB(255, 255, 255),
		};
		const foreColorMap: Map<number, number> = new Map();
		const backgroundColorMap: Map<number, number> = new Map();
		// fore
		foreColorMap.set(ButtonStates.Normal, colors.foreColor);
		foreColorMap.set(ButtonStates.Hover, colors.foreHoverColor);
		foreColorMap.set(ButtonStates.Down, colors.foreDownColor);
		// background
		backgroundColorMap.set(ButtonStates.Normal, colors.backgroundColor);
		backgroundColorMap.set(ButtonStates.Hover, colors.backgroundColor);
		backgroundColorMap.set(ButtonStates.Down, colors.backgroundColor);

		const shuffleIcon = new SerializableIcon({
			name: MaterialFont,
			code: Material.shuffle,
			size: scale(22),
		});

		const shuffleSize = {
			width: scale(100),
			height: scale(28),
		};

		this.setSize(shuffleSize.width, shuffleSize.height);

		let textFont = gdi.Font("Segoe UI Semibold", scale(14));
		let textWidth = MeasureString("SHUFFLE", textFont).Width;
		let iconWidth = MeasureString(shuffleIcon.code, shuffleIcon.iconFont).Width;
		let gap = scale(8);
		let padLeft = this.width - (textWidth - iconWidth - gap) / 2;

		shuffleIcon.setSize(iconWidth, this.height);

		this.on_paint = (gr: IGdiGraphics) => {
			let foreColor = foreColorMap.get(this.state);
			let background = backgroundColorMap.get(this.state);

			gr.SetSmoothingMode(SmoothingMode.AntiAlias);
			gr.FillRoundRect(
				this.x,
				this.y,
				this.width,
				this.height,
				2,
				2,
				background
			);
			shuffleIcon.draw(gr, foreColor, 0, this.x + padLeft, this.y);
		};
	}
}
