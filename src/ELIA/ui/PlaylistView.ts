//====================================
// Simple Playlist View
//====================================

import { scale, RGB, TextRenderingHint, StringFormat, deepClone, StringTrimming, StringFormatFlags, MeasureString, MenuFlag, isEmptyString, StopReason } from "../common/common";
import { IThemeColors, mainColors, scrollbarColor, scrollbarWidth } from "./Theme";
import { ThrottledRepaint, Repaint } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, textRenderingHint, IBoxModel } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { KeyCode } from "../common/keyCodes";
import { SerializableIcon } from "../common/IconType";

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


const enum ListHeaderType {
	Album,
	Artist,
	Playlist
}

/**
 * Flow with list items;
 */
class PL_Header extends Component {
	type: ListHeaderType;
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
		type: ListHeaderType,
		titleText?: string;
		subtitleText?: string;
		discriptionText?: string;
		primaryColor: number;
		secondaryColor: number;
	}) {
		super({})
		this.type = options.type;
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
		switch (this.type) {
			case ListHeaderType.Playlist:
				this.typeText = "Playlist";
				this.titleText = plman.GetPlaylistName(this.playlistIndex)
				this.descriptionText = plman.PlaylistItemCount(this.playlistIndex)
					+ " items"
					+ " \u2022 "
					+ utils.FormatDuration(plman.GetPlaylistItems(this.playlistIndex).CalcTotalDuration());
				break;
			case ListHeaderType.Album:
				this.typeText = "Album";
				this.titleText = "";
				this.subtitleText = "";
				this.descriptionText = "";
				break;
			case ListHeaderType.Artist:
				this.typeText = "Artist";
				this.titleText = "";
				this.subtitleText = "";
				this.descriptionText = "";
				break;
			default:
				this.typeText = "UNKNOWN TYPE";
				this.titleText = "No Title";
				this.subtitleText = "";
				this.descriptionText = "";
				break;
		}
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
	}

	setPlaylistIndex(value: number): void {
		this.playlistIndex = value;
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
	index: number;
	playlistIndex: number;
	playlistItemIndex: number;
	rating: string = "";
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
	selectedIndexes: number[] = [];

	playlistIndex: number;
	playingItemIndex: number = -1;
	hoverIndex: number = -1;
	focusIndex: number = -1;

	paddings: IPaddings;

	scrollbar: Scrollbar;
	headerView: PL_Header;

	playingIco: SerializableIcon;
	pauseIco: SerializableIcon;
	heartOnIco: SerializableIcon;
	heartOffIco: SerializableIcon;

	_columnsMap: Map<string, PlaylistColumn> = new Map();

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
		this.headerView = new PL_Header({
			type: ListHeaderType.Playlist,
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


	initList() {
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
			rowItem.index = playlistItemIndex;
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

		plman.SetActivePlaylistContext();
	}

	initColumns() {

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
		this.initList();
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

		this.initColumns();

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
					rowItem.rating = rating;
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
				if (rowItem.rating === "5") {
					this.heartOnIco
						.setSize(cMood.width, rowHeight)
						.draw(gr, colors.HEART_RED, 0, cMood.x, rowItem.y);
				} else {
					this.heartOffIco
						.setSize(cMood.width, rowHeight)
						.draw(gr, colors.text, 0, cMood.x, rowItem.y);
				}

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
		this.initList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_added() {
		this.initList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_removed() {
		this.initList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playlist_items_reordered() {
		this.initList();
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
		ThrottledRepaint();
	}

	on_playlist_switch() {
		this.scroll = 0;
		this.initList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);
		ThrottledRepaint();
	}

	on_playback_stop(reason: number) {
		if (reason !== 2) {
			this.playingItemIndex = -1;
			ThrottledRepaint();
		}
	}

	on_playback_new_track() {
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

		ThrottledRepaint();
	}

	on_metadb_changed() {
		this.initList();
		ThrottledRepaint();
	}

	private _findHoverIndex(x: number, y: number) {
		if (!this.trace(x, y)) { return - 1; }
		let hoverItem_ = this.visibleItems.find(item => item.trace(x, y));
		return (hoverItem_ ? hoverItem_.index : -1);
	}

	private _setFocus(index: number) {
		if (this.items[index] == null) return;
		plman.SetPlaylistFocusItem(
			plman.ActivePlaylist,
			this.items[index].playlistItemIndex);
		this.focusIndex = index;
	}

	private _setSelection(from?: number, to?: number) {
		// Clear playlist selection;
		if (from == null) {
			plman.ClearPlaylistSelection(plman.ActivePlaylist);
			this.selectedIndexes = [];
		} else {
			// Set Selection from - to;
			if (to == null) to = from;
			let c = from;
			if (from > to) { from = to; to = c; }
			let indexes: number[] = [];

			for (let index = from; index <= to; index++) {
				this.items[index]
					&& indexes.push(this.items[index].playlistItemIndex);
			}

			if (indexes.toString() !== this.selectedIndexes.toString()) {
				this.selectedIndexes = indexes;
				plman.ClearPlaylistSelection(plman.ActivePlaylist);
				plman.SetPlaylistSelection(plman.ActivePlaylist, indexes, true);
			}
		}

		this.on_selection_changed();
	}

	private drag_is_active = false;
	private drag_timer = -1;
	private shift_start_index = -1;

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * PL_Properties.rowHeight * 3);
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		let hoverIndex_ = this._findHoverIndex(x, y);
		if (hoverIndex_ > -1) {
			plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, this.items[hoverIndex_].playlistItemIndex);
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		let hoverIndex_ = this._findHoverIndex(x, y);
		let hoverItem_ = this.items[hoverIndex_];
		let hoverItemSel_ = (
			hoverItem_ &&
			plman.IsPlaylistItemSelected(plman.ActivePlaylist, hoverItem_.playlistItemIndex));
		let holdCtrl_ = utils.IsKeyPressed(KeyCode.Ctrl);
		let holdShift_ = utils.IsKeyPressed(KeyCode.Shift);

		// Set focus;
		hoverItem_ && this._setFocus(hoverIndex_);

		// Set selection;
		if (hoverItem_ && !holdShift_) {
			this.shift_start_index = this.focusIndex;
		}

		// TODO: Reset selecting & dragging;
		if (hoverItem_ == null) {
			if (!holdCtrl_ && !holdShift_) {
				// TODO:Set selecting
				this.drag_is_active = true;
				this._setSelection();
			}
			this.shift_start_index = -1;
		} else {
			if (!holdShift_) {
				this.shift_start_index = this.focusIndex;
			}
			// set selecting;
			switch (true) {
				case holdCtrl_:
					plman.SetPlaylistSelectionSingle(
						plman.ActivePlaylist,
						hoverItem_.playlistItemIndex,
						!hoverItemSel_
					);
					this.on_selection_changed();
					break;
				case holdShift_:
					this._setSelection(
						// this.selection.SHIFT_startId,
						this.shift_start_index,
						hoverIndex_
					);
					break;
				default:
					if (hoverItemSel_) {
					} else {
						this._setSelection(hoverIndex_);
						this.drag_is_active = true;
					}
					break;
			}
		}
	}

	on_mouse_lbtn_up(x: number, y: number) {
		let hoverIndex_ = this._findHoverIndex(x, y);
		let hoverItem_ = this.items[hoverIndex_];
		let holdCtrl_ = utils.IsKeyPressed(KeyCode.Ctrl);
		let holdShift_ = utils.IsKeyPressed(KeyCode.Shift);

		if (this.drag_is_active) {
		} else {
			if (hoverItem_ && !holdCtrl_ && !holdShift_) {
				this._setSelection(hoverIndex_);
			}
		}

		clearTimeout(this.drag_timer);
		this.drag_is_active = false;
		Repaint();
	}

	on_mouse_rbtn_down(x: number, y: number) {
		let hoverIndex_ = this._findHoverIndex(x, y);
		let hoverItem_ = this.items[hoverIndex_];

		if (hoverItem_ == null) {
			this._setSelection();
		} else {
			if (!plman.IsPlaylistItemSelected(
				plman.ActivePlaylist,
				hoverItem_.playlistItemIndex)
			) {
				this._setSelection(hoverIndex_);
				this._setFocus(hoverIndex_);
			}
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		try {
			// Context Menu
			PL_TrackContextMenu(plman.ActivePlaylist,
				plman.GetPlaylistSelectedItems(plman.ActivePlaylist),
				x, y);
		} catch (e) { }
	}

}

export function PL_TrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
	if (!metadbs || metadbs.Count === 0) return;

	const isAutoPlaylist = plman.IsAutoPlaylist(playlistIndex);
	const menuRoot = window.CreatePopupMenu();

	//
	const menuAddTo = window.CreatePopupMenu();
	menuAddTo.AppendTo(menuRoot, MenuFlag.STRING, "Add to playlist");
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
	menuRoot.AppendMenuItem(isAutoPlaylist ? MenuFlag.GRAYED : MenuFlag.STRING, 1, "Remove from playlist");
	menuRoot.AppendMenuSeparator();

	// TODO: Navigate artist | album;

	// Context menu;
	const Context = fb.CreateContextMenuManager();
	const BaseID = 1000;
	Context.InitContext(metadbs);
	Context.BuildMenu(menuRoot, BaseID, -1);

	const ret = menuRoot.TrackPopupMenu(x, y);
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

