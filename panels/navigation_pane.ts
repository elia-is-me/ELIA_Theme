/// <reference path="../common/foo_spider_monkey_panel.d.ts" />
/// <reference path="../common/common.ts" />
/// <reference path="../common/components.ts" />


abstract class Scrollable extends Component {
    totalHeight: number;
    scrolling: boolean = false;
    private scroll__: number = 0;
    get scroll_() { return this.scroll__ }
    set scroll_(val: number) {
        this.scroll__ = this._checkScroll(val);
    }
    private timerId: number = -1;

    constructor(attrs: object) {
        super(attrs);
    }

    _checkScroll(val: number) {
        if (val > this.totalHeight - this.height) {
            val = this.totalHeight - this.height;
        }
        if (this.totalHeight < this.height || val < 0) {
            val = 0;
        }
        return val;
    }

    scrollTo(scroll_?: number) {
        if (scroll_ == null) {
            scroll_ = this._checkScroll(this.scroll_);
        }

        if (scroll_ === this.scroll_) {
            return;
        }

        const onTimeout = () => {
            if (Math.abs(scroll_ - this.scroll_) > 0.4) {
                this.scroll_ += (scroll_ - this.scroll_) / 3;
                this.scrolling = true;
                window.ClearTimeout(this.timerId);
                this.timerId = window.SetTimeout(onTimeout, 15);
            } else {
                window.ClearTimeout(this.timerId);
                this.scroll_ = Math.round(this.scroll_);
                this.scrolling = false;
            }
            if (!this.isVisible()) {
                window.ClearTimeout(this.timerId);
                this.scrolling = false;
            }
            Repaint();
        }

        window.ClearTimeout(this.timerId);
        onTimeout();
    }
}


//

const MIN_CURSOR_HEIGHT = scale(24);
const SCROLLBAR_WIDTH = scale(12);

// interface iscrollbar {
//     cursorColor: number;
//     backgroundColor: number;
// }

class Scrollbar extends Component implements ICallbacks {
    private cursorHeight: number;
    private cursorY: number;
    state: number;
    private cursorDelta: number;
    cursorColor: number;
    backgroundColor: number;
    parent: Scrollable;

    constructor(attrs: object) {
        super(attrs);
    }

    on_paint(gr: IGdiGraphics) {
        let totalHeight = this.parent.totalHeight;
        let parentHeight = this.parent.height;

        if (totalHeight > parentHeight) {
            let scroll_ = this.parent.scroll_;
            this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
            this.cursorHeight = Math.round((parentHeight / totalHeight) * this.height);
            if (this.cursorHeight < MIN_CURSOR_HEIGHT) {
                this.cursorHeight = MIN_CURSOR_HEIGHT;
            }
        }

        if (this.backgroundColor) {
            gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
            gr.FillSolidRect(this.x + 1, this.cursorY + 1, this.width - 2, this.cursorHeight - 2, this.cursorColor);
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
        if (this.state === ButtonStates.down) {
            let cursorY = y - this.cursorDelta
            let ratio = (cursorY - this.y) / (this.height - this.cursorHeight);
            let offset = Math.round(
                (this.parent.totalHeight - this.parent.height) * ratio
            );
            this.parent.scroll_ = offset;
            Repaint();
        } else {
            this.changeState(
                this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.normal
            );
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        if (this.traceCursor(x, y)) {
            this.cursorDelta = y - this.cursorY;
            this.changeState(ButtonStates.down);
        }
    }

    on_mouse_lbtn_up(x: number, y: number) {
        this.changeState(
            this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.down
        );
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}

function isValidPlaylist(index: number) {
    if (index < 0) return false;
    if (index > plman.PlaylistCount - 1) return false;
    return true;
}

interface IColors {
    text: number;
    background: number;
    highlight: number;
    text_sel: number;
    background_sel: number;
}

interface IListItem {
    id: number;
    icon?: number;
    x: number;
    y: number;
    width: number;
    height: number;
    py: number;
    draw(gr: IGdiGraphics): void;
}

const NAV_BTN_HEIGHT = scale(40);

class NavButton extends Component {
    state = ButtonStates.normal;
    // icon: { code: string; fontName: string; fontSize: number };
    iconCode: string;
    iconFont: IGdiFont;
    text: string;
    textFont: IGdiFont;
    textColor: number;
    textHoverColor: number;

    constructor(props: {
        iconCode: string;
        iconFont: IGdiFont;
        text: string;
        textFont: IGdiFont;
        textColor: number;
        textHoverColor?: number;
    }) {
        super(props);
        if (isObject(props)) Object.assign(this, props);
        if (this.textHoverColor == null) {
            this.textHoverColor = blendColors(this.textColor, 0xffffffff, 0.5);
        }
    }

    on_paint(gr: IGdiGraphics) {

        let icon_x = this.x + scale(16);
        let icon_y = this.y + scale(8);
        let icon_w = scale(24);
        gr.DrawString(this.iconCode, this.iconFont, this.textColor, icon_x, icon_y, icon_w, icon_w, StringFormat.Center);
    }




}

class NavigationPane extends Scrollable {
    colors: IColors;

    items: any[];
    scrollbar: Scrollbar;
}