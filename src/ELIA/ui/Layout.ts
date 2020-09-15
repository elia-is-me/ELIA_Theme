import { Component } from "../common/BasePart";
import { TopBar } from "./TopbarView";
import { PlaybackControlView } from "./PlaybackControlView";
import { PlaylistManagerView, PLM_Properties } from "./PlaylistManagerView";
import { PlaylistView } from "./PlaylistView";
import { scale, ThrottledRepaint } from "../common/common";
import { AddPlaylistPanel } from "./AddPlaylistPanel";


/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assign
 * to it.  
 * It's a commonly used way to create a `globalThis`.
 */
const globalThis_ = Function("return this")();

const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const PLMAN_MIN_WIDTH = PLM_Properties.minWidth;

const enum ViewStates {
	Default,
}

export class Layout extends Component {
	topbar: TopBar;
	playbackControlBar: PlaybackControlView;
	playlistManager: PlaylistManagerView;
	playlistView: PlaylistView
	addPlaylistPanel: AddPlaylistPanel;

	viewState: ViewStates;

	constructor(options: {
		topbar: TopBar;
		playbackControlBar: PlaybackControlView;
		playlsitManager: PlaylistManagerView;
		playlistView: PlaylistView;
		addPlaylistPanel: AddPlaylistPanel;
	}) {
		super({})

		this.viewState = ViewStates.Default;

		//
		this.topbar = options.topbar;
		this.playbackControlBar = options.playbackControlBar;
		this.playlistManager = options.playlsitManager;
		this.playlistView = options.playlistView;
		this.addPlaylistPanel = options.addPlaylistPanel;

		this.addChild(this.topbar);
		this.addChild(this.playbackControlBar);
		this.addChild(this.playlistManager);
		this.addChild(this.playlistView);
		this.addChild(this.addPlaylistPanel);

		this.setPartsZIndex(this.viewState);
		this.setPartsVisible(this.viewState);
	}

	on_size() {
		this.setPartsLayout(this.viewState);
	}

	setPartsVisible(viewState: ViewStates) {
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;

		if (viewState === ViewStates.Default) {
			this.playlistManager.visible = true;
			this.playlistView.visible = true;
		} else { }
	}

	setPartsLayout(viewState: ViewStates) {
		const { x, y, width, height } = this;

        /**
         * Set pinned parts;
         */
		this.topbar.setBoundary(x, y, width, TOPBAR_HEIGHT);
		this.playbackControlBar.setBoundary(x, x + height - CONTROL_BAR_HEIGHT, width, CONTROL_BAR_HEIGHT);

        /**
         * Set others;
         */
		const { playlistView, playlistManager } = this;
		const listY = this.topbar.y + this.topbar.height;
		const listHeight = this.height - this.topbar.height - this.playbackControlBar.height;

		switch (viewState) {
			case ViewStates.Default:
				playlistManager.visible &&
					playlistManager.setBoundary(x, listY, PLMAN_MIN_WIDTH, listHeight);
				if (playlistManager.visible) {
					playlistView.setBoundary(
						playlistManager.x + playlistManager.width,
						listY,
						this.x + this.width - (playlistManager.x + playlistManager.width),
						listHeight
					);
				} else {
					playlistView.setBoundary(x, listY, width, listHeight);
				}
				break;
			default:
				break;
		}

		if (this.addPlaylistPanel.visible) {
			this.addPlaylistPanel.setPosition(
				this.x + (this.width - this.addPlaylistPanel.width) / 2,
				this.y + (this.height - this.addPlaylistPanel.height) / 2);
		}
	}

    /**
     * TODO
     */
	private setPartsZIndex(viewState: ViewStates) {
		this.topbar.z = 100;
		this.playbackControlBar.z = 10;
		this.playlistView.z = 0;
		this.playlistManager.z = 0;
		this.addPlaylistPanel.z = 1000;
	}

    /**
     * TODO;
     */
	setViewState(newState: any) { }

	on_paint(gr: IGdiGraphics) {

	}

	ready?: () => void;
	onReady?: () => void;

	onNotifyData(message: string, data: any) {
		switch (message) {
			case "Toggle.PlaylistManager":
				this.playlistManager.visible = !this.playlistManager.visible;
				if (this.playlistManager.visible) {
					this.playlistManager.on_init();
				}
				this.on_size();
				layoutManager.updateParts();
				this.repaint();
				break;
			case "Show.AddPlaylistPanel":
				this.addPlaylistPanel.visible = true;
				this.on_size();
				layoutManager.updateParts();
				this.repaint();
				break;
		}
	}
}

export class PartsManager {

	parts: Component[];
	visibleParts: Component[];
	rootPart: Component;

	private activeId: number;
	activePart: Component;
	focusedPart: CompositionEvent;
	private focusedId: number;

	constructor(rootPart?: Component) {
		if (rootPart) {
			this.rootPart = rootPart;
			this.parts = [];
			this.visibleParts = [];
			this.activeId = -1;
			this.focusedId = -1;
		}
		return this;
	}

	private flatternParts(rootPart: Component) {
		if (rootPart == null) return [];
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

	invokeById(partId: number, method: string, ...args: any[]) {
		const part = this.visibleParts[partId];
		if (!part) return;
		let func = (<any>part)[method];
		return func == null ? null : func.apply(part, args)

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

	setActive(x: number, y: number) {
		const deactiveId_ = this.activeId;
		const visibleParts = this.visibleParts;

		this.activeId = this.findActivePart(visibleParts, x, y);
		this.activePart = this.visibleParts[this.activeId];

		if (this.activeId !== deactiveId_) {
			this.invokeById(deactiveId_, "on_mouse_leave")
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
}

export const layoutManager = new PartsManager();

export function notifyOthers(message: string, data?: any) {

	let parts = layoutManager.parts;

	if (parts == null || parts.length === 0) {
		return;
	}

	parts.forEach(part => {
		part.onNotifyData && part.onNotifyData(message, data)
	});


}
