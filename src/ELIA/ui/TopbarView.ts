import { scale, RGB, StringFormat, TextRenderingHint, setAlpha } from "../common/common";
import { Icon2 } from "../common/IconButton";
import { Component } from "../common/BasePart";
import { mainColors } from "./Theme";
import { SerializableIcon } from "../common/IconType";
import { SearchBox } from "./SearchBox";
import { notifyOthers, ui } from "../common/UserInterface";
import { Material, MaterialFont } from "../common/iconCode";

const iconSize = scale(20);
const textRenderingHint = ui.textRender;

const menuIcon = new SerializableIcon({
	code: Material.menu,
	name: MaterialFont,
	size: iconSize,
});

const settingsIcon = new SerializableIcon({
	code: Material.gear,
	name: MaterialFont,
	size: iconSize,
});

const appsIcon = new SerializableIcon({
	code: Material.apps,
	name: MaterialFont,
	size: iconSize,
});

const topbarColors = {
	backgroundColor: RGB(37, 37, 37),
	foreColor: mainColors.text,
};


export const Topbar_Properties = {
	height: scale(56),
};

export class TopBar extends Component {
	foreColor: number;
	backgroundColor: number;
	private _icoWidth: number = scale(40);
	private _logoFont = gdi.Font("Impact", scale(18));
	private _logoText = "foobar2000";

	mainIco: Icon2;
	settingsIco: Icon2;
	switchIco: Icon2;
	searchBox: SearchBox;

	constructor() {
		super({});

		this.foreColor = topbarColors.foreColor;
		this.backgroundColor = topbarColors.backgroundColor;

		this.mainIco = new Icon2({
			fontIcon: menuIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});

		this.mainIco.on_click = () => {
			notifyOthers("Toggle.PlaylistManager");
		};

		this.settingsIco = new Icon2({
			fontIcon: settingsIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});
		this.settingsIco.disable();

		this.switchIco = new Icon2({
			fontIcon: appsIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});
		this.switchIco.disable();

		this.searchBox = new SearchBox();

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
 */
