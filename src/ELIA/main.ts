import { ui } from "./common/UserInterface";
import { Layout } from "./parts/Layout";
import { PlaybackControlView } from "./parts/PlaybackControlView";
import { TopBar } from "./parts/TopbarView";
import { isValidPlaylist, PlaylistView } from "./parts/PlaylistView";
import { PlaylistManagerView } from "./parts/PlaylistManagerView";
import { SearchResultView } from "./parts/SearchResultView";
import { SettingsView } from "./parts/SettingsView";
import { lang } from "./parts/Lang";
import { ArtistPageView } from "./parts/ArtistPage";
import { AlbumPageView } from "./parts/AlbumPage";

window.DefinePanel("ELIA THEME", {
	features: { drag_n_drop: true },
});

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

/**
 * Root part of this panel;
 */
const root = new Layout({
	topbar: topbar,
	playbackControlBar: playbackControlBar,
	playlistManager: playlistManager,
	playlistView: playlistView,
	searchResult: searchResult,
	settingsView: settingsView,
	artistPage: artistPage,
	albumPage: albumPage,
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
	const defaultPlaylistName = lang("Default");
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
