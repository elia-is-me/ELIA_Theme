import { scale, MeasureString, RGB, StringFormat } from "../common/common";
import { Component, ThrottledRepaint, Icon } from "../common/components";
import { globalFontName, IThemeColors, mainColors } from "./Theme";

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

	colors: IThemeColors;
	logoIcon: IGdiBitmap;
	searchInput: any;
	searchButton: any;
	backButton: Icon;

	constructor(attr: object) {
		super(attr);

		this.colors = Topbar_Colors;
	}

	on_init() {

	}

	on_size() {
	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.colors.background);
	}
}
