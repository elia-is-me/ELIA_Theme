/**
 * 5 star rating & like button;
 */

import { Component } from "../common/BasePart";
import { RGB, scale, setAlpha, TextRenderingHint } from "../common/Common";
import { Material, MaterialFont } from "../common/Icon";
import { MeasureString, StringFormat } from "../common/String";
import { ui } from "../common/UserInterface";
import { GdiFont, themeColors } from "./Theme";

const ratingColors = {
    disabled: setAlpha(themeColors.text, 100),
    highlight: themeColors.secondaryText,
    red: RGB(255, 0, 0),
    normal: themeColors.secondaryText,
    hover: themeColors.primary,
}

const iconSize = scale(14);
const iconFont = GdiFont(MaterialFont, iconSize);
const iconWidth = Math.ceil(MeasureString(Material.heart, iconFont).Width);
const barHeight = iconWidth;
const barWidth = 5 * iconWidth;

const tf_rating = fb.TitleFormat("%rating%");
const tf_mood = fb.TitleFormat("$meta(MOOD)");


export class RatingBar extends Component {

    static Width = barWidth;
    static Height = barHeight;

    showRating = true;
    showLike = true;
    metadb: IFbMetadb;
    rating: number = 0;
    liked: string = "";

    constructor() {
        super({});

        // fixed size;
        this.setSize(barWidth, barHeight);
    }

    on_paint(gr: IGdiGraphics) {

        if (this.rating == null) {
            this.rating = 0;
        }

        gr.SetInterpolationMode(TextRenderingHint.AntiAliasGridFit);
        gr.SetSmoothingMode(4);
        let iconX = this.x;
        let star = Material.star;
        let star_empty = Material.star_empty;

        if (this.metadb) {
            for (let i = 0; i < this.rating; i++) {
                gr.DrawString(star, iconFont, ratingColors.highlight,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
            for (let i = this.rating; i < 5; i++) {
                gr.DrawString(star_empty, iconFont, ratingColors.normal,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
        } else {
            for (let i = 0; i < 5; i++) {
                gr.DrawString(star_empty, iconFont, ratingColors.disabled,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
        }
        gr.SetInterpolationMode(ui.textRender);
        gr.SetSmoothingMode(0);

    }

    setMetadb(metadb?: IFbMetadb | null) {
        this.metadb = metadb;
        if (this.metadb) {
            this.rating = +tf_rating.EvalWithMetadb(this.metadb);
            this.liked = tf_mood.EvalWithMetadb(this.metadb);
        } else {
            this.rating = 0;
            this.liked = "";
        }
        if (Number.isNaN(this.rating)) {
            this.rating = 0;
        }
    }

    on_mouse_move(x: number, y: number) { }

    on_mouse_lbtn_down(x: number, y: number) { }

    on_mouse_lbtn_up(x: number, y: number) { }

}