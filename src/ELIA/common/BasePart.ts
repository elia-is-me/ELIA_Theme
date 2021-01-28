import { findLastIndex, isObject } from "./common";

/**
 * A too simple way to generate component id;
 */
const getCid = (() => {
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
	on_library_items_changed?(metadbs?: IFbMetadbList): void;
	on_library_items_added?(metadbs?: IFbMetadbList): void;
	on_library_items_removed?(metadbs?: IFbMetadbList): void;
}

export interface IBoxModel {
	x: number;
	y: number;
	z?: number;
	width: number;
	height: number;
}

export interface IPaddings {
	top: number;
	bottom: number;
	left: number;
	right: number;
}

export interface IInjectableCallbacks {
	on_init?: () => void;
	on_size?: () => void;
	on_click?: (x?: number, y?: number) => void;
	on_playback_order_changed?: (newOrder?: number) => void;
	on_playback_stop?: (reason?: number) => void;
	on_playback_edited?: () => void;
	on_playback_pause?: (isPaused?: boolean) => void;
	on_playback_nrack?: (metadb?: IFbMetadb) => void;
	on_playlists_changed?: () => void;
	on_playlist_switch?: () => void;
	on_metadb_changed?: (metadbs?: IFbMetadbList, fromhook?: boolean) => void;
	[ke: string]: Function
}

export abstract class Component implements IBoxModel, ICallbacks {
	readonly cid: number = getCid();
	readonly __is_component__ = "__is_component__";
	private _visible: boolean = true;
	private _shouldUpdateOnInit = true;
	private _shouldSortChildren = true;

	isMonitor: boolean = false;
	className: string = "Component";
	grabFocus: boolean = true;

	type: number = 0;

	// offset to smp_panel's left;
	x: number = 0;

	// offset to smp_panel's top;
	y: number = 0;

	// offset to parent part's left;
	private _left: number = 0;

	// offset to parent part's top;
	private _top: number = 0;

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
	paddings: IPaddings = {
		top: 0,
		bottom: 0,
		left: 0,
		right: 0,
	};

	constructor(attrs: object, callbacks?: IInjectableCallbacks) {
		this.z = 0;
		Object.assign(this, attrs);
		if (isObject(callbacks)) {
			Object.assign(this, callbacks);
		}
	}
	/**
	 * 'on_init' 考虑的是当一个部件从隐藏切换到显示后，有一个默认的方法更新/初始化该部件。这么做是否合理现在值得怀疑。
	 */
	on_init() { }
	on_paint(gr: IGdiGraphics) { }
	on_size() { }
	on_click(x?: number, y?: number) { }

	private _insertChild(node: Component) {
		if (!node) return;
		let idx = findLastIndex(this.children, item => item.z <= node.z) + 1;
		this.children.splice(idx, 0, node);
	}

	addChild(node: Component) {
		if (!node) {
			return;
		}

		if (node.parent) {
			node.parent.removeChild(node);
		}

		node.parent = this;
		this._insertChild(node);
		this.resetUpdateState();
	}

	removeChild(node: Component) {
		if (!node || node.parent !== this) {
			console.log("fail to remove child");
			return;
		} else {
			node.parent = null;
			this.children.splice(this.children.indexOf(node), 1);
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
		return (
			this.isVisible() &&
			x > this.x &&
			x <= this.x + this.width &&
			y > this.y &&
			y <= this.y + this.height
		);
	}

	/**
	 * generally children's position should be updated both when their parent's
	 * position or size changed, so use `setBoundry' or `setPosition' in a parent's
	 * `on_size' method.
	 */
	setBoundary(x: number, y: number, width: number, height: number) {
		let visibleBefore_ = this.isVisible();
		this.x = x;
		this.y = y;
		if (this.parent) {
			this._left = this.x - this.parent.x;
			this._top = this.y - this.parent.y;
		}
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

	setSize(width?: number, height?: number) {
		if (width == null && height == null) {
			// Refresh layout;
			this.isVisible() && this.on_size && this.on_size();
			return;
		} else {
			let _visibleBefore = this.isVisible();
			if (width != null) this.width = width;
			if (height != null) this.height = height;
			let _visibleNow = this.isVisible();
			_visibleNow && this.on_size && this.on_size();
			if (_visibleNow != _visibleBefore) {
				this._shouldUpdateOnInit = true;
			}
			if (this._shouldSortChildren) {
				this.children.sort(sortByZIndex);
				this._shouldSortChildren = false;
			}
		}
	}

	/**
	 * setPosition will not only update its self's position, but also its
	 * children's position offset to smp_panel, but children's position offset to
	 * parent will keep.
	 */
	setPosition(x?: number, y?: number): void {
		if (x == null && y == null) return;
		if (x != null) this.x = x;
		if (y != null) this.y = y;
		if (this.parent) {
			this._left = this.x - this.parent.x;
			this._top = this.y - this.parent.y;
		}
		this.children.forEach(child => {
			child.setPosition(this.x + child._left, this.y + child._top);
		});
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

	onNotifyData?(message: string, data?: any) { }

	repaint() {
		window.Repaint();
	}
}
