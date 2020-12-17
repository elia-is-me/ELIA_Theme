/* ---------------------------------------------------
 * SearchBox on TopBar, Search library, playlist, etc.
 * ------------------------------------------------- */

import { Component } from "../common/BasePart";
import { InputBox } from "../common/Inputbox";
import { IconButton } from "../common/Button";
import { scale, RGB, MeasureString } from "../common/common";
import { Material, } from "../common/Icon";
import { mainColors, globalFontName } from "./Theme";
import { notifyOthers } from "../common/UserInterface";

export class SearchBox extends Component {
	inputbox: InputBox;
	searchBtn: IconButton;
	clearBtn: IconButton;

	backgroundColor: number = RGB(60, 60, 60);
	foreColor: number = mainColors.text;
	borderColor: number;
	borderActiveColor: number;
	backgroundActiveColor: number = RGB(77, 77, 77);

	private iconSize = scale(20);
	private iconHeight = scale(32);
	_inputboxHeight: number;

	constructor() {
		super({});

		this.grabFocus = false;
		let iconFontSize = this.iconSize;

		this.searchBtn = new IconButton({
			icon: Material.search,
			fontSize: iconFontSize,
			colors: [this.foreColor]
		});

		this.searchBtn.on_click = () => {
			if (this.inputbox.text) {
				this.inputbox.func();
			}
		}

		this.searchBtn.grabFocus = false;

		const handleClear = () => {
			this._clearInput();
			this.repaint();
		};

		this.clearBtn = new IconButton({
			icon: Material.close,
			fontSize: iconFontSize,
			colors: [this.foreColor]
		});
		this.clearBtn.on_click = () => {
			handleClear();
		}
		this.clearBtn.grabFocus = false;

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
			},
		});

		this._inputboxHeight = MeasureString("ABCDgl汉字", this.inputbox.font).Height + scale(4);

		[this.searchBtn, this.clearBtn, this.inputbox].forEach((btn) =>
			this.addChild(btn)
		);

		this.clearBtn.visible = this.inputbox.text.length > 0;
	}

	handleSearch() {
		try {
			let searchText = this.inputbox.text;
			if (searchText.length == 0) {
				return;
			}
			let result = fb.GetQueryItems(fb.GetLibraryItems(), searchText);

			notifyOthers("Show.SearchResult", {
				titleText: searchText,
				metadbs: result,
			});
		} catch (e) {
			fb.ShowPopupMessage("Fail to GetQueryItems", "Search Error");
		}
	}

	private _clearInput() {
		if (this.inputbox.text.length > 0) {
			this.inputbox.text = "";
			this.inputbox.offset = 0;
		}
	}

	on_init() { }

	on_size() {
		const { searchBtn, clearBtn, inputbox } = this;
		const { iconHeight } = this;

		let btnY = this.y + this.height - iconHeight;
		let marginLeft = scale(8);

		searchBtn.setBoundary(this.x + marginLeft, btnY, iconHeight, iconHeight);
		clearBtn.setBoundary(
			this.x + this.width - marginLeft - iconHeight,
			btnY,
			iconHeight,
			iconHeight
		);

		let inputboxY = this.y + (((this.height - this._inputboxHeight) / 2) | 0);
		inputbox.setBoundary(
			searchBtn.x + searchBtn.width,
			inputboxY,
			clearBtn.x - searchBtn.x - searchBtn.width,
			this._inputboxHeight
		);
	}

	on_paint(gr: IGdiGraphics) {
		if (this.inputbox.edit) {
			gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundActiveColor);
		} else {
			gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
		}

		let prevState = this.clearBtn.visible;
		this.clearBtn.visible = (this.inputbox.edit && this.inputbox.text.length > 0);
		if (prevState !== this.clearBtn.visible) {
		}
	}
}
