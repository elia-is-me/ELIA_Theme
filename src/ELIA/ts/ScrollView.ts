import { Component } from "./BasePart";
import { scale } from "./Common";

class Bezier {
	scroll: (r: any) => any;
	full: any;
	step: any;
	bar: (r: any) => any;
	barFast: (r: any) => any;
	inertia: (r: any) => any;
	constructor() {
		const i = 4,
			c = 0.001,
			o = 1e-7,
			v = 10,
			l = 11,
			s = 1 / (l - 1),
			n = typeof Float32Array === "function";
		function e(r: number, n: number) {
			return 1 - 3 * n + 3 * r;
		}
		function u(r: number, n: number) {
			return 3 * n - 6 * r;
		}
		function a(r: number) {
			return 3 * r;
		}
		function w(r: number, n: number, t: number) {
			return ((e(n, t) * r + u(n, t)) * r + a(n)) * r;
		}
		function y(r: number, n: number, t: number) {
			return 3 * e(n, t) * r * r + 2 * u(n, t) * r + a(n);
		}
		function h(r: number, n: number, t: number, e: number, u: number) {
			let a,
				f,
				i = 0;
			do {
				f = n + (t - n) / 2;
				a = w(f, e, u) - r;
				if (a > 0) {
					t = f;
				} else {
					n = f;
				}
			} while (Math.abs(a) > o && ++i < v);
			return f;
		}
		function A(r: number, n: number, t: number, e: number) {
			for (let u = 0; u < i; ++u) {
				const a = y(n, t, e);
				if (a === 0) {
					return n;
				}
				const f = w(n, t, e) - r;
				n -= f / a;
			}
			return n;
		}
		function f(r: number) {
			return r;
		}
		function bezier(i: number, t: number, o: number, e: number) {
			if (!(0 <= i && i <= 1 && 0 <= o && o <= 1)) {
				throw new Error("Bezier x values must be in [0, 1] range");
			}
			if (i === t && o === e) {
				return f;
			}
			const v = n ? new Float32Array(l) : new Array(l);
			for (let r = 0; r < l; ++r) {
				v[r] = w(r * s, i, o);
			}
			function u(r: number) {
				const e = l - 1;
				let n = 0,
					t = 1;
				for (; t !== e && v[t] <= r; ++t) {
					n += s;
				}
				--t;
				const u = (r - v[t]) / (v[t + 1] - v[t]),
					a = n + u * s,
					f = y(a, i, o);
				if (f >= c) {
					return A(r, a, i, o);
				} else if (f === 0) {
					return a;
				} else {
					return h(r, n, n + s, i, o);
				}
			}
			return function r(n: number) {
				if (n === 0) {
					return 0;
				}
				if (n === 1) {
					return 1;
				}
				return w(u(n), t, e);
			};
		}
		this.scroll = bezier(0.25, .1, .25, 1);
		this.full = this.scroll;
		this.step = this.scroll;
		this.bar = bezier(0.165, 0.84, 0.44, 1);
		this.barFast = bezier(0.19, 1, 0.22, 1);
		this.inertia = bezier(0.23, 1, 0.32, 1);
	}
}

let ease = new Bezier();

/**
 * reference: Library Tree(https://hydrogenaud.io/index.php?topic=110938.0) by Wilb;
 */
export abstract class ScrollView extends Component {
	className = "ScrollView";
	totalHeight: number;
	scrolling: boolean = false;
	smooth: boolean = false;
	private scroll_: number = 0;
	private timerId: number = -1;
	constructor(attrs: object) {
		super(attrs);
	}
	get scroll() {
		return this.scroll_;
	}
	set scroll(val: number) {
		if (val !== this.scroll) {
			this.scroll_ = this.checkscroll(val);
			this.onDidChangeScroll(val);
		}
	}
	/**
	 * Overwrite it if want to do something after scroll value changed.
	 */
	onDidChangeScroll(val: number) { }
	checkscroll(val: number) {
		if (val > this.totalHeight - this.height) {
			val = this.totalHeight - this.height;
		}
		if (this.totalHeight < this.height || val < 0) {
			val = 0;
		}
		return val;
	}

	private draw_timer: number | null;
	private start: number;
	private delta: number;
	private elap: number;
	private clock: number;

	private scroll_timer = () =>
		(this.draw_timer = window.SetInterval(() => {
			if (this.width < 1 || !window.IsVisible) return;
			this.smooth_scroll();
		}, 16));

	private scroll_finish = () => {
		if (!this.draw_timer) return;
		this.scroll = this.delta;
		clearInterval(this.draw_timer);
		this.draw_timer = null;
		this.repaint();

	}

	private smooth_scroll = () => {
		let duration = this.start - this.delta > this.height ? 450 : 300
		this.scroll = this.position(
			this.start,
			this.delta,
			Date.now() - this.clock + this.elap,
			duration,
			"scroll"
		);
		if (Math.abs(this.scroll - this.delta) > 0.5) this.repaint();
		else this.scroll_finish();
	}

	isScrolling() {
		return this.draw_timer != null;
	}

	// TODO: 滾動過快則滾動的行數不對。
	scrollTo(new_scroll: number = this.scroll, onscroll?: Function) {
		const scroll__ = this.checkscroll(new_scroll);
		if (this.scroll == scroll__) return;
		this.delta = scroll__;
		if (this.smooth) {
			this.elap = 30;
			this.start = this.scroll;
			this.clock = Date.now();
			if (!this.draw_timer) {
				this.scroll_timer();
				this.smooth_scroll();
			}
		} else {
			this.scroll = this.delta;
			this.repaint();
		}
	}

	private position(Start: number, End: number, Elapsed: number, Duration: number, Event: string) {
		if (Elapsed > Duration) return End;
		if (Event == "drag") return;
		const n = Elapsed / Duration;
		return Start + (End - Start) * ease.scroll(n);
	}

	// scrollTo(scroll_: number = this.checkscroll(this.scroll), onStop?: Function) {
	// 	scroll_ = this.checkscroll(scroll_);
	// 	if (scroll_ === this.scroll) {
	// 		return;
	// 	}
	// 	const onTimeout = () => {
	// 		if (Math.abs(scroll_ - this.scroll) > 1) {
	// 			this.scroll += (scroll_ - this.scroll) / 2.1;
	// 			this.scrolling = true;
	// 			window.ClearTimeout(this.timerId);
	// 			this.timerId = window.SetTimeout(onTimeout, 40);
	// 		} else {
	// 			window.ClearTimeout(this.timerId);
	// 			// this.scroll = Math.round(this.scroll);
	// 			this.scrolling = false;
	// 			onStop && onStop();
	// 		}
	// 		if (!this.isVisible()) {
	// 			window.ClearTimeout(this.timerId);
	// 			this.scrolling = false;
	// 		}
	// 		this.repaint();
	// 		ease.scroll(0);
	// 	};
	// 	window.ClearTimeout(this.timerId);
	// 	onTimeout();
	// }

	stopScroll() {
		this.scroll = Math.round(this.scroll);
		this.scrolling = false;
		window.ClearTimeout(this.timerId);
	}

	pageDown() {
		this.scrollTo(this.scroll - this.parent.height);
	}

	pageUp() {
		this.scrollTo(this.scroll + this.parent.height);
	}

	on_mouse_wheel(step: number) {
		this.scrollTo(this.scroll - step * DEFAULT_SCROLL_STEP);
	}
}

const DEFAULT_SCROLL_STEP = 3 * scale(48);
