import { RGB, scale, TextRenderingHint, StopReason, VKeyCode, clamp, KMask, } from "../common/common";
import { StringFormat, MeasureString, spaceStart, spaceStartEnd } from "../common/String";
import { Component } from "../common/BasePart";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { MaterialFont, Material } from "../common/Icon";
import { ToggleMood } from "./PlaybackControlView";
import { notifyOthers, ui } from "../common/UserInterface";
import { themeColors, GdiFont, scrollbarWidth } from "./Theme";
import { lang } from "./Lang";
import { IconButton } from "./Buttons";
import { formatPlaylistDuration, showTrackContextMenu } from "./PlaylistView";

const ui_textRender = ui.textRender;

const pageColors = {
	text: themeColors.text,
	titleText: themeColors.titleText,
	secondaryText: themeColors.secondaryText,
	background: themeColors.playlistBackground,
	backgroundSelection: themeColors.playlistBackgroundSelection,
	splitLine: themeColors.playlistSplitLine,
	highlight: themeColors.highlight,
	scrollbarCursor: themeColors.scrollbarCursor,
	scrollbarBackground: themeColors.scrollbarBackground,
	moodRed: themeColors.mood,
};

const buttonColors = {
	onPrimary: themeColors.onPrimary,
	primary: themeColors.primary,
	secondary: themeColors.secondary,
	onSecondary: themeColors.onSecondary,
};

const iconFont = GdiFont(MaterialFont, scale(18));
const smallIconFont = GdiFont(MaterialFont, scale(16));
const itemFont = GdiFont("normal, 14");
const desciptionFont = itemFont;
const semiItemFont = GdiFont("semibold, 14");
const smallItemFont = GdiFont("normal,13");
const titleFont = GdiFont("bold, 24");

const titleLineHeight = titleFont.Height * 1.2 >> 0;
const descriptionHeight = desciptionFont.Height * 1.1 >> 0;

const rowHeight = scale(52);
const durationWidth = scale(16) + MeasureString("00:00:00", itemFont).Width;
const addtimeWidth = scale(16) + MeasureString("0000-00-00", itemFont).Width;
let paddingLR = 0;
let paddingTB = 0;
let headerHeight: number = 0;

const listheaderHeight = scale(40);

const pageWidth = {
	thin: scale(600),
	wide: scale(920),
	extraWide: scale(1120)
};

const TF_TRACK_INFO = fb.TitleFormat([
	"%tracknumber%", //0
	"[%artist%]",//1
	"%title%",//2
	"%length%",//3
	"%rating%",//4
	"[%album%]",//5
	"[%artist%]",//6
	"$date(%added%)",//7
].join("^^"));

class SearchHeaderView extends Component {
	titleText: string = "";
	desciptionText: string = "";
	metadbs: IFbMetadbList;

	constructor() {
		super({});
	}

	updateTitle(titleText: string, metadbs: IFbMetadbList) {
		this.titleText = titleText;
		this.metadbs = metadbs;
		if (this.metadbs != null) {
			this.desciptionText = this.metadbs.Count
				+ spaceStart(lang("tracks"))
				+ spaceStartEnd("\u2022")
				+ formatPlaylistDuration(this.metadbs.CalcTotalDuration());
		}
	}

	on_paint(gr: IGdiGraphics) {
		let textY = this.y + paddingTB;
		let textX = this.x + paddingLR + scale(8);
		let textW = this.width - 2 * paddingLR - scale(8);

		// title;
		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(`${lang("Search:")} ${this.titleText}`, titleFont, pageColors.titleText,
			textX, textY, textW, titleLineHeight, StringFormat.LeftTop);
		gr.SetTextRenderingHint(ui_textRender);

		textY += titleLineHeight;

		// description text;
		gr.DrawString(this.desciptionText, desciptionFont, pageColors.secondaryText,
			textX, textY, textW, descriptionHeight, StringFormat.LeftTop);

	}
}

class PlaylistColumn {
	visible: boolean = true;
	x: number = 0;
	width: number = 0;
	// primaryColor: number;
	// private _paddingLeft = 0;
	// private _paddingRight = 0;
}


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

class PlaylistViewItem extends Component {
	type: number = 0;
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
	addedTime: string;

	// state
	isSelect: boolean = false;

	constructor() {
		super({});
	}

	getTags() {
		if (!this.metadb) return;
		if (this.title) return;

		let infoArray = TF_TRACK_INFO.EvalWithMetadb(this.metadb).split("^^");
		this.title = infoArray[2];
		this.trackNumber = infoArray[0];
		this.artist = infoArray[1];
		this.album = infoArray[5];
		this.time = infoArray[3];
		this.rating = Number(infoArray[4]);
		this.addedTime = infoArray[7];
	}
}


export class SearchResultView extends ScrollView {

	titleText: string = "";
	metadbs: IFbMetadbList;
	items: PlaylistViewItem[] = [];
	private visibleItems: PlaylistViewItem[] = [];
	private itemsTotalHeight: number;
	private _selectedIndexes: number[] = [];

	private hoverIndex: number = -1;
	private focusIndex: number = -1;
	private playingIndex: number = -1;
	private selectedIndexes: number[] = [];
	private clickedMoodId: number = -1;
	private multiSelStartId: number = -1;
	private clickSel: boolean = false;

	scrollbar: Scrollbar;
	headerView: SearchHeaderView;
	closeBtn: IconButton;

	_columnsMap: Map<string, PlaylistColumn> = new Map();

	constructor() {
		super({});

		this.scrollbar = new Scrollbar({
			cursorColor: pageColors.scrollbarCursor,
			backgroundColor: pageColors.scrollbarBackground,
		});
		this.scrollbar.z = 10;

		this.headerView = new SearchHeaderView();
		this.headerView.z = 1;

		this.closeBtn = new IconButton({
			icon: Material.close,
			fontName: MaterialFont,
			fontSize: scale(28),
			colors: [buttonColors.secondary],
		})
		this.closeBtn.setSize(scale(48), scale(48));
		this.closeBtn.z = 10;
		this.closeBtn.on_click = () => {
			notifyOthers("Show.Playlist")
		};

		;[this.scrollbar, this.headerView, this.closeBtn]
			.forEach(child => this.addChild(child));

		let moodWidth = rowHeight;

		this.getActiveMoodId = (x: number, y: number): number => {
			let moodColumn = this._columnsMap.get("mood");
			if (!moodColumn || !moodColumn.visible || moodColumn.width == 0) {
				return -1;
			}
			let pad = (moodColumn.width - moodWidth) / 2;
			let posLeft = moodColumn.x + pad;
			let posRight = moodColumn.x + pad + moodWidth;
			if (x > posLeft && x <= posRight) {
				let hoverItem = this.findHoverItem(x, y);
				return hoverItem ? hoverItem.rowIndex : -1;
			} else {
				return -1;
			}
		};

		this._columnsMap.set("trackNumber", new PlaylistColumn());
		this._columnsMap.set("title", new PlaylistColumn());
		this._columnsMap.set("artist", new PlaylistColumn());
		this._columnsMap.set("album", new PlaylistColumn());
		this._columnsMap.set("mood", new PlaylistColumn());
		this._columnsMap.set("time", new PlaylistColumn());

	}

	updateList(titleText: string, metadbs: IFbMetadbList) {

		// update properties;
		// ----
		this.titleText = titleText;
		this.metadbs = metadbs;

		// update header;
		// ----
		this.headerView.updateTitle(this.titleText, this.metadbs);

		// init list;
		// ----
		let resultItems: PlaylistViewItem[] = [];
		let resultCount = metadbs.Count;
		let itemYOffset = 0;
		this._selectedIndexes = [];

		// set items;
		// ----
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
		this.totalHeight = this.itemsTotalHeight + headerHeight + listheaderHeight;
	}

	setColumns() {

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
		album.visible = false;

		// ------------------
		// Set columns' size;
		// ------------------

		// calc tracknumber width;
		if (this.items.length < 100) {
			trackNumber.width = MeasureString("00", itemFont).Width + scale(16);
		} else if (this.items.length < 1000) {
			trackNumber.width = MeasureString("000", itemFont).Width + scale(16);
		} else {
			let d = ("" + this.items.length).length - 1;
			trackNumber.width = MeasureString("0".repeat(d), itemFont).Width + scale(16);
		}

		time.width = durationWidth;
		mood.width = scale(48);

		let whitespace = this.width - 2 * paddingLR;
		mood.visible && (whitespace -= mood.width);
		whitespace -= time.width + scale(8);
		whitespace -= trackNumber.width;

		let titleWidth_ = scale(215);
		let artistWidth_ = scale(100);
		let albumWidth_ = addtimeWidth;//scale(60);

		let artistVis = artist.visible && this.width > pageWidth.thin;//whitespace > titleWidth_;
		let albumVis = album.visible && whitespace > titleWidth_ + artistWidth_;
		let widthToAdd_ = whitespace - titleWidth_;
		let floor = Math.floor;
		if (albumVis) {
			whitespace -= albumWidth_ - scale(8);
		}

		if (artistVis) {
			widthToAdd_ = floor((whitespace - titleWidth_ - artistWidth_) / 2);
		}

		trackNumber.x = this.x + paddingLR;
		mood.x = trackNumber.x + trackNumber.width;

		title.x = mood.x + mood.width;
		title.width = titleWidth_ + widthToAdd_ - scale(8);

		artist.x = title.x + title.width + scale(8);
		artist.width = artistVis ? artistWidth_ + widthToAdd_ - scale(8) : 0;

		album.x = artist.x + artist.width + scale(8);
		album.width = albumVis ? albumWidth_ : 0;

		time.x = album.x + album.width;
	}

	on_size() {

		if (this.width < pageWidth.thin) {
			paddingLR = scale(16);
		} else if (this.width < pageWidth.wide) {
			paddingLR = scale(24);
		} else {
			paddingLR = scale(40);
		}
		paddingTB = scale(40);
		headerHeight = 2 * paddingTB + titleLineHeight + descriptionHeight

		this.setColumns();

		this.scrollbar.setBoundary(
			this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);

		this.headerView.setBoundary(this.x, this.y, this.width, headerHeight);
		this.closeBtn.setPosition(this.x + this.width - scale(64), this.y + scale(16) - this.scroll);

		// Re-calc totalHeight;
		this.itemsTotalHeight = rowHeight * this.items.length + rowHeight;
		this.totalHeight = this.itemsTotalHeight + this.headerView.height;
	}

	on_paint(gr: IGdiGraphics) {
		let backgroundColor = pageColors.background;
		let backgroundSelectionColor = pageColors.backgroundSelection;
		let secondaryTextColor = pageColors.secondaryText;
		let highlightColor = pageColors.highlight;
		let moodColor = pageColors.moodRed;
		let textColor = pageColors.text;

		let right = paddingLR;
		let left = paddingLR;

		let _columnsMap = this._columnsMap;
		let tracknumber = _columnsMap.get("trackNumber");
		let title = _columnsMap.get("title");
		let artist = _columnsMap.get("artist");
		let album = _columnsMap.get("album");
		let mood = _columnsMap.get("mood");
		let duration = _columnsMap.get("time");

		let isfocuspart = ui.isFocusPart(this);

		// headerView;
		this.headerView.setPosition(null, this.y - this.scroll);

		// closeBtn;
		this.closeBtn.setPosition(null, this.y + scale(16) - this.scroll);

		// background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, backgroundColor);

		// Clear visibleItems;
		this.visibleItems = [];
		let offsetTop = headerHeight + listheaderHeight;
		let rowX = this.x + left;
		let rowWidth = this.width - left - right;

		// draw list header;
		let listHeaderY = this.y + headerHeight - this.scroll;
		let lineY = listHeaderY + listheaderHeight - 1;
		gr.DrawLine(rowX, lineY, rowX + rowWidth, lineY, 1, pageColors.splitLine);

		// index
		gr.DrawString("#", semiItemFont, secondaryTextColor,
			tracknumber.x, listHeaderY, tracknumber.width, listheaderHeight, StringFormat.Center);
		// title/ artist;
		gr.DrawString(lang("TITLE"), semiItemFont, secondaryTextColor,
			title.x, listHeaderY, title.width, listheaderHeight, StringFormat.LeftCenter);

		// album;
		if (artist.visible && artist.width > 0) {
			gr.DrawString(lang("ALBUM"), semiItemFont, secondaryTextColor,
				artist.x, listHeaderY, artist.width, listheaderHeight, StringFormat.LeftCenter);
		}

		// duration;
		gr.DrawString(Material.time, iconFont, secondaryTextColor,
			duration.x, listHeaderY, duration.width - scale(8), listheaderHeight, StringFormat.RightCenter);

		// draw items;
		for (let i = 0, items = this.items, len = this.items.length; i < len; i++) {
			let rowItem = items[i];
			rowItem.x = rowX;
			rowItem.width = rowWidth;
			rowItem.y = this.y + rowItem.yOffset - this.scroll + offsetTop;

			// visible items;
			if (rowItem.y + rowItem.height >= this.y && rowItem.y < this.y + this.height) {
				// add this item to visibleItems;
				this.visibleItems.push(rowItem);

				// get tags if not set yet;
				rowItem.getTags();

				// ----------------------
				// draw items background;
				// ----------------------

				// selection row highlight;
				if (rowItem.isSelect) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height, backgroundSelectionColor);
				}

				// focused rectangle;
				if (isfocuspart && this.focusIndex === i) {
					gr.DrawRect(rowItem.x, rowItem.y, rowItem.width - 1, rowItem.height - 1, scale(1), RGB(127, 127, 127));
				}

				// item split line;
				gr.DrawLine(rowItem.x, rowItem.y + rowHeight - 1, rowItem.x + rowItem.width, rowItem.y + rowHeight - 1, 1, themeColors.playlistSplitLine);

				// -------------
				// draw columns;
				// -------------

				// row index;
				if (this.playingIndex === i) {
					gr.DrawString(fb.IsPaused ? Material.pause : Material.play, iconFont, highlightColor,
						tracknumber.x, rowItem.y, tracknumber.width, rowItem.height, StringFormat.Center);
				} else {
					gr.DrawString(i + 1, itemFont, secondaryTextColor,
						tracknumber.x, rowItem.y, tracknumber.width, rowItem.height, StringFormat.Center);
				}

				// title / artist;
				let artistY = rowItem.y + rowItem.height / 2;
				let titleY = artistY - itemFont.Height;
				gr.DrawString(rowItem.title, itemFont, textColor,
					title.x, titleY, title.width, rowItem.height, StringFormat.LeftTop);

				let artistText = rowItem.artist;
				if (!(artist.visible && artist.width > 0)) {
					artistText += spaceStartEnd("\u2022") + rowItem.album;
				}
				gr.DrawString(artistText, smallItemFont, secondaryTextColor,
					title.x, artistY, title.width, rowHeight, StringFormat.LeftTop);

				// album;
				if (artist.visible && artist.width > 0) {
					gr.DrawString(rowItem.album, itemFont, secondaryTextColor,
						artist.x, rowItem.y, artist.width, rowItem.height, StringFormat.LeftCenter);
				}

				// added date;
				if (album.visible && album.width > 0) {
					// gr.DrawString(rowItem.addedTime, itemFont, secondaryTextColor,
					// 	album.x, rowItem.y, album.width, rowItem.height, StringFormat.LeftCenter);
				}

				// durationtime;

				gr.DrawString(rowItem.time, itemFont, secondaryTextColor,
					duration.x, rowItem.y, duration.width - scale(8), rowItem.height, StringFormat.RightCenter);
				// duration.draw(gr, rowItem.time, itemFont, secondaryTextColor, rowItem, StringFormat.Center);

				// mood;
				let icon = (rowItem.rating === 5 ? Material.heart : Material.heart_empty);
				let iconColor = (rowItem.rating === 5 ? moodColor : secondaryTextColor);
				gr.DrawString(icon, iconFont, iconColor,
					mood.x, rowItem.y, mood.width, rowItem.height, StringFormat.Center);
			}
		}

		// Shadow top cover;
		gr.FillGradRect(this.x, this.y, this.width, scale(40), 90, themeColors.topbarBackground, 0, 1.0);
	}

	private findHoverItem(x: number, y: number) {
		if (!this.trace(x, y)) {
			return null;
		}
		return this.visibleItems.find(item => item.trace(x, y));
	}

	private getActiveMoodId(x: number, y: number) {
		return -1;
	}

	private setSel(from?: number, to?: number) {
		if (from == null) {
			this.selectedIndexes.length = 0;
			this.applySel();
			return;
		} else {
			if (to == null) {
				to = from;
			}
			let c = from;
			if (from > to) {
				from = to;
				to = c;
			}
			this.selectedIndexes.length = 0;
			for (let i = from; i <= to; i++) {
				this.items[i] && this.selectedIndexes.push(i);
			}
			this.applySel();
		}
	}

	private setFocus(id: number) {
		this.focusIndex = id;
	}

	private getSelMetadbs() {
		let metadbs = this.items.filter(item => item.isSelect).map(item => item.metadb);
		return new FbMetadbHandleList(metadbs);
	}

	private applySel() {
		this.items.forEach(item => (item.isSelect = false));
		for (let i = 0, len = this.selectedIndexes.length; i < len; i++) {
			let item = this.items[this.selectedIndexes[i]];
			if (item != null) {
				item.isSelect = true;
			}
		}
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - 3 * step * rowHeight);
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		let hoverItem = this.findHoverItem(x, y);
		let hoverMood = this.getActiveMoodId(x, y);

		if (hoverMood > -1) {
			return;
		}

		if (hoverItem != null) {
			let queue = plman.FindOrCreatePlaylist(lang("Queue"), true);
			let metadbs = this.metadbs;

			plman.ActivePlaylist = queue;

			plman.UndoBackup(queue);
			plman.ClearPlaylist(queue);
			plman.InsertPlaylistItems(queue, 0, metadbs);
			plman.ExecutePlaylistDefaultAction(queue, hoverItem.rowIndex);
		}
	}


	on_mouse_lbtn_down(x: number, y: number) {
		let hoverItem = this.findHoverItem(x, y);
		this.clickedMoodId = this.getActiveMoodId(x, y);
		if (this.clickedMoodId > -1) {
			return;
		}

		// set focus;
		if (hoverItem != null) {
			this.setFocus(hoverItem.rowIndex);
		} else {
			// do nothing;
		}

		// set selection;
		if (hoverItem == null) {
			if (utils.IsKeyPressed(VKeyCode.Control)) {
				//
			} else if (utils.IsKeyPressed(VKeyCode.Shift)) {
				//
			} else {
				selecting.isActive = true;
				selecting.pageX1 = selecting.pageX2 = x - this.x;
				selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
				this.setSel();
			}
			this.multiSelStartId = -1;
		} else if (hoverItem.isSelect) {
			if (utils.IsKeyPressed(VKeyCode.Shift)) {
				this.setSel(this.multiSelStartId, this.focusIndex);
			} else if (utils.IsKeyPressed(VKeyCode.Control)) {
				hoverItem.isSelect = !hoverItem.isSelect;
				this.selectedIndexes = this.items.filter(item => item.isSelect).map(item => item.rowIndex);
			} else {
				this.clickSel = true;
			}
		} else {
			// click on a not selected itme;
			if (!utils.IsKeyPressed(VKeyCode.Shift)) {
				this.multiSelStartId = this.focusIndex;
			}
			if (utils.IsKeyPressed(VKeyCode.Shift)) {
				this.setSel(this.multiSelStartId, hoverItem.rowIndex);
			} else if (utils.IsKeyPressed(VKeyCode.Control)) {
				hoverItem.isSelect = !hoverItem.isSelect;
				this.selectedIndexes = this.items.filter(item => item.isSelect).map(item => item.rowIndex);
			} else {
				if (hoverItem.isSelect) {
					this.clickSel = true;
				} else {
					this.setSel(hoverItem.rowIndex);
				}
				selecting.isActive = true;
				selecting.pageX1 = selecting.pageX2 = x - this.x;
				selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
			}
		}

		this.repaint();
	}

	private updateSel(x: number, y: number) {
		if (this.items.length === 0) {
			return;
		}
		let topY = Math.max(this.y, this.headerView.y + this.headerView.height);
		let bottomY = this.y + this.height - 1;
		selecting.pageX2 = clamp(x, this.x, this.x + this.width - this.scrollbar.width) - this.x;
		selecting.pageY2 = clamp(y, topY, bottomY) - this.y + this.scroll;
		let first = -1;
		let last = -1;
		let padLeft = paddingLR;
		let padRight = paddingLR;
		if (
			!(
				(selecting.pageX1 < padLeft && selecting.pageX2 < padLeft) ||
				(selecting.pageX1 > this.width - padRight && selecting.pageX2 > this.width - padRight)
			)
		) {
			let topOffset = this.headerView.height;
			first = Math.floor((selecting.pageY1 - topOffset) / rowHeight);
			last = Math.floor((selecting.pageY2 - topOffset) / rowHeight);
		}
		this.setSel(first, last);
		this.repaint();
	}

	on_mouse_move(x: number, y: number) {
		if (this.clickedMoodId > -1) {
			return;
		}

		if (selecting.isActive) {
			this.updateSel(x, y);
		} else if (dnd.isActive) {
			// todo
			// do nothing now;
		} else {
			// nt selecting | dragging;
			if (this.clickSel) {
				dnd.isActive = true;
			}
		}
	}

	on_mouse_lbtn_up(x: number, y: number) {
		const hoverItem = this.findHoverItem(x, y);

		// handle click mood;
		if (this.clickedMoodId > -1) {
			if (this.getActiveMoodId(x, y) === this.clickedMoodId) {
				ToggleMood(this.items[this.clickedMoodId].metadb);
				this.items[this.clickedMoodId].title = undefined;
				this.repaint();
			}
			return;
		}

		if (dnd.isActive) {
			// handle drag drop;
			// drag drop sort items should not be supported here, it can be used to
			// add tracks to playlists;
		} else if (selecting.isActive) {
			// do nothing;
		} else {
			if (hoverItem != null) {
				if (utils.IsKeyPressed(VKeyCode.Control)) {
					// do nothing;
				} else if (utils.IsKeyPressed(VKeyCode.Shift)) {
					// do nothing;
				} else {
					this.setSel(hoverItem.rowIndex);
				}
			}
		}

		//
		selecting.clearInterval();
		selecting.isActive = false;
		selecting.pageX1 = selecting.pageX2 = -1;
		selecting.pageY1 = selecting.pageY2 = -1;

		this.clickSel = false;
		dnd.clearInterval();
		dnd.isActive = false;
		dnd.dropTargetRowIndex = -1;

		this.repaint();
	}

	on_mouse_rbtn_down(x: number, y: number) {
		let hoverItem = this.findHoverItem(x, y);
		if (hoverItem == null) {
			this.setSel();
		} else {
			if (!hoverItem.isSelect) {
				this.setSel(hoverItem.rowIndex);
				this.setFocus(hoverItem.rowIndex);
			}
		}
		this.repaint();
	}

	on_mouse_rbtn_up(x: number, y: number) {
		showTrackContextMenu(null, this.getSelMetadbs(), x, y);
	}

	on_key_down(vkey: number, mask = KMask.none) {
		if (selecting.isActive || dnd.isActive) {
			return;
		}

		if (mask === KMask.none) {
			switch (vkey) {
				case VKeyCode.Escape:
					this.setSel();
					this.repaint();
					break;
			}
		} else if (mask === KMask.ctrl) {
			if (vkey === 65 /* A */) {
				this.setSel(0, this.items.length - 1);
				this.repaint();
			}

			if (vkey === 88 /* X */) {
				// do nothing;
			}

			if (vkey === 67 /* C */) {
				fb.CopyHandleListToClipboard(this.getSelMetadbs());
			}
		}
	}

	on_playback_new_track() {
		let metadb = fb.GetNowPlaying();
		if (metadb == null) return;

		this.playingIndex = this.metadbs.Find(metadb);
		this.repaint();
	}

	on_playback_stop(reason: number) {
		if (reason !== StopReason.StartingAnotherTrack) {
			this.playingIndex = -1;
			this.repaint();
		}
	}

	on_library_items_removed() { }

	on_library_items_added() { }

	on_library_items_changed() { }

	on_focus(is_focused?: boolean) {
		this.repaint();
	}

	on_change_focus() {
		this.repaint();
	}

}


export function SendToQueueListPlay(metadbs: IFbMetadbList, playingItemIndex?: number) {
	if (!metadbs) {
		throw new Error("Invalid metadbs");
	}
	// set queue playlist contents;
	let queuePlaylist = plman.FindOrCreatePlaylist(lang("Queue"), true);
	plman.UndoBackup(queuePlaylist);
	plman.ClearPlaylist(queuePlaylist);
	plman.InsertPlaylistItems(queuePlaylist, 0, metadbs, false);

	// play;
	plman.ActivePlaylist = queuePlaylist;
	if (plman.PlaylistItemCount(plman.ActivePlaylist) > 0) {
		plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist,
			playingItemIndex == null ? Math.floor(Math.random() * plman.PlaylistItemCount(plman.ActivePlaylist)) : playingItemIndex);
	}
}