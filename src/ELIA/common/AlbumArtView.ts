import { isObject, StringFormat, CropImage, TextRenderingHint } from "./common";
import { Component } from "./BasePart";

export const AlbumArtId = {
    front: 0,
    back: 1,
    disc: 2,
    icon: 3,
    artist: 4
};
export class AlbumArtView extends Component {
    albumArtId: number = AlbumArtId.front;
    tf = fb.TitleFormat("%album artist%^^%album");
    protected trackKey: string = "";
    currentImg: IGdiBitmap;
    defaultImg: IGdiBitmap = this._drawNocoverImg(0xafffffff, 0x0fffffff);
    metadb: IFbMetadb;
    private _rawDefaultImg: IGdiBitmap;
    constructor(attrs: object) {
        super(attrs);
        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this._rawDefaultImg = this.defaultImg;
    }
    _drawNocoverImg(textColor: number, backColor: number) {
        let fontName = "Segoe UI";
        let font1 = gdi.Font(fontName, 270, 1);
        let font2 = gdi.Font(fontName, 120, 1);
        let cc = StringFormat(1, 1);
        let img = gdi.CreateImage(500, 500);
        let g = img.GetGraphics();
        g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        g.FillSolidRect(0, 0, 500, 500, textColor & 0x20ffffff);
        g.DrawString("NO", font1, textColor & 0x25ffffff, 0, 0, 500, 275, cc);
        g.DrawString("COVER", font2, textColor & 0x25ffffff, 2.5, 175, 500, 275, cc);
        g.FillSolidRect(60, 388, 380, 50, textColor & 0x65ffffff);
        img.ReleaseGraphics(g);
        return img;
    }
    processImage(image: IGdiBitmap) {
        return (image == null) ? null : CropImage(image, this.width, this.height);
    }
    getArtwork(metadb?: IFbMetadb) {
        let trackkey_ = "##@!~";
        if (metadb != null) {
            trackkey_ = this.tf.EvalWithMetadb(metadb);
            this.metadb = metadb;
            let img = utils.GetAlbumArtV2(metadb, this.albumArtId);
            // for tracks download from neteaseCloudMusic which prefer store
            // alum art image at 'disc' slot;
            if (img == null && this.albumArtId === AlbumArtId.front) {
                img = utils.GetAlbumArtV2(metadb, AlbumArtId.disc);
            }
            if (img != null) {
                img = CropImage(img, this.width, this.height);
            }
            this.currentImg = img;
        }
        else {
            this.currentImg = null;
            ;
        }
        this.trackKey = trackkey_;
    }
    on_paint(gr: IGdiGraphics) {
        let img = this.currentImg || this.defaultImg;
        gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
    }
    on_init() {
        this.getArtwork(fb.GetNowPlaying());
    }
    // TODO: debounced function;
    on_size() {
        if (this._rawDefaultImg) {
            if (this.defaultImg && this.defaultImg.Width !== this.width) {
                this.defaultImg = CropImage(this._rawDefaultImg, this.width, this.height);
            }
        }
    }
}
