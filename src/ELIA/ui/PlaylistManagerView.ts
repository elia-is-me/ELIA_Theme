// -------------------------
// Playlist Manager
// -------------------------

import { scale, blendColors, RGB, StringFormat } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { scrollbarWidth, IThemeColors, mainColors, sidebarColors, scrollbarColor, globalFontName } from "./Theme";

export const PLM_Properties = {
	minWidth: scale(256),
	rowHeight: scale(40),
	itemFont: gdi.Font(globalFontName, scale(14)),
	iconFont: gdi.Font(MaterialFont, scale(20)),
	headerHeight: scale(22),
	headerFont: gdi.Font("Segoe UI Semibold", scale(12)),
}

const PLM_Colors: IThemeColors = {
	text: blendColors(mainColors.text, mainColors.background, 0.3),
	textActive: mainColors.text,
	background: sidebarColors.background,
	highlight: mainColors.highlight,
	background_sel: RGB(20, 20, 20),
	background_hover: RGB(10, 10, 10)
}

class PLM_Header extends Component {
	label: string = "PLAYLISTS";

	on_paint(gr: IGdiGraphics) {
		// gr.FillSolidRect(this.x, this.y, this.width, this.height,
		//     mainColors.background);
		gr.DrawString(this.label, PLM_Properties.headerFont,
			mainColors.text,
			this.x + scale(8), this.y, this.width - scale(16), this.height,
			StringFormat.LeftCenter);
	}
}

class PLM_Item {
	metadb: IFbMetadb; // First track in playlist;
	index: number;
	x: number = 0;
	y: number = 0;
	width: number = 0;
	height: number = 0;
	yOffset: number = 0;
	//
	listName: string = "";
	isSelect: boolean = false;
	isAuto: boolean = false;

	trace(x: number, y: number) {
		return x > this.x && x <= this.x + this.width
			&& y > this.y && y <= this.y + this.height;
	}
}

export class PlaylistManagerView extends ScrollView {
	items: PLM_Item[] = [];
	scrollbar: Scrollbar = new Scrollbar({
		cursorColor: scrollbarColor.cursor,
		backgroundColor: 0,
	});
	header: PLM_Header = new PLM_Header({});

	constructor(attrs: object) {
		super(attrs);
		this.addChild(this.scrollbar);
		this.addChild(this.header);
	}

	initList() {
		const rowHeight = PLM_Properties.rowHeight;
		const items: PLM_Item[] = [];
		const itemCount = plman.PlaylistCount;
		let itemYOffset = 0;

		for (let playlistIndex = 0; playlistIndex < itemCount; playlistIndex++) {
			let rowItem = new PLM_Item();
			let playlistMetadbs = plman.GetPlaylistItems(playlistIndex);
			items.push(rowItem);
			rowItem.index = playlistIndex;
			rowItem.height = rowHeight;
			rowItem.metadb = (playlistMetadbs.Count === 0 ? null : playlistMetadbs[0]);
			rowItem.listName = plman.GetPlaylistName(playlistIndex)
			// FIXIT: isAuto 不能在foobar启动时被设置，force reload script 之后正常.
			rowItem.isAuto = plman.IsAutoPlaylist(playlistIndex);
			rowItem.yOffset = itemYOffset;
			itemYOffset += rowHeight;
		}

		this.items = items;
		this.totalHeight = rowHeight * itemCount + PLM_Properties.headerHeight;
	}

	on_init() {
		this.initList();
	}

	on_size() {
		if (this.items.length > 0) {
			let items_ = this.items;

			for (let playlistId = 0; playlistId < plman.PlaylistCount; playlistId++) {
				let rowItem = items_[playlistId];
				rowItem.x = this.x;
				rowItem.width = this.width;
			}
		}

		this.scrollbar.setSize(
			this.x + this.width - scale(14),
			this.y + PLM_Properties.headerHeight,
			scrollbarWidth,
			this.height - PLM_Properties.headerHeight
		);

		this.header.setSize(
			this.x, this.y, this.width, PLM_Properties.headerHeight
		);
	}

	on_paint(gr: IGdiGraphics) {
		let rowHeight = PLM_Properties.rowHeight;
		let items_ = this.items;
		let colors = PLM_Colors;
		let itemFont = PLM_Properties.itemFont;
		let iconFont = PLM_Properties.iconFont;
		let headerHeight = PLM_Properties.headerHeight;
		let paddingL = scale(16);
		let paddingR = scale(4);

		// draw background
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// draw items;
		for (let itemIndex = 0; itemIndex < items_.length; itemIndex++) {
			let rowItem = items_[itemIndex];
			rowItem.x = this.x;
			rowItem.width = this.width;
			rowItem.y = this.y + headerHeight
				+ rowItem.yOffset - this.scroll;

			// items in visible area;
			if (rowItem.y + rowHeight >= this.y + headerHeight
				&& rowItem.y < this.y + this.height) {

				let isActive = rowItem.index === plman.ActivePlaylist;
				let textColor = (isActive ? colors.textActive : colors.text);
				let indicateWidth = scale(4);

				if (isActive) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height,
						colors.text & 0x1fffffff);
				}

				// draw icon;
				let icon_ = (rowItem.isAuto ? Material.settings : Material.queue_music);
				gr.DrawString(icon_, iconFont, textColor,
					rowItem.x + paddingL, rowItem.y, rowHeight, rowHeight, StringFormat.Center);

				// draw list name;
				gr.DrawString(rowItem.listName, itemFont, textColor,
					rowItem.x + paddingL + rowHeight,
					rowItem.y,
					rowItem.width - paddingL - paddingR - rowHeight,
					rowHeight,
					StringFormat.LeftCenter);


			}
		}
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * PLM_Properties.rowHeight * 3);
	}
}
