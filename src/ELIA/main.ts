import { ui } from "./common/UserInterface";
import { Layout } from "./ui/Layout";
import { PlaybackControlView } from "./ui/PlaybackControlView";
import { TopBar } from "./ui/TopbarView";
import { isValidPlaylist, PlaylistView } from "./ui/PlaylistView";
import { PlaylistManagerView } from "./ui/PlaylistManagerView";
import { SearchResultView } from "./ui/SearchResultView";
import { lang } from "./ui/Lang";

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

/**
 * Root part of this panel;
 */
const root = new Layout({
	topbar: topbar,
	playbackControlBar: playbackControlBar,
	playlistManager: playlistManager,
	playlistView: playlistView,
	searchResult: searchResult
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
			checkActivePlaylist();
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
