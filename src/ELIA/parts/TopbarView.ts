import { scale, TextRenderingHint, MenuFlag } from "../common/Common";
import { Component } from "../common/BasePart";
import { IconButton } from "./Buttons";
import { Material, MaterialFont } from "../common/Icon";
import { notifyOthers, ui } from "../common/UserInterface";
import { themeColors, ToggleDarkmode } from "../common/Theme";
import { SearchBox } from "./SearchBox";
import { TXT } from "../common/Lang";
import { StringFormat } from "../common/String";

const iconSize = scale(22);
const textRenderingHint = ui.textRender;

const searchboxProps = {
	minWidth: scale(250),
	maxWidth: scale(350),
}

const createIconButton = (code: string, fontSize: number, color: number) => {
	return new IconButton({
		icon: code,
		fontName: MaterialFont,
		fontSize: fontSize,
		colors: [color]
	});
};

const topbarColors = {
	backgroundColor: themeColors.topbarBackground,
	foreColor: themeColors.text
};

export class TopBar extends Component {
	foreColor: number;
	backgroundColor: number;
	private _iconWidth: number = scale(40);
	private _logoFont = gdi.Font("Impact", scale(18));
	private _logoText = "foobar2000";

	buttons: Map<string, IconButton> = new Map();
	mainBtn: IconButton;
	settingsBtn: IconButton;
	darkmodeBtn: IconButton;

	swithcBtn: IconButton;
	searchBtn: IconButton;
	searchBox: SearchBox;
	closeSearchBtn: IconButton;

	constructor() {
		super({});

		this.foreColor = topbarColors.foreColor;
		this.backgroundColor = topbarColors.backgroundColor;

		// button 'toggle list';
		this.mainBtn = createIconButton(Material.menu, iconSize, this.foreColor);

		this.mainBtn.on_click = () => {
			notifyOthers("Toggle.PlaylistManager");
		};

		// button 'Settings';
		this.settingsBtn = createIconButton(Material.more_vert, iconSize, this.foreColor);
		// this.settingsBtn.disable();
		this.settingsBtn.on_click = (x: number, y: number) => {
			// notifyOthers("Show.Settings");
			showMainMenu(x, y);
		}

		this.darkmodeBtn = createIconButton(Material.toggle_dark, iconSize, this.foreColor);
		this.darkmodeBtn.on_click = () => {
			ToggleDarkmode();
		}

		// button 'Page Switch';
		this.swithcBtn = createIconButton(Material.apps, iconSize, this.foreColor);
		this.swithcBtn.disable();

		// button 'search';
		this.searchBtn = createIconButton(Material.search, iconSize, this.foreColor);
		this.searchBtn.on_click = () => {
			this.searchBox.visible = true;
			let searchboxX = this.x + scale(16);
			let searchboxWidth = this.x + this.width - searchboxX - scale(56);
			this.searchBox.setBoundary(searchboxX, this.y + scale(8), searchboxWidth, this.height - scale(16));
			this.closeSearchBtn.visible = true;
			this.closeSearchBtn.setBoundary(this.searchBox.x + this.searchBox.width, this.y, scale(56), this.height);
			this.settingsBtn.visible = false;

			ui.setFocusPart(this.searchBox.inputbox);
			this.searchBox.inputbox.activeInput();
			this.repaint();
		}

		this.closeSearchBtn = createIconButton(Material.arrow_right, iconSize, this.foreColor);
		this.closeSearchBtn.on_click = () => {
			this.on_size();
			this.repaint();
		}

		this.searchBox = new SearchBox();
		this.searchBox.z = 100;

		[this.mainBtn, this.swithcBtn, this.searchBtn, this.searchBox, this.settingsBtn, this.closeSearchBtn, this.darkmodeBtn].forEach((child) =>
			this.addChild(child)
		);
	}

	on_init() {
	}

	on_size() {
		let icoOffsetTop = ((this.height - this._iconWidth) / 2) | 0;
		let padLeft = scale(16);
		let { _iconWidth } = this;

		this.mainBtn.visible = true;
		this.mainBtn.setBoundary(this.x + padLeft, this.y + icoOffsetTop, _iconWidth, _iconWidth);
		this.settingsBtn.visible = true;
		this.settingsBtn.setBoundary(
			this.x + this.width - padLeft - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);
		this.swithcBtn.visible = false;
		this.swithcBtn.setBoundary(
			this.settingsBtn.x - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);

		this.darkmodeBtn.visible = true;
		this.darkmodeBtn.setBoundary(
			this.settingsBtn.x - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth, _iconWidth
		)

		let searchboxX = this.x + scale(272);
		let searchboxWidth = this.swithcBtn.x - scale(8) - searchboxX;
		if (searchboxWidth > searchboxProps.maxWidth) {
			searchboxWidth = searchboxProps.maxWidth;
		}
		let searchboxVis = searchboxWidth >= searchboxProps.minWidth;

		if (searchboxVis) {
			this.searchBox.visible = true;
			this.searchBtn.visible = false;
			this.closeSearchBtn.visible = false;
			this.searchBox.setBoundary(
				searchboxX,
				this.y + scale(8),
				searchboxWidth,
				this.height - scale(16)
			);
		} else {
			this.searchBox.visible = false;
			this.searchBtn.visible = true;
			this.searchBtn.setBoundary(
				this.swithcBtn.x - _iconWidth,
				this.y + icoOffsetTop,
				_iconWidth, _iconWidth
			);
			this.closeSearchBtn.visible = false;
		}
	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, topbarColors.backgroundColor);

		const { _logoFont, _logoText, foreColor } = this;
		const logoX = this.mainBtn.x + this.mainBtn.width + scale(16);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString(_logoText, _logoFont, foreColor, logoX, this.y, 1000, this.height, StringFormat.LeftCenter);
		gr.SetTextRenderingHint(textRenderingHint);
	}

	on_mouse_rbtn_up(x: number, y: number) {
		showMainMenu(x, y);
	}
}

/**
 * reference: "MainMenuManager All-In-One.js"
 */
function showMainMenu(x: number, y: number) {
	// Create menu;
	const objMenu = window.CreatePopupMenu();
	const fileMenu = window.CreatePopupMenu()
	const editMenu = window.CreatePopupMenu();
	const viewMenu = window.CreatePopupMenu();
	const playbackMenu = window.CreatePopupMenu();
	const libraryMenu = window.CreatePopupMenu();
	const helpMenu = window.CreatePopupMenu();

	fileMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("File"));
	editMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("Edit"));
	viewMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("View"));
	playbackMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("Playback"));
	libraryMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("Library"));
	helpMenu.AppendTo(objMenu, MenuFlag.STRING, TXT("Help"));

	objMenu.AppendMenuSeparator();
	objMenu.AppendMenuItem(MenuFlag.GRAYED, 3000, TXT("Theme settings"));

	// Menu managers;
	const fileMan = fb.CreateMainMenuManager();
	const editMan = fb.CreateMainMenuManager();
	const viewMan = fb.CreateMainMenuManager();
	const playbackMan = fb.CreateMainMenuManager();
	const libraryMan = fb.CreateMainMenuManager();
	const helpMan = fb.CreateMainMenuManager();

	fileMan.Init("file");
	fileMan.BuildMenu(fileMenu, 1, 200);
	editMan.Init("edit");
	editMan.BuildMenu(editMenu, 201, 200);
	viewMan.Init("view");
	viewMan.BuildMenu(viewMenu, 401, 200);
	playbackMan.Init("playback");
	playbackMan.BuildMenu(playbackMenu, 601, 300);
	libraryMan.Init("library");
	libraryMan.BuildMenu(libraryMenu, 901, 300);
	helpMan.Init("help");
	helpMan.BuildMenu(helpMenu, 1201, 100);

	const ret = objMenu.TrackPopupMenu(x, y);

	switch (true) {
		case ret >= 1 && ret < 201:
			fileMan.ExecuteByID(ret - 1);
			break;
		case ret >= 201 && ret < 401:
			editMan.ExecuteByID(ret - 201);
			break;
		case ret >= 401 && ret < 601:
			viewMan.ExecuteByID(ret - 401);
			break;
		case ret >= 601 && ret < 901:
			playbackMan.ExecuteByID(ret - 601);
			break;
		case ret >= 901 && ret < 1201:
			libraryMan.ExecuteByID(ret - 901);
			break;
		case ret >= 1201 && ret < 1301:
			helpMan.ExecuteByID(ret - 1201);
			break;

		case ret === 3000: // show settings panel;
			notifyOthers("Show.Settings");
			break;
	}

}
