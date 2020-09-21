import { scale, RGB, StringFormat, TextRenderingHint, setAlpha } from "../common/common";
import { Icon2 } from "../common/IconButton";
import { Component, textRenderingHint } from "../common/BasePart";
import { mainColors } from "./Theme";
import { SerializableIcon } from "../common/IconType";
import { SearchBox } from "./SearchBox";
import { notifyOthers } from "../common/UserInterface";

type IconKeysType = "menu" | "settings" | "apps";

interface ITopbarOptions {
	backgroundColor: number;
	foreColor: number;
	hoverColor: number;
	icons: { [keys in IconKeysType]: SerializableIcon };
}

/* TODO */
export const Topbar_Properties = {
	height: scale(56),
};

export class TopBar extends Component {
	foreColor: number;
	backgroundColor: number;
	icons: { [keys in IconKeysType]: SerializableIcon };
	private _icoWidth: number = scale(40);
	private _logoFont = gdi.Font("Impact", scale(18));
	private _logoText = "foobar2000";

	mainIco: Icon2;
	settingsIco: Icon2;
	switchIco: Icon2;
	searchBox: SearchBox;

	constructor(opts: ITopbarOptions) {
		super({});

		this.foreColor = opts.foreColor;
		this.backgroundColor = opts.backgroundColor;
		this.icons = opts.icons;

		this.mainIco = new Icon2({
			fontIcon: this.icons.menu,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});

		this.mainIco.on_click = () => {
			notifyOthers("Toggle.PlaylistManager");
		};

		this.settingsIco = new Icon2({
			fontIcon: this.icons.settings,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});

		this.switchIco = new Icon2({
			fontIcon: this.icons.apps,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});

		this.searchBox = new SearchBox({
			backgroundColor: RGB(30, 30, 30),
			backgroundActiveColor: RGB(77, 77, 77),
			foreColor: mainColors.text,
			iconColors: {
				normal: mainColors.text,
				hover: setAlpha(mainColors.text, 200),
				down: setAlpha(mainColors.text, 127),
			},
		});

		[this.mainIco, this.switchIco, this.searchBox, this.settingsIco].forEach((child) =>
			this.addChild(child)
		);
	}

	on_init() {}

	on_size() {
		let icoOffsetTop = ((this.height - this._icoWidth) / 2) | 0;
		let padLeft = scale(16);
		let { _icoWidth } = this;

		this.mainIco.setBoundary(this.x + padLeft, this.y + icoOffsetTop, _icoWidth, _icoWidth);
		this.settingsIco.setBoundary(
			this.x + this.width - padLeft - _icoWidth,
			this.y + icoOffsetTop,
			_icoWidth,
			_icoWidth
		);
		this.switchIco.setBoundary(
			this.settingsIco.x - _icoWidth - scale(4),
			this.y + icoOffsetTop,
			_icoWidth,
			_icoWidth
		);

		this.searchBox.setBoundary(
			this.x + scale(272),
			this.y + scale(8),
			scale(400),
			this.height - scale(16)
		);
	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);

		const { _logoFont, _logoText, foreColor } = this;
		const logoX = this.mainIco.x + this.mainIco.width + scale(16);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(
			_logoText,
			_logoFont,
			foreColor,
			logoX,
			this.y,
			1000,
			this.height,
			StringFormat.LeftCenter
		);
		gr.SetTextRenderingHint(textRenderingHint);
	}
}

/**
 * TODO:
 *
 * - switch btn?
 * - settings btn?
 * - add a now playing panel popup btn;
 */
