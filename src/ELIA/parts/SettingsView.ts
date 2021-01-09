import { scale, StringFormat } from "../common/common";
import { ScrollView } from "../common/ScrollView";
import { lang } from "./Lang";
import { GdiFont, themeColors } from "./Theme";

const settingsColors = {
    titleText: themeColors.titleText,
    text: themeColors.text,
    textSecondary: themeColors.secondaryText,
    background: themeColors.playlistBackground,
    highlight: themeColors.highlight,
}

export class SettingsView extends ScrollView {

    colors = settingsColors;

    titleFont = GdiFont("bold, 20");
    subTitleFont = GdiFont("semibold, 16");
    textFont = GdiFont("normal, 14");

    constructor() {
        super({});
    }

    on_paint(gr: IGdiGraphics) {
        const { colors, titleFont, subTitleFont, textFont } = this;
        const paddingL = scale(40);

        gr.FillSolidRect(this.x, this.y, this.width, this.height, this.colors.background);

        // Title 1;
        gr.DrawString(lang("Settings"), titleFont, colors.titleText, this.x + paddingL, this.y + scale(40) - this.scroll, 0.5 * (this.width - 2 * paddingL), titleFont.Height, StringFormat.LeftTop);
    }
};