//====================================
// Simple Playlist View
//====================================

import { TextRenderingHint, StringTrimming, StringFormatFlags, MenuFlag, VKeyCode, KMask, scale, RGB, deepClone, MeasureString, isEmptyString, StringFormat } from "../common/common";
import { ThrottledRepaint } from "../common/common";
import { scrollbarWidth, themeColors, fonts, fontNameNormal, GdiFont } from "./Theme";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, IBoxModel, IPaddings } from "../common/BasePart";
import { Material, MaterialFont, IconObject } from "../common/Icon";
import { PlaylistArtwork } from "../common/AlbumArt";
import { toggleMood } from "./PlaybackControlView";
import { notifyOthers, ui } from "../common/UserInterface";
import { Button } from "./Buttons";
import { IInputPopupOptions } from "./InputPopupPanel";
import { IAlertDialogOptions } from "./AlertDialog";
import { lang } from "./Lang";

const __DEV__ = window.GetProperty("__DEV__", true);

const mouseCursor = {
	x: -1,
	y: -1,
};

const PageWidth = {
	thin: scale(600),
	wide: scale(920),
	extraWide: scale(1120)
}

const textRenderingHint = ui.textRender;

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

const tfTrackInfo = fb.TitleFormat("%tracknumber%^^[%artist%]^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]");

const playlistFontProps = window.GetProperty("Playlist.Item Font", "normal,14").split(",");

const PlaylistProperties = {
	rowHeight: scale(48),
	itemFont: GdiFont(playlistFontProps[0], scale(+playlistFontProps[1] || 14)),
	emptyFont: gdi.Font(fontNameNormal, scale(20)),
};

const playlistColors = {
	text: themeColors.text,
	secondaryText: themeColors.secondaryText,
	background: themeColors.playlistBackground,
	backgroundSelection: themeColors.playlistBackgroundSelection,
	highlight: themeColors.highlight,
	HEART_RED: themeColors.mood,
};

const spaceStart = (str: string) => str.padStart(str.length + 1);
const spaceStartEnd = (str: string) => spaceStart(str).padEnd(str.length + 2);

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

/**
 * Flow with list items;
 */
class PlaylistHeaderView extends Component {
	titleText: string = "";
	descriptionText: string = "";
	parentOffsetY: number;
	artworkHeight: number;
	_stubImage: IGdiBitmap;
	titleFont: IGdiFont;
	descriptionFont: IGdiFont;
	minHeight: number;

	playlistIndex: number;
	artwork: PlaylistArtwork;
	shuffleBtn: Button;
	editBtn: Button;
	contextBtn: Button;
	sortBtn: Button;

	constructor() {
		super({});

		// Set fonts;
		this.titleFont = GdiFont("bold", scale(32));
		this.descriptionFont = fonts.normal_14;

		// Set stub image;
		let stubImageWidth_ = 500;
		this._stubImage = gdi.CreateImage(stubImageWidth_, stubImageWidth_);
		let g_ = this._stubImage.GetGraphics();
		g_.FillSolidRect(0, 0, stubImageWidth_, stubImageWidth_, 0x20ffffff & RGB(242, 242, 242));
		g_.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g_.DrawString("No Art", gdi.Font("Segoe UI", 102, 1), RGB(97, 97, 97), 0, 0, stubImageWidth_, stubImageWidth_, StringFormat.Center);
		g_.SetTextRenderingHint(TextRenderingHint.SystemDefault);
		this._stubImage.ReleaseGraphics(g_);

		// Minimum height;
		this.minHeight = scale(240);

		// Playlist artwork view;
		this.artwork = new PlaylistArtwork();
		this.addChild(this.artwork);

		this.shuffleBtn = new Button({
			style: "contained",
			//&#x968F;&#x673A;&#x64AD;&#x653E;&#x6240;&#x6709;
			text: lang("Shuffle All"),
			icon: Material.shuffle,
			foreColor: themeColors.onPrimary,
			backgroundColor: themeColors.primary
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
			foreColor: themeColors.secondary
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
			foreColor: themeColors.secondary
		});
		this.sortBtn.on_click = (x, y) => {
			showSortPlaylistMenu(plman.ActivePlaylist, x, y);
		}
		this.addChild(this.sortBtn);
	}

	private getArtworkHeight_(paneWidth: number): number {
		let thin = PageWidth.thin;
		let wide = PageWidth.wide;
		if (paneWidth < thin) return scale(140);
		if (paneWidth < wide) return scale(200);
		return scale(220);
	}

	/**
	 * Get a clone of parent's paddings value;
	 */
	private getParentPaddings_(): IPaddings {
		let sourcePaddings: IPaddings;
		if (this.parent && (<PlaylistView>this.parent).paddings) {
			sourcePaddings = (<PlaylistView>this.parent).paddings;
		} else {
			sourcePaddings = this.paddings;
		}
		return deepClone(sourcePaddings);
	}

	getProperPaddings(paneWidth: number): IPaddings {
		let thin = PageWidth.thin;
		let wide = PageWidth.wide;
		let extraWide = PageWidth.extraWide;
		let paddings = deepClone(this.getParentPaddings_());
		if (paneWidth < thin) {
			paddings.top = paddings.bottom = scale(24);
		} else if (paneWidth < wide) {
			paddings.top = paddings.bottom = scale(24);
		} else if (paneWidth < extraWide) {
			paddings.top = paddings.bottom = scale(32);
		}
		return paddings;
	}

	/**
	 * Get header's proper height; header's height may change with panel's
	 * width;
	 */
	getProperHeight(paneWidth: number): number {
		let descriptionFontHeight = this.descriptionFont.Height;
		let titleFontHeight = this.titleFont.Height;
		let paddings = this.getProperPaddings(paneWidth);
		let paddingLeft = paddings.left;
		let artworkHeight = this.getArtworkHeight_(paneWidth);
		let minHeight_ = artworkHeight + paddings.top + paddings.bottom;
		let gap = scale(24);
		let textAreaWidth = paneWidth - 2 * paddingLeft - gap - artworkHeight;
		let titleText = isEmptyString(this.titleText) ? "NO TITLE" : this.titleText;
		let titleTextFullWidth = MeasureString(titleText, this.titleFont).Width;

		// Padding top;
		let totalHeight = paddings.top;

		// Type text;
		totalHeight += 2 * descriptionFontHeight;

		// Title;
		if (titleTextFullWidth > textAreaWidth) {
			totalHeight += 1.1 * 2 * titleFontHeight;
		} else {
			totalHeight += 1.1 * titleFontHeight;
		}

		// Description
		if (!isEmptyString(this.descriptionText)) {
			totalHeight += 1.2 * descriptionFontHeight;
		}

		// Padding bottom;
		totalHeight += paddings.bottom;

		return Math.max(minHeight_, totalHeight);
	}

	setTitles() {
		this.titleText = plman.GetPlaylistName(this.playlistIndex);
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

	calculateHeightByWidth(width: number) {
		this.paddings = this.getProperPaddings(width)
		this.artworkHeight = this.getArtworkHeight_(width);
		this.artwork.setSize(this.artworkHeight, this.artworkHeight);

		// 
		let minHeight = this.artworkHeight + this.paddings.top + this.paddings.bottom;

		if (width < PageWidth.thin) {
			minHeight += this.shuffleBtn.height + this.paddings.bottom;
		}

		return minHeight;
	}

	on_size() {
		this.paddings = this.getProperPaddings(this.width);
		this.artworkHeight = this.getArtworkHeight_(this.width);
		this.artwork.setBoundary(this.x + this.paddings.left, this.y + this.paddings.top, this.artworkHeight, this.artworkHeight);

		// Set btns position;
		let btnY: number;
		let btnX: number;
		let btns = [this.shuffleBtn, this.sortBtn, /* this.editBtn, */this.contextBtn];
		if (this.width < scale(600)) {
			btnX = this.x + this.paddings.left;
			btnY = this.y + this.paddings.top + this.artwork.height + this.paddings.bottom;
		} else {
			btnY = this.y + this.height - this.paddings.bottom - this.shuffleBtn.height;
			btnX = this.x + this.paddings.left + this.artwork.height + scale(24);
		}
		for (let i = 0; i < btns.length; i++) {
			btns[i].setPosition(btnX, btnY);
			if (btns[i + 1]) {
				btnX += (btns[i + 1].text ? scale(8) : scale(4)) + btns[i].width;
			}
		}
	}

	on_paint(gr: IGdiGraphics) {
		let paddingLeft = this.paddings.left;
		let paddingTop = this.paddings.top;
		let { titleFont, descriptionFont } = this;
		let secondaryTextColor = themeColors.secondaryText;
		let textColor = themeColors.text;
		const artworkWidth = this.artworkHeight;
		const textX = this.x + paddingLeft + artworkWidth + scale(24);
		let textY_ = this.y + paddingTop;
		const textAreaWidth = this.width - paddingLeft - artworkWidth - scale(24) - paddingLeft;

		// Type,
		//&#x64AD;&#x653E;&#x5217;&#x8868;
		// gr.DrawString("\u64ad\u653e\u5217\u8868", descriptionFont, secondaryTextColor, textX, textY_, textAreaWidth, 1.5 * descriptionFont.Height, StringFormat.LeftTopNoTrim);
		textY_ += 1.5 * descriptionFont.Height;

		// Title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		const titleText_ = this.titleText || lang("NO TITLE");
		const titleFullWidth_ = MeasureString(titleText_, titleFont).Width;
		if (titleFullWidth_ > textAreaWidth) {
			let sf = StringFormat(0, 0, StringTrimming.EllipsisCharacter, StringFormatFlags.LineLimit);
			gr.DrawString(titleText_, titleFont, textColor, textX, textY_, textAreaWidth, 2.5 * titleFont.Height, sf);
			textY_ += 1.1 * titleFont.Height * 2;
		} else {
			gr.DrawString(titleText_, titleFont, textColor, textX, textY_, textAreaWidth, 2 * titleFont.Height, StringFormat.LeftTop);
			textY_ += 1.2 * titleFont.Height;
		}
		gr.SetTextRenderingHint(textRenderingHint);

		// Description;
		if (!isEmptyString(this.descriptionText)) {
			gr.DrawString(this.descriptionText, descriptionFont, secondaryTextColor, textX, textY_, textAreaWidth, 2 * descriptionFont.Height, StringFormat.LeftTop);
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

export function isValidPlaylist(playlistIndex: number) {
	return playlistIndex >= 0 && playlistIndex < plman.PlaylistCount;
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

	headerView: PlaylistHeaderView;

	playingIco: IconObject;
	pauseIco: IconObject;
	heartOnIco: IconObject;
	heartOffIco: IconObject;

	_columnsMap: Map<string, PlaylistColumn> = new Map();
	clickOnSelection: boolean;
	multiSelectionStartId = -1;
	clickedMoodId: number = -1;

	constructor() {
		super({});

		/**
		 * Create children component;
		 */

		// scrollbar;
		this.scrollbar = new Scrollbar({
			cursorColor: themeColors.scrollbarCursor,
			backgroundColor: themeColors.scrollbarBackground,
		});
		this.addChild(this.scrollbar);
		this.scrollbar.z = 100;

		// headerView;
		this.headerView = new PlaylistHeaderView();
		this.addChild(this.headerView);
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);

		/**
		 * Create icons;
		 */

		this.playingIco = new IconObject(Material.volume, MaterialFont, scale(16));

		this.pauseIco = new IconObject(Material.volume_mute, MaterialFont, scale(16));

		this.heartOnIco = new IconObject(Material.heart, MaterialFont, scale(16));

		this.heartOffIco = new IconObject(Material.heart_empty, MaterialFont, scale(16));

		/**
		 * Set getMoodId method;
		 */

		let moodHotWidth = PlaylistProperties.rowHeight//heartIconHeight + scale(4);

		this.getActiveMoodId = (x: number, y: number): number => {
			let moodColumn = this._columnsMap.get("mood");
			if (!moodColumn || moodColumn.width == 0) {
				return -1;
			}
			let pad = (moodColumn.width - moodHotWidth) / 2;
			let posLeft = moodColumn.x + pad;
			let posRight = moodColumn.x + pad + moodHotWidth;
			if (x > posLeft && x <= posRight) {
				let hoverItem = this._findHoverItem(x, y);
				return hoverItem ? hoverItem.rowIndex : -1;
			} else {
				return -1;
			}
		};

		/**
		 *  Init columns;
		 */

		this._columnsMap.set("trackNumber", new PlaylistColumn());
		this._columnsMap.set("title", new PlaylistColumn());
		this._columnsMap.set("artist", new PlaylistColumn());
		this._columnsMap.set("album", new PlaylistColumn());
		this._columnsMap.set("mood", new PlaylistColumn());
		this._columnsMap.set("time", new PlaylistColumn());
	}

	// Will be rewrite;
	getActiveMoodId(x: number, y: number): number {
		return -1;
	}

	/**
	 * Create playlist items and init it's items' state (selected, playing,
	 * focused), etc;
	 */
	setList() {
		const playlistMetadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
		const playlistItems: PlaylistViewItem[] = [];
		const playlistItemCount = plman.PlaylistItemCount(plman.ActivePlaylist);
		const rowHeight = PlaylistProperties.rowHeight;
		let itemYOffset = 0;
		this._selectedIndexes = [];

		for (let rowIndex = 0; rowIndex < playlistItemCount; rowIndex++) {
			let rowItem = new PlaylistViewItem();
			rowItem.rowIndex = rowIndex;
			rowItem.metadb = playlistMetadbs[rowIndex];
			rowItem.playlistItemIndex = rowIndex;
			rowItem.yOffset = itemYOffset;
			rowItem.height = rowHeight;
			rowItem.isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, rowIndex);
			this._selectedIndexes.push(rowIndex);

			playlistItems.push(rowItem);
			itemYOffset += rowHeight;
		}
		this.items = playlistItems;
		this._itemsTotalHeight = rowHeight * playlistItems.length + scale(32);
		this.totalHeight = this._itemsTotalHeight + this.headerView.height;
		this.scroll = this.checkscroll(this.scroll);

		this.setPlayingItem();
		this.setFocusItem();
		plman.SetActivePlaylistContext();
	}

	setFocusItem() {
		let focusdPlaylistItemIndex = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist);
		this.focusIndex = this.items.findIndex(item => item.playlistItemIndex === focusdPlaylistItemIndex);
	}

	setPlayingItem() {
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
		album.setVisible(true);

		// ------------------
		// Set columns' size;
		// ------------------
		trackNumber.width = scale(40);
		time.width = scale(16) + MeasureString("00:00", PlaylistProperties.itemFont).Width;
		mood.width = scale(36);

		let whitespace = this.width - padLeft - padRight;
		let reservedWidth = scale(40);
		whitespace -= reservedWidth;
		mood.visible && (whitespace -= mood.width);
		whitespace -= time.width;
		whitespace -= trackNumber.width;

		let titleWidth_ = scale(180);
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
		mood.x = trackNumber.x + trackNumber.width;

		title.x = mood.x + mood.width;
		title.width = titleWidth_ + widthToAdd_;

		artist.x = title.x + title.width;
		artist.width = artistVis ? artistWidth_ + widthToAdd_ : 0;

		album.x = artist.x + artist.width;
		album.width = albumVis ? albumWidth_ + widthToAdd_ : 0;

		time.x = album.x + album.width + reservedWidth;

		// ----------------------
		// Set columns' paddings
		// ----------------------
		title.setPaddings({ right: scale(16) });
		artist.setPaddings({ right: scale(16) });
	}

	getPaddingOnWidth_(panelWidth: number): IPaddings {
		let thin = PageWidth.thin;
		let wide = PageWidth.wide;
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

	on_init() {
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);

		if (fb.IsPlaying && plman.ActivePlaylist === plman.PlayingPlaylist) {
			window.SetTimeout(() => this.showNowPlaying(), 5);
		}
	}

	on_size() {
		this.paddings = this.getPaddingOnWidth_(this.width);
		let items = this.items;

		// Update row x & width;
		for (let itemIndex = 0, len = items.length; itemIndex < len; itemIndex++) {
			let rowItem = items[itemIndex];
			rowItem.x = this.x;
			rowItem.width = this.width;
		}

		this.setColumns();

		this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);

		let headerHeight = this.headerView.calculateHeightByWidth(this.width);
		this.headerView.setBoundary(this.x, this.y - this.scroll, this.width, headerHeight);

		this.totalHeight = this._itemsTotalHeight + this.headerView.height;
	}

	on_paint(gr: IGdiGraphics) {
		let rowHeight = PlaylistProperties.rowHeight;
		let headerHeight = this.headerView.height;
		let items = this.items;
		let colors = playlistColors;
		let paddings = this.paddings;
		let padLeft = paddings.left;
		let padRight = paddings.right;
		let _columnsMap = this._columnsMap;
		let itemFont = PlaylistProperties.itemFont;
		let textColor = themeColors.text;
		let textSecondaryColor = themeColors.secondaryText;

		let trackNumber = _columnsMap.get("trackNumber");
		let title = _columnsMap.get("title");
		let artist = _columnsMap.get("artist");
		let album = _columnsMap.get("album");
		let mood = _columnsMap.get("mood");
		let time = _columnsMap.get("time");

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// Set header's position;
		this.headerView.setPosition(this.x, this.y - this.scroll);

		// Clear visibleItems cache;
		this.visibleItems.length = 0;

		// Draw Items;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let row = items[itemIndex];
			row.x = this.x + padLeft;
			row.width = this.width - padLeft - padRight;
			row.y = this.y + row.yOffset - this.scroll + headerHeight;

			// Visible items;
			if (row.y + rowHeight >= this.y && row.y < this.y + this.height) {
				// Put visible item to visibleItems cache;
				this.visibleItems.push(row);

				// Set rowItems' tags when need.
				row.getTags();

				// ------------------------------
				//  Draw item background & state;
				//  -----------------------------

				if (row.isSelect) {
					gr.FillSolidRect(row.x, row.y, row.width, rowHeight, themeColors.playlistBackgroundSelection);
				}

				if (this.focusIndex === itemIndex) {
					gr.DrawRect(row.x, row.y, row.width - 1, rowHeight - 1, scale(1), RGB(127, 127, 127));
				}

				gr.DrawLine(row.x, row.y + rowHeight - 1, row.x + row.width, row.y + rowHeight - 1, 1, themeColors.playlistSplitLine);

				// --------------
				//  Draw columns;
				// --------------

				// for debug;
				if (__DEV__) {
					gr.DrawString(row.rowIndex, itemFont, textSecondaryColor, this.x, row.y, this.width, row.height, StringFormat.LeftCenter);
				}

				/**
				 * Draw tracknumber | playing icon;
				 */
				if (this.playingItemIndex === itemIndex) {
					(fb.IsPaused ? this.pauseIco : this.playingIco)
						.draw(gr, colors.highlight, trackNumber.x, row.y, trackNumber.width, rowHeight);
				} else {
					trackNumber.draw(gr, row.playlistItemIndex + 1, itemFont, textSecondaryColor, row, StringFormat.Center);
				}

				/**
				 * Title;
				 */
				title.draw(gr, row.title, itemFont, textColor, row);

				/**
				 * (Track )Artist;
				 */
				if (artist.visible && artist.width > 0) {
					artist.draw(gr, row.artist, itemFont, textSecondaryColor, row);
				}

				/**
				 * Album;
				 */
				if (album.visible && album.width > 0) {
					album.draw(gr, row.album, itemFont, textSecondaryColor, row);
				}

				/**
				 * Time(PlaybackLength);
				 */
				time.draw(gr, row.time, itemFont, textSecondaryColor, row);

				/**
				 * Mood(if Rating == 5)
				 */
				if (row.rating === 5) {
					this.heartOnIco.draw(gr, colors.HEART_RED, mood.x, row.y, mood.width, rowHeight);
				} else {
					this.heartOffIco.draw(gr, textSecondaryColor, mood.x, row.y, mood.width, rowHeight);
				}
			}
		}

		// draw drag insert position indication line;
		if (this.trace(mouseCursor.x, mouseCursor.y) && mouseCursor.y >= this.y && mouseCursor.y <= this.y + this.height) {
			if (dnd.isActive && dnd.dropTargetRowIndex > -1) {
				const lineY = this.y + this.headerView.height + dnd.dropTargetRowIndex * rowHeight - this.scroll;
				gr.DrawLine(this.x + padLeft, lineY, this.x + this.width - padRight, lineY, scale(2), RGB(127, 127, 127));
			}
		}

		// draw selection indication rectangle;
		// TODO;

		// draw when playlist is empty;
		if (this.items.length === 0) {
			const textY = this.y + this.headerView.height + scale(48);
			const textLeft = this.x + padLeft + scale(12);
			const emptyFont = PlaylistProperties.emptyFont;
			const textColor = colors.secondaryText;

			if (plman.IsAutoPlaylist(plman.ActivePlaylist)) {
				gr.DrawString("Autoplaylist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * padLeft, this.height, StringFormat.LeftTop);
			} else {
				gr.DrawString("Playlist is empty?", emptyFont, textColor, textLeft, textY, this.width - 2 * padLeft, this.height, StringFormat.LeftTop);
			}
		}

		gr.FillGradRect(this.x, this.y, this.width, scale(40), 90, themeColors.topbarBackground, 0, 1.0);
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
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_added() {
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_removed() {
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_reordered() {
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_selection_changed() {
		let plItemCount = this.items.length;
		for (let plIndex = 0; plIndex < plItemCount; plIndex++) {
			this.items[plIndex].isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, this.items[plIndex].playlistItemIndex);
		}
		ThrottledRepaint();
	}

	getTrack(index: number) {
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
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
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

		let listTopY = this.headerView.y + this.headerView.height;
		if (listTopY < this.y) {
			listTopY = this.y;
		}
		let listBottomY = this.y + this.height;
		let playingItem = this.items[this.playingItemIndex];
		let rowHeight = PlaylistProperties.rowHeight;
		let playingItemVis = playingItem.y >= listTopY && playingItem.y + rowHeight < listBottomY;

		if (!playingItemVis) {
			let targetScroll = this.headerView.height + this.playingItemIndex * PlaylistProperties.rowHeight - (this.height - PlaylistProperties.rowHeight) / 2;
			this.scrollTo(targetScroll);
		}
	}

	on_playback_new_track() {
		this.setPlayingItem();
		this.showNowPlaying();
		ThrottledRepaint();
	}

	on_metadb_changed() {
		this.setList();
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
		this.scrollTo(this.scroll - step * PlaylistProperties.rowHeight * 3);
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
		} else if (hoverItem.isSelect) {
			if (utils.IsKeyPressed(VKeyCode.Shift)) {
				this.setSelection(this.multiSelectionStartId, this.focusIndex);
			} else if (utils.IsKeyPressed(VKeyCode.Control)) {
				plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, hoverItem.playlistItemIndex, !hoverItem.isSelect);
				this._selectedIndexes = this.items.filter(item => item.isSelect).map(item => item.playlistItemIndex);
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
				plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, hoverItem.playlistItemIndex, !hoverItem.isSelect); // toggle;
				this._selectedIndexes = this.items.filter(item => item.isSelect).map(item => item.playlistItemIndex);
			} else {
				/** NO MASKKEY */
				if (hoverItem.isSelect) {
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
		let rowHeight = PlaylistProperties.rowHeight;

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
				const padLeft = this.paddings.left;
				const padRight = this.paddings.right;
				const rowHeigt = PlaylistProperties.rowHeight;
				if (!((selecting.pageX1 < padLeft && selecting.pageX2 < padLeft) || (selecting.pageX1 > this.width - padRight && selecting.pageX2 > this.width - padRight))) {
					let topOffset = this.headerView.height;
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
			}
		}

		mouseCursor.x = x;
		mouseCursor.y = y;
	}

	private _getDragInsertPosition() {
		let selectedIndexes: number[] = [];
		let counter = 0;

		for (let i = 0, len = this.items.length; i < len; i++) {
			if (this.items[i].isSelect) {
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
				toggleMood(this.items[this.clickedMoodId].metadb);
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
}

export function showTrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
	// if (!metadbs || metadbs.Count === 0) return;
	let nullMetadbs = !metadbs || metadbs.Count === 0;
	let hasMetadbs = !nullMetadbs;

	const isPlaylistLocked = plman.IsPlaylistLocked(playlistIndex);
	const rootMenu = window.CreatePopupMenu();

	//
	if (hasMetadbs) {
		const addToMenu = window.CreatePopupMenu();
		addToMenu.AppendTo(rootMenu, MenuFlag.STRING, lang("Add to playlist"));
		addToMenu.AppendMenuItem(MenuFlag.STRING, 2000, lang("Create playlist..."));
		if (plman.PlaylistCount > 0) {
			addToMenu.AppendMenuSeparator();
		}
		for (let index = 0; index < plman.PlaylistCount; index++) {
			addToMenu.AppendMenuItem(plman.IsPlaylistLocked(index) || index === playlistIndex ? MenuFlag.GRAYED : MenuFlag.STRING, 2001 + index, plman.GetPlaylistName(index));
		}

		//
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 1, lang("Remove from playlist"));
		rootMenu.AppendMenuSeparator();
	}

	//
	if (hasMetadbs) {
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 2, lang("Cut"));
		rootMenu.AppendMenuItem(MenuFlag.STRING, 3, lang("Copy"));
	}

	if (nullMetadbs) {
		// Undo & Redo menu;
	}

	if (fb.CheckClipboardContents()) {
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 4, lang("Paste"));
	}

	if (hasMetadbs) {
		rootMenu.AppendMenuSeparator();
	}

	if (hasMetadbs) {
		const artistMenu = window.CreatePopupMenu();
		artistMenu.AppendTo(rootMenu, MenuFlag.GRAYED, lang("Go to artist"));
		rootMenu.AppendMenuItem(MenuFlag.GRAYED, 20, lang("Go to album"));
		rootMenu.AppendMenuSeparator();
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
		case ret === 10:
			break;

		// "Go to Artist";
		case ret >= 3000 && ret < 3100:
			break;

		// "Add to... (a newly created playlist)";
		case ret === 2000:
			targetId = plman.CreatePlaylist(plman.PlaylistCount, "");
			plman.InsertPlaylistItems(targetId, 0, metadbs, false);
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

	menu.AppendMenuItem(MenuFlag.STRING, 10, lang("Edit playlist..."));
	if (plman.IsAutoPlaylist(playlistIndex)) {
		menu.AppendMenuItem(MenuFlag.STRING, 11, lang("Edit autoplaylist..."));
	}
	menu.AppendMenuSeparator();

	menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 20, lang("Play"));
	menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 21, lang("Play next"));
	menu.AppendMenuItem(hasTracks ? MenuFlag.STRING : MenuFlag.GRAYED, 22, lang("Add to queue"));

	menu.AppendMenuSeparator();

	menu.AppendMenuItem(MenuFlag.STRING, 30, lang("Delete"));

	let ret = menu.TrackPopupMenu(x, y);

	switch (true) {
		case ret === 10:
			let opt_1: IInputPopupOptions = {
				title: "Rename playlist",
				defaultText: plman.GetPlaylistName(playlistIndex),
				onSuccess(text: string) {
					if (text !== plman.GetPlaylistName(playlistIndex)) {
						plman.RenamePlaylist(playlistIndex, text);
					}
				}
			};
			notifyOthers("Popup.InputPopupPanel", opt_1);
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
			let options_30: IAlertDialogOptions = {
				title: "Delete playlist",
				onSuccess: () => {
					plman.RemovePlaylist(playlistIndex);
					if (isValidPlaylist(playlistIndex)) {
						plman.ActivePlaylist, playlistIndex;
					}
				}
			};
			notifyOthers("Show.AlertDialog", options_30);
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
			// plman.SortByFormat(plman.ActivePlaylist,)
			break;
		case ret === 103:
			break;
		case ret === 104:
			break;
		case ret === 20:
			break;
	}

}