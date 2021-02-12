/**
 * 5 star rating & like button;
 */

import { Component } from "../common/BasePart";
import { foo_playcount, RGB, scale, setAlpha, TextRenderingHint } from "../common/Common";
import { Material, MaterialFont } from "../common/Icon";
import { RunContextCommandWithMetadb } from "../common/Lang";
import { MeasureString, StringFormat } from "../common/String";
import { ui } from "../common/UserInterface";
import { GetFont, themeColors } from "../common/Theme";

const ratingColors = {
    disabled: setAlpha(themeColors.text, 50),
    highlight: themeColors.secondaryText,
    red: RGB(255, 0, 0),
    normal: setAlpha(themeColors.secondaryText, 50),
    hover: themeColors.primary,
}

const iconSize = scale(14);
const iconFont = GetFont(MaterialFont, iconSize);
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
    l_rating: number = 0;

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
            // for (let i = 0; i < this.rating; i++) {
            //     gr.DrawString(star, iconFont, ratingColors.highlight,
            //         iconX, this.y, iconWidth, barHeight, StringFormat.Center);
            //     iconX += iconWidth;
            // }
            // for (let i = this.rating; i < 5; i++) {
            //     gr.DrawString(star_empty, iconFont, ratingColors.normal,
            //         iconX, this.y, iconWidth, barHeight, StringFormat.Center);
            //     iconX += iconWidth;
            // }
            gr.DrawString(star_empty.repeat(5), iconFont, ratingColors.normal,
                iconX, this.y, this.width, barHeight, StringFormat.LeftCenter);
            if (this.rating > 0) {
                gr.DrawString(star.repeat(this.rating), iconFont, ratingColors.highlight,
                    iconX, this.y, this.width, barHeight, StringFormat.LeftCenter);
            }

        } else {
            // for (let i = 0; i < 5; i++) {
            gr.DrawString(star_empty.repeat(5), iconFont, ratingColors.disabled,
                iconX, this.y, iconWidth, barHeight, StringFormat.Center);
            // iconX += iconWidth;
            // }
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

    on_mouse_move(x: number, y: number) {
        this.l_rating = Math.floor((x - this.x) / iconWidth);
        if (this.l_rating > 5) {
            this.l_rating = 5;
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        if (!this.metadb) {
            return;
        }
        this.l_rating = Math.ceil((x - this.x) / iconWidth);
        if (this.l_rating > 5) {
            this.l_rating = 5;
        }
        try {
            if (foo_playcount) {
                if (this.l_rating !== this.rating) {
                    RunContextCommandWithMetadb("Playback Statistics/Rating/" +
                        ((this.l_rating == 0) ? "<not set>" : this.l_rating), this.metadb);
                } else {
                    RunContextCommandWithMetadb("Playback Statistics/Rating/<not set>", this.metadb);
                }
            } else {
                let metadbs = new FbMetadbHandleList(this.metadb);
                if (this.l_rating !== this.rating) {
                    metadbs.UpdateFileInfoFromJSON(JSON.stringify({ "RATING": this.l_rating }));
                    this.rating = this.l_rating;
                } else {
                    metadbs.UpdateFileInfoFromJSON(JSON.stringify({ "RATING": "" }));
                    this.rating = 0;
                }
            }
        } catch (e) { }
    }

    on_mouse_lbtn_up(x: number, y: number) { }

}