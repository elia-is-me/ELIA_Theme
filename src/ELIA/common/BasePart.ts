import { isObject, TextRenderingHint } from "./common";
import { PartsManager } from "../ui/Layout";
import { sidebarColors } from "../ui/Theme";

/**
 * A too simple way to generate component id;
 */
const get_cid = (() => {
	let count = 0;
	return () => ++count;
})();

/**
 * Used by a component part to sort it's children parts.
 */
const sortByZIndex = (a: Component, b: Component) => a.z - b.z;

export interface ICallbacks {
	on_paint: (gr: IGdiGraphics) => void;
	on_size?: () => void;
	on_mouse_move?: (x: number, y: number) => void;
	on_mouse_lbtn_down?: (x: number, y: number) => void;
	on_mouse_lbtn_up?: (x: number, y: number) => void;
	on_mouse_lbtn_dblclk?: (x: number, y: number) => void;
	on_mouse_rbtn_down?: (x: number, y: number) => void;
	on_mouse_rbtn_up?: (x: number, y: number) => void;
	on_mouse_leave?: () => void;
	on_mouse_wheel?: (step: number) => void;
	on_char?: (code: number) => void;
	on_focus?: (focus: boolean) => void;
	on_key_down?: (vkey: number) => void;
	on_key_up?: (vkey: number) => void;
}

export interface IBoxModel {
	x: number;
	y: number;
	z?: number;
	width: number;
	height: number;
}

export interface IInjectableCallbacks {
	on_init?: () => void;
	on_size?: () => void;
	on_click?: (x: number, y: number) => void;
	on_playback_order_changed?: (newOrder?: number) => void;
	on_playback_stop?: (reason?: number) => void;
	on_playback_edited?: () => void;
	on_playback_pause?: (isPaused?: boolean) => void;
	on_playback_new_track?: (metadb?: IFbMetadb) => void;
	// on_playlist_items_added?:(playlistIndex?: number) => void;
	// on_playlist_items_removed?:(playlistIndex?: number) => void;
	// on_playlist_items_reordered?: (playlistIndex?: number) => void;
	on_playlists_changed?: () => void;
	on_playlist_switch?: () => void;
	on_metadb_changed?: (metadbs?: IFbMetadbList, fromhook?: boolean) => void;
}

export abstract class Component implements IBoxModel, ICallbacks {
	readonly cid: number = get_cid();
	private _visible: boolean = true;
	private _shouldUpdateOnInit = true;
	private _shouldSortChildren = true;
	x: number = 0;
	y: number = 0;
	private _zIndex: number = 0;
	get z() {
		return this._zIndex;
	}
	set z(zIndex: number) {
		if (this.z !== zIndex) {
			this._zIndex = zIndex;
			this.parent && (this.parent._shouldSortChildren = true);
		}
	}
	width: number = 0;
	height: number = 0;
	parent: Component;
	children: Component[] = [];
	manager: PartsManager;
	constructor(attrs: object, callbacks?: IInjectableCallbacks) {
		this.z = 0;
		Object.assign(this, attrs);
		if (isObject(callbacks)) {
			Object.assign(this, callbacks)
		}
	}
	/**
	 * 'on_init' 考虑的是当一个部件从隐藏切换到显示后，有一个默认的方法更新/初始化该部件。这么做是否合理现在值得怀疑。
	 */
	on_init() { }
	on_paint(gr: IGdiGraphics) { }
	on_size() { }
	on_click(x: number, y: number) { }
	addChild(node: Component) {
		if (!(node instanceof Component)) {
			throw new Error("Component.addChild: Invalid param.");
		}
		;
		if (node.parent != null && node.parent !== this) {
			node.parent.removeChild(node);
		}
		node.parent = this;
		this.children.push(node);
		this._shouldSortChildren = true;
		this.resetUpdateState();
	}
	removeChild(node: Component) {
		if (!(node instanceof Component) || node.parent !== this) {
			return;
		}
		else {
			node.parent = null;
			this.children = this.children.filter(child => child.parent === this);
		}
		this.resetUpdateState();
	}
	isVisible() {
		return this._visible && this.width > 0 && this.height > 0;
	}
	get visible() {
		return this._visible;
	}
	set visible(val: boolean) {
		if (val !== this._visible) {
			this._visible = val;
			this._shouldUpdateOnInit = true;
		}
	}
	trace(x: number, y: number) {
		return this.isVisible()
			&& x > this.x && x <= this.x + this.width
			&& y > this.y && y <= this.y + this.height;
	}
	setBoundary(x: number, y: number, width: number, height: number) {
		let visibleBefore_ = this.isVisible();
		this.x = x;
		this.y = y;
		if (width != null) {
			this.width = width;
			this.height = height;
		}
		let visibleNow_ = this.isVisible();
		if (visibleNow_) {
			this.on_size && this.on_size();
		}
		if (visibleNow_ !== visibleBefore_) {
			this._shouldUpdateOnInit = true;
		}
		if (this._shouldSortChildren) {
			this.children.sort(sortByZIndex);
			this._shouldSortChildren = false;
		}
	}

	setSize(size: { width?: number; height?: number }): void;
	setSize(width: number, height: number): void;
	setSize(arg_1: number | { width?: number; height?: number }, arg_2?: number): any {
		if (typeof arg_1 == "number") {
			let visibleBefore_ = this.isVisible();
			this.width = arg_1;
			this.height = arg_2;

			let visibleNow_ = this.isVisible();
			if (visibleNow_) {
				this.on_size && this.on_size();
			}

			if (visibleNow_ !== visibleBefore_) {
				this._shouldUpdateOnInit = true;
			}

			if (this._shouldSortChildren) {
				this.children.sort(sortByZIndex);
				this._shouldSortChildren = false;
			}
		} else if (typeof arg_1 == "object") {
			let width = (arg_1.width || this.width);
			let height = (arg_1.height || this.height);
			this.setSize(width, height);
		}
	}

	setPosition(x: number, y: number) {
		this.x = x;
		this.y = y;
		this.on_size && this.on_size();
	}

	setDimension(width: number, height: number) {
		let visibilityBefore_ = this.isVisible();
		this.width = width;
		this.height = height;
		let visibilityNow_ = this.isVisible();

		if (visibilityNow_) {
			this.on_size();
		}

		if (visibilityNow_ !== visibilityBefore_) {
			this._shouldUpdateOnInit = true;
		}

		if (this._shouldSortChildren) {
			this.children.sort(sortByZIndex)
		}
	}

	didUpdateOnInit() {
		this._shouldUpdateOnInit = false;
	}

	resetUpdateState() {
		this._shouldUpdateOnInit = true;
	}

	shouldUpdateOnInit() {
		return this._shouldUpdateOnInit;
	}

	onNotifyData?(str: string, info: any) { }

	repaint() {
		// window.RepaintRect(this.x, this.y, this.width, this.height);
		window.Repaint();
	}
}

export interface IPaddings {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
}

const useClearType = window.GetProperty('_Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('_Global.Font Antialias(Only when useClearType = false', true);
export const textRenderingHint = useClearType ? TextRenderingHint.ClearTypeGridFit : useAntiAlias ? TextRenderingHint.AntiAlias : 0;