import { ui } from "./common/UserInterface";
import { Layout } from "./parts/Layout";
import { PlaybackControlView } from "./parts/PlaybackControlView";
import { TopBar } from "./parts/TopbarView";
import { isValidPlaylist, PlaylistView } from "./parts/PlaylistView";
import { PlaylistManagerView } from "./parts/PlaylistManagerView";
import { SearchResultView } from "./parts/SearchResultView";
import { SettingsView } from "./parts/SettingsView";
import { TXT } from "./common/Lang";
import { ArtistPageView } from "./parts/ArtistPage";
import { AlbumPageView } from "./parts/AlbumPage";
import { Component } from "./common/BasePart";
import { GetKeyboardMask, isFunction, KMask, lastIndex, VKeyCode } from "./common/Common";
import { browser, BrowserView } from "./parts/BrowserView";

window.DefinePanel(
	"ELIA THEME",
	{
		features: {
			drag_n_drop: true
		},
	}
);


/* Control wants all keys           */
window.DlgCode = 0x0004;

const playbackControlBar = new PlaybackControlView();
const topbar = new TopBar();
const playlistView = new PlaylistView();
const playlistManager = new PlaylistManagerView();
const searchResult = new SearchResultView();
const settingsView = new SettingsView();
const artistPage = new ArtistPageView();
const albumPage = new AlbumPageView();


// ui.monitor(playlistView);
// ui.monitor(playlistManager);
ui.monitor(browser);
ui.monitor(playbackControlBar);

/**
 * Root part of this panel;
 */
export const root = new Layout({
	topbar: topbar,
	playbackControlBar: playbackControlBar,
	playlistManager: playlistManager,
	playlistView: playlistView,
	searchResult: searchResult,
	settingsView: settingsView,
	artistPage: artistPage,
	albumPage: albumPage,
	browser: browser,
});


ui.setRoot(root);

const onReady = () => {
	checkDefautPlaylist();
	checkActivePlaylist();
};

function checkActivePlaylist() {
	if (!isValidPlaylist(plman.ActivePlaylist)) {
		if (plman.PlaylistCount > 0) {
			plman.ActivePlaylist = 0;
		} else {
			checkDefautPlaylist();
			plman.ActivePlaylist = 0;
		}
	}
}

function checkDefautPlaylist() {
	const defaultPlaylistName = TXT("Default");
	const compareName = defaultPlaylistName.toLowerCase();
	const playlistCount = plman.PlaylistCount;

	for (let i = 0; i < playlistCount; i++) {
		const playlistName = plman.GetPlaylistName(i).toLowerCase();
		if (playlistName === compareName) {
			return;
		}
	}

	// 'Default' playlist does not exists;
	const fail = plman.CreatePlaylist(plman.PlaylistCount, defaultPlaylistName);

	if (fail == -1) {
		console.log("ELIA THEME: fail to create default playlist.");
	}
}

/* When all ready; */
window.SetTimeout(() => {
	onReady();
}, 5);

/**
 * Component's callback function names;
 */
const cb = {
	on_size: "on_size",
	on_paint: "on_paint",
	on_mouse_move: "on_mouse_move",
	on_mouse_lbtn_down: "on_mouse_lbtn_down",
	on_mouse_lbtn_dblclk: "on_mouse_lbtn_dblclk",
	on_mouse_lbtn_up: "on_mouse_lbtn_up",
	on_mouse_rbtn_down: "on_mouse_rbtn_down",
	on_mouse_rbtn_up: "on_mouse_rbtn_up",
	on_mouse_wheel: "on_mouse_wheel",
	on_mouse_leave: "on_mouse_leave",
	on_focus: "on_focus",
	on_key_down: "on_key_down",
	on_key_up: "on_key_up",
	on_char: "on_char",
	on_drag_enter: "on_drag_enter",
	on_drag_leave: "on_drag_leave",
	on_drag_over: "on_drag_over",
	on_drag_drop: "on_drag_drop",
	on_playback_order_changed: "on_playback_order_changed",
	on_playback_stop: "on_playback_stop",
	on_playback_edited: "on_playback_edited",
	on_playback_pause: "on_playback_pause",
	on_playback_new_track: "on_playback_new_track",
	on_selection_changed: "on_selection_changed",
	on_playlist_items_added: "on_playlist_items_added",
	on_playlist_items_removed: "on_playlist_items_removed",
	on_playlist_items_reordered: "on_playlist_items_reordered",
	on_playlist_switch: "on_playlist_switch",
	on_playlists_changed: "on_playlists_changed",
	on_item_focus_change: "on_item_focus_change",
	on_metadb_changed: "on_metadb_changed",
	on_volume_change: "on_volume_change",
	on_load_image_done: "on_load_image_done",
	on_get_album_art_done: "on_get_album_art_done",
	on_library_items_added: "on_library_items_added",
	on_library_items_changed: "on_library_items_changed",
	on_library_items_removed: "on_library_items_removed",
}

/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assign
 * to it.
 * It's commonly used way to create a `globalThis`.
 */
const globalThis_ = Function("return this")();

let inputboxID: number = -1;

Object.assign(globalThis_, {
	inputboxID: inputboxID,
});


let partlist: Component[] = [];
let vis_parts: Component[] = [];
let rootPart: Component;
let activePart: Component;
let focusPart: Component;


function _getHoverPart(root: Component, x: number, y: number): Component {
	if (!root || !root.trace(x, y)) {
		return;
	}
	const children = root.children;
	const resultIndex = lastIndex(children, n => n.trace(x, y));
	if (resultIndex > -1) {
		return _getHoverPart(children[resultIndex], x, y);
	} else {
		return root;
	}
}

function invoke(part: Component, method: string, ...args: any) {
	if (!part) return;
	let func = (part as any)[method];
	if (func == null) {
		return null;
	}
	switch (args.length) {
		case 0:
			return func.call(part);
		case 1:
			return func.call(part, args[0]);
		case 2:
			return func.call(part, args[0], args[1]);
		case 3:
			return func.call(part, args[0], args[1], args[2]);
		default:
			return func.apply(part, args);
	}
}

function invoke_recur(part: Component, method: string, ...args: any) {
	if (part == null || !part.isVisible()) {
		return;
	}
	let chilren = part.children;
	for (let i = 0, len = chilren.length; i < len; i++) {
		if (chilren[i].isVisible()) {
			invoke_recur(chilren[i], method, ...args);
		}
	}
	invoke(part, method, ...args);
}

function compareParts(a: Component, b: Component) {
	if (a == null && b == null) return true;
	if ((a == null && b != null) || (a != null && b == null)) return false;
	return a.cid == b.cid;
};


function setActive(x: number, y: number) {
	const prev = activePart;
	activePart = _getHoverPart(rootPart, x, y);
	if (!compareParts(prev, activePart)) {
		invoke(prev, "on_mouse_leave");
		invoke(activePart, "on_mouse_move", x, y);
	}
}

function setFocus(x: number, y: number) {
	let prev = focusPart;
	let _hoverPart = _getHoverPart(rootPart, x, y);
	if (_hoverPart && !_hoverPart.grabFocus) {
		return;
	}
	focusPart = _hoverPart;
	if (!compareParts(prev, focusPart)) {
		invoke(prev, "on_change_focus", false);
		invoke(focusPart, "on_change_focus", true);
	}
}

function setFocusPart(part: Component) {
	if (!part || !part.isVisible() || !part.grabFocus) {
		return;
	}
	let prev = focusPart;
	focusPart = part;
	if (!compareParts(part, prev)) {
		invoke(prev, "on_change_focus", false);
		invoke(focusPart, "on_change_focus", true);
	}
}

function on_size(ww: number, wh: number) {
	if (!ww || !wh) {
		return;
	}
	root.setBoundary(0, 0, ww, wh);
}


function draw_part_recur(gr: IGdiGraphics, part: Component) {
	if (!part.visible) {
		return;
	}
	part.on_paint(gr);
	for (let i = 0, len = part.children.length; i < len; i++) {
		draw_part_recur(gr, part.children[i]);
	}
}

function on_paint(gr: IGdiGraphics) {
	draw_part_recur(gr, root);
}

const cursor = {
	x: -1,
	y: -1,
};

let part_is_drag = false;

function on_mouse_move(x: number, y: number) {
	if (x === cursor.x && y === cursor.y) {
		return;
	}
	cursor.x = x;
	cursor.y = y;

	if (!part_is_drag) {
		setActive(x, y);
	}
	invoke(activePart, cb.on_mouse_move, x, y);
}

function on_mouse_lbtn_down(x: number, y: number, mask?: number) {
	part_is_drag = true;
	setActive(x, y);
	setFocus(x, y);
	invoke(activePart, cb.on_mouse_lbtn_down, x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number) {
	invoke(activePart, cb.on_mouse_lbtn_dblclk, x, y);
}

function on_mouse_lbtn_up(x: number, y: number) {
	invoke(activePart, cb.on_mouse_lbtn_up, x, y);
	if (part_is_drag) {
		part_is_drag = false;
		setActive(x, y);
	}
}

function on_mouse_leave() {
	setActive(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number) {
	setActive(x, y);
	setFocus(x, y);
	invoke(activePart, cb.on_mouse_rbtn_down, x, y);
}

function on_mouse_rbtn_up(x: number, y: number) {
	invoke(activePart, cb.on_mouse_rbtn_up, x, y);

	// disable smp_panel's rightClick popup menu;
	return true;
}

function on_mouse_wheel(step: number) {
	if (!activePart) {
		return;
	}

	if (isFunction((activePart as any)[cb.on_mouse_wheel])) {
		(activePart as any).on_mouse_wheel(step);
	} else {
		let temp = activePart;
		while (temp.parent) {
			if (isFunction((temp.parent as any)[cb.on_mouse_wheel])) {
				(temp.parent as any).on_mouse_wheel(step);
				break;
			}
			temp = temp.parent;
		}
	}
}

function on_focus(is_focus: boolean) {
	if (!is_focus) {
		setFocus(-1, -1);
	}
}

function on_key_down(vkey: number) {
	let mask = GetKeyboardMask();
	if (mask === KMask.none) {
		switch (vkey) {
			case VKeyCode.F12:
				fb.ShowConsole();
				return;
		}
	}
	invoke(focusPart, cb.on_key_down, vkey, mask);
}

function on_key_up(vkey: number) { }

function on_char(code: number) {
	invoke(focusPart, cb.on_char, code);
}

function on_drag_enter(action: IDropTargetAction, x: number, y: number) { }

function on_drag_leave() { }

function on_drag_over(action: IDropTargetAction, x: number, y: number) { }

function on_drag_drop(action: IDropTargetAction, x: number, y: number) { }

function on_playback_order_changed(new_order: number) {
	invoke_recur(root, cb.on_playback_order_changed, new_order);
}

function on_playback_stop(reason: number) {
	invoke_recur(root, cb.on_playback_stop, reason);
}

function on_playback_pause(is_paused: boolean) {
	invoke_recur(root, cb.on_playback_pause, is_paused);
}

function on_playback_edited(metadb: IFbMetadb) {
	invoke_recur(root, cb.on_playback_edited, metadb);
}

function on_playback_new_track(metadb: IFbMetadb) {
	invoke_recur(root, cb.on_playback_new_track, metadb);
}

function on_selection_changed() {
	invoke_recur(root, cb.on_selection_changed);
}

function on_playlist_items_added(playlistIndex: number) {
	invoke_recur(root, cb.on_playlist_items_added, playlistIndex);
}

function on_playlist_items_removed(playlistIndex: number) {
	invoke_recur(root, cb.on_playlist_items_removed, playlistIndex);
}

function on_playlist_items_reordered(playlistIndex: number) {
	invoke_recur(root, cb.on_playlist_items_reordered, playlistIndex);
}

function on_playlists_changed() {
	invoke_recur(root, cb.on_playlists_changed);
}

function on_playlist_switch() {
	invoke_recur(root, cb.on_playlist_switch);
}

function on_item_focus_change(playlistIndex: number, from: number, to: number) {
	invoke_recur(root, cb.on_item_focus_change, playlistIndex, from, to);
}

function on_metadb_changed(metadbs: IFbMetadbList, from_hook: boolean) {
	invoke_recur(root, cb.on_metadb_changed, metadbs, from_hook);
}

function on_volume_change(val: number) {
	invoke_recur(root, cb.on_volume_change, val);
}

function on_get_album_art_done(metadb: IFbMetadb | null, art_id: number, image: IGdiBitmap | null, image_path: string) {
	//
}

function on_load_image_done(cookie: number, image: IGdiBitmap | null, image_path: string) {

}

function on_library_items_added(metadbs?: IFbMetadbList) {
	invoke_recur(root, cb.on_library_items_added, metadbs);
}

function on_library_items_changed(metadbs?: IFbMetadbList) {
	invoke_recur(root, cb.on_library_items_changed, metadbs);
}

function on_library_items_removed(metadbs?: IFbMetadbList) {
	invoke_recur(root, cb.on_library_items_removed, metadbs);
}

function on_playlist_item_ensure_visible(playlsitIndex: number, playlistItemIndex: number) {
	console.log(playlsitIndex, playlistItemIndex);
}