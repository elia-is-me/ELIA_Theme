import { Component } from "../common/BasePart";
import { TopBar } from "./TopbarView";
import { PlaybackControlView } from "./PlaybackControlView";
import { PlaylistManagerView, PLM_Properties } from "./PlaylistManagerView";
import { PlaybackQueue } from "./PlaylistView";
import { scale } from "../common/common";


/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assign
 * to it.  
 * It's commonly used way to create a `globalThis`.
 */
const globalThis_ = Function("return this")();

const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const plmanMinWidth = PLM_Properties.minWidth;

enum ViewStates {
	default,
}

export class Layout extends Component {
	topbar: TopBar;
	playbackControlBar: PlaybackControlView;
	playlistManager: PlaylistManagerView;
	playlistView: PlaybackQueue

	viewState: ViewStates;

	constructor(options: {
		topbar: TopBar;
		playbackControlBar: PlaybackControlView;
		playlsitManager: PlaylistManagerView;
		playlistView: PlaybackQueue;
	}) {
		super({})

		this.viewState = ViewStates.default;

		//
		this.topbar = options.topbar;
		this.playbackControlBar = options.playbackControlBar;
		this.playlistManager = options.playlsitManager;
		this.playlistView = options.playlistView;

		this.addChild(this.topbar);
		this.addChild(this.playbackControlBar);
		this.addChild(this.playlistManager);
		this.addChild(this.playlistView);

		this.setPartsZIndex(this.viewState);
	}

	on_size() {
		this.setPartsVisible(this.viewState);
		this.setPartsLayout(this.viewState);
	}

	setPartsVisible(viewState: ViewStates) {
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;

		if (viewState === ViewStates.default) {
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
			case ViewStates.default:
				playlistManager.setBoundary(x, listY, plmanMinWidth, listHeight);
				playlistView.setBoundary(x + playlistManager.width, listY, width - playlistManager.width, listHeight);
				break;
			default:
				break;
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
	}

    /**
     * TODO;
     */
	setViewState(newState: any) { }

	on_paint(gr: IGdiGraphics) {

	}
}

export class PartsManager {
	parts: Component[];
	visibleParts: Component[];
	rootPart: Component;

	private activeId: number;
	activePart: Component;

	constructor(rootPart: Component) {
		this.rootPart = rootPart;
		this.parts = [];
		this.visibleParts = [];
		this.activeId = -1;
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

	invokeVisibleParts(method: string, ...args: any[]) {
		this.visibleParts.forEach(p => this.invoke(p, method, args));
	}

	private invoke(part: Component, method: string, ...args: any[]) {
		if (!part) return;
		let func = (<any>part)[method];
		return func == null ? null : func.apply(part, args);
	}

	activate(x: number, y: number) {
		const deactiveId_ = this.activeId;
		const visibleParts = this.visibleParts;

		this.activeId = this.findActivePart(visibleParts, x, y);
		this.activePart = this.visibleParts[this.activeId];

		if (this.activeId !== deactiveId_) {
			this.invokeById(deactiveId_, "on_mouse_leave")
			this.invokeById(this.activeId, "on_mouse_move", x, y);
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
	}
}