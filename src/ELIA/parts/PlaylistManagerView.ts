// Playlist Manager
// -------------------------

import { scale, RGB, RGBA, StringFormat, ThrottledRepaint, MenuFlag, setAlpha, spaceStart, spaceEnd, SmoothingMode, CursorName } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component } from "../common/BasePart";
import { Material, MaterialFont, IconObject } from "../common/Icon";
import { scrollbarWidth, themeColors, fonts, GdiFont } from "./Theme";
import { Clickable } from "../common/Button";
import { isValidPlaylist } from "./PlaylistView";
import { IInputPopupOptions } from "./InputPopupPanel";
import { IAlertDialogOptions } from "./AlertDialog";
import { dndMask, mouseCursor, notifyOthers, ui } from "../common/UserInterface";
import { layout } from "./Layout";
import { lang } from "./Lang";

type IconSets = "volume" | "gear" | "queue_music" | "playing" | "pause";

const icons: { [keys in IconSets]: IconObject } = {
	volume: new IconObject(Material.volume, MaterialFont, scale(20)),
	gear: new IconObject(Material.gear, MaterialFont, scale(20)),
	queue_music: new IconObject(Material.queue_music, MaterialFont, scale(20)),
	playing: new IconObject(Material.volume, MaterialFont, scale(16)),
	pause: new IconObject(Material.volume_mute, MaterialFont, scale(16))
};

interface IPlaylistManagerProps {
	itemFont: IGdiFont;
	rowHeight: number;
	icons: { [keys in IconSets]: IconObject };
}

export const PlmanProperties = {
	minWidth: layout.plmanMinWidth,
	rowHeight: scale(32),
	itemFont: GdiFont(window.GetProperty("PlaylistManager.Item Font", "semibold,14")),
	headerHeight: scale(80),
	icons: icons,
};

class AddPlaylistButton extends Clickable {
	private textFont = PlmanProperties.itemFont;
	private addIcon = new IconObject(Material.circle_add, MaterialFont, scale(20))
	private text = lang("Create Playlist");
	private colors = [themeColors.sidebarInactiveText, themeColors.text, setAlpha(themeColors.text, 127)];

	constructor() {
		super({})
	}

	on_paint(gr: IGdiGraphics) {
		let color = this.colors[this.state];
		let iconWidth = scale(20);
		let paddingL = scale(16);

		this.addIcon.draw(gr, color, this.x + paddingL, this.y, iconWidth, this.height, StringFormat.Center);

		let textX = this.x + paddingL + iconWidth + scale(8);
		let textWidth = this.x + this.width - textX - scale(8);
		gr.DrawString(this.text, this.textFont, color, textX, this.y, textWidth, this.height, StringFormat.LeftCenter);

	}

	on_click() {
		notifyOthers("Popup.InputPopupPanel", {
			title: lang("Create playlist"),
			onSuccess(text: string) {
				let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, text);
				if (isValidPlaylist(playlistIndex)) {
					plman.ActivePlaylist = playlistIndex;
				}
			}
		})
	}
}

class PlmanHeader extends Component {
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

class PlmanItem {
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
	scrollbar: Scrollbar;
	header: PlmanHeader;
	icons: {
		volume: IconObject;
		gear: IconObject;
		queue_music: IconObject;
		playing: IconObject;
		pause: IconObject;
	};

	items: PlmanItem[] = [];
	rowHeight: number;
	itemFont: IGdiFont;
	minWidth: number = scale(256);

	private dragdrop = {
		lineY: -1,
		lineWidth: scale(1),
		sourceIndex: -1,
		targetIndex: -1,
		timer: -1,
		isDrag: false,
	}
	private drag_cursorImage: IGdiBitmap = null;
	/**
	 * Item index value in array `this.items[]`;
	 */
	private hoverIndex: number = -1;
	private clickedIndex: number = -1;
	private lastPressed = { x: -1, y: -1 };
	private _contextMenuOpen: boolean = false;


	constructor(attrs: IPlaylistManagerProps = PlmanProperties) {
		super(attrs);

		this.rowHeight = attrs.rowHeight;
		this.itemFont = attrs.itemFont;
		this.icons = attrs.icons;

		this.scrollbar = new Scrollbar({
			cursorColor: themeColors.scrollbarCursor,
			backgroundColor: themeColors.scrollbarBackground,
		});
		this.addChild(this.scrollbar);

		this.header = new PlmanHeader();
		this.addChild(this.header);
	}

	initList() {
		const rowHeight = this.rowHeight;
		const items: PlmanItem[] = [];
		const itemCount = plman.PlaylistCount;
		let itemYOffset = 0;

		for (let playlistIndex = 0; playlistIndex < itemCount; playlistIndex++) {
			let rowItem = new PlmanItem();
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
		this.totalHeight = rowHeight * itemCount + PlmanProperties.headerHeight;
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

		this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y + PlmanProperties.headerHeight, scrollbarWidth, this.height - PlmanProperties.headerHeight);

		this.header.setBoundary(this.x, this.y, this.width, PlmanProperties.headerHeight);
	}

	on_paint(gr: IGdiGraphics) {
		let rowHeight = this.rowHeight;
		let items_ = this.items;
		let itemFont = this.itemFont;
		let headerHeight = this.header.height;
		let paddingL = scale(16);
		let paddingR = scale(8);
		let icons = this.icons;
		let iconWidth = scale(20);

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
				let textColor = (((i === this.hoverIndex) || isActive) ? themeColors.text : themeColors.sidebarInactiveText);

				if (isActive) {
					gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height, themeColors.text & 0x1fffffff);
				}

				// draw icon;
				let typeIcon = rowItem.isAuto ? icons.gear : icons.queue_music;
				typeIcon.draw(gr, textColor, rowItem.x + paddingL, rowItem.y, iconWidth, rowItem.height);

				//
				let iconX = this.x + this.width - iconWidth - this.scrollbar.width - scale(8);
				if (fb.IsPlaying && rowItem.index === plman.PlayingPlaylist) {
					let stateIcon = (fb.IsPaused ? this.icons.pause : this.icons.playing);
					stateIcon.draw(gr, themeColors.highlight, iconX, rowItem.y, iconWidth, rowItem.height);
				}

				let textWidth = rowItem.width - paddingL - paddingR - iconWidth - scale(4);
				let textX = rowItem.x + paddingL + iconWidth + paddingR;
				if (fb.IsPlaying && rowItem.index === plman.PlayingPlaylist) {
					textWidth = iconX - textX - scale(4);
				}

				// Draw playlist name;
				gr.DrawString(rowItem.listName, itemFont, textColor, textX, rowItem.y, textWidth, rowHeight, StringFormat.LeftCenter);
			}
		}

		// draw drag target line;
		// let { dragSourceId, dragTargetId } = this;
		// if (dragTargetId > -1 && dragTargetId !== dragSourceId) {
		// 	let lineWidth = scale(2);
		// 	let lineY = this.y + this.header.height + this.items[dragTargetId].yOffset - this.scroll;
		// 	if (dragTargetId > dragSourceId) {
		// 		lineY += this.rowHeight;
		// 	}
		// 	if (lineY > this.y + this.height) {
		// 		lineY -= this.rowHeight;
		// 	}
		// 	if (lineY < this.y) {
		// 		lineY += this.rowHeight;
		// 	}
		// 	gr.DrawLine(this.x, lineY, this.x + this.width, lineY, lineWidth, themeColors.text);
		// }
		if (this.dragdrop.targetIndex > -1) {
			let lineY = this.y + this.header.height + this.dragdrop.targetIndex * this.rowHeight - this.scroll;
			gr.DrawLine(this.x, lineY, this.x + this.width, lineY, this.dragdrop.lineWidth, themeColors.highlight);
		}

		if (this.drag_cursorImage) {
			gr.DrawImage(this.drag_cursorImage,
				mouseCursor.x, mouseCursor.y, this.drag_cursorImage.Width, this.drag_cursorImage.Height,
				0, 0, this.drag_cursorImage.Width, this.drag_cursorImage.Height,
				0, 250);
		}
	}

	createItemImage(itemIndex: number) {
		if (this.items[itemIndex] == null) {
			return;
		}
		let imageWidth = scale(200);
		let imageHeight = this.rowHeight;
		let image = gdi.CreateImage(imageWidth, imageHeight);
		let tempGr = image.GetGraphics();
		// draw image;
		// ---- Begin

		let rowItem = this.items[itemIndex];

		// background;
		tempGr.SetSmoothingMode(SmoothingMode.AntiAlias);
		tempGr.FillRoundRect(0, 0, image.Width, image.Height, scale(2), scale(2), RGBA(255, 255, 255, 127));
		tempGr.DrawRoundRect(0, 0, image.Width - 1, image.Height - 1, scale(2), scale(2), scale(1), RGB(180, 180, 180));

		// icon;
		let icon = rowItem.isAuto ? icons.gear : icons.queue_music;
		icon.draw(tempGr, 0xff000000, scale(8), 0, scale(24), imageHeight);

		// text;
		let textX = 2 * scale(8) + scale(24);
		let textW = imageWidth - textX - scale(8);
		tempGr.DrawString(rowItem.listName, this.itemFont, 0xff000000, textX, 0, textW, imageHeight, StringFormat.LeftCenter);

		// ---- END
		image.ReleaseGraphics(tempGr);
		return image;
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * this.rowHeight * 3);
	}

	private _isOverList(x: number, y: number) {
		let listTop = this.y + this.header.height;
		return this.isVisible() && x > this.x && x <= this.x + this.width && y > listTop && y < this.y + this.height;
	}

	private getHoverId(x: number, y: number) {
		if (!this._isOverList(x, y)) {
			return -1;
		}
		return this.items.findIndex(item => item.trace(x, y));
	}

	private get_targetId(x: number, y: number) {
		let hoverId_ = this.getHoverId(x, y);
		if (isValidPlaylist(hoverId_)) {
			let hoverItem_ = this.items[hoverId_];
			if (y < hoverItem_.y + this.rowHeight / 2) {
				return hoverId_;
			} else {
				return hoverId_ + 1;
			}
		} else if (this._isOverList(x, y)) {
			if (this.items[this.items.length - 1] && y > this.items[this.items.length - 1].y + this.rowHeight) {
				return this.items.length;
			} else if (this.items[0] && y < this.items[0].y) {
				return 0;
			}
		} else {
			return -1;
		}
	}

	on_mouse_move(x: number, y: number) {
		// Mouse is still hold down on a valid playlist item;
		if (isValidPlaylist(this.clickedIndex)) {
			if (!this.dragdrop.isDrag) {
				if (Math.abs(Math.pow(x - this.lastPressed.x, 2) + Math.pow(y - this.lastPressed.y, 2)) > scale(49)) {
					this.dragdrop.isDrag = true;
					this.drag_cursorImage = this.createItemImage(this.clickedIndex);
					window.SetCursor(CursorName.IDC_HELP);
					this.repaint();
				}
			} else {
				this.dragdrop.targetIndex = this.get_targetId(x, y);
				if (this.drag_cursorImage) {
					ThrottledRepaint();
				}
				if (y < this.y + this.header.height && y > this.y + this.height) {
					// do nothing;
				} else if (y < this.y + this.header.height) {
					this.scrollTo(this.scroll - this.rowHeight);
				} else if (y > this.y + this.height) {
					this.scrollTo(this.scroll + this.rowHeight);
				}
			}
		} else {
			let hoverId_ = this.getHoverId(x, y);
			if (hoverId_ !== this.hoverIndex) {
				this.hoverIndex = hoverId_;
				this.repaint();
			}
		}
	}

	on_mouse_lbtn_down(x: number, y: number) {
		let hoverId_ = this.getHoverId(x, y);
		this.lastPressed.x = x;
		this.lastPressed.y = y;

		// 更新 'hoverIndex', 例如菜单弹出状态下，on_mouse_move 被忽略，此时光移动鼠标不能改变 item 的高亮状态。
		if (hoverId_ !== this.hoverIndex) {
			this.hoverIndex = hoverId_;
			this.repaint();
		}

		this.clickedIndex = hoverId_;
	}

	on_mouse_lbtn_up(x: number, y: number) {
		this.hoverIndex = this.getHoverId(x, y);

		if (this.clickedIndex === this.hoverIndex && isValidPlaylist(this.hoverIndex) && !this.dragdrop.isDrag) {
			plman.ActivePlaylist = this.hoverIndex;
			notifyOthers("Show.Playlist");
		}

		else if (this.dragdrop.isDrag && this.dragdrop.targetIndex > -1) {
			let { targetIndex } = this.dragdrop;
			if (targetIndex <= this.clickedIndex) {
				plman.MovePlaylist(this.clickedIndex, targetIndex);
			} else {
				plman.MovePlaylist(this.clickedIndex, targetIndex - 1);
			}
		}

		this.clickedIndex = -1;
		this.dragdrop.isDrag = false;
		this.dragdrop.targetIndex = -1;
		this.drag_cursorImage = null;
		window.SetCursor(CursorName.IDC_ARROW);

		this.repaint();
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
		/** Do nothing. */
	}

	on_mouse_rbtn_down(x: number, y: number) {
		// this.dragSourceId = -1;
		// this.dragTargetId = -1;
		// if (this.dragTimer > -1) {
		// 	window.ClearInterval(this.dragTimer);
		// 	this.dragTimer = -1;
		// }
		if (!this.dragdrop.isDrag) {
			let hoverId_ = this.getHoverId(x, y);

			if (this.hoverIndex !== hoverId_) {
				this.hoverIndex = hoverId_;
				this.repaint();
			}
		}
	}

	on_mouse_rbtn_up(x: number, y: number) {
		// this.hoverIndex = this.getHoverId(x, y);

		// // handle right click;
		// if (isValidPlaylist(this.hoverIndex)) {
		// 	this.showContextMenu(this.hoverIndex, x, y);
		// } else {
		// }

		// this.repaint();
		if (!this.dragdrop.isDrag) {
			this.hoverIndex = this.getHoverId(x, y);

			if (isValidPlaylist(this.hoverIndex)) {
				this.showContextMenu(this.hoverIndex, x, y);
			}

			this.repaint();
		}

	}

	on_mouse_leave() {
		this.hoverIndex = this._contextMenuOpen ? this.getHoverId(mouseCursor.x, mouseCursor.y) : -1;
		this.repaint();
	}

	on_drag_enter(action: IDropTargetAction, x: number, y: number) {
		// dndMask.visible = true;

		// let hoverIndex = this.getHoverId(x, y);
		// let hoverItem = this.items[hoverIndex];
		// let addBtn = this.header.addPlaylistBtn;

		// if (hoverIndex > -1) {
		// 	dndMask.setBoundary(hoverItem.x, hoverItem.y, hoverItem.width, hoverItem.height);
		// } else if (addBtn.trace(x, y)) {
		// 	dndMask.setBoundary(addBtn.x, addBtn.y, addBtn.width, addBtn.height);
		// } else {
		// 	dndMask.setBoundary(this.x, this.y, this.width, this.height);
		// }
		// window.Repaint();
	}

	on_drag_over(action: IDropTargetAction, x: number, y: number) {
		// // action.Effect = DropEffect.;
		// action.Text = "TEST ING";
		// let hoverIndex = this.getHoverId(x, y);
		// let hoverItem = this.items[hoverIndex];
		// let addBtn = this.header.addPlaylistBtn;

		// if (hoverIndex > -1) {
		// 	dndMask.setBoundary(hoverItem.x, hoverItem.y, hoverItem.width, hoverItem.height);
		// } else if (addBtn.trace(x, y)) {
		// 	dndMask.setBoundary(addBtn.x, addBtn.y, addBtn.width, addBtn.height);
		// } else {
		// 	dndMask.setBoundary(this.x, this.y, this.width, this.height);
		// }
		// window.Repaint();
	}

	on_drag_leave() {
		dndMask.visible = false;
		window.Repaint();

	}

	on_drag_drop(action: IDropTargetAction, x: number, y: number) {
		console.log("handle on_drag_drop()")

		// let currentPlaylist = plman.ActivePlaylist;

		// let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, "");
		// plman.ActivePlaylist = playlistIndex;

		// action.Playlist = playlistIndex;
		// action.Base = 0;
		// action.ToSelect = false;
		// window.Repaint();
	}


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
					title: lang("Rename playlist"),
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
					title: spaceEnd(lang("Delete")) + plman.GetPlaylistName(playlistIndex) + "?",
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
					title: lang("Create playlist"),
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


	on_playlists_changed() {
		this.initList();
		ThrottledRepaint();
	}
}
