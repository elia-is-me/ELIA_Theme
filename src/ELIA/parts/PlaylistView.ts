//====================================
// Simple Playlist View
//====================================

import { TextRenderingHint, MenuFlag, VKeyCode, KMask, scale, RGB, SmoothingMode, CursorName } from "../common/common";
import { StringTrimming, StringFormatFlags, MeasureString, StringFormat, spaceStart, spaceStartEnd } from "../common/String";
import { ThrottledRepaint } from "../common/common";
import { scrollbarWidth, themeColors, GdiFont } from "./Theme";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, IBoxModel } from "../common/BasePart";
import { Material, MaterialFont } from "../common/Icon";
import { PlaylistArtwork } from "../common/AlbumArt";
import { ToggleMood } from "./PlaybackControlView";
import { mouseCursor, ui } from "../common/UserInterface";
import { Button } from "./Buttons";
import { lang } from "./Lang";
import { CreatePlaylistPopup, DeletePlaylistDialog, GoToAlbum, GoToArtist, RenamePlaylist } from "./Layout";


const playlistColors = {
	text: themeColors.text,
	titleText: themeColors.titleText,
	secondaryText: themeColors.secondaryText,
	background: themeColors.playlistBackground,
	backgroundSelection: themeColors.playlistBackgroundSelection,
	highlight: themeColors.highlight,
	HEART_RED: themeColors.mood,
	splitLine: themeColors.playlistSplitLine,
};

const scrollbarColors = {
	cursor: themeColors.scrollbarCursor,
	background: themeColors.scrollbarBackground,
}

const buttonColors = {
	onPrimary: themeColors.onPrimary,
	primary: themeColors.primary,
	secondary: themeColors.secondary,
	onSecondary: themeColors.onSecondary,
};

const ui_textRendering = ui.textRender;

const TF_TRACK_INFO = fb.TitleFormat("%tracknumber%^^[%artist%]^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]");

const iconFont_list = GdiFont(MaterialFont, scale(18));
const iconFont_btn = GdiFont(MaterialFont, scale(20));
const itemFont = GdiFont(window.GetProperty("Playlist.Item Font", "normal,14"));
const semiItemFont = GdiFont("semibold", itemFont.Size);
const emptyInfoFont = GdiFont("normal, 16");
const titleFont = GdiFont("bold, 32");
const descriptionFont = GdiFont("normal, 14");

const titleLineHeight = titleFont.Height * 1.3;
const descriptionLineHeight = descriptionFont.Height * 1.2;
const moodIconWidth = MeasureString(Material.heart_empty, iconFont_list).Width;

let paddingLR = scale(24);
let paddingTB = scale(24);
const rowHeight = scale(window.GetProperty("List.Row Height", 52));
let artworkHeight = 0;
let artworkMarginL = scale(24);
let headerHeight = 0;
const listheaderHeight = scale(40);
let durationWidth = scale(16) + MeasureString("0:00:00", itemFont).Width;
const pageWidth = {
	thin: scale(600),
	wide: scale(920),
	extraWide: scale(1120)
}

/**
 * if not set, plman.SetPlaylistSelection... will not trigger
 * on_selection_change callback;
 */
const selHolder = fb.AcquireUiSelectionHolder();
selHolder.SetPlaylistSelectionTracking();

/**
 * @class
 */
class DragDropHelper {
	isActive: boolean = false;
	dropTargetRowIndex: number = -1;
	private _timerId: number = -1;

	reset() {
		this.isActive = false;
		this.dropTargetRowIndex = -1;
		this.clearInterval();
	}

	setInterval(func: () => void, interval: number, context?: Component) {
		if (this._timerId == -1) {
			if (context != null) {
				func.bind(context);
			}
			this._timerId = window.SetInterval(func, interval);
		}
	}

	clearInterval() {
		this._timerId > -1 && window.ClearInterval(this._timerId);
		this._timerId = -1;
	}
}

let dnd = new DragDropHelper();

/**
 * @class
 */
class SelectionHelper {
	isActive: boolean = false;
	pageX1: number = -1;
	pageX2: number = -1;
	pageY1: number = -1;
	pageY2: number = -1;
	private _timerId: number = -1;

	setInterval(func: () => void, interval: number, context?: Component) {
		if (this._timerId == -1) {
			if (context != null) {
				func.bind(context);
			}
			this._timerId = window.SetInterval(func, interval);
		}
	}

	clearInterval() {
		this._timerId > -1 && window.ClearInterval(this._timerId);
		this._timerId = -1;
	}

	reset() {
		this.isActive = false;
		this.clearInterval();
	}
}

let selecting = new SelectionHelper();




/**
 * Flow with list items;
 */
class PlaylistHeaderView extends Component {
	titleText: string = "";
	private titleFullWidth: number = 0;
	descriptionText: string = "";
	parentOffsetY: number;
	artworkHeight: number;
	minHeight: number;

	playlistIndex: number;
	artwork: PlaylistArtwork;
	shuffleBtn: Button;
	editBtn: Button;
	contextBtn: Button;
	sortBtn: Button;

	constructor() {
		super({});

		// Minimum height;
		this.minHeight = scale(240);

		// Playlist artwork view;
		this.artwork = new PlaylistArtwork();
		this.addChild(this.artwork);

		this.shuffleBtn = new Button({
			style: "contained",
			text: lang("Shuffle All"),
			icon: Material.shuffle,
			foreColor: buttonColors.onPrimary,
			backgroundColor: buttonColors.primary
		});
		this.shuffleBtn.on_click = () => {
			if (plman.PlaylistItemCount(plman.ActivePlaylist) > 0) {
				plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, Math.floor(Math.random() * plman.PlaylistItemCount(plman.ActivePlaylist)));
			}
		};
		this.addChild(this.shuffleBtn);

		// Playlist context btn;
		this.contextBtn = new Button({
			style: "text",
			icon: Material.more_vert,
			text: lang("More"),
			foreColor: buttonColors.secondary
		});
		this.contextBtn.on_click = (x, y) => {
			showHeaderContextMenu(plman.ActivePlaylist, x, y);
		};
		this.addChild(this.contextBtn);

		// Playlist Sort btn;
		this.sortBtn = new Button({
			style: "text",
			text: lang("Sort"),
			icon: Material.sort,
			foreColor: buttonColors.secondary
		});
		this.sortBtn.on_click = (x, y) => {
			showSortPlaylistMenu(plman.ActivePlaylist, x, y);
		}
		this.addChild(this.sortBtn);
	}

	/**
	 * Get header's proper height; header's height may change with panel's
	 * width;
	 */
	getProperHeight(paneWidth: number): number {
		let minHeight_ = artworkHeight + 2 * paddingTB;
		let textAreaWidth = paneWidth - 2 * paddingLR - artworkMarginL - artworkHeight;
		let titleFullWidth = this.titleFullWidth;

		// Paddings top & bottom;
		let totalHeight = 2 * paddingTB;//hipaddings.top;

		// Title;
		if (titleFullWidth > textAreaWidth) {
			totalHeight += titleLineHeight + titleFont.Height;
		} else {
			totalHeight += titleLineHeight;
		}

		// Description
		if (this.descriptionText) {
			totalHeight += descriptionLineHeight;
		}

		let _headerHeight = Math.max(minHeight_, totalHeight);

		if (paneWidth < pageWidth.thin) {
			_headerHeight += this.shuffleBtn.height + paddingTB;
		}

		return _headerHeight;
	}

	setTitles() {
		this.titleText = plman.GetPlaylistName(this.playlistIndex) || lang("NO TITLE");
		this.titleFullWidth = MeasureString(this.titleText, titleFont).Width;
		this.descriptionText =
			lang("playlist")
			+ spaceStartEnd("\u2022")
			+ plman.PlaylistItemCount(this.playlistIndex)
			+ spaceStart(plman.PlaylistItemCount(this.playlistIndex) > 1 ? lang("tracks") : lang("track"));
		if (plman.PlaylistItemCount(this.playlistIndex) > 0) {
			this.descriptionText +=
				spaceStartEnd("\u2022")
				+ formatPlaylistDuration(plman.GetPlaylistItems(this.playlistIndex).CalcTotalDuration());
		}
	}

	setPlaylistIndex(value: number): void {
		this.playlistIndex = value;
		this.setTitles();
	}

	// playlist header;
	on_size() {
		this.artwork.setBoundary(this.x + paddingLR, this.y + paddingTB, artworkHeight, artworkHeight);

		// Set btns position;
		let btnY: number;
		let btnX: number;
		let btns = [this.shuffleBtn, this.sortBtn, this.contextBtn];
		if (this.width < pageWidth.thin) {
			btnX = this.x + paddingLR;
			btnY = this.y + 2 * paddingTB + this.artwork.height;
		} else {
			btnY = this.y + this.height - paddingTB - this.shuffleBtn.height;
			btnX = this.x + paddingLR + this.artwork.height + artworkMarginL;
		}
		for (let i = 0; i < btns.length; i++) {
			btns[i].setPosition(btnX, btnY);
			if (btns[i + 1]) {
				btnX += (btns[i + 1].text ? scale(8) : scale(4)) + btns[i].width;
			}
		}
	}

	// playlist header;
	on_paint(gr: IGdiGraphics) {
		let secondaryTextColor = playlistColors.secondaryText;
		let textColor = playlistColors.text;
		const textX = this.x + paddingLR + artworkHeight + artworkMarginL;
		const textAreaWidth = this.x + this.width - textX - paddingLR;
		const titleFullWidth_ = this.titleFullWidth;
		let textTotalHeight = 0;
		let textY = 0;

		if (titleFullWidth_ > textAreaWidth) {
			textTotalHeight = titleLineHeight + titleFont.Height + descriptionLineHeight;
		} else {
			textTotalHeight = titleLineHeight + descriptionLineHeight;
		}

		if (this.width < pageWidth.thin) {
			textY = this.y + paddingTB + (this.artwork.height - textTotalHeight) / 2;
		} else {
			textY = this.y + paddingTB + (this.artwork.height - this.shuffleBtn.height - textTotalHeight) / 2;
		}

		// Title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		const titleText_ = this.titleText;
		if (titleFullWidth_ > textAreaWidth) {
			let sf = StringFormat(0, 0, StringTrimming.EllipsisCharacter, StringFormatFlags.LineLimit);
			gr.DrawString(titleText_, titleFont, textColor,
				textX, textY, textAreaWidth, titleLineHeight + titleFont.Height, sf);
			textY += titleLineHeight + titleFont.Height;
		} else {
			gr.DrawString(titleText_, titleFont, textColor,
				textX, textY, textAreaWidth, titleLineHeight, StringFormat.LeftTop);
			textY += titleLineHeight;
		}
		gr.SetTextRenderingHint(ui_textRendering);

		// Description;
		if (this.descriptionText) {
			gr.DrawString(this.descriptionText, descriptionFont, secondaryTextColor,
				textX, textY, textAreaWidth, descriptionLineHeight, StringFormat.LeftTop);
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		try {
			showHeaderContextMenu(this.playlistIndex, x, y);
		} catch (e) { }
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

	draw(gr: IGdiGraphics, text: string | number, font: IGdiFont, color: number, row: IBoxModel, sf: number = StringFormat.LeftCenter) {
		let x_ = this.x + this._paddingLeft;
		let width_ = this.width - (this._paddingLeft + this._paddingRight);
		let y_ = row.y;
		let height_ = row.height;
		gr.DrawString(text, font, color, x_, y_, width_, height_, sf);
	}
}

class PlaylistViewItem extends Component {
	type: number = 0; // 0: track;
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
	isselect: boolean = false;

	constructor() { super({}) };

	getTags() {
		if (!this.metadb) return;
		if (this.title) return;

		let rawInfo = TF_TRACK_INFO.EvalWithMetadb(this.metadb).split("^^");
		this.title = rawInfo[2];
		this.trackNumber = rawInfo[0];
		this.artist = rawInfo[1];
		this.album = rawInfo[5];
		this.time = rawInfo[3];
		this.rating = Number(rawInfo[4]);
	}
}


export class PlaylistView extends ScrollView {
	items: PlaylistViewItem[] = [];
	private _itemsTotalHeight: number;
	visibleItems: PlaylistViewItem[] = [];
	private _selectedIndexes: number[] = [];

	playlistIndex: number;
	playingItemIndex: number = -1;
	hoverIndex: number = -1;
	focusIndex: number = -1;
	scrollbar: Scrollbar;

	header: PlaylistHeaderView;

	_columns: Map<string, PlaylistColumn> = new Map();
	clickOnSelection: boolean;
	multiSelectionStartId = -1;
	clickedMoodId: number = -1;
	rowHeight: number = rowHeight;

	constructor() {
		super({});

		/**
		 * Create children component;
		 */

		// scrollbar;
		this.scrollbar = new Scrollbar({
			cursorColor: scrollbarColors.cursor,
			backgroundColor: scrollbarColors.background,
		});
		this.addChild(this.scrollbar);
		this.scrollbar.z = 100;

		// headerView;
		this.header = new PlaylistHeaderView();
		this.addChild(this.header);
		this.header.setPlaylistIndex(plman.ActivePlaylist);

		/**
		 *  Init columns;
		 */

		this._columns.set("trackNumber", new PlaylistColumn());
		this._columns.set("title", new PlaylistColumn());
		this._columns.set("artist", new PlaylistColumn());
		this._columns.set("album", new PlaylistColumn());
		this._columns.set("mood", new PlaylistColumn());
		this._columns.set("time", new PlaylistColumn());
	}

	private getActiveMoodId(x: number, y: number): number {
		let moodcolumn = this._columns.get("mood");
		if (!(moodcolumn && moodcolumn.visible && moodcolumn.width > 0)) {
			return -1;
		}
		let pad = ((moodcolumn.width - moodIconWidth) / 2) >> 0;
		let positionLeft = moodcolumn.x + pad;
		let positionRight = moodcolumn.x + pad + moodIconWidth;
		if (x > positionLeft && x <= positionRight) {
			let hoverItem = this._findHoverItem(x, y);
			return hoverItem ? hoverItem.rowIndex : -1;
		} else {
			return -1;
		}
	}

	/**
	 * Create playlist items and init it's items' state (selected, playing,
	 * focused), etc;
	 */
	private setList() {
		const playlistMetadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
		const playlistItems: PlaylistViewItem[] = [];
		const playlistItemCount = plman.PlaylistItemCount(plman.ActivePlaylist);
		const rowHeight = this.rowHeight;
		let itemYOffset = 0;
		this._selectedIndexes = [];

		for (let rowIndex = 0; rowIndex < playlistItemCount; rowIndex++) {
			let rowItem = new PlaylistViewItem();
			rowItem.rowIndex = rowIndex;
			rowItem.metadb = playlistMetadbs[rowIndex];
			rowItem.playlistItemIndex = rowIndex;
			rowItem.yOffset = itemYOffset;
			rowItem.height = rowHeight;
			rowItem.isselect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, rowIndex);
			this._selectedIndexes.push(rowIndex);

			playlistItems.push(rowItem);
			itemYOffset += rowItem.height;
		}
		this.items = playlistItems;
		this._itemsTotalHeight = rowHeight * playlistItems.length + scale(32);
		this.totalHeight = this._itemsTotalHeight + this.header.height + listheaderHeight;
		this.scroll = this.checkscroll(this.scroll);

		this.setPlayingItem();
		this.setFocusItem();
		plman.SetActivePlaylistContext();
	}

	// 列表歌曲仅仅 tags 改变时，不用重建整个列表。
	private resetAllTags() {
		this.items.forEach(item => item.title = "");
	}

	private setFocusItem() {
		let focusdPlaylistItemIndex = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist);
		this.focusIndex = this.items.findIndex(item => item.playlistItemIndex === focusdPlaylistItemIndex);
	}

	private setPlayingItem() {
		if (fb.IsPlaying) {
			let ItemLocation = plman.GetPlayingItemLocation();
			if (ItemLocation.IsValid && ItemLocation.PlaylistIndex === plman.ActivePlaylist) {
				this.playingItemIndex = ItemLocation.PlaylistItemIndex;
			} else {
				this.playingItemIndex = -1;
			}
		} else {
			this.playingItemIndex = -1;
		}
	}

	setColumns() {
		// ---------------
		// Columns;
		// ---------------
		const tracknumber = this._columns.get("trackNumber");
		const title = this._columns.get("title");
		const artist = this._columns.get("artist");
		const album = this._columns.get("album");
		const mood = this._columns.get("mood");
		const duration = this._columns.get("time");

		// --------------
		// Set visible
		// -------------
		album.setVisible(true);

		// ------------------
		// Set columns' size;
		// ------------------
		tracknumber.width = scale(40);
		duration.width = durationWidth;
		mood.width = scale(36);

		let whitespace = this.width - paddingLR - paddingLR;
		let reservedWidth = 0;//scale(40);
		whitespace -= reservedWidth;
		mood.visible && (whitespace -= mood.width);
		whitespace -= duration.width;
		whitespace -= tracknumber.width;

		let titleWidth_ = scale(280);
		let artistWidth_ = scale(200);
		let albumWidth_ = scale(280);

		let albumVis = album.visible && this.width >= pageWidth.thin;
		let artistVis = artist.visible && this.width >= pageWidth.wide;
		let widthToAdd_ = whitespace - titleWidth_;
		let floor = Math.floor;

		if (albumVis) {
			widthToAdd_ = floor((whitespace - titleWidth_ - albumWidth_) / 2);
		}

		if (artistVis) {
			widthToAdd_ = floor((whitespace - titleWidth_ - artistWidth_ - albumWidth_) / 3);
		}

		tracknumber.x = this.x + paddingLR;
		mood.x = tracknumber.x + tracknumber.width;

		title.x = mood.x + mood.width;
		title.width = titleWidth_ + widthToAdd_;

		artist.x = title.x + title.width;
		artist.width = artistVis ? artistWidth_ + widthToAdd_ : 0;

		album.x = artist.x + artist.width;
		album.width = albumVis ? albumWidth_ + widthToAdd_ : 0;

		duration.x = album.x + album.width + reservedWidth;
		duration.width -= scale(8);

		// ----------------------
		// Set columns' paddings
		// ----------------------
		title.setPaddings({ right: scale(16) });
		artist.setPaddings({ right: scale(16) });
	}

	on_init() {
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);

		if (fb.IsPlaying && plman.ActivePlaylist === plman.PlayingPlaylist) {
			window.SetTimeout(() => this.showNowPlaying(), 5);
		}
	}

	//  playlist view;
	on_size() {
		// update paddings, artworkHeight;
		if (this.width < pageWidth.thin) {
			paddingLR = scale(16);
			paddingTB = scale(16);
			artworkHeight = scale(140);
		} else if (this.width < pageWidth.wide) {
			paddingTB = scale(24);
			paddingLR = scale(40);
			artworkHeight = scale(200);
		} else {
			paddingLR = scale(40);
			paddingTB = scale(40);
			artworkHeight = scale(220);
		};

		// calculate header height;
		headerHeight = this.header.getProperHeight(this.width);
		this.header.setBoundary(this.x, this.y - this.scroll, this.width, headerHeight);

		// playlist columns;
		this.setColumns();

		// playlist rows;
		let items = this.items;
		// Update row x & width;
		for (let itemIndex = 0, len = items.length; itemIndex < len; itemIndex++) {
			let rowItem = items[itemIndex];
			rowItem.x = this.x + paddingLR;
			rowItem.width = this.width - 2 * paddingLR;
		}
		this.totalHeight = this._itemsTotalHeight + this.header.height + listheaderHeight;

		// scrollbar;
		this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);
	}

	// playlist view;
	on_paint(gr: IGdiGraphics) {
		let rowHeight = this.rowHeight;
		let items = this.items;

		// colors;
		let textColor = playlistColors.text;
		let secondaryTextColor = playlistColors.secondaryText;
		let highlightColor = playlistColors.highlight;
		let backgroundColor = playlistColors.background;
		let backgroundSelectionColor = playlistColors.backgroundSelection;
		let lineColor = playlistColors.splitLine;

		// columns;
		let _columns = this._columns;
		let tracknumber = _columns.get("trackNumber");
		let title = _columns.get("title");
		let artist = _columns.get("artist");
		let album = _columns.get("album");
		let mood = _columns.get("mood");
		let time = _columns.get("time");

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// Set header's position;
		this.header.setPosition(this.x, this.y - this.scroll);

		let rowX = this.x + paddingLR;
		let rowWidth = this.width - 2 * paddingLR;

		// draw list header;
		let listheaderY = this.y + this.header.height - this.scroll;
		let lineY = listheaderY + listheaderHeight - 1;
		gr.DrawLine(rowX, lineY, rowX + rowWidth, lineY, scale(1), lineColor);

		// track numr;
		if (tracknumber.visible && tracknumber.width > 0) {
			gr.DrawString("#", semiItemFont, secondaryTextColor,
				tracknumber.x, listheaderY, tracknumber.width, listheaderHeight, StringFormat.Center);
		}

		// title /artist;
		gr.DrawString(lang("TITLE"), semiItemFont, secondaryTextColor,
			title.x, listheaderY, title.width, listheaderHeight, StringFormat.LeftCenter);

		// artist;
		if (artist.visible && artist.width > 0) {
			gr.DrawString(lang("ARTIST"), semiItemFont, secondaryTextColor,
				artist.x, listheaderY, artist.width, listheaderHeight, StringFormat.LeftCenter);
		}

		// album;
		if (album.visible && album.width > 0) {
			gr.DrawString(lang("ALBUM"), semiItemFont, secondaryTextColor,
				album.x, listheaderY, album.width, listheaderHeight, StringFormat.LeftCenter);
		}

		// duration;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(Material.time, iconFont_btn, secondaryTextColor,
			time.x, listheaderY, time.width, listheaderHeight, StringFormat.RightCenter);
		gr.SetTextRenderingHint(ui_textRendering);

		// Clear visibleItems cache;
		this.visibleItems.length = 0;

		let isfocuspart = ui.isFocusPart(this);

		// Draw Items;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let row = items[itemIndex];
			row.x = rowX;
			row.width = rowWidth;
			row.y = this.y + row.yOffset - this.scroll + headerHeight + listheaderHeight;

			// Visible items;
			if (row.y + rowHeight >= this.y && row.y < this.y + this.height) {

				// Put visible item to visibleItems cache;
				this.visibleItems.push(row);

				// Set rowItems' tags when need.
				row.getTags();

				// ------------------------------
				//  Draw item background & state;
				//  -----------------------------

				if (row.isselect) {
					gr.FillSolidRect(row.x, row.y, row.width, rowHeight, backgroundSelectionColor);
				}

				if (isfocuspart && this.focusIndex === itemIndex) {
					gr.DrawRect(row.x, row.y, row.width - 1, rowHeight - 1, scale(1), RGB(127, 127, 127));
				}

				gr.DrawLine(row.x, row.y + rowHeight - 1, row.x + row.width, row.y + rowHeight - 1, 1, lineColor);

				//  Draw columns;
				// --------------

				/**
				 * Draw tracknumber | playing icon;
				 */
				if (this.playingItemIndex === itemIndex) {
					let iconCode = fb.IsPaused ? Material.volume_mute : Material.volume;
					gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
					gr.DrawString(iconCode, iconFont_list, highlightColor,
						tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);
					gr.SetTextRenderingHint(ui_textRendering);
				} else {
					tracknumber.draw(gr, row.playlistItemIndex + 1, itemFont, secondaryTextColor, row, StringFormat.Center);
				}

				/**
				 * Title;
				 */
				if (artist.visible && artist.width > 0) {
					title.draw(gr, row.title, itemFont, textColor, row);
					artist.draw(gr, row.artist, itemFont, secondaryTextColor, row);
				} else {
					let artistY = row.y + row.height / 2;
					let titleY = artistY - itemFont.Height;
					let padright = scale(16);
					gr.DrawString(row.title, itemFont, textColor,
						title.x, titleY, title.width - padright, row.height, StringFormat.LeftTop);

					let subtitleText = row.artist;
					if (!(album.visible && album.width)) {
						subtitleText += spaceStartEnd("\u2022") + row.album;
					}
					gr.DrawString(subtitleText, itemFont, secondaryTextColor,
						title.x, artistY, title.width - padright, row.height, StringFormat.LeftTop);
				}

				/**
				 * Album;
				 */
				if (album.visible && album.width > 0) {
					album.draw(gr, row.album, itemFont, secondaryTextColor, row);
				}

				/**
				 * Time(PlaybackLength);
				 */
				time.draw(gr, row.time, itemFont, secondaryTextColor, row, StringFormat.RightCenter);

				/**
				 * Mood(if Rating == 5)
				 */
				let liked = row.rating === 5;
				let iconColor = liked ? playlistColors.HEART_RED : secondaryTextColor;
				let iconCode = liked ? Material.heart : Material.heart_empty;
				gr.DrawString(iconCode, iconFont_list, iconColor,
					mood.x, row.y, mood.width, row.height, StringFormat.Center);
			}
		}

		// draw drag insert position indication line;
		if (this.trace(mouseCursor.x, mouseCursor.y) && mouseCursor.y >= this.y && mouseCursor.y <= this.y + this.height) {
			if (dnd.isActive && dnd.dropTargetRowIndex > -1) {
				const lineY = this.y + this.header.height + listheaderHeight + dnd.dropTargetRowIndex * rowHeight - this.scroll;
				gr.DrawLine(this.x + paddingLR, lineY, this.x + this.width - paddingLR, lineY, scale(2), RGB(127, 127, 127));
			}
		}

		// draw when playlist is empty;
		if (this.items.length === 0) {
			const textY = this.y + this.header.height + listheaderHeight + scale(16);
			const textLeft = this.x + paddingLR;
			const emptyFont = emptyInfoFont;
			const textColor = secondaryTextColor;

			if (plman.IsAutoPlaylist(plman.ActivePlaylist)) {
				gr.DrawString("Autoplaylist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * paddingLR, this.height, StringFormat.LeftTop);
			} else {
				gr.DrawString("Playlist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * paddingLR, this.height, StringFormat.LeftTop);
			}
		}

		gr.FillGradRect(this.x, this.y, this.width, scale(40), 90, themeColors.topbarBackground, 0, 1.0);
	}

	drawTooltipImage() {
		let selectedItems = this.items.filter(i => i.isselect);
		if (selectedItems.length === 0) {
			return;
		}
		let text = "";
		if (selectedItems.length === 1) {
			let item = selectedItems[0];
			text = `${item.rowIndex + 1}. ${item.title}`
			if (item.artist) {
				text += ` \u2022 ${item.artist}`;
			}
		} else {
			text = selectedItems.length + spaceStart(lang("tracks"));
		}
		let font = semiItemFont;
		let imgwidth = Math.min(scale(200), MeasureString(text, font).Width + scale(16));
		let imgheight = scale(36);
		let img = gdi.CreateImage(imgwidth, imgheight);
		let g = img.GetGraphics();

		g.SetSmoothingMode(SmoothingMode.AntiAlias);
		g.FillRoundRect(0, 0, img.Width - scale(1), img.Height - scale(1), scale(2), scale(2), 0xf0ffffff);
		g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g.DrawString(text, font, 0xff000000, scale(8), 0, img.Width, img.Height, StringFormat.LeftCenter);

		img.ReleaseGraphics(g);

		return img;
	}

	on_playlists_changed() {
		if (!isValidPlaylist(plman.ActivePlaylist)) {
			if (!isValidPlaylist(0)) {
				plman.CreatePlaylist(0, "");
			}
			plman.ActivePlaylist = 0;
		}
		this.scroll = 0;
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_added() {
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_removed() {
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_reordered() {
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_selection_changed() {
		let plItemCount = this.items.length;
		for (let plIndex = 0; plIndex < plItemCount; plIndex++) {
			this.items[plIndex].isselect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, this.items[plIndex].playlistItemIndex);
		}
		ThrottledRepaint();
	}

	private getTrack(index: number) {
		return this.items[index];
	}

	on_item_focus_change(playlistIndex: number) {
		if (this.focusIndex !== plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist)) {
			this.focusIndex = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist);
		}
		this.repaint();
	}

	on_playlist_switch() {
		this.stopScroll();
		this.scroll = 0;
		this.setList();
		this.header.setPlaylistIndex(plman.ActivePlaylist);
		if (fb.IsPlaying && plman.ActivePlaylist === plman.PlayingPlaylist) {
			this.showNowPlaying();
		}
		ThrottledRepaint();
	}

	on_playback_stop(reason: number) {
		if (reason !== 2) {
			this.playingItemIndex = -1;
			ThrottledRepaint();
		}
	}

	showNowPlaying() {
		if (this.playingItemIndex === -1) {
			return;
		}

		let listTopY = this.header.y + this.header.height + listheaderHeight;
		if (listTopY < this.y) {
			listTopY = this.y;
		}
		let listBottomY = this.y + this.height;
		let playingItem = this.items[this.playingItemIndex];
		let rowHeight = this.rowHeight;
		let playingItemVis = playingItem.y >= listTopY && playingItem.y + rowHeight < listBottomY;

		if (!playingItemVis) {
			let targetScroll = this.header.height + this.playingItemIndex * this.rowHeight - (this.height - this.rowHeight) / 2;
			this.scrollTo(targetScroll);
		}
	}

	private showFocusItem() {
		if (this.focusIndex === -1) {
			if (this.visibleItems.length > 0) {
				this.setFocusByIndex(this.visibleItems[0].rowIndex);
			}
			return;
		}
		let listtopY = this.header.y + this.header.height + listheaderHeight;
		if (listtopY < this.y) listtopY = this.y;
		let listbottomY = this.y + this.height;
		let focusItem = this.items[this.focusIndex];
		let focusItemVis = focusItem.y >= listtopY && focusItem.y + focusItem.height < listbottomY;
		if (!focusItemVis) {
			let targetscroll = this.header.height + focusItem.yOffset - (this.height - this.rowHeight) / 2;
			this.scrollTo(targetscroll);
		}
	}


	on_playback_new_track() {
		this.setPlayingItem();
		this.showNowPlaying();
		ThrottledRepaint();
	}

	on_metadb_changed(metadbs?: IFbMetadbList, fromhook?: boolean) {
		this.resetAllTags();
		ThrottledRepaint();
	}

	private _findHoverIndex(x: number, y: number) {
		if (!this.trace(x, y)) {
			return -1;
		}
		let hoverItem_ = this.visibleItems.find(item => item.trace(x, y));
		return hoverItem_ ? hoverItem_.rowIndex : -1;
	}

	private _findHoverItem(x: number, y: number) {
		if (!this.trace(x, y)) {
			return null;
		}
		return this.visibleItems.find(item => item.trace(x, y));
	}

	private setFocusByIndex(index: number) {
		if (this.items[index] == null) return;
		this.focusIndex = index;
		plman.SetPlaylistFocusItem(plman.ActivePlaylist, this.items[index].playlistItemIndex);
	}

	/**
	 *  Set item metadata's selection state, rowItem.isSelect are not changed
	 *  here, because selection change will trigger on_selection_changed
	 *  callback;
	 *  ```typescript
	 *  // e.g.
	 *  setSelection() -> clear playlist selection;
	 *  setSelection(index) -> set playlist selection single;
	 *  setSelection(from, to) -> set playlist selection range;
	 *  ```
	 */
	private setSelection(from?: number, to?: number) {
		// Clear playlist selection;
		if (from == null) {
			plman.ClearPlaylistSelection(plman.ActivePlaylist);
			this._selectedIndexes.length = 0;
			return;
		} else if (to == null) {
			to = from;
		}

		let indexes: number[] = [];
		let c = from;

		if (from > to) {
			from = to;
			to = c;
		}

		for (let index = from; index <= to; index++) {
			this.items[index] && indexes.push(this.items[index].playlistItemIndex);
		}

		if (indexes.toString() !== this._selectedIndexes.toString()) {
			this._selectedIndexes = indexes;
			plman.ClearPlaylistSelection(plman.ActivePlaylist);
			plman.SetPlaylistSelection(plman.ActivePlaylist, indexes, true);
		}
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * this.rowHeight * 3);
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		let hoverRowItem = this._findHoverItem(x, y);
		let hoverMoodId = this.getActiveMoodId(x, y);
		if (hoverMoodId > -1) {
			return;
		}
		if (hoverRowItem != null) {
			plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, hoverRowItem.playlistItemIndex);
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		let hoverItem = this._findHoverItem(x, y);
		selecting.reset();
		dnd.reset();

		// --> click on mood icon;
		let hoverMoodId = this.getActiveMoodId(x, y);
		this.clickedMoodId = hoverMoodId;

		if (hoverMoodId > -1) {
			return;
		}

		// --> set focus;
		if (hoverItem != null) {
			this.setFocusByIndex(hoverItem.rowIndex);
		} else {
			/**
			 * DO NOTHING, focused item will not be changed;
			 */
		}

		// --> set selection;
		if (hoverItem == null) {
			if (utils.IsKeyPressed(VKeyCode.Control)) {
				/** DO NOTHING */
			} else if (utils.IsKeyPressed(VKeyCode.Shift)) {
				/** DO NOTHING */
			} else {
				/** Clear selection */
				selecting.isActive = true;
				selecting.pageX1 = selecting.pageX2 = x - this.x;
				selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
				this.setSelection();
			}
			this.multiSelectionStartId = -1;
		} else if (hoverItem.isselect) {
			if (utils.IsKeyPressed(VKeyCode.Shift)) {
				this.setSelection(this.multiSelectionStartId, this.focusIndex);
			} else if (utils.IsKeyPressed(VKeyCode.Control)) {
				plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, hoverItem.playlistItemIndex, !hoverItem.isselect);
				this._selectedIndexes = this.items.filter(item => item.isselect).map(item => item.playlistItemIndex);
			} else {
				this.clickOnSelection = true;
			}
		} else {
			/** Click on a not selected item; */
			if (!utils.IsKeyPressed(VKeyCode.Shift)) {
				this.multiSelectionStartId = this.focusIndex; // !
			}

			if (utils.IsKeyPressed(VKeyCode.Shift)) {
				this.setSelection(this.multiSelectionStartId, hoverItem.playlistItemIndex);
			} else if (utils.IsKeyPressed(VKeyCode.Control)) {
				plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, hoverItem.playlistItemIndex, !hoverItem.isselect); // toggle;
				this._selectedIndexes = this.items.filter(item => item.isselect).map(item => item.playlistItemIndex);
			} else {
				/** NO MASKKEY */
				if (hoverItem.isselect) {
					this.clickOnSelection = true;
				} else {
					this.setSelection(hoverItem.playlistItemIndex);
					selecting.isActive = true;
					selecting.pageX1 = selecting.pageX2 = x - this.x;
					selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
				}
			}
		}
	}

	on_mouse_move(x: number, y: number) {
		let listTopY = this.y;
		let listBottomY = this.y + this.height;
		let rowHeight = this.rowHeight;

		if (this.clickedMoodId > -1) {
			return;
		}

		//
		if (selecting.isActive) {
			const updateSelection = (x: number, y: number) => {
				if (this.items.length === 0) {
					return;
				}
				selecting.pageX2 = (x < this.x ? this.x : x > this.x + this.width - this.scrollbar.width ? this.x + this.width - this.scrollbar.width : x) - this.x;
				selecting.pageY2 = (y < listTopY ? listTopY : y > listBottomY - 1 ? listBottomY - 1 : y) - this.y + this.scroll;
				let first = -1;
				let last = -1;
				const padLeft = paddingLR;
				const padRight = paddingLR;
				const rowHeigt = this.rowHeight;
				if (!((selecting.pageX1 < padLeft && selecting.pageX2 < padLeft) || (selecting.pageX1 > this.width - padRight && selecting.pageX2 > this.width - padRight))) {
					let topOffset = this.header.height + listheaderHeight;
					first = Math.floor((selecting.pageY1 - topOffset) / rowHeigt);
					last = Math.floor((selecting.pageY2 - topOffset) / rowHeigt);
				}
				this.setSelection(first, last);
			};

			updateSelection(x, y);

			/**
			 * TODO: interval 设置太短的话滚动有问题。
			 */
			if (y < listTopY) {
				selecting.setInterval(
					() => {
						this.scrollTo(this.scroll - scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					},
					250,
					this
				);
			} else if (y > listBottomY) {
				selecting.setInterval(
					() => {
						this.scrollTo(this.scroll + scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					},
					250,
					this
				);
			} else {
				selecting.clearInterval();
			}
		} else if (dnd.isActive) {
			// set mouse cursor;

			if (y < listTopY) {
				dnd.setInterval(
					() => {
						this.scrollTo(this.scroll - rowHeight);
						if (this.visibleItems[0] != null) {
							dnd.dropTargetRowIndex = this.visibleItems[0].rowIndex;
						}
					},
					250,
					this
				);
			} else if (y > listBottomY) {
				dnd.setInterval(
					() => {
						this.scrollTo(this.scroll + rowHeight);
						if (this.visibleItems.length > 0) {
							let lastItem = this.visibleItems[this.visibleItems.length - 1];
							dnd.dropTargetRowIndex = lastItem.rowIndex;
							if (lastItem.y + lastItem.height < this.y + this.height) {
								dnd.dropTargetRowIndex = lastItem.rowIndex + 1;
							}
						}
					},
					250,
					this
				);
			} else {
				dnd.dropTargetRowIndex = -1;

				for (let i = 0; i < this.visibleItems.length; i++) {
					let item = this.visibleItems[i];
					if (Math.abs(y - item.y) < item.height / 2) {
						dnd.dropTargetRowIndex = item.rowIndex;
						break;
					} else if (Math.abs(y - item.y - item.height) <= item.height / 2) {
						dnd.dropTargetRowIndex = item.rowIndex + 1;
						break;
					} else {
						/** NO ELSE */
					}
				}

				/**
				 * When mouse curosr is on list but not on an item row;
				 */
				if (dnd.dropTargetRowIndex === -1 && this.trace(x, y) && this.visibleItems.length > 0) {
					let firstItem = this.visibleItems[0];
					let lastItem = this.visibleItems[this.visibleItems.length - 1];

					if (y < firstItem.y) {
						dnd.dropTargetRowIndex = firstItem.rowIndex;
					} else if (y > lastItem.y + lastItem.height) {
						dnd.dropTargetRowIndex = lastItem.rowIndex + 1;
					}
				}

				dnd.clearInterval();
				this.repaint();
			}
		} else {
			/** NOT SELECTING && NOT DRAGGING */

			if (this.clickOnSelection) {
				//
				dnd.isActive = true;
				let cursorimg = this.drawTooltipImage();
				ui.setCursorImage(cursorimg);
				window.SetCursor(this.trace(x, y) ? CursorName.IDC_HELP : CursorName.IDC_NO);
				this.repaint();
			}
		}

		mouseCursor.x = x;
		mouseCursor.y = y;
	}

	private _getDragInsertPosition() {
		let selectedIndexes: number[] = [];
		let counter = 0;

		for (let i = 0, len = this.items.length; i < len; i++) {
			if (this.items[i].isselect) {
				selectedIndexes.push(i);
			}
		}

		for (let i = 0, len = selectedIndexes.length; i < len; i++) {
			if (selectedIndexes[i] < dnd.dropTargetRowIndex) {
				counter++;
			} else {
				break;
			}
		}

		return dnd.dropTargetRowIndex - counter;
	}

	private dragInsert(position: number) {
		if (position < 0 || position > this.items.length) {
			return;
		}

		// A trick to let non-continuous items be continuous;
		plman.UndoBackup(plman.ActivePlaylist);
		plman.MovePlaylistSelection(plman.ActivePlaylist, -plman.PlaylistItemCount(plman.ActivePlaylist));

		// then move them to the proper position;
		plman.MovePlaylistSelection(plman.ActivePlaylist, position);
	}

	on_mouse_lbtn_up(x: number, y: number) {
		const hoverItem = this._findHoverItem(x, y);

		// Handle mood click;
		if (this.clickedMoodId > -1) {
			let hoverMoodId = this.getActiveMoodId(x, y);
			if (hoverMoodId === this.clickedMoodId) {
				// onClickMood action;
				ToggleMood(this.items[this.clickedMoodId].metadb);
			}
			return;
		}

		if (dnd.isActive) {
			if (this.trace(x, y) && y >= this.y && y <= this.y + this.height) {
				this.dragInsert(this._getDragInsertPosition());
			}
		} else if (selecting.isActive) {
			// DO NOTHING;
		} else {
			if (hoverItem != null) {
				if (utils.IsKeyPressed(VKeyCode.Control)) {
					// DO NOTHING;
				} else if (utils.IsKeyPressed(VKeyCode.Shift)) {
					// DO NOTHING;
				} else {
					this.setSelection(hoverItem.playlistItemIndex);
				}
			}
		}

		// clear selecting state;
		selecting.clearInterval();
		selecting.isActive = false;
		selecting.pageX1 = selecting.pageX2 = -1;
		selecting.pageY1 = selecting.pageY2 = -1;

		// clear drag'n drop state;
		this.clickOnSelection = false;
		dnd.clearInterval();
		dnd.isActive = false;
		dnd.dropTargetRowIndex = -1;

		ui.setCursorImage(null);
		window.SetCursor(CursorName.IDC_ARROW);

		this.repaint();
	}

	on_mouse_rbtn_down(x: number, y: number) {
		let hoverIndex_ = this._findHoverIndex(x, y);
		let hoverItem_ = this.items[hoverIndex_];

		if (hoverItem_ == null) {
			this.setSelection();
		} else {
			if (!plman.IsPlaylistItemSelected(plman.ActivePlaylist, hoverItem_.playlistItemIndex)) {
				this.setSelection(hoverIndex_);
				this.setFocusByIndex(hoverIndex_);
			}
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		try {
			showTrackContextMenu(plman.ActivePlaylist, plman.GetPlaylistSelectedItems(plman.ActivePlaylist), x, y);
		} catch (e) { }
	}

	on_focus(isFocused: boolean) {
		if (isFocused) {
			plman.SetActivePlaylistContext();
			selHolder.SetPlaylistSelectionTracking();
		}
	}

	on_change_focus() {
		this.repaint();
	}

	on_key_down(vkey: number, mask = KMask.none) {
		if (selecting.isActive || dnd.isActive) {
			return;
		}

		if (mask === KMask.none) {
			switch (vkey) {
				case VKeyCode.Delete:
					if (!plman.IsAutoPlaylist(plman.ActivePlaylist)) {
						plman.UndoBackup(plman.ActivePlaylist);
						plman.RemovePlaylistSelection(plman.ActivePlaylist, false);
					}
					break;
				case VKeyCode.Escape:
					this.setSelection();
					break;
				case VKeyCode.Return:
					let focusItem = this.items[this.focusIndex];
					if (focusItem) {
						try {
							plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, focusItem.playlistItemIndex);
						} catch (e) { }
					}
					break;
				case VKeyCode.Home:
					if (this.items.length > 0) {
						this.setSelection(0);
						this.setFocusByIndex(0);
						this.scroll = 0;
					}
					break;
				case VKeyCode.End:
					if (this.items.length > 0) {
						this.setSelection(this.items.length - 1);
						this.setFocusByIndex(this.items.length - 1);
						this.scroll = this.totalHeight;
					}
					break;
				case VKeyCode.PageUp:
					let onpageupstop = (() => {
						this.setFocusByIndex(this.visibleItems[0].rowIndex);
						this.setSelection(this.focusIndex);
						this.repaint();
					}).bind(this);
					if (this.items.length > 0) {
						// // let scrollstep =
						// let _itemCount = ((this.scroll - this.height - headerHeight - listheaderHeight) / rowHeight) >> 0;
						// let _scrollpos = (this.y)
						this.scrollTo(this.scroll - this.height, onpageupstop);
					}
					break;
				case VKeyCode.PageDown:
					if (this.items.length > 0) {
						this.scrollTo(this.scroll + this.height);
					}
					break;
				case VKeyCode.Up:
					this.setFocusByIndex(this.focusIndex - 1);
					this.showFocusItem();
					this.setSelection(this.focusIndex);
					break;
				case VKeyCode.Down:
					this.setFocusByIndex(this.focusIndex + 1);
					this.showFocusItem();
					this.setSelection(this.focusIndex);
					break;
				case VKeyCode.F5:
					// this.header.artwork.getArtwork();
					break;
			}
		} else if (mask === KMask.ctrl) {
			// Ctrl + A;
			if (vkey === 65) {
				this.setSelection(0, this.items.length - 1);
			}
			// Ctrl + X;
			if (vkey === 88) {
				if (!plman.IsPlaylistLocked(plman.ActivePlaylist)) {
					let items = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
					if (fb.CopyHandleListToClipboard(items)) {
						plman.UndoBackup(plman.ActivePlaylist);
						plman.RemovePlaylistSelection(plman.ActivePlaylist);
					}
				}
			}

			// Ctrl + C;
			if (vkey === 67) {
				let items = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
				fb.CopyHandleListToClipboard(items);
			}

			// Ctrl + V;
			if (vkey === 86) {
				if (!plman.IsPlaylistLocked(plman.ActivePlaylist) && fb.CheckClipboardContents()) {
					let items = fb.GetClipboardContents(window.ID);
					plman.UndoBackup(plman.ActivePlaylist);
					plman.InsertPlaylistItems(plman.ActivePlaylist, this.focusIndex + 1, items, true);
				}
			}
		}
	}

	on_key_up(vkey?: number) { }

	on_playlist_item_ensure_visible(playlistIndex: number, playlistItemIndex: number) {
		// if (playlistIndex === plman.ActivePlaylist) {
		// 	this.showNowPlaying();
		// }
	}
}

export function showTrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
	let nullMetadbs = !metadbs || metadbs.Count === 0;
	let hasMetadbs = !nullMetadbs;
	let isPlaylist = isValidPlaylist(playlistIndex);
	const isPlaylistLocked = isPlaylist && plman.IsPlaylistLocked(playlistIndex);
	let isAlbumlist = playlistIndex === -5;

	const rootMenu = window.CreatePopupMenu();
	let albumName = "";

	//
	if (hasMetadbs) {
		const addToMenu = window.CreatePopupMenu();
		addToMenu.AppendTo(rootMenu, MenuFlag.STRING, lang("Add to playlist"));
		addToMenu.AppendMenuItem(MenuFlag.STRING, 2000, lang("Create playlist..."));
		if (plman.PlaylistCount > 0) {
			addToMenu.AppendMenuSeparator();
		}
		for (let index = 0; index < plman.PlaylistCount; index++) {
			let flag = plman.IsPlaylistLocked(index) || index === playlistIndex ? MenuFlag.GRAYED : MenuFlag.STRING;
			let playlistName = plman.GetPlaylistName(index);
			if (index === playlistIndex) {
				playlistName += lang("(*Current)");
			};
			addToMenu.AppendMenuItem(flag, 2001 + index, playlistName);
		}

		//
		if (isPlaylist) {
			rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 1, lang("Remove from playlist"));
		}
		rootMenu.AppendMenuSeparator();
	}

	// Cut/Copy/Paste;
	if (hasMetadbs) {
		isPlaylist && rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 2, lang("Cut"));
		rootMenu.AppendMenuItem(MenuFlag.STRING, 3, lang("Copy"));
	}

	if (fb.CheckClipboardContents()) {
		isPlaylist && rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 4, lang("Paste"));
	}

	if (hasMetadbs) {
		rootMenu.AppendMenuSeparator();
	}

	if (hasMetadbs) {
		let albumMenu = false;
		let artistMenu = false;

		if (!isAlbumlist) {
			let albumNames = uniq(tf_album.EvalWithMetadbs(metadbs));
			if (albumNames.length === 1) {
				albumName = albumNames[0];
				const artistMenu = window.CreatePopupMenu();
				// artistMenu.AppendTo(rootMenu, MenuFlag.STRING, lang("Go to artist"));
				rootMenu.AppendMenuItem(MenuFlag.STRING, 20, lang("Go to album"));
				albumMenu = true;
			}
		}
		(albumMenu || artistMenu) && rootMenu.AppendMenuSeparator();
	}

	// Context menu;
	const Context = fb.CreateContextMenuManager();
	const BaseID = 1000;
	if (hasMetadbs) {
		Context.InitContext(metadbs);
		Context.BuildMenu(rootMenu, BaseID, -1);
	}

	const ret = rootMenu.TrackPopupMenu(x, y);
	let targetId: number;

	switch (true) {
		// "Remove from playlist"
		case ret === 1:
			plman.RemovePlaylistSelection(plman.ActivePlaylist, false);
			break;

		case ret === 2:
			// Cut
			if (!plman.IsPlaylistLocked(plman.ActivePlaylist)) {
				let items = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
				if (fb.CopyHandleListToClipboard(items)) {
					plman.UndoBackup(plman.ActivePlaylist);
					plman.RemovePlaylistSelection(plman.ActivePlaylist);
				}
			}
			break;

		case ret === 3:
			// Copy
			fb.CopyHandleListToClipboard(plman.GetPlaylistSelectedItems(plman.ActivePlaylist));
			break;

		case ret === 4:
			// Paste;
			if (!plman.IsPlaylistLocked(plman.ActivePlaylist) && fb.CheckClipboardContents()) {
				plman.UndoBackup(plman.ActivePlaylist);
				plman.InsertPlaylistItems(plman.ActivePlaylist, plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist) + 1, fb.GetClipboardContents(window.ID), true);
			}
			break;

		// "Go to Album"
		case ret === 20:
			if (albumName) GoToAlbum(albumName)
			break;

		// "Go to Artist";
		case ret >= 3000 && ret < 3100:
			GoToArtist("ASCA")
			break;

		// "Add to... (a newly created playlist)";
		case ret === 2000:
			CreatePlaylistPopup(metadbs);
			break;

		case ret > 2000 && ret < 3000:
			targetId = ret - 2001;
			plman.InsertPlaylistItems(targetId, plman.PlaylistItemCount(targetId), metadbs, true);
			break;

		// Execute context command;
		case ret >= BaseID && ret < 2000:
			Context.ExecuteByID(ret - BaseID);
			break;
	}
}


function showHeaderContextMenu(playlistIndex: number, x: number, y: number) {

	const isValid = isValidPlaylist(playlistIndex);
	const hasTracks = plman.PlaylistItemCount(playlistIndex) > 0;
	const menu = window.CreatePopupMenu();

	menu.AppendMenuItem(MenuFlag.STRING, 10, lang("Rename playlist"));
	if (plman.IsAutoPlaylist(playlistIndex)) {
		menu.AppendMenuItem(MenuFlag.STRING, 11, lang("Edit autoplaylist..."));
	}
	menu.AppendMenuSeparator();

	// TODO;
	// menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 20, lang("Play"));
	// menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 21, lang("Play next"));
	// menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 22, lang("Add to queue"));

	// menu.AppendMenuSeparator();

	menu.AppendMenuItem(MenuFlag.STRING, 30, lang("Delete"));

	let ret = menu.TrackPopupMenu(x, y);

	switch (true) {
		case ret === 10:
			RenamePlaylist(playlistIndex);
			break;
		case ret === 11:
			if (plman.IsAutoPlaylist(playlistIndex)) {
				plman.ShowAutoPlaylistUI(playlistIndex);
			}
			break;
		case ret === 20:
			if (plman.PlaylistItemCount(plman.ActivePlaylist) > 0) {
				plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, Math.floor(Math.random() * plman.PlaylistItemCount(plman.ActivePlaylist)));
			}
			break;
		case ret === 21:
			// 
			break;
		case ret === 22:
			let queuePlaylist = plman.FindOrCreatePlaylist(lang("Queue"), true);
			plman.InsertPlaylistItems(queuePlaylist, plman.PlaylistItemCount(queuePlaylist), plman.GetPlaylistItems(playlistIndex));
			break;

		case ret === 30:
			DeletePlaylistDialog(playlistIndex);
			break;
	}

}

function showSortPlaylistMenu(playlistIndex: number, x: number, y: number, selection = false) {
	let hasMultiSelection = plman.GetPlaylistSelectedItems(plman.ActivePlaylist).Count > 1;
	let menu = window.CreatePopupMenu();
	let sel = window.CreatePopupMenu();

	// ---------------
	// Sort selection;
	// ---------------

	sel.AppendTo(menu, hasMultiSelection ? MenuFlag.STRING : MenuFlag.GRAYED, lang("Selection"));
	sel.AppendMenuItem(MenuFlag.STRING, 20, lang("Sort by..."));
	sel.AppendMenuItem(MenuFlag.STRING, 21, lang("Randomize"));
	sel.AppendMenuItem(MenuFlag.STRING, 22, lang("Reverse"));
	sel.AppendMenuSeparator();
	//
	sel.AppendMenuItem(MenuFlag.STRING, 200, lang("Album"));
	sel.AppendMenuItem(MenuFlag.STRING, 201, lang("Artist"));
	sel.AppendMenuItem(MenuFlag.STRING, 202, lang("File path"));
	sel.AppendMenuItem(MenuFlag.STRING, 203, lang("Title"));
	sel.AppendMenuItem(MenuFlag.STRING, 204, lang("Track number"));
	menu.AppendMenuSeparator();

	// --------------
	// Sort playlist
	// --------------

	menu.AppendMenuItem(MenuFlag.STRING, 10, lang("Sort by..."));
	menu.AppendMenuItem(MenuFlag.STRING, 11, lang("Randomize"));
	menu.AppendMenuItem(MenuFlag.STRING, 12, lang("Reverse"));
	menu.AppendMenuSeparator();
	//
	menu.AppendMenuItem(MenuFlag.STRING, 100, lang("Album"));
	menu.AppendMenuItem(MenuFlag.STRING, 101, lang("Artist"));
	menu.AppendMenuItem(MenuFlag.STRING, 102, lang("File path"));
	menu.AppendMenuItem(MenuFlag.STRING, 103, lang("Title"));
	menu.AppendMenuItem(MenuFlag.STRING, 104, lang("Track number"));

	const ret = menu.TrackPopupMenu(x, y);

	switch (true) {
		case ret === 10:
			fb.RunMainMenuCommand("Edit/Sort/Sort by...");
			break;
		case ret === 11:
			plman.SortByFormat(plman.ActivePlaylist, "");
			break;
		case ret === 12:
			fb.RunMainMenuCommand("Edit/Sort/Reverse");
			break;
		case ret === 100:
			plman.SortByFormat(plman.ActivePlaylist, "%album%^^[%discnumber%^^]%tracknumber%", false);
			break;
		case ret === 101:
			plman.SortByFormat(plman.ActivePlaylist, "%artist%^^%album%^^[%discnumber%^^]%tracknumber%", false);
			break;
		case ret === 102:
			plman.SortByFormat(plman.ActivePlaylist, "%path%", false);
			break;
		case ret === 103:
			plman.SortByFormat(plman.ActivePlaylist, "%title%", false);
			break;
		case ret === 104:
			plman.SortByFormat(plman.ActivePlaylist, "%album artist%^^%album%^^[%discnumber%^^]%tracknumber%", false);
			break;
		case ret === 20:
			fb.RunMainMenuCommand("Edit/Selection/Sort/Sort by...");
			break;
		case ret === 21:
			plman.SortByFormat(plman.ActivePlaylist, "", false);
			break;
		case ret === 22:
			fb.RunMainMenuCommand("Edit/Selection/Sort/Reverse");
			break;
		case ret === 200:
			plman.SortByFormat(plman.ActivePlaylist, "%album%^^[%discnumber%^^]%tracknumber%", true);
			break;
		case ret === 201:
			plman.SortByFormat(plman.ActivePlaylist, "%artist%^^%album%^^[%discnumber%^^]%tracknumber%", true);
			break;
		case ret === 202:
			plman.SortByFormat(plman.ActivePlaylist, "%path%", true);
			break;
		case ret === 203:
			plman.SortByFormat(plman.ActivePlaylist, "%title%", true);
			break;
		case ret === 204:
			plman.SortByFormat(plman.ActivePlaylist, "%album artist%^^%album%^^[%discnumber%^^]%tracknumber%", true);
			break;

	}

}

const tf_album = fb.TitleFormat("%album%");

function uniq(array: string[]) {
	return Array.from(new Set(array));
}

export function isValidPlaylist(playlistIndex: number) {
	return Number.isFinite(playlistIndex) && playlistIndex >= 0 && playlistIndex < plman.PlaylistCount;
}

export function formatPlaylistDuration(duration: number) {
	let MINUTE = 60;
	let HOUR = 3600;
	let DAY = 86400;
	let WEEK = 604800;
	let names = {
		seconds: spaceStart(lang("sec")),
		minutes: spaceStartEnd(lang("min")),
		hour: spaceStartEnd(lang("hr")),
		day: spaceStartEnd(lang("d")),
		week: spaceStartEnd(lang("wk"))
	};
	let formated = '';

	let weeks = (duration / WEEK) >> 0;
	duration -= weeks * WEEK;
	if (weeks > 0) formated += weeks + names.week;

	let days = (duration / DAY) >> 0;
	duration -= days * DAY;
	if (days > 0) formated += days + names.day;

	let hours = (duration / HOUR) >> 0;
	duration -= hours * HOUR;
	if (hours > 0) formated += hours + names.hour;

	let minutes = (duration / MINUTE) >> 0;
	if (weeks === 0 && days === 0 && minutes > 0) formated += minutes + names.minutes;

	let seconds = (duration - minutes * MINUTE) >> 0;
	if (weeks === 0 && days === 0 && hours === 0 && seconds > 0) formated += seconds + names.seconds;

	return formated;
}