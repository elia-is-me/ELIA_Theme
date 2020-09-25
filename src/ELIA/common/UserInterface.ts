import { isValidPlaylist } from "../ui/PlaylistView";
import { Component } from "./BasePart";
import { GetKeyboardMask, isFunction, KMask, StopReason, TextRenderingHint, VKeyCode } from "./common";

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

// const flatternVisibleParts = (rootPart: Component): Component[] =>
// 	flatternParts(rootPart).filter(part => part.isVisible());

function getHoverPart(parts: Component[], x: number, y: number) {
	for (let i = parts.length - 1; i >= 0; i--) {
		if (parts[i].trace(x, y)) {
			return parts[i];
		}
	}
	return null;
}

// function getHoverIdx(parts: Component[], x: number, y: number) {
// 	for (let i = parts.length; i >= 0; i--) {
// 		if (parts[i].trace(x, y)) {
// 			return i;
// 		}
// 	}
// 	return -1;
// }

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

}

function notify(message: string, data: any) {
	if (!partlist || partlist.length === 0) {
		return;
	}
	partlist.forEach(part => {
		invoke(part, "onNotifyData", message, data);
	});
}

let shouldUpdateVisbles = true;
let shouldSortChildren = true;

const useClearType = window.GetProperty('Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('Global.Font Antialias(Only when useClearType = false', true);
const textRenderingHint = useClearType ? TextRenderingHint.ClearTypeGridFit : useAntiAlias ? TextRenderingHint.AntiAlias : 0;

export const __ui = {
	"updateParts": updateParts,
}

function on_size(width: number, height: number) {
	if (!width || !height) {
		return;
	}
	rootPart.setBoundary(0, 0, width, height);
}

function on_paint(gr: IGdiGraphics) {
	gr.SetTextRenderingHint(textRenderingHint);

	for (let i = 0, len = vis_parts.length; i < len; i++) {
		vis_parts[i].on_paint(gr);
	}
}

let mouseCursor = {
	x: -1,
	y: -1
}

let lastPressedCoord = {
	x: -1,
	y: -1
}

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

function on_key_up(vkey: number) {

}

function on_char(code: number) {
	invoke(focusPart, "on_char", code);
}

/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assign
 * to it.  
 * It's commonly used way to create a `globalThis`.
 */
const globalThis_ = Function("return this")();

;[
	"on_playback_order_changed",
	"on_playback_stop",
	"on_playback_edited",
	"on_playback_pause",
	"on_playback_new_track",
	"on_selection_changed",
	"on_playlist_items_added",
	"on_playlist_items_removed",
	"on_playlist_items_reordered",
	"on_playlist_switch",
	"on_playlists_changed",
	"on_item_focus_change",
	"on_metadb_changed",
].forEach(name => {
	Object.assign(systemCallbacks, {
		name: (...args: any) => {
			vis_parts.forEach(part => {
				invoke(part, name, ...args);
			});
		}
	})
});


/**
 * These callback functions will automatically triggered by fb on various
 * events. since I do not know how to create global vars & functions, I decide
 * to assign them to a globalThis variable.
 */
let systemCallbacks = {
	// "on_paint": on_paint,
	// "on_size": on_size,
	// "on_mouse_move": on_mouse_move,
	// "on_mouse_lbtn_down": on_mouse_lbtn_down,
	// "on_mouse_lbtn_up": on_mouse_lbtn_up,
	// "on_mouse_lbtn_dblclk": on_mouse_lbtn_dblclk,
	// "on_mouse_leave": on_mouse_leave,
	// "on_mouse_rbtn_down": on_mouse_rbtn_down,
	// "on_mouse_rbtn_up": on_mouse_rbtn_up,
	// "on_mouse_wheel": on_mouse_wheel,
	// "on_focus": on_focus,
	// "on_key_down": on_key_down,
	// "on_char": on_char,
	// "on_playback_order_changed": on_playback_order_changed,
	// "on_playback_stop": on_playback_stop,
	// "on_playback_edited": on_playback_edited,
	// "on_playback_pause": on_playback_pause,
	// "on_playback_new_track": on_playback_new_track,
	// "on_selection_changed": on_selection_changed,
	// // "on_playlist_selection_changed": on_playlist_selection_changed,
	// "on_playlist_items_added": on_playlist_items_added,
	// "on_playlist_items_removed": on_playlist_items_removed,
	// "on_playlist_items_reordered": on_playlist_items_reordered,
	// "on_playlists_changed": on_playlists_changed,
	// "on_playlist_switch": on_playlist_switch,
	// "on_item_focus_change": on_item_focus_change,
	// "on_metadb_changed": on_metadb_changed,
};

// Object.assign(globalThis_, systemCallbacks);

// -----------------------------------------------------

export class UserInterface {
	parts: Component[] = [];
	visibleParts: Component[];
	rootPart: Component;
	activeId: number;
	activePart: Component;
	focusedPart: Component;
	focusedId: number;

	constructor(rootPart?: Component) {
		this.rootPart = rootPart;
		this.parts = [];
		this.visibleParts = [];
		this.activeId = -1;
		this.focusedId = -1;
		return this;
	}
	private flatternParts(rootPart: Component) {
		if (rootPart == null) {
			return [];
		}
		let children = rootPart.children;
		let results = [rootPart];
		for (let i = 0; i < children.length; i++) {
			results = results.concat(this.flatternParts(children[i]));
		}
		return results;
	}

	setRoot(rootPart: Component) {
		this.rootPart = rootPart;
		this.parts = [];
		this.visibleParts = [];
		this.activeId = -1;
		this.focusedId = -1;
	}

	private findVisibleParts(rootPart: Component): Component[] {
		if (!rootPart.isVisible()) return [];
		let children = rootPart.children;
		let visibleParts = [rootPart];
		for (let i = 0, len = children.length; i < len; i++) {
			if (children[i].isVisible()) {
				visibleParts = visibleParts.concat(this.findVisibleParts(children[i]));
			}
		}
		return visibleParts;
	}

	private findActivePart(visibleParts: Component[], x: number, y: number) {
		let len = visibleParts.length;
		for (let i = len - 1; i >= 0; i--) {
			if (visibleParts[i].trace(x, y)) {
				return i;
			}
		}
		return -1;
	}

	private getActive(visibleParts: Component[], x: number, y: number) {
		for (let i = visibleParts.length - 1; i >= 0; i--) {
			if (visibleParts[i].trace(x, y)) {
				return visibleParts[i];
			}
		}
		return undefined;
	}

	invokeActivePart(method: string, ...args: any[]) {
		const activePart = this.visibleParts[this.activeId];
		if (!activePart) return;
		let func = (<any>activePart)[method];
		return func == null ? null : func.apply(activePart, args);
	}

	invokeVisibleParts(method: string, ...args: any) {
		this.visibleParts.forEach(p =>
			this.invoke(p, method, args[0], args[1], args[2])
		);
	}

	invokeFocusedPart(method: string, ...args: any[]) {
		const focusedPart = this.visibleParts[this.focusedId];
		if (!focusedPart) {
			return;
		}
		let func = (<any>focusedPart)[method];
		return func == null ? null : func.apply(focusedPart, args);
	}

	invoke(part: Component, method: string, ...args: any) {
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

	invokeById(id: number, method: string, ...args: any) {
		return this.invoke(this.visibleParts[id], method, ...args);
	}

	setActive(x: number, y: number) {
		const deactiveId_ = this.activeId;
		const visibleParts = this.visibleParts;
		this.activeId = this.findActivePart(visibleParts, x, y);
		this.activePart = this.visibleParts[this.activeId];
		if (this.activeId !== deactiveId_) {
			this.invokeById(deactiveId_, "on_mouse_leave");
			this.invokeById(this.activeId, "on_mouse_move", x, y);
		}
	}

	setFocus(x: number, y: number) {
		// let defocusedId_ = this.focusedId;
		let prev_focus_part = this.focusedPart;
		this.focusedPart = this.getActive(this.visibleParts, x, y);
		this.focusedId = this.findActivePart(this.visibleParts, x, y);

		if (this.focusedId > -1) {
			// console.log(this.focusedPart.cid, this.visibleParts[this.focusedId].cid);
		}

		if (!compareParts(prev_focus_part, this.focusedPart)) {
			this.invoke(prev_focus_part, "on_change_focus", false);
			this.invoke(this.focusedPart, "on_change_focus", true);
		}

		// if (this.focusedId !== defocusedId_) {
		// 	this.invokeById(defocusedId_, "on_change_focus", false);
		// 	this.invokeById(this.focusedId, "on_change_focus", true);
		// }
	}

	setFocusPart(part: Component) {
		let defocusedId_ = this.focusedId;
		let partId = this.visibleParts.indexOf(part);
		if (partId > -1 && partId !== defocusedId_) {
			this.invokeById(defocusedId_, "on_change_focus", false);
			this.invokeById(partId, "on_change_focus", true);
		}
	}
	updateParts() {
		let visiblePartsCached = this.visibleParts;
		this.visibleParts = this.findVisibleParts(this.rootPart);
		this.visibleParts
			.filter(p => visiblePartsCached.indexOf(p) === -1)
			.forEach(p => {
				p.on_init();
				p.didUpdateOnInit();
			});
		visiblePartsCached
			.filter(p => this.visibleParts.indexOf(p) === -1)
			.forEach(p => {
				p.resetUpdateState();
			});
		this.parts = this.flatternParts(this.rootPart);
	}

	_forceUpdate() {
		this.visibleParts = this.findVisibleParts(this.rootPart);
		this.parts = this.flatternParts(this.rootPart);
	}

	onReady?: () => void;
}

export const ui = new UserInterface();

export const notifyOthers = (message: string, data?: any) => {
	console.log(message, data);
	if (ui.parts == null || ui.parts.length === 0) {
		return;
	}
	ui.parts.forEach(part => {
		part.onNotifyData && part.onNotifyData(message, data);
	});
};

