import { Component } from "./BasePart";
import { scale } from "./common";

export abstract class ScrollView extends Component {
	className = "ScrollView";
	totalHeight: number;
	scrolling: boolean = false;
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
	onDidChangeScroll(val: number) {}
	checkscroll(val: number) {
		if (val > this.totalHeight - this.height) {
			val = this.totalHeight - this.height;
		}
		if (this.totalHeight < this.height || val < 0) {
			val = 0;
		}
		return val;
	}
	scrollTo(scroll_: number = this.checkscroll(this.scroll)) {
		scroll_ = this.checkscroll(scroll_);
		if (scroll_ === this.scroll) {
			return;
		}
		const onTimeout = () => {
			if (Math.abs(scroll_ - this.scroll) > 0.4) {
				this.scroll += (scroll_ - this.scroll) / 3;
				this.scrolling = true;
				window.ClearTimeout(this.timerId);
				this.timerId = window.SetTimeout(onTimeout, 15);
			} else {
				window.ClearTimeout(this.timerId);
				this.scroll = Math.round(this.scroll);
				this.scrolling = false;
			}
			if (!this.isVisible()) {
				window.ClearTimeout(this.timerId);
				this.scrolling = false;
			}
			// Repaint();
			this.repaint();
		};
		window.ClearTimeout(this.timerId);
		onTimeout();
	}

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

const DEFAULT_SCROLL_STEP = scale(100);
