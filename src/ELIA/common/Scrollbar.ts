import { scale, Repaint } from "./common";
import { Component, ICallbacks } from "./BasePart";
import { ButtonStates } from "./IconButton";
import { ScrollView } from "./ScrollView";


export class Scrollbar extends Component implements ICallbacks {

	static defaultCursorWidth = scale(12);

	className = "ScrollBar";

	private minCursorHeight = scale(100);
	private cursorHeight: number;
	private cursorY: number;
	state: ButtonStates;
	private cursorDelta: number;
	cursorColor: number;
	backgroundColor: number;
	parent: ScrollView;
	narrow: boolean = true;
	narrowWidth: number = scale(2);

	constructor(attrs: {
		cursorColor: number;
		backgroundColor: number;
	}) {
		super(attrs);
		this.z = 100;
	}
	on_paint(gr: IGdiGraphics) {
		let minCursorHeight = this.minCursorHeight;
		let totalHeight = this.parent.totalHeight;
		let parentHeight = this.parent.height;
		if (totalHeight > parentHeight) {
			let scroll_ = this.parent.scroll;
			this.cursorHeight = Math.max(Math.round((parentHeight / totalHeight) * this.height), minCursorHeight);
			this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
			// Draw background;
			if (this.backgroundColor) {
				gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
			}
			// Draw cursor;
			if (this.narrow) {
				gr.FillRoundRect(this.x + this.width - this.narrowWidth - scale(2), this.cursorY + 1, this.narrowWidth, this.cursorHeight - 2, 0.9, 0.9, this.cursorColor);
			} else {
				gr.FillSolidRect(this.x + 1, this.cursorY + 1, this.width - 2, this.cursorHeight - 2, this.cursorColor);
			}
		}
	}
	traceCursor(x: number, y: number) {
		return this.trace(x, y)
			&& y > this.cursorY && y <= this.cursorY + this.cursorHeight;
	}
	changeState(newstate: number) {
		if (this.state !== newstate) {
			this.state = newstate;
			Repaint();
		}
	}
	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.Down) {
			let cursorY = y - this.cursorDelta;
			let ratio = (cursorY - this.y) / (this.height - this.cursorHeight);
			let offset = Math.round((this.parent.totalHeight - this.parent.height) * ratio);
			this.parent.scroll = offset;
			Repaint();
		} else {
			this.changeState(this.traceCursor(x, y) ? ButtonStates.Hover : ButtonStates.Normal);
		}

		if (this.trace(x, y) || this.state === ButtonStates.Down) {
			if (this.narrow) {
				this.narrow = false;
				Repaint();
			}
		}
	}
	on_mouse_lbtn_down(x: number, y: number) {
		if (this.traceCursor(x, y)) {
			this.cursorDelta = y - this.cursorY;
			this.changeState(ButtonStates.Down);
		}
		if (this.narrow) {
			this.narrow = false;
			this.repaint();
		}
	}
	on_mouse_lbtn_up(x: number, y: number) {
		this.changeState(this.traceCursor(x, y) ? ButtonStates.Hover : ButtonStates.Normal);
		this.narrow = !this.trace(x, y);
		this.repaint();
	}
	on_mouse_leave() {
		this.changeState(ButtonStates.Normal);
		if (!this.narrow) {
			this.narrow = true;
			this.repaint();
		}
	}
}

/**
 * TODO:
 *
 * - auto hide featue;
 */