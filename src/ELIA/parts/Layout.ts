import { scale, ThrottledRepaint } from "../common/common";
import { Component } from "../common/BasePart";
import { ui } from "../common/UserInterface";
import { TopBar } from "./TopbarView";
import { PlaybackControlView } from "./PlaybackControlView";
import { PlaylistManagerView } from "./PlaylistManagerView";
import { PlaylistView } from "./PlaylistView";
import { InputPopupPanel, IInputPopupOptions } from "./InputPopupPanel";
import { AlertDialog, IAlertDialogOptions } from "./AlertDialog";
import { SearchResultView } from "./SearchResultView";


const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const PLMAN_MIN_WIDTH = scale(256);

export const layout = {
	plmanMinWidth: PLMAN_MIN_WIDTH
};

const enum ViewStates {
	Default,
	Search,
}

export class Layout extends Component {
	className = "Layout";
	topbar: TopBar;
	playbackControlBar: PlaybackControlView;
	playlistManager: PlaylistManagerView;
	playlistView: PlaylistView;
	searchResult: SearchResultView;
	inputPopupPanel?: InputPopupPanel;
	alertDialog?: AlertDialog;

	viewState: ViewStates;

	constructor(options: {
		topbar: TopBar;
		playbackControlBar: PlaybackControlView;
		playlistManager: PlaylistManagerView;
		playlistView: PlaylistView;
		addPlaylistPanel?: InputPopupPanel;
		searchResult: SearchResultView;
	}) {
		super({});

		this.viewState = ViewStates.Default;

		//
		this.topbar = options.topbar;
		this.topbar.z = 100;
		this.addChild(this.topbar);
		this.playbackControlBar = options.playbackControlBar;
		this.playbackControlBar.z = 10;
		this.addChild(this.playbackControlBar);
		this.playlistManager = options.playlistManager;
		this.addChild(this.playlistManager);
		this.playlistView = options.playlistView;
		this.addChild(this.playlistView);
		this.searchResult = options.searchResult;
		this.addChild(this.searchResult);
		this.setPartsVisible(this.viewState);
	}

	on_size() {
		this.setPartsLayout(this.viewState);
	}

	setPartsVisible(viewState: ViewStates) {
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;

		if (viewState === ViewStates.Default) {
			this.playlistManager.visible = true;
			this.playlistView.visible = true;
			this.searchResult.visible = false;
		} else if (viewState === ViewStates.Search) {
			this.playlistManager.visible = true;
			this.playlistView.visible = false;
			this.searchResult.visible = true;
		}
	}

	setPartsLayout(viewState: ViewStates) {
		const { x, y, width, height } = this;

		/**
		 * Set pinned parts;
		 */
		this.topbar.setBoundary(x, y, width, TOPBAR_HEIGHT);
		this.playbackControlBar.setBoundary(
			x,
			x + height - CONTROL_BAR_HEIGHT,
			width,
			CONTROL_BAR_HEIGHT
		);

		/**
		 * Set others;
		 */
		const { playlistView, playlistManager } = this;
		const { searchResult } = this;
		const listY = this.topbar.y + this.topbar.height;
		const listHeight = this.height - this.topbar.height - this.playbackControlBar.height;

		switch (viewState) {
			case ViewStates.Default:
				playlistManager.visible &&
					playlistManager.setBoundary(x, listY, PLMAN_MIN_WIDTH, listHeight);
				if (playlistManager.visible) {
					playlistView.setBoundary(
						playlistManager.x + playlistManager.width,
						listY,
						this.x + this.width - (playlistManager.x + playlistManager.width),
						listHeight
					);
				} else {
					playlistView.setBoundary(x, listY, width, listHeight);
				}
				break;
			case ViewStates.Search:
				playlistManager.visible &&
					playlistManager.setBoundary(x, listY, PLMAN_MIN_WIDTH, listHeight);
				if (playlistManager.visible) {
					searchResult.setBoundary(
						playlistManager.x + playlistManager.width,
						listY,
						this.x + this.width - (playlistManager.x + playlistManager.width),
						listHeight
					);
				} else {
					searchResult.setBoundary(x, listY, width, listHeight);
				}
				break;
		}

		if (this.inputPopupPanel && this.inputPopupPanel.visible) {
			if (this.width >= scale(600 + 16 * 2)) {
				this.inputPopupPanel.setSize(scale(600), scale(220));
			} else {
				this.inputPopupPanel.setSize(Math.max(scale(280), this.width - scale(32)), scale(220));
			}
			this.inputPopupPanel.setPosition(
				this.x + (this.width - this.inputPopupPanel.width) / 2,
				this.y + (this.height - this.inputPopupPanel.height) / 2
			);
		}

		if (this.alertDialog && this.alertDialog.visible) {
			this.alertDialog.setPosition(
				this.x + (this.width - this.alertDialog.width) / 2,
				this.y + (this.height - this.alertDialog.height) / 2
			);
		}
	}

	/**
	 * TODO
	 */
	private setPartsZIndex() {
		this.topbar.z = 100;
		this.playbackControlBar.z = 10;
		this.playlistView.z = 0;
		this.searchResult.z = 0;
		this.playlistManager.z = 0;
	}

	on_paint(gr: IGdiGraphics) { }

	onNotifyData(message: string, data?: any) {
		switch (message) {
			case "Toggle.PlaylistManager":
				this.playlistManager.visible = !this.playlistManager.visible;
				if (this.playlistManager.visible) {
					this.playlistManager.on_init();
				}
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
			case "Popup.InputPopupPanel":
				let options = data as IInputPopupOptions;
				if (options == null) break;
				this.inputPopupPanel = new InputPopupPanel(options);
				this.addChild(this.inputPopupPanel);
				this.on_size();
				ui.updateParts();
				ui.setFocusPart(this.inputPopupPanel.inputbox);
				this.inputPopupPanel.inputbox.activeInput();
				this.repaint();
				break;
			case "Hide.InputPopupPanel":
				if (!this.inputPopupPanel) break;
				this.inputPopupPanel.visible = false;
				this.removeChild(this.inputPopupPanel);
				this.inputPopupPanel = null;
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.AlertDialog":
				let alertOptions = data as IAlertDialogOptions;
				if (alertOptions == null) break;
				this.alertDialog = new AlertDialog(alertOptions);
				this.alertDialog.visible = true;
				this.addChild(this.alertDialog);
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
			case "Hide.AlertDialog":
				if (!this.alertDialog) break;
				this.removeChild(this.alertDialog);
				this.alertDialog = null;
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.SearchResult":
				this.searchResult.updateList((data as any).titleText, (data as any).metadbs);
				this.searchResult.visible = true;
				this.playlistView.visible = false;
				this.viewState = ViewStates.Search;
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.Playlist":
				this.searchResult.visible = false;
				this.playlistView.visible = true;
				this.viewState = ViewStates.Default;
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
		}
	}
}
