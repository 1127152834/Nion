from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


def test_user_identity_repository_round_trips_profile(tmp_path) -> None:
    repository = UserIdentityRepository(base_dir=tmp_path)
    profile = UserIdentityProfile(
        user_name="张天成",
        preferred_address_for_user="大哥",
        assistant_self_name="小老弟",
        mutual_addressing_rule="你叫我大哥，我叫你小老弟",
        communication_style_preferences=["结论先行", "少施压"],
        user_role="财务 BP",
        timezone="Asia/Shanghai",
    )

    repository.save(profile)
    loaded = repository.load()

    assert loaded.user_name == "张天成"
    assert loaded.preferred_address_for_user == "大哥"
    assert loaded.assistant_self_name == "小老弟"
    assert loaded.mutual_addressing_rule == "你叫我大哥，我叫你小老弟"
    assert loaded.communication_style_preferences == ["结论先行", "少施压"]
    assert loaded.user_role == "财务 BP"
    assert loaded.timezone == "Asia/Shanghai"


def test_user_identity_repository_defaults_when_missing(tmp_path) -> None:
    repository = UserIdentityRepository(base_dir=tmp_path)

    loaded = repository.load()

    assert loaded.user_name == ""
    assert loaded.preferred_address_for_user == ""
    assert loaded.communication_style_preferences == []
