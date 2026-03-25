from nion.cli.tui.state import TuiState


def test_tui_state_tracks_selected_thread_and_draft() -> None:
    state = TuiState()

    state.set_selected_thread("thread-1")
    state.set_draft("hello")

    assert state.selected_thread_id == "thread-1"
    assert state.draft_text == "hello"
