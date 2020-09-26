//====================================
// Simple Playlist View
//====================================

import {
	TextRenderingHint,
	StringTrimming,
	StringFormatFlags,
	MenuFlag,
	VKeyCode,
	KMask,
	scale,
	RGB,
	deepClone,
	MeasureString,
	isEmptyString,
	CropImage,
	StringFormat,
} from "../common/common";
import { IThemeColors, mainColors, scrollbarColor, scrollbarWidth, globalFontName } from "./Theme";
import { ThrottledRepaint } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, IBoxModel } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { SerializableIcon } from "../common/IconType";
import { AlbumArtId, PlaylistArtwork } from "../common/AlbumArtView";
import { toggleMood } from "./PlaybackControlView";
import { ui } from "../common/UserInterface";

const __DEV__ = window.GetProperty("__DEV__", true);

const mouseCursor = {
	x: -1,
	y: -1
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
		(this._timerId > -1) && window.ClearInterval(this._timerId);
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
		(this._timerId > -1) && window.ClearInterval(this._timerId);
		this._timerId = -1;
	}

	reset() {
		this.isActive = false;
		this.clearInterval();
	}
}

let selecting = new SelectionHelper();


const tfTrackInfo = fb.TitleFormat("%tracknumber%^^[%artist%]^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]");

const PlaylistProperties = {
	rowHeight: scale(40),
	itemFont: gdi.Font("Microsoft YaHei", scale(14), 0),
	emptyFont: gdi.Font(globalFontName, scale(20))
}

const playlistColors: IThemeColors = {
	text: mainColors.text,
	secondaryText: mainColors.secondaryText,
	background: RGB(28, 28, 28),
	highlight: mainColors.highlight,
	HEART_RED: RGB(221, 0, 27),
};

/**
 * Flow with list items;
 */
class PlaylistHeaderView extends Component {
	titleText: string = "";
	parentOffsetY: number;
	descriptionText: string = "";
	primaryColor: number;
	secondaryColor: number;
	artworkImage: IGdiBitmap;
	artworkHeight: number;
	_stubImage: IGdiBitmap;
	imageWidth: number;
	titleFont: IGdiFont;
	subtitleFont: IGdiFont;
	descriptionFont: IGdiFont;
	minHeight: number;

	paddings: IPaddings;

	constructor(options: {
		titleText?: string;
		subtitleText?: string;
		discriptionText?: string;
		primaryColor: number;
		secondaryColor: number;
	}) {
		super({});
		this.titleText = options.titleText || "";
		this.descriptionText = options.discriptionText || "";
		this.primaryColor = options.primaryColor;
		this.secondaryColor = options.secondaryColor;

		this.paddings = { top: 0, bottom: 0, left: 0, right: 0 };

		// Set fonts;
		let fontName_ = "Segoe UI";
		this.titleFont = gdi.Font("Segoe UI", scale(28), 1);
		this.subtitleFont = gdi.Font(fontName_, scale(24));
		this.descriptionFont = gdi.Font(fontName_, scale(14));

		// Set stub image;
		let stubImageWidth_ = 500;
		this._stubImage = gdi.CreateImage(stubImageWidth_, stubImageWidth_);
		let g_ = this._stubImage.GetGraphics();
		g_.FillSolidRect(
			0,
			0,
			stubImageWidth_,
			stubImageWidth_,
			0x20ffffff & RGB(242, 242, 242)
		);
		g_.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g_.DrawString(
			"No Art",
			gdi.Font("Segoe UI", 102, 1),
			RGB(97, 97, 97),
			0,
			0,
			stubImageWidth_,
			stubImageWidth_,
			StringFormat.Center
		);
		g_.SetTextRenderingHint(TextRenderingHint.SystemDefault);
		this._stubImage.ReleaseGraphics(g_);

		// Minimum height;
		this.minHeight = scale(240);

		this.artwork = new PlaylistArtwork();
		this.addChild(this.artwork);
	}

	artwork: PlaylistArtwork;

	private getArtworkHeight_(paneWidth: number): number {
		let thin = scale(600);
		let wide = scale(920);
		if (paneWidth < thin) return scale(160);
		if (paneWidth < wide) return scale(200);
		return scale(240);
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
		let thin = scale(600);
		let wide = scale(920);
		let extraWide = scale(1120);
		let paddings = deepClone(this.getParentPaddings_());
		if (paneWidth < thin) {
			paddings.top = paddings.bottom = scale(12);
		} else if (paneWidth < wide) {
			paddings.top = paddings.bottom = scale(12);
		}
		if (paneWidth < extraWide) {
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
			plman.PlaylistItemCount(this.playlistIndex) +
			" tracks" +
			" \u2022 " +
			utils.FormatDuration(
				plman.GetPlaylistItems(this.playlistIndex).CalcTotalDuration()
			);
	}

	playlistIndex: number;

	setPlaylistIndex(value: number): void {
		this.playlistIndex = value;
		this.setTitles();
		this.setArtwork();
	}

	async setArtwork() {
		let playlistMetadbs = plman.GetPlaylistItems(this.playlistIndex);
		let artsworks: IGdiBitmap[] = [];
		let index = 0;
		let trackCount = Math.min(playlistMetadbs.Count, 50);
		let playlistIndex = this.playlistIndex;

		while (index < trackCount && artsworks.length < 1) {
			let result = await utils.GetAlbumArtAsyncV2(
				window.ID,
				playlistMetadbs[index],
				AlbumArtId.Front
			);
			if (result.image == null) {
				result = await utils.GetAlbumArtAsyncV2(
					window.ID,
					playlistMetadbs[index],
					AlbumArtId.Disc
				);
			}
			if (result.image != null) {
				artsworks.push(result.image);
			}
			index++;
		}

		if (playlistIndex === this.playlistIndex && artsworks.length > 0) {
			let artworkWidth = this.artworkHeight;
			let img = CropImage(artsworks[0], artworkWidth, artworkWidth);
			this.artworkImage = img;
		} else {
			this.artworkImage = this._stubImage;
		}
		this.repaint();
	}

	on_size() {
		this.paddings = this.getProperPaddings(this.width);
		this.artworkHeight = this.getArtworkHeight_(this.width);
		this.artwork.setBoundary(this.x + this.paddings.left,
			this.y + this.paddings.top, this.artworkHeight, this.artworkHeight)
	}

	on_paint(gr: IGdiGraphics) {
		let primaryColor = this.primaryColor;
		let secondaryColor = this.secondaryColor;
		let paddings = this.paddings;
		let paddingLeft = paddings.left;
		let paddingTop = paddings.top;
		let { titleFont, descriptionFont } = this;

		// this.artwork.y = this.y + this.paddings.top;

		/**
		 * Draw artwork;
		 */
		const image_ = this.artworkImage || this._stubImage;
		const artworkWidth = this.artworkHeight;
		// image_ &&
		// 	gr.DrawImage(
		// 		image_,
		// 		this.x + paddingLeft,
		// 		this.y + paddingTop,
		// 		artworkWidth,
		// 		artworkWidth,
		// 		0,
		// 		0,
		// 		image_.Width,
		// 		image_.Height
		// 	);

		const textX = this.x + paddingLeft + artworkWidth + scale(24);
		let textY_ = this.y + paddingTop;
		const textAreaWidth =
			this.width - paddingLeft - artworkWidth - scale(24) - paddingLeft;

		// Type,
		gr.DrawString(
			"PLAYLIST",
			descriptionFont,
			secondaryColor,
			textX,
			textY_,
			textAreaWidth,
			1.5 * descriptionFont.Height,
			StringFormat.LeftTopNoTrim
		);
		textY_ += 2 * descriptionFont.Height;

		// Title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		const titleText_ = this.titleText || "NO TITLE";
		const titleFullWidth_ = MeasureString(titleText_, titleFont).Width;
		if (titleFullWidth_ > textAreaWidth) {
			gr.DrawString(
				titleText_,
				titleFont,
				primaryColor,
				textX,
				textY_,
				textAreaWidth,
				2.5 * titleFont.Height,
				StringFormat(
					0,
					0,
					StringTrimming.EllipsisCharacter,
					StringFormatFlags.DisplayFormatControl
				)
			);
			textY_ += 1.1 * titleFont.Height * 2;
		} else {
			gr.DrawString(
				titleText_,
				titleFont,
				primaryColor,
				textX,
				textY_,
				textAreaWidth,
				2 * titleFont.Height,
				StringFormat.LeftTop
			);
			textY_ += 1.2 * titleFont.Height;
		}
		gr.SetTextRenderingHint(textRenderingHint);

		// Description;
		if (!isEmptyString(this.descriptionText)) {
			gr.DrawString(
				this.descriptionText,
				descriptionFont,
				secondaryColor,
				textX,
				textY_,
				textAreaWidth,
				2 * descriptionFont.Height,
				StringFormat.LeftTop
			);
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		try {
			showPlaylistHeaderMenu(this.playlistIndex, x, y);
		} catch (e) {}
	}
}

class PlaylistColumn {
	visible: boolean = true;
	x: number = 0;
	width: number = 0;

	primaryColor: number;
	private _paddingLeft = 0;
	private _paddingRight = 0;

	setPaddings(paddings: {
		left?: number;
		right?: number;
	}) {
		(paddings.left != null) && (this._paddingLeft = paddings.left);
		(paddings.right != null) && (this._paddingRight = paddings.right);
	}

	setVisible(visible: boolean) {
		this.visible = visible;
	}

	draw(gr: IGdiGraphics, text: string, font: IGdiFont, color: number, row: IBoxModel, sf: number = StringFormat.LeftCenter) {
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
	return (playlistIndex >= 0 && playlistIndex < plman.PlaylistCount);
}

interface IPaddings {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

export class PlaylistView extends ScrollView {
	items: PlaylistViewItem[] = [];
	itemsTotalHeight: number;
	visibleItems: PlaylistViewItem[] = [];
	_selectedIndexes: number[] = [];

	playlistIndex: number;
	playingItemIndex: number = -1;
	hoverIndex: number = -1;
	focusIndex: number = -1;

	paddings: IPaddings;

	scrollbar: Scrollbar;
	headerView: PlaylistHeaderView;

	playingIco: SerializableIcon;
	pauseIco: SerializableIcon;
	heartOnIco: SerializableIcon;
	heartOffIco: SerializableIcon;

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
			cursorColor: scrollbarColor.cursor,
			backgroundColor: 0,
		});
		this.addChild(this.scrollbar);
		this.scrollbar.z = 100;

		// headerView;
		this.headerView = new PlaylistHeaderView({
			primaryColor: mainColors.text,
			secondaryColor: mainColors.secondaryText,
		});
		this.addChild(this.headerView);
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);

		// Init paddings, by default, all properties are 0;
		// and will be changed in 'on_size';
		this.paddings = { top: 0, bottom: 0, left: 0, right: 0 };

		/**
		 * Create icons;
		 */

		this.playingIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.volume,
			size: scale(16),
		});

		this.pauseIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.volume_mute,
			size: scale(16),
		});

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

		/**
		 * Set getMoodId method;
		 */

		let heartIconHeight = MeasureString(this.heartOnIco.code, this.heartOnIco.iconFont).Height;
		let moodHotWidth = heartIconHeight + scale(4);

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

		// Set columns' height, though may needless. May or should be removed.
		// this._columnsMap.forEach(col => col.height = PlaylistProperties.rowHeight);
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

		for (let playlistItemIndex = 0; playlistItemIndex < playlistItemCount; playlistItemIndex++) {
			let rowItem = new PlaylistViewItem();
			rowItem.rowIndex = playlistItemIndex;
			rowItem.metadb = playlistMetadbs[playlistItemIndex];
			rowItem.playlistItemIndex = playlistItemIndex;
			rowItem.yOffset = itemYOffset;
			rowItem.height = rowHeight;
			rowItem.isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, playlistItemIndex);
			this._selectedIndexes.push(playlistItemIndex);

			playlistItems.push(rowItem);
			itemYOffset += rowHeight;
		}
		this.items = playlistItems;
		this.itemsTotalHeight = rowHeight * playlistItems.length + scale(32);
		this.totalHeight = this.itemsTotalHeight + this.headerView.height;

		this.setPlayingItem();
		plman.SetActivePlaylistContext();
		let focusdPlaylistItemIndex = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist);
		this.focusIndex = this.items.findIndex(
			(item) => item.playlistItemIndex === focusdPlaylistItemIndex
		);
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
		album.setVisible(false); // hide by default

		// ------------------
		// Set columns' size;
		// ------------------
		trackNumber.width = scale(60);
		time.width = scale(16) + MeasureString("00:00", PlaylistProperties.itemFont).Width;
		mood.width = scale(80);

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

	on_init() {
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
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

		this.scrollbar.setBoundary(
			this.x + this.width - scrollbarWidth,
			this.y,
			scrollbarWidth,
			this.height
		);

		const headerViewHeight = this.headerView.getProperHeight(this.width);
		this.headerView.setBoundary(this.x, this.y - this.scroll, this.width, headerViewHeight);

		this.totalHeight = this.itemsTotalHeight + headerViewHeight;
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
		let primaryColor = playlistColors.text;
		let secondaryColor = playlistColors.secondaryText;

		let cTrackNumber = _columnsMap.get("trackNumber");
		let cTitle = _columnsMap.get("title");
		let cArtist = _columnsMap.get("artist");
		let cAlbum = _columnsMap.get("album");
		let cMood = _columnsMap.get("mood");
		let cTime = _columnsMap.get("time");

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// Set header's position;
		this.headerView.setPosition(this.x, this.y - this.scroll);

		// Clear visibleItems cache;
		this.visibleItems.length = 0;

		// Draw Items;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let rowItem = items[itemIndex];
			rowItem.x = this.x + padLeft;
			rowItem.width = this.width - padLeft - padRight;
			rowItem.y = this.y + rowItem.yOffset - this.scroll + headerHeight;

			// Visible items;
			if (rowItem.y + rowHeight >= this.y && rowItem.y < this.y + this.height) {
				// Put visible item to visibleItems cache;
				this.visibleItems.push(rowItem);

				// Set rowItem's tags; lazy evaluation;
				rowItem.getTags();

				/* -----------------------------*
				 * Draw item background & state;
				 * -----------------------------*/

				if (rowItem.isSelect) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowHeight, RGB(42, 42, 42));
				}

				if (this.focusIndex === itemIndex) {
					gr.DrawRect(
						rowItem.x,
						rowItem.y,
						rowItem.width - 1,
						rowHeight - 1,
						scale(1),
						RGB(127, 127, 127)
					);
				}

				/* -------------*
				 * Draw columns;
				 * -------------*/

				// for debug;
				if (__DEV__) {
					gr.DrawString(
						rowItem.rowIndex,
						itemFont,
						secondaryColor,
						this.x,
						rowItem.y,
						this.width,
						rowItem.height,
						StringFormat.LeftCenter
					);
				}

				/**
				 * Draw tracknumber | playing icon;
				 */
				if (this.playingItemIndex === itemIndex) {
					(fb.IsPaused ? this.pauseIco : this.playingIco)
						.setSize(cTrackNumber.width, rowHeight)
						.draw(
							gr,
							colors.highlight,
							0,
							cTrackNumber.x + scale(8),
							rowItem.y,
							StringFormat.LeftCenter
						);
				} else {
					cTrackNumber.draw(gr, rowItem.trackNumber, itemFont, secondaryColor, rowItem);
				}

				/**
				 * Title;
				 */
				cTitle.draw(gr, rowItem.title, itemFont, primaryColor, rowItem);

				/**
				 * (Track )Artist;
				 */
				cArtist.visible && cArtist.draw(gr, rowItem.artist, itemFont, secondaryColor, rowItem);

				/**
				 * Album;
				 */
				cAlbum.visible && cAlbum.draw(gr, rowItem.album, itemFont, secondaryColor, rowItem);

				/**
				 * Time(PlaybackLength);
				 */
				cTime.draw(gr, rowItem.time, itemFont, secondaryColor, rowItem);

				/**
				 * Mood(if Rating == 5)
				 */
				if (rowItem.rating === 5) {
					this.heartOnIco
						.setSize(cMood.width, rowHeight)
						.draw(gr, colors.HEART_RED, 0, cMood.x, rowItem.y);
				} else {
					this.heartOffIco
						.setSize(cMood.width, rowHeight)
						.draw(gr, secondaryColor, 0, cMood.x, rowItem.y);
				}
			}
		}

		// draw drag insert position indication line;
		if (
			this.trace(mouseCursor.x, mouseCursor.y) &&
			mouseCursor.y >= this.y &&
			mouseCursor.y <= this.y + this.height
		) {
			if (dnd.isActive && dnd.dropTargetRowIndex > -1) {
				const lineY =
					this.y + this.headerView.height + dnd.dropTargetRowIndex * rowHeight - this.scroll;
				gr.DrawLine(
					this.x + padLeft,
					lineY,
					this.x + this.width - padRight,
					lineY,
					scale(2),
					RGB(127, 127, 127)
				);
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
				gr.DrawString(
					"Autoplaylist is empty?",
					emptyFont,
					textColor,
					textLeft,
					textY,
					this.width - 2 * padLeft,
					this.height,
					StringFormat.LeftTop
				);
			} else {
				gr.DrawString(
					"Playlist is empty?",
					emptyFont,
					textColor,
					textLeft,
					textY,
					this.width - 2 * padLeft,
					this.height,
					StringFormat.LeftTop
				);
			}
		}
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
			this.items[plIndex].isSelect = plman.IsPlaylistItemSelected(
				plman.ActivePlaylist,
				this.items[plIndex].playlistItemIndex
			);
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
		this.scroll = 0;
		this.setList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
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
			let targetScroll =
				this.headerView.height +
				this.playingItemIndex * PlaylistProperties.rowHeight -
				(this.height - PlaylistProperties.rowHeight) / 2;
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
		let hoverItem_ = this.visibleItems.find((item) => item.trace(x, y));
		return hoverItem_ ? hoverItem_.rowIndex : -1;
	}

	private _findHoverItem(x: number, y: number) {
		if (!this.trace(x, y)) {
			return null;
		}
		return this.visibleItems.find((item) => item.trace(x, y));
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
				plman.SetPlaylistSelectionSingle(
					plman.ActivePlaylist,
					hoverItem.playlistItemIndex,
					!hoverItem.isSelect
				);
				this._selectedIndexes = this.items
					.filter((item) => item.isSelect)
					.map((item) => item.playlistItemIndex);
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
				plman.SetPlaylistSelectionSingle(
					plman.ActivePlaylist,
					hoverItem.playlistItemIndex,
					!hoverItem.isSelect
				); // toggle;
				this._selectedIndexes = this.items
					.filter((item) => item.isSelect)
					.map((item) => item.playlistItemIndex);
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
		// if (x === mouseCursor.x && y === mouseCursor.y) {
		// 	return;
		// }

		let listTopY = this.y;
		let listBottomY = this.y + this.height;
		let rowHeight = PlaylistProperties.rowHeight;
		// const hoverItem = this._findHoverItem(x, y);

		if (this.clickedMoodId > -1) {
			return;
		}

		//
		if (selecting.isActive) {
			const updateSelection = (x: number, y: number) => {
				if (this.items.length === 0) {
					return;
				}
				//?
				// selecting.pageX2 = x;
				selecting.pageX2 =
					(x < this.x
						? this.x
						: x > this.x + this.width - this.scrollbar.width
						? this.x + this.width - this.scrollbar.width
						: x) - this.x;
				selecting.pageY2 =
					(y < listTopY ? listTopY : y > listBottomY - 1 ? listBottomY - 1 : y) -
					this.y +
					this.scroll;
				let first = -1;
				let last = -1;
				const padLeft = this.paddings.left;
				const padRight = this.paddings.right;
				const rowHeigt = PlaylistProperties.rowHeight;
				if (
					!(
						(selecting.pageX1 < padLeft && selecting.pageX2 < padLeft) ||
						(selecting.pageX1 > this.width - padRight && selecting.pageX2 > this.width - padRight)
					)
				) {
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
					// if (selecting.timerId == -1) {
					// selecting.timerId = window.SetInterval(
					() => {
						this.scrollTo(this.scroll - scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					},
					250,
					this
				);
				// }
			} else if (y > listBottomY) {
				selecting.setInterval(
					() => {
						this.scrollTo(this.scroll + scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					},
					250,
					this
				);
				// }
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
		plman.MovePlaylistSelection(
			plman.ActivePlaylist,
			-plman.PlaylistItemCount(plman.ActivePlaylist)
		);

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
			showTrackContextMenu(
				plman.ActivePlaylist,
				plman.GetPlaylistSelectedItems(plman.ActivePlaylist),
				x,
				y
			);
		} catch (e) {}
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

	on_key_up(vkey?: number) {}
}

export function showTrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
	// if (!metadbs || metadbs.Count === 0) return;
	let nullMetadbs = (!metadbs || metadbs.Count === 0);
	let hasMetadbs = !nullMetadbs;

	const isPlaylistLocked = plman.IsPlaylistLocked(playlistIndex);
	const rootMenu = window.CreatePopupMenu();

	// 
	if (hasMetadbs) {
		const addToMenu = window.CreatePopupMenu();
		addToMenu.AppendTo(rootMenu, MenuFlag.STRING, "Add to playlist");
		addToMenu.AppendMenuItem(MenuFlag.STRING, 2000, 'New playlist...');
		if (plman.PlaylistCount > 0) {
			addToMenu.AppendMenuSeparator();
		}
		for (let index = 0; index < plman.PlaylistCount; index++) {
			addToMenu.AppendMenuItem(
				(plman.IsPlaylistLocked(index) || index === playlistIndex) ? MenuFlag.GRAYED : MenuFlag.STRING,
				2001 + index,
				plman.GetPlaylistName(index)
			);
		}

		//
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 1, "Remove from playlist");
		rootMenu.AppendMenuSeparator();
	}

	//
	if (hasMetadbs) {
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 2, "Cut");
		rootMenu.AppendMenuItem(MenuFlag.STRING, 3, "Copy");
	}

	if (nullMetadbs) {
		// Undo & Redo menu;
	}

	if (fb.CheckClipboardContents()) {
		rootMenu.AppendMenuItem(isPlaylistLocked ? MenuFlag.GRAYED : MenuFlag.STRING, 4, "Paste");
	}

	if (hasMetadbs) {
		rootMenu.AppendMenuSeparator();
	}

	if (hasMetadbs) {
		const artistMenu = window.CreatePopupMenu();
		artistMenu.AppendTo(rootMenu, MenuFlag.GRAYED, "Go to artist");
		rootMenu.AppendMenuItem(MenuFlag.GRAYED, 20, "Go to album");
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
				plman.InsertPlaylistItems(
					plman.ActivePlaylist,
					plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist) + 1,
					fb.GetClipboardContents(window.ID),
					true);
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


function showPlaylistHeaderMenu(playlistIndex: number, x: number, y: number) {

}
