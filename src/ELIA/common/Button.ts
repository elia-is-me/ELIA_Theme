import { CursorName } from "./Common";
import { Component } from "./BasePart";
import { ui } from "./UserInterface";

export const textRenderingHint = ui.textRender;

export const enum ButtonStates {
	Normal = 0,
	Hover = 1,
	Down = 2,
	Disable = 3,
};

export class Clickable extends Component {
	state: ButtonStates = ButtonStates.Normal;
	grabFocus = false;

	/**
	 * changeState(state) will not change a disabled button's state;
	 */
	changeState(state: number) {
		// it's weid here
		if (this.state === ButtonStates.Disable || state === ButtonStates.Disable) {
			return;
		}
		if (this.state !== state) {
			this.state = state;
			this.repaint();
		}
	}

	disable() {
		this.state = ButtonStates.Disable;
	}

	enable() {
		this.state = ButtonStates.Normal;
	}

	on_init() {
		this.changeState(ButtonStates.Normal);
	}

	on_mouse_move(x: number, y: number) {
		if (this.state === ButtonStates.Normal) {
			this.changeState(ButtonStates.Hover);
		}
		if (this.trace(x, y)) {
			window.SetCursor(CursorName.IDC_HAND);
		} else {
			window.SetCursor(CursorName.IDC_ARROW);
		}
	}

	on_mouse_lbtn_down() {
		this.changeState(ButtonStates.Down);
	}

	on_mouse_lbtn_up(x: number, y: number) {
		if (this.state === ButtonStates.Down) {
			if (this.trace(x, y)) {
				this.on_click && this.on_click(x, y);
			}
		}
		this.changeState(ButtonStates.Hover);
	}

	on_mouse_leave() {
		this.changeState(ButtonStates.Normal);
		window.SetCursor(CursorName.IDC_ARROW);
	}
}

