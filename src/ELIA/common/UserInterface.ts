import { Component } from "./BasePart";

export class UserInterface {
	parts: Component[];
	visibleParts: Component[];
	rootPart: Component;
	activeId: number;
	activePart: Component;
	focusedPart: CompositionEvent;
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

	invokeActivePart(method: string, ...args: any[]) {
		const activePart = this.visibleParts[this.activeId];
		if (!activePart) return;
		let func = (<any>activePart)[method];
		return func == null ? null : func.apply(activePart, args);
  }

	invokeVisibleParts(method: string, ...args: any) {
		this.visibleParts.forEach(p => this.invoke(p, method, args[0], args[1], args[2]));
  }

	invokeFocusedPart(method: string, ...args: any[]) {
		const focusedPart = this.visibleParts[this.focusedId];
		if (!focusedPart) {
			return;
		}
		let func = (<any>focusedPart)[method];
		return func == null ? null : func.apply(focusedPart, args);
	}
	private invoke(part: Component, method: string, ...args: any) {
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
		return this.invoke(this.visibleParts[id], method, args);
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
		let defocusedId_ = this.focusedId;
		this.focusedId = this.findActivePart(this.visibleParts, x, y);
		if (this.focusedId !== defocusedId_) {
			this.invokeById(defocusedId_, "on_change_focus", false);
			this.invokeById(this.focusedId, "on_change_focus", true);
		}
	}

	setFocusPart(part: Component) {
		let defocusedId_ = this.focusedId;
		let partId = this.visibleParts.indexOf(part);
		if (partId > -1 && partId !== defocusedId_) {
			this.invokeById(defocusedId_, "on_change_focus", false);
			this.invokeById(partId, "on_change_focuse", true);
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

	notify(message: string, data?: any) {
		console.log(message, data);
		if (this.parts == null || this.parts.length === 0) {
			return;
		}
		this.parts.forEach(part => {
			part.onNotifyData && part.onNotifyData(message, data);
		});
	}
}

export const ui = new UserInterface();
export const notifyOthers = ui.notify;
