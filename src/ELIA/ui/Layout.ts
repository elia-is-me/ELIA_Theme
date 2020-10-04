import { Component } from "../common/BasePart";
import { TopBar } from "./TopbarView";
import { PlaybackControlView } from "./PlaybackControlView";
import { PlaylistManagerView, PLM_Properties } from "./PlaylistManagerView";
import { PlaylistView } from "./PlaylistView";
import { scale } from "../common/common";
import { InputPopupPanel, IInputPopupOptions } from "./InputPopupPanel";
import { AlertDialog, IAlertDialogOptions } from "./AlertDialog";
import { SearchResultView } from "./SearchResultView";
import { ui } from "../common/UserInterface";


const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const PLMAN_MIN_WIDTH = PLM_Properties.minWidth;

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
	searchResultView?: SearchResultView;
	inputPopupPanel?: InputPopupPanel;
	alertDialog?: AlertDialog;

	viewState: ViewStates;

	constructor(options: {
		topbar: TopBar;
		playbackControlBar: PlaybackControlView;
		playlsitManager: PlaylistManagerView;
		playlistView: PlaylistView;
		addPlaylistPanel?: InputPopupPanel;
	}) {
		super({});

		this.viewState = ViewStates.Default;

		//
		this.topbar = options.topbar;
		this.playbackControlBar = options.playbackControlBar;
		this.playlistManager = options.playlsitManager;
		this.playlistView = options.playlistView;

		this.addChild(this.topbar);
		this.addChild(this.playbackControlBar);
		this.addChild(this.playlistManager);
		this.addChild(this.playlistView);

		this.setPartsZIndex();
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
			this.searchResultView && (this.searchResultView.visible = false);
		} else if (viewState === ViewStates.Search) {
			this.playlistManager.visible = true;
			this.playlistView.visible = false;
			this.searchResultView && (this.searchResultView.visible = true);
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
		const { searchResultView } = this;
		const listY = this.topbar.y + this.topbar.height;
		const listHeight =
			this.height - this.topbar.height - this.playbackControlBar.height;

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
					searchResultView.setBoundary(
						playlistManager.x + playlistManager.width,
						listY,
						this.x + this.width - (playlistManager.x + playlistManager.width),
						listHeight
					);
				} else {
					searchResultView.setBoundary(x, listY, width, listHeight);
				}
				break;
		}

		if (this.inputPopupPanel && this.inputPopupPanel.visible) {
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
		this.playlistManager.z = 0;
	}

	/**
	 * TODO;
	 */
	setViewState() { }

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
				this.inputPopupPanel.visible = true;
				this.addChild(this.inputPopupPanel);
				this.on_size();
				ui.updateParts();
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
				this.searchResultView = new SearchResultView({
					titleText: (data as any).titleText,
					metadbs: (data as any).metadbs,
				});
				this.addChild(this.searchResultView);
				this.children.sort((a, b) => a.z - b.z)
				this.viewState = ViewStates.Search;
				this.setPartsVisible(this.viewState);
				this.on_size();
				ui.updateParts();
				console.log("playlsit visib	: ", this.playlistView.visible);
				this.repaint();
				break;
			case "Show.Playlist":
				console.log(this.children.length);
				if (this.searchResultView) {
					this.removeChild(this.searchResultView);
					this.searchResultView = undefined;
				}
				console.log(this.children.length);
				this.viewState = ViewStates.Default;
				this.setPartsVisible(this.viewState);
				this.on_size();
				ui.updateParts();
				this.repaint();
				break;
		}
	}
}

