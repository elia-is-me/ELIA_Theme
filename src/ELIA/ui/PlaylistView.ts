//====================================
// Simple Playlist View
//====================================

import { scale, RGB, TextRenderingHint, StringFormat, deepClone, StringTrimming, StringFormatFlags, MeasureString, MenuFlag } from "../common/common";
import { IThemeColors, mainColors, scrollbarColor, scrollbarWidth } from "./Theme";
import { ThrottledRepaint, Repaint } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component, textRenderingHint } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { KeyCode } from "../common/keyCodes";
import { TextLine } from "../common/Text";
import { SerializableIcon } from "../common/IconType";

export const PL_Properties = {
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


enum ListHeaderType {
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

const createColumn = (visible: boolean, x: number, width: number) => {
	return { visible: visible, x: x, width: width }
}
const PL_Columns = {
	index: createColumn(false, 0, scale(150)),
	trackNo: createColumn(true, 0, scale(60)),
	title: createColumn(true, 0, 0),
	artist: createColumn(true, 0, 0),
	album: createColumn(false, 0, 0),
	trackLen: createColumn(true, 0, scale(16) + MeasureString("00:00", PL_Properties.itemFont).Width),
	mood: createColumn(true, 0, scale(96))
}



class Pl_Item {
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
	// title: string = "";
	// artist: string = "";
	// album: string = "";
	// playbackTime: string = "";
	// playbackLength: string = "";
	// tracknumber: string = "";
	rating: string = "";

	_tracknumber: TextLine;
	_title: TextLine;
	_artist: TextLine;
	_album: TextLine;
	_time: TextLine;
	heartOnIco: SerializableIcon;
	heartOffIco: SerializableIcon;

	isSelect: boolean = false;

	constructor() {
		this._tracknumber = new TextLine();
		this._title = new TextLine();
		this._artist = new TextLine();
		this._album = new TextLine();
		this._time = new TextLine();
	}

	trace(x: number, y: number) {
		return x > this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
	}

}

export function isEmptyString(str: string) {
	return !str || 0 === str.length;
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

	items: Pl_Item[] = [];
	itemsTotalHeight: number;
	visibleItems: Pl_Item[] = [];
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

	}


	initList() {
		/**
		 * Set playlist items;
		 */
		const playlistMetadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
		const playlistItems: Pl_Item[] = [];
		const playlistItemCount = plman.PlaylistItemCount(plman.ActivePlaylist);
		const rowHeight = PL_Properties.rowHeight;
		let itemYOffset = 0;
		let itemFont = PL_Properties.itemFont;
		let primaryColor = PL_Colors.text;
		let secondaryColor = PL_Colors.secondaryText;
		const { index, title, artist, album, trackLen } = PL_Columns;

		for (let playlistItemIndex = 0; playlistItemIndex < playlistItemCount; playlistItemIndex++) {

			let rowItem = new Pl_Item();
			rowItem.height = rowHeight;
			rowItem.index = playlistItemIndex;
			rowItem.metadb = playlistMetadbs[playlistItemIndex];
			rowItem.playlistItemIndex = playlistItemIndex;
			rowItem.yOffset = itemYOffset;
			rowItem.isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, playlistItemIndex);

			/**
			 * Set row contents colors & fonts;
			 */
			rowItem._title.font = itemFont;
			rowItem._title.color = primaryColor;
			rowItem._artist.font = itemFont;
			rowItem._artist.color = secondaryColor;
			rowItem._album.font = itemFont;
			rowItem._album.color = secondaryColor;
			rowItem._tracknumber.font = itemFont;
			rowItem._tracknumber.color = secondaryColor;
			rowItem._time.font = itemFont;
			rowItem._time.color = secondaryColor;

			rowItem._tracknumber.setSize(index.width, rowHeight)
			rowItem._title.setSize(title.width, rowHeight);
			rowItem._artist.setSize(artist.width, rowHeight);
			rowItem._album.setSize(album.width, rowHeight);
			rowItem._time.setSize(trackLen.width, rowHeight);

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

	setColumnSize() {
		const paddings = this.paddings;
		const padLeft = paddings.left;
		const padRight = this.scrollbar.width + paddings.right;
		const { index, trackNo, trackLen, mood, title, album, artist } = PL_Columns;

		let whitespace_ = this.width - padLeft - padRight;
		mood.visible && (whitespace_ -= mood.width);
		whitespace_ -= trackLen.width;
		whitespace_ -= trackNo.width;
		index.visible && (whitespace_ -= index.width);

		// init width;
		let titleWidth_ = scale(215);
		let artistWidth_ = scale(100);
		let albumWidth_ = scale(100);
		//
		let artistVis = (artist.visible && whitespace_ > titleWidth_);
		let albumVis = (album.visible
			&& whitespace_ > titleWidth_ + artistWidth_ + albumWidth_ / 2);
		let widthToAdd_ = whitespace_ - titleWidth_;
		let floor_ = Math.floor;
		//
		if (artistVis) {
			widthToAdd_ = floor_((whitespace_ - titleWidth_ - artistWidth_) / 2);
		}
		if (albumVis) {
			widthToAdd_ = floor_((whitespace_ - titleWidth_ - artistWidth_ - albumWidth_) / 3);
		}

		index.x = this.x + padLeft;
		index.width = (index.visible ? index.width : 0);
		trackNo.x = index.x + index.width;
		title.x = trackNo.x + trackNo.width;
		title.width = titleWidth_ + widthToAdd_;
		artist.x = title.x + title.width;
		artist.width = (artistVis ? artistWidth_ + widthToAdd_ : 0);
		album.x = artist.x + artist.width;
		album.width = (albumVis ? albumWidth_ + widthToAdd_ : 0);
		mood.x = album.x + album.width;
		trackLen.x = mood.x + mood.width;

	}

	on_init() {
		this.initList();
		this.headerView.setPlaylistIndex(plman.ActivePlaylist);

	}
	on_size() {
		this.paddings = this.getPaddingOnWidth_(this.width);

		this.setColumnSize();

		let items = this.items;
		let { index, title, artist, album, trackLen } = PL_Columns;
		let rowHeight = PL_Properties.rowHeight;

		for (let itemIndex = 0, len = items.length; itemIndex < len; itemIndex++) {

			let rowItem = items[itemIndex];

			/**
			 * Set row;
			 */
			rowItem.x = this.x;
			rowItem.width = this.width;

			/**
			 * Apply column size to column contents.
			 */
			rowItem._tracknumber.setSize(index.width, rowHeight)
			rowItem._title.setSize(title.width, rowHeight);
			rowItem._artist.setSize(artist.width, rowHeight);
			rowItem._album.setSize(album.width, rowHeight);
			rowItem._time.setSize(trackLen.width, rowHeight);

		}


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
		let columns = PL_Columns;

		// Draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		this.headerView.y = this.y - this.scroll;

		//
		this.visibleItems.length = 0;

		// Draw Items;
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let rowItem = items[itemIndex];
			rowItem.x = this.x;
			rowItem.width = this.width;
			rowItem.y = this.y + rowItem.yOffset - this.scroll + headerHeight;

			// Visible items;
			if (rowItem.y + rowHeight >= this.y && rowItem.y < this.y + this.height) {

				this.visibleItems.push(rowItem);

				/**
				 * Set each column text value; 
				 * 考虑到列表太长则在 initList 里一次性计算完太耗时间，放在这里由于一次最多显示个
				 * 几十行，计算消耗在可以接受的范围内。
				 */
				if (isEmptyString(rowItem._title.innerText)) {
					let infostrings = tf_TrackInfo.EvalWithMetadb(rowItem.metadb).split("^^");
					rowItem.rating = infostrings[4];
					rowItem._tracknumber.innerText = infostrings[0]
					rowItem._title.innerText = infostrings[2];
					rowItem._artist.innerText = infostrings[1];
					rowItem._time.innerText = infostrings[3];
					rowItem._album.innerText = infostrings[5];
				}

				/* ---------------------*
				 * Draw Item background;
				 * ---------------------*/

				if (rowItem.isSelect) {
					gr.FillSolidRect(this.x, rowItem.y, this.width, rowHeight, RGB(26, 26, 26));
				}

				if (this.focusIndex === itemIndex) {
					gr.DrawRect(this.x, rowItem.y, this.width - 1, rowHeight - 1, scale(1), RGB(127, 127, 127));
				}

				/* -------------*
				 * Draw columns;
				 * -------------*/

				// if (columns.index.visible && columns.index.width > 0) {
				// 	gr.DrawString(itemIndex, itemFont, colors.text,
				// 		columns.index.x, rowItem.y, columns.index.width, rowHeight, StringFormat.Center)
				// }

				/**
				 * Draw tracknumber | playing icon;
				 */
				if (this.playingItemIndex === itemIndex) {
					(fb.IsPaused ? this.pauseIco : this.playingIco)
						.setSize(columns.trackNo.width, rowHeight)
						.draw(gr, colors.highlight, 0, columns.trackNo.x + scale(4), rowItem.y, StringFormat.LeftCenter);
				} else {
					rowItem._tracknumber.draw(gr, columns.trackNo.x + scale(4), rowItem.y);
				}

				/**
				 * Title;
				 */
				rowItem._title.draw(gr, columns.title.x, rowItem.y);

				/**
				 * (Track )Artist;
				 */
				if (columns.artist.visible && columns.artist.width > 0) {
					rowItem._artist.draw(gr, columns.artist.x, rowItem.y);
				}

				/**
				 * Album;
				 */
				if (columns.album.visible && columns.album.width > 0) {
					rowItem._album.draw(gr, columns.album.x, rowItem.y);
				}

				/**
				 * Time(PlaybackLength);
				 */
				rowItem._time.draw(gr, columns.trackLen.x, rowItem.y, null, null, StringFormat.Center);

				/**
				 * Mood(if Rating == 5)
				 */
				if (rowItem.rating === "5") {
					this.heartOnIco
						.setSize(columns.mood.width, rowHeight)
						.draw(gr, colors.HEART_RED, 0, columns.mood.x, rowItem.y);
				} else {
					this.heartOffIco
						.setSize(columns.mood.width, rowHeight)
						.draw(gr, colors.text, 0, columns.mood.x, rowItem.y);
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

