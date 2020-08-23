import { Component } from "./BasePart";
import { Repaint } from "./common";
// export function invoke(obj: object, method: string, ...var_args: any[]) {
//     if (!obj) { return }
//     let func = (<any>obj)[method];
//     return func == null ? null : func.apply(obj, var_args);
// }
export interface ISliderOptions {
    progressHeight: number;
    thumbImage: IGdiBitmap;
    pressedThumbImage?: IGdiBitmap;
    progressColor: number;
    secondaryColor: number;
    accentColor: number;
    getProgress(): number;
    setProgress(val: number): void;
}
export interface SliderThumbImage {
    normal: IGdiBitmap;
    down: IGdiBitmap;
}
export class Slider extends Component implements ISliderOptions {
    isDrag: boolean = false;
    progress: number = 0;
    thumbImage: IGdiBitmap;
    pressedThumbImage: IGdiBitmap;
    progressColor: number = 0;
    secondaryColor: number = 0;
    accentColor: number = 0;
    progressHeight: number;
    constructor(opts: ISliderOptions) {
        super(opts);
        this.progressHeight = opts.progressHeight;
        this.thumbImage = opts.thumbImage;
        this.pressedThumbImage = (opts.pressedThumbImage && opts.thumbImage);
        this.progressColor = opts.progressColor;
        this.secondaryColor = opts.secondaryColor;
        this.accentColor = opts.accentColor;
        this.getProgress = opts.getProgress;
        this.setProgress = opts.setProgress;
    }
    /**
     * `getProgress & setProgress` should be over wright when instance created
     * or when extended.
     */
    getProgress(): number { return 0; }
    setProgress(val: number): void { }
    on_size() {
        let minHeight_ = Math.max(this.progressHeight, this.thumbImage.Height, this.pressedThumbImage.Height);
        if (this.height < minHeight_) {
            console.log("ELIA Warn: Slider 's height is not proper.");
        }
    }
    trace(x: number, y: number) {
        if (!this.isVisible())
            return false;
        let pad = (this.thumbImage ? (this.thumbImage.Width / 2) >> 0 : 0);
        return x > this.x - pad && x <= this.x + this.width + pad
            && y > this.y && y <= this.y + this.height;
    }
    on_paint(gr: IGdiGraphics) {
        this.progress = this.getProgress();
        if (!isFinite(this.progress)) {
            this.progress = 0;
        }
        let p_y = this.y + (this.height - this.progress) / 2;
        //
        gr.FillSolidRect(this.x, p_y, this.width, this.progressHeight, this.secondaryColor);
        //
        if (this.progress * this.width > 1) {
            gr.FillSolidRect(this.x, p_y, this.width * this.progress, this.progressHeight, this.progressColor);
        }
        if (this.thumbImage) {
            let img = this.thumbImage;
            if (this.isDrag && this.pressedThumbImage) {
                img = this.pressedThumbImage;
            }
            let img_x = this.x + this.width * this.progress - img.Width / 2;
            let img_y = this.y + (this.height - img.Height) / 2;
            gr.DrawImage(img, img_x, img_y, img.Width, img.Height, 0, 0, img.Width, img.Height);
        }
    }
    on_mouse_move(x: number, y: number) {
        if (this.isDrag) {
            x -= this.x;
            let progress_ = x < 0 ? 0 : x > this.width ? 1 : x / this.width;
            this.setProgress(progress_);
            Repaint();
        }
    }
    on_mouse_lbtn_down(x: number, y: number) {
        if (this.trace(x, y)) {
            this.isDrag = true;
            this.on_mouse_move(x, y);
        }
    }
    on_mouse_lbtn_up(x: number, y: number) {
        this.isDrag = false;
        Repaint();
    }
}
