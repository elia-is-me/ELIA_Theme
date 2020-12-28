// -------------------------
// Playlist Manager
// -------------------------

import { scale, RGB, StringFormat, ThrottledRepaint, MenuFlag, setAlpha, spaceStartEnd, spaceStart } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component } from "../common/BasePart";
import { Material, MaterialFont, IconObject } from "../common/Icon";
import { scrollbarWidth, themeColors, fonts } from "./Theme";
import { Clickable } from "../common/Button";
import { isValidPlaylist } from "./PlaylistView";
import { IInputPopupOptions } from "./InputPopupPanel";
import { IAlertDialogOptions } from "./AlertDialog";
import { dndMask, notifyOthers, ui } from "../common/UserInterface";
import { layout } from "./Layout";
import { lang } from "./Lang";

const enum DropEffect {
	None = 0,
	Copy = 1,
	Move = 2,
	Link = 4,
	Scroll = 0x80000000,
}

const mouseCursor = {
	x: -1,
	y: -1,
};

let lastPressedCoord = { x: -1, y: -1 };
let isDrag = false;
let isInternalDndActive = false;
let mouseDown = false;

type IconSets = "volume" | "gear" | "queue_music";

interface IPlaylistManagerProps {
	itemFont: IGdiFont;
	rowHeight: number;
	icons: { [keys in IconSets]: IconObject };
}

const icons: { [keys in IconSets]: IconObject } = {
	volume: new IconObject(Material.volume, MaterialFont, scale(20)),
	gear: new IconObject(Material.gear, MaterialFont, scale(20)),
	queue_music: new IconObject(Material.queue_music, MaterialFont, scale(20)),
};


export const PLM_Properties = {
	minWidth: layout.plmanMinWidth,
	rowHeight: scale(40),
	itemFont: fonts.normal_14,
	headerHeight: scale(80),
	icons: icons,
};

class AddPlaylistButton extends Clickable {

	private textFont = PLM_Properties.itemFont;
	private addIcon = new IconObject(Material.circle_add, MaterialFont, scale(20))
	private text = lang("Create Playlist");
	private colors = [themeColors.sidebarInactiveText, themeColors.text, setAlpha(themeColors.text, 127)];

	constructor() {
		super({})
	}

	on_paint(gr: IGdiGraphics) {
		let color = this.colors[this.state];

		this.addIcon.draw(gr, color, this.x + scale(16), this.y, scale(40), this.height, StringFormat.Center);
		gr.DrawString(this.text, this.textFont, color, this.x + scale(16 + 40 + 4), this.y, this.width - scale(16 + 40 + 4), this.height, StringFormat.LeftCenter);

	}

	on_click() {
		notifyOthers("Popup.InputPopupPanel", {
			title: "Create new playlist",
			onSuccess(text: string) {
				let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, text);
				if (isValidPlaylist(playlistIndex)) {
					plman.ActivePlaylist = playlistIndex;
				}
			}
		})
	}
}

class PLM_Header extends Component {
	label: string = "PLAYLISTS";
	addPlaylistBtn: AddPlaylistButton;

	constructor() {
		super({});
		this.addPlaylistBtn = new AddPlaylistButton();
		this.addChild(this.addPlaylistBtn);
	}

	on_size() {
		this.addPlaylistBtn.setBoundary(this.x, this.y + scale(20), this.width, scale(40));
	}

	on_paint(gr: IGdiGraphics) {
		// draw background;
		gr.FillSolidRect(this.x, this.y, this.width, this.height, themeColors.sidebarBackground);

		// split line;
		let lineY = this.y + scale(40 + 10 + 20);
		let lineX1 = this.x + scale(20);
		let lineX2 = this.x + this.width - scale(16);

		gr.DrawLine(lineX1, lineY, lineX2, lineY, scale(1), themeColors.sidebarSplitLine);
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
		return x > this.x && x <= this.x + this.width && y > this.y && y <= this.y + this.height;
	}
}

export class PlaylistManagerView extends ScrollView implements IPlaylistManagerProps {
	items: PLM_Item[] = [];
	scrollbar: Scrollbar;
	header: PLM_Header;

	minWidth: number = scale(256);
	rowHeight: number;
	itemFont: IGdiFont;
	icons: {
		volume: IconObject;
		gear: IconObject;
		queue_music: IconObject;
	};

	playingIco: IconObject;
	pauseIco: IconObject;

	constructor(attrs: IPlaylistManagerProps = PLM_Properties) {
		super(attrs);

		this.rowHeight = attrs.rowHeight;
		this.itemFont = attrs.itemFont;
		this.icons = attrs.icons;

		this.scrollbar = new Scrollbar({
			cursorColor: themeColors.scrollbarCursor,
			backgroundColor: themeColors.scrollbarBackground,
		});
		this.header = new PLM_Header();
		this.addChild(this.scrollbar);
		this.addChild(this.header);

		this.playingIco = new IconObject(Material.volume, MaterialFont, scale(16));

		this.pauseIco = new IconObject(Material.volume_mute, MaterialFont, scale(16));
	}

	initList() {
		const rowHeight = this.rowHeight;
		const items: PLM_Item[] = [];
		const itemCount = plman.PlaylistCount;
		let itemYOffset = 0;

		for (let playlistIndex = 0; playlistIndex < itemCount; playlistIndex++) {
			let rowItem = new PLM_Item();
			let playlistMetadbs = plman.GetPlaylistItems(playlistIndex);
			items.push(rowItem);
			rowItem.index = playlistIndex;
			rowItem.height = rowHeight;
			rowItem.metadb = playlistMetadbs.Count === 0 ? null : playlistMetadbs[0];
			rowItem.listName = plman.GetPlaylistName(playlistIndex);
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

			for (let playlistIndex = 0, len = this.items.length; playlistIndex < len; playlistIndex++) {
				let rowItem = items_[playlistIndex];
				rowItem.x = this.x;
				rowItem.width = this.width;
			}
		}

		this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y + PLM_Properties.headerHeight, scrollbarWidth, this.height - PLM_Properties.headerHeight);

		this.header.setBoundary(this.x, this.y, this.width, PLM_Properties.headerHeight);
	}

	isDnd = false;

	on_paint(gr: IGdiGraphics) {
		let rowHeight = this.rowHeight;
		let items_ = this.items;
		let itemFont = this.itemFont;
		let headerHeight = PLM_Properties.headerHeight;
		let paddingL = scale(16);
		let paddingR = scale(4);
		let icons = this.icons;
		let iconWidth = scale(40);

		// draw background
		gr.FillSolidRect(this.x, this.y, this.width, this.height, themeColors.sidebarBackground);

		// draw items;
		for (let i = 0, len = items_.length; i < len; i++) {
			let rowItem = items_[i];
			rowItem.x = this.x;
			rowItem.width = this.width;
			rowItem.y = this.y + headerHeight + rowItem.yOffset - this.scroll;

			// items in visible area;
			if (rowItem.y + rowHeight >= this.y + headerHeight && rowItem.y < this.y + this.height) {
				let isActive = rowItem.index === plman.ActivePlaylist;
				let textColor = (((i === this.hoverId) || isActive) ? themeColors.text : themeColors.sidebarInactiveText);

				if (isActive) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height, themeColors.text & 0x1fffffff);
				}

				// draw icon;
				let _listItemIcon = rowItem.isAuto ? icons.gear : icons.queue_music;
				_listItemIcon.draw(gr, textColor, rowItem.x + paddingL, rowItem.y, scale(40), scale(40));

				//
				let iconX = this.x + this.width - scale(40) - this.scrollbar.width - scale(8);
				if (fb.IsPlaying && rowItem.index === plman.PlayingPlaylist) {
					let _volumeIcon = (fb.IsPaused ? this.pauseIco : this.playingIco);
					_volumeIcon.draw(gr, themeColors.highlight, iconX, rowItem.y, scale(40), scale(40));
				}

				let textWidth = rowItem.width - paddingL - paddingR - scale(40) - scale(4);
				if (fb.IsPlaying && rowItem.index === plman.PlayingPlaylist) {
					textWidth = iconX - (rowItem.x + paddingL + scale(40) + scale(4)) - scale(4);
				}

				// draw list name;
				gr.DrawString(rowItem.listName, itemFont, textColor, rowItem.x + paddingL + scale(40) + scale(4), rowItem.y, textWidth, rowHeight, StringFormat.LeftCenter);
			}
		}

		// draw shadow
		if (this.scroll > 0) {
			let topY = this.y + headerHeight;
			gr.FillSolidRect(this.x, topY, this.width, 1, RGB(16, 16, 16));
			gr.FillSolidRect(this.x, topY + 1, this.width, 1, RGB(19, 19, 19));
			gr.FillSolidRect(this.x, topY + 2, this.width, 1, RGB(22, 22, 22));
			gr.FillSolidRect(this.x, topY + 2, this.width, 1, RGB(24, 24, 24));
		}

		// draw drag target line;
		let { dragSourceId, dragTargetId } = this;
		if (dragTargetId > -1 && dragTargetId !== dragSourceId) {
			let lineWidth = scale(2);
			let lineY = this.y + this.header.height + this.items[dragTargetId].yOffset - this.scroll;
			if (dragTargetId > dragSourceId) {
				lineY += this.rowHeight;
			}
			if (lineY > this.y + this.height) {
				lineY -= this.rowHeight;
			}
			if (lineY < this.y) {
				lineY += this.rowHeight;
			}
			gr.DrawLine(this.x, lineY, this.x + this.width, lineY, lineWidth, themeColors.text);
		}
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * this.rowHeight * 3);
	}

	private _isHoverList(x: number, y: number) {
		let listTop = this.y + this.header.height;
		return this.isVisible() && x > this.x && x <= this.x + this.width && y > listTop && y < this.y + this.height;
	}

	private getHoverId(x: number, y: number) {
		if (!this._isHoverList(x, y)) {
			return -1;
		}
		return this.items.findIndex(item => item.trace(x, y));
	}

	/**
	 * Item index value in array `this.items[]`;
	 */
	private hoverId: number = -1;

	private dragSourceId: number = -1;
	private dragTargetId: number = -1;
	private dragTimer: number = -1;

	on_mouse_move(x: number, y: number) {
		// mouseCursor.x = x;
		// mouseCursor.y = y;

		let hoverId_ = this.getHoverId(x, y);
		if (hoverId_ !== this.hoverId) {
			this.hoverId = hoverId_;
		}

		// this.updateDrag(x, y);

		// this.repaint();

		// if (this.dragSourceId > -1 && this.totalHeight > this.height) {
		// 	if (this.hoverId > -1) {
		// 		if (this.dragTimer > -1) {
		// 			window.ClearInterval(this.dragTimer);
		// 			this.dragTimer = -1;
		// 		}
		// 	} else {
		// 		if (y < this.y + this.header.height) {
		// 			if (this.dragTimer === -1) {
		// 				this.dragTimer = window.SetInterval(() => {
		// 					this.scrollTo(this.scroll - this.rowHeight);
		// 					this.updateDrag(x, y);
		// 				}, 100);
		// 			}
		// 		} else if (y > this.y + this.height) {
		// 			if (this.dragTimer === -1) {
		// 				this.dragTimer = window.SetInterval(() => {
		// 					this.scrollTo(this.scroll + this.rowHeight);
		// 					this.updateDrag(x, y);
		// 				}, 100);
		// 			}
		// 		}
		// 	}
		// }
		if (!mouseDown) {
			return;
		}

		if (!isDrag && hoverId_ > -1) {
			let distance = Math.pow(lastPressedCoord.x - x, 2) + Math.pow(lastPressedCoord.y - y, 2);
			if (distance > 49) {
				lastPressedCoord = {
					x: -1,
					y: -1,
				};
				this.performInternalDnd();
			}
		}
	}

	private updateDrag(x: number, y: number) {
		if (this.dragSourceId === -1) {
			this.dragTargetId = -1;
			return;
		}

		if (this.items.length === 0) {
			return;
		}

		if (isValidPlaylist(this.hoverId)) {
			let centerY = (this.items[this.hoverId].y + this.rowHeight / 2) >> 0;
			if (this.hoverId < this.dragSourceId) {
				this.dragTargetId = y < centerY ? this.hoverId : this.hoverId + 1;
			} else if (this.hoverId > this.dragSourceId) {
				this.dragTargetId = y > centerY ? this.hoverId : this.hoverId - 1;
			} else {
				this.dragTargetId = -1;
			}
		} else {
			let lastItem = this.items[this.items.length - 1];
			if (y <= this.items[0].y) {
				this.dragTargetId = 0;
			} else if (y >= lastItem.y) {
				this.dragTargetId = plman.PlaylistCount - 1;
			} else {
				this.dragTargetId = -1;
			}
		}

		this.repaint();
	}

	on_mouse_lbtn_down(x: number, y: number) {
		mouseDown = true;
		let hoverId_ = this.getHoverId(x, y);
		if (hoverId_ !== this.hoverId) {
			this.hoverId = hoverId_;
			this.repaint();
		}
		this.dragSourceId = isValidPlaylist(this.hoverId) ? this.hoverId : -1;
	}

	on_mouse_lbtn_up(x: number, y: number) {
		this.hoverId = this.getHoverId(x, y);

		if (this.dragSourceId === this.hoverId && isValidPlaylist(this.hoverId)) {
			plman.ActivePlaylist = this.hoverId;
			notifyOthers("Show.Playlist");
		}

		if (this.dragSourceId > -1 && this.dragSourceId !== this.dragTargetId) {
			this.handleDrop();
		}

		this.dragSourceId = -1;
		this.dragTargetId = -1;
		if (this.dragTimer > -1) {
			window.ClearInterval(this.dragTimer);
			this.dragTimer = -1;
		}

		this.repaint();
	}

	private handleDrop() {
		plman.MovePlaylist(this.dragSourceId, this.dragTargetId);
	}

	performInternalDnd() {
		isDrag = true;
		isInternalDndActive = true;
		let effect = fb.DoDragDrop(window.ID, plman.GetPlaylistItems(plman.ActivePlaylist), DropEffect.Move | DropEffect.Link);

		if (effect === DropEffect.None) {
		} else if (effect === DropEffect.Move) {
		} else {
		}

		isInternalDndActive = false;
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		/** Do nothing. */
	}

	on_mouse_rbtn_down(x: number, y: number) {
		this.dragSourceId = -1;
		this.dragTargetId = -1;
		if (this.dragTimer > -1) {
			window.ClearInterval(this.dragTimer);
			this.dragTimer = -1;
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		this.hoverId = this.getHoverId(x, y);

		// handle right click;
		if (isValidPlaylist(this.hoverId)) {
			this.showContextMenu(this.hoverId, x, y);
		} else {
		}

		this.repaint();
	}

	on_mouse_leave() {
		if (this._contextMenuOpen) {
			this.hoverId = this.getHoverId(mouseCursor.x, mouseCursor.y);
		} else {
			this.hoverId = -1;
		}
		this.repaint();
	}

	private _contextMenuOpen: boolean = false;

	showContextMenu(playlistIndex: number, x: number, y: number) {
		if (!isValidPlaylist(playlistIndex)) {
			return;
		}

		this._contextMenuOpen = true;

		const metadbs = plman.GetPlaylistItems(playlistIndex);
		const hasContents = metadbs.Count > 0;
		const rootMenu = window.CreatePopupMenu();

		rootMenu.AppendMenuItem(!hasContents ? MenuFlag.GRAYED : MenuFlag.STRING, 1, lang("Play"));
		rootMenu.AppendMenuItem(MenuFlag.STRING, 2, lang("Rename"));
		rootMenu.AppendMenuItem(MenuFlag.STRING, 3, lang("Delete"));
		rootMenu.AppendMenuItem(MenuFlag.STRING, 4, lang("Create playlist"));

		if (plman.IsAutoPlaylist(playlistIndex)) {
			rootMenu.AppendMenuSeparator();
			rootMenu.AppendMenuItem(MenuFlag.STRING, 5, lang("Edit autoplaylist..."));
		}

		const contents = window.CreatePopupMenu();
		const Context = fb.CreateContextMenuManager();
		const idOffset = 1000;

		if (hasContents) {
			Context.InitContext(metadbs);
			Context.BuildMenu(contents, idOffset, -1);
			// ---
			rootMenu.AppendMenuSeparator();
			contents.AppendTo(rootMenu, hasContents ? MenuFlag.STRING : MenuFlag.GRAYED, metadbs.Count + spaceStart(metadbs.Count > 1 ? lang("tracks") : lang("track")));
		}

		const id = rootMenu.TrackPopupMenu(x, y);
		let options: IInputPopupOptions;

		switch (true) {
			case id === 1:
				break;
			case id === 2:
				// Rename;
				options = {
					title: "Rename playlist",
					defaultText: plman.GetPlaylistName(playlistIndex),
					onSuccess(text: string) {
						plman.RenamePlaylist(playlistIndex, text);
					},
				};
				notifyOthers("Popup.InputPopupPanel", options);
				break;

			case id === 3:
				// Delete playlist;
				let alertOptions: IAlertDialogOptions = {
					title: "Delete playlist?",
					onSuccess: () => {
						let deleteActivePlaylist = (playlistIndex === plman.ActivePlaylist);
						plman.RemovePlaylist(playlistIndex);
						if (deleteActivePlaylist && isValidPlaylist(playlistIndex)) {
							plman.ActivePlaylist = playlistIndex;
						}
					},
				};
				notifyOthers("Show.AlertDialog", alertOptions);
				break;
			case id === 4:
				// Create new playlist;
				options = {
					title: "Create new playlist",
				};
				notifyOthers("Popup.InputPopupPanel", options);
				break;
			case id === 5:
				if (plman.IsAutoPlaylist(playlistIndex)) {
					plman.ShowAutoPlaylistUI(playlistIndex);
				} else {
					console.log("WARN: ", "Is not an autoplaylist");
				}
				break;
			case id >= idOffset:
				Context.ExecuteByID(id - idOffset);
				break;
			default:
				break;
		}

		this._contextMenuOpen = false;
		this.on_mouse_leave();
	}

	on_drag_enter(action: IDropTargetAction, x: number, y: number) {
		// action.Effect = DropEffect.None;
		dndMask.visible = true;

		let hoverIndex = this.getHoverId(x, y);
		let hoverItem = this.items[hoverIndex];
		let addBtn = this.header.addPlaylistBtn;

		if (hoverIndex > -1) {
			dndMask.setBoundary(hoverItem.x, hoverItem.y, hoverItem.width, hoverItem.height);
		} else if (addBtn.trace(x, y)) {
			dndMask.setBoundary(addBtn.x, addBtn.y, addBtn.width, addBtn.height);
		} else {
			dndMask.setBoundary(this.x, this.y, this.width, this.height);
		}
		window.Repaint();
	}

	on_drag_over(action: IDropTargetAction, x: number, y: number) {
		// action.Effect = DropEffect.;
		action.Text = "TEST ING";
		let hoverIndex = this.getHoverId(x, y);
		let hoverItem = this.items[hoverIndex];
		let addBtn = this.header.addPlaylistBtn;

		if (hoverIndex > -1) {
			dndMask.setBoundary(hoverItem.x, hoverItem.y, hoverItem.width, hoverItem.height);
		} else if (addBtn.trace(x, y)) {
			dndMask.setBoundary(addBtn.x, addBtn.y, addBtn.width, addBtn.height);
		} else {
			dndMask.setBoundary(this.x, this.y, this.width, this.height);
		}
		window.Repaint();
	}

	on_drag_leave() {
		dndMask.visible = false;
		window.Repaint();
	}

	on_drag_drop(action: IDropTargetAction, x: number, y: number) {
		let currentPlaylist = plman.ActivePlaylist;

		let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, "");
		plman.ActivePlaylist = playlistIndex;

		action.Playlist = playlistIndex;
		action.Base = 0;
		action.ToSelect = false;
		window.Repaint();
	}

	on_playlists_changed() {
		this.initList();
		ThrottledRepaint();
	}
}
