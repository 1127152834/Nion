from nion.cli.tui.app import NionTuiApp


def test_tui_css_defines_distinct_threads_conversation_and_composer_regions() -> None:
    css = NionTuiApp.CSS
    assert "#threads" in css
    assert "#conversation" in css
    assert "#composer" in css
    assert "#status" in css
    assert "#command-panel" in css
    assert "#reference-panel" in css
