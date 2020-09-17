// -------------------------
// Playlist Manager
// -------------------------

import { scale, blendColors, RGB, StringFormat, ThrottledRepaint, RGBA, rgba2hsla, MenuFlag } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { scrollbarWidth, IThemeColors, mainColors, sidebarColors, scrollbarColor, globalFontName } from "./Theme";
import { Icon, Button, IButtonColors } from "../common/IconButton";
import { SerializableIcon } from "../common/IconType";
import { isValidPlaylist } from "./PlaylistView";
import { notifyOthers } from "./Layout";
import { IInputPopupOptions } from "./InputPopupPanel";
import { IAlertDialogOptions } from "./AlertDialog";

const IDC_ARROW = 32512;

const mouseCursor = {
    x: -1,
    y: -1
}

type IconSets = "volume" | "gear" | "queue_music";

interface IPlaylistManagerProps {
    colors: IPlaylistManagerColors;
    itemFont: IGdiFont;
    rowHeight: number;
    icons: { [keys in IconSets]: SerializableIcon };
}

const icons: { [keys in IconSets]: SerializableIcon } = {
    volume: new SerializableIcon({ name: MaterialFont, code: Material.volume, size: scale(20), width: scale(40), height: scale(40) }),
    gear: new SerializableIcon({ name: MaterialFont, code: Material.gear, size: scale(20), width: scale(40), height: scale(40) }),
    queue_music: new SerializableIcon({ name: MaterialFont, code: Material.queue_music, size: scale(20), width: scale(40), height: scale(40) }),
}

interface IPlaylistManagerColors extends IThemeColors {
    textActive: number;
    background_hover: number;
}

const PLM_Colors: IPlaylistManagerColors = {
    text: blendColors(mainColors.text, mainColors.background, 0.3),
    textActive: mainColors.text,
    background: sidebarColors.background,
    highlight: mainColors.highlight,
    background_sel: RGB(20, 20, 20),
    background_hover: RGB(10, 10, 10)
}

export const PLM_Properties = {
    minWidth: scale(256),
    rowHeight: scale(40),
    itemFont: gdi.Font(globalFontName, scale(14)),
    headerHeight: scale(80),
    headerFont: gdi.Font("Segoe UI Semibold", scale(12)),
    icons: icons,
    colors: PLM_Colors
}

class PLM_Header extends Component {
    label: string = "PLAYLISTS";
    colors: IPlaylistManagerColors;
    addPlaylistBtn: Button;

    constructor(attrs: {
        colors: IPlaylistManagerColors
    }) {
        super({});

        this.colors = attrs.colors;
        this.setAddPlaylistBtn();
    }

    private setAddPlaylistBtn() {
        let addIcon = new SerializableIcon({
            name: MaterialFont,
            code: Material.circle_add,
            size: scale(20),
            width: scale(40),
            height: scale(40)
        });
        let font = gdi.Font(globalFontName, scale(14));
        let colors: IButtonColors = {
            textColor: PLM_Properties.colors.text,
            hoverColor: PLM_Properties.colors.textActive,
            downColor: PLM_Properties.colors.textActive
        }

        this.addPlaylistBtn = new Button({
            icon: addIcon,
            text: "ADD PLAYLIST",
            font: font,
            colors: colors,
            paddings: { left: scale(16), right: scale(8) },
            gap: scale(4),
            onClick: () => {
                notifyOthers("Popup.InputPopupPanel", {
                    title: "Create new playlist"
                });
            }
        });

        this.addChild(this.addPlaylistBtn);
    }

    on_size() {
        this.addPlaylistBtn.setBoundary(this.x, this.y + scale(20), this.width, scale(40));
    }

    on_paint(gr: IGdiGraphics) {

        const { colors } = this;

        // draw background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // split line;
        let lineY = this.y + scale(40 + 10 + 20);
        let lineX1 = this.x + scale(20);
        let lineX2 = this.x + this.width - scale(16);

        gr.DrawLine(lineX1, lineY, lineX2, lineY, scale(1), RGB(100, 100, 100));

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
        return x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height;
    }
}

export class PlaylistManagerView extends ScrollView implements IPlaylistManagerProps {

    items: PLM_Item[] = [];
    scrollbar: Scrollbar;
    header: PLM_Header;

    minWidth: number = scale(256);
    rowHeight: number;
    itemFont: IGdiFont;
    colors: IPlaylistManagerColors;
    icons: { volume: SerializableIcon; gear: SerializableIcon; queue_music: SerializableIcon; };

    playingIco: SerializableIcon;
    pauseIco: SerializableIcon;

    constructor(attrs: IPlaylistManagerProps = PLM_Properties) {
        super(attrs);

        this.rowHeight = attrs.rowHeight;
        this.itemFont = attrs.itemFont;
        this.colors = attrs.colors;
        this.icons = attrs.icons;

        this.scrollbar = new Scrollbar({
            cursorColor: scrollbarColor.cursor,
            backgroundColor: 0
        });
        this.header = new PLM_Header({
            colors: this.colors
        });
        this.addChild(this.scrollbar);
        this.addChild(this.header);

        this.playingIco = new SerializableIcon({
            name: MaterialFont,
            code: Material.volume,
            size: scale(16)
        });

        this.pauseIco = new SerializableIcon({
            name: MaterialFont,
            code: Material.volume_mute,
            size: scale(16)
        })
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
            rowItem.metadb = (playlistMetadbs.Count === 0 ? null : playlistMetadbs[0]);
            rowItem.listName = plman.GetPlaylistName(playlistIndex)
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

            for (let playlistId = 0; playlistId < plman.PlaylistCount; playlistId++) {
                let rowItem = items_[playlistId];
                rowItem.x = this.x;
                rowItem.width = this.width;
            }
        }

        this.scrollbar.setBoundary(
            this.x + this.width - scale(14),
            this.y + PLM_Properties.headerHeight,
            scrollbarWidth,
            this.height - PLM_Properties.headerHeight
        );

        this.header.setBoundary(
            this.x, this.y, this.width, PLM_Properties.headerHeight
        );
    }

    on_paint(gr: IGdiGraphics) {
        let rowHeight = this.rowHeight;
        let items_ = this.items;
        let colors = this.colors;
        let itemFont = this.itemFont;
        let headerHeight = PLM_Properties.headerHeight;
        let paddingL = scale(16);
        let paddingR = scale(4);
        let icons = this.icons;
        let iconOffsetRowY = ((this.rowHeight - icons.gear.height) / 2) | 0;

        // draw background
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // draw items;
        for (let itemIndex = 0; itemIndex < items_.length; itemIndex++) {
            let rowItem = items_[itemIndex];
            rowItem.x = this.x;
            rowItem.width = this.width;
            rowItem.y = this.y + headerHeight
                + rowItem.yOffset - this.scroll;

            // items in visible area;
            if (rowItem.y + rowHeight >= this.y + headerHeight
                && rowItem.y < this.y + this.height) {

                let isActive = rowItem.index === plman.ActivePlaylist;
                let textColor = (isActive ? colors.textActive : colors.text);
                if (itemIndex === this.hoverId) {
                    textColor = colors.textActive;
                }

                if (isActive) {
                    gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height, colors.text & 0x1fffffff);
                }

                // draw icon;
                let icon_ = (rowItem.isAuto ? icons.gear : icons.queue_music);
                icon_.draw(gr, textColor, 0x000000, rowItem.x + paddingL, rowItem.y + iconOffsetRowY);

                //
                let iconX = this.x + this.width - scale(40) - this.scrollbar.width - scale(8);
                if (fb.IsPlaying && (rowItem.index === plman.PlayingPlaylist)) {
                    (fb.IsPaused ? this.pauseIco : this.playingIco)
                        .setSize(scale(40), this.rowHeight)
                        .draw(gr, colors.highlight, 0, iconX, rowItem.y);
                }

                let textWidth = rowItem.width - paddingL - paddingR - icon_.width - scale(4);
                if (fb.IsPlaying && (rowItem.index === plman.PlayingPlaylist)) {
                    textWidth = iconX - (rowItem.x + paddingL + icon_.width + scale(4)) - scale(4);
                }

                // draw list name;
                gr.DrawString(rowItem.listName, itemFont, textColor,
                    rowItem.x + paddingL + icon_.width + scale(4),
                    rowItem.y,
                    textWidth,
                    rowHeight,
                    StringFormat.LeftCenter);
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
            gr.DrawLine(this.x, lineY, this.x + this.width, lineY, lineWidth, colors.text);
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
            return -1
        };
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

        mouseCursor.x = x;
        mouseCursor.y = y;

        let hoverId_ = this.getHoverId(x, y);
        if (hoverId_ !== this.hoverId) {
            this.hoverId = hoverId_;
        }

        this.updateDrag(x, y);

        this.repaint();

        if (this.dragSourceId > -1 && this.totalHeight > this.height) {
            if (this.hoverId > -1) {
                if (this.dragTimer > -1) {
                    window.ClearInterval(this.dragTimer);
                    this.dragTimer = -1;
                }
            } else {
                if (y < this.y + this.header.height) {
                    if (this.dragTimer === -1) {
                        this.dragTimer = window.SetInterval(() => {
                            this.scrollTo(this.scroll - this.rowHeight)
                            this.updateDrag(x, y);
                        }, 100);
                    }
                } else if (y > this.y + this.height) {
                    if (this.dragTimer === -1) {
                        this.dragTimer = window.SetInterval(() => {
                            this.scrollTo(this.scroll + this.rowHeight);
                            this.updateDrag(x, y);
                        }, 100)
                    }
                }
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
                this.dragTargetId = (y < centerY ? this.hoverId : this.hoverId + 1);
            } else if (this.hoverId > this.dragSourceId) {
                this.dragTargetId = (y > centerY ? this.hoverId : this.hoverId - 1);
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
        let hoverId_ = this.getHoverId(x, y);
        if (hoverId_ !== this.hoverId) {
            this.hoverId = hoverId_;
            this.repaint();
        }
        this.dragSourceId = (isValidPlaylist(this.hoverId) ? this.hoverId : -1);
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
            this.dragTimer = -1
        }

        this.repaint();
    }

    private handleDrop() {
        let success_ = plman.MovePlaylist(this.dragSourceId, this.dragTargetId);
        // if (success_) {
        //     let scroll = this.scroll;
        //     this.initList();
        //     this.scroll = scroll;
        // }
    }

    on_mouse_lbtn_dblclk(x: number, y: number) {
        /** Do nothing. */
    }

    on_mouse_rbtn_down(x: number, y: number) {
        this.dragSourceId = -1;
        this.dragTargetId = -1;
        if (this.dragTimer > -1) {
            window.ClearInterval(this.dragTimer);
            this.dragTimer = -1
        }
    }

    on_mouse_rbtn_up(x: number, y: number) {
        this.hoverId = this.getHoverId(x, y);

        // handle right click;
        if (isValidPlaylist(this.hoverId)) {
            this.showContextMenu(this.hoverId, x, y);
        } else { }

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

        rootMenu.AppendMenuItem(!hasContents ? MenuFlag.GRAYED : MenuFlag.STRING, 1, 'Play');
        rootMenu.AppendMenuItem(MenuFlag.STRING, 2, 'Rename');
        rootMenu.AppendMenuItem(MenuFlag.STRING, 3, 'Delete');
        rootMenu.AppendMenuItem(MenuFlag.STRING, 4, 'Create new playlist');

        if (plman.IsAutoPlaylist(playlistIndex)) {
            rootMenu.AppendMenuSeparator();
            rootMenu.AppendMenuItem(MenuFlag.STRING, 5, 'Edit autoplaylist...');
        }

        const contents = window.CreatePopupMenu();
        const Context = fb.CreateContextMenuManager();
        const idOffset = 1000;

        if (hasContents) {
            Context.InitContext(metadbs);
            Context.BuildMenu(contents, idOffset, -1);
            // ---
            rootMenu.AppendMenuSeparator();
            contents.AppendTo(
                rootMenu,
                hasContents ? MenuFlag.STRING : MenuFlag.GRAYED,
                metadbs.Count + (metadbs.Count > 1 ? " tracks" : " track"));
        }

        const id = rootMenu.TrackPopupMenu(x, y);
        let options: IInputPopupOptions;

        switch (true) {
            case id === 1:
                break;
            case id === 2:
                // Rename;
                const index_ = playlistIndex;
                // plman.ActivePlaylist = playlistIndex;
                // fb.RunMainMenuCommand("Rename playlist");
                // plman.ActivePlaylist = index_;
                options = {
                    title: "Rename playlist",
                    defaultText: plman.GetPlaylistName(playlistIndex)
                }
                notifyOthers("Popup.InputPopupPanel", options);

                break;

            case id === 3:
                // Delete playlist;
                // if (plman.ActivePlaylist === playlistIndex) {
                //     if (isValidPlaylist(playlistIndex - 1)) {
                //         plman.ActivePlaylist = playlistIndex - 1;
                //     } else {
                //         plman.ActivePlaylist = 0;
                //     }
                // }
                // plman.UndoBackup(playlistIndex);
                // plman.RemovePlaylist(playlistIndex);
                let alertOptions: IAlertDialogOptions = {
                    title: "Delete playlist?"
                };
                notifyOthers("Show.AlertDialog", alertOptions);
                break;
            case id === 4:
                // Create new playlist;
                // fb.RunMainMenuCommand("New playlist");
                // fb.RunMainMenuCommand("Rename playlist");
                options = {
                    title: "Create new playlist",
                }
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


/**
 * TODO:
 *
 * - 有一个问题，拖放列表时，会忘掉拖的是哪个列表，而界面上没有提示。
 * - AddPlaylist btn action?
 */