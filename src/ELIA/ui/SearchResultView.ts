import { Component, IBoxModel, textRenderingHint } from "../common/BasePart";
import {
	RGB,
	scale,
	isEmptyString,
	StringFormat,
	MeasureString,
	TextRenderingHint,
} from "../common/common";
import { mainColors, globalFontName, scrollbarColor } from "./Theme";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { IPaddings } from "../common/BasePart";
import { SerializableIcon } from "../common/IconType";
import { MaterialFont, Material } from "../common/iconCode";

interface IHeaderOptions {
	titleText: string;
	metadbs?: IFbMetadbList;
}

interface IDefaultHeaderOptions {
	textColor: number;
	secondaryColor: number;
	backgroundColor: number;
	titleFont: IGdiFont;
	textFont: IGdiFont;
}

const defaultHeaderOptions: IDefaultHeaderOptions = {
	textColor: mainColors.text,
	secondaryColor: mainColors.secondaryText,
	backgroundColor: RGB(28, 28, 28),
	titleFont: gdi.Font(globalFontName, scale(28)),
	textFont: gdi.Font(globalFontName, scale(14)),
};

class HeaderView extends Component implements IHeaderOptions, IDefaultHeaderOptions {
	titleText: string = "";
	desciptionText: string = "";
	metadbs: IFbMetadbList;

	textColor: number;
	secondaryColor: number;
	backgroundColor: number;
	titleFont: IGdiFont;
	textFont: IGdiFont;
	paddings: IPaddings;

	constructor(options: IHeaderOptions) {
		super({});

		this.paddings = {
			top: 0,
			left: 0,
			bottom: 0,
			right: 0,
		};
		Object.assign(this, defaultHeaderOptions, options);

		if (this.metadbs != null) {
			this.desciptionText =
				this.metadbs.Count +
				" tracks" +
				" \u2022" +
				utils.FormatDuration(this.metadbs.CalcTotalDuration());
		}
	}

	setPaddings(width: number): void {
		let thin = scale(600);
		let wide = scale(920);
		let extrawide = scale(1120);

		if ((this.parent as any).paddings) {
			this.paddings.left = (this.parent as any).paddings.left;
			this.paddings.right = (this.parent as any).paddings.right;
		}

		// if (width < thin) {
		// // 	this.paddings.top = this.paddings.bottom = scale(12);
		// // } else if (wide < wide) {
		// // 	this.paddings.top = this.paddings.bottom = scale(12);
		// // } else if (wide < extrawide) {
		// // 	this.paddings.top = this.paddings.bottom = scale(32);
		// }
		this.paddings.top = this.paddings.bottom = scale(40);
	}

	on_size() {
		this.setPaddings(this.width);
	}

	on_paint(gr: IGdiGraphics) {
		let textY = this.y + this.paddings.top;
		let textX = this.x + this.paddings.left;
		let textW = this.width - this.paddings.left - this.paddings.right;
		let textFont = this.textFont;
		let titleFont = this.titleFont;

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);

		// type;
		gr.DrawString(
			"SEARCH RESULTS",
			textFont,
			this.secondaryColor,
			textX,
			textY,
			textW,
			1.5 * textFont.Height,
			StringFormat.LeftTop
		);

		textX += scale(16);
		textY += 2 * textFont.Height;

		// title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(
			`"${this.titleText}"`,
			titleFont,
			this.textColor,
			textX,
			textY,
			textW,
			2 * titleFont.Height,
			StringFormat.LeftTop
		);
		gr.SetTextRenderingHint(textRenderingHint);

		textY += 1.2 * titleFont.Height;

		// description text;
		gr.DrawString(
			this.desciptionText,
			textFont,
			this.secondaryColor,
			textX,
			textY,
			textW,
			2 * textFont.Height,
			StringFormat.LeftTop
		);
	}
}

class PlaylistColumn {
	visible: boolean = true;
	x: number = 0;
	width: number = 0;

	primaryColor: number;
	private _paddingLeft = 0;
	private _paddingRight = 0;

	setPaddings(paddings: { left?: number; right?: number }) {
		paddings.left != null && (this._paddingLeft = paddings.left);
		paddings.right != null && (this._paddingRight = paddings.right);
	}

	setVisible(visible: boolean) {
		this.visible = visible;
	}

	draw(
		gr: IGdiGraphics,
		text: string | number,
		font: IGdiFont,
		color: number,
		row: IBoxModel,
		sf: number = StringFormat.LeftCenter
	) {
		let x_ = this.x + this._paddingLeft;
		let width_ = this.width - (this._paddingLeft + this._paddingRight);
		let y_ = row.y;
		let height_ = row.height;
		gr.DrawString(text, font, color, x_, y_, width_, height_, sf);
	}
}

const tfTrackInfo = fb.TitleFormat(
	"%tracknumber%^^[%artist%]^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]"
);

class PlaylistViewItem implements IBoxModel {
	x: number = 0;
	y: number = 0;
	width: number = 0;
	height: number = 0;
	yOffset: number = 0;

	// info
	metadb: IFbMetadb;
	rowIndex: number; // rowIndex
	playlistIndex: number;
	playlistItemIndex: number;
	rating: number;
	trackNumber: string;
	title: string;
	artist: string;
	album: string;
	time: string;

	// state
	isSelect: boolean = false;

	trace(x: number, y: number) {
		return x > this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
	}

	getTags() {
		if (!this.metadb) return;
		if (!isEmptyString(this.title)) return;

		let rawInfo = tfTrackInfo.EvalWithMetadb(this.metadb).split("^^");
		this.title = rawInfo[2];
		this.trackNumber = rawInfo[0];
		this.artist = rawInfo[1];
		this.album = rawInfo[5];
		this.time = rawInfo[3];
		this.rating = Number(rawInfo[4]);
	}
}

interface ISearchPanelOptions {
	titleText: string;
	metadbs?: IFbMetadbList;
}

interface IDefaultOptions {
	textColor: number;
	secondaryColor: number;
	backgroundColor: number;
	selectionColor: number;
	highlightColor: number;
	moodColor: number;
	itemFont: IGdiFont;
	rowHeight: number;
}

const defaultOptions: IDefaultOptions = {
	textColor: mainColors.text,
	secondaryColor: mainColors.secondaryText,
	backgroundColor: RGB(28, 28, 28),
	highlightColor: mainColors.highlight,
	moodColor: RGB(221, 0, 27),
	selectionColor: RGB(42, 42, 42),

	itemFont: gdi.Font(globalFontName, scale(14)),
	rowHeight: scale(40),
};

export class SearchResultView extends ScrollView implements ISearchPanelOptions, IDefaultOptions {
	textColor: number;
	secondaryColor: number;
	backgroundColor: number;
	selectionColor: number;
	highlightColor: number;
	moodColor: number;

	itemFont: IGdiFont;
	rowHeight: number;
	paddings: IPaddings;

	titleText: string = "";
	metadbs: IFbMetadbList;
	items: PlaylistViewItem[] = [];
	visibleItems: PlaylistViewItem[] = [];
	itemsTotalHeight: number;
	_selectedIndexes: number[] = [];

	hoverIndex: number = -1;
	focusIndex: number = -1;

	scrollbar: Scrollbar;
	headerView: HeaderView;
	heartOnIco: SerializableIcon;
	heartOffIco: SerializableIcon;

	_columnsMap: Map<string, PlaylistColumn> = new Map();

	constructor(options: ISearchPanelOptions) {
		super({});

		Object.assign(this, defaultOptions, options);

		this.scrollbar = new Scrollbar({
			cursorColor: scrollbarColor.cursor,
			backgroundColor: 0,
		});

		this.headerView = new HeaderView({
			titleText: this.titleText,
			metadbs: this.metadbs,
		});

		[this.scrollbar, this.headerView].forEach(child => this.addChild(child));

		this.heartOnIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.heart,
			size: scale(16),
		});

		this.heartOffIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.heart_empty,
			size: scale(16),
		});

		this._columnsMap.set("trackNumber", new PlaylistColumn());
		this._columnsMap.set("title", new PlaylistColumn());
		this._columnsMap.set("artist", new PlaylistColumn());
		this._columnsMap.set("album", new PlaylistColumn());
		this._columnsMap.set("mood", new PlaylistColumn());
		this._columnsMap.set("time", new PlaylistColumn());

		this.setList();
	}

	setList() {
		let metadbs = this.metadbs;
		let resultItems: PlaylistViewItem[] = [];
		let resultCount = metadbs.Count;
		let rowHeight = this.rowHeight;
		let itemYOffset = 0;
		this._selectedIndexes = [];

		for (let i = 0; i < resultCount; i++) {
			let rowItem = new PlaylistViewItem();
			rowItem.rowIndex = i;
			rowItem.metadb = metadbs[i];
			rowItem.playlistItemIndex = undefined;
			rowItem.yOffset = itemYOffset;
			rowItem.height = rowHeight;
			rowItem.isSelect = false;
			resultItems.push(rowItem);
			itemYOffset += rowHeight;
		}

		this.items = resultItems;
		this.itemsTotalHeight = rowHeight * resultItems.length + rowHeight;
		this.totalHeight = this.itemsTotalHeight + this.headerView.height;
	}

	getPaddingOnWidth_(panelWidth: number): IPaddings {
		let thin = scale(750);
		let wide = scale(1150);
		let paddings: IPaddings = { top: 0, bottom: 0, right: 0, left: 0 };

		if (panelWidth < thin) {
			paddings.top = scale(16);
			paddings.bottom = scale(16);
			paddings.right = scale(24);
			paddings.left = scale(24);
		} else if (panelWidth < wide) {
			paddings.top = scale(24);
			paddings.bottom = scale(24);
			paddings.left = scale(40);
			paddings.right = scale(40);
		} else {
			paddings.top = scale(40);
			paddings.bottom = scale(40);
			paddings.right = scale(40);
			paddings.left = scale(40);
		}
		return paddings;
	}

	setColumns() {
		const paddings = this.paddings;
		const padLeft = paddings.left;
		const padRight = paddings.right;

		// ---------------
		// Columns;
		// ---------------
		const trackNumber = this._columnsMap.get("trackNumber");
		const title = this._columnsMap.get("title");
		const artist = this._columnsMap.get("artist");
		const album = this._columnsMap.get("album");
		const mood = this._columnsMap.get("mood");
		const time = this._columnsMap.get("time");

		// --------------
		// Set visible
		// -------------
		album.setVisible(true); // hide by default

		// ------------------
		// Set columns' size;
		// ------------------
		trackNumber.width = scale(60);
		time.width = scale(16) + MeasureString("00:00", this.itemFont).Width;
		mood.width = scale(48);

		let whitespace = this.width - padLeft - padRight;
		mood.visible && (whitespace -= mood.width);
		whitespace -= time.width;
		whitespace -= trackNumber.width;

		let titleWidth_ = scale(215);
		let artistWidth_ = scale(100);
		let albumWidth_ = scale(100);

		let artistVis = artist.visible && whitespace > titleWidth_;
		let albumVis = album.visible && whitespace > titleWidth_ + artistWidth_ + albumWidth_ / 2;
		let widthToAdd_ = whitespace - titleWidth_;
		let floor = Math.floor;

		if (artistVis) {
			widthToAdd_ = floor((whitespace - titleWidth_ - artistWidth_) / 2);
		}

		if (albumVis) {
			widthToAdd_ = floor((whitespace - titleWidth_ - artistWidth_ - albumWidth_) / 3);
		}

		trackNumber.x = this.x + padLeft;

		title.x = trackNumber.x + trackNumber.width;
		title.width = titleWidth_ + widthToAdd_;

		artist.x = title.x + title.width;
		artist.width = artistVis ? artistWidth_ + widthToAdd_ : 0;

		album.x = artist.x + artist.width;
		album.width = albumVis ? albumWidth_ + widthToAdd_ : 0;

		mood.x = album.x + album.width;
		time.x = mood.x + mood.width;

		// ----------------------
		// Set columns' paddings
		// ----------------------
		trackNumber.setPaddings({ left: scale(8) });
		title.setPaddings({ right: scale(16) });
		artist.setPaddings({ right: scale(16) });
	}

	on_size() {
		this.paddings = this.getPaddingOnWidth_(this.width);

		// update row x & width;
		for (let i = 0, items = this.items, len = this.items.length; i < len; i++) {
			let item = this.items[i];
			item.x = this.x;
			item.width = this.width;
		}

		this.setColumns();

		this.scrollbar.setBoundary(this.x + this.width - scale(14), this.y, scale(14), this.height);

		this.headerView.setPaddings(this.width);
		let headerHeight =
			2 * this.headerView.textFont.Height +
			1.2 * this.headerView.titleFont.Height +
			this.headerView.textFont.Height +
			this.headerView.paddings.top +
			this.headerView.paddings.bottom;
		this.headerView.setBoundary(this.x, this.y, this.width, headerHeight);
	}

	on_paint(gr: IGdiGraphics) {
		let { top, bottom, right, left } = this.paddings;
		let { itemFont } = this;

		let _columnsMap = this._columnsMap;
		let cTrackNumber = _columnsMap.get("trackNumber");
		let cTitle = _columnsMap.get("title");
		let cArtist = _columnsMap.get("artist");
		let cAlbum = _columnsMap.get("album");
		let cMood = _columnsMap.get("mood");
		let cTime = _columnsMap.get("time");

		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);

		// Clear visibleItems;
		this.visibleItems = [];

		// draw items;
		for (let i = 0, items = this.items, len = this.items.length; i < len; i++) {
			let rowItem = items[i];
			rowItem.x = this.x + left;
			rowItem.width = this.width - left - right;
			rowItem.y = this.y + rowItem.yOffset - this.scroll + this.headerView.height;

			// visible items;
			if (rowItem.y + rowItem.height >= this.y && rowItem.y < this.y + this.height) {
				// add this item to visibleItems;
				this.visibleItems.push(rowItem);

				// get tags if not set yet;
				rowItem.getTags();

				// ----------------------
				// draw items background;
				// ----------------------

				if (rowItem.isSelect) {
					gr.FillSolidRect(
						rowItem.x,
						rowItem.y,
						rowItem.width,
						rowItem.height,
						this.selectionColor
					);
				}

				if (this.focusIndex === i) {
					gr.DrawRect(
						rowItem.x,
						rowItem.y,
						rowItem.width - 1,
						rowItem.height - 1,
						scale(1),
						RGB(127, 127, 127)
					);
				}

				// -------------
				// draw columns;
				// -------------

				// index;
				cTrackNumber.draw(gr, i + 1, itemFont, this.secondaryColor, rowItem);

				// title;
				cTitle.draw(gr, rowItem.title, itemFont, this.textColor, rowItem);

				// artist;
				cArtist.visible && cArtist.draw(gr, rowItem.artist, itemFont, this.secondaryColor, rowItem);

				// album;
				cAlbum.visible && cAlbum.draw(gr, rowItem.album, itemFont, this.secondaryColor, rowItem);

				// time;
				cTime.draw(gr, rowItem.time, itemFont, this.secondaryColor, rowItem);

				// mood;

				if (rowItem.rating === 5) {
					this.heartOnIco
						.setSize(cMood.width, this.rowHeight)
						.draw(gr, this.moodColor, 0, cMood.x, rowItem.y);
				} else {
					this.heartOffIco
						.setSize(cMood.width, this.rowHeight)
						.draw(gr, this.secondaryColor, 0, cMood.x, rowItem.y);
				}
			}
		}
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - 3 * step * this.rowHeight);
	}
}
