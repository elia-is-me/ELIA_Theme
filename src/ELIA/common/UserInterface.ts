import { isValidPlaylist } from "../ui/PlaylistView";
import { Component } from "./BasePart";

let partlist: Component[] = [];
let vis_parts: Component[] = [];
let root_part: Component;
let activeIdx: number = -1;
let focus_index: number = -1;
let active_part: Component;
let focus_part: Component;

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
	root_part = root;
	partlist = [];
	vis_parts = [];
	focus_index = -1;
	activeIdx = -1;
	focus_part = undefined;
	active_part = undefined;
};

const flatternVisibleParts = (rootPart: Component): Component[] =>
	flatternParts(rootPart).filter(part => part.isVisible());

function getHoverPart(parts: Component[], x: number, y: number) {
	for (let i = parts.length - 1; i >= 0; i--) {
		if (parts[i].trace(x, y)) {
			return parts[i];
		}
	}
	return null;
}

function getHoverIdx(parts: Component[], x: number, y: number) {
	for (let i = parts.length; i >= 0; i--) {
		if (parts[i].trace(x, y)) {
			return i;
		}
	}
	return -1;
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

function setActive(x: number, y: number) {
	const prev = active_part;
	active_part = getHoverPart(vis_parts, x, y);
	if (!compareParts(prev, active_part)) {
		invoke(prev, "on_mouse_leave");
		invoke(active_part, "on_mouse_move", x, y);
	}
}

function setFocus(x: number, y: number) {
	let prev = focus_part;
	focus_part = getHoverPart(vis_parts, x, y);
	if (!compareParts(prev, focus_part)) {
		invoke(prev, "on_change_focus", false);
		invoke(focus_part, "on_change_focus", true);
	}
}

const partIsVis = (part: Component) => part.isVisible();

function updateParts() {
	let cached = vis_parts;
	partlist = flatternParts(root_part);
	vis_parts = partlist.filter(partIsVis);
	
}

export const __ui = {
	"updateParts": updateParts,
}

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

const compareParts = (a: Component, b: Component) => {
	if (a == null && b == null) return true;
	if ((a == null && b != null) || (a != null && b == null)) return false;
	return a.cid == b.cid;
};
