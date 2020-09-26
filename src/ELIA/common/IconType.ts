import { StringFormat, TextRenderingHint } from "./common";
import { ui } from "./UserInterface";

const textRenderingHint = ui.textRender;

interface IIconInfo {
    name: string;
    code: string;
    size: number;
    width?: number;
    height?: number;
}
export class SerializableIcon implements IIconInfo {
    name: string;
    code: string;
    size: number;
    width: number;
    height: number;
    iconFont: IGdiFont;
    constructor(info: IIconInfo) {
        this.name = info.name;
        this.code = info.code;
        this.size = info.size;
        let defaultHeight = this.size * 1.3;
        this.width = (info.width && defaultHeight);
        this.height = (info.height && defaultHeight);
        this.iconFont = gdi.Font(this.name, this.size);
    }
    stringify(): string {
        return JSON.stringify([{
            name: this.name,
            code: this.code,
            size: this.size,
            width: this.width,
            height: this.height
        }]);
    }
    parse(str: string) {
        const obj: IIconInfo[] = JSON.parse(str);
        return new SerializableIcon(obj[0]);
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
        return this;
    }

    draw(gr: IGdiGraphics, foreColor: number, backColor: number = 0, x: number, y: number, sf: number = StringFormat.Center) {
        gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        if (backColor > 0) {
            gr.FillSolidRect(x, y, this.width, this.height, backColor);
        }
        gr.DrawString(this.code, this.iconFont, foreColor, x, y, this.width, this.height, sf);
        gr.SetTextRenderingHint(textRenderingHint);
    }
    createImage(foreColor: number, backColor: number = 0) {
        const { width, height, code, iconFont } = this;
        const tempImg = gdi.CreateImage(width, height);
        const g_ = tempImg.GetGraphics();
        g_.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        if (backColor > 0) {
            g_.FillSolidRect(0, 0, width, height, backColor);
        }
        g_.DrawString(code, iconFont, foreColor, 0, 0, width, height, StringFormat.Center);
        g_.SetTextRenderingHint(TextRenderingHint.SystemDefault);
        tempImg.ReleaseGraphics(g_);
        return tempImg;
    }
}
