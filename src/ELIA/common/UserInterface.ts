import { Component } from "./BasePart";
import {
	GetKeyboardMask,
	isFunction,
	KMask,
	TextRenderingHint,
	VKeyCode,
} from "./common";

let partlist: Component[] = [];
let vis_parts: Component[] = [];
let rootPart: Component;
let activePart: Component;
let focusPart: Component;

const flatternParts = (part: Component): Component[] => {
	if (part == null) {
		return [];
	}
	let children = part.children;
	let result = [part];
	for (let i = 0, len = children.length; i < len; i++) {
		result = result.concat(flatternParts(children[i]));
	}
	return result;
};

const setRoot = (root: Component) => {
	rootPart = root;
	partlist = [];
	vis_parts = [];
	focusPart = undefined;
	activePart = undefined;
};

function getHoverPart(parts: Component[], x: number, y: number) {
	for (let i = parts.length - 1; i >= 0; i--) {
		if (parts[i].trace(x, y)) {
			return parts[i];
		}
	}
	return null;
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

const compareParts = (a: Component, b: Component) => {
	if (a == null && b == null) return true;
	if ((a == null && b != null) || (a != null && b == null)) return false;
	return a.cid == b.cid;
};

function setActive(x: number, y: number) {
	const prev = activePart;
	activePart = getHoverPart(vis_parts, x, y);
	if (!compareParts(prev, activePart)) {
		invoke(prev, "on_mouse_leave");
		invoke(activePart, "on_mouse_move", x, y);
	}
}

function setFocus(x: number, y: number) {
	let prev = focusPart;
	focusPart = getHoverPart(vis_parts, x, y);
	if (!compareParts(prev, focusPart)) {
		invoke(prev, "on_change_focus", false);
		invoke(focusPart, "on_change_focus", true);
	}
}

const partIsVis = (part: Component) => part.isVisible();

function updateParts() {
	let cached = vis_parts;
	partlist = flatternParts(rootPart);
	vis_parts = partlist.filter(partIsVis);

	vis_parts
		.filter(p => cached.indexOf(p) === -1)
		.forEach(p => {
			p.on_init();
			p.didUpdateOnInit();
		});
	cached
		.filter(p => vis_parts.indexOf(p) === -1)
		.forEach(p => {
			p.resetUpdateState();
		});
}

export function notifyOthers(message: string, data?: any) {
	if (!partlist || partlist.length === 0) {
		return;
	}
	partlist.forEach(part => {
		invoke(part, "onNotifyData", message, data);
	});
}

let shouldUpdateVisbles = true;
let shouldSortChildren = true;

const useClearType = window.GetProperty("Global.Font Use ClearType", true);
const useAntiAlias = window.GetProperty(
	"Global.Font Antialias(Only when useClearType = false",
	true
);
const textRenderingHint = useClearType
	? TextRenderingHint.ClearTypeGridFit
	: useAntiAlias
	? TextRenderingHint.AntiAlias
	: 0;

function on_size(width: number, height: number) {
	if (!width || !height) {
		return;
	}
	rootPart.setBoundary(0, 0, width, height);
	updateParts();
}

function on_paint(gr: IGdiGraphics) {
	gr.SetTextRenderingHint(textRenderingHint);

	for (let i = 0, len = vis_parts.length; i < len; i++) {
		vis_parts[i].on_paint(gr);
	}
}

function monitor(name: string, object: Component) {
	let __dev__ = window.GetProperty("__DEV__", false);
	if (!__dev__) return;

	let profiler = fb.CreateProfiler("MONITOR");
	let count = 0;
	let time = 0;
	let on_paint = object.on_paint;

	object.on_paint = (gr: IGdiGraphics) => {
		profiler.Reset();
		on_paint.call(object, gr);
		if (count < 20) {
			count++;
			time += profiler.Time;
		} else {
			console.log(name + " MONITOR: ", time / 20);
			count = 0;
			time = 0;
		}
	};
}

let mouseCursor = {
	x: -1,
	y: -1,
};

let lastPressedCoord = {
	x: -1,
	y: -1,
};

let isDrag = false;

function on_mouse_move(x: number, y: number) {
	if (x === mouseCursor.x && y === mouseCursor.y) {
		return;
	}
	mouseCursor.x = x;
	mouseCursor.y = y;

	if (!isDrag) {
		setActive(x, y);
	}
	invoke(activePart, "on_mouse_move", x, y);
}

function on_mouse_lbtn_down(x: number, y: number) {
	isDrag = true;
	setActive(x, y);
	setFocus(x, y);
	invoke(activePart, "on_mouse_lbtn_down", x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number) {
	invoke(activePart, "on_mouse_lbtn_dblclk", x, y);
}

function on_mouse_lbtn_up(x: number, y: number) {
	invoke(activePart, "on_mouse_lbtn_up", x, y);
	if (isDrag) {
		isDrag = false;
		setActive(x, y);
	}
}

function on_mouse_leave() {
	setActive(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number) {
	setActive(x, y);
	setFocus(x, y);
	invoke(activePart, "on_mouse_rbtn_down", x, y);
}

function on_mouse_rbtn_up(x: number, y: number) {
	invoke(activePart, "on_mouse_rbtn_up", x, y);

	/**
	 * diable smp_panel's rightClick popup menu;
	 */
	return true;
}

function on_mouse_wheel(step: number) {
	if (!activePart) {
		return;
	}

	if (isFunction((activePart as any)["on_mouse_wheel"])) {
		(activePart as any).on_mouse_wheel(step);
	} else {
		let tmp = activePart;
		while (tmp.parent) {
			if (isFunction((tmp.parent as any)["on_mouse_wheel"])) {
				(tmp.parent as any).on_mouse_wheel(step);
				break;
			}
			tmp = tmp.parent;
		}
	}
}

function on_focus(isFocus: boolean) {
	if (!isFocus) {
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
	invoke(focusPart, "on_key_down", vkey, mask);
}

function on_key_up(vkey: number) {}

function on_char(code: number) {
	invoke(focusPart, "on_char", code);
}

function on_playback_order_changed(newOrder: number) {
	vis_parts.forEach(p => invoke(p, "on_playback_order_changed", newOrder));
}

function on_playback_stop(reason: number) {
	vis_parts.forEach(p => invoke(p, "on_playback_stop", reason));
}

function on_playback_pause(isPaused: boolean) {
	vis_parts.forEach(p => invoke(p, "on_playback_pause", isPaused));
}

function on_playback_edited(metadb: IFbMetadb) {
	vis_parts.forEach(p => invoke(p, "on_playback_edited", metadb));
}

function on_playback_new_track(metadb: IFbMetadb) {
	vis_parts.forEach(p => invoke(p, "on_playback_new_track", metadb));
}

function on_selection_changed() {
	vis_parts.forEach(p => invoke(p, "on_selection_changed"));
}

function on_playlist_items_added(playlistIndex: number) {
	vis_parts.forEach(p => invoke(p, "on_playlist_items_added", playlistIndex));
}

function on_playlist_items_removed(playlistIndex: number) {
	vis_parts.forEach(p => invoke(p, "on_playlist_items_removed", playlistIndex));
}

function on_playlist_items_reordered(playlistIndex: number) {
	vis_parts.forEach(p =>
		invoke(p, "on_playlist_items_reordered", playlistIndex)
	);
}

function on_playlists_changed() {
	vis_parts.forEach(p => invoke(p, "on_playlists_changed"));
}

function on_playlist_switch() {
	vis_parts.forEach(p => invoke(p, "on_playlist_switch"));
}

function on_item_focus_change(playlistIndex: number, from: number, to: number) {
	vis_parts.forEach(p =>
		invoke(p, "on_item_focus_change", playlistIndex, from, to)
	);
}

function on_metadb_changed(metadbs: IFbMetadbList, fromHook: boolean) {
	vis_parts.forEach(p => invoke(p, "on_metadb_changed", metadbs, fromHook));
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
let systemCallbacks = {};

Object.assign(systemCallbacks, {
	on_size: on_size,
	on_paint: on_paint,
	on_mouse_move: on_mouse_move,
	on_mouse_lbtn_down: on_mouse_lbtn_down,
	on_mouse_lbtn_dblclk: on_mouse_lbtn_dblclk,
	on_mouse_lbtn_up: on_mouse_lbtn_up,
	on_mouse_rbtn_down: on_mouse_rbtn_down,
	on_mouse_rbtn_up: on_mouse_rbtn_up,
	on_mouse_wheel: on_mouse_wheel,
	on_mouse_leave: on_mouse_leave,
	on_focus: on_focus,
	on_key_down: on_key_down,
	on_key_up: on_key_up,
	on_char: on_char,
	on_playback_order_changed: on_playback_order_changed,
	on_playback_stop: on_playback_stop,
	on_playback_edited: on_playback_edited,
	on_playback_pause: on_playback_pause,
	on_playback_new_track: on_playback_new_track,
	on_selection_changed: on_selection_changed,
	on_playlist_items_added: on_playlist_items_added,
	on_playlist_items_removed: on_playlist_items_removed,
	on_playlist_items_reordered: on_playlist_items_reordered,
	on_playlist_switch: on_playlist_switch,
	on_playlists_changed: on_playlists_changed,
	on_item_focus_change: on_item_focus_change,
	on_metadb_changed: on_metadb_changed,
});

/**
 * Inject pre defined callback functions to global;
 */
Object.assign(globalThis_, systemCallbacks);

export const ui = {
	textRender: textRenderingHint,
	setRoot: setRoot,
	updateParts: updateParts,
	compareParts: compareParts,
	monitor: monitor,
};
