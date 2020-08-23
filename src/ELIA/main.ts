import { RGB, scale, StopReason } from "./common/common"
import { Component, textRenderingHint } from "./common/BasePart";
import { PlaybackControlView } from "./ui/PlaybackControlView";
import { bottomColors} from "./ui/Theme";
import { TopBar } from "./ui/TopbarView";
import { PlaybackQueue } from "./ui/PlaylistView";
import { PlaylistManagerView } from "./ui/PlaylistManagerView";
import { Layout, PartsManager } from "./ui/Layout";


const playbackControlBar = new PlaybackControlView({
    colors: bottomColors,
});

class ArtDisplay extends Component {

    objTF = fb.TitleFormat("%album artist%^^%album%");
    trackKey: string = "";
    currentImage: IGdiBitmap;
    defaultImage: IGdiBitmap;

    on_init() { }

    on_size() { }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, RGB(145, 85, 47));
    }

    on_metadb_changed() {
    }

    getImages() {

    }
}


const topbar = new TopBar({})
const playlistView = new PlaybackQueue({})

class LibraryView extends Component {
    on_init() { }

    on_size() { }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, RGB(107, 95, 112));
        // gr.DrawString("Library View Panel", logfont, 0xffffffff, this.x, this.y, this.width, this.height, StringFormat.Center);
    }
}

const playlistManager = new PlaylistManagerView();

/**
 * Root part of this panel;
 */
const layout = new Layout({
    topbar: topbar,
    playbackControlBar: playbackControlBar,
    playlsitManager: playlistManager,
    playlistView: playlistView
});
const layoutManager = new PartsManager(layout);

const windowMinWidth = scale(780);

function on_paint(gr: IGdiGraphics) {

    gr.SetTextRenderingHint(textRenderingHint);

    const visibleParts = layoutManager.visibleParts;
    const len = visibleParts.length;

    for (let i = 0; i < len; i++) {
        visibleParts[i].on_paint(gr);
    }
}

function on_size() {

    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    layout.setSize(0, 0, Math.max(ww, windowMinWidth), wh);
    layoutManager.updateParts();

}


const mouseCursor = { x: -1, y: -1 };
let mouseIsDragWindow = false;

function on_mouse_move(x: number, y: number) {

    if (x === mouseCursor.x && y === mouseCursor.y) {
        return;
    }

    mouseCursor.x = x;
    mouseCursor.y = y;

    if (!mouseIsDragWindow) {
        layoutManager.activate(x, y);
    }

    layoutManager.invokeActivePart("on_mouse_move", x, y);
}

function on_mouse_lbtn_down(x: number, y: number) {
    mouseIsDragWindow = true;
    layoutManager.activate(x, y);
    layoutManager.invokeActivePart("on_mouse_lbtn_down", x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number) {
    layoutManager.invokeActivePart("on_mouse_lbtn_dblclk", x, y);
}

function on_mouse_lbtn_up(x: number, y: number) {

    layoutManager.invokeActivePart("on_mouse_lbtn_up", x, y);

    if (mouseIsDragWindow) {
        mouseIsDragWindow = false;
        layoutManager.activate(x, y);
    }
}

function on_mouse_leave() {
    layoutManager.activate(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number) {
    layoutManager.activate(x, y);
    layoutManager.invokeActivePart("on_mouse_rbtn_down", x, y);
}

function on_mouse_rbtn_up(x: number, y: number) {
    layoutManager.invokeActivePart("on_mouse_rbtn_up", x, y);
    return true;
}

function on_mouse_wheel(step: number) {

    const activePart = layoutManager.activePart;

    if (activePart == null) {
        return;
    }

    if ((<any>activePart)["on_mouse_wheel"]) {
        (<any>activePart).on_mouse_wheel(step);
    } else {
        let tmp = activePart
        while (tmp.parent != null) {
            if ((<any>tmp.parent)["on_mouse_wheel"]) {
                (<any>tmp.parent).on_mouse_wheel(step);
                break;
            }
            tmp = tmp.parent;
        }
    }
}

function on_playback_order_changed(newOrder: number) {
    layoutManager.invokeVisibleParts("on_playback_new_order_changed", newOrder);
}

function on_playback_stop(reason: StopReason) {
    layoutManager.invokeVisibleParts("on_playback_stop", reason);
}

function on_playback_edited() {
    layoutManager.invokeVisibleParts("on_playback_edited");
}

function on_playback_pause() {
    layoutManager.invokeVisibleParts("on_playback_pause");
}

function on_playback_new_track(handle: IFbMetadb) {
    layoutManager.invokeVisibleParts("on_playback_new_track", handle);
}

function on_selection_changed() {
    layoutManager.invokeVisibleParts("on_selection_changed");
}

// function on_playlist_selection_changed() {
//     layoutManager.invokeVisibleParts("on_selection_changed");
// }

function on_playlist_items_added(playlistIndex?: number) {
    layoutManager.invokeVisibleParts("on_playlist_items_added", playlistIndex);
}

function on_playlist_items_removed(playlistIndex?: number, newCount?: number) {
    layoutManager.invokeVisibleParts("on_playlist_items_removed", playlistIndex, newCount);
}

function on_playlist_items_reordered(playlistIndex?: number) {
    layoutManager.invokeVisibleParts("on_playlist_items_reordered", playlistIndex);
}

function on_playlists_changed() {
    layoutManager.invokeVisibleParts("on_playlists_changed");
}

function on_playlist_switch() {
    layoutManager.invokeVisibleParts("on_playlist_switch");
}

function on_item_focus_change() {
    layoutManager.invokeVisibleParts("on_item_focus_change");
}

function on_metadb_changed(metadbs: IFbMetadbList, fromhook: boolean) {
    layoutManager.invokeVisibleParts("on_metadb_changed", metadbs, fromhook);
}

/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assign
 * to it.  
 * It's commonly used way to create a `globalThis`.
 */
const globalThis_ = Function("return this")();

/**
 * These callback functions will automatically triggered by fb on various
 * events. since I do not know how to create global vars & functions, I decide
 * to assign them to a globalThis variable.
 */
let systemCallbacks = {
    "on_paint": on_paint,
    "on_size": on_size,
    "on_mouse_move": on_mouse_move,
    "on_mouse_lbtn_down": on_mouse_lbtn_down,
    "on_mouse_lbtn_up": on_mouse_lbtn_up,
    "on_mouse_lbtn_dblclk": on_mouse_lbtn_dblclk,
    "on_mouse_leave": on_mouse_leave,
    "on_mouse_rbtn_down": on_mouse_rbtn_down,
    "on_mouse_rbtn_up": on_mouse_rbtn_up,
    "on_mouse_wheel": on_mouse_wheel,
    "on_playback_order_changed": on_playback_order_changed,
    "on_playback_stop": on_playback_stop,
    "on_playback_edited": on_playback_edited,
    "on_playback_pause": on_playback_pause,
    "on_playback_new_track": on_playback_new_track,
    "on_selection_changed": on_selection_changed,
    // "on_playlist_selection_changed": on_playlist_selection_changed,
    "on_playlist_items_added": on_playlist_items_added,
    "on_playlsit_items_removed": on_playlist_items_removed,
    "on_playlist_items_reordered": on_playlist_items_reordered,
    "on_playlists_changed": on_playlists_changed,
    "on_playlist_switch": on_playlist_switch,
    "on_item_focus_change": on_item_focus_change,
    "on_metadb_changed": on_metadb_changed,
};

Object.assign(globalThis_, systemCallbacks);

// vim: set fileencoding=utf-8 bomb et:/
