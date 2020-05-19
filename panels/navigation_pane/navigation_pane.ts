/// <reference path="../../common/foo_spider_monkey_panel.d.ts" />
/// <reference path="../../common/common.ts" />
/// <reference path="../../common/components.ts" />

abstract class ScrollView extends Component {
    totalHeight: number;
    scrolling: boolean = false;
    private scroll__: number = 0;
    get scroll_() { return this.scroll__ }
    set scroll_(val: number) {
        this.scroll__ = this._checkScroll(val);
    }
    private timerId: number = -1;

    constructor(attrs: object) {
        super(attrs);
    }

    _checkScroll(val: number) {
        if (val > this.totalHeight - this.height) {
            val = this.totalHeight - this.height;
        }
        if (this.totalHeight < this.height || val < 0) {
            val = 0;
        }
        return val;
    }

    scrollTo(scroll_?: number) {
        if (scroll_ == null) {
            scroll_ = this._checkScroll(this.scroll_);
        }

        if (scroll_ === this.scroll_) {
            return;
        }

        const onTimeout = () => {
            if (Math.abs(scroll_ - this.scroll_) > 0.4) {
                this.scroll_ += (scroll_ - this.scroll_) / 3;
                this.scrolling = true;
                window.ClearTimeout(this.timerId);
                this.timerId = window.SetTimeout(onTimeout, 15);
            } else {
                window.ClearTimeout(this.timerId);
                this.scroll_ = Math.round(this.scroll_);
                this.scrolling = false;
            }
            if (!this.isVisible()) {
                window.ClearTimeout(this.timerId);
                this.scrolling = false;
            }
            Repaint();
        }

        window.ClearTimeout(this.timerId);
        onTimeout();
    }
}


//

const MIN_CURSOR_HEIGHT = scale(24);
const SCROLLBAR_WIDTH = scale(12);

// interface iscrollbar {
//     cursorColor: number;
//     backgroundColor: number;
// }

class Scrollbar extends Component implements ICallbacks {
    private cursorHeight: number;
    private cursorY: number;
    state: number;
    private cursorDelta: number;
    cursorColor: number;
    backgroundColor: number;
    parent: ScrollView;

    constructor(attrs: object) {
        super(attrs);
    }

    on_paint(gr: IGdiGraphics) {
        let totalHeight = this.parent.totalHeight;
        let parentHeight = this.parent.height;

        if (totalHeight > parentHeight) {
            let scroll_ = this.parent.scroll_;
            this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
            this.cursorHeight = Math.round((parentHeight / totalHeight) * this.height);
            if (this.cursorHeight < MIN_CURSOR_HEIGHT) {
                this.cursorHeight = MIN_CURSOR_HEIGHT;
            }
        }

        if (this.backgroundColor) {
            gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
            gr.FillSolidRect(this.x + 1, this.cursorY + 1, this.width - 2, this.cursorHeight - 2, this.cursorColor);
        }
    }

    traceCursor(x: number, y: number) {
        return this.trace(x, y)
            && y > this.cursorY && y <= this.cursorY + this.cursorHeight;
    }

    changeState(newstate: number) {
        if (this.state !== newstate) {
            this.state = newstate;
            Repaint();
        }
    }

    on_mouse_move(x: number, y: number) {
        if (this.state === ButtonStates.down) {
            let cursorY = y - this.cursorDelta
            let ratio = (cursorY - this.y) / (this.height - this.cursorHeight);
            let offset = Math.round(
                (this.parent.totalHeight - this.parent.height) * ratio
            );
            this.parent.scroll_ = offset;
            Repaint();
        } else {
            this.changeState(
                this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.normal
            );
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        if (this.traceCursor(x, y)) {
            this.cursorDelta = y - this.cursorY;
            this.changeState(ButtonStates.down);
        }
    }

    on_mouse_lbtn_up(x: number, y: number) {
        this.changeState(
            this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.down
        );
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}

function isValidPlaylist(index: number) {
    if (index < 0) return false;
    if (index > plman.PlaylistCount - 1) return false;
    return true;
}

interface IColors {
    text: number;
    background: number;
    highlight: number;
    text_sel: number;
    background_sel: number;
    [name: string]: number;
}

interface IListItem {
    id: number;
    icon?: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    py: number;
    draw(gr: IGdiGraphics): void;
}

const NAV_BTN_HEIGHT = scale(40);

class NavButton extends Component {
    state = ButtonStates.normal;
    // icon: { code: string; fontName: string; fontSize: number };
    iconCode: string;
    iconFont: IGdiFont;
    text: string;
    textFont: IGdiFont;
    textColor: number;
    textHoverColor: number;
    active: boolean = false;

    constructor(props: {
        iconCode: string;
        iconFont: IGdiFont;
        text: string;
        textFont: IGdiFont;
        textColor: number;
        textHoverColor?: number;
    }) {
        super(props);
        if (isObject(props)) Object.assign(this, props);
        if (this.textHoverColor == null) {
            this.textHoverColor = blendColors(this.textColor, 0xffffffff, 0.5);
        }
    }

    on_paint(gr: IGdiGraphics) {
        let textColor_ = (this.state === ButtonStates.normal ? this.textColor : this.textHoverColor);
        let icon_x = this.x + scale(16);
        let icon_y = this.y + scale(8);
        let icon_w = scale(24);
        gr.DrawString(this.iconCode, this.iconFont, textColor_, icon_x, icon_y, icon_w, icon_w, StringFormat.Center);

        let txt_x = icon_x + icon_w + scale(16);
        let txt_w = this.x + this.width - txt_x - scale(16);
        gr.DrawString(this.text, this.textFont, textColor_, txt_x, this.y, txt_w, this.height, StringFormat.LeftCenter);

        //
        if (this.active) {
            gr.SetSmoothingMode(SmoothingMode.AntiAlias);
            let r = scale(4);
            gr.FillRoundRect(this.x, this.y, this.width - 1, this.height - 1, r, r, 0x80ffffff & this.textColor);
        }
    }
}

class PlaylistItem implements IListItem {
    id: number;
    icon?: string;
    text: string;
    py: number;
    x: number = 0;
    y: number = 0;
    z: number = 0;
    width: number = 0;
    height: number = 0;
    constructor(attrs: object) {
    }

    draw(gr: IGdiGraphics) { }
}

class PlaylistManager extends ScrollView implements ICallbacks {
    items: IListItem[] = [];
    scrollbar: Scrollbar;
    itemHeight: number = scale(28);
    colors: IColors;
    playlistVisible: boolean = true;
    itemFont: IGdiFont;
    iconFont: IGdiFont;

    private _menuIsOpen = false;

    constructor(props: {
        itemHeight?: number;
        colors: IColors;
        itemFont: IGdiFont;
        iconFont: IGdiFont;
    }) {
        super(props);
        Object.assign(this, props);

        this.colors.text_secondary = darken(this.colors.text, 0.5);
    }

    initList(playlistId: number) {
        this.totalHeight = 0;
        for (let i = 0, count = plman.PlaylistCount; i < count; i++) {
            this.items.push(new PlaylistItem({}));
        }
    }

    on_size() {
        this.scrollbar.setSize(this.x + this.width - SCROLLBAR_WIDTH, this.y, SCROLLBAR_WIDTH, this.height);
        this.scrollTo();  // check scrollTop;
    }

    on_paint(gr: IGdiGraphics) {
        let textColor = this.colors.text;
        let backColorSel = this.colors.background_sel;
        let vFontPad = ((this.itemHeight - this.itemFont.Height) / 2) >> 0;
        for (let i = 0, len = this.items.length; i < len; i++) {
            let thisItem = this.items[i];
            thisItem.x = this.x;
            thisItem.y = thisItem.py + this.y - this.scroll_;
            thisItem.width = this.width;
            thisItem.height = this.itemHeight;
            if (thisItem.y + thisItem.height > this.y && thisItem.y < this.y + this.height) {
                // draw visible items;
                if (fb.IsPlaying && i === plman.PlayingPlaylist) {
                    // draw playing playlist item;
                    gr.DrawString(fb.IsPaused ? Material.volume_mute : Material.volume, this.iconFont, this.colors.highlight, thisItem.x + thisItem.width - scale(32) - this.scrollbar.width, thisItem.y, scale(32), this.height, StringFormat.Center);
                    gr.DrawString(thisItem.icon, this.iconFont, textColor, thisItem.x + scale(16), thisItem.y, scale(32), thisItem.height, StringFormat.Center);
                    gr.DrawString(thisItem.text, this.itemFont, textColor, thisItem.x + scale(16 + 32), thisItem.y, thisItem.width - scale(16 + 32 + 16 + 32), this.height, StringFormat.LeftCenter);
                } else {
                    gr.DrawString(thisItem.icon, this.iconFont, textColor, thisItem.x + scale(16), thisItem.y, scale(32), thisItem.height, StringFormat.Center);
                    gr.DrawString(thisItem.text, this.itemFont, textColor, thisItem.x + scale(16 + 32), thisItem.y, thisItem.width - scale(16 + 32 + 16), this.height, StringFormat.LeftCenter);
                }
                if (this.playlistVisible && i === plman.ActivePlaylist) {
                    gr.FillSolidRect(this.x, this.y + vFontPad, scale(4), this.itemFont.Height, this.colors.highlight);
                } else {
                    // current view is not displaying playlist or this item is
                    // not active playlist;
                }
            } else {
                // items invisible to us, do not draw them;
            }
        }
        // TODO: draw dragdrop indication line;
    }

    _findHoverIndex(x: number, y: number) {
        return this.items.findIndex(item => (y > item.y && y <= item.y + item.height));
    }

    on_mouse_lbtn_down(x: number, y: number) {
        let hoverIdx = this._findHoverIndex(x, y);
        if (isValidPlaylist(hoverIdx)) {
            // handle click  item;
            // notify others that active playlist changed;
        }
    }

    on_mouse_lbtn_dblclk(x: number, y: number) {
        let hoverIdx = this._findHoverIndex(x, y);
        if (isValidPlaylist(hoverIdx)) {
            // handle double click here;
            // notify others;
        }
    }

    on_mouse_move(x: number, y: number) {
        // if mouse is dragging some item, update dragdrop target index;
        // else do nothing, items' state will not change.
    }

    on_mouse_lbtn_up(x: number, y: number) {
        // 
    }

    on_mouse_rbtn_down(x: number, y: number) {

    }

    on_mouse_rbtn_up(x: number, y: number) { }

    PopupContextMenu(playlistIndex: number, x: number, y: number) {
        if (!isValidPlaylist(playlistIndex)) {
            return;
        }

        this._menuIsOpen = true;
        const metadbs = plman.GetPlaylistItems(playlistIndex);
        const hasTracks = metadbs.Count > 0;

        const root = window.CreatePopupMenu();
        root.AppendMenuItem(hasTracks ? MF_STRING : MF_GRAYED, 1, "Play\tEnter");
        root.AppendMenuItem(MF_STRING, 2, "Rename playlist...\tF2");
        root.AppendMenuItem(MF_STRING, 3, "Remove playlist\tDel");
        root.AppendMenuItem(MF_STRING, 4, "Create new playlist\tCtrl+N");
        if (plman.IsAutoPlaylist(playlistIndex)) {
            root.AppendMenuSeparator();
            root.AppendMenuItem(MF_STRING, 5, "Edit autoplaylist...");
        }
        // contents context menu;
        const contents = window.CreatePopupMenu();
        const Context = fb.CreateContextMenuManager();
        const BaseID = 1000;
        if (hasTracks) {
            Context.InitContext(metadbs);
            Context.BuildMenu(contents, BaseID, -1);
            //
            root.AppendMenuSeparator();
            contents.AppendTo(root, hasTracks ? MF_STRING : MF_GRAYED, metadbs.Count + " Track(s)");
        }

        const ret = root.TrackPopupMenu(x, y);
        switch (true) {
            case ret === 1:
                // Play
                plman.ActivePlaylist = playlistIndex;
                if (plman.PlaybackOrder >= PlaybackOrder.random) {
                    plman.ExecutePlaylistDefaultAction(playlistIndex, Math.floor(Math.random() * plman.PlaylistItemCount(playlistIndex)));
                } else {
                    plman.ExecutePlaylistDefaultAction(playlistIndex, 0);
                }
                break;
            case ret === 2:
                // Rename;
                // TODO: Popup a modal or Dialog;
                break;
            case ret === 3:
                // Remove playlist;
                if (plman.ActivePlaylist === playlistIndex) {
                    if (isValidPlaylist(playlistIndex - 1)) {
                        plman.ActivePlaylist = playlistIndex - 1;
                    } else if (isValidPlaylist(playlistIndex + 1)) {
                        plman.ActivePlaylist = playlistIndex + 1;
                    } else {
                        plman.ActivePlaylist = 0;
                    }
                    // TODO: what if no playlists left?
                }
                plman.RemovePlaylist(playlistIndex);
                break;
            case ret === 4:
                fb.RunMainMenuCommand("New playlist");
                fb.RunMainMenuCommand("Rename playlist");
                // TODO: replace it with a popup modal;
                break;
            case ret === 5:
                plman.ShowAutoPlaylistUI(playlistIndex);
                break;
            case ret >= BaseID:
                // Tracks context menu;
                Context.ExecuteByID(ret - BaseID);
                break;
        }

        this._menuIsOpen = false;
    }
}


const Material = {
    sort: '\ue0c3',
    edit: '\ue254',
    circle_add: '\ue3ba',
    add: '\ue145',
    shuffle: '\ue043',
    gear: '\ue8b8',
    heart: '\ue87d',
    heart_empty: '\ue87e',
    play: '\ue037',
    circle_play: '\ue039',
    volume: '\ue050',
    volume_mute: '\ue04e',
    h_dots: '\ue5d3',
    music_note: '\ue3a1',
    star_border: '\ue83a',
    queue_music: '\ue03d',
    event: '\ue8df',
    add_circle_outline: '\ue3ba',
    search: '\ue8b6',
    settings: '\ue8b8',
    menu: '\ue5d2',
    history: '\ue8b3',
    close: '\ue14c'
};

const colors: IColors = {
    text: RGB(180, 182, 184),
    background: RGB(40, 40, 40),
    highlight: RGB(238, 127, 0),
    text_sel: RGB(255, 255, 255),
    background_sel: RGB(0, 0, 0),
    heart: RGB(195, 45, 46),
};

class NavigationPane extends Component {
    colors: IColors;
    constructor(attrs: object) {
        super(attrs);
    }
}
