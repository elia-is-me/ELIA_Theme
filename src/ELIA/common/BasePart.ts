import { isObject, TextRenderingHint } from "./common";
import { UserInterface } from "./UserInterface";

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

export interface IPaddings {
	top: number;
	bottom: number;
	left: number;
	right: number;
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
	on_playlists_changed?: () => void;
	on_playlist_switch?: () => void;
	on_metadb_changed?: (metadbs?: IFbMetadbList, fromhook?: boolean) => void;
}

export abstract class Component implements IBoxModel, ICallbacks {
	readonly cid: number = get_cid();
	private _visible: boolean = true;
	private _shouldUpdateOnInit = true;
	private _shouldSortChildren = true;

	// offset to smp_panel's left;
	x: number = 0;

	// offset to smp_panel's top;
	y: number = 0;

	// offset to parent part's left;
	private _clientX: number = 0;

	// offset to parent part's top;
	private _clientY: number = 0;

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
	on_click(x: number, y: number) { }
	addChild(node: Component) {
		if (!(node instanceof Component)) {
			throw new Error("Component.addChild: Invalid param.");
		}
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
			console.log("fail to remove child");
			return;
		} else {
			node.parent = null;
			this.children = this.children.filter((child) => child.parent === this);
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
			this._clientX = this.x - this.parent.x;
			this._clientY = this.y - this.parent.y;
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

	setSize(size: { width?: number; height?: number }): void;
	setSize(width: number, height: number): void;
	setSize(arg_1: number | { width?: number; height?: number }, arg_2?: number) {
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
			let width = arg_1.width || this.width;
			let height = arg_1.height || this.height;
			this.setSize(width, height);
		}
	}

	/**
	 * setPosition will not only update its self's position, but also its
	 * children's position offset to smp_panel, but children's position offset to
	 * parent will keep.
	 */
	setPosition(x: number, y: number): void;
	setPosition(pos: { x?: number, y?: number }): void;
	setPosition(x: number | { x?: number; y?: number }, y?: number) {
		if (typeof x == "number") {
			this.x = x;
			this.y = y;
			if (this.parent) {
				this._clientX = this.x - this.parent.x;
				this._clientY = this.y - this.parent.y;
			}
			this.children.forEach(child => {
				child.setPosition(this.x + child._clientX, this.y + child._clientY);
			})
		} else {
			this.setPosition(isNaN(x.x) ? this.x : x.x, isNaN(x.y) ? this.y : x.y);
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
		window.Repaint();
	}
}
