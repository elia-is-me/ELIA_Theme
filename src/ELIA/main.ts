import { ui } from "./ts/UserInterface";
import { Layout } from "./ts/Layout";
import { PlaybackControlView } from "./ts/PlaybackControlView";
import { TopBar } from "./ts/TopbarView";
import { isValidPlaylist, PlaylistView } from "./ts/PlaylistView";
import { PlaylistManagerView } from "./ts/PlaylistManagerView";
import { SearchResultView } from "./ts/SearchResultView";
import { SettingsView } from "./ts/SettingsView";
import { TXT } from "./ts/Lang";
import { ArtistPageView } from "./ts/ArtistPage";
import { AlbumPageView } from "./ts/AlbumPage";
import { browser, BrowserView } from "./ts/BrowserView";

window.DefinePanel(
	"ELIA THEME",
	{
		features: {
			drag_n_drop: true
		},
	}
);


/* Control wants all keys           */
window.DlgCode = 0x0004;

const playbackControlBar = new PlaybackControlView();
const topbar = new TopBar();
const playlistView = new PlaylistView();
const playlistManager = new PlaylistManagerView();
const searchResult = new SearchResultView();
const settingsView = new SettingsView();
const artistPage = new ArtistPageView();
const albumPage = new AlbumPageView();

// ui.monitor(browser);
// ui.monitor(playbackControlBar);

/**
 * Root part of this panel;
 */
export const root = new Layout({
	topbar: topbar,
	playbackControlBar: playbackControlBar,
	playlistManager: playlistManager,
	playlistView: playlistView,
	searchResult: searchResult,
	settingsView: settingsView,
	artistPage: artistPage,
	albumPage: albumPage,
	browser: browser,
});


ui.setRoot(root);

const onReady = () => {
	checkDefautPlaylist();
	checkActivePlaylist();
};

function checkActivePlaylist() {
	if (!isValidPlaylist(plman.ActivePlaylist)) {
		if (plman.PlaylistCount > 0) {
			plman.ActivePlaylist = 0;
		} else {
			checkDefautPlaylist();
			plman.ActivePlaylist = 0;
		}
	}
}

function checkDefautPlaylist() {
	const defaultPlaylistName = TXT("Default");
	const compareName = defaultPlaylistName.toLowerCase();
	const playlistCount = plman.PlaylistCount;

	for (let i = 0; i < playlistCount; i++) {
		const playlistName = plman.GetPlaylistName(i).toLowerCase();
		if (playlistName === compareName) {
			return;
		}
	}

	// 'Default' playlist does not exists;
	const fail = plman.CreatePlaylist(plman.PlaylistCount, defaultPlaylistName);

	if (fail == -1) {
		console.log("ELIA THEME: fail to create default playlist.");
	}
}

/* When all ready; */
window.SetTimeout(() => {
	onReady();
}, 5);
