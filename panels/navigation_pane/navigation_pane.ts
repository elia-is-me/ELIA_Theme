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

    constructor(attrs: {
        cursorColor: number;
        backgroundColor: number;
    }) {
        super(attrs);
    }

    on_paint(gr: IGdiGraphics) {
        let totalHeight = this.parent.totalHeight;
        let parentHeight = this.parent.height;

        if (totalHeight > parentHeight) {
            let scroll_ = this.parent.scroll_;
            this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
            this.cursorHeight = Math.max(Math.round((parentHeight / totalHeight) * this.height), MIN_CURSOR_HEIGHT);
            // Draw background;
            if (this.backgroundColor) {
                gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
            }
            // Draw cursor;
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
    constructor(attrs: {
        id: number;
        icon?: string;
        text: string;
        py: number;
    }) {
        Object.assign(this, attrs);
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
    private _hoverIdx: number = -1;

    constructor(props: {
        itemHeight: number;
        colors: IColors;
        itemFont: IGdiFont;
        iconFont: IGdiFont;
    }) {
        super(props);
        Object.assign(this, props);

        // init before on_size();
        this.colors.text_secondary = darken(this.colors.text, 0.5);
        this.scrollbar = new Scrollbar({
            cursorColor: this.colors.text,
            backgroundColor: this.colors.background
        });
        this.addChild(this.scrollbar);
    }

    on_init() {
        // if (isValidPlaylist(plman.ActivePlaylist)) {
        this.initList(plman.ActivePlaylist);
        // } else {
        //
        // }

    }

    initList(playlistId: number) {
        this.items.splice(0, this.items.length);
        let pageY = 0;
        for (let i = 0, count = plman.PlaylistCount; i < count; i++) {
            // this.items.push(new PlaylistItem({}));
            let item = new PlaylistItem({
                id: i,
                py: pageY,
                text: plman.GetPlaylistName(i),
                icon: Material.music_note
            });
            pageY += this.itemHeight;
            this.items.push(item);
        }
        this.totalHeight = this.itemHeight * this.items.length;
        console.log("total height: ==> " + this.totalHeight);
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
                    gr.DrawString(fb.IsPaused ? Material.volume_mute : Material.volume, this.iconFont, this.colors.highlight, thisItem.x + thisItem.width - scale(32) - this.scrollbar.width, thisItem.y, scale(32), thisItem.height, StringFormat.Center);
                    gr.DrawString(thisItem.icon, this.iconFont, textColor, thisItem.x + scale(16), thisItem.y, scale(32), thisItem.height, StringFormat.Center);
                    gr.DrawString(thisItem.text, this.itemFont, textColor, thisItem.x + scale(16 + 32), thisItem.y, thisItem.width - scale(16 + 32 + 16 + 32), thisItem.height, StringFormat.LeftCenter);
                } else {
                    gr.DrawString(thisItem.icon, this.iconFont, textColor, thisItem.x + scale(16), thisItem.y, scale(32), thisItem.height, StringFormat.Center);
                    gr.DrawString(thisItem.text, this.itemFont, textColor, thisItem.x + scale(16 + 32), thisItem.y, thisItem.width - scale(16 + 32 + 16), thisItem.height, StringFormat.LeftCenter);
                }
                if (this.playlistVisible && i === plman.ActivePlaylist) {
                    gr.FillSolidRect(this.x, thisItem.y, this.width, thisItem.height, this.colors.text & 0x50ffffff);
                    gr.FillSolidRect(this.x, thisItem.y, scale(4), thisItem.height, this.colors.highlight);
                } else {
                    // current view is not displaying playlist or this item is
                    // not active playlist;
                    // Do NOTHING here.
                }
            } else {
                // items invisible to us, do not draw them;
                // Do NOTHING here.
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

    // on_mouse_lbtn_dblclk(x: number, y: number) {
    //     let hoverIdx = this._findHoverIndex(x, y);
    //     if (isValidPlaylist(hoverIdx)) {
    //         // handle double click here;
    //         // notify others;
    //     }
    // }

    on_mouse_move(x: number, y: number) {
        // if mouse is dragging some item, update dragdrop target index;
        // else do nothing, items' state will not change.
    }

    on_mouse_lbtn_up(x: number, y: number) {
        let hoverIdx = this._findHoverIndex(x, y);
        if (isValidPlaylist(hoverIdx)) {
            // if playlist view is visible {
            plman.ActivePlaylist = hoverIdx;
            // Will trigger on_playlist_switch
            // } else  {
            // switch view to playlist;
            // }
        }
    }

    on_mouse_rbtn_down(x: number, y: number) {

    }

    on_mouse_rbtn_up(x: number, y: number) {
        try {
            let hoverIdx = this._findHoverIndex(x, y);
            if (isValidPlaylist(hoverIdx)) {
                this.PopupContextMenu(hoverIdx, x, y);
            } else {
                // Right click on empty erea.
                // Click outside of the list area is not traced here.
            }
        } catch (e) { }
    }

    on_mouse_leave() {
        if (this._menuIsOpen) {

        } else {

        }
    }

    on_mouse_wheel(step: number) { }

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

    on_playlists_changed() {
        this.initList(plman.ActivePlaylist);
        Repaint();
    }

    on_playlist_switch() {
        this.initList(plman.ActivePlaylist);
        Repaint();
    }

    on_playback_stop(reason?: number) {
        if (reason == 2) {
            Repaint();
        }
    }

    on_playback_new_track() {
        Repaint();
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

const playlistManager = new PlaylistManager({
    itemHeight: NAV_BTN_HEIGHT,
    colors: colors,
    itemFont: gdi.Font("Segoe UI", scale(13)),
    iconFont: gdi.Font("material icons", scale(18))
});

const albumsButton = new NavButton({
    iconCode: Material.music_note,
    iconFont: gdi.Font("Material Icons", scale(18)),
    text: "ALBUMS",
    textFont: gdi.Font("Segoe UI", scale(13)),
    textColor: colors.text,
    textHoverColor: colors.highlight
});

const artistsButton = new NavButton({
    iconCode: Material.music_note,
    iconFont: gdi.Font("Material Icons", scale(18)),
    text: "ARTISTS",
    textFont: gdi.Font("Segoe UI", scale(13)),
    textColor: colors.text,
    textHoverColor: colors.highlight
});

const addNewPlaylist = new NavButton({
    iconCode: Material.circle_add,
    iconFont: gdi.Font("Material Icons", scale(18)),
    text: "NEW PLAYLIST",
    textFont: gdi.Font("Segoe UI", scale(13)),
    textColor: colors.text,
    textHoverColor: colors.highlight,
});

addNewPlaylist.on_paint = function (gr: IGdiGraphics) {
    gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);
    NavButton.prototype.on_paint.call(addNewPlaylist, gr);
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

const UI = new Component({

    on_init() { },

    on_size() {
        let TOP_PAD = scale(80);
        let SIDE_PAD = scale(0);

        albumsButton.setSize(this.x + SIDE_PAD, this.y + TOP_PAD, this.width - 2 * SIDE_PAD, NAV_BTN_HEIGHT);
        artistsButton.setSize(this.x + SIDE_PAD, albumsButton.y + NAV_BTN_HEIGHT, this.width - 2 * SIDE_PAD, NAV_BTN_HEIGHT);
        addNewPlaylist.setSize(this.x + SIDE_PAD, artistsButton.y + NAV_BTN_HEIGHT + scale(16), this.width - 2 * SIDE_PAD, NAV_BTN_HEIGHT);
        playlistManager.setSize(this.x, artistsButton.y + NAV_BTN_HEIGHT * 2 + scale(16), this.width, this.height - TOP_PAD - NAV_BTN_HEIGHT * 3 - scale(16));
    },

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // 
        let LINE_PAD = scale(8);
        gr.DrawLine(this.x + LINE_PAD, addNewPlaylist.y - LINE_PAD, this.x + this.width - LINE_PAD, addNewPlaylist.y - LINE_PAD, scale(1), colors.text);
    }
});

UI.addChild(playlistManager);
UI.addChild(artistsButton);
UI.addChild(albumsButton);
UI.addChild(addNewPlaylist);

let panels_vis: Component[] = [];
let panels_vis_updated = false;

function findVisibleComponents(root: Component) {
    if (!root.isVisible()) return [];

    let children = root.children;
    let visibles = [root];

    for (let i = 0; i < children.length; i++) {
        if (children[i].isVisible()) {
            visibles = visibles.concat(findVisibleComponents(children[i]));
        }
    }

    return visibles;
}

function RefreshPanels() {
    let panelsPrev = panels_vis;
    panels_vis = findVisibleComponents(UI);
    panels_vis
        .filter(p => panelsPrev.indexOf(p) === -1)
        .forEach(p => invoke(p, "on_init"));
}

const useClearType = window.GetProperty('_Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('_Global.Font Antialias(Only when useClearType = false', true);
const textRenderingHint = useClearType ? 5 : useAntiAlias ? 4 : 0;

function on_paint(gr: IGdiGraphics) {
    gr.SetTextRenderingHint(textRenderingHint);

    for (let i = 0, len = panels_vis.length; i < len; i++) {
        (<any>panels_vis[i]).on_paint && (<any>panels_vis[i]).on_paint(gr);
    }
}

const MIN_WIDTH = scale(200);

function on_size() {
    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    UI.setSize(0, 0, Math.max(ww, MIN_WIDTH), wh);
    if (g_panels_changed) {
        RefreshPanels();
        g_panels_changed = false;
    }
}

const g_mouse = { x: -1, y: -1 };
let g_active_index = -1;
let g_down_index = -1;
let g_focus_index = -1;
let g_drag_window = false;

function findActivePanel(visibles: Component[], x: number, y: number) {
    let len = visibles.length;
    let result = -1;

    for (let i = len - 1; i >= 0; --i) {
        if (visibles[i].trace(x, y)) {
            result = i;
            break;
        }
    }

    return result;
}

function Activate(x: number, y: number) {
    let deactiveId = g_active_index;
    g_active_index = findActivePanel(panels_vis, x, y);
    if (g_active_index !== deactiveId) {
        invoke(panels_vis[deactiveId], "on_mouse_leave");
        invoke(panels_vis[g_active_index], "on_mouse_move");
    }
}

function Focus(x: number, y: number) {
    let defocusId = g_focus_index;
    if (g_active_index > -1) {
        g_focus_index = g_active_index;
    }
    if (g_focus_index !== defocusId) {
        invoke(panels_vis[defocusId], "on_focus", false);
        invoke(panels_vis[g_focus_index], "on_focus", true);
    }
}

function on_mouse_move(x: number, y: number) {
    if (x === g_mouse.x && y === g_mouse.y) {
        return;
    }

    g_mouse.x = x;
    g_mouse.y = y;

    if (!g_drag_window) {
        Activate(x, y);
    }

    invoke(panels_vis[g_active_index], "on_mouse_move", x, y);
}

function on_mouse_lbtn_down(x: number, y: number, mask?: number) {
    g_drag_window = true;
    Activate(x, y);
    g_down_index = g_active_index;
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_down", x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_dblclk", x, y);
}

function on_mouse_lbtn_up(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_up", x, y);

    if (g_drag_window) {
        g_drag_window = false;
        Activate(x, y);
    }
}

function on_mouse_leave() {
    Activate(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_down", x, y);
}

function on_mouse_rbtn_up(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_up", x, y);
    return true;
}

function on_mouse_wheel(step: number) {
    if (g_active_index === -1) {
        return;
    }
    // else;
    if ((<any>panels_vis[g_active_index])["on_mouse_wheel"]) {
        (<any>panels_vis[g_active_index]).on_mouse_wheel(step);
    } else {
        let tmp = panels_vis[g_active_index];
        while (tmp.parent != null) {
            if ((<any>tmp.parent)["on_mouse_wheel"]) {
                (<any>tmp.parent).on_mouse_wheel(step);
                break;
            }
            tmp = tmp.parent;
        }
    }
}

// function on_playback_order_changed(newOrder: number) {
//     panels_vis.forEach(p => invoke(p, "on_playback_order_changed"));
// }

function on_playback_stop(reason: number) {
    panels_vis.forEach(p => invoke(p, "on_playback_stop"));
}

// function on_playback_edited() {
//     panels_vis.forEach(p => invoke(p, "on_playback_edited"));
// }

// function on_playback_pause() {
//     panels_vis.forEach(p => invoke(p, "on_playback_pause"));
// }

function on_playback_new_track(handle: IFbMetadb) {
    panels_vis.forEach(p => invoke(p, "on_playback_new_track", handle));
}


function on_playlists_changed() {
    panels_vis.forEach(p => invoke(p, "on_playlists_changed"));
}

function on_playlist_switch() {
    panels_vis.forEach(p => invoke(p, "on_playlist_switch"));
}
}
