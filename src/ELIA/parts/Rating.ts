/**
 * 5 star rating & like button;
 */

import { Component } from "../common/BasePart";
import { InterpolationMode, RGB, scale, setAlpha, TextRenderingHint } from "../common/common";
import { Material, MaterialFont } from "../common/Icon";
import { MeasureString, StringFormat } from "../common/String";
import { ui } from "../common/UserInterface";
import { IconButton } from "./Buttons";
import { GdiFont, themeColors } from "./Theme";

const ratingColors = {
    disabled: setAlpha(themeColors.text, 100),
    highlight: themeColors.highlight,
    red: RGB(255, 0, 0),
    normal: themeColors.secondaryText,
    hover: themeColors.primary,
}

const iconSize = scale(18);
const iconFont = GdiFont(MaterialFont, iconSize);
const iconWidth = Math.ceil(MeasureString(Material.heart, iconFont).Width);
const barHeight = iconWidth;
const barWidth = 5 * iconWidth + barHeight;

const tf_rating = fb.TitleFormat("%rating%");
const tf_mood = fb.TitleFormat("$meta(MOOD)");


class RatingBar extends Component {

    showRating = true;
    showLike = true;
    metadb: IFbMetadb;
    rating: number = 0;
    liked: string = "";
    loveBtn: IconButton;

    constructor() {
        super({});

        this.loveBtn = new IconButton({
            icon: Material.heart,
            fontSize: scale(18),
            colors: [0],
        });
        this.loveBtn.on_init = () => {
            if (this.metadb) {
                this.loveBtn.enable();
                this.loveBtn.setIcon(this.liked ? Material.heart : Material.heart_empty);
                this.loveBtn.setColors(this.liked ? ratingColors.highlight : ratingColors.normal);
            } else {
                this.loveBtn.disable();
                this.loveBtn.setIcon(Material.heart_empty);
                this.loveBtn.setColors(ratingColors.disabled);
            }
        }

    }

    on_size() {
        let loveX = this.x + this.width - iconWidth;
        this.loveBtn.setBoundary(loveX, this.y, barHeight, iconWidth);
    }

    on_paint(gr: IGdiGraphics) {
        // love btn;
        this.loveBtn.on_paint(gr);
        // rating stars;
        // if (!this.rating) { }
        if (this.rating == null) {
            this.rating = 0;
        }

        gr.SetInterpolationMode(TextRenderingHint.AntiAlias);
        let iconX = this.x;

        if (this.metadb) {
            for (let i = 0; i <= this.rating; i++) {
                gr.DrawString(Material.heart, iconFont, ratingColors.highlight,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
            for (let i = this.rating + 1; i < 5; i++) {
                gr.DrawString(Material.heart_empty, iconFont, ratingColors.normal,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
        } else {
            for (let i = 0; i < 5; i++) {
                gr.DrawString(Material.heart_empty, iconFont, ratingColors.disabled,
                    iconX, this.y, iconWidth, barHeight, StringFormat.Center);
                iconX += iconWidth;
            }
        }
        gr.SetInterpolationMode(ui.textRender);
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
        this.loveBtn.on_init();
    }

    on_mouse_move(x: number, y: number) { }

    on_mouse_lbtn_down(x: number, y: number) { }

    on_mouse_lbtn_up(x: number, y: number) { }

}