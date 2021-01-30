//====================================
// Simple Playlist View
//====================================

import { TextRenderingHint, MenuFlag, VKeyCode, KMask, scale, RGB, SmoothingMode, CursorName, throttle, clamp, foo_playcount } from "../common/Common";
import { StringTrimming, StringFormatFlags, MeasureString, StringFormat, spaceStart, spaceStartEnd } from "../common/String";
import { ThrottledRepaint } from "../common/Common";
import { scrollbarWidth, themeColors, GdiFont } from "./Theme";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, IBoxModel } from "../common/BasePart";
import { Material, MaterialFont } from "../common/Icon";
import { PlaylistArtwork } from "../common/AlbumArt";
import { PlaybackControlView, ReadMood, TF_MOOD, ToggleMood } from "./PlaybackControlView";
import { mouseCursor, ui } from "../common/UserInterface";
import { Button } from "./Buttons";
import { lang } from "./Lang";
import { CreatePlaylistPopup, DeletePlaylistDialog, GoToAlbum, GoToArtist, RenamePlaylist } from "./Layout";
import { RatingBar } from "./Rating";


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
const TF_PLAYCOUNT = fb.TitleFormat("[%play_count%]");

const iconFont_list = GdiFont(MaterialFont, scale(18));
const iconFont_btn = GdiFont(MaterialFont, scale(20));
let itemFont = GdiFont(window.GetProperty("Playlist.Item Font", "normal,14"));
let semiItemFont = GdiFont("semibold", itemFont.Size);
const emptyInfoFont = GdiFont("normal, 16");
const titleFont = GdiFont("bold, 24");
const descriptionFont = GdiFont("normal, 14");

const descriptionLineHeight = descriptionFont.Height * 1.2;
const moodIconWidth = MeasureString(Material.heart_empty, iconFont_list).Width;
let titleLineHeight = titleFont.Height * 1.3;

let paddingLR = scale(24);
let paddingTB = scale(24);
const rowHeight = scale(window.GetProperty("List.Row Height", 48));
let artworkHeight = 0;
let artworkMarginL = scale(24);
let headerHeight = 0;
const columnHeaderHeight = scale(36);
let durationWidth = scale(16) + MeasureString("0:00:00", itemFont).Width;
const pageWidth = {
	thin: scale(600),
	wide: scale(920),
	extraWide: scale(1120)
}

if (rowHeight < scale(48)) {
	itemFont = GdiFont("normal,12");
}
semiItemFont = GdiFont("semibold", itemFont.Size);
let timeFont = GdiFont("Trebuchet MS", itemFont.Size);


// init columns visibility;
// let columnsVisbility = window.GetProperty("Playlist.Columns Visibility", "1,1,1,1,1,0,1");
// let columnsVis = columnsVisbility.split(",");
// if (columnsVis.length !== 7) {
// 	let vis = "1,1,1,1,1,0,1";
// 	columnsVis = vis.split(",")
// 	window.SetProperty("Playlist.Columns Visibility", vis);
// }

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
 * listheader;
 */
let columnHeader = new Component({});
columnHeader.height = scale(36);


/**
 * Header banner contains albumart, title & playlist info, buttons;
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

		// gr.FillSolidRect(this.x, this.y, scale(200), scale(100), 0xff000000);
	}

	on_mouse_rbtn_up(x: number, y: number) {
		// if (columnHeader.trace(x, y)) {
		// 	try {
		// 		// showlistHeaderMenu(x, y, this.parent);
		// 	} catch (e) { }
		// } else {
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
	mood: number;
	trackNumber: string;
	title: string;
	artist: string;
	album: string;
	time: string;
	playcount: string;

	ratingbar = new RatingBar();

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
		this.mood = ReadMood(this.metadb);
		this.ratingbar.setMetadb(this.metadb);
		this.playcount = TF_PLAYCOUNT.EvalWithMetadb(this.metadb);
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
	droprect: Component;

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

		// this._columns.set("trackNumber", new PlaylistColumn());
		// this._columns.set("title", new PlaylistColumn());
		// this._columns.set("artist", new PlaylistColumn());
		// this._columns.set("album", new PlaylistColumn());
		// this._columns.set("mood", new PlaylistColumn());
		// this._columns.set("time", new PlaylistColumn());
		// this._columns.set("rating", new PlaylistColumn());
		this.initColumns();

		this.droprect = new Component({})
		this.droprect.on_paint = (gr: IGdiGraphics) => {
			gr.DrawRect(this.x, this.y, this.width - scale(2), this.height - scale(2), scale(2), playlistColors.highlight & 0xa0ffffff);
		}

		this.droprect.z = 1000;
		this.droprect.visible = false;
		this.addChild(this.droprect);
	}

	private getActiveMoodId(x: number, y: number): number {
		let moodcolumn = this._columns.get("Mood");
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
		this._itemsTotalHeight = rowHeight * playlistItems.length + rowHeight;
		this.totalHeight = this._itemsTotalHeight + this.header.height + columnHeaderHeight;
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

	initColumns() {
		let columns = ["Index", "Mood", "Title", "Artist", "Album", "Playcount", "Rating", "Duration"];
		let columnsVis = window.GetProperty("Playlist.Columns.Visible", "1,1,1,1,1,0,1,1").split(",");
		if (columnsVis.length !== 8) {
			columnsVis = "1,1,1,1,1,0,1,1".split(",");
			window.SetProperty("Playlist.Columns.Visible", columnsVis.join(","));
		}
		columns.forEach((col, i) => {
			let obj = new PlaylistColumn();
			obj.visible = columnsVis[i] != "0";
			this._columns.set(col, obj);
		});
	}

	setColumns() {
		// ---------------
		// Columns;
		// ---------------
		const Index = this._columns.get("Index");
		const mood = this._columns.get("Mood");
		const title = this._columns.get("Title");
		const artist = this._columns.get("Artist");
		const album = this._columns.get("Album");
		const rating = this._columns.get("Rating");
		const plays = this._columns.get("Playcount");
		const duration = this._columns.get("Duration");

		// ------------------
		// Set columns' size;
		// ------------------
		Index.width = MeasureString(plman.GetPlaylistItems(plman.ActivePlaylist).Count, itemFont).Width + scale(8);//scale(40);
		mood.width = scale(36);
		rating.width = RatingBar.Width + scale(8);
		duration.width = durationWidth;
		plays.width = MeasureString("0,000", itemFont).Width + scale(16);
		let playcountVis = foo_playcount && plays.visible;

		let whitespace = this.width - paddingLR - paddingLR;
		// let reservedWidth = 0;//scale(40);
		// whitespace -= reservedWidth;
		mood.visible && (whitespace -= mood.width);
		duration.visible && (whitespace -= duration.width);
		Index.visible && (whitespace -= Index.width);
		rating.visible && (whitespace -= rating.width);
		playcountVis && (whitespace -= plays.width);

		let titleWidth_ = scale(280);
		let artistWidth_ = (artist.visible ? scale(200) : 0);
		let albumWidth_ = (album.visible ? scale(220) : 0);

		let albumVis = album.visible && whitespace > titleWidth_ + albumWidth_;//this.width >= pageWidth.thin;
		let artistVis = artist.visible && whitespace > titleWidth_ + artistWidth_ + albumWidth_//this.width >= pageWidth.wide;
		let widthToAdd_ = whitespace - titleWidth_;
		let count = 1;
		let floor = Math.floor;
		if (artistVis) {
			count++;
			widthToAdd_ -= artistWidth_;
		}
		if (albumVis) {
			count++;
			widthToAdd_ -= albumWidth_;
		}
		widthToAdd_ = widthToAdd_ / count;

		// if (artistVis && albumVis) {
		// 	widthToAdd_ = floor((whitespace - titleWidth_ - albumWidth_ - artistWidth_) / 3);
		// } if (artistVis || albumVis) {

		// 	// if (albumVis) {
		// 	widthToAdd_ = floor((whitespace - titleWidth_ - albumWidth_) / 2);
		// }

		Index.x = this.x + paddingLR;
		mood.x = Index.x + (Index.visible ? Index.width : 0);

		title.x = mood.x + (mood.visible ? mood.width : 0);
		title.width = titleWidth_ + widthToAdd_;

		artist.x = title.x + title.width;
		artist.width = artistVis ? artistWidth_ + widthToAdd_ : 0;

		album.x = artist.x + artist.width;
		album.width = albumVis ? albumWidth_ + widthToAdd_ : 0;

		plays.x = album.x + (albumVis ? album.width : 0);
		rating.x = plays.x + (playcountVis ? plays.width : 0);
		duration.x = rating.x + (rating.visible ? rating.width : 0);

		// rating.x = album.x + album.width;
		// let ratingwidth = rating.visible ? rating.width : 0;

		// duration.x = rating.x + ratingwidth;
		// duration.width -= scale(8);

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
		this.totalHeight = this._itemsTotalHeight + this.header.height + columnHeaderHeight;

		// scrollbar;
		this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);

		this.scrollTo();
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
		let trackIndex = _columns.get("Index");
		let title = _columns.get("Title");
		let artist = _columns.get("Artist");
		let album = _columns.get("Album");
		let mood = _columns.get("Mood");
		let time = _columns.get("Duration");
		let rating = _columns.get("Rating");
		let playcount = _columns.get("Playcount");

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// Set header's position;
		this.header.setPosition(this.x, this.y - this.scroll);

		let rowX = this.x + paddingLR;
		let rowWidth = this.width - 2 * paddingLR;

		// draw list header;
		columnHeader.x = rowX;
		columnHeader.width = rowWidth;
		columnHeader.y = this.y + this.header.height - this.scroll;
		columnHeader.height = columnHeaderHeight;
		let lineY = columnHeader.y + columnHeaderHeight - 1;
		gr.DrawLine(rowX, lineY, rowX + rowWidth, lineY, scale(1), lineColor);

		// track numr;
		if (trackIndex.visible && trackIndex.width > 0) {
			gr.DrawString("#", semiItemFont, secondaryTextColor,
				trackIndex.x, columnHeader.y, trackIndex.width, columnHeaderHeight, StringFormat.Center);
		}

		// title /artist;
		gr.DrawString(lang("TITLE"), semiItemFont, secondaryTextColor,
			title.x + scale(8), columnHeader.y, title.width, columnHeaderHeight, StringFormat.LeftCenter);

		// artist;
		if (artist.visible && artist.width > 0) {
			gr.DrawString(lang("ARTIST"), semiItemFont, secondaryTextColor,
				artist.x, columnHeader.y, artist.width, columnHeaderHeight, StringFormat.LeftCenter);
		}

		// album;
		if (album.visible && album.width > 0) {
			gr.DrawString(lang("ALBUM"), semiItemFont, secondaryTextColor,
				album.x, columnHeader.y, album.width, columnHeaderHeight, StringFormat.LeftCenter);
		}

		if (playcount.visible && foo_playcount) {
			gr.DrawString(lang("Plays"), semiItemFont, secondaryTextColor,
				playcount.x, columnHeader.y, playcount.width - scale(16), columnHeaderHeight, StringFormat.RightCenter);
		}

		if (rating.visible && rating.width > 0) {
			gr.DrawString(lang("RATING"), semiItemFont, secondaryTextColor,
				rating.x + scale(4), columnHeader.y, rating.width, columnHeaderHeight, StringFormat.LeftCenter);
		}

		// duration;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(Material.time, iconFont_btn, secondaryTextColor,
			time.x, columnHeader.y, time.width - scale(8), columnHeaderHeight, StringFormat.RightCenter);
		gr.SetTextRenderingHint(ui_textRendering);

		// Clear visibleItems cache;
		this.visibleItems.length = 0;

		let isfocuspart = ui.isFocusPart(this);

		// Draw Items;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let row = items[itemIndex];
			row.x = rowX;
			row.width = rowWidth;
			row.y = this.y + row.yOffset - this.scroll + headerHeight + columnHeaderHeight;

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
				if (trackIndex.visible) {
					if (this.playingItemIndex === itemIndex) {
						let iconCode = fb.IsPaused ? Material.volume_mute : Material.volume;
						gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
						gr.DrawString(iconCode, iconFont_list, highlightColor,
							trackIndex.x, row.y, trackIndex.width, row.height, StringFormat.Center);
						gr.SetTextRenderingHint(ui_textRendering);
					} else {
						trackIndex.draw(gr, row.playlistItemIndex + 1, itemFont, secondaryTextColor, row, StringFormat.Center);
					}
				}

				/**
				 * Title;
				 */
				// if (artist.visible && artist.width > 0) {
				// 	title.draw(gr, row.title, itemFont, textColor, row);
				// 	artist.draw(gr, row.artist, itemFont, secondaryTextColor, row);
				// }
				// // if (album.visible && album.width > 0);
				// else {
				// 	let artistY = row.y + row.height / 2;
				// 	let titleY = artistY - itemFont.Height;
				// 	let padright = scale(16);
				// 	gr.DrawString(row.title, itemFont, textColor,
				// 		title.x, titleY, title.width - padright, row.height, StringFormat.LeftTop);

				// 	let subtitleText = row.artist;
				// 	if (!(album.visible && album.width)) {
				// 		subtitleText += spaceStartEnd("\u2022") + row.album;
				// 	}
				// 	gr.DrawString(subtitleText, itemFont, secondaryTextColor,
				// 		title.x, artistY, title.width - padright, row.height, StringFormat.LeftTop);
				// }

				if ((artist.visible && artist.width == 0 || album.visible && album.width == 0) && this.rowHeight > scale(35)) {
					let artistY = row.y + row.height / 2;
					let titleY = artistY - itemFont.Height;
					let padright = scale(16);
					gr.DrawString(row.title, itemFont, textColor,
						title.x + scale(8), titleY, title.width - padright, row.height, StringFormat.LeftTop);
					let subtitleText = "";
					if (artist.visible && artist.width == 0) {
						subtitleText += row.artist;
					}
					if (album.visible && album.width == 0) {
						subtitleText += (subtitleText ? spaceStartEnd("\u2022") : "") + row.album;
					}
					gr.DrawString(subtitleText, itemFont, secondaryTextColor,
						title.x + scale(8), artistY, title.width - padright, row.height, StringFormat.LeftTop);
				} else {
					// title.draw(gr, row.title, itemFont, textColor, row);
					gr.DrawString(row.title, itemFont, textColor,
						title.x + scale(8), row.y, title.width - scale(24), row.height, StringFormat.LeftCenter);
				}


				if (artist.visible && artist.width > 0) {
					artist.draw(gr, row.artist, itemFont, secondaryTextColor, row);
				}

				/**
				 * Album;
				 */
				if (album.visible && album.width > 0) {
					album.draw(gr, row.album, itemFont, secondaryTextColor, row);
				}

				/**
				 * Playcount;
				 */
				if (playcount.visible && foo_playcount) {
					gr.DrawString(row.playcount, itemFont, secondaryTextColor,
						playcount.x, row.y, playcount.width - scale(16), row.height, StringFormat.RightCenter);
				}

				/**
				 * Time(PlaybackLength);
				 */
				if (time.visible) {
					gr.DrawString(row.time, timeFont, secondaryTextColor,
						time.x, row.y, time.width - scale(8), row.height, StringFormat.RightCenter);
				}

				/**
				 * Mood(if Rating == 5)
				 */
				if (mood.visible) {
					let liked = row.mood != 0;//row.rating === 5;
					let iconColor = liked ? playlistColors.HEART_RED : secondaryTextColor;
					let iconCode = liked ? Material.heart : Material.heart_empty;
					gr.DrawString(iconCode, iconFont_list, iconColor,
						mood.x, row.y, mood.width, row.height, StringFormat.Center);
				}

			/**
			 * Ratings;
			 */
				if (rating.visible && rating.width > 0) {
					row.ratingbar.x = rating.x + scale(4);
					row.ratingbar.y = row.y + (row.height - row.ratingbar.height) / 2;
					row.ratingbar.on_paint(gr);
				}
			}
		}

		// draw drag insert position indication line;
		if (this.trace(mouseCursor.x, mouseCursor.y) && mouseCursor.y >= this.y && mouseCursor.y <= this.y + this.height) {
			if (dnd.isActive && dnd.dropTargetRowIndex > -1) {
				const lineY = this.y + this.header.height + columnHeaderHeight + dnd.dropTargetRowIndex * rowHeight - this.scroll;
				gr.DrawLine(this.x + paddingLR, lineY, this.x + this.width - paddingLR, lineY, scale(2), RGB(127, 127, 127));
			}
		}

		// draw when playlist is empty;
		if (this.items.length === 0) {
			const textY = this.y + this.header.height + columnHeaderHeight + scale(16);
			const textLeft = this.x + paddingLR;
			const emptyFont = emptyInfoFont;
			const textColor = secondaryTextColor;

			if (plman.IsAutoPlaylist(plman.ActivePlaylist)) {
				gr.DrawString("Autoplaylist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * paddingLR, this.height, StringFormat.LeftTop);
			} else {
				gr.DrawString("Playlist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * paddingLR, this.height, StringFormat.LeftTop);
			}
		}

		// gr.FillGradRect(this.x, this.y, this.width, scale(40), 90, themeColors.topbarBackground, 0, 1.0);
	}

	private drawTooltipImage() {
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

	on_item_focus_change(playlistIndex?: number) {
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

		if (dnd.isActive || selecting.isActive) {
			return;
		}

		let listTopY = this.header.y + this.header.height + columnHeaderHeight;
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
		let listtopY = this.header.y + this.header.height + columnHeaderHeight;
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

	private applySelection() {
		let playlistItemIndexes: number[] = [];

		for (let i = 0, len = this._selectedIndexes.length; i < len; i++) {
			let itemIndex = this._selectedIndexes[i];
			let item = this.items[itemIndex];
			item && playlistItemIndexes.push(item.playlistItemIndex);
		}

		plman.ClearPlaylistSelection(plman.ActivePlaylist);
		plman.SetPlaylistSelection(plman.ActivePlaylist, playlistItemIndexes, true);
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
			// plman.ClearPlaylistSelection(plman.ActivePlaylist);
			this._selectedIndexes.length = 0;
			this.applySelection();
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

		for (let i = from; i <= to; i++) {
			// this.items[index] && indexes.push(this.items[index].playlistItemIndex);
			this.items[i] && indexes.push(i);
		}

		if (indexes.toString() !== this._selectedIndexes.toString()) {
			this._selectedIndexes = indexes;
			// plman.ClearPlaylistSelection(plman.ActivePlaylist);
			// plman.SetPlaylistSelection(plman.ActivePlaylist, indexes, true);
			this.applySelection();
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
		if (hoverRowItem && hoverRowItem.ratingbar.trace(x, y)) {
			this.ratingID = hoverRowItem.rowIndex;
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

		// --> click on rating;
		this.ratingID = -1;
		if (hoverItem && hoverItem.ratingbar.trace(x, y)) {
			hoverItem.ratingbar.on_mouse_lbtn_down(x, y);
			this.ratingID = hoverItem.rowIndex;
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
				this.setSelection(hoverItem.playlistItemIndex);
				selecting.isActive = true;
				selecting.pageX1 = selecting.pageX2 = x - this.x;
				selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
			}
		}
	}

	private updateselection(x: number, y: number) {
		if (this.items.length === 0) {
			return;
		}
		let topY = this.y;
		let bottomY = this.y + this.height;
		let first = -1, last = -1;

		selecting.pageX2 = clamp(x, this.x, this.x + this.width - this.scrollbar.width) - this.x;
		selecting.pageY2 = clamp(y, topY, bottomY) - this.y + this.scroll;
		if (!(selecting.pageX1 < paddingLR && selecting.pageX2 < paddingLR
			|| selecting.pageX1 > this.width - paddingLR && selecting.pageX2 > this.width - paddingLR)) {
			first = this.traceItemLineIndex(selecting.pageY1);
			last = this.traceItemLineIndex(selecting.pageY2);
		}
		this.setSelection(first, last);
	}

	private traceItemLineIndex(y: number) {
		if (this.items.length === 0) {
			return -1;
		}
		let offsetTop = headerHeight + columnHeaderHeight;
		let lastItem = this.items[this.items.length - 1];
		let firstItem = this.items[0];
		let resultIndex = this.items.findIndex(item => {
			return y > offsetTop + item.yOffset && y <= offsetTop + item.yOffset + item.height;
		});
		if (resultIndex === -1) {
			if (lastItem && y > offsetTop + lastItem.yOffset + lastItem.height) {
				resultIndex = this.items.length;
			} else if (firstItem && y < offsetTop + firstItem.yOffset) {
				resultIndex = -1;
			}
		}
		return resultIndex;
	}

	ratingID: number = -1;

	on_mouse_move(x: number, y: number) {
		let listTopY = this.y + this.rowHeight;
		let listBottomY = this.y + this.height - this.rowHeight;
		let rowHeight = this.rowHeight;

		if (this.clickedMoodId > -1) {
			return;
		}

		if (this.ratingID > -1) {
			return;
		}

		//
		if (selecting.isActive) {
			if (y < this.y + rowHeight) {
				// this.scroll -= rowHeight / 3;
				this.scrollTo(this.scroll - rowHeight);
			} else if (y > this.y + this.height - rowHeight) {
				// this.scroll += rowHeight / 3;
				this.scrollTo(this.scroll + rowHeight);
			} else {
			}
			this.updateselection(x, y);
		} else if (dnd.isActive) {
			// set mouse cursor;

			if (y < listTopY) {
				// dnd.setInterval(
				// 	() => {
				// 		this.scrollTo(this.scroll - rowHeight);
				// 		if (this.visibleItems[0] != null) {
				// 			dnd.dropTargetRowIndex = this.visibleItems[0].rowIndex;
				// 		}
				// 	},
				// 	250,
				// 	this
				// );
				this.scrollTo(this.scroll - rowHeight);
				dnd.dropTargetRowIndex = this.visibleItems[0].rowIndex;
				// this.repaint();
			} else if (y > listBottomY) {
				this.scrollTo(this.scroll + rowHeight);
				// this.repaint();
				let lastitem = this.visibleItems[this.visibleItems.length - 1];
				dnd.dropTargetRowIndex = lastitem.rowIndex;
				if (lastitem.y + lastitem.height < this.y + this.height) {
					dnd.dropTargetRowIndex = lastitem.rowIndex + 1;
				}
				// dnd.setInterval(
				// 	() => {
				// 		this.scrollTo(this.scroll + rowHeight);
				// 		if (this.visibleItems.length > 0) {
				// 			let lastItem = this.visibleItems[this.visibleItems.length - 1];
				// 			dnd.dropTargetRowIndex = lastItem.rowIndex;
				// 			if (lastItem.y + lastItem.height < this.y + this.height) {
				// 				dnd.dropTargetRowIndex = lastItem.rowIndex + 1;
				// 			}
				// 		}
				// 	},
				// 	250,
				// 	this
				// );
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
			}
			// this.repaint();
			ThrottledRepaint();
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

		if (this.ratingID > -1) {
			this.ratingID = -1;
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

	on_drag_over(action: IDropTargetAction, x: number, y: number) {
		if (this.trace(x, y)) {
			if (!plman.IsPlaylistLocked(plman.ActivePlaylist)) {
				this.droprect.visible = true;
				this.droprect.setBoundary(this.x, this.y, this.width, this.height);
				action.Effect = 1;
			} else {
				this.droprect.visible = false;
				action.Effect = 0;
			}
		} else {
			this.droprect.visible = false;
		}
		ThrottledRepaint();
	}

	on_drag_drop(action: IDropTargetAction, x: number, y: number) {
		if (this.trace(x, y)) {
			if (!plman.IsPlaylistLocked(plman.ActivePlaylist)) {
				plman.ClearPlaylistSelection(plman.ActivePlaylist);
				action.Playlist = plman.ActivePlaylist;
				action.Base = plman.PlaylistItemCount(plman.ActivePlaylist);
				action.ToSelect = true;
				action.Effect = 1;
			} else {
				action.Effect = 0;
			}
		} else {
			//
		}
		setTimeout(() => {
			this.scrollTo(this.totalHeight);
		}, 1);
		this.droprect.visible = false;
		this.repaint();
	}

	on_drag_leave() {
		this.droprect.visible = false;
		this.repaint();
	}


	on_mouse_rbtn_up(x: number, y: number) {
		if (columnHeader.trace(x, y)) {
			try {
				showlistHeaderMenu(x, y, this);
			} catch (e) { }
		} else {
			try {
				showTrackContextMenu(plman.ActivePlaylist, plman.GetPlaylistSelectedItems(plman.ActivePlaylist), x, y);
			} catch (e) { }

		}
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
					// TODO: ESC 键取消拖选或拖动的鼠标动作。
					// ----
					// selecting.isActive = false;
					// selecting.pageX1 = selecting.pageX2 = -1;
					// selecting.pageY1 = selecting.pageY2 = -1;
					// dnd.isActive = false;
					// ui.setCursorImage(null);
					// window.SetCursor(CursorName.IDC_ARROW);
					// this.repaint();
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
						let onpagedownstop = (() => {
							this.setFocusByIndex(this.visibleItems[this.visibleItems.length - 1].rowIndex);
							this.setSelection(this.focusIndex);
							this.repaint();
						})
						this.scrollTo(this.scroll + this.height, onpagedownstop);
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

	// on_playlist_item_ensure_visible(playlistIndex: number, playlistItemIndex: number) {
	// }

	onNotifyData(message: string, data: any) {
		switch (message) {
			case "Playlist.Scroll End":
				this.scrollTo(this.totalHeight);
				break;
			case "playlist-show-now-playing-in-playlist":
				this.showNowPlaying();
				break;
		}
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

function showlistHeaderMenu(x: number, y: number, pl: PlaylistView) {
	let menu = window.CreatePopupMenu();
	let columns = window.CreatePopupMenu();

	// let columnNames = ["Index", "Mood", "Title", "Artist", "Album", "Playcount", "Rating", "Duration"];
	let columnsVis = window.GetProperty("Playlist.Columns.Visible", "1,1,1,1,1,0,1,1").split(",");
	if (columnsVis.length !== 8) {
		columnsVis = "1,1,1,1,1,0,1,1".split(",");
		window.SetProperty("Playlist.Columns.Visible", columnsVis.join(","));
	}

	columns.AppendTo(menu, MenuFlag.STRING, lang("Columns"));
	columns.AppendMenuItem(MenuFlag.STRING, 100, lang("Index"));
	columns.AppendMenuItem(MenuFlag.STRING, 101, lang("Mood"));
	columns.AppendMenuItem(MenuFlag.GRAYED, 102, lang("Title"));
	columns.AppendMenuItem(MenuFlag.STRING, 103, lang("Artist"));
	columns.AppendMenuItem(MenuFlag.STRING, 104, lang("Album"));
	columns.AppendMenuItem(MenuFlag.STRING, 105, lang("Play count"));
	columns.AppendMenuItem(MenuFlag.STRING, 106, lang("Rating"));
	columns.AppendMenuItem(MenuFlag.STRING, 107, lang("Duration"));

	for (let i = 0; i < columnsVis.length; i++) {
		columns.CheckMenuItem(100 + i, columnsVis[i] != "0");
	}

	const ret = menu.TrackPopupMenu(x, y);

	let col = ret - 100;
	columnsVis[col] = (columnsVis[col] == "0" ? "1" : "0");
	window.SetProperty("Playlist.Columns.Visible", columnsVis.join(","));
	pl.initColumns();
	pl.on_size();

}