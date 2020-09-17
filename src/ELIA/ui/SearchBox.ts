/* ---------------------------------------------------
 * SearchBox on TopBar, Search library, playlist, etc.
 * ------------------------------------------------- */

import { Component, IInjectableCallbacks } from "../common/BasePart";
import { InputBox } from "../common/Inputbox";
import { Icon2 } from "../common/IconButton";
import { scale, setAlpha, RGB, MeasureString } from "../common/common";
import { SerializableIcon } from "../common/IconType";
import { Material, MaterialFont } from "../common/iconCode";
import { mainColors, globalFontName } from "./Theme";
import { notifyOthers } from "./Layout";

type TIconKeys = "loupe" | "delta" | "cross";
const iconFontSize = scale(20);
const iconHeight = scale(32);

const icons: {
	[keys in TIconKeys]: SerializableIcon
} = {
	loupe: new SerializableIcon({
		code: Material.search,
		name: MaterialFont,
		size: iconFontSize,
		width: iconHeight,
		height: iconHeight
	}),
	delta: new SerializableIcon({
		code: Material.arrow_drop_down,
		name: MaterialFont,
		size: iconFontSize,
		width: iconHeight,
		height: iconHeight
	}),
	cross: new SerializableIcon({
		code: Material.close,
		name: MaterialFont,
		size: iconFontSize,
		width: iconHeight,
		height: iconHeight
	})
}

interface IIconColors {
	normal: number;
	hover?: number;
	down?: number;
}

const iconColor: IIconColors = {
	normal: mainColors.text,
	hover: setAlpha(mainColors.text, 200),
	down: setAlpha(mainColors.text, 128)
}

interface ISearchBoxOptions {
	backgroundColor: number;
	foreColor: number;
	borderColor?: number;
	borderActiveColor?: number;
	backgroundActiveColor?: number;
	iconColors: IIconColors;
}


export class SearchBox extends Component {

	inputbox: InputBox;
	searchBtn: Icon2;
	clearBtn: Icon2;
	menuBtn: Icon2;

	_iconColors: IIconColors;
	backgroundColor: number;
	foreColor: number;
	borderColor: number;
	borderActiveColor: number;
	backgroundActiveColor: number;

	inputState: number = 0;
	icons: { [keys in TIconKeys]: SerializableIcon };
	iconHeight: number;
	_inputboxHeight: number;

	constructor(opts: ISearchBoxOptions, callbacks?: IInjectableCallbacks) {

		super(opts);

		this.icons = icons;
		this.iconHeight = iconHeight;
		this._iconColors = iconColor;

		this.searchBtn = new Icon2({
			fontIcon: this.icons.loupe,
			hoverColor: this._iconColors.hover,
			downColor: this._iconColors.down,
			normalColor: this._iconColors.normal
		});

		const handleClear = () => {
			this._clearInput();
			this.repaint();
		};

		this.clearBtn = new Icon2({
			fontIcon: this.icons.cross,
			hoverColor: this._iconColors.hover,
			downColor: this._iconColors.down,
			normalColor: this._iconColors.normal,
			onClick() {
				handleClear();
			}
		});
		this.menuBtn = new Icon2({
			fontIcon: this.icons.delta,
			hoverColor: this._iconColors.hover,
			downColor: this._iconColors.down,
			normalColor: this._iconColors.normal
		});

		this.inputbox = new InputBox({
			font: gdi.Font(globalFontName, scale(14)),
			font_italic: gdi.Font(globalFontName, scale(14), 2),
			foreColor: mainColors.text,
			backgroundColor: this.backgroundColor,
			backgroundActiveColor: this.backgroundActiveColor,
			backgroundSelectionColor: RGB(180, 180, 180),
			empty_text: "Search Library",
			func: () => {
				this.handleSearch();
			}
		});


		this._inputboxHeight = MeasureString("ABCDgl汉字", this.inputbox.font).Height + scale(4);

		[this.searchBtn, this.clearBtn, this.menuBtn, this.inputbox].forEach(btn => this.addChild(btn));

	}

	handleSearch() {
		let searchText = this.inputbox.text;
		let result = fb.GetQueryItems(fb.GetLibraryItems(), searchText);

		console.log(result.Count);
		notifyOthers("Show.SearchResult", result);
	}

	private _clearInput() {
		if (this.inputbox.text.length > 0) {
			this.inputbox.text = "";
			this.inputbox.offset = 0;
		}
	}

	on_init() { }

	on_size() {

		const { searchBtn, clearBtn, menuBtn, inputbox } = this;
		const { iconHeight } = this;

		let btnY = (this.y + this.height - iconHeight)
		let marginLeft = scale(8);

		searchBtn.setBoundary(this.x + marginLeft, btnY, iconHeight, iconHeight);
		menuBtn.setBoundary(this.x + this.width - marginLeft - iconHeight, btnY, iconHeight, iconHeight);
		clearBtn.setBoundary(menuBtn.x - iconHeight - scale(4), btnY, iconHeight, iconHeight);

		let inputboxY = this.y + ((this.height - this._inputboxHeight) / 2 | 0);
		inputbox.setBoundary(searchBtn.x + searchBtn.width, inputboxY, clearBtn.x - searchBtn.x - searchBtn.width, this._inputboxHeight);

	}

	on_paint(gr: IGdiGraphics) {

		if (this.inputbox.edit) {
			gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundActiveColor)
		} else {
			gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor)
		}

		if (this.inputbox.text.length > 0) {
			this.clearBtn.visible = true;
		} else {
			this.clearBtn.visible = false;
		}

	}

	on_mouse_lbtn_down(x: number, y: number) {
	}

	on_mouse_lbtn_up(x: number, y: number) {
	}

	on_mouse_lbtn_dblclk(x: number, y: number) {
	}

	on_mouse_rbtn_up(x: number, y: number) {
	}

	on_mouse_move(x: number, y: number) {
	}

}

const handleSearch = () => {

	notifyOthers("Show.SearchResult");

}

/**
 * TODO:
 *
 * - Search 动作?
 * - Search 种类?
 */