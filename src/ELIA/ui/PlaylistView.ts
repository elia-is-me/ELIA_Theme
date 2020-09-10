//====================================
// Simple Playlist View
//====================================

import { scale, RGB, TextRenderingHint, StringFormat, deepClone, StringTrimming, StringFormatFlags, MeasureString, MenuFlag, isEmptyString, CropImage, VKeyCode } from "../common/common";
import { IThemeColors, mainColors, scrollbarColor, scrollbarWidth } from "./Theme";
import { ThrottledRepaint, Repaint } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, textRenderingHint, IBoxModel } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { SerializableIcon } from "../common/IconType";
import { AlbumArtId } from "../common/AlbumArtView";
import { ButtonStates } from "../common/IconButton";

const __DEV__ = window.GetProperty("__DEV__", true);

const CMD_LOVE = 'Playback Statistics/Rating/5';
const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
const TF_RATING = fb.TitleFormat('%rating%');

const mouseCursor = {
	x: -1,
	y: -1
}

const selHolder = fb.AcquireUiSelectionHolder();
selHolder.SetPlaylistSelectionTracking();

class DragDropHelper {
	isActive: boolean = false;
	x: number = -1;
	y: number = -1;
	_targetId: number = -1;
	scrollTimerId: number = -1;

	get dropTargetRowIndex() {
		return this._targetId;
	}

	set dropTargetRowIndex(val: number) {
		this._targetId = val;
	}

	clearScrollTimer() {
		(this.scrollTimerId > -1) && window.ClearInterval(this.scrollTimerId);
		this.scrollTimerId = -1;
	}

	reset() {
		this.isActive = false;
		this.dropTargetRowIndex = -1;
		this.clearScrollTimer();
	}
}

let dnd = new DragDropHelper();

const selecting = {
	isActive: false,
	pageX1: -1, pageY1: -1,
	pageX2: -1, pageY2: -1,
	timerId: -1,
	clearScrollTimer() {
		(selecting.timerId > -1) && window.ClearInterval(selecting.timerId);
		selecting.timerId = -1;
	},
	reset() {
		selecting.isActive = false;
		selecting.clearScrollTimer();
	}
}

const PL_Properties = {
	rowHeight: scale(40),
	headerHeight: scale(24),
	tfTrackInfo: fb.TitleFormat("%tracknumber%^^[%artist%]^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]"),
	itemFont: gdi.Font("Microsoft YaHei", scale(14), 0),
	itemFont_2: gdi.Font("Microsoft YaHei", scale(12), 0),
	iconFont: gdi.Font("Material Icons", scale(16))
}

const PL_Colors: IThemeColors = {
	text: mainColors.text,
	secondaryText: mainColors.secondaryText,
	background: RGB(28, 28, 28),
	highlight: mainColors.highlight,
	HEART_RED: RGB(221, 0, 27)
}

/**
 * Flow with list items;
 */
class PlaylistHeaderView extends Component {

	typeText: string;
	titleText: string = "";
	parentOffsetY: number;
	subtitleText: string = "";
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
		super({})
		this.titleText = (options.titleText || "");
		this.subtitleText = (options.subtitleText || "");
		this.descriptionText = (options.discriptionText || "");
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
		g_.FillSolidRect(0, 0, stubImageWidth_, stubImageWidth_, 0x20FFFFFF & RGB(242, 242, 242));
		g_.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g_.DrawString("No Art", gdi.Font("Segoe UI", 102, 1), RGB(97, 97, 97), 0, 0, stubImageWidth_, stubImageWidth_, StringFormat.Center);
		g_.SetTextRenderingHint(TextRenderingHint.SystemDefault);
		this._stubImage.ReleaseGraphics(g_);

		this.minHeight = scale(240);
	}

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

	getProperHeight(paneWidth: number): number {
		/**
		 * Calculate text area min height;
		 */
		let descriptionFontHeight = this.descriptionFont.Height;
		let titleFontHeight = this.titleFont.Height;
		let subtitleFontHeight = this.subtitleFont.Height;
		let tempImg = gdi.CreateImage(1, 1);
		let tempGr = tempImg.GetGraphics();
		let paddings = this.getProperPaddings(paneWidth);
		let paddingTop = paddings.top;

		// Padding top;
		let totalHeight = paddingTop;

		let artworkHeight = this.getArtworkHeight_(paneWidth);
		let paddingBottom = paddings.bottom;
		let paddingLeft = paddings.left;
		let minHeight_ = artworkHeight + paddingTop + paddingBottom;
		let gap = scale(24);
		let textAreaWidth = paneWidth - 2 * paddingLeft - gap;
		let titleText = (isEmptyString(this.titleText) ? "NO TITLE" : this.titleText);
		let titleTextFullWidth = measureStringFreeWidth(tempGr, titleText, this.titleFont);

		// Title;
		if (titleTextFullWidth > textAreaWidth) {
			totalHeight += 1.1 * 2 * titleFontHeight;
		} else {
			totalHeight += 1.1 * titleFontHeight;
		}

		// Subtitle;
		totalHeight += 1.2 * subtitleFontHeight;

		// Description
		if (isEmptyString(this.descriptionText)) {
			totalHeight += 1.2 * descriptionFontHeight;
		}

		// Padding bottom;
		totalHeight += paddingBottom;

		// Release resource;
		tempImg.ReleaseGraphics(tempGr);

		return Math.max(minHeight_, totalHeight);
	}

	setTitles() {
		this.typeText = "Playlist";
		this.titleText = plman.GetPlaylistName(this.playlistIndex)
		this.descriptionText = plman.PlaylistItemCount(this.playlistIndex)
			+ " items"
			+ " \u2022 "
			+ utils.FormatDuration(plman.GetPlaylistItems(this.playlistIndex).CalcTotalDuration());
	}

	setType() {
	}

	private _playlistIndex: number;

	get playlistIndex() {
		return this._playlistIndex;
	}

	set playlistIndex(value: number) {
		this._playlistIndex = value;
		this.setTitles();
		this.setArtwork();
	}

	setPlaylistIndex(value: number): void {
		this.playlistIndex = value;
	}

	async setArtwork() {
		let playlistMetadbs = plman.GetPlaylistItems(this.playlistIndex);
		let artsworks: IGdiBitmap[] = [];
		let index = 0;
		let trackCount = Math.min(playlistMetadbs.Count, 50);
		let playlistIndex = this.playlistIndex;

		while (index < trackCount && artsworks.length < 1) {
			let result = await utils.GetAlbumArtAsyncV2(window.ID, playlistMetadbs[index], AlbumArtId.front);
			if (result.image == null) {
				result = await utils.GetAlbumArtAsyncV2(window.ID, playlistMetadbs[index], AlbumArtId.disc);
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
		this.artworkHeight = this.getArtworkHeight_(this.width);
		this.paddings = this.getProperPaddings(this.width);
	}

	on_paint(gr: IGdiGraphics) {
		let primaryColor = this.primaryColor;
		let secondaryColor = this.secondaryColor;
		let paddings = this.paddings;
		let paddingLeft = paddings.left;
		let paddingTop = paddings.top;
		let { titleFont, descriptionFont } = this;

		/**
		 * Draw artwork;
		 */
		const image_ = this.artworkImage || this._stubImage;
		const artworkWidth = this.artworkHeight;
		image_ && gr.DrawImage(image_, this.x + paddingLeft, this.y + paddingTop, artworkWidth, artworkWidth, 0, 0, image_.Width, image_.Height);

		const textX = this.x + paddingLeft + artworkWidth + scale(20);
		let textY_ = this.y + paddingTop;
		const textAreaWidth = this.width - paddingLeft - artworkWidth - scale(20) - paddingLeft;

		// Type,
		gr.DrawString(this.typeText, descriptionFont, secondaryColor, textX, textY_, textAreaWidth, 1.5 * descriptionFont.Height, StringFormat.LeftTopNoTrim)
		textY_ += 2 * descriptionFont.Height;

		// Title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		const titleText_ = (this.titleText || "NO TITLE");
		const titleFullWidth_ = measureStringFreeWidth(gr, titleText_, titleFont);
		if (titleFullWidth_ > textAreaWidth) {
			gr.DrawString(titleText_, titleFont, primaryColor, textX, textY_, textAreaWidth, 2.5 * titleFont.Height, StringFormat(0, 0, StringTrimming.EllipsisCharacter, StringFormatFlags.DisplayFormatControl));
			textY_ += 1.1 * titleFont.Height * 2;
		} else {
			gr.DrawString(titleText_, titleFont, primaryColor, textX, textY_, textAreaWidth, 2 * titleFont.Height, StringFormat.LeftTop);
			textY_ += 1.2 * titleFont.Height;
		}
		gr.SetTextRenderingHint(textRenderingHint);

		// Description;
		if (!isEmptyString(this.descriptionText)) {
			gr.DrawString(this.descriptionText, descriptionFont, secondaryColor, textX, textY_, textAreaWidth, 2 * descriptionFont.Height, StringFormat.LeftTop);
			textY_ += 1.3 * descriptionFont.Height;
		}

		// Subtitle;
		// ...
	}

}

function measureStringFreeWidth(gr: IGdiGraphics, text: string | number, font: IGdiFont): number {
	return gr.MeasureString(text, font, 0, 0, 9999, 999, StringFormat(0, 0, StringTrimming.None, StringFormatFlags.NoWrap)).Width;
}

class PlaylistColumn implements IBoxModel {
	visible: boolean = true;
	x: number = 0;
	y: number = 0;
	width: number = 0;
	height: number = 0;

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

	setSize(width: number, height: number) {
		this.width = width;
		this.height = height;
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

	constructor(attrs: object) {
		super(attrs);

		//
		this.scrollbar = new Scrollbar({
			cursorColor: scrollbarColor.cursor,
			backgroundColor: 0,
		});
		this.addChild(this.scrollbar);
		this.scrollbar.z = 100;
		//
		this.headerView = new PlaylistHeaderView({
			primaryColor: mainColors.text,
			secondaryColor: mainColors.secondaryText
		});
		this.addChild(this.headerView);

		// init padding values to 0;
		this.paddings = { top: 0, bottom: 0, left: 0, right: 0 };

		this.playingIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.volume,
			size: scale(16)
		});

		this.pauseIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.volume_mute,
			size: scale(16)
		});

		this.heartOnIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.heart,
			size: scale(16)
		});

		this.heartOffIco = new SerializableIcon({
			name: MaterialFont,
			code: Material.heart_empty,
			size: scale(16)
		});

		this._columnsMap.set("trackNumber", new PlaylistColumn());
		this._columnsMap.set("title", new PlaylistColumn());
		this._columnsMap.set("artist", new PlaylistColumn());
		this._columnsMap.set("album", new PlaylistColumn());
		this._columnsMap.set("mood", new PlaylistColumn());
		this._columnsMap.set("time", new PlaylistColumn());

		this._columnsMap.forEach(col => col.height = PL_Properties.rowHeight);

	}

	setList() {
		/**
		 * Set playlist items;
		 */

		const playlistMetadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
		const playlistItems: PlaylistViewItem[] = [];
		const playlistItemCount = plman.PlaylistItemCount(plman.ActivePlaylist);
		const rowHeight = PL_Properties.rowHeight;
		let itemYOffset = 0;

		for (let playlistItemIndex = 0; playlistItemIndex < playlistItemCount; playlistItemIndex++) {

			let rowItem = new PlaylistViewItem();
			rowItem.rowIndex = playlistItemIndex;
			rowItem.metadb = playlistMetadbs[playlistItemIndex];
			rowItem.playlistItemIndex = playlistItemIndex;
			rowItem.yOffset = itemYOffset;
			rowItem.height = rowHeight;
			rowItem.isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, playlistItemIndex);

			playlistItems.push(rowItem);
			itemYOffset += rowHeight;
		}
		this.items = playlistItems;
		this.itemsTotalHeight = rowHeight * playlistItems.length + scale(32);
		this.totalHeight = this.itemsTotalHeight + this.headerView.height;

		this.setPlayingItem();
		plman.SetActivePlaylistContext();
		let focusdPlaylistItemIndex = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist);
		this.focusIndex = this.items.findIndex(item => item.playlistItemIndex === focusdPlaylistItemIndex);
	}

	protected setPlayingItem() {
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
		time.width = scale(16) + MeasureString("00:00", PL_Properties.itemFont).Width;
		mood.width = scale(80);

		let whitespace = this.width - padLeft - padRight;
		mood.visible && (whitespace -= mood.width);
		whitespace -= time.width;
		whitespace -= trackNumber.width;

		let titleWidth_ = scale(215);
		let artistWidth_ = scale(100);
		let albumWidth_ = scale(100);

		let artistVis = (artist.visible && whitespace > titleWidth_);
		let albumVis = (album.visible
			&& whitespace > titleWidth_ + artistWidth_ + albumWidth_ / 2);
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
		artist.width = (artistVis ? artistWidth_ + widthToAdd_ : 0);

		album.x = artist.x + artist.width;
		album.width = (albumVis ? albumWidth_ + widthToAdd_ : 0);

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
			this.height);

		const headerViewHeight = this.headerView.getProperHeight(this.width);
		this.headerView.setBoundary(this.x, this.y - this.scroll, this.width, headerViewHeight);

		this.totalHeight = this.itemsTotalHeight + headerViewHeight;
	}

	on_paint(gr: IGdiGraphics) {

		let rowHeight = PL_Properties.rowHeight;
		let headerHeight = this.headerView.height;
		let tf_TrackInfo = PL_Properties.tfTrackInfo;
		let items = this.items;
		let colors = PL_Colors;;
		let paddings = this.paddings;
		let padLeft = paddings.left;
		let padRight = paddings.right;
		let _columnsMap = this._columnsMap;
		let itemFont = PL_Properties.itemFont;
		let primaryColor = PL_Colors.text;
		let secondaryColor = PL_Colors.secondaryText;

		let cTrackNumber = _columnsMap.get("trackNumber");
		let cTitle = _columnsMap.get("title");
		let cArtist = _columnsMap.get("artist");
		let cAlbum = _columnsMap.get("album");
		let cMood = _columnsMap.get("mood");
		let cTime = _columnsMap.get("time");

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// Set header's position;
		this.headerView.y = this.y - this.scroll;

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
				if (isEmptyString(rowItem.title)) {
					let infostrings = tf_TrackInfo.EvalWithMetadb(rowItem.metadb).split("^^");
					let rating = infostrings[4];
					let tracknumber = infostrings[0];
					let title = infostrings[2];
					let artist = infostrings[1];
					let time = infostrings[3];
					let album = infostrings[5];

					rowItem.trackNumber = tracknumber;
					rowItem.title = title;
					rowItem.artist = artist;
					rowItem.album = album;
					rowItem.rating = Number(rating);
					rowItem.time = time;
				}

				/* -----------------------------*
				 * Draw item background & state;
				 * -----------------------------*/

				if (rowItem.isSelect) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowHeight, RGB(42, 42, 42));
				}

				if (this.focusIndex === itemIndex) {
					gr.DrawRect(rowItem.x, rowItem.y, rowItem.width - 1, rowHeight - 1, scale(1), RGB(127, 127, 127));
				}

				/* -------------*
				 * Draw columns;
				 * -------------*/

				// for debug;
				if (__DEV__) {
					gr.DrawString(rowItem.rowIndex, itemFont, secondaryColor,
						this.x, rowItem.y, this.width, rowItem.height, StringFormat.LeftCenter);
				}

				/**
				 * Draw tracknumber | playing icon;
				 */
				if (this.playingItemIndex === itemIndex) {
					(fb.IsPaused ? this.pauseIco : this.playingIco)
						.setSize(cTrackNumber.width, rowHeight)
						.draw(gr, colors.highlight, 0, cTrackNumber.x + scale(8), rowItem.y, StringFormat.LeftCenter);
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
			this.trace(mouseCursor.x, mouseCursor.y)
			&& mouseCursor.y >= this.y
			&& mouseCursor.y <= this.y + this.height
		) {
			if (dnd.isActive && dnd.dropTargetRowIndex > -1) {
				const lineY = this.y + this.headerView.height + dnd.dropTargetRowIndex * rowHeight - this.scroll;
				gr.DrawLine(this.x + padLeft, lineY, this.x + this.width - padRight, lineY, scale(2), RGB(127, 127, 127));
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
				this.items[plIndex].playlistItemIndex);
		}
		ThrottledRepaint();
	}

	on_item_focus_change(playlistIndex: number) {
		if (playlistIndex !== plman.ActivePlaylist) {
			return;
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

	protected showNowPlaying() {
		if (this.playingItemIndex === -1) {
			return;
		}

		let listTopY = this.headerView.y + this.headerView.height;
		if (listTopY < this.y) {
			listTopY = this.y;
		}
		let listBottomY = this.y + this.height;
		let playingItem = this.items[this.playingItemIndex];
		let rowHeight = PL_Properties.rowHeight;
		let playingItemVis = (playingItem.y >= listTopY && playingItem.y + rowHeight < listBottomY);

		if (!playingItemVis) {
			let targetScroll = this.headerView.height + this.playingItemIndex * PL_Properties.rowHeight - (this.height - PL_Properties.rowHeight) / 2;
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
		if (!this.trace(x, y)) { return - 1; }
		let hoverItem_ = this.visibleItems.find(item => item.trace(x, y));
		return (hoverItem_ ? hoverItem_.rowIndex : -1);
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
		plman.SetPlaylistFocusItem(
			plman.ActivePlaylist,
			this.items[index].playlistItemIndex);
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
			if (to == null) {
				to = from;
			}
		}

		let indexes: number[] = [];
		let c = from;

		if (from > to) {
			from = to; to = c;
		}

		for (let index = from; index <= to; index++) {
			this.items[index]
				&& indexes.push(this.items[index].playlistItemIndex);
		}

		if (indexes.toString() !== this._selectedIndexes.toString()) {
			this._selectedIndexes = indexes;
			plman.ClearPlaylistSelection(plman.ActivePlaylist);
			plman.SetPlaylistSelection(plman.ActivePlaylist, indexes, true);
		}

	}

	private multiSelectionStartId = -1;

	/**
	 * Check if mouse cursor is over mood icon;
	 */
	protected isHoverMood(x: number, y: number): boolean {
		let cMood = this._columnsMap.get("mood");
		let listTopY = this.headerView.y + this.headerView.height;
		if (listTopY < this.y) {
			listTopY = this.y;
		}
		return (y > listTopY && y <= this.y + this.height
			&& x > cMood.x && x <= cMood.x + cMood.width)
	}

	protected dragMood_rowIndex: number = -1;

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * PL_Properties.rowHeight * 3);
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		let hoverRowItem = this._findHoverItem(x, y);
		if (this.isHoverMood(x, y)) {
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
			if (!utils.IsKeyPressed(VKeyCode.Control)) {
				/** DO NOTHING */
			} else if (!utils.IsKeyPressed(VKeyCode.Shift)) {
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
					hoverItem.playlistItemIndex, !hoverItem.isSelect);

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
				this._selectedIndexes = [hoverItem.playlistItemIndex];
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
		// const hoverItem = this._findHoverItem(x, y);

		//
		if (selecting.isActive) {

			const updateSelection = (x: number, y: number) => {
				if (this.items.length === 0) {
					return;
				}
				//?
				// selecting.pageX2 = x;
				selecting.pageX2 = (x < this.x ? this.x : x > this.x + this.width - this.scrollbar.width ? this.x + this.width - this.scrollbar.width : x) - this.x;
				selecting.pageY2 = (y < listTopY ? listTopY : y > listBottomY - 1 ? listBottomY - 1 : y) - this.y + this.scroll;
				let first = -1;
				let last = -1;
				const padLeft = this.paddings.left;
				const padRight = this.paddings.right;
				const rowHeigt = PL_Properties.rowHeight;
				if (!(
					(selecting.pageX1 < padLeft && selecting.pageX2 < padLeft)
					|| (selecting.pageX1 > this.width - padRight && selecting.pageX2 > this.width - padRight))
				) {
					let topOffset = this.headerView.height;
					first = Math.floor((selecting.pageY1 - topOffset) / rowHeigt);
					last = Math.floor((selecting.pageY2 - topOffset) / rowHeigt);
				}
				this.setSelection(first, last);
			}

			updateSelection(x, y);

			/**
			 * TODO: interval 设置太短的话滚动有问题。
			 */
			if (y < listTopY) {
				if (selecting.timerId == -1) {
					selecting.timerId = window.SetInterval(() => {
						this.scrollTo(this.scroll - scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					}, 250);
				}
			} else if (y > listBottomY) {
				if (selecting.timerId == -1) {
					selecting.timerId = window.SetInterval(() => {
						this.scrollTo(this.scroll + scale(52));
						updateSelection(mouseCursor.x, mouseCursor.y);
					}, 250);
				}
			} else {
				selecting.clearScrollTimer();
			}
		} else if (dnd.isActive) {

			// set mouse cursor;

			if (y < listTopY) {
				if (!dnd.isActive) {
					dnd.scrollTimerId = window.SetInterval(() => {
						this.scrollTo(this.scroll - scale(22));
						if (this.visibleItems[0] != null) {
							dnd.dropTargetRowIndex = this.visibleItems[0].playlistItemIndex;
						}
					}, 100);
				}
			} else if (y > listBottomY) {
				if (!dnd.scrollTimerId) {
					dnd.scrollTimerId = window.SetInterval(() => {
						this.scrollTo(this.scroll + scale(22));
						if (this.visibleItems.length > 0) {
							dnd.dropTargetRowIndex = this.visibleItems[this.visibleItems.length - 1].playlistItemIndex;
						}
					}, 100);
				}
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
					} else { /** NO ELSE */ }

				}

				if (dnd.dropTargetRowIndex === -1 && this.trace(x, y)) {
					if (this.visibleItems.length > 0) {
						if (y < this.visibleItems[0].y) {
							dnd.dropTargetRowIndex = this.visibleItems[0].playlistItemIndex;
						} else if (y > this.visibleItems[this.visibleItems.length - 1].y + this.visibleItems[this.visibleItems.length - 1].height) {
							dnd.dropTargetRowIndex = this.visibleItems[this.visibleItems.length - 1].playlistItemIndex;
						}
					}
				}

				dnd.clearScrollTimer();
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
		plman.MovePlaylistSelection(
			plman.ActivePlaylist,
			-plman.PlaylistItemCount(plman.ActivePlaylist));

		// then move them to the proper position;
		plman.MovePlaylistSelection(plman.ActivePlaylist, position);
	}

	on_mouse_lbtn_up(x: number, y: number) {

		const hoverItem = this._findHoverItem(x, y);

		if (dnd.isActive) {
			if (this.trace(x, y) && y >= this.y && y <= this.y + this.height) {
				this.dragInsert(this._getDragInsertPosition());
			}
		}
		else if (selecting.isActive) {
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
		selecting.clearScrollTimer();
		selecting.isActive = false;
		selecting.pageX1 = selecting.pageX2 = -1;
		selecting.pageY1 = selecting.pageY2 = -1;

		// clear drag'n drop state;
		this.clickOnSelection = false;
		dnd.clearScrollTimer();
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
			if (!plman.IsPlaylistItemSelected(
				plman.ActivePlaylist,
				hoverItem_.playlistItemIndex)
			) {
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
				x, y);
		} catch (e) { }
	}

	on_focus (isFocused: boolean) {
		if (isFocused) {
			plman.SetActivePlaylistContext();
			selHolder.SetPlaylistSelectionTracking();
		}
	}

}

export function showTrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
	if (!metadbs || metadbs.Count === 0) return;

	const isAutoPlaylist = plman.IsAutoPlaylist(playlistIndex);
	const rootMenu = window.CreatePopupMenu();

	//
	const menuAddTo = window.CreatePopupMenu();
	menuAddTo.AppendTo(rootMenu, MenuFlag.STRING, "Add to playlist");
	menuAddTo.AppendMenuItem(MenuFlag.STRING, 2000, 'New playlist...');
	if (plman.PlaylistCount > 0) {
		menuAddTo.AppendMenuSeparator();
	}
	for (let index = 0; index < plman.PlaylistCount; index++) {
		menuAddTo.AppendMenuItem(
			(plman.IsAutoPlaylist(index) || index === playlistIndex) ? MenuFlag.GRAYED : MenuFlag.STRING,
			2001 + index, plman.GetPlaylistName(index));
	}

	//
	rootMenu.AppendMenuItem(isAutoPlaylist ? MenuFlag.GRAYED : MenuFlag.STRING, 1, "Remove from playlist");
	rootMenu.AppendMenuSeparator();

	// TODO: Navigate artist | album;

	// Context menu;
	const Context = fb.CreateContextMenuManager();
	const BaseID = 1000;
	Context.InitContext(metadbs);
	Context.BuildMenu(rootMenu, BaseID, -1);

	const ret = rootMenu.TrackPopupMenu(x, y);
	let targetId: number;

	switch (true) {
		// "Remove from playlist"
		case ret === 1:
			plman.RemovePlaylistSelection(plman.ActivePlaylist, false);
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

