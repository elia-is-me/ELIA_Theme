import { isObject } from "./common";
import { Component } from "./BasePart";
import { Repaint } from "./common";


export enum ButtonStates {
  normal = 0,
  hover = 1,
  down = 2
};

export class Icon extends Component {
  state: ButtonStates = ButtonStates.normal;
  image: IGdiBitmap;
  downImage: IGdiBitmap;
  hoverImage: IGdiBitmap;
  private hoverAlpha = 200;
  private downAlpha = 128;
  constructor(attrs: object) {
    super(attrs);
    if (isObject(attrs)) {
      Object.assign(this, attrs);
    }
    this.setImage(this.image, this.hoverImage, this.downImage);
  }
  setImage(img: IGdiBitmap, hoverImg?: IGdiBitmap, downImg?: IGdiBitmap) {
    this.image = img;
    this.hoverImage = hoverImg;
    this.downImage = downImg;
    this.setSize(this.x, this.y, img.Width, img.Height);
  }
  on_paint(gr: IGdiGraphics) {
    let img = this.image;
    let alpha = 255;
    if (this.state === ButtonStates.hover) {
      if (this.hoverImage) {
        img = this.hoverImage;
      }
      else {
        alpha = this.hoverAlpha;
      }
    }
    else if (this.state === ButtonStates.down) {
      if (this.downImage) {
        img = this.downImage;
      }
      else {
        alpha = this.downAlpha;
      }
    }
    gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height, 0, alpha);
  }
  changeState(state_: number) {
    if (this.state !== state_) {
      this.state = state_;
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
        // invoke(this, "on_click", x, y);
      }
    }
    this.changeState(ButtonStates.hover);
  }
  on_mouse_leave() {
    this.changeState(ButtonStates.normal);
  }
}
