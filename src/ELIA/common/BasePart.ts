/**
 * A too simple way to generate component id;
 */
const get_cid = (() => {
	let count = 0;
	return () => ++count;
})();

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

export interface IBox {
	x: number;
	y: number;
	z?: number;
	width: number;
	height: number;
}

export interface TEST {
	parent: Component;
	children: Component[];
}


export class Component implements IBox, TEST, ICallbacks {
	readonly cid: number = get_cid();
	private _visible: boolean = true;
	private _shouldUpdateOnInit = true;
	private _shouldSortChildren = false;
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
	constructor(attrs: object) {
		Object.assign(this, attrs);
	}
	on_paint(gr: IGdiGraphics) { }
	on_size() { }
	on_init() { }
	on_click(x: number, y: number) { }
	addChild(node: Component) {
		if (!(node instanceof Component)) {
			throw new Error("Component.addChild: Invalid param.");
		}
		;
		if (node.parent != null) {
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
	setSize(x: number, y: number, width?: number, height?: number) {
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
	didUpdateOnInit() {
		this._shouldUpdateOnInit = false;
	}

	resetUpdateState() {
		this._shouldUpdateOnInit = true;
	}

	shouldUpdateOnInit() {
		return this._shouldUpdateOnInit;
	}

	onNotifyData(str: string, info: any) { }

	repaint() {
		window.RepaintRect(this.x, this.y, this.width, this.height);
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
export const textRenderingHint = useClearType ? 5 : useAntiAlias ? 4 : 0;