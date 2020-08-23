import { isObject, StringFormat } from "./common";
import { Component } from "./BasePart";
import { ButtonStates } from "./IconButton";
import { Repaint } from "./common";

export class Textlink extends Component {
    text: string = "";
    font: IGdiFont = gdi.Font("tahoma", 12);
    _underlinedFont: IGdiFont;
    textColor: number = 0xff555555;
    textHoverColor: number = 0xff000000;
    maxWidth: number = 0;
    state: ButtonStates = ButtonStates.normal;
    constructor(attrs: object) {
        super(attrs);
        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this._underlinedFont = gdi.Font(this.font.Name, this.font.Size, 4);
    }
    setText(text: string) {
        if (text == null) {
            this.text = "";
            Repaint();
            return;
        }
        this.text = text;
        this.on_size && this.on_size();
    }
    on_paint(gr: IGdiGraphics) {
        if (this.text == null || this.text.length === 0) {
            return;
        }
        let font_: IGdiFont;
        let textColor_: number;
        if (this.state === ButtonStates.normal) {
            font_ = this.font;
            textColor_ = this.textColor;
        }
        else {
            font_ = this._underlinedFont;
            textColor_ = this.textHoverColor;
        }
        gr.DrawString(this.text, font_, textColor_, this.x, this.y, this.width, this.height, StringFormat.LeftCenter);
    }
    changeState(newstate: number) {
        if (this.state !== newstate) {
            this.state = newstate;
            Repaint();
        }
    }
    on_mouse_move(x: number, y: number) {
        if (this.state === ButtonStates.normal) {
            this.changeState(ButtonStates.hover);
        }
    }
    on_mouse_lbtn_down(x: number, y: number) {
        this.changeState(ButtonStates.down);
    }
    on_mouse_lbtn_up(x: number, y: number) {
        if (this.state === ButtonStates.down) {
            if (this.trace(x, y)) {
                this.on_click && this.on_click(x, y);
            }
        }
        this.changeState(ButtonStates.hover);
    }
    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}
