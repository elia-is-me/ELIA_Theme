import { scale, MeasureString, RGB, StringFormat, TextRenderingHint, setAlpha } from "../common/common";
import { ThrottledRepaint } from "../common/common";
import { Icon, ButtonStates, Button, Icon2 } from "../common/IconButton";
import { Component, textRenderingHint } from "../common/BasePart";
import { globalFontName, IThemeColors, mainColors } from "./Theme";
import { SerializableIcon } from "../common/IconType";
import { MaterialFont, Material } from "../common/iconCode";
import { SearchBox } from "./SearchBox";
import { notifyOthers } from "./Layout";

class TabItem {
	private defaultPadding = scale(4);
	id: number;
	x: number;
	y: number;
	width: number;
	height: number;
	text: string;
	padding: number;
	constructor(attr: {
		text: string;
		padding?: number;
	}) {
		this.text = attr.text;
		if (attr.padding != null) {
			this.padding = attr.padding | 0;
		} else {
			this.padding = this.defaultPadding;
		}
	}

	trace(x: number, y: number) {
		return (x > this.x && x <= this.x + this.width
			&& y > this.y && y <= this.y + this.height);
	}
}


// Switch tabs;
class SwitchTab extends Component {
	font: IGdiFont;
	gapWdith = scale(36);
	tabItems: TabItem[];
	private focusTabIndex: number;
	private hoverTabIndex: number;

	constructor(attr: {
		font: IGdiFont
		items: string[],
		focusTab?: number
	}) {
		super(attr);

		this.font = attr.font;
		const itemPaddingLR = scale(4);
		this.tabItems = attr.items.map(item => new TabItem({ text: item, padding: itemPaddingLR }));
		this.focusTabIndex = (attr.focusTab == null ? 0 : attr.focusTab);
	}

	calcTotalWidth() {
		return (this.tabItems.length - 1) * this.gapWdith + this.tabItems
			.map(item => MeasureString(item.text, this.font).Width + 2 * item.padding)
			.reduce((prevResult, item, index, array) => { return prevResult += item });
	}

	on_paint(gr: IGdiGraphics) {
		let itemX = this.x;
		let itemColor: number = RGB(150, 150, 150);
		let itemColorFocus: number = RGB(225, 225, 225);
		let lineHeight = scale(2);
		let lineY = this.y + this.height - lineHeight;

		for (let i = 0; i < this.tabItems.length; i++) {
			let itemPaddingLR = this.tabItems[i].padding;
			let itemWidth = gr.MeasureString(
				this.tabItems[i].text, this.font, 0, 0, 999, 9999, StringFormat.LeftCenter).Width
				+ 2 * itemPaddingLR;
			gr.DrawString(this.tabItems[i].text, this.font,
				(i == this.focusTabIndex || i === this.hoverTabIndex) ? itemColorFocus : itemColor,
				itemX + itemPaddingLR, this.y,
				itemWidth, this.height, StringFormat.LeftCenter);
			if (i == this.focusTabIndex) {
				gr.DrawLine(itemX, lineY, itemX + itemWidth, lineY, lineHeight, itemColorFocus);
			}

			this.tabItems[i].x = itemX;
			this.tabItems[i].width = itemWidth;
			this.tabItems[i].y = this.y;
			this.tabItems[i].height = this.height;

			itemX += (itemWidth + this.gapWdith)
		}
	}

	on_mouse_move(x: number, y: number) {
		const hotItemIndex = this.tabItems.findIndex(item => item.trace(x, y));
		if (this.hoverTabIndex !== hotItemIndex) {
			this.hoverTabIndex = hotItemIndex;
			ThrottledRepaint();
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		const hotItemIndex = this.tabItems.findIndex(item => item.trace(x, y));
		if (hotItemIndex !== -1 && this.focusTabIndex !== hotItemIndex) {
			this.focusTabIndex = hotItemIndex;
			this.onTabChange(this.focusTabIndex);
			ThrottledRepaint();
		}
	}

	onTabChange(to: number) { }

	on_mouse_leave() {
		this.hoverTabIndex = -1;
		ThrottledRepaint();
	}
}

type IconKeysType = "menu" | "settings" | "apps";

interface ITopbarOptions {
	backgroundColor: number;
	foreColor: number;
	hoverColor: number;
	icons: { [keys in IconKeysType]: SerializableIcon }
}

/* TODO */
export const Topbar_Properties = {
	height: scale(56),
	tabFont: gdi.Font(globalFontName, scale(14)),
	focusTabIndex: +window.GetProperty("Topbar.focusTab", 0),
}

const Topbar_Colors: IThemeColors = {
	text: mainColors.text,
	background: RGB(37, 37, 37),
	highlight: mainColors.highlight
};

export class TopBar extends Component {

	logoIcon: IGdiBitmap;
	searchInput: any;
	searchButton: any;
	backButton: Icon;
	foreColor: number;
	backgroundColor: number;
	icons: { [keys in IconKeysType]: SerializableIcon };
	private _icoWidth: number = scale(40);
	private _iconColorMap: Map<ButtonStates, number>;
	private _logoFont = gdi.Font("Impact", scale(18));
	private _logoText = "foobar2000"

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
			downColor: setAlpha(this.foreColor, 128)
		});

		this.mainIco.on_click = (x: number, y: number) => {
			notifyOthers("Toggle.PlaylistManager");
		}

		this.settingsIco = new Icon2({
			fontIcon: this.icons.settings,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128)
		});

		this.switchIco = new Icon2({
			fontIcon: this.icons.apps,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128)
		});

		this.searchBox = new SearchBox({
			backgroundColor: RGB(30, 30, 30),
			backgroundActiveColor: RGB(77, 77, 77),
			foreColor: mainColors.text,
			iconColors: {
				normal: mainColors.text,
				hover: setAlpha(mainColors.text, 200),
				down: setAlpha(mainColors.text, 127)
			}
		});

		[this.mainIco, this.switchIco, this.searchBox, this.settingsIco]
			.forEach(child => this.addChild(child))

	}

	on_init() {

	}

	on_size() {
		let icoOffsetTop = ((this.height - this._icoWidth) / 2) | 0;
		let padLeft = scale(16);
		let { _icoWidth } = this;

		this.mainIco.setBoundary(this.x + padLeft, this.y + icoOffsetTop, _icoWidth, _icoWidth);
		this.settingsIco.setBoundary(this.x + this.width - padLeft - _icoWidth, this.y + icoOffsetTop, _icoWidth, _icoWidth);
		this.switchIco.setBoundary(this.settingsIco.x - _icoWidth - scale(4), this.y + icoOffsetTop, _icoWidth, _icoWidth);

		this.searchBox.setBoundary(this.x + scale(272), this.y + scale(8), scale(400), this.height - scale(16));
	}

	on_paint(gr: IGdiGraphics) {

		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);

		const { _logoFont, _logoText, foreColor } = this;
		const logoX = this.mainIco.x + this.mainIco.width + scale(16);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(_logoText, _logoFont, foreColor, logoX, this.y, 1000, this.height, StringFormat.LeftCenter);
		gr.SetTextRenderingHint(textRenderingHint);

	}
}


/**
 * TODO:
 * 
 * - menu btn onClick action?
 * - switch btn?
 * - settings btn?
 * - add a now playing panel popup btn;
 */