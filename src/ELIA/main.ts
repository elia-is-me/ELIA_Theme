import { RGB, scale, StopReason } from "./common/common"
import { textRenderingHint } from "./common/BasePart";
import { PlaybackControlView } from "./ui/PlaybackControlView";
import { bottomColors, mainColors, globalFontName } from "./ui/Theme";
import { TopBar } from "./ui/TopbarView";
import { PlaylistView } from "./ui/PlaylistView";
import { PlaylistManagerView } from "./ui/PlaylistManagerView";
import { Layout, PartsManager, layoutManager } from "./ui/Layout";
import { SerializableIcon } from "./common/IconType";
import { Material, MaterialFont } from "./common/iconCode";


const playbackControlBar = new PlaybackControlView({
    colors: bottomColors,
});

type IconKeysType = "menu" | "settings" | "apps";
const iconSize = scale(20);
const icons: {
    [keys in IconKeysType]: SerializableIcon
} = {
    menu: new SerializableIcon({
        code: Material.menu,
        name: MaterialFont,
        size: iconSize,
    }),
    settings: new SerializableIcon({
        code: Material.gear,
        name: MaterialFont,
        size: iconSize,
    }),
    apps: new SerializableIcon({
        code: Material.apps,
        name: MaterialFont,
        size: iconSize,
    })
}

const topbar = new TopBar({
    backgroundColor: RGB(37, 37, 37),
    foreColor: mainColors.text,
    hoverColor: mainColors.secondaryText,
    icons: icons
});

const playlistView = new PlaylistView({})

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

layoutManager.setRoot(layout);

/* =============== /
 *  Set layout
 * =============== */

layout.onNotifyData = function (message: string, data: any) {

}

layout.onReady = function () {

    checkDefautPlaylist();

}


function checkDefautPlaylist() {

    const defaultPlaylistName = "Default";
    const compareName = defaultPlaylistName.toLowerCase();
    const playlistCount = plman.PlaylistCount;

    for (let i = 0; i < playlistCount; i++) {
        const playlistName = plman.GetPlaylistName(i).toLowerCase();
        if (playlistName === compareName) {
            return;
        }
    }

    // 'Default' playlsit does not exists;
    const fail = plman.CreatePlaylist(plman.PlaylistCount, defaultPlaylistName);

    if (fail == -1) {
        console.log("ELIA THEME: fail to create default playlist.")
    }

}

const PANEL_MIN_WIDTH = scale(780);

const __DEV__ = window.GetProperty("__DEV__", true);
let profiler: IFbProfiler;
let profilerCount = 0;
let totalTime = 0;
if (__DEV__) {
    profiler = fb.CreateProfiler("MAIN");
}

function on_paint(gr: IGdiGraphics) {

    gr.SetTextRenderingHint(textRenderingHint);

    const visibleParts = layoutManager.visibleParts;
    const len = visibleParts.length;


    if (__DEV__) {
        profiler.Reset();
    }

    for (let i = 0; i < len; i++) {
        /**
         * 有时希望 part 的 visible 属性更改后可以立刻生效（而不是等 on_size 之后再生效）
         * 但这就显得 visibleParts 存在似乎没有必要了。
         */
        visibleParts[i].visible && visibleParts[i].on_paint(gr);
    }

    if (__DEV__) {
        profiler.Print();
    }


}

function on_size() {

    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    layout.setBoundary(0, 0, Math.max(ww, PANEL_MIN_WIDTH), wh);
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
        layoutManager.setActive(x, y);
    }

    layoutManager.invokeActivePart("on_mouse_move", x, y);
}

function on_mouse_lbtn_down(x: number, y: number) {
    mouseIsDragWindow = true;
    layoutManager.setActive(x, y);
    layoutManager.invokeActivePart("on_mouse_lbtn_down", x, y);
    layoutManager.setFocus(x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number) {
    layoutManager.invokeActivePart("on_mouse_lbtn_dblclk", x, y);
}

function on_mouse_lbtn_up(x: number, y: number) {

    layoutManager.invokeActivePart("on_mouse_lbtn_up", x, y);

    if (mouseIsDragWindow) {
        mouseIsDragWindow = false;
        layoutManager.setActive(x, y);
    }
}

function on_mouse_leave() {
    layoutManager.setActive(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number) {
    layoutManager.setActive(x, y);
    layoutManager.invokeActivePart("on_mouse_rbtn_down", x, y);

    layoutManager.setFocus(x, y);
}

function on_mouse_rbtn_up(x: number, y: number) {
    layoutManager.invokeActivePart("on_mouse_rbtn_up", x, y);

    /**
     * Return true to disable spider_monkey_panel's default right-click popup
     * menu.
     */
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

function on_focus(isFocused: boolean) {
    if (!isFocused) {
        /**
         * Lost focus.
         */
        layoutManager.setFocus(-1, -1);
    }
}

function on_key_down(vkey: number) {
    switch (vkey) {
        // ...
        // some global key bindings;

        // 
        default:
            layoutManager.invokeFocusedPart("on_key_down", vkey);
            break;
    }
}

function on_char(code: number) {
    layoutManager.invokeFocusedPart("on_char", code);
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

function on_playlist_selection_changed() {
    layoutManager.invokeVisibleParts("on_selection_changed");
}

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

function on_item_focus_change(playlistIndex?: number, from?: number, to?: number) {
    layoutManager.invokeVisibleParts("on_item_focus_change", playlistIndex, from, to);
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
    "on_focus": on_focus,
    "on_key_down": on_key_down,
    "on_char": on_char,
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

/* Control wants all keys           */
const DLGC_WANTALLKEYS = 0x0004;
window.DlgCode = DLGC_WANTALLKEYS;

/* When all ready; */
window.SetTimeout(() => {
    layout.onReady();
}, 5);



