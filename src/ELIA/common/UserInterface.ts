import { GetKeyboardMask, isFunction, KMask, lastIndex, RGBA, scale, TextRenderingHint, VKeyCode } from "./common";
import { Component, IBoxModel } from "./BasePart";

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

const findVisibleParts = (part: Component): Component[] => {
	if (part == null || !part.isVisible()) {
		return [];
	}
	let children = part.children;
	let result = [part];
	for (let i = 0, len = children.length; i < len; i++) {
		if (children[i].isVisible()) {
			result = result.concat(findVisibleParts(children[i]));
		}
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


function _getHoverPart(root: Component, x: number, y: number): Component {
	if (!root || !root.trace(x, y)) {
		return ;
	}
	const children = root.children;
	const resultIndex = lastIndex(children, n=> n.trace(x, y));
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

const compareParts = (a: Component, b: Component) => {
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

function updateParts() {
	let cached = vis_parts;
	partlist = flatternParts(rootPart);
	vis_parts = findVisibleParts(rootPart);

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
	partlist.forEach(p => monitor(p));
	console.log("Part COUNT: ", partlist.length, " | ", vis_parts.length);
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

class DndMask implements IBoxModel {
	visible = false;
	x = 0;
	y = 0;
	width = 0;
	height = 0;

	private _lineWidth = scale(2);

	setBoundary(x: number, y: number, width: number, height: number) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	draw(gr: IGdiGraphics) {
		if (!this.visible) return;
		gr.DrawRect(this.x, this.y, this.width - this._lineWidth, this.height - this._lineWidth, this._lineWidth, RGBA(0, 132, 255, 200));
	}
}

export const dndMask = new DndMask();

function on_size(width: number, height: number) {
	if (!width || !height) {
		return;
	}
	rootPart.setBoundary(0, 0, width, height);
	updateParts();
}

const profiler = fb.CreateProfiler("MAIN");
let time = 0;
let count = 0;

function drawNode(node: Component, gr: IGdiGraphics) {
	if (!node.visible) {
		return;
	}

	node.on_paint(gr);

	for (let i = 0, len = node.children.length; i < len; i++) {
		drawNode(node.children[i], gr);
	}
}

function on_paint(gr: IGdiGraphics) {
	profiler.Reset();
	gr.SetTextRenderingHint(textRenderingHint);

	// Draw visible parts;
	drawNode(rootPart, gr);

	// draw dnd mask;
	if (dropTargetPart && dndMask.visible) {
		dndMask.draw(gr);
	}

	if (count < 20) {
		count++;
		time += profiler.Time;
	} else {
		// if (time / 20 > 1) console.log("MAIN MONITOR: ", time / 20, count);
		count = 0;
		time = 0;
	}
}

function monitor(object: Component) {
	let __dev__ = window.GetProperty("__DEV__", false);
	if (!__dev__) return;
	if (!object || object.isMonitor) return;

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
			if (object.className === "Layout") {
				console.log("-----------------------------");
			}
			if (time / 20 > 1)
				console.log(`${object.className}, ${object.cid}: `, time / 20);
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

function on_key_up(vkey: number) { }

function on_char(code: number) {
	invoke(focusPart, "on_char", code);
}

function findDropTargetPart(x: number, y: number) {
	let active_part = _getHoverPart(rootPart, x, y);
	if (!active_part) {
		return null;
	}

	if (isFunction((active_part as any)["on_drag_enter"])) {
		return active_part;
	} else {
		let temp_part = active_part;
		while (temp_part.parent) {
			if (isFunction((temp_part.parent as any)["on_drag_enter"])) {
				return temp_part.parent;
			}
			temp_part = temp_part.parent;
		}
		return null;
	}
}

let dropTargetPart: Component = null;

function on_drag_enter(action: IDropTargetAction, x: number, y: number) {
	console.log("on_drag_enter, ", new Date());
	dropTargetPart = findDropTargetPart(x, y);
	if (dropTargetPart) {
		invoke(dropTargetPart, "on_drag_enter", action, x, y);
	}
}

function on_drag_leave() {
	console.log("on_drag_leave", new Date());
	if (dropTargetPart) {
		invoke(dropTargetPart, "on_drag_leave");
	}
	dropTargetPart = undefined;
}

function on_drag_over(action: IDropTargetAction, x: number, y: number) {
	let prevDropTargetPart = dropTargetPart;
	dropTargetPart = findDropTargetPart(x, y);
	if (!compareParts(prevDropTargetPart, dropTargetPart)) {
		invoke(prevDropTargetPart, "on_drag_leave");
		invoke(dropTargetPart, "on_drag_enter", action, x, y);
	}
	invoke(dropTargetPart, "on_drag_over", action, x, y);
}

function on_drag_drop(action: IDropTargetAction, x: number, y: number) {
	dropTargetPart = findDropTargetPart(x, y);
	if (dropTargetPart) {
		invoke(dropTargetPart, "on_drag_drop", action, x, y);
		dropTargetPart = undefined;
	}
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

function on_volume_change(val: number) {
	vis_parts.forEach(p =>
		invoke(p, invoke(p, "on_volume_change", val)));
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
	on_drag_enter: on_drag_enter,
	on_drag_leave: on_drag_leave,
	on_drag_over: on_drag_over,
	on_drag_drop: on_drag_drop,
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
	on_volume_change: on_volume_change,
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
	setFocusPart: setFocusPart,
};
