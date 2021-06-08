import { scale, TextRenderingHint, MenuFlag, getOrDefault } from "./Common";
import { Component } from "./BasePart";
import { IconButton } from "./Buttons";
import { Material, MaterialFont } from "./Icon";
import { notifyOthers, ui } from "./UserInterface";
import { themeColors, ToggleDarkmode } from "./Theme";
import { SearchBox } from "./SearchBox";
import { TXT } from "./Lang";
import { ShowBrowser } from "./Layout";

const iconSize = scale(22);
const searchboxProps = {
	minWidth: scale(300),
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
	moreBtn: IconButton;
	darkmodeBtn: IconButton;

	switchBtn: IconButton;
	searchBtn: IconButton;
	searchBox: SearchBox;
	closeSearchBtn: IconButton;
	goBackBtn: IconButton;
	goForwardBtn: IconButton;

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
		this.moreBtn = createIconButton(Material.more_vert, iconSize, this.foreColor);
		// this.settingsBtn.disable();
		this.moreBtn.on_click = (x: number, y: number) => {
			// notifyOthers("Show.Settings");
			showMainMenu(x, y);
		}

		this.darkmodeBtn = createIconButton(Material.toggle_dark, iconSize, this.foreColor);
		this.darkmodeBtn.on_click = () => {
			ToggleDarkmode();
		}

		// button 'Page Switch';
		this.switchBtn = createIconButton(Material.apps, iconSize, this.foreColor);
		this.switchBtn.on_click = () => {
			ShowBrowser();
		}
		// this.swithcBtn.disable();
		// this.swithcBtn.a

		// button 'search';
		this.searchBtn = createIconButton(Material.search, iconSize, this.foreColor);
		this.searchBtn.on_click = () => {
			this.searchBox.visible = true;
			let searchboxX = this.x + scale(16);
			let searchboxWidth = this.x + this.width - searchboxX - scale(56);
			this.searchBox.setBoundary(searchboxX, this.y + scale(8), searchboxWidth, this.height - scale(16));
			this.closeSearchBtn.visible = true;
			this.closeSearchBtn.setBoundary(this.searchBox.x + this.searchBox.width, this.y, scale(56), this.height);
			this.moreBtn.visible = false;

			ui.setFocusPart(this.searchBox.inputbox);
			this.searchBox.inputbox.activeInput();
			this.repaint();
		}

		this.closeSearchBtn = createIconButton(Material.arrow_right, iconSize, this.foreColor);
		this.closeSearchBtn.on_click = () => {
			this.on_size();
			this.repaint();
		}

		this.goBackBtn = createIconButton(Material.navigate_previous, iconSize, this.foreColor);
		this.goBackBtn.on_show = () => { this.goBackBtn.disable(); }
		this.goBackBtn.on_click = () => {
			notifyOthers("Nav.Back")
		}
		this.addChild(this.goBackBtn);

		this.goForwardBtn = createIconButton(Material.navigate_next, iconSize, this.foreColor);
		this.goForwardBtn.on_show = () => { this.goForwardBtn.disable(); };
		this.goForwardBtn.on_click = () => {
			notifyOthers("Nav.Forward");
		};
		this.addChild(this.goForwardBtn);

		this.searchBox = new SearchBox();
		this.searchBox.z = 100;

		[this.mainBtn, this.switchBtn, this.searchBtn, this.searchBox, this.moreBtn, this.closeSearchBtn, this.darkmodeBtn].forEach((child) =>
			this.addChild(child)
		);
	}

	on_show() {
	}

	on_size() {
		let icoOffsetTop = ((this.height - this._iconWidth) / 2) | 0;
		let padLeft = scale(16);
		let { _iconWidth } = this;

		this.mainBtn.visible = true;
		this.mainBtn.setBoundary(this.x + padLeft, this.y + icoOffsetTop, _iconWidth, _iconWidth);

		this.goBackBtn.visible = true;
		this.goBackBtn.setBoundary(
			this.mainBtn.x + _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);

		this.goForwardBtn.visible = true;
		this.goForwardBtn.setBoundary(
			this.goBackBtn.x + _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);

		this.moreBtn.visible = true;
		this.moreBtn.setBoundary(
			this.x + this.width - padLeft - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);

		this.switchBtn.visible = true;
		this.switchBtn.setBoundary(
			this.moreBtn.x - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth,
			_iconWidth
		);

		this.darkmodeBtn.visible = true;
		this.darkmodeBtn.setBoundary(
			this.switchBtn.x - _iconWidth,
			this.y + icoOffsetTop,
			_iconWidth, _iconWidth
		)


		let searchboxX = this.x + scale(256);
		if (this.width < scale(850)) {
			searchboxX = this.goForwardBtn.x + _iconWidth + scale(8);
		}
		let searchboxWidth = this.darkmodeBtn.x - scale(8) - searchboxX;
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
				this.darkmodeBtn.x - _iconWidth,
				this.y + icoOffsetTop,
				_iconWidth, _iconWidth
			);
			this.closeSearchBtn.visible = false;
		}
	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, topbarColors.backgroundColor);

		// const { _logoFont, _logoText, foreColor } = this;
		// const logoX = this.mainBtn.x + this.mainBtn.width + scale(16);

		// gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		// gr.DrawString(_logoText, _logoFont, foreColor, logoX, this.y, 1000, this.height, StringFormat.LeftCenter);
		// gr.SetTextRenderingHint(textRenderingHint);
	}

	on_mouse_rbtn_up(x: number, y: number) {
		showMainMenu(x, y);
	}

	onNotifyData(msg: string, data: any) {
		switch (msg) {
			case "update_navigation":
				let forward: number = getOrDefault(data, o => o.forward, 0);
				let back_length: number = getOrDefault(data, o => o.back, 0);
				if (back_length > 0) {
					this.goBackBtn.enable();
				} else {
					this.goBackBtn.disable();
				}
				if (forward > 0) {
					this.goForwardBtn.enable();
				} else {
					this.goForwardBtn.disable();
				}
				this.repaint();
				break;
		}

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
