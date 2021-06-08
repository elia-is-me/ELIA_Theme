import { scale } from "./Common";
import { Material, MaterialFont } from "./Icon";
import { Scrollbar } from "./ScrollBar";
import { ScrollView } from "./ScrollView";
import { StringFormat } from "./String";
import { notifyOthers } from "./UserInterface";
import { IconButton } from "./Buttons";
import { TXT } from "./Lang";
import { GetFont, themeColors } from "./Theme";

const settingsColors = {
    titleText: themeColors.titleText,
    text: themeColors.text,
    textSecondary: themeColors.secondaryText,
    background: themeColors.playlistBackground,
    highlight: themeColors.highlight,
}

export class SettingsView extends ScrollView {

    colors = settingsColors;

    titleFont = GetFont("bold, 20");
    subTitleFont = GetFont("semibold, 16");
    textFont = GetFont("normal, 14");

    closeBtn: IconButton;
    scrollbar: Scrollbar;

    constructor() {
        super({});

        this.closeBtn = new IconButton({
            icon: Material.close,
            fontName: MaterialFont,
            fontSize: scale(28),
            colors: [themeColors.secondary]
        });
        this.closeBtn.setSize(scale(48), scale(48));
        this.closeBtn.z = 10;
        this.closeBtn.on_click = () => {
            notifyOthers("Show.Playlist");
        };
        this.addChild(this.closeBtn);
    }

    on_size() {
        let closeBtnX = this.x + this.width - this.closeBtn.width - scale(24);
        let closeBtnY = this.y + scale(24) - this.scroll;
        this.closeBtn.setPosition(closeBtnX, closeBtnY);
    }

    on_paint(gr: IGdiGraphics) {
        const { colors, titleFont, subTitleFont, textFont } = this;
        const paddingL = scale(40);

        gr.FillSolidRect(this.x, this.y, this.width, this.height, this.colors.background);

        // Title 1;
        gr.DrawString(TXT("Settings"), titleFont, colors.titleText,
            this.x + paddingL, this.y + scale(40) - this.scroll, 0.5 * (this.width - 2 * paddingL), titleFont.Height, StringFormat.LeftTop);
    }
};